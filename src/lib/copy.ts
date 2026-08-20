/** Spoken chat copy: drop a trailing full stop, keep ellipses and questions. */
export function chatCopy(text: string) {
  return text.replace(/(?<!\.)\.\s*$/u, '');
}
