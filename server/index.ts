import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createGymServer } from "./app";

const database = resolve(process.env.GYM_DATABASE ?? "server/data/gym-buddy.sqlite");
mkdirSync(dirname(database), { recursive: true });
const server = createGymServer({ database, origins: process.env.GYM_ALLOWED_ORIGINS?.split(",").map(s => s.trim()) });
const port = Number(process.env.GYM_API_PORT ?? 8082);
server.listen(port, process.env.GYM_API_HOST ?? "127.0.0.1", () => {
  console.log(`Gym Buddy Comunidad: puerto ${port}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close());
