import { createServer, IncomingMessage } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import sharp from "sharp";
import { googleVerifier } from "./google";
import { validAvatar, validAvatarPhoto } from "../src/data/avatars";
import { comparableIds, compareProgress, ComparisonSample } from "../src/logic/comparison";
import { isSharedProgress, isSharedRoutine } from "../src/logic/sharing";

const derive = promisify(scrypt);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(status: number, message: string): never { throw new ApiError(status, message); }
const str = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value.trim() : fail(400, "Revisa los campos del formulario.");
const validLevel = (level: unknown) => ["beginner", "intermediate", "advanced"].includes(String(level));
interface User { id: string; handle: string; name: string; bio: string; level: string; salt: string; password: string }

async function body(req: IncomingMessage) {
  if (!req.headers["content-type"]?.startsWith("application/json")) fail(415, "Se requiere JSON.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8_000_000) fail(413, "La fotografía es demasiado grande (máximo 5 MB).");
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail(400, "Datos no válidos.");
    return parsed as Record<string, unknown>;
  } catch { return fail(400, "No se han podido leer los datos."); }
}

export function createGymServer({ database = ":memory:", origins = ["http://localhost:8081", "http://127.0.0.1:8081"], authLimit = 20, googleClientId = process.env.GYM_GOOGLE_CLIENT_ID ?? "", verifyGoogle = googleVerifier(googleClientId) } = {}) {
  const db = new DatabaseSync(database);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS google_identities (subject TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS user_avatars (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, avatar TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, handle TEXT NOT NULL UNIQUE, name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', level TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, caption TEXT NOT NULL, photo BLOB NOT NULL, created TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS posts_created ON posts(created DESC);
    CREATE TABLE IF NOT EXISTS likes (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, post_id TEXT REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id, post_id));
    CREATE TABLE IF NOT EXISTS follows (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, followed_id TEXT REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id, followed_id));
    CREATE TABLE IF NOT EXISTS samples (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reports (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, post_id TEXT REFERENCES posts(id) ON DELETE CASCADE, reason TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(user_id, post_id));
    CREATE TABLE IF NOT EXISTS shared_routines (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS shared_progress (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS community_privacy (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, routine_public INTEGER NOT NULL DEFAULT 0, progress_public INTEGER NOT NULL DEFAULT 0);
  `);
  const limits = new Map<string, { count: number; until: number }>();
  const nonces = new Map<string, number>();
  function rateLimit(key: string, limit: number) {
    const now = Date.now();
    for (const [id, value] of limits) if (value.until < now) limits.delete(id);
    const entry = limits.get(key) ?? { count: 0, until: now + 15 * 60_000 };
    if (++entry.count > limit) fail(429, "Demasiados intentos. Inténtalo dentro de 15 minutos.");
    limits.set(key, entry);
  }
  function privacy(userId: string) {
    return (db.prepare("SELECT routine_public, progress_public FROM community_privacy WHERE user_id = ?").get(userId) as
      { routine_public: number; progress_public: number } | undefined) ?? { routine_public: 0, progress_public: 0 };
  }
  function mutual(first: string, second: string) {
    return first === second || !!db.prepare(`SELECT 1 FROM follows a JOIN follows b
      ON a.user_id = b.followed_id AND a.followed_id = b.user_id
      WHERE a.user_id = ? AND a.followed_id = ?`).get(first, second);
  }
  function publicProfile(user: User, viewer: string) {
    const count = (sql: string) => (db.prepare(sql).get(user.id) as { total: number }).total;
    const own = user.id === viewer;
    const settings = privacy(user.id);
    const connected = mutual(viewer, user.id);
    const routineVisible = own || (connected && settings.routine_public === 1);
    const progressVisible = own || (connected && settings.progress_public === 1);
    return { id: user.id, handle: user.handle, name: user.name, bio: user.bio, level: user.level,
      avatar: (db.prepare("SELECT avatar FROM user_avatars WHERE user_id = ?").get(user.id) as { avatar: string } | undefined)?.avatar ?? "mountain",
      posts: count("SELECT count(*) total FROM posts WHERE user_id = ?"),
      followers: count("SELECT count(*) total FROM follows WHERE followed_id = ?"),
      following: count("SELECT count(*) total FROM follows WHERE user_id = ?"),
      followed: !!db.prepare("SELECT 1 FROM follows WHERE user_id = ? AND followed_id = ?").get(viewer, user.id),
      routineId: routineVisible ? (db.prepare("SELECT id FROM shared_routines WHERE user_id = ?").get(user.id) as { id: string } | undefined)?.id ?? null : null,
      progressVisible,
      ...(own ? { routinePublic: settings.routine_public === 1, progressPublic: settings.progress_public === 1 } : {}),
    };
  }
  function getUser(id: string) { return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as User | undefined; }
  function newSession(user: User) {
    db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(hash(token), user.id, Date.now() + 30 * 86_400_000);
    return { token, user: publicProfile(user, user.id) };
  }
  const server = createServer(async (req, res) => {
    const json = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(value));
    };
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Origin");
    try {
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin)) fail(403, "Origen no permitido.");
      if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
      const url = new URL(req.url ?? "/", "http://localhost");
      const path = url.pathname;
      const method = req.method;
      if (path === "/health" && method === "GET") { json(200, { service: "gym-buddy-community", ok: true }); return; }
      if (path === "/auth/google/config" && method === "GET") {
        rateLimit(`google-config:${req.socket.remoteAddress}`, authLimit);
        for (const [key, expires] of nonces) if (expires < Date.now()) nonces.delete(key);
        const nonce = randomBytes(32).toString("hex");
        if (googleClientId) nonces.set(nonce, Date.now() + 5 * 60_000);
        json(200, { clientId: googleClientId, nonce: googleClientId ? nonce : "" }); return;
      }
      if (path === "/auth/google" && method === "POST") {
        rateLimit(`auth:${req.socket.remoteAddress}`, authLimit);
        if (!googleClientId) fail(503, "El acceso con Google todavía no está configurado.");
        const data = await body(req);
        const credential = str(data.credential, 12000), nonce = str(data.nonce, 64);
        const expires = nonces.get(nonce);
        nonces.delete(nonce);
        if (!expires || expires < Date.now()) fail(401, "El acceso con Google ha caducado. Vuelve a intentarlo.");
        let identity;
        try { identity = await verifyGoogle(credential, nonce); }
        catch { return fail(401, "No se ha podido verificar la cuenta de Google."); }
        const existing = db.prepare("SELECT user_id FROM google_identities WHERE subject = ?").get(identity.sub) as { user_id: string } | undefined;
        let googleUser = existing ? getUser(existing.user_id) : undefined;
        if (!googleUser) {
          const id = randomUUID();
          googleUser = { id, handle: `gym_${id.replace(/-/g, "").slice(0, 16)}`, name: identity.name?.slice(0, 80).trim() || "Gym Buddy", bio: "", level: validLevel(data.level) ? String(data.level) : "beginner", salt: randomBytes(16).toString("hex"), password: randomBytes(64).toString("hex") };
          db.exec("BEGIN");
          try {
            db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, googleUser.handle, googleUser.name, "", googleUser.level, googleUser.salt, googleUser.password);
            db.prepare("INSERT INTO google_identities VALUES (?, ?)").run(identity.sub, id);
            db.exec("COMMIT");
          } catch (error) { db.exec("ROLLBACK"); throw error; }
        }
        json(200, newSession(googleUser)); return;
      }
      // Photos are public only after the explicit publication action; never serve original metadata.
      if (/^\/photos\/[\w-]+$/.test(path) && method === "GET") {
        const post = db.prepare("SELECT photo FROM posts WHERE id = ?").get(path.split("/")[2]) as { photo: Uint8Array } | undefined;
        if (!post) fail(404, "Foto no encontrada.");
        res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Security-Policy": "default-src 'none'" });
        res.end(post.photo); return;
      }
      if (["/auth/register", "/auth/login"].includes(path) && method === "POST") {
        rateLimit(`auth:${req.socket.remoteAddress}`, authLimit);
        const data = await body(req);
        const handle = str(data.handle, 24).toLowerCase().replace(/^@/, "");
        if (!/^[a-z0-9_]{3,24}$/.test(handle)) fail(400, "El @ necesita entre 3 y 24 letras, números o guiones bajos.");
        const password = data.password;
        if (typeof password !== "string" || password.length < 10 || password.length > 128) fail(400, "La contraseña necesita entre 10 y 128 caracteres.");
        let user = db.prepare("SELECT * FROM users WHERE handle = ?").get(handle) as unknown as User | undefined;
        if (path === "/auth/register") {
          if (user) fail(409, "Ese @ ya está registrado.");
          const name = str(data.name, 80);
          if (!name || !validLevel(data.level)) fail(400, "Indica tu nombre y nivel.");
          const salt = randomBytes(16).toString("hex");
          const digest = (await derive(password, salt, 64) as Buffer).toString("hex");
          user = { id: randomUUID(), handle, name, bio: "", level: String(data.level), salt, password: digest };
          try { db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run(user.id, handle, name, "", user.level, salt, digest); }
          catch { fail(409, "Ese @ ya está registrado."); }
        } else {
          const digest = await derive(password, user?.salt ?? "missing-account", 64) as Buffer;
          if (!user || !timingSafeEqual(digest, Buffer.from(user.password, "hex"))) fail(401, "Usuario o contraseña incorrectos.");
        }
        json(200, newSession(user!)); return;
      }
      const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires > ?").get(hash(token), Date.now()) as { user_id: string } | undefined;
      if (!session) fail(401, "Inicia sesión en Comunidad para continuar.");
      const user = getUser(session.user_id)!;
      rateLimit(`user:${user.id}`, 600);
      if (/^\/routines\/[\w-]+$/.test(path) && method === "GET") {
        const routine = db.prepare(`SELECT r.id, r.user_id, r.data, r.updated, u.handle, u.name
          FROM shared_routines r JOIN users u ON u.id = r.user_id WHERE r.id = ?`).get(path.split("/")[2]) as
          { id: string; user_id: string; data: string; updated: string; handle: string; name: string } | undefined;
        if (!routine) fail(404, "Rutina compartida no encontrada.");
        if (routine.user_id !== user.id && (!mutual(user.id, routine.user_id) || privacy(routine.user_id).routine_public !== 1))
          fail(403, "Esta rutina es privada o solo estÃ¡ disponible entre seguidores mutuos.");
        json(200, { id: routine.id, owner: { handle: routine.handle, name: routine.name }, routine: JSON.parse(routine.data), updated: routine.updated }); return;
      }
      if (path === "/auth/logout" && method === "POST") {
        db.prepare("DELETE FROM sessions WHERE token = ?").run(hash(token)); json(200, { ok: true }); return;
      }
      if (path === "/me" && method === "DELETE") {
        // Foreign keys cascade to sessions, posts/photos, follows, likes, reports,
        // shared data, samples, avatars and Google identity links.
        db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
        json(200, { ok: true }); return;
      }
      if (path === "/me" && method === "GET") { json(200, publicProfile(user, user.id)); return; }
      if (path === "/me" && method === "PATCH") {
        const data = await body(req);
        const name = str(data.name, 80), bio = str(data.bio, 300);
        if (!name || !validLevel(data.level)) fail(400, "Revisa el nombre y el nivel.");
        let avatar = data.avatar;
        if (avatar !== undefined && !validAvatar(avatar)) {
          if (!validAvatarPhoto(avatar)) fail(400, "Imagen de perfil no válida.");
          try {
            const photo = await sharp(Buffer.from(String(avatar).split(",")[1], "base64"), { limitInputPixels: 25_000_000 }).rotate().resize(256, 256, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
            avatar = `data:image/jpeg;base64,${photo.toString("base64")}`;
          } catch { return fail(400, "No se ha podido procesar la foto de perfil."); }
        }
        if (avatar !== undefined) db.prepare("INSERT OR REPLACE INTO user_avatars VALUES (?, ?)").run(user.id, String(avatar));
        db.prepare("UPDATE users SET name = ?, bio = ?, level = ? WHERE id = ?").run(name, bio, String(data.level), user.id);
        if (data.level !== user.level) db.prepare("DELETE FROM samples WHERE user_id = ?").run(user.id);
        json(200, publicProfile(getUser(user.id)!, user.id)); return;
      }
      if (path === "/me/privacy" && method === "PATCH") {
        const data = await body(req);
        if (typeof data.routinePublic !== "boolean" || typeof data.progressPublic !== "boolean")
          fail(400, "Elige la privacidad de rutina y progreso.");
        db.prepare(`INSERT INTO community_privacy (user_id, routine_public, progress_public) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET routine_public = excluded.routine_public, progress_public = excluded.progress_public`)
          .run(user.id, Number(data.routinePublic), Number(data.progressPublic));
        json(200, publicProfile(user, user.id)); return;
      }
      if (path === "/routines/me" && method === "PUT") {
        const data = await body(req);
        if (!isSharedRoutine(data) || data.days.length === 0 || data.days.length > 30 || data.days.reduce((total, day) => total + day.exercises.length, 0) > 500)
          fail(400, "La rutina compartida no es vÃ¡lida.");
        const existing = db.prepare("SELECT id FROM shared_routines WHERE user_id = ?").get(user.id) as { id: string } | undefined;
        const id = existing?.id ?? randomUUID();
        db.prepare(`INSERT INTO shared_routines (id, user_id, data, updated) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated`)
          .run(id, user.id, JSON.stringify(data), new Date().toISOString());
        json(200, { id }); return;
      }
      if (path === "/routines/me" && method === "DELETE") {
        db.prepare("DELETE FROM shared_routines WHERE user_id = ?").run(user.id);
        json(200, { ok: true }); return;
      }
      if (path === "/progress/me" && method === "PUT") {
        const data = await body(req);
        if (!isSharedProgress(data)) fail(400, "El resumen de progreso no es vÃ¡lido.");
        db.prepare(`INSERT INTO shared_progress (user_id, data, updated) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated`)
          .run(user.id, JSON.stringify(data), data.updated);
        json(200, { ok: true }); return;
      }
      if (path === "/progress/me" && method === "DELETE") {
        db.prepare("DELETE FROM shared_progress WHERE user_id = ?").run(user.id);
        json(200, { ok: true }); return;
      }
      if (path === "/profiles" && method === "GET") {
        const query = (url.searchParams.get("q") ?? "").replace(/^@/, "").toLowerCase();
        const users = db.prepare("SELECT * FROM users WHERE instr(handle, ?) > 0 ORDER BY handle LIMIT 30").all(query) as unknown as User[];
        json(200, users.map(u => publicProfile(u, user.id))); return;
      }
      if (/^\/profiles\/[\w-]+$/.test(path) && method === "GET") {
        const target = getUser(path.split("/")[2]);
        if (!target) fail(404, "Perfil no encontrado.");
        json(200, publicProfile(target, user.id)); return;
      }
      if (/^\/profiles\/[\w-]+\/progress$/.test(path) && method === "GET") {
        const targetId = path.split("/")[2];
        const target = getUser(targetId);
        if (!target) fail(404, "Perfil no encontrado.");
        if (target.id !== user.id && (!mutual(user.id, target.id) || privacy(target.id).progress_public !== 1))
          fail(403, "Este progreso es privado o solo estÃ¡ disponible entre seguidores mutuos.");
        const progress = db.prepare("SELECT data, updated FROM shared_progress WHERE user_id = ?").get(target.id) as { data: string; updated: string } | undefined;
        if (!progress) fail(404, "Esta persona todavÃ­a no ha compartido un progreso.");
        json(200, { ...JSON.parse(progress.data), updated: progress.updated }); return;
      }
      if (/^\/follow\/[\w-]+$/.test(path) && ["PUT", "DELETE"].includes(method!)) {
        const target = path.split("/")[2];
        if (target === user.id || !getUser(target)) fail(400, "Perfil no válido.");
        if (method === "PUT") db.prepare("INSERT OR IGNORE INTO follows VALUES (?, ?)").run(user.id, target);
        else db.prepare("DELETE FROM follows WHERE user_id = ? AND followed_id = ?").run(user.id, target);
        json(200, publicProfile(getUser(target)!, user.id)); return;
      }
      if (path === "/posts" && method === "GET") {
        const offset = Math.max(0, Math.min(1_000_000, Number(url.searchParams.get("offset")) || 0));
        const owner = url.searchParams.get("user") ?? "";
        const following = url.searchParams.get("following") === "1" ? 1 : 0;
        const posts = db.prepare(`SELECT p.id, p.user_id userId, p.caption, p.created, u.handle, u.name,
          (SELECT count(*) FROM likes WHERE post_id = p.id) likes,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) liked
          FROM posts p JOIN users u ON p.user_id = u.id
          WHERE (? = '' OR p.user_id = ?) AND (? = 0 OR p.user_id IN (SELECT followed_id FROM follows WHERE user_id = ?))
          AND NOT EXISTS(SELECT 1 FROM reports WHERE post_id = p.id AND user_id = ?)
          ORDER BY p.created DESC, p.id DESC LIMIT 21 OFFSET ?`).all(user.id, owner, owner, following, user.id, user.id, offset);
        json(200, { posts: posts.slice(0, 20), next: posts.length > 20 ? offset + 20 : null }); return;
      }
      if (path === "/posts" && method === "POST") {
        rateLimit(`upload:${user.id}`, 15);
        const data = await body(req);
        const caption = str(data.caption, 1000);
        const photo = str(data.photo, 7_000_000);
        const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(photo);
        if (!match) fail(400, "Selecciona una imagen JPEG, PNG o WebP.");
        const input = Buffer.from(match[1], "base64");
        if (input.length > 5_000_000) fail(413, "La fotografía supera los 5 MB.");
        let output: Buffer;
        try { output = await sharp(input, { limitInputPixels: 25_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(); }
        catch { return fail(400, "No se ha podido procesar la fotografía. Prueba otra imagen."); }
        const id = randomUUID();
        db.prepare("INSERT INTO posts VALUES (?, ?, ?, ?, ?)").run(id, user.id, caption, output, new Date().toISOString());
        json(201, { id }); return;
      }
      if (/^\/posts\/[\w-]+$/.test(path) && method === "DELETE") {
        const result = db.prepare("DELETE FROM posts WHERE id = ? AND user_id = ?").run(path.split("/")[2], user.id);
        if (!result.changes) fail(404, "No puedes borrar esta publicación.");
        json(200, { ok: true }); return;
      }
      if (/^\/posts\/[\w-]+\/like$/.test(path) && ["PUT", "DELETE"].includes(method!)) {
        const id = path.split("/")[2];
        if (!db.prepare("SELECT 1 FROM posts WHERE id = ?").get(id)) fail(404, "Publicación no encontrada.");
        if (method === "PUT") db.prepare("INSERT OR IGNORE INTO likes VALUES (?, ?)").run(user.id, id);
        else db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(user.id, id);
        json(200, { ok: true }); return;
      }
      if (path === "/reports" && method === "POST") {
        const data = await body(req);
        const id = str(data.postId, 80), reason = str(data.reason, 300);
        if (!reason || !db.prepare("SELECT 1 FROM posts WHERE id = ?").get(id)) fail(400, "Indica una publicación y un motivo.");
        db.prepare("INSERT OR REPLACE INTO reports VALUES (?, ?, ?, ?)").run(user.id, id, reason, new Date().toISOString());
        json(200, { ok: true }); return;
      }
      if (path === "/comparison" && method === "DELETE") {
        db.prepare("DELETE FROM samples WHERE user_id = ?").run(user.id); json(200, { ok: true }); return;
      }
      if (path === "/comparison" && method === "POST") {
        const data = await body(req);
        if (!validLevel(data.level) || !Array.isArray(data.records) || data.records.length > 3000) fail(400, "Datos de progreso no válidos.");
        for (const r of data.records) {
          if (!r || !comparableIds.has(r.exerciseId) || !Number.isFinite(Date.parse(r.date)) || !Number.isFinite(r.strength) || r.strength <= 0 || r.strength > 2000) fail(400, "Registro de ejercicio no válido.");
        }
        const sample = data as unknown as ComparisonSample;
        db.prepare("INSERT OR REPLACE INTO samples VALUES (?, ?, ?)").run(user.id, JSON.stringify(sample), Date.now());
        db.prepare("DELETE FROM samples WHERE updated < ?").run(Date.now() - 28 * 86_400_000);
        const others = db.prepare("SELECT data FROM samples WHERE user_id != ?").all(user.id) as { data: string }[];
        json(200, compareProgress(sample, others.map(row => JSON.parse(row.data)))); return;
      }
      fail(404, "Ruta no encontrada.");
    } catch (error) {
      if (!res.headersSent) json(error instanceof ApiError ? error.status : 500, { error: error instanceof ApiError ? error.message : "No se ha podido completar la operación. Inténtalo de nuevo." });
      else res.end();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.on("close", () => db.close());
  return server;
}
