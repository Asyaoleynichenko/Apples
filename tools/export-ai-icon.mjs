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
const IDS = [
  'I240:26776;154:22149', // PDP AI tag instance
  '154:22148', // Accessibility Button component
  'I240:26776;99:38185;148:21742', // banner ill
];

async function figma(url) {
  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const outDir = path.join(root, 'public/assets');
fs.mkdirSync(outDir, { recursive: true });
const refsDir = path.join(root, 'design-refs/nodes');
fs.mkdirSync(refsDir, { recursive: true });

const svg = await figma(
  `https://api.figma.com/v1/images/${FILE}?ids=${encodeURIComponent(IDS.join(','))}&format=svg`,
);
const png = await figma(
  `https://api.figma.com/v1/images/${FILE}?ids=${encodeURIComponent(IDS.join(','))}&format=png&scale=3`,
);

console.log('svg err', svg.err, 'keys', Object.keys(svg.images || {}));
console.log('png err', png.err, 'keys', Object.keys(png.images || {}));

const names = {
  'I240:26776;154:22149': 'ai-tag',
  '154:22148': 'ai-tag-component',
  'I240:26776;99:38185;148:21742': 'mascot-banner-pdp',
};

for (const [id, name] of Object.entries(names)) {
  const svgUrl = svg.images?.[id];
  const pngUrl = png.images?.[id];
  if (svgUrl) {
    const body = await fetch(svgUrl).then((r) => r.text());
    fs.writeFileSync(path.join(outDir, `${name}.svg`), body);
    fs.writeFileSync(path.join(refsDir, `${name}.svg`), body);
    console.log('wrote svg', name, body.length, body.slice(0, 180).replace(/\n/g, ' '));
  } else {
    console.log('no svg for', name);
  }
  if (pngUrl) {
    const buf = Buffer.from(await fetch(pngUrl).then((r) => r.arrayBuffer()));
    fs.writeFileSync(path.join(outDir, `${name}.png`), buf);
    fs.writeFileSync(path.join(refsDir, `${name}.png`), buf);
    console.log('wrote png', name, buf.length);
  } else {
    console.log('no png for', name);
  }
}
