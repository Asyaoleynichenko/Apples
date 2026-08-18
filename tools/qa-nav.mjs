import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.env.PORT ?? '5173';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
  userDataDir: '.chrome-profile',
});
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: 520, height: 980, deviceScaleFactor: 2 });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, label) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) fails.push(label);
};

const tapSel = async (sel, ms = 700) => {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  await wait(ms);
  return ok;
};
const tapText = async (t, ms = 800) => {
  const ok = await page.evaluate((txt) => {
    const el = [...document.querySelectorAll('button, .press, a')].find(
      (n) => (n.innerText || '').trim().toLowerCase() === txt.toLowerCase(),
    );
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, t);
  await wait(ms);
  return ok;
};
const screenClass = () =>
  page.evaluate(() => document.querySelector('.screen')?.className.replace('screen ', '') ?? 'none');
const sheetOpen = () => page.evaluate(() => !!document.querySelector('.sheet'));
const isScrollable = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    return !!el && el.scrollHeight > el.clientHeight + 8;
  }, sel);

const reset = async () => {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
};

console.log('sheets open and close');
await reset();
await tapSel('.floating-ai');
check(await sheetOpen(), 'intro sheet opens');
await tapSel('.sheet__close');
check(!(await sheetOpen()), 'intro sheet closes via X');
await tapSel('.floating-ai');
await tapSel('.sheet-backdrop');
check(!(await sheetOpen()), 'intro sheet closes via backdrop');

console.log('\nnavigation never dead-ends');
await tapSel('.pcard__media');
check((await screenClass()) === 'shop', 'card opens PDP');
check(await isScrollable('.pdp__scroll'), 'PDP scrolls');
await tapSel('.pdp__topbar .press');
check((await screenClass()) === 'shop', 'PDP back returns to list');
check(await isScrollable('.shop__scroll'), 'favorites scrolls');

console.log('\ntab bar reaches every root');
for (const key of ['cart', 'profile', 'search', 'favorites']) {
  const tapped = await tapSel(`.tabbar__item[aria-label=${key}]`);
  const heading = await page.evaluate(
    () => document.querySelector('.shop__h1, .search-field input')?.textContent ?? document.querySelector('.search-field input')?.value ?? '',
  );
  check(tapped, `tab ${key} reachable`);
  if (key === 'search') {
    // The search screen replaces the tab bar with the keyboard, as in the design.
    check(!(await page.$('.tabbar')), 'search hides the tab bar');
    await tapSel('.shop__topbar--between .press');
  }
  if (key === 'cart') check(heading.includes('корзина'), 'cart screen');
  if (key === 'profile') check(heading.includes('профиль'), 'profile screen');
}

console.log('\nshare sheet from PDP');
await tapSel('.pcard__media');
await tapSel('.pdp__topbar .press:last-of-type');
check(await sheetOpen(), 'share sheet opens');
await tapText('поделиться');
check(!(await sheetOpen()), 'share sheet closes');

console.log('\nassistant sheets close and return to chat');
await reset();
await tapSel('.floating-ai');
await tapSel('.sheet--intro .send');
await tapText('пройду позже', 900);
check((await screenClass()) === 'chat', 'skipping onboarding lands in chat');
await tapText('выбери подарок', 1500);
await tapText('до 5 000 ₽', 1500);
await tapText('любит clarins', 1700);
check(
  await page.evaluate(() => document.querySelectorAll('.pcard').length > 0),
  'recommendation cards render',
);
for (const [label, closer] of [
  ['почему подходит', 'понятно'],
  ['сравнить', 'закрыть'],
  ['откуда данные', 'вернуться к подборке'],
]) {
  await tapText(label, 1900);
  check(await sheetOpen(), `${label} opens its sheet`);
  await tapText(closer, 700);
  check(!(await sheetOpen()), `${label} sheet closes`);
}
check((await screenClass()) === 'chat', 'still in chat after sheets');

console.log('\nchat back button');
await tapSel('.chat-header__back');
check((await screenClass()) !== 'chat', 'chat back leaves the assistant');

console.log(`\n${fails.length} failures, ${errors.length} console errors`);
fails.forEach((f) => console.log('  -', f));
[...new Set(errors)].forEach((e) => console.log('  !', e));
await browser.close();
process.exitCode = fails.length ? 1 : 0;
