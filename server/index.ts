import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createGymServer } from "./app";
import { serverConfig } from "./config";

const config = serverConfig();
const database = resolve(config.database);
mkdirSync(dirname(database), { recursive: true });
const server = createGymServer({ ...config, database });
server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({ event: "listening", port: config.port }));
});
server.on("error", () => { console.error(JSON.stringify({ event: "server_error" })); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
  server.close();
  setTimeout(() => { server.closeAllConnections(); }, 25_000).unref();
});
