import type { Intent, Slots } from './types';

export type Parsed = {
  intent: Intent;
  slots: Partial<Slots>;
  /** True when the message only adjusts an existing request instead of starting one. */
  isCorrection: boolean;
};

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

/**
 * Questions the mock assistant has no data for. Checked before anything else so
 * a stray "spf" never gets pulled into a confident-sounding answer.
 */
const OUT_OF_SCOPE = [
  'срок годности',
  'дозиров',
  'аллерг',
  'беремен',
  'кормлен',
  'дерматолог',
  'рецепт',
  'противопоказ',
  'можно ли смешивать',
  'сколько именно процент',
  'в процентах',
  'какой ph',
  'какая ph',
];

/* --------------------------------------------------------------- entities */

const GROUPS: [RegExp, Slots['group']][] = [
  [/парфюм|аромат(?!ная)|духи|туалетн/i, 'fragrance'],
  [/волос|шампун|кудр|локон|бальзам для волос|мист/i, 'hair'],
  [/макияж|помад|тональ|тушь|консилер|блеск|тени|румян/i, 'makeup'],
  [/уход|крем|кожа|кожи|умыван|очищен|пенк|сыворотк|увлажнен|лицо|лица|тела|тело/i, 'care'],
];

const TYPES: [RegExp, Slots['type']][] = [
  [/помад/i, 'lipstick'],
  [/тональ|тоналк|основа под макияж/i, 'foundation'],
  [/пенк|умыван|очищающ|гель для умыв/i, 'cleanser'],
  [/мист|спрей/i, 'mist'],
  [/крем/i, 'cream'],
];

/** [pattern, slot value, genitive phrase used in the "поняла: …" recap] */
const NEEDS: [RegExp, string, string][] = [
  [/сух(ая|ой|ую|ости)/i, 'сухая', 'для сухой кожи'],
  [/жирн(ая|ой|ую)/i, 'жирная', 'для жирной кожи'],
  [/чувствительн/i, 'чувствительная', 'для чувствительной кожи'],
  [/комбинирован/i, 'комбинированная', 'для комбинированной кожи'],
];

const TEXTURES: [RegExp, Slots['texture']][] = [
  [/лёгк|легк|невесом|нежирн|воздушн/i, 'light'],
  [/плотн|насыщен|богат|густ|жирн(ый|ая) крем/i, 'rich'],
];

/** Understands "до 3000", "3 000 ₽", "до 5 тысяч", "2-5 тыс". */
export function parseBudget(input: string): { budgetMax: number; budgetLabel: string } | null {
  const q = input.toLowerCase().replace(/\u00a0/g, ' ');

  const range = q.match(/(\d+)\s*[-–—]\s*(\d+)\s*(тыс|т\.?р)/);
  if (range) {
    const max = Number(range[2]) * 1000;
    return { budgetMax: max, budgetLabel: `${range[1]}–${range[2]} тыс. ₽` };
  }

  const thousands = q.match(/(?:до\s*)?(\d+(?:[.,]\d+)?)\s*(?:тыс|тысяч|т\.?р)/);
  if (thousands) {
    const max = Math.round(Number(thousands[1].replace(',', '.')) * 1000);
    return { budgetMax: max, budgetLabel: `до ${fmt(max)} ₽` };
  }

  const plain = q.match(/(?:до|бюджет|в\s*пределах|максимум|не\s*больше|не\s*дороже)\D{0,6}(\d[\d\s]{2,})/);
  if (plain) {
    const max = Number(plain[1].replace(/\s/g, ''));
    if (max >= 100) return { budgetMax: max, budgetLabel: `до ${fmt(max)} ₽` };
  }

  const bare = q.match(/(\d[\d\s]{2,})\s*(?:₽|руб|р\b)/);
  if (bare) {
    const max = Number(bare[1].replace(/\s/g, ''));
    if (max >= 100) return { budgetMax: max, budgetLabel: `до ${fmt(max)} ₽` };
  }

  return null;
}

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

export function extractSlots(input: string): Partial<Slots> {
  const q = input.toLowerCase();
  const slots: Partial<Slots> = {};

  for (const [re, group] of GROUPS)
    if (re.test(q)) {
      slots.group = group;
      break;
    }
  for (const [re, type] of TYPES)
    if (re.test(q)) {
      slots.type = type;
      break;
    }
  for (const [re, need, label] of NEEDS)
    if (re.test(q)) {
      slots.need = need;
      slots.needLabel = label;
      break;
    }
  for (const [re, texture] of TEXTURES)
    if (re.test(q)) {
      slots.texture = texture;
      break;
    }

  const budget = parseBudget(q);
  if (budget) Object.assign(slots, budget);

  const avoid: string[] = [];
  if (/без\s*отдушк|не\s*люблю\s*(сильн\w*\s*)?(отдушк|запах|аромат)|раздражает\s*запах/i.test(q))
    avoid.push('сильные отдушки');
  if (/не\s*люблю\s*плотн|без\s*плотн|не\s*выношу\s*плотн|только\s*лёгк|только\s*легк/i.test(q))
    avoid.push('плотные текстуры');
  if (avoid.length) slots.avoid = avoid;

  if (/подар|подруг|маме|сестре|коллег/i.test(q)) {
    slots.giftFor = /подруг/i.test(q) ? 'подруге' : /маме/i.test(q) ? 'маме' : /сестре/i.test(q) ? 'сестре' : 'в подарок';
  }

  return slots;
}

/* ----------------------------------------------------------------- intent */

/**
 * Keyword matching, in priority order — the first rule that fires wins. There is
 * no NLP here on purpose: the prototype only needs to route to a scripted answer.
 */
export function detectIntent(input: string): Intent {
  const q = input.toLowerCase().trim();

  if (OUT_OF_SCOPE.some((w) => q.includes(w))) return 'unknown';

  if (has(q, 'не хочу отвечать', 'без вопросов', 'не хочу заполнять', 'пропустить', 'потом заполню', 'надоели вопросы'))
    return 'skip';
  if (has(q, 'верить', 'довер', 'обман', 'почему я должна тебе', 'ты не человек')) return 'trust';
  if (has(q, 'консультант', 'живой человек', 'с человеком', 'оператор', 'позвать')) return 'human';
  if (has(q, 'обзор', 'flacon', 'флакон', 'видео', 'статья', 'материал', 'что пишут в блог', 'свотч', 'свотчи', 'на коже', 'оттенк', 'как смотрится')) return 'content';
  if (has(q, 'отзыв', 'что говорят', 'что пишут', 'что люди')) return 'reviews';
  if (has(q, 'источник', 'откуда ты', 'откуда знаешь', 'доказ', 'пруф', 'чем подтверд', 'на чём основ'))
    return 'sources';
  if (has(q, 'сравн', 'что лучше', 'разниц', 'чем отлич')) return 'compare';
  if (has(q, 'дешевле', 'подешевле', 'бюджетн', 'дорого', 'дороговато', 'не по карману')) return 'cheaper';
  if (has(q, 'похож', 'аналог', 'такое же', 'что-то вроде', 'что то вроде', 'альтернатив')) return 'similar';
  if (has(q, 'подойдёт', 'подойдет', 'подходит ли', 'мне подходит', 'стоит ли брать')) return 'suitability';
  if (/(собери|составь|собрать|составить).{0,12}уход|рутин|по шагам|полный уход|схему ухода/i.test(q)) return 'routine';
  if (has(q, 'подар', 'подруг', 'день рожден', 'на праздник')) return 'gift';
  if (has(q, 'тренд', 'популярн', 'новинк', 'что сейчас', 'что берут', 'что модно')) return 'popular';
  if (has(q, 'не хочу этот', 'не нравится этот', 'не подходит', 'не то', 'другое хочу', 'передумал'))
    return 'reject';
  if (has(q, 'не понравил', 'не зашло', 'разочаров', 'верну')) return 'feedback';
  if (has(q, 'на самом деле', 'всё-таки', 'все-таки', 'поменяй', 'измени', 'а лучше', 'вместо этого'))
    return 'change';
  if (has(q, 'почему')) return 'why';
  if (has(q, 'что мне купить', 'что купить', 'помоги выбрать', 'посовету', 'подбери', 'что взять', 'нужен', 'нужна', 'ищу', 'хочу купить'))
    return 'buy';

  // A bare product word with no verb still reads as a request.
  if (/крем|помад|тональ|пенк|сыворотк|шампун|мист|уход|макияж|парфюм/i.test(q)) return 'buy';

  if (has(q, 'что-нибудь', 'что нибудь', 'нормальн', 'не знаю', 'без разницы', 'любое')) return 'choose';

  return 'unknown';
}

/** A correction only tweaks the live request; it must not restart the funnel. */
function looksLikeCorrection(input: string): boolean {
  return /на самом деле|всё-таки|все-таки|а лучше|поменяй|измени|вместо этого|давай до|подними|расширь/i.test(
    input,
  );
}

export function parse(input: string): Parsed {
  const intent = detectIntent(input);
  const slots = extractSlots(input);
  const isCorrection = looksLikeCorrection(input);
  return {
    intent: isCorrection && (slots.budgetMax || slots.texture || slots.group) ? 'change' : intent,
    slots,
    isCorrection,
  };
}
