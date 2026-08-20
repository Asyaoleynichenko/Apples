/* ------------------------------------------------------------- catalogue */

/** Coarse shelf the assistant reasons about when a request mentions a category. */
export type ProductGroup = 'care' | 'makeup' | 'hair' | 'fragrance';

/** What the thing actually is — lets "крем" and "помада" narrow inside a group. */
export type ProductType = 'cream' | 'cleanser' | 'lipstick' | 'foundation' | 'mist';

export type TextureKey = 'light' | 'medium' | 'rich' | 'liquid' | 'matte' | 'spray';

export type FragranceKey = 'none' | 'light' | 'strong';

export type RoutineStep = 'cleanser' | 'serum' | 'cream' | 'spf' | 'treatment';

export type Product = {
  id: string;
  brand: string;
  name: string;
  /** Uppercase line printed on the card, exactly as in the design. */
  category: string;
  group: ProductGroup;
  type: ProductType;
  volume: string;
  price: number;
  oldPrice: number;
  discount: number;
  hit: boolean;
  image: string;
  rating: number;
  reviews: number;
  bonusA: number;
  bonusB: number;
  texture: TextureKey;
  textureLabel: string;
  fragrance: FragranceKey;
  fragranceLabel: string;
  skinTypes: string[];
  effects: string[];
  ingredients: string[];
  tags: string[];
  /** Step this product can cover when the assistant builds a routine. */
  routineStep?: RoutineStep;
  routineTime?: ('am' | 'pm')[];
  /** What buyers praise and criticise most — quoted in reviews and evidence. */
  pros: string[];
  cons: string[];
  /** Editorial material ids, used for the Flacon / video / SMM answers. */
  contentIds: string[];
  giftReady: boolean;
  /** How often the product shows up in Gold Apple content — never called a trend. */
  mentions: number;
  saves: number;
  /** Short lines the assistant uses when it explains a recommendation. */
  why: string[];
  /** Honest downsides — the design's "AI вердикт" never hides them. */
  caveats: string[];
  facts: { label: string; value: string }[];
  volumes: { label: string; available: boolean }[];
};

export type Source = {
  id: string;
  kind: 'community' | 'lab' | 'content' | 'profile';
  title: string;
  detail: string;
  meta: string;
};

export type Editorial = {
  id: string;
  kind: 'flacon' | 'video' | 'smm';
  title: string;
  source: string;
  detail: string;
  category: string;
  section: string;
  minutes: number;
  cover: string;
  href: string;
  topic: 'review' | 'swatch' | 'guide';
  /** What a request/product can match to pull this piece from the Flacon base. */
  tags?: string[];
};

/* --------------------------------------------------------------- profile */

export type BeautyProfile = {
  onboarded: boolean;
  /** True once onboarding has been offered, whether it was completed or skipped. */
  metAssistant: boolean;
  priorities: string[];
  /** Human-readable budget shown on the profile screen. */
  budget: string | null;
  /** Same budget as a number, so recommendations can filter on it. */
  budgetMax: number | null;
  skinType: string | null;
  preferences: string[];
  dislikes: string[];
  routine: Record<string, string>;
  shade: string | null;
  likedProducts: string[];
  dislikedProducts: string[];
  purchases: string[];
  viewed: string[];
  /** Lines the assistant has learned; rendered on the profile screen. */
  learned: string[];
};

export type CartLine = { productId: string; qty: number };

/* ---------------------------------------------------------- conversation */

export type AiState =
  | 'IDLE'
  | 'ONBOARDING'
  | 'UNDERSTANDING_REQUEST'
  | 'CLARIFYING'
  | 'RECOMMENDING'
  | 'EXPLAINING'
  | 'SHOWING_EVIDENCE'
  | 'COMPARING'
  | 'PRODUCT_DETAIL'
  | 'PURCHASE'
  | 'FEEDBACK'
  | 'LEARNING'
  | 'NO_MATCH'
  | 'UNKNOWN'
  | 'HUMAN_HANDOFF';

export type Intent =
  | 'buy'
  | 'choose'
  | 'compare'
  | 'cheaper'
  | 'similar'
  | 'reviews'
  | 'content'
  | 'sources'
  | 'why'
  | 'trust'
  | 'gift'
  | 'routine'
  | 'popular'
  | 'suitability'
  | 'human'
  | 'reject'
  | 'change'
  | 'skip'
  | 'feedback'
  | 'unknown';

/** Everything the assistant has understood about the current request. */
export type Slots = {
  group: ProductGroup | null;
  type: ProductType | null;
  /** Free-form need such as "сухая кожа", echoed back in the recap line. */
  need: string | null;
  needLabel: string | null;
  priority: string | null;
  budgetMax: number | null;
  budgetLabel: string | null;
  texture: TextureKey | null;
  /** Hard constraints: "сильные отдушки", "плотные текстуры". */
  avoid: string[];
  giftFor: string | null;
};

export type Conversation = {
  state: AiState;
  intent: Intent | null;
  slots: Slots;
  /** Clarifiers still to ask, in order. */
  pending: string[];
  /** Product the conversation is currently about. */
  focusId: string | null;
  /** Last set the assistant recommended — what "сравни" and "почему" refer to. */
  lastIds: string[];
  compareIds: string[];
  /** True once the assistant had to loosen the budget to find anything. */
  relaxed: boolean;
  /** Guards the "снова этот?" line so it is only offered once per product. */
  repeatOffered: string[];
};

export type QuickReply = {
  label: string;
  /** What the assistant does when this reply is tapped. */
  action: string;
  value?: string;
};

export type CheckItem = { ok: boolean; text: string };

export type RoutineLine = {
  time: 'am' | 'pm';
  step: string;
  productId?: string;
  note: string;
};

export type ChatMessage =
  | { id: string; role: 'user'; kind: 'text'; text: string }
  | { id: string; role: 'ai'; kind: 'text'; text: string; link?: { label: string; action: string } }
  | { id: string; role: 'ai'; kind: 'typing'; label?: string }
  | {
      id: string;
      role: 'ai';
      kind: 'products';
      productIds: string[];
      /** Per-product one-liner printed under the card, as the brief asks. */
      notes?: Record<string, string>;
      /** Id that gets the BEST MATCH flag. */
      bestId?: string;
    }
  | { id: string; role: 'ai'; kind: 'compare'; productIds: string[] }
  | { id: string; role: 'ai'; kind: 'checks'; title: string; items: CheckItem[] }
  | { id: string; role: 'ai'; kind: 'evidence'; productId: string }
  | { id: string; role: 'ai'; kind: 'reviews'; productId: string }
  | { id: string; role: 'ai'; kind: 'sources'; productId: string }
  | { id: string; role: 'ai'; kind: 'content'; contentIds: string[] }
  | { id: string; role: 'ai'; kind: 'routine'; lines: RoutineLine[] }
  | { id: string; role: 'ai'; kind: 'handoff' }
  | { id: string; role: 'ai'; kind: 'memory'; text: string };

/** Where the user opened the assistant from — the assistant keeps this context. */
export type ChatContext =
  | { from: 'home' }
  | { from: 'favorites' }
  | { from: 'search'; query: string }
  | { from: 'pdp'; productId: string }
  | { from: 'content'; title: string };
