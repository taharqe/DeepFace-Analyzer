/**
 * Routine engine — public surface.
 *
 * The thing that turns answers into an actual routine: a heuristic fit score
 * that varies with what the user told us, a canonical step order, and a
 * conservative conflict table that separates strong actives across sessions and
 * always says what it did.
 *
 * Pure logic. No React, no imports from `src/components` or `app`.
 *
 * Typical use:
 *
 *   const plan = generateRoutinePlan(PRODUCTS, {
 *     concerns: state.concerns,
 *     age: state.age,
 *   });
 *   plan.morning.items    // ordered cleanse -> treat -> moisturise -> protect
 *   plan.morning.conflicts// what was separated, and why
 *   plan.morning.notes    // including a missing-SPF warning, never suppressed
 *
 * Anything rendering `score` must also render `FIT_SCORE_DISCLOSURE`. The score
 * is a ranking heuristic over the user's answers — not an efficacy figure, not
 * a probability, not a clinical judgement.
 */

export {
  generateRoutine,
  generateRoutinePlan,
  rankProducts,
  scoreProduct,
} from './generate';

export {
  AGE_CONCERN_PRIOR,
  COMPONENT_WEIGHTS,
  CONCERN_COVERAGE_SHARE,
  CONCERN_HIT_SHARE,
  CONCERN_PHRASE,
  DUPLICATE_POTENT_RULE,
  MISSING_SPF_MESSAGE,
  NEUTRAL_SUBSCORE,
  NO_USER_INPUT_MESSAGE,
  PAIR_CONFLICTS,
  POTENT_ACTIVES,
  RETINOID_EVENING_REASON,
  RETINOID_MORNING_ONLY_CAUTION,
  SCAN_MAX_SHARE,
  SCAN_MEAN_SHARE,
  SENSITIVITY_DERATE,
  SENSITIVITY_DERATE_REASON,
  SPF_EVENING_REASON,
  SPF_PROTECTED_REASON,
  SPF_SLOT,
  STEP_FALLBACK_REASON,
  STEP_LIMITS,
  STEP_NOUN,
  STEP_ORDER,
  TOLERANCE_BASE,
  TOLERANCE_BONUS,
  TOLERANCE_UNCONDITIONAL_BONUS,
  agePrior,
  findConflict,
  findPairConflict,
  isPotent,
  isProtectedInSlot,
  missingStepMessage,
  normaliseActives,
  normaliseStep,
  stepRank,
} from './rules';

export type { ConcernPrior, PairConflictRule } from './rules';

export {
  CONFLICT_DISCLOSURE,
  FIT_SCORE_DISCLOSURE,
  INGREDIENT_CLASSES,
  NO_INGREDIENT_DATA,
} from './types';

export type {
  ConflictResolution,
  ConflictRuleId,
  ConflictSeverity,
  ExcludedProduct,
  ExclusionReason,
  FitScoreBreakdown,
  HeuristicFitScore,
  HeuristicScanMetrics,
  IngredientClass,
  ProductIngredients,
  ResolvedConflict,
  Routine,
  RoutineInput,
  RoutineItem,
  RoutineNote,
  RoutineNoteKind,
  RoutinePlan,
  RoutineStep,
  ScorableProduct,
  ScoreComponent,
  ScoreComponentKey,
} from './types';
