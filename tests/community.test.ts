import test from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createGymServer } from "../server/app";
import { compareProgress, comparisonSample, ComparisonSample } from "../src/logic/comparison";
import { demoProfile, emptyPreferences } from "../src/data/options";
import { generateRoutine } from "../src/logic/routine";
import { startWorkout } from "../src/logic/workout";

const DAY = 86_400_000;
const now = Date.now();
const sample = (growth = 10, level: ComparisonSample["level"] = "intermediate", id = "dumbbell-curl"): ComparisonSample => ({ level, records: [
  { exerciseId: id, date: new Date(now - 14 * DAY).toISOString(), strength: 10 },
  { exerciseId: id, date: new Date(now - 1000).toISOString(), strength: 10 * (1 + growth / 100) },
] });

test("community comparison controls level, exercise cohort, recency, self-exclusion and minimum sample", () => {
  const own = sample(10);
  assert.equal(compareProgress(own, Array.from({ length: 5 }, () => sample(10)), now).status, "average");
  assert.equal(compareProgress(own, Array.from({ length: 5 }, () => sample(5)), now).status, "faster");
  assert.equal(compareProgress(own, Array.from({ length: 5 }, () => sample(15)), now).status, "slower");
  assert.equal(compareProgress(own, Array.from({ length: 4 }, () => sample()), now).status, "insufficient");
  assert.equal(compareProgress(own, [sample(10, "beginner"), sample(10, "advanced"), sample(10, "intermediate", "lateral-dumbbell")], now).peers, 0);
  const stale = { ...own, records: own.records.map(r => ({ ...r, date: new Date(Date.parse(r.date) - 10 * DAY).toISOString() })) };
  assert.equal(compareProgress(stale, [own], now).rate, null);
  const short = { ...own, records: own.records.map(r => ({ ...r, date: new Date(now - DAY).toISOString() })) };
  assert.equal(compareProgress(short, [own], now).rate, null);
  assert.equal(compareProgress({ ...own, records: [...own.records, ...own.records] }, Array.from({ length: 5 }, () => own), now).exercises, 1);
});

test("comparison export ignores unapproved machines and sends no personal measurements", () => {
  const record = (id: string) => ({ prescription: { id, exerciseId: id, sets: 2, range: [6, 8] as [number, number], weight: 10 }, name: id, type: "isolation" as const, sets: [{ weight: 10, reps: 8 }, { weight: 15, reps: 20 }] });
  const value = comparisonSample({ version: 1, profile: demoProfile, completed: true, onboardingStep: 0, theme: "system", preferences: emptyPreferences, routine: [], history: [{ id: "one", level: "intermediate", dayName: "Uno", bodyWeight: 80, date: new Date(now - 1000).toISOString(), minutes: 40, records: [record("dumbbell-curl"), record("supported-row")] }] }, now);
  assert.equal(value.records.length, 1);
  assert.equal(value.records[0].exerciseId, "dumbbell-curl");
  assert.ok(value.records[0].strength < 15);
  assert.deepEqual(Object.keys(value).sort(), ["level", "records"]);
  assert.deepEqual(Object.keys(value.records[0]).sort(), ["date", "exerciseId", "strength"]);
});

test("new workouts keep their starting level and old or other-level sessions do not change cohorts", () => {
  const day = generateRoutine(demoProfile, emptyPreferences)[0];
  assert.equal(startWorkout(day, "75", "beginner").level, "beginner");
  const exported = comparisonSample({ version: 1, profile: demoProfile, completed: true, onboardingStep: 0, theme: "system", preferences: emptyPreferences, routine: [], history: [undefined, "beginner", "intermediate"].map((level, i) => ({
    id: String(i), level: level as "beginner" | "intermediate" | undefined, dayName: "Uno", date: new Date(now - 1000).toISOString(), minutes: 40,
    records: [{ name: "Curl", type: "isolation", prescription: { id: "curl", exerciseId: "dumbbell-curl", sets: 2, range: [8, 10], weight: 10 }, sets: [{ weight: 10, reps: 10 }] }],
  })) }, now);
  assert.equal(exported.records.length, 1);
});

async function fixture(database?: string) {
  const server = createGymServer({ database, authLimit: 100 });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, method = "GET", data?: unknown, token?: string) => {
    const res = await fetch(url + path, { method, headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: res.status, data: await res.json() };
  };
  const register = async (handle: string) => (await call("/auth/register", "POST", { handle, name: "Persona de prueba", password: "test-password-123", level: "intermediate" })).data;
  const close = () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return { server, url, call, register, close };
}

test("two real accounts publish, follow, like, report and enforce ownership and sessions", async () => {
  const f = await fixture();
  try {
    const alice = await f.register("alice"), bob = await f.register("bob");
    assert.equal((await f.call("/me")).status, 401);
    assert.equal((await f.call("/auth/login", "POST", { handle: "alice", password: "wrong-password" })).status, 401);
    assert.equal((await f.call("/auth/register", "POST", { handle: "ALICE", name: "Otra", password: "test-password-123", level: "beginner" })).status, 409);
    const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#456351" } }).png().toBuffer();
    const created = await f.call("/posts", "POST", { photo: `data:image/png;base64,${image.toString("base64")}`, caption: "Primer entrenamiento" }, alice.token);
    assert.equal(created.status, 201);
    const id = created.data.id;
    const photo = await fetch(`${f.url}/photos/${id}`);
    assert.equal(photo.headers.get("content-type"), "image/jpeg");
    const metadata = await sharp(Buffer.from(await photo.arrayBuffer())).metadata();
    assert.equal(metadata.width, 32); assert.equal(metadata.exif, undefined);
    assert.equal((await f.call(`/posts/${id}`, "DELETE", undefined, bob.token)).status, 404);
    assert.equal((await f.call(`/follow/${alice.user.id}`, "PUT", undefined, bob.token)).data.followers, 1);
    assert.equal((await f.call("/posts?following=1", "GET", undefined, bob.token)).data.posts.length, 1);
    await f.call(`/posts/${id}/like`, "PUT", undefined, bob.token);
    await f.call(`/posts/${id}/like`, "PUT", undefined, bob.token);
    assert.equal((await f.call("/posts", "GET", undefined, alice.token)).data.posts[0].likes, 1);
    await f.call("/reports", "POST", { postId: id, reason: "Prueba de denuncia" }, bob.token);
    assert.equal((await f.call("/posts", "GET", undefined, bob.token)).data.posts.length, 0);
    assert.equal((await f.call("/posts", "GET", undefined, alice.token)).data.posts.length, 1);
    assert.equal((await f.call("/posts", "POST", { photo: "data:image/png;base64,YWJj", caption: "Inválida" }, alice.token)).status, 400);
    assert.equal((await f.call(`/posts/${id}`, "DELETE", undefined, alice.token)).status, 200);
    assert.equal((await fetch(`${f.url}/photos/${id}`)).status, 404);
    const fresh = await f.call("/auth/login", "POST", { handle: "alice", password: "test-password-123" });
    assert.equal(fresh.status, 200);
    await f.call("/auth/logout", "POST", undefined, fresh.data.token);
    assert.equal((await f.call("/me", "GET", undefined, fresh.data.token)).status, 401);
    const cors = await fetch(`${f.url}/health`, { headers: { Origin: "https://other.example" } });
    assert.equal(cors.status, 403);
  } finally { await f.close(); }
});

test("deleting a Community account removes its server data but not device data", async () => {
  const f = await fixture();
  try {
    const member = await f.register("erase_me");
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#456351" } }).png().toBuffer();
    const post = await f.call("/posts", "POST", { photo: `data:image/png;base64,${image.toString("base64")}`, caption: "Para borrar" }, member.token);
    assert.equal(post.status, 201);
    assert.equal((await f.call("/me", "DELETE", undefined, member.token)).status, 200);
    assert.equal((await f.call("/me", "GET", undefined, member.token)).status, 401);
    assert.equal((await f.call("/auth/login", "POST", { handle: "erase_me", password: "test-password-123" })).status, 401);
    assert.equal((await fetch(`${f.url}/photos/${post.data.id}`)).status, 404);
  } finally { await f.close(); }
});

test("server comparison uses distinct accounts and supports withdrawing records", async () => {
  const f = await fixture();
  try {
    const own = await f.register("self");
    assert.equal((await f.call("/comparison", "POST", sample(10), own.token)).data.status, "insufficient");
    for (let i = 0; i < 5; i++) {
      const peer = await f.register(`peer_${i}`);
      await f.call("/comparison", "POST", sample(5), peer.token);
    }
    const compared = (await f.call("/comparison", "POST", sample(10), own.token)).data;
    assert.equal(compared.peers, 5); assert.equal(compared.status, "faster");
    const withdrawn = await f.call("/comparison", "DELETE", undefined, own.token);
    assert.equal(withdrawn.status, 200);
    const peer = await f.call("/auth/login", "POST", { handle: "peer_0", password: "test-password-123" });
    assert.equal((await f.call("/comparison", "POST", sample(5), peer.data.token)).data.peers, 4);
    assert.equal((await f.call("/comparison", "POST", { level: "other", records: [] }, own.token)).status, 400);
  } finally { await f.close(); }
});

test("community account and profile persist when the server restarts", async () => {
  mkdirSync("test-results", { recursive: true });
  const database = `test-results/community-${randomUUID()}.sqlite`;
  const first = await fixture(database);
  let token: string;
  let postId: string;
  try {
    const person = await first.register("persistent"); token = person.token;
    await first.call("/me", "PATCH", { name: "Persistente", bio: "Cada sesión suma", level: "advanced" }, token);
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#456351" } }).png().toBuffer();
    postId = (await first.call("/posts", "POST", { caption: "Foto persistente", photo: `data:image/png;base64,${image.toString("base64")}` }, token)).data.id;
  } finally { await first.close(); }
  const second = await fixture(database);
  try {
    const profile = await second.call("/me", "GET", undefined, token!);
    assert.equal(profile.data.name, "Persistente"); assert.equal(profile.data.bio, "Cada sesión suma");
    assert.equal((await second.call("/posts", "GET", undefined, token!)).data.posts[0].id, postId!);
    assert.equal((await fetch(`${second.url}/photos/${postId!}`)).status, 200);
  } finally { await second.close(); }
});

test("routine and progress sharing require opt-in and a mutual follow", async () => {
  const f = await fixture();
  try {
    const alice = await f.register("coach"), bob = await f.register("friend");
    const routine = {
      version: 1,
      days: [{ name: "Torso A", exercises: [{ exerciseId: "supported-row", name: "Remo Sentado Pecho Apoyado", sets: 2, range: [8, 10], note: "Pecho pegado al apoyo" }] }],
      customExercises: [],
    };
    const created = await f.call("/routines/me", "PUT", routine, alice.token);
    assert.equal(created.status, 200);
    // A direct link is not public by default and a one-way follow is insufficient.
    assert.equal((await f.call(`/routines/${created.data.id}`)).status, 401);
    await f.call(`/follow/${alice.user.id}`, "PUT", undefined, bob.token);
    assert.equal((await f.call(`/routines/${created.data.id}`, "GET", undefined, bob.token)).status, 403);
    await f.call(`/follow/${bob.user.id}`, "PUT", undefined, alice.token);
    await f.call("/me/privacy", "PATCH", { routinePublic: true, progressPublic: true }, alice.token);
    const publicRoutine = await f.call(`/routines/${created.data.id}`, "GET", undefined, bob.token);
    assert.equal(publicRoutine.status, 200);
    assert.equal(publicRoutine.data.owner.handle, "coach");
    assert.equal(publicRoutine.data.routine.days[0].exercises[0].note, "Pecho pegado al apoyo");
    assert.equal(JSON.stringify(publicRoutine.data).includes("weight"), false);
    const profile = await f.call(`/profiles/${alice.user.id}`, "GET", undefined, bob.token);
    assert.equal(profile.data.routineId, created.data.id);
    assert.equal(profile.data.progressVisible, true);
    const progress = { version: 1, sessions: 12, sets: 96, updated: "2026-09-08T10:00:00.000Z", exercises: [{ id: "supported-row", name: "Remo Sentado Pecho Apoyado", weight: 55, reps: 10, date: "2026-09-08T10:00:00.000Z" }] };
    assert.equal((await f.call("/progress/me", "PUT", progress, alice.token)).status, 200);
    assert.equal((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).data.exercises[0].weight, 55);
    await f.call("/me/privacy", "PATCH", { routinePublic: false, progressPublic: false }, alice.token);
    assert.equal((await f.call(`/routines/${created.data.id}`, "GET", undefined, bob.token)).status, 403);
    assert.equal((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).status, 403);
    assert.equal((await f.call("/routines/me", "PUT", { ...routine, days: [] }, alice.token)).status, 400);
  } finally { await f.close(); }
});
