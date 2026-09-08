// Run manually to fetch the original manufacturer product photos, resized by
// their image CDN. Does not run at app startup; bundled images work offline.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';

const directory = fileURLToPath(new URL('../assets/equipment/', import.meta.url));
const sources = JSON.parse(await readFile(path.join(directory, 'sources.json'), 'utf8'));
await mkdir(directory, { recursive: true });
async function fetchChecked(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
const products = (await Promise.all([1, 2].map(async page =>
  (await (await fetchChecked(`https://gymleco.com/products.json?limit=250&page=${page}`)).json()).products,
))).flat();
const entries = Object.entries(sources);
// Bounded concurrency to avoid hammering the source sites.
for (let i = 0; i < entries.length; i += 4) {
  await Promise.all(entries.slice(i, i + 4).map(async ([key, source]) => {
    const destination = path.join(directory, `${key}.jpg`);
    try { await access(destination); return; } catch { /* Download missing files only. */ }
    const handle = source.split('/').at(-1);
    const product = products.find(item => item.handle === handle);
    const imageUrl = source.includes('skelcore.com')
      ? 'https://cdn.shopify.com/s/files/1/0598/1588/7044/files/SK-PWR-008_Lateral_Raise.jpg'
      : product?.images?.[0]?.src;
    if (!imageUrl) throw new Error(`Missing product photo: ${source}`);
    const image = new URL(imageUrl);
    image.searchParams.set('width', '640');
    image.searchParams.set('format', 'jpg');
    const response = await fetchChecked(image);
    if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Not an image: ${image}`);
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    console.log(`Downloaded ${key}`);
  }));
}
