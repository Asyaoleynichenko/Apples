import sharp from 'sharp';

const src = 'design-refs/nodes/I240_26793_89_37850.png';
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, channels } = info;
const px = (x, y) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
};

// Badges are saturated magenta / yellow; the tile behind them is neutral grey.
const saturated = (x, y) => {
  const [r, g, b] = px(x, y);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx - mn > 60;
};

for (const [label, x0, x1, y0, y1] of [
  ['card1', 0, 574, 29, 200],
  ['card2', 624, 1122, 29, 200],
]) {
  let minX = 1e9;
  let maxX = -1;
  let minY = 1e9;
  let maxY = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (saturated(x, y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`${label} saturated bbox: x ${minX}..${maxX}  y ${minY}..${maxY}`);
}

console.log('tile grey card1:', px(500, 100).join(','), ' card2:', px(1100, 100).join(','));
