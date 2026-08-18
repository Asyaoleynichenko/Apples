/**
 * Walks the fifteen flows from the brief straight through the conversation
 * engine, with no browser in the way. Prints each transcript and fails if a
 * turn leaves the user without a way forward.
 */
import { EMPTY_CONVERSATION, runAction, runFreeText, type AiTurn } from '../src/lib/ai';
import { EMPTY_PROFILE } from '../src/lib/profile';
import { PRODUCTS } from '../src/data/products';
import type { BeautyProfile, ChatContext, Conversation, QuickReply } from '../src/lib/types';

type Line = { who: 'user' | 'ai'; text: string };

const failures: string[] = [];

class Sim {
  profile: BeautyProfile = structuredClone(EMPTY_PROFILE);
  conv: Conversation = structuredClone(EMPTY_CONVERSATION);
  chatContext: ChatContext = { from: 'favorites' };
  lines: Line[] = [];
  replies: QuickReply[] = [];
  sheets: string[] = [];

  constructor(public name: string) {}

  private apply(turn: AiTurn) {
    if (turn.userText) this.lines.push({ who: 'user', text: turn.userText });
    for (const m of turn.messages) {
      if (m.role !== 'ai') continue;
      switch (m.kind) {
        case 'text':
          this.lines.push({ who: 'ai', text: m.text });
          break;
        case 'products':
          this.lines.push({
            who: 'ai',
            text: `[карточки: ${m.productIds.map((id) => `${PRODUCTS[id].brand}${m.bestId === id ? ' ★BEST MATCH' : ''}${m.notes?.[id] ? ` (${m.notes[id]})` : ''}`).join(' | ')}]`,
          });
          break;
        case 'checks':
          this.lines.push({ who: 'ai', text: `[${m.title}: ${m.items.map((i) => `${i.ok ? '✓' : '!'} ${i.text}`).join('; ')}]` });
          break;
        case 'compare':
          this.lines.push({ who: 'ai', text: `[таблица сравнения: ${m.productIds.map((i) => PRODUCTS[i].brand).join(' / ')}]` });
          break;
        case 'evidence':
          this.lines.push({ who: 'ai', text: `[доказательства: ${PRODUCTS[m.productId].brand}]` });
          break;
        case 'reviews':
          this.lines.push({ who: 'ai', text: `[отзывы: ${PRODUCTS[m.productId].brand}]` });
          break;
        case 'sources':
          this.lines.push({ who: 'ai', text: `[источники: ${PRODUCTS[m.productId].brand}]` });
          break;
        case 'content':
          this.lines.push({ who: 'ai', text: `[материалы: ${m.contentIds.length}]` });
          break;
        case 'routine':
          this.lines.push({
            who: 'ai',
            text: `[рутина: ${m.lines.map((l) => `${l.time}/${l.step}${l.productId ? '=' + PRODUCTS[l.productId].brand : ''}`).join(', ')}]`,
          });
          break;
        case 'handoff':
          this.lines.push({ who: 'ai', text: '[карточка передачи консультанту]' });
          break;
        case 'memory':
          this.lines.push({ who: 'ai', text: `[запомнила: ${m.text}]` });
          break;
      }
    }

    if (turn.profile) this.profile = { ...this.profile, ...turn.profile };
    for (const l of turn.learn ?? []) if (!this.profile.learned.includes(l)) this.profile.learned.push(l);
    if (turn.conversation) this.conv = { ...this.conv, ...turn.conversation };
    if (turn.sheet) this.sheets.push(turn.sheet.name);
    if (turn.messages.length || turn.replies.length) this.replies = turn.replies;
    if (turn.then) this.apply(turn.then);
  }

  private get ctx() {
    return { profile: this.profile, conv: this.conv, chatContext: this.chatContext };
  }

  tap(label: string) {
    const r = this.replies.find((x) => x.label === label);
    if (!r) {
      failures.push(`${this.name}: нет быстрого ответа «${label}». Есть: ${this.replies.map((x) => x.label).join(', ') || '—'}`);
      return this;
    }
    this.apply(runAction(r.action, r.value, this.ctx));
    return this.checkAlive(`после «${label}»`);
  }

  act(action: string, value?: string) {
    this.apply(runAction(action, value, this.ctx));
    return this.checkAlive(`после действия ${action}`);
  }

  say(text: string) {
    const turn = runFreeText(text, this.ctx);
    this.apply({ ...turn, userText: text });
    return this.checkAlive(`после «${text}»`);
  }

  from(ctx: ChatContext) {
    this.chatContext = ctx;
    if (ctx.from === 'pdp') this.conv = { ...this.conv, focusId: ctx.productId, state: 'PRODUCT_DETAIL' };
    return this;
  }

  private checkAlive(where: string) {
    if (!this.replies.length) failures.push(`${this.name}: тупик ${where} — быстрых ответов нет`);
    return this;
  }

  /** Prices use non-breaking spaces, so comparisons normalise whitespace. */
  private static norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

  private hit(substring: string, lines = this.lines) {
    return lines.some((l) => Sim.norm(l.text).includes(Sim.norm(substring)));
  }

  expect(substring: string) {
    if (!this.hit(substring)) failures.push(`${this.name}: в диалоге нет «${substring}»`);
    return this;
  }

  expectNot(substring: string) {
    if (this.hit(substring)) failures.push(`${this.name}: в диалоге не должно быть «${substring}»`);
    return this;
  }

  /** Checks only the latest turn, for "the conversation did not restart". */
  expectRecentNot(substring: string, n = 6) {
    if (this.hit(substring, this.lines.slice(-n)))
      failures.push(`${this.name}: в последнем ответе не должно быть «${substring}»`);
    return this;
  }

  expectLearned(substring: string) {
    if (!this.profile.learned.some((l) => l.toLowerCase().includes(substring.toLowerCase())))
      failures.push(`${this.name}: профиль не запомнил «${substring}» (есть: ${this.profile.learned.join(' | ') || '—'})`);
    return this;
  }

  print() {
    console.log(`\n\x1b[1m── ${this.name} ${'─'.repeat(Math.max(0, 60 - this.name.length))}\x1b[0m`);
    for (const l of this.lines) {
      console.log(l.who === 'user' ? `\x1b[35m  ты ›\x1b[0m ${l.text}` : `\x1b[32m  ai ›\x1b[0m ${l.text}`);
    }
    console.log(`\x1b[2m  быстрые ответы: ${this.replies.map((r) => r.label).join(' · ') || '—'}\x1b[0m`);
    console.log(`\x1b[2m  состояние: ${this.conv.state}${this.sheets.length ? ` · шиты: ${this.sheets.join(', ')}` : ''}\x1b[0m`);
    return this;
  }
}

/* ------------------------------------------------------------ the flows */

// FLOW 01 — a fully specified free-text request.
new Sim('FLOW 01 · крем для сухой кожи до 3000')
  .say('Мне нужен крем для сухой кожи до 3000 ₽')
  .expect('поняла: крем')
  .expect('лёгкую текстуру или')
  .tap('лёгкую')
  .expect('до 3 000 ₽')
  .tap('поднять бюджет')
  .expect('расширяю бюджет')
  .expect('карточки')
  .print();

// FLOW 02 — the guided funnel, then the whole main demo path.
const main = new Sim('FLOW 02 · что мне купить (главный путь)')
  .act('q:buy')
  .expect('что сейчас хочется подобрать')
  .tap('уход')
  .expect('важнее всего')
  .tap('эффект')
  .expect('по бюджету')
  .tap('2–5 тыс. ₽')
  .expect('что тебе точно не нравится')
  .tap('сильные отдушки')
  .expect('ищу варианты')
  .expect('best match')
  .expectNot('elemis frangipani') // filtered out: strong fragrance
  .tap('почему именно он?')
  .expect('доказательства')
  .tap('посмотреть источники')
  .expect('источники')
  .tap('сравнить')
  .expect('таблица сравнения')
  .print();
main.act('open:clarins').act(`feedback:clarins`).tap('не моё').tap('текстура').expectLearned('плотные текстуры').print();

// FLOW 03 — compare on request.
new Sim('FLOW 03 · сравни эти два').act('popular').say('Сравни эти два').expect('таблица сравнения').expect('я бы взяла').print();

// FLOW 04 — cheaper.
new Sim('FLOW 04 · есть дешевле').act('popular').say('Есть что-нибудь дешевле?').expect('нашла').expect('карточки').print();

// FLOW 05 — suitability from a product page.
new Sim('FLOW 05 · подойдёт ли мне этот')
  .from({ from: 'pdp', productId: 'doublewear' })
  .say('Подойдёт ли мне этот продукт?')
  .expectNot('какой продукт')
  .print();

// FLOW 06 — trust.
new Sim('FLOW 06 · почему я должна тебе доверять')
  .say('Почему я должна тебе доверять?')
  .expect('не должна')
  .expect('на чём я строю ответ')
  .print();

// FLOW 07 — editorial material.
new Sim('FLOW 07 · есть обзоры').act('popular').say('Есть обзоры?').expect('материалы').print();

// FLOW 08 — human handoff.
new Sim('FLOW 08 · можно консультанта')
  .act('popular')
  .say('Можно с консультантом?')
  .expect('передам ему контекст')
  .expect('карточка передачи')
  .print();

// FLOW 09 — refusing personalisation must not block anything.
new Sim('FLOW 09 · не хочу отвечать на вопросы')
  .say('Я не хочу отвечать на вопросы')
  .expect('можешь просто написать')
  .tap('продолжить')
  .expect('карточки')
  .print();

// FLOW 10 — negative feedback teaches the profile.
const learned = new Sim('FLOW 10 · мне не понравился продукт')
  .act('popular')
  .act('feedback:frangipani')
  .tap('не моё')
  .tap('запах')
  .expectLearned('отдушки')
  .print();

// FLOW 11 — the next request must use what was learned, and not re-ask it.
learned
  .act('q:buy')
  .tap('уход')
  .tap('эффект')
  .tap('2–5 тыс. ₽')
  .expectRecentNot('что тебе точно не нравится')
  .expect('я помню')
  .print();

// FLOW 12 — no data, no invented answer.
new Sim('FLOW 12 · вопрос без данных')
  .say('Какой у него срок годности после вскрытия?')
  .expect('не хочу придумывать')
  .print();

// FLOW 13 — genuinely impossible request.
new Sim('FLOW 13 · нет подходящего товара')
  .say('Ищу парфюм до 1000 ₽')
  .expect('не нашла вариант')
  .tap('показать ближайшие варианты')
  .print();

// FLOW 14 — changing the budget mid-conversation.
new Sim('FLOW 14 · меняю бюджет')
  .act('q:buy')
  .tap('уход')
  .tap('цена')
  .tap('до 2 000 ₽')
  .tap('ничего')
  .say('На самом деле хочу до 5000')
  .expect('расширяю бюджет до 5 000')
  .expect('карточки')
  .expectRecentNot('что сейчас хочется подобрать')
  .print();

// FLOW 15 — the user changes her mind about a pick.
new Sim('FLOW 15 · передумала')
  .act('popular')
  .say('Не хочу этот')
  .expect('что именно не подошло')
  .tap('дорого')
  .expect('пересобираю подборку')
  .print();

/* ------------------------------------------------------- extra scenarios */

new Sim('доп · подарок подруге')
  .say('Что подарить подруге?')
  .expect('бюджет подарка')
  .tap('до 5 000 ₽')
  .expect('предпочтения')
  .say('Любит бренд Clarins, крем для тела, чувствительная кожа')
  .expect('понравятся эти продукты')
  .print();
new Sim('доп · собери уход').say('Собери мне уход').tap('сухая').expect('рутина').print();
new Sim('доп · отзывы').act('popular').say('Что люди говорят про этот продукт?').expect('отзывы:').print();
new Sim('доп · похожее').act('popular').say('Есть что-то похожее?').expect('карточки').print();
new Sim('доп · непонятный запрос').say('Мне надо что-нибудь нормальное').expect('сузим выбор').print();
new Sim('доп · повторная покупка')
  .say('Нужен плотный тональный крем')
  .expect('уже покупала')
  .tap('повторить покупку')
  .print();
new Sim('доп · контекст статьи')
  .from({ from: 'content', title: 'Уход за телом' })
  .act('popular')
  .say('Есть что-то похожее?')
  .expectNot('какой продукт')
  .print();

/* ------------------------------------------------------------- verdict */

console.log('');
if (failures.length) {
  console.log(`\x1b[31m✗ ${failures.length} проблем\x1b[0m`);
  failures.forEach((f) => console.log(`  · ${f}`));
  process.exit(1);
} else {
  console.log('\x1b[32m✓ все флоу проходят, тупиков нет\x1b[0m');
}
