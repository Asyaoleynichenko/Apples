import { useCallback } from 'react';
import { runAction, runFreeText, type Ctx } from './ai';
import { LOADING_MS } from './loading';
import { useStore } from './store';

/** Wait for the loading sequence plus a beat to read the answer. */
const NAV_DELAY = LOADING_MS + 400;

/**
 * Single place where a conversation turn is produced and its app-level side
 * effects (cart, navigation, viewed history) are carried out. Every entry point
 * goes through here so the assistant behaves identically wherever it is opened.
 */
export function useAssistant() {
  const { profile, conversation, chatContext, applyTurn, push, addToCart, setProfile } = useStore();

  const run = useCallback(
    (action: string, value?: string) => {
      const ctx: Ctx = { profile, conv: conversation, chatContext };
      applyTurn(runAction(action, value, ctx));

      const [head, id] = action.split(':');
      if (!id) {
        if (head === 'profile') window.setTimeout(() => push({ name: 'profile' }), NAV_DELAY);
        return;
      }

      if (head === 'add' || head === 'repeat') addToCart(id);
      if (head === 'open' || head === 'add' || head === 'repeat') {
        setProfile({ viewed: Array.from(new Set([...profile.viewed, id])) });
      }
      if (head === 'open') window.setTimeout(() => push({ name: 'pdp', productId: id }), NAV_DELAY);
      if (head === 'repeat') window.setTimeout(() => push({ name: 'cart' }), NAV_DELAY);
    },
    [profile, conversation, chatContext, applyTurn, push, addToCart, setProfile],
  );

  const send = useCallback(
    (text: string) => {
      const ctx: Ctx = { profile, conv: conversation, chatContext };
      const turn = runFreeText(text, ctx);
      applyTurn({ ...turn, userText: text });
    },
    [profile, conversation, chatContext, applyTurn],
  );

  /** Welcome-screen starters: identical to a quick reply, kept separate for clarity. */
  const start = useCallback((action: string) => run(action), [run]);

  return { run, send, start };
}
