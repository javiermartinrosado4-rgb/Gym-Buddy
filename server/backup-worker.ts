import { writeFile } from "node:fs/promises";
import { backupToRepository } from "./backup";

async function run() {
  try {
    await backupToRepository();
    await writeFile("/backup-staging/last-success", String(Date.now()), { mode: 0o600 });
  } catch {
    console.error(JSON.stringify({ event: "backup_failed", at: new Date().toISOString() }));
  }
}
async function loop() {
  await run();
  setTimeout(() => void loop(), 24 * 60 * 60_000);
}
void loop();
