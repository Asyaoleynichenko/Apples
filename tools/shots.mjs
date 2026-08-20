import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = 'shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=2'],
  userDataDir: '.chrome-profile',
});

const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: 520, height: 980, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const PORT = process.env.PORT ?? '5173';
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name) {
  const el = await page.$('.device');
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}

/** Click the first element whose visible text matches. */
async function tap(text, opts = {}) {
  const { exact = false, nth = 0, selector = 'button, .press, [role=button], a' } = opts;
  const ok = await page.evaluate(
    (t, ex, n, sel) => {
      const nodes = [...document.querySelectorAll(sel)];
      const hits = nodes.filter((el) => {
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
    selector,
  );
  if (!ok) console.log(`  !! could not tap "${text}"`);
  await wait(opts.wait ?? 700);
  return ok;
}

const closeSheet = () => tapSel('.sheet__close', 'sheet close');

async function tapSel(sel, label = sel) {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  if (!ok) console.log(`  !! could not tap ${label}`);
  await wait(700);
  return ok;
}

// 1 — entry point
await shot('01-favorites');

// 2 — assistant intro sheet
await tapSel('.floating-ai', 'floating AI banner');
await shot('02-ai-intro-sheet');

// 3 — chat (intro sheet expands here, not into onboarding)
await tapSel('.sheet--intro .send', 'intro send');
await wait(600);
await shot('03-chat-from-intro');

await tapSel('.chat-header__close', 'close chat');
await tapSel('.tabbar__item[aria-label=profile]', 'profile tab');
await tap('пройти знакомство', { exact: true, wait: 800 });
await shot('03-onb-intro');
await tap('давай', { exact: true });
await shot('04-onb-priorities');
await tap('текстура');
await tap('состав');
await shot('05-onb-priorities-selected');
await tap('далее', { exact: true });
await shot('06-onb-budget');
await tap('2 000–5 000 ₽', { exact: true });
await tap('далее', { exact: true });
await shot('07-onb-dislikes');
await tap('плотные текстуры', { exact: true });
await tap('далее', { exact: true });
await shot('08-onb-routine');
await tapSel('.onb__input', 'foundation field');
await shot('09-onb-shade');
await tap('1W1, Bone');
await tap('сохранить выбор', { exact: true });
await shot('10-onb-routine-filled');
await tap('далее', { exact: true });
await shot('11-onb-done');
await tap('начать', { exact: true });
await wait(700);

// 4 — chat welcome
await shot('12-chat-welcome');

// 5 — free-text request; onboarding already answered budget and dislikes,
// so only the texture gap is left to ask about
await page.type('.input-wrap__field', 'Мне нужен крем для сухой кожи до 3000');
await page.keyboard.press('Enter');
await wait(1600);
await shot('13-chat-recap');
await tap('лёгкую', { exact: true, wait: 2800 });
await shot('14-chat-recommendation');

// 6 — why, evidence, sources, compare
await tap('почему именно он?', { exact: true, wait: 1800 });
await shot('15-chat-evidence');
await tap('развернуть подробно', { exact: true, wait: 900 });
await shot('16-sheet-why');
await closeSheet();
await tap('посмотреть источники', { exact: true, wait: 1800 });
await shot('17-chat-sources');
await tap('открыть', { exact: false, wait: 900 });
await shot('18-sheet-sources');
await closeSheet();
await tap('сравнить', { exact: true, wait: 1800 });
await shot('19-chat-compare');
await tap('развернуть сравнение', { exact: true, wait: 900 });
await shot('20-sheet-compare');
await closeSheet();

// 7 — the assistant pushes back instead of selling
await tap('есть дешевле', { exact: true, wait: 1800 });
await shot('21-chat-cheaper');
await tap('показать похожие', { exact: true, wait: 1800 });
await shot('22-chat-similar');
await tap('что говорят в отзывах', { exact: true, wait: 1800 });
await shot('23-chat-reviews');

// 7 — PDP + cart
await tapSel('.pcard__media', 'first product card');
await wait(1400);
await shot('24-pdp');
await tap('добавить в корзину', { exact: true });
await shot('25-pdp-added');
await tapSel('.toast', 'cart toast');
await shot('26-cart');

// 8 — checkout -> profile -> feedback -> memory
await tap('ОФОРМИТЬ ЗАКАЗ', {});
await shot('27-profile');
await tap('оценить покупку');
await shot('28-feedback-ask');
await tap('не моё', { exact: true });
await shot('29-feedback-reasons');
await tap('запах', { exact: true });
await shot('30-feedback-done');
await tap('посмотреть профиль', { exact: true });
await shot('31-profile-updated');

// 9 — the assistant remembers the feedback on the next request
await tap('открыть ассистента', { exact: true, wait: 900 });
await page.type('.input-wrap__field', 'Посоветуй мне крем');
await page.keyboard.press('Enter');
await wait(3000);
await shot('32-chat-memory');

// 10 — refusing to invent, and the human handoff
await page.type('.input-wrap__field', 'Какой у него срок годности после вскрытия?');
await page.keyboard.press('Enter');
await wait(1600);
await shot('33-chat-unknown');
await tap('позвать консультанта', { exact: true, wait: 1800 });
await shot('34-chat-handoff');
await closeSheet();

// 11 — search entry point
await tapSel('.chat-header__close', 'close chat');
await tapSel('.tabbar__item[aria-label=search]', 'search tab');
await shot('35-search');

console.log('\nconsole errors:', errors.length);
errors.slice(0, 20).forEach((e) => console.log('  -', e));

await browser.close();
