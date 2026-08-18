import fs from 'node:fs';

const root = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = [];

function walk(node, screen) {
  if (!node || typeof node !== 'object') return;
  const bb = node.absoluteBoundingBox;
  if (bb && Math.round(bb.width) === 375 && Math.round(bb.height) >= 800 && Math.round(bb.height) <= 880) {
    screen = `${node.id} ${node.name}`;
  }
  const imgFill = (node.fills || []).find((f) => f.type === 'IMAGE' && f.visible !== false);
  if (imgFill && node.type !== 'FRAME') {
    out.push({
      screen,
      id: node.id,
      name: node.name,
      ref: imgFill.imageRef?.slice(0, 8),
      mode: imgFill.scaleMode,
      w: bb ? Math.round(bb.width) : 0,
      h: bb ? Math.round(bb.height) : 0,
    });
  }
  for (const c of node.children || []) walk(c, screen);
}
for (const key of Object.keys(root.nodes)) walk(root.nodes[key].document, 'root');

const want = (process.argv[3] || '').split(',').filter(Boolean);
for (const r of out) {
  if (want.length && !want.some((w) => r.screen.startsWith(w))) continue;
  console.log(`${r.screen}  ->  ${r.id} "${r.name}" ${r.w}x${r.h} ref=${r.ref} ${r.mode}`);
}
