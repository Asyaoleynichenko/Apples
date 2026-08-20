/** Spoken chat copy: drop a trailing full stop, keep ellipses and questions. */
export function chatCopy(text: string) {
  return text.replace(/(?<!\.)\.\s*$/u, '');
}

/** Keep the last two words of each line together so a heading doesn't leave a hanging word. */
export function noOrphan(text: string) {
  return text
    .split('\n')
    .map((line) => line.replace(/(\S+)\s+(\S+)\s*$/u, '$1\u00a0$2'))
    .join('\n');
}
