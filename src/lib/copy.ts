/** Spoken chat copy: drop a trailing full stop, keep ellipses and questions. */
export function chatCopy(text: string) {
  return text.replace(/(?<!\.)\.\s*$/u, '');
}

/** Glue short Russian function words to the next word so they cannot end a line. */
const HANGING =
  /(^|\s)(из-за|из-под|чтобы|между|перед|через|около|либо|или|без|для|под|при|про|над|обо|об|от|до|из|за|со|во|ко|по|на|не|ни|но|да|бы|же|ли|и|а|в|с|к|у|о|я)\s+/giu;

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
