import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.env.PORT ?? '5173';
const OUT = 'shots/adaptive';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  userDataDir: '.chrome-adaptive',
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(page) {
  return page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
        x: +r.x.toFixed(1),
        y: +r.y.toFixed(1),
        text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
      };
    };
    const clippedBy = (el) => {
      if (!el) return 'missing';
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return `collapsed ${r.width}x${r.height}`;
      let p = el.parentElement;
      while (p) {
        const pr = p.getBoundingClientRect();
        const cs = getComputedStyle(p);
        const clip = /hidden|clip/.test(`${cs.overflow} ${cs.overflowX} ${cs.overflowY}`);
        if (clip) {
          if (r.right > pr.right + 1 || r.left < pr.left - 1 || r.bottom > pr.bottom + 1 || r.top < pr.top - 1) {
            return `clipped by .${(p.className || p.tagName).toString().split(' ')[0]}`;
          }
        }
        p = p.parentElement;
      }
      return 'ok';
    };

    const title = document.querySelector('.pdp__titleblock');
    const badges = document.querySelector('.pdp__badges .badges') || document.querySelector('.pdp__badges');
    const sale = document.querySelector('.pdp__badges .badge--sale');
    const hit = document.querySelector('.pdp__badges .badge--hit');
    const copy = document.querySelector('.pdp__copy');
    const cta = document.querySelector('.pdp__cta');
    const add = document.querySelector('.pdp__add');
    const like = document.querySelector('.pdp__like');
    const promo = document.querySelector('.promo-bar');
    const cards = [...document.querySelectorAll('.grid .pcard')].slice(0, 3).map((card) => {
      const b = card.querySelector('.badges');
      const heart = card.querySelector('.pcard__heart');
      const br = b?.getBoundingClientRect();
      const hr = heart?.getBoundingClientRect();
      const overlap = br && hr && !(br.right <= hr.left + 1 || hr.right <= br.left + 1 || br.bottom <= hr.top + 1 || hr.bottom <= br.top + 1);
      return {
        w: +card.getBoundingClientRect().width.toFixed(1),
        badges: b ? (b.innerText || '').replace(/\s+/g, ' ').trim() : '',
        badgesW: br ? +br.width.toFixed(1) : 0,
        overlapHeart: !!overlap,
        status: clippedBy(b),
      };
    });

    return {
      shell: document.documentElement.dataset.shell,
      vw: innerWidth,
      title: box(title),
      copy: box(copy),
      badges: box(badges),
      sale: box(sale),
      hit: box(hit),
      badgesStatus: clippedBy(badges),
      saleStatus: clippedBy(sale),
      hitStatus: clippedBy(hit),
      cta: box(cta),
      add: box(add),
      like: box(like),
      promo: box(promo),
      cards,
    };
  });
}

async function goHome(page) {
  await page.goto(`http://localhost:${PORT}/?t=${Date.now()}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await wait(400);
}

async function openPdp(page) {
  await page.evaluate(() => {
    const el = document.querySelector('.grid .pcard__media');
    el?.click();
  });
  await wait(900);
}

const cases = [
  { name: 'phone-320', width: 320, height: 700, live: true },
  { name: 'phone-390', width: 390, height: 844, live: true },
  { name: 'phone-430', width: 430, height: 932, live: true },
  { name: 'preview-596', width: 596, height: 900, live: true },
  { name: 'tablet-768', width: 768, height: 1024, live: true },
  { name: 'tablet-1024', width: 1024, height: 768, live: true },
  { name: 'desktop-1440', width: 1440, height: 900, live: false },
];

const issues = [];

for (const c of cases) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({
    width: c.width,
    height: c.height,
    deviceScaleFactor: 1,
    isMobile: c.live,
    hasTouch: c.live,
  });
  await goHome(page);
  const home = await measure(page);
  await page.screenshot({ path: `${OUT}/${c.name}-home.png`, fullPage: false });
  await openPdp(page);
  const pdp = await measure(page);
  const el = (await page.$('.device')) || (await page.$('#root'));
  await el.screenshot({ path: `${OUT}/${c.name}-pdp.png` });

  const row = { name: c.width, shell: pdp.shell, vw: pdp.vw };
  const flags = [];
  if (c.live && pdp.shell !== 'live') flags.push(`shell=${pdp.shell}`);
  if (!c.live && pdp.shell !== 'frame') flags.push(`shell=${pdp.shell}`);
  if (!pdp.sale || pdp.sale.w < 8) flags.push('sale missing');
  if (!pdp.hit || pdp.hit.w < 8) flags.push('hit missing');
  if (pdp.saleStatus !== 'ok') flags.push(`sale ${pdp.saleStatus}`);
  if (pdp.hitStatus !== 'ok') flags.push(`hit ${pdp.hitStatus}`);
  if (pdp.badgesStatus !== 'ok') flags.push(`badges ${pdp.badgesStatus}`);
  if (pdp.sale && pdp.copy && pdp.sale.x < pdp.copy.x + pdp.copy.w - 4) {
    /* ok if overlapping title? badges should be to the right of copy */
  }
  if (pdp.sale && pdp.copy && Math.abs(pdp.sale.x + pdp.sale.w - (pdp.title.x + pdp.title.w)) > 24 && pdp.sale.x < pdp.copy.x) {
    flags.push('badges not on the right');
  }
  if (pdp.add && pdp.add.w < 80) flags.push(`add too narrow ${pdp.add.w}`);
  for (const card of home.cards) {
    if (card.overlapHeart) flags.push(`card overlap heart (${card.w}px)`);
    if (card.badges && /HIT|%/.test(card.badges) && card.badgesW < 8) flags.push('card badges collapsed');
  }
  console.log(
    `\n${c.name}  shell=${pdp.shell} vw=${pdp.vw}` +
      `\n  title ${pdp.title?.w}x${pdp.title?.h}  copy ${pdp.copy?.w}` +
      `\n  badges [${pdp.badges?.text}] ${pdp.badges?.w}x${pdp.badges?.h} @${pdp.badges?.x}` +
      `\n  sale ${JSON.stringify(pdp.sale)} ${pdp.saleStatus}` +
      `\n  hit  ${JSON.stringify(pdp.hit)} ${pdp.hitStatus}` +
      `\n  add ${pdp.add?.w} like ${pdp.like?.w}` +
      `\n  cards ${JSON.stringify(home.cards)}` +
      `\n  ${flags.length ? 'FAIL ' + flags.join('; ') : 'OK'}`,
  );
  if (flags.length) issues.push({ name: c.name, flags, pdp, home });
  await page.close();
}

console.log('\n====', issues.length ? `${issues.length} issues` : 'all viewports ok', '====');
await browser.close();
if (issues.length) process.exit(1);
