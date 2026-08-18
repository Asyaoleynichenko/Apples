import type { BeautyProfile } from './types';

export const EMPTY_PROFILE: BeautyProfile = {
  onboarded: false,
  metAssistant: false,
  priorities: [],
  budget: null,
  budgetMax: null,
  skinType: null,
  preferences: [],
  dislikes: [],
  routine: {},
  shade: null,
  likedProducts: [],
  dislikedProducts: [],
  // Seeded order history, so "ты уже покупала это" and the evidence panel
  // have something real to stand on from the first message.
  purchases: ['doublewear'],
  viewed: [],
  learned: [],
};
