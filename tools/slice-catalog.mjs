/**
 * Cuts the remaining product photos out of the flattened Гold Apple screenshots
 * that ship inside the Figma file, so the expanded catalogue still uses real
 * artwork from the design rather than invented stand-ins.
 *
 * Crop boxes are expressed against the 471pt preview of each fill and scaled up
 * to the exported 1320px raster. Each box deliberately avoids the discount
 * badge, the heart and the basket button baked into the screenshot.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SCALE = 1320 / 471;
const OUT = 'public/assets';
const CANVAS = 640;
const INNER = 560;
const BG = { r: 242, g: 242, b: 242, alpha: 1 };

/**
 * `fade` undoes the out-of-stock dimming of the cart thumbnail: the screenshot
 * shows it composited on white at partial opacity, so the levels are pushed back.
 * @type {{fill: string, out: string, box: [number, number, number, number], fade?: number}[]}
 */
const CUTS = [
  { fill: '9231802f', out: 'product-mac-macximal.png', box: [40, 498, 175, 748] },
  { fill: '9231802f', out: 'product-curly-mist.png', box: [288, 502, 416, 741] },
  { fill: 'e9ce9405', out: 'product-el-futurist.png', box: [40, 328, 175, 548] },
  { fill: 'e9ce9405', out: 'product-el-doublewear.png', box: [284, 324, 420, 550] },
  { fill: 'ad19f31c', out: 'product-celimax-foam.png', box: [30, 472, 105, 544], fade: 0.42 },
];

mkdirSync(OUT, { recursive: true });

for (const { fill, out, box, fade } of CUTS) {
  const [x1, y1, x2, y2] = box.map((v) => Math.round(v * SCALE));
  let pipe = sharp(`design-refs/fills/${fill}.png`).extract({
    left: x1,
    top: y1,
    width: x2 - x1,
    height: y2 - y1,
  });
  if (fade) pipe = pipe.linear(1 / fade, (-255 * (1 - fade)) / fade);
  let cut = await pipe.trim({ threshold: 12 }).toBuffer();

  // Undoing the dimming also shifts the tile's grey; pull it back onto the
  // catalogue background so the cut-out does not read as a pasted rectangle.
  if (fade) {
    const { data } = await sharp(cut).extract({ left: 0, top: 0, width: 6, height: 6 }).raw().toBuffer({
      resolveWithObject: true,
    });
    const avg = [0, 1, 2].map((c) => data.filter((_, i) => i % 3 === c).reduce((a, b) => a + b, 0) / 36);
    cut = await sharp(cut)
      .linear([1, 1, 1], [BG.r - avg[0], BG.g - avg[1], BG.b - avg[2]])
      .toBuffer();
  }

  const inner = await sharp(cut)
    .resize(INNER, INNER, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(inner).metadata();

  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: BG } })
    .composite([
      {
        input: inner,
        left: Math.round((CANVAS - meta.width) / 2),
        top: Math.round((CANVAS - meta.height) / 2),
      },
    ])
    .png()
    .toFile(`${OUT}/${out}`);

  console.log(`${out}  ${meta.width}x${meta.height}`);
}
