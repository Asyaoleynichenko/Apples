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

/** Clarifying questions land immediately. The beat sequence is only for the
 *  last step — when the assistant is compiling a recommendation. */
export const RESULT_KINDS = ['products', 'routine', 'compare', 'content'] as const;

export function isResultTurn(messages: { kind: string }[]): boolean {
  return messages.some((m) => (RESULT_KINDS as readonly string[]).includes(m.kind));
}
