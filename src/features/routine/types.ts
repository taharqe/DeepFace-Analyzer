import type {
  Concern,
  Product,
  ProductAttribute,
  RoutineSlot,
} from '../catalogue/types';
import type { AgeBand } from '../onboarding/questions';

/**
 * Routine engine — types.
 *
 * PROVENANCE. Nothing in this subsystem is measured. The 50-capture corpus shows
 * a routine *screen*; it does not show how the routine was computed, and the
 * "99% fit" in the capture is a literal baked into every product row. So every
 * constant here is [E] — a proposal, chosen for a stated reason, and every one
 * of them is marked at its definition in `rules.ts`.
 *
 * HONESTY. This engine ranks products and orders steps. It does not diagnose,
 * it does not measure, and it does not know whether anything here will work for
 * a given person. The types are named so that a caller cannot accidentally
 * present a heuristic as a finding — see `HeuristicFitScore`.
 */

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The canonical routine steps.
 *
 * `Product.step` in the catalogue is a free `string` ('Cleanse', 'Treat', …).
 * The engine never trusts that string for ordering — it normalises to this
 * union and orders by {@link STEP_ORDER} in `rules.ts`.
 */
export type RoutineStep = 'cleanse' | 'treat' | 'moisturise' | 'protect';

/* -------------------------------------------------------------------------- */
/* Ingredients                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Active-ingredient classes the conflict rules reason about.
 *
 * [E] Deliberately a small, coarse set. Conflict rules are only as safe as the
 *     data behind them, and a coarse class ("an AHA") can be assigned to a
 *     product with far more confidence than a precise one ("8% glycolic at
 *     pH 3.6"). Coarse classes over-trigger; precise classes under-trigger.
 *     Over-triggering is the failure we want.
 *
 *     Anything not in this set is unknown to the engine, and unknown means
 *     "no rule fires" — which is why {@link ScorableProduct.actives} being
 *     absent must never be read as "safe to combine". See `NO_INGREDIENT_DATA`.
 */
export type IngredientClass =
  | 'retinoid'
  | 'aha'
  | 'bha'
  | 'benzoyl-peroxide'
  | 'vitamin-c-ascorbic'
  | 'azelaic-acid'
  | 'niacinamide'
  | 'peptide'
  | 'ceramide'
  | 'humectant'
  | 'spf-mineral'
  | 'spf-chemical';

/** Every {@link IngredientClass}, for runtime validation of untyped data. */
export const INGREDIENT_CLASSES: readonly IngredientClass[] = [
  'retinoid',
  'aha',
  'bha',
  'benzoyl-peroxide',
  'vitamin-c-ascorbic',
  'azelaic-acid',
  'niacinamide',
  'peptide',
  'ceramide',
  'humectant',
  'spf-mineral',
  'spf-chemical',
] as const;

/**
 * The optional ingredient fields the engine reads off a catalogue product.
 *
 * The catalogue does not carry these today — another agent is extending it —
 * so every field is optional and the engine is written to work without them.
 * Declaring the shape here rather than editing `catalogue/types.ts` keeps file
 * ownership clean: when the catalogue grows an `actives` field of the same
 * shape, this intersection simply stops being additive.
 */
export interface ProductIngredients {
  /**
   * Active classes present at a meaningful concentration.
   *
   * ABSENT IS NOT EMPTY. `undefined` means "the catalogue has not told us",
   * `[]` means "the catalogue asserts there are no flagged actives". The engine
   * distinguishes the two: it will not claim a pairing was checked when there
   * was nothing to check.
   */
  readonly actives?: readonly IngredientClass[];
}

/** A catalogue product, plus whatever ingredient data it happens to carry. */
export type ScorableProduct = Product & ProductIngredients;

/* -------------------------------------------------------------------------- */
/* Inputs                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Per-concern signal from the most recent scan.
 *
 * NAMED "HEURISTIC" ON PURPOSE. Whatever the scan subsystem eventually
 * computes, it is an image heuristic, not a dermatological measurement. The
 * engine treats these numbers as a ranking nudge and nothing more, and no
 * user-facing string produced by this module reports them as a finding.
 *
 * This shape is declared here, not imported, because the scan subsystem does
 * not exist yet. It is optional everywhere it appears.
 */
export interface HeuristicScanMetrics {
  /**
   * 0–100 per concern, higher = more prominent in the capture. Concerns the
   * scan could not assess must be absent rather than 0 — a missing key means
   * "unknown", a 0 means "looked and saw none".
   */
  readonly severity: Partial<Record<Concern, number>>;
}

/** Everything the engine is allowed to reason from. */
export interface RoutineInput {
  /** The concerns the user selected. May be empty — that is a valid answer. */
  readonly concerns: readonly Concern[];
  /** Null until the age question is answered. */
  readonly age: AgeBand | null;
  /** Absent when the user has never scanned, which is the common case. */
  readonly scan?: HeuristicScanMetrics | null;
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 0–100 fit score.
 *
 * WHAT THIS IS: a ranking heuristic over the answers the user gave us. It says
 * "of the products in this catalogue, these ones line up better with what you
 * told us".
 *
 * WHAT THIS IS NOT: a probability, an efficacy estimate, a percentage of
 * anything, a compatibility guarantee, or a clinical judgement. 82 does not
 * mean 82% of anything. Copy that renders this number must not imply otherwise
 * — see {@link FIT_SCORE_DISCLOSURE}.
 */
export type HeuristicFitScore = number;

/** The scoring components. Weights live in `rules.ts`. */
export type ScoreComponentKey =
  | 'concernMatch'
  | 'ageFit'
  | 'scanSeverity'
  | 'tolerance';

export interface ScoreComponent {
  readonly key: ScoreComponentKey;
  /** Relative weight applied. 0 when the component had no input to work from. */
  readonly weight: number;
  /** 0–1 sub-score. */
  readonly value: number;
  /** Why this component landed where it did. Plain language, for the UI. */
  readonly note: string;
}

export interface FitScoreBreakdown {
  readonly total: HeuristicFitScore;
  readonly components: readonly ScoreComponent[];
  /** The user's concerns this product claims to target. */
  readonly matchedConcerns: readonly Concern[];
  /**
   * Conservative, non-diagnostic notes — e.g. a potent active scored down
   * because the user reported redness. Always surfaced, never silent.
   */
  readonly cautions: readonly string[];
  /**
   * Multiplier applied after weighting, from {@link cautions}. 1 = untouched.
   */
  readonly cautionFactor: number;
}

/* -------------------------------------------------------------------------- */
/* Conflicts                                                                  */
/* -------------------------------------------------------------------------- */

export type ConflictRuleId =
  | 'retinoid+aha'
  | 'retinoid+bha'
  | 'retinoid+benzoyl-peroxide'
  | 'retinoid+vitamin-c'
  | 'vitamin-c+aha'
  | 'vitamin-c+bha'
  | 'vitamin-c+benzoyl-peroxide'
  | 'aha+bha'
  | 'aha+benzoyl-peroxide'
  | 'bha+benzoyl-peroxide'
  | 'duplicate-potent-active'
  | 'spf-morning-only'
  | 'retinoid-evening-preferred';

/**
 * [E] Two levels, not five. A finer scale would imply a precision the
 * underlying guidance does not have.
 *
 * `avoid`   — well-established that these are not layered.
 * `caution` — commonly advised against; the evidence behind the advice is
 *             softer.
 *
 * BOTH SEPARATE. The severity changes what the UI can honestly say, not what
 * the engine does: a `caution` pair is split or demoted exactly like an `avoid`
 * pair. Layering a pair we are merely unsure about would be the wrong way to
 * spend uncertainty on someone's face. Severity also decides which rule gets
 * reported when several fire at once — `avoid` outranks `caution`.
 */
export type ConflictSeverity = 'avoid' | 'caution';

/** What the engine did about it. Never "nothing, silently". */
export type ConflictResolution =
  /** Kept in one session, and the product is present in the other session. */
  | 'split'
  /** Removed from the routine entirely. The reason is always returned. */
  | 'demoted'
  /**
   * Left in place with a caution attached to the item. Only ever produced by
   * single-product session rules (a retinoid the catalogue lists as
   * morning-only). Pairwise conflicts never resolve this way — they always
   * split or demote.
   */
  | 'kept-with-caution';

export interface ResolvedConflict {
  readonly ruleId: ConflictRuleId;
  readonly severity: ConflictSeverity;
  readonly slot: RoutineSlot;
  /**
   * The product that stayed put. Null for session rules (SPF-morning-only,
   * retinoid-evening-preferred), which act on one product rather than a pair.
   */
  readonly keptProductId: string | null;
  /** The product that moved, was dropped, or was flagged. */
  readonly affectedProductId: string;
  readonly resolution: ConflictResolution;
  /** Where the affected product ended up. 'none' = not in the routine at all. */
  readonly movedTo: RoutineSlot | 'none' | 'same-session';
  /** Plain-language explanation. Safe to render verbatim. */
  readonly reason: string;
}

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

export interface RoutineItem {
  readonly step: RoutineStep;
  readonly product: ScorableProduct;
  readonly score: HeuristicFitScore;
  /** One-line "why this is here". Present whenever the engine can explain it. */
  readonly reason?: string;
  /** Full working, for a UI that wants to show its sources. */
  readonly breakdown: FitScoreBreakdown;
}

export type ExclusionReason =
  /** Product's `step` string did not map to a canonical step. */
  | 'unknown-step'
  /** A better-scoring product already filled this step. */
  | 'step-limit'
  /** A conflict rule removed it. See the matching {@link ResolvedConflict}. */
  | 'conflict'
  /** A session rule forbids this step/active in this slot. */
  | 'session-rule';

export interface ExcludedProduct {
  readonly productId: string;
  readonly step: RoutineStep | null;
  readonly reason: ExclusionReason;
  /** Plain-language explanation. Safe to render verbatim. */
  readonly explanation: string;
}

export type RoutineNoteKind =
  /** Morning routine has no sun protection. Always reported, never hidden. */
  | 'missing-spf'
  /** A step the routine would normally have is empty. */
  | 'missing-step'
  /** Conflict checking was partly blind: products carry no ingredient data. */
  | 'no-ingredient-data'
  /** The user answered nothing, so ranking is close to arbitrary. */
  | 'no-user-input';

export interface RoutineNote {
  readonly kind: RoutineNoteKind;
  readonly message: string;
}

export interface Routine {
  readonly slot: RoutineSlot;
  /** Ordered: cleanse → treat → moisturise → protect. */
  readonly items: readonly RoutineItem[];
  readonly conflicts: readonly ResolvedConflict[];
  readonly excluded: readonly ExcludedProduct[];
  readonly notes: readonly RoutineNote[];
}

export interface RoutinePlan {
  readonly morning: Routine;
  readonly evening: Routine;
  /** The input the plan was computed from, so a UI can show its working. */
  readonly input: RoutineInput;
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * [E] The disclosure any surface rendering a fit score must show.
 *
 * The predecessor project in this repo shipped "95%+ accuracy" with no evidence
 * behind it. This constant exists so the honest version of that sentence is a
 * shared, greppable string rather than something each screen re-invents.
 */
export const FIT_SCORE_DISCLOSURE =
  'Fit is how well a product lines up with your answers. It is not a measure of how well it will work.';

/** [E] Shown wherever conflict handling is explained. */
export const CONFLICT_DISCLOSURE =
  'We keep strong ingredients apart as a precaution. This is general product guidance, not medical advice.';

/** [E] Shown when products carry no ingredient data to check. */
export const NO_INGREDIENT_DATA =
  'Some products do not list their active ingredients, so we could not check them for clashes.';

export type { AgeBand, Concern, Product, ProductAttribute, RoutineSlot };
