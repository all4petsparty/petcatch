/**
 * Discovery Snack flavors — purely cosmetic today (the thrown treat never
 * affects species detection, which is always image-analysis-driven, or
 * user-entered for My Pets). Sets up Phase 6's brand-associated treats
 * (per the user's decision in the V2 implementation plan): swapping this
 * catalog for real branded items later is a drop-in change.
 */
export const TREATS = {
  bone: { emoji: "🦴", label: "Bone" },
  bird: { emoji: "🌾", label: "Bird Feed" },
  fish: { emoji: "🐟", label: "Fish" },
  salad: { emoji: "🥬", label: "Salad Leaf" },
} as const;

export type TreatType = keyof typeof TREATS;

export const TREAT_ORDER: TreatType[] = ["bone", "bird", "fish", "salad"];
