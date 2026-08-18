import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const token = env.FIGMA_ACCESS_TOKEN;
if (!token) {
  console.error('missing token');
  process.exit(1);
}

const FILE = 'h0ShQ3o8k37L6Z33ZW1L31';
const names = {
  'I240:26776;99:38185': 'banner-pdp',
  'I240:26776;99:38185;96:38084': 'banner-pdp-pill',
  'I240:26776;99:38185;148:21742': 'mascot-banner-pdp',
  'I240:26777;99:38706': 'banner-search',
  'I240:26777;99:38707': 'banner-search-pill',
  'I240:26777;102:39228': 'mascot-banner-search',
  'I240:26777;167:23144': 'banner-search-glow',
  'I240:26778;80:35789': 'banner-share',
  'I240:26778;102:39251': 'banner-share-pill',
  'I240:26778;153:21782': 'mascot-banner-share',
};

async function figma(url) {
  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const ids = Object.keys(names).join(',');
const png = await figma(
  `https://api.figma.com/v1/images/${FILE}?ids=${encodeURIComponent(ids)}&format=png&scale=3&use_absolute_bounds=true`,
);
console.log('err', png.err, 'keys', Object.keys(png.images || {}));

const outDir = path.join(root, 'public/assets');
const refsDir = path.join(root, 'design-refs/nodes');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(refsDir, { recursive: true });

for (const [id, name] of Object.entries(names)) {
  const url = png.images?.[id];
  if (!url) {
    console.log('no png for', name);
    continue;
  }
  const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  fs.writeFileSync(path.join(outDir, `${name}.png`), buf);
  fs.writeFileSync(path.join(refsDir, `${name}.png`), buf);
  console.log('wrote', name, buf.length);
}
