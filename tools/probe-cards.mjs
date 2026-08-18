import sharp from 'sharp';

const src = 'design-refs/nodes/I240_26793_89_37850.png';
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const px = (x, y) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

console.log(`image ${width}x${height}`);
console.log('corner samples:');
for (const [x, y] of [
  [5, 5],
  [300, 300],
  [560, 300],
  [600, 300],
  [700, 300],
  [1100, 300],
  [300, 700],
]) {
  console.log(`  (${x},${y}) = ${px(x, y).join(',')}`);
}

// Column profile: fraction of near-white pixels in the top 60% of the image.
const limitY = Math.round(height * 0.58);
const colWhite = [];
for (let x = 0; x < width; x++) {
  let w = 0;
  for (let y = 0; y < limitY; y++) {
    const [r, g, b] = px(x, y);
    if (r > 250 && g > 250 && b > 250) w++;
  }
  colWhite.push(w / limitY);
}
const gutters = [];
let start = null;
for (let x = 0; x < width; x++) {
  if (colWhite[x] > 0.97) {
    if (start === null) start = x;
  } else if (start !== null) {
    gutters.push([start, x]);
    start = null;
  }
}
if (start !== null) gutters.push([start, width]);
console.log('white gutter columns:', JSON.stringify(gutters.filter((g) => g[1] - g[0] > 3)));

// Row profile within the first card, to find the tile's vertical bounds.
const cx = 200;
const rows = [];
for (let y = 0; y < height; y++) {
  const [r, g, b] = px(cx, y);
  rows.push(r > 250 && g > 250 && b > 250 ? 'W' : 'C');
}
let first = rows.indexOf('C');
let last = rows.lastIndexOf('C');
console.log(`column x=${cx}: content rows ${first}..${last}`);
const bands = [];
let cur = rows[0];
let s = 0;
for (let y = 1; y <= height; y++) {
  if (rows[y] !== cur) {
    if (y - s > 8) bands.push(`${cur}${s}-${y}`);
    cur = rows[y];
    s = y;
  }
}
console.log('bands:', bands.join(' '));
