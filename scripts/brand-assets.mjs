import sharp from "sharp";
import { Buffer } from "node:buffer";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../assets/brand/", import.meta.url);
await mkdir(root, { recursive: true });
const svg = await readFile(new URL("mark.svg", root));
await sharp(svg).png().toFile(fileURLToPath(new URL("foreground.png", root)));
const iconMark = await sharp(svg).resize(600, 600).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#0F1412" } })
  .composite([{ input: iconMark, left: 212, top: 212 }]).png().toFile(fileURLToPath(new URL("icon.png", root)));
const splashMark = await sharp(svg).resize(260, 260).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0F1412" } })
  .composite([{ input: splashMark, left: 126, top: 126 }]).png().toFile(fileURLToPath(new URL("splash.png", root)));
const mono = svg.toString().replaceAll('fill="url(#sage)"', 'fill="#000000"');
await sharp(Buffer.from(mono)).png().toFile(fileURLToPath(new URL("monochrome.png", root)));
