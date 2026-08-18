import fs from 'node:fs';

const file = process.argv[2];
const keywords = process.argv.slice(3);
const root = JSON.parse(fs.readFileSync(file, 'utf8'));

const frames = [];

function findFrames(node, page) {
  if (!node || typeof node !== 'object') return;
  const bb = node.absoluteBoundingBox;
  const isScreen =
    bb && Math.round(bb.width) === 375 && Math.round(bb.height) >= 800 && Math.round(bb.height) <= 880;
  if (isScreen) {
    frames.push(node);
    return;
  }
  for (const c of node.children || []) findFrames(c, page);
}

function collectText(node, out) {
  if (node.type === 'TEXT' && node.characters) out.push(node.characters.replace(/\s+/g, ' ').trim());
  for (const c of node.children || []) collectText(c, out);
  return out;
}

for (const key of Object.keys(root.nodes)) findFrames(root.nodes[key].document, key);

const hits = [];
for (const f of frames) {
  const texts = collectText(f, []);
  const blob = texts.join(' ␟ ').toLowerCase();
  const matched = keywords.filter((k) => blob.includes(k.toLowerCase()));
  if (matched.length) hits.push({ id: f.id, name: f.name, matched, sample: texts.slice(0, 14) });
}

console.log(`screens scanned: ${frames.length}`);
console.log(`screens with keyword hits: ${hits.length}\n`);
for (const h of hits) {
  console.log(`--- ${h.id} | ${h.name} | matched: ${h.matched.join(', ')}`);
  console.log(`    ${h.sample.join(' | ').slice(0, 400)}`);
}
