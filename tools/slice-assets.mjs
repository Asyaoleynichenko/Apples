import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const REFS = 'design-refs';
const OUT = 'public/assets';
fs.mkdirSync(OUT, { recursive: true });

const log = (kind, dest, meta) => console.log(`${kind}  ${path.basename(dest)}  ${meta.width}x${meta.height}`);

async function trimTo(src, dest, maxDim) {
  const buf = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
  await sharp(buf)
    .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  log('trim', dest, await sharp(dest).metadata());
}

const flat = (w, h, hex) =>
  sharp({ create: { width: w, height: h, channels: 4, background: hex } })
    .png()
    .toBuffer();

/**
 * Cut one product tile out of the flattened two-card screenshot, paint over the
 * badge / wishlist / cart-button chrome that is baked into the pixels, and pad
 * the result to a square so every card renders identically.
 */
/** Read one pixel so tiles can be padded with the screenshot's own background. */
async function sampleColor(src, x, y) {
  const { data } = await sharp(src).extract({ left: x, top: y, width: 1, height: 1 }).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  return { r: data[0], g: data[1], b: data[2], alpha: 1 };
}

/** Largest blob of non-background pixels, skipping 1px crop seams and leftover chrome. */
async function contentBBox(buf, grey, threshold = 18) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rowHits = Array.from({ length: height }, () => ({ n: 0, min: width, max: -1 }));
  for (let y = 0; y < height; y++) {
    const row = rowHits[y];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const d = Math.abs(data[i] - grey.r) + Math.abs(data[i + 1] - grey.g) + Math.abs(data[i + 2] - grey.b);
      if (d > threshold) {
        row.n++;
        if (x < row.min) row.min = x;
        if (x > row.max) row.max = x;
      }
    }
  }

  let bestS = 0;
  let bestE = -1;
  let run = -1;
  for (let y = 0; y <= height; y++) {
    const hit = y < height && rowHits[y].n >= 12;
    if (hit) {
      if (run < 0) run = y;
    } else if (run >= 0) {
      if (y - 1 - run > bestE - bestS) {
        bestS = run;
        bestE = y - 1;
      }
      run = -1;
    }
  }

  let minX = width;
  let maxX = -1;
  for (let y = bestS; y <= bestE; y++) {
    if (rowHits[y].n < 12) continue;
    if (rowHits[y].min < minX) minX = rowHits[y].min;
    if (rowHits[y].max > maxX) maxX = rowHits[y].max;
  }
  return { left: minX, top: bestS, width: maxX - minX + 1, height: bestE - bestS + 1 };
}

async function centerProduct(buf, grey, size) {
  const bbox = await contentBBox(buf, grey);
  const bleed = 8;
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, bbox.left - bleed);
  const top = Math.max(0, bbox.top - bleed);
  const width = Math.min(meta.width - left, bbox.width + bleed * 2);
  const height = Math.min(meta.height - top, bbox.height + bleed * 2);
  const cropped = await sharp(buf).extract({ left, top, width, height }).png().toBuffer();

  const fill = size * 0.76;
  const scale = fill / Math.max(width, height);
  const nw = Math.max(1, Math.round(width * scale));
  const nh = Math.max(1, Math.round(height * scale));
  const resized = await sharp(cropped).resize(nw, nh).png().toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background: grey } })
    .composite([{ input: resized, left: Math.round((size - nw) / 2), top: Math.round((size - nh) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function productTile({ src, dest, left, top, width, height, grey, erase, padLeft = 0, center = false, size = 640 }) {
  let img = sharp(src).extract({ left, top, width, height });
  const patches = [];
  for (const [x, y, w, h] of erase) {
    patches.push({ input: await flat(w, h, grey), left: x, top: y });
  }
  let buf = await img.composite(patches).png().toBuffer();

  if (padLeft > 0) {
    buf = await sharp(buf)
      .extend({ left: padLeft, background: grey })
      .png()
      .toBuffer();
  }

  if (center) {
    buf = await centerProduct(buf, grey, size);
    await sharp(buf).toFile(dest);
    log('tile', dest, await sharp(dest).metadata());
    return;
  }

  const meta = await sharp(buf).metadata();
  const side = Math.max(meta.width, meta.height);
  buf = await sharp(buf)
    .extend({
      top: Math.floor((side - meta.height) / 2),
      bottom: Math.ceil((side - meta.height) / 2),
      left: Math.floor((side - meta.width) / 2),
      right: Math.ceil((side - meta.width) / 2),
      background: grey,
    })
    .png()
    .toBuffer();

  await sharp(buf).resize(size, size).png({ compressionLevel: 9 }).toFile(dest);
  log('tile', dest, await sharp(dest).metadata());
}

const cardsSrc = `${REFS}/nodes/I240_26793_89_37850.png`;

// Card 1 — ELEMIS frangipani monoi. Tile spans x 0..574, y 29..604.
await productTile({
  src: cardsSrc,
  dest: `${OUT}/product-elemis-frangipani.png`,
  left: 0,
  top: 29,
  width: 574,
  height: 575,
  grey: { r: 242, g: 242, b: 242, alpha: 1 },
  erase: [
    [0, 0, 150, 74],
    [486, 0, 88, 86],
    [446, 500, 128, 75],
  ],
});

// Card 2 — CLARINS body firming. The screenshot crop is right-heavy and the
// tube sits against the artboard edge, so detect the bottle and centre it.
await productTile({
  src: cardsSrc,
  dest: `${OUT}/product-clarins-body-firming.png`,
  left: 640,
  top: 29,
  width: 482,
  height: 575,
  grey: { r: 238, g: 238, b: 238, alpha: 1 },
  erase: [
    [0, 0, 74, 74],
    [388, 500, 94, 75],
  ],
  center: true,
});

// ELEMIS pro-collagen — the product on the entry-point PDP.
const pdpSrc = `${REFS}/fills/e91773b8.png`;
await productTile({
  src: pdpSrc,
  dest: `${OUT}/product-elemis-procollagen.png`,
  left: 360,
  top: 1030,
  width: 600,
  height: 500,
  grey: await sampleColor(pdpSrc, 200, 1100),
  erase: [],
});

const poses = [
  ['nodes/I240_26780_102_39684.png', 'mascot-phone.png', 900],
  ['nodes/I240_26781_102_39952.png', 'mascot-eyes-closed.png', 800],
  ['nodes/I240_26782_102_39986.png', 'mascot-waving.png', 800],
  ['nodes/I240_26783_102_40055.png', 'mascot-arms-open.png', 800],
  ['nodes/I240_26788_102_40124.png', 'mascot-calm.png', 800],
  ['nodes/I240_26839_167_25078_153_22032.png', 'mascot-head-ai.png', 700],
  ['nodes/I240_26779_133_18779_153_22032.png', 'mascot-head-hero.png', 600],
  ['nodes/I240_26789_153_22047.png', 'mascot-head-avatar.png', 400],
  ['nodes/I240_26777_102_39228.png', 'mascot-banner-search.png', 500],
  ['nodes/I240_26778_153_21782.png', 'mascot-banner-share.png', 500],
];

for (const [src, name, maxDim] of poses) {
  const full = `${REFS}/${src}`;
  if (!fs.existsSync(full)) {
    console.log(`skip  ${name}`);
    continue;
  }
  await trimTo(full, `${OUT}/${name}`, maxDim);
}
