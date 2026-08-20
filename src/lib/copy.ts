/** Spoken chat copy: drop a trailing full stop, keep ellipses and questions. */
export function chatCopy(text: string) {
  return text.replace(/(?<!\.)\.\s*$/u, '');
}

/** Keep short prepositions with the next word, and the last two words of a line together. */
const HANGING =
  /(^|\s)(в|во|на|с|со|к|ко|у|о|об|обо|и|а|но|по|от|до|из|за|для|не|ни|или)\s+/giu;

export function noOrphan(text: string) {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(HANGING, '$1$2\u00a0')
        .replace(/(\S+)\s+(\S+)\s*$/u, '$1\u00a0$2'),
    )
    .join('\n');
}
