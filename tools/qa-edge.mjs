import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.env.PORT ?? '5173';
const OUT = 'shots/edge';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=2'],
  userDataDir: '.chrome-profile',
});
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: 520, height: 980, deviceScaleFactor: 2 });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await (await page.$('.device')).screenshot({ path: `${OUT}/${name}.png` });
  console.log('  shot', name);
};

async function tap(text, opts = {}) {
  const { exact = false, nth = 0 } = opts;
  const ok = await page.evaluate(
    (t, ex, n) => {
      const hits = [...document.querySelectorAll('button, .press, [role=button], a')].filter((el) => {
        const s = (el.innerText || '').trim();
        return ex ? s === t : s.toLowerCase().includes(t.toLowerCase());
      });
      const el = hits[n];
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    },
    text,
    exact,
    nth,
  );
  if (!ok) console.log(`  FAIL tap "${text}"`);
  await wait(opts.wait ?? 800);
  return ok;
}

const tapSel = async (sel, ms = 800) => {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  if (!ok) console.log(`  FAIL tap ${sel}`);
  await wait(ms);
  return ok;
};

const type = async (t) => {
  await page.focus('.input-wrap__field');
  await page.type('.input-wrap__field', t, { delay: 8 });
  await page.keyboard.press('Enter');
  await wait(1500);
};

/** Fast-forward through onboarding into the assistant. */
async function toChat() {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await tapSel('.floating-ai');
  await tapSel('.sheet--intro .send');
  await tap('пройду позже', { exact: true, wait: 900 });
}

console.log('A — assistant refuses to invent an answer');
await toChat();
await type('какой SPF у этого крема в цифрах?');
await shot('A-unknown');
if (!(await tap('позвать консультанта', { exact: true, wait: 900 }))) process.exitCode = 1;
await shot('A-consultant-sheet');
await tap('закрыть', { exact: true });

console.log('B — no product worth a confident yes');
await toChat();
await tap('выбери подарок', { exact: true, wait: 1400 });
await tap('до 1 000 ₽', { exact: true, wait: 1400 });
await tap('любит Clarins', { exact: true, wait: 1600 });
await tap('не подходит', { exact: true, wait: 1400 });
await shot('B-no-match');
await tap('расширить параметры', { exact: true, wait: 1500 });
await shot('B-widened');

console.log('C — the user does not trust the assistant');
await toChat();
await type('почему я должна тебе верить?');
await shot('C-trust-sources');
await tap('вернуться к подборке', { exact: true });

console.log('D — hand-off carries the context');
await toChat();
await type('позови консультанта');
await shot('D-handoff');

console.log('E — PDP entry point keeps the product in context');
await toChat(); // returning user: onboarding already dismissed
await tapSel('.chat-header__close', 900);
await tapSel('.pcard__media');
await shot('E-pdp');
await tapSel('.pdp__ai button', 1000);
await shot('E-pdp-ai-sheet');
await tapSel('.sheet--intro .send', 1200);
await shot('E-pdp-chat-context');

console.log('\nconsole errors:', errors.length);
[...new Set(errors)].slice(0, 20).forEach((e) => console.log('  -', e));

await browser.close();
