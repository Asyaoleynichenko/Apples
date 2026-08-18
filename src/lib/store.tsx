import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { EMPTY_CONVERSATION, type AiTurn } from './ai';
import { LOADING_MS, isResultTurn } from './loading';
import { EMPTY_PROFILE } from './profile';
import { uid } from './uid';
import type { BeautyProfile, CartLine, ChatContext, ChatMessage, Conversation, QuickReply } from './types';

export { uid };

export type Route =
  | { name: 'favorites' }
  | { name: 'search' }
  | { name: 'pdp'; productId: string }
  | { name: 'cart' }
  | { name: 'profile' }
  | { name: 'chat' }
  | { name: 'onboarding' };

/** How the last stack change should be staged on screen. */
export type NavKind = 'push' | 'back' | 'tab' | 'expand';

export type Sheet =
  | { name: 'ai-intro' }
  | { name: 'share'; productId: string }
  | { name: 'why'; productIds: string[] }
  | { name: 'sources'; productIds: string[] }
  | { name: 'compare'; productIds: string[] }
  | { name: 'feedback'; productId: string }
  | { name: 'consultant' };

/** How long the loading sequence runs before the answer lands. */
const TYPING_MS = LOADING_MS;

type Store = {
  route: Route;
  stack: Route[];
  navKind: NavKind;
  sheet: Sheet | null;
  push: (r: Route, kind?: NavKind) => void;
  replace: (r: Route, kind?: NavKind) => void;
  back: () => void;
  resetTo: (r: Route) => void;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;

  profile: BeautyProfile;
  setProfile: (patch: Partial<BeautyProfile>) => void;
  learn: (line: string) => void;

  cart: CartLine[];
  addToCart: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  cartCount: number;

  favorites: string[];
  toggleFavorite: (productId: string) => void;

  chat: ChatMessage[];
  quickReplies: QuickReply[];
  chatContext: ChatContext;
  chatStarted: boolean;
  conversation: Conversation;
  setChatContext: (c: ChatContext) => void;
  setConversation: (patch: Partial<Conversation>) => void;
  pushUser: (text: string) => void;
  pushAi: (messages: ChatMessage[], replies: QuickReply[]) => void;
  /** Applies a whole assistant turn: copy, replies, memory, state and sheets. */
  applyTurn: (turn: AiTurn) => void;
  resetChat: () => void;

  restart: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'favorites' }]);
  const [navKind, setNavKind] = useState<NavKind>('tab');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [profile, setProfileState] = useState<BeautyProfile>(EMPTY_PROFILE);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [chatContext, setChatContext] = useState<ChatContext>({ from: 'favorites' });
  const [conversation, setConversationState] = useState<Conversation>(EMPTY_CONVERSATION);
  const timers = useRef<number[]>([]);

  const route = stack[stack.length - 1];

  // Navigating always dismisses whatever sheet is open, like a real app.
  const push = useCallback((r: Route, kind: NavKind = 'push') => {
    setSheet(null);
    setNavKind(kind);
    setStack((s) => [...s, r]);
  }, []);
  const replace = useCallback((r: Route, kind: NavKind = 'push') => {
    setSheet(null);
    setNavKind(kind);
    setStack((s) => [...s.slice(0, -1), r]);
  }, []);
  const resetTo = useCallback((r: Route) => {
    setSheet(null);
    setNavKind('tab');
    setStack([r]);
  }, []);
  const back = useCallback(() => {
    setSheet((cur) => {
      if (cur) return null;
      setNavKind('back');
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      return null;
    });
  }, []);

  const openSheet = useCallback((s: Sheet) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const setProfile = useCallback(
    (patch: Partial<BeautyProfile>) => setProfileState((p) => ({ ...p, ...patch })),
    [],
  );
  const learn = useCallback(
    (line: string) =>
      setProfileState((p) => (p.learned.includes(line) ? p : { ...p, learned: [...p.learned, line] })),
    [],
  );

  const setConversation = useCallback(
    (patch: Partial<Conversation>) => setConversationState((c) => ({ ...c, ...patch })),
    [],
  );

  const addToCart = useCallback((productId: string) => {
    setCart((c) => {
      const found = c.find((l) => l.productId === productId);
      if (found) return c.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { productId, qty: 1 }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setCart((c) =>
      qty <= 0
        ? c.filter((l) => l.productId !== productId)
        : c.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }, []);

  const toggleFavorite = useCallback(
    (productId: string) =>
      setFavorites((f) => (f.includes(productId) ? f.filter((x) => x !== productId) : [...f, productId])),
    [],
  );

  const pushUser = useCallback((text: string) => {
    setChat((c) => [...c, { id: uid('u'), role: 'user', kind: 'text', text }]);
  }, []);

  /**
   * Clarifiers appear immediately. The loading beats play only when this turn
   * is the recommendation itself (cards, routine, compare, editorial).
   */
  const pushAi = useCallback((messages: ChatMessage[], replies: QuickReply[]) => {
    setQuickReplies([]);
    if (!isResultTurn(messages)) {
      setChat((c) => [...c, ...messages]);
      setQuickReplies(replies);
      return;
    }
    const typingId = uid('typing');
    setChat((c) => [...c, { id: typingId, role: 'ai', kind: 'typing' }]);
    const timer = window.setTimeout(() => {
      setChat((c) => [...c.filter((m) => m.id !== typingId), ...messages]);
      setQuickReplies(replies);
    }, TYPING_MS);
    timers.current.push(timer);
  }, []);

  const applyTurn = useCallback(
    (turn: AiTurn) => {
      const speaks = turn.messages.length > 0 || turn.replies.length > 0;
      const thinking = isResultTurn(turn.messages);
      const landIn = thinking ? TYPING_MS : 0;
      if (turn.userText) pushUser(turn.userText);
      if (speaks) pushAi(turn.messages, turn.replies);
      if (turn.profile) setProfile(turn.profile);
      turn.learn?.forEach(learn);
      if (turn.conversation) setConversation(turn.conversation);
      if (turn.sheet) {
        // A turn that only opens a sheet has nothing to read first.
        if (!speaks) setSheet(turn.sheet);
        else timers.current.push(window.setTimeout(() => setSheet(turn.sheet!), landIn + 260));
      }
      // After "поняла, ищу варианты" wait a beat, then the thinking animation
      // runs on the result turn. Clarifiers don't stall the next question.
      if (turn.then) {
        const next = turn.then;
        const wait = thinking ? TYPING_MS + 320 : 480;
        const timer = window.setTimeout(() => applyTurn(next), wait);
        timers.current.push(timer);
      }
    },
    [pushUser, pushAi, setProfile, learn, setConversation],
  );

  const resetChat = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setChat([]);
    setQuickReplies([]);
    setConversationState(EMPTY_CONVERSATION);
  }, []);

  const restart = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setNavKind('tab');
    setStack([{ name: 'favorites' }]);
    setSheet(null);
    setProfileState(EMPTY_PROFILE);
    setCart([]);
    setFavorites([]);
    setChat([]);
    setQuickReplies([]);
    setConversationState(EMPTY_CONVERSATION);
    setChatContext({ from: 'favorites' });
  }, []);

  const cartCount = cart.reduce((n, l) => n + l.qty, 0);

  const value = useMemo<Store>(
    () => ({
      route,
      stack,
      navKind,
      sheet,
      push,
      replace,
      back,
      resetTo,
      openSheet,
      closeSheet,
      profile,
      setProfile,
      learn,
      cart,
      addToCart,
      setQty,
      cartCount,
      favorites,
      toggleFavorite,
      chat,
      quickReplies,
      chatContext,
      chatStarted: chat.length > 0,
      conversation,
      setChatContext,
      setConversation,
      pushUser,
      pushAi,
      applyTurn,
      resetChat,
      restart,
    }),
    [
      route,
      stack,
      navKind,
      sheet,
      push,
      replace,
      back,
      resetTo,
      openSheet,
      closeSheet,
      profile,
      setProfile,
      learn,
      cart,
      addToCart,
      setQty,
      cartCount,
      favorites,
      toggleFavorite,
      chat,
      quickReplies,
      chatContext,
      conversation,
      setConversation,
      pushUser,
      pushAi,
      applyTurn,
      resetChat,
      restart,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
