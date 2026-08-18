/** Loading beats from the assistant-response animation spec. */
export const LOADING_BEATS = [
  'Ищу баночки',
  '\\(★ω★)/',
  'Изучаю отзывы',
  '(￢‿￢ )',
  'Смотрю где скидки',
  '(*≧ω≦*)',
  '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
] as const;

export const LOADING_BEAT_MS = 320;
export const LOADING_HOLD_MS = 280;
export const LOADING_MS = LOADING_BEATS.length * LOADING_BEAT_MS + LOADING_HOLD_MS;
