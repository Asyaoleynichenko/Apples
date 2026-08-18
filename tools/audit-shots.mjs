import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = 'design-refs/audit/proto';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=2'],
  userDataDir: '.chrome-audit',
});

const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: 520, height: 980, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`http://localhost:${process.env.PORT ?? '5175'}/`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name) {
  const el = await page.$('.device');
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}

async function tap(text, opts = {}) {
  const ok = await page.evaluate((t, ex) => {
    const nodes = [...document.querySelectorAll('button, .press, [role=button], a')];
    const hits = nodes.filter((el) => {
      const s = (el.innerText || '').trim();
      return ex ? s === t : s.toLowerCase().includes(t.toLowerCase());
    });
    const el = hits[0];
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, text, opts.exact ?? false);
  if (!ok) console.log(`  !! could not tap "${text}"`);
  await wait(opts.wait ?? 700);
  return ok;
}

async function tapSel(sel) {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  if (!ok) console.log(`  !! could not tap ${sel}`);
  await wait(700);
  return ok;
}

await shot('01-favorites');
await tapSel('.floating-ai');
await wait(500);
await shot('02-intro-sheet');

await tapSel('.sheet--intro .send');
await wait(600);
await shot('03-onb-intro');
await tap('пройду позже', { exact: true, wait: 900 });
await shot('04-chat-welcome');

await tap('выбери подарок', { exact: true, wait: 1600 });
await shot('05-chat-gift-budget');
await tap('до 5 000 ₽', { exact: true, wait: 1400 });
await shot('06-chat-gift-prefs');
await page.type('.input-wrap__field', 'Любит бренд Clarins, крем для тела, чувствительная кожа');
await page.keyboard.press('Enter');
await wait(2200);
await shot('07-chat-gift-recs');

await tapSel('.chat-header__close');
await wait(400);
await tapSel('.tabbar__item[aria-label=search]');
await wait(400);
await shot('08-search');

await tapSel('.tabbar__item[aria-label=favorites]');
await wait(400);
await tapSel('.pcard__media');
await wait(800);
await shot('09-pdp');
await tapSel('.pdp__topbar button:last-of-type');
await wait(600);
await shot('10-share');

console.log('\nerrors', errors.length);
errors.slice(0, 10).forEach((e) => console.log(' ', e));
await browser.close();
