import fs from 'node:fs';

const file = process.argv[2];
const targetId = process.argv[3];
const maxDepth = Number(process.argv[4] ?? 99);
const root = JSON.parse(fs.readFileSync(file, 'utf8'));

let found = null;
function find(node) {
  if (!node || typeof node !== 'object') return;
  if (node.id === targetId) {
    found = node;
    return;
  }
  for (const c of node.children || []) {
    find(c);
    if (found) return;
  }
}
for (const key of Object.keys(root.nodes)) {
  find(root.nodes[key].document);
  if (found) break;
}
if (!found) {
  console.error('not found');
  process.exit(1);
}

const rgba = (c) =>
  c ? `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${+(c.a ?? 1).toFixed(2)})` : '';

function fillInfo(node) {
  const f = (node.fills || []).filter((x) => x.visible !== false);
  if (!f.length) return '';
  return f
    .map((x) => {
      if (x.type === 'SOLID') return rgba({ ...x.color, a: x.opacity ?? x.color.a });
      if (x.type === 'IMAGE') return `IMAGE(${x.imageRef?.slice(0, 8)} ${x.scaleMode})`;
      if (x.type?.startsWith('GRADIENT'))
        return `${x.type}[${(x.gradientStops || []).map((s) => rgba(s.color)).join(' -> ')}]`;
      return x.type;
    })
    .join(' + ');
}

function walk(node, depth) {
  if (depth > maxDepth) return;
  const bb = node.absoluteBoundingBox;
  const rootBB = found.absoluteBoundingBox;
  const pos = bb
    ? `[${Math.round(bb.x - rootBB.x)},${Math.round(bb.y - rootBB.y)} ${Math.round(bb.width)}x${Math.round(bb.height)}]`
    : '';
  const parts = [`${'  '.repeat(depth)}${node.type} "${node.name}" ${pos}`];
  const fi = fillInfo(node);
  if (fi) parts.push(`fill=${fi}`);
  if (node.cornerRadius != null) parts.push(`r=${node.cornerRadius}`);
  if (node.rectangleCornerRadii) parts.push(`r=[${node.rectangleCornerRadii.join(',')}]`);
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    parts.push(
      `AUTO:${node.layoutMode} gap=${node.itemSpacing ?? 0} pad=${node.paddingTop ?? 0},${node.paddingRight ?? 0},${node.paddingBottom ?? 0},${node.paddingLeft ?? 0} align=${node.counterAxisAlignItems ?? '-'}/${node.primaryAxisAlignItems ?? '-'}`,
    );
  }
  if (node.style) {
    const s = node.style;
    parts.push(
      `FONT ${s.fontFamily} ${s.fontWeight} ${s.fontSize}/${s.lineHeightPx ? Math.round(s.lineHeightPx * 100) / 100 : '-'} ls=${s.letterSpacing ? Math.round(s.letterSpacing * 1000) / 1000 : 0} align=${s.textAlignHorizontal}`,
    );
  }
  if (node.characters) parts.push(`TEXT="${node.characters.replace(/\n/g, '\\n').slice(0, 80)}"`);
  const strokes = (node.strokes || []).filter((s) => s.visible !== false);
  if (strokes.length) parts.push(`stroke=${strokes.map((s) => rgba(s.color)).join(',')} w=${node.strokeWeight}`);
  const eff = (node.effects || []).filter((e) => e.visible !== false);
  if (eff.length)
    parts.push(
      `effects=${eff.map((e) => `${e.type}(${rgba(e.color)} r${e.radius} o${e.offset ? `${e.offset.x},${e.offset.y}` : ''})`).join(' ')}`,
    );
  if (node.opacity != null && node.opacity !== 1) parts.push(`op=${node.opacity}`);
  console.log(parts.join(' | '));
  for (const c of node.children || []) walk(c, depth + 1);
}

walk(found, 0);
