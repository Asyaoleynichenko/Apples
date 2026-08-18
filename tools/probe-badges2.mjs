import sharp from 'sharp';

const src = 'design-refs/nodes/I240_26793_89_37850.png';
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, channels } = info;
const px = (x, y) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const saturated = (x, y) => {
  const [r, g, b] = px(x, y);
  return Math.max(r, g, b) - Math.min(r, g, b) > 60;
};

// Walk down the tile's left edge: the badge strip is the only saturated
// block hugging x = tileLeft.
for (const [label, left, right] of [
  ['card1', 0, 574],
  ['card2', 624, 1122],
]) {
  let lastRow = -1;
  for (let y = 29; y < 260; y++) {
    let run = 0;
    for (let x = left; x < left + 300; x++) if (saturated(x, y)) run++;
    if (saturated(left + 2, y)) lastRow = y;
    if (y % 10 === 0) console.log(`${label} y=${y} satRunInFirst300=${run} leftEdgeSat=${saturated(left + 2, y)}`);
  }
  let maxX = -1;
  for (let y = 29; y <= lastRow; y++) {
    for (let x = left; x < left + 400; x++) if (saturated(x, y) && x > maxX) maxX = x;
  }
  console.log(`>>> ${label}: badge strip rows 29..${lastRow}, extends to x=${maxX} (rel ${maxX - left})\n`);
}
