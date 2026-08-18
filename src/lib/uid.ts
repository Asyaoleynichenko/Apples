let seq = 0;

/** Stable ids for chat messages; kept out of the store so the AI engine can
 *  import it without creating a cycle back through the provider. */
export const uid = (prefix = 'm') => `${prefix}-${++seq}`;
