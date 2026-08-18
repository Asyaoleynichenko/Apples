import fs from 'node:fs';

const file = process.argv[2];
const root = JSON.parse(fs.readFileSync(file, 'utf8'));

const frames = [];
function findFrames(node) {
  if (!node || typeof node !== 'object') return;
  const bb = node.absoluteBoundingBox;
  if (bb && Math.round(bb.width) === 375 && Math.round(bb.height) >= 800 && Math.round(bb.height) <= 880) {
    frames.push(node);
    return;
  }
  for (const c of node.children || []) findFrames(c);
}
function collectText(node, out) {
  if (node.type === 'TEXT' && node.characters) out.push(node.characters.replace(/\s+/g, ' ').trim());
  for (const c of node.children || []) collectText(c, out);
  return out;
}

for (const key of Object.keys(root.nodes)) findFrames(root.nodes[key].document);

for (const f of frames) {
  const t = collectText(f, []).filter(Boolean);
  console.log(`\n===== ${f.id} | ${f.name} | texts=${t.length}`);
  console.log(t.join(' | ').slice(0, 600));
}
