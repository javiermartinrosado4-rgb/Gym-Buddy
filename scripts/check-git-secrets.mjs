import { execFileSync } from "node:child_process";
import process from "node:process";

const git = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
const files = git(["ls-files", "-z"]).split("\0").filter(Boolean);
const forbidden = /(?:^|\/)(?:\.env(?:\.[^/]*)?|signing\.properties|backup-password\.txt|credentials\.json)$|\.(?:jks|keystore|p12|p8|sqlite(?:-\w+)?|db|apk|aab|apks)$/i;
const secrets = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /GOCSPX-[A-Za-z0-9_-]{20,}/, /gh[pousr]_[A-Za-z0-9]{30,}/, /"private_key"\s*:\s*"-----/];
const findings = [];
for (const path of files) {
  if (forbidden.test(path) && !path.endsWith(".example")) findings.push(path);
  if (!/\.(?:png|jpg|jpeg|webp|gif|ico|lnk)$/i.test(path)) {
    const content = git(["show", `:${path}`]);
    if (secrets.some(pattern => pattern.test(content))) findings.push(path);
  }
}
if (findings.length) {
  console.error("No publicar: revisar estos archivos (contenido oculto):", [...new Set(findings)].join(", "));
  process.exitCode = 1;
} else console.log(`PASS: ${files.length} archivos del índice; sin artefactos privados ni patrones conocidos de claves. Revisar también el diff manualmente.`);
