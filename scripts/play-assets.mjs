import sharp from "sharp";
import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../assets/play/", import.meta.url);
await mkdir(output, { recursive: true });
await sharp(fileURLToPath(new URL("../assets/brand/icon.png", import.meta.url))).resize(512, 512).flatten({ background: "#F7F8F2" }).png().toFile(fileURLToPath(new URL("icon-512.png", output)));
const graphic = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="500" fill="#F7F8F2"/>
  <circle cx="820" cy="122" r="260" fill="#E5EDE3"/><circle cx="1000" cy="470" r="230" fill="#D4E2D5"/>
  <rect x="72" y="85" width="146" height="146" rx="40" fill="#456351"/>
  <text x="145" y="180" text-anchor="middle" fill="#F7F8F2" font-family="Arial, sans-serif" font-size="58" font-weight="700">GB</text>
  <text x="72" y="310" fill="#0F1412" font-family="Arial, sans-serif" font-size="74" font-weight="700">Akhyles</text>
  <text x="76" y="367" fill="#516058" font-family="Arial, sans-serif" font-size="30">Tu entrenamiento, un paso a la vez.</text>
  <rect x="76" y="405" width="238" height="50" rx="25" fill="#E5EDE3"/>
  <text x="195" y="438" text-anchor="middle" fill="#456351" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1">PLANIFICA · REGISTRA</text>
</svg>`;
await sharp(Buffer.from(graphic)).flatten({ background: "#F7F8F2" }).png().toFile(fileURLToPath(new URL("feature-graphic.png", output)));
