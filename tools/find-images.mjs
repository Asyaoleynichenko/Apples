import fs from 'node:fs';

const root = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = [];

function walk(node, screen) {
  if (!node || typeof node !== 'object') return;
  const bb = node.absoluteBoundingBox;
  if (bb && Math.round(bb.width) === 375 && Math.round(bb.height) >= 800 && Math.round(bb.height) <= 880) {
    screen = `${node.id} ${node.name}`;
  }
  for (const f of node.fills || []) {
    if (f.type === 'IMAGE' && f.imageRef) {
      rows.push({
        screen,
        id: node.id,
        name: node.name,
        ref: f.imageRef,
        w: bb ? Math.round(bb.width) : 0,
        h: bb ? Math.round(bb.height) : 0,
      });
    }
  }
  for (const c of node.children || []) walk(c, screen);
}

for (const key of Object.keys(root.nodes)) walk(root.nodes[key].document, 'root');

const byRef = new Map();
for (const r of rows) {
  if (!byRef.has(r.ref)) byRef.set(r.ref, []);
  byRef.get(r.ref).push(r);
}

console.log(`unique imageRefs: ${byRef.size}, usages: ${rows.length}\n`);
for (const [ref, uses] of byRef) {
  const u = uses[0];
  console.log(`${ref} | used ${uses.length}x | e.g. node ${u.id} "${u.name}" ${u.w}x${u.h} | screen ${u.screen}`);
}
