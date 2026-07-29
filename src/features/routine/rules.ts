import type { Concern, RoutineSlot } from '../catalogue/types';
import type { AgeBand } from '../onboarding/questions';
import {
  INGREDIENT_CLASSES,
  type ConflictRuleId,
  type ConflictSeverity,
  type IngredientClass,
  type RoutineStep,
  type ScoreComponentKey,
} from './types';

/**
 * Routine engine — rules and constants.
 *
 * EVERY NUMBER IN THIS FILE IS [E]. None of it is measured; the capture corpus
 * shows a rendered routine, not the logic that produced one. Each block states
 * what it is, why it was chosen, and what would replace it with something
 * better. An unmarked number in here would be a defect.
 *
 * SAFETY POSTURE. The conflict table is deliberately over-inclusive and coarse.
 * The cost of a false positive is a product moved to the other end of the day.
 * The cost of a false negative is someone putting two irritants on their face
 * at once. Those are not symmetric, so the table errs one way on purpose.
 */

/* -------------------------------------------------------------------------- */
/* 01 — Step order                                                            */
/* -------------------------------------------------------------------------- */

/**
 * [E] The canonical order. Encoded here so ordering never depends on the order
 *     products happen to sit in `catalogue/data.ts`.
 *
 *     cleanse → treat → moisturise → protect is the ordering the product brief
 *     specifies, and it matches the near-universal consumer convention of
 *     thinnest-to-thickest with sun protection last. It is a convention, not a
 *     measurement: it is here because the brief names it, not because this
 *     module has evidence for it.
 */
export const STEP_ORDER: readonly RoutineStep[] = [
  'cleanse',
  'treat',
  'moisturise',
  'protect',
] as const;

/** Position of a step in the canonical order. Unknown steps sort last. */
export function stepRank(step: RoutineStep): number {
  const i = STEP_ORDER.indexOf(step);
  return i === -1 ? STEP_ORDER.length : i;
}

/**
 * [E] Synonyms accepted when normalising the catalogue's free-text
 *     `Product.step`. Lower-cased and trimmed before lookup.
 *
 *     Both spellings of "moisturise" are accepted because the catalogue is
 *     written in en-GB but product names are frequently en-US. A string that
 *     does not appear here is NOT guessed at — the product is excluded and the
 *     exclusion is reported, because silently filing a sunscreen under "treat"
 *     would break the morning-SPF guarantee.
 */
const STEP_SYNONYMS: Readonly<Record<string, RoutineStep>> = {
  cleanse: 'cleanse',
  cleanser: 'cleanse',
  cleansing: 'cleanse',
  wash: 'cleanse',
  'face wash': 'cleanse',
  treat: 'treat',
  treatment: 'treat',
  serum: 'treat',
  essence: 'treat',
  moisturise: 'moisturise',
  moisturize: 'moisturise',
  moisturiser: 'moisturise',
  moisturizer: 'moisturise',
  cream: 'moisturise',
  hydrate: 'moisturise',
  protect: 'protect',
  spf: 'protect',
  sunscreen: 'protect',
  'sun protection': 'protect',
};

/** Normalise a catalogue step string. Returns null when it is not recognised. */
export function normaliseStep(raw: string): RoutineStep | null {
  return STEP_SYNONYMS[raw.trim().toLowerCase()] ?? null;
}

/**
 * [E] How many products a single step may contribute to one session.
 *
 *     Two at `treat` and one everywhere else. Reasoning: the treat step is the
 *     only one where stacking is a real routine (a hydrating serum plus a
 *     targeted active), and it is also the only step where stacking is where
 *     conflicts actually arise — so a cap of 1 would make the conflict engine
 *     mostly decorative. One cleanser, one moisturiser and one sunscreen is
 *     what a person actually applies.
 *
 *     Raising `treat` above 2 without also tightening the conflict table would
 *     be unsafe: more concurrent actives, same checking.
 */
export const STEP_LIMITS: Readonly<Record<RoutineStep, number>> = {
  cleanse: 1,
  treat: 2,
  moisturise: 1,
  protect: 1,
};

/* -------------------------------------------------------------------------- */
/* 02 — Scoring weights                                                       */
/* -------------------------------------------------------------------------- */

/**
 * [E] Component weights, summing to 100 when every component has input.
 *
 *     concernMatch 45 — what the user explicitly asked for outranks everything
 *                       else. It is the only input they typed themselves.
 *     scanSeverity 25 — second, and only second: the scan is an image
 *                       heuristic. Letting it outweigh a stated concern would
 *                       be the app overruling the user about their own face.
 *     ageFit       15 — a weak shaping prior. Deliberately small; age is a
 *                       population-level hint and says little about a person.
 *     tolerance    15 — formulation attributes matched against sensitivity
 *                       signals. Small, because the attribute vocabulary
 *                       ('Fragrance-free' and two others) is thin.
 *
 *     A component with no input to work from is dropped and the remaining
 *     weights are renormalised — see `scoreProduct`. Without renormalisation a
 *     user who has never scanned could not score above 75, which would push
 *     every product below the 90/70 badge bands the design system measured.
 */
export const COMPONENT_WEIGHTS: Readonly<Record<ScoreComponentKey, number>> = {
  concernMatch: 45,
  scanSeverity: 25,
  ageFit: 15,
  tolerance: 15,
};

/**
 * [E] Neutral sub-score used when a component has data but it tells us nothing
 *     about this particular product (e.g. the scan measured concerns this
 *     product does not target).
 *
 *     0.5 rather than 0: "we have no signal" must not be scored the same as
 *     "we have a signal and it is bad". A cleanser that targets nothing the
 *     user listed is not a bad cleanser.
 */
export const NEUTRAL_SUBSCORE = 0.5;

/**
 * [E] Split of the concernMatch component between "hits at least one concern"
 *     and "covers how much of the concern list".
 *
 *     0.55 / 0.45. Any hit is worth more than half the component because a
 *     routine is a set — no single product is supposed to cover everything, so
 *     grading purely on coverage would punish focused products for doing their
 *     job. The remaining 0.45 still rewards breadth so a product covering three
 *     of the user's concerns outranks one covering a single concern.
 */
export const CONCERN_HIT_SHARE = 0.55;
export const CONCERN_COVERAGE_SHARE = 0.45;

/**
 * [E] Within the scan component, the split between the worst concern the
 *     product addresses and the average across all of them.
 *
 *     0.6 max / 0.4 mean. Weighted toward the max so a product that addresses
 *     the single most prominent thing in the scan ranks up, rather than being
 *     diluted by concerns that scored low.
 */
export const SCAN_MAX_SHARE = 0.6;
export const SCAN_MEAN_SHARE = 0.4;

/* -------------------------------------------------------------------------- */
/* 03 — Age priors                                                            */
/* -------------------------------------------------------------------------- */

export type ConcernPrior = Readonly<Record<Concern, number>>;

/**
 * [E] Age-band shaping priors, 0–1 per concern.
 *
 *     WHAT THESE ARE: a gentle ranking tilt, carrying 15% of the score, used to
 *     break ties between products the user's own answers rank equally. They
 *     encode the app's own stated premise ("Skin needs different care at
 *     different ages") in the mildest form that premise can take.
 *
 *     WHAT THESE ARE NOT: prevalence data. No epidemiology was consulted and
 *     none is implied. Nothing derived from these numbers may be shown to a
 *     user as a statement about their age group — they exist to order a list.
 *
 *     The values are spread over 0.2–1.0 rather than 0–1 so no band can zero
 *     out a concern the user explicitly selected. If a 24-year-old says "fine
 *     lines", the engine must not decide it knows better; 0.2 tilts, it does
 *     not veto.
 *
 *     A full Record (not Partial) on purpose: adding an age band should force
 *     someone to decide these values rather than silently inheriting a default.
 */
export const AGE_CONCERN_PRIOR: Readonly<Record<AgeBand, ConcernPrior>> = {
  'Under 25': {
    'fine-lines': 0.2,
    pores: 1.0,
    'uneven-tone': 0.6,
    dryness: 0.5,
    redness: 0.7,
    dullness: 0.8,
  },
  '25 – 34': {
    'fine-lines': 0.5,
    pores: 0.8,
    'uneven-tone': 0.7,
    dryness: 0.6,
    redness: 0.6,
    dullness: 0.8,
  },
  '35 – 44': {
    'fine-lines': 0.8,
    pores: 0.5,
    'uneven-tone': 0.8,
    dryness: 0.7,
    redness: 0.5,
    dullness: 0.7,
  },
  '45 – 60': {
    'fine-lines': 1.0,
    pores: 0.3,
    'uneven-tone': 0.8,
    dryness: 0.9,
    redness: 0.5,
    dullness: 0.7,
  },
  'Over 60': {
    'fine-lines': 1.0,
    pores: 0.2,
    'uneven-tone': 0.7,
    dryness: 1.0,
    redness: 0.5,
    dullness: 0.6,
  },
};

/** Prior for one concern in one band. Neutral when the band is unknown. */
export function agePrior(age: AgeBand | null, concern: Concern): number {
  if (age === null) return NEUTRAL_SUBSCORE;
  const band = AGE_CONCERN_PRIOR[age] as ConcernPrior | undefined;
  return band?.[concern] ?? NEUTRAL_SUBSCORE;
}

/* -------------------------------------------------------------------------- */
/* 04 — Tolerance                                                             */
/* -------------------------------------------------------------------------- */

/**
 * [E] Attribute bonuses, applied on top of a 0.5 base, capped at 1.0.
 *
 *     Each bonus is conditional on a concern the user actually selected, so the
 *     component varies with input instead of being a constant "nice product"
 *     bump. The unconditional trickle is small (0.05) and exists only so a
 *     well-specified product edges out an unspecified one when the user has
 *     none of the linked concerns.
 *
 *     'Fragrance-free' is treated as the strongest signal because fragrance is
 *     the attribute most commonly implicated in irritation — which is a general
 *     formulation heuristic, not a claim about any individual's skin.
 */
export const TOLERANCE_BASE = 0.5;
export const TOLERANCE_UNCONDITIONAL_BONUS = 0.05;
export const TOLERANCE_BONUS = {
  /** 'Fragrance-free' when the user reported redness. */
  fragranceFreeForRedness: 0.25,
  /** 'Non-comedogenic' when the user reported visible pores. */
  nonComedogenicForPores: 0.25,
  /** 'Sulfate-free' when the user reported dryness. */
  sulfateFreeForDryness: 0.15,
} as const;

/**
 * [E] The potent classes. Used for the sensitivity de-rate and for the
 *     duplicate-active rule.
 */
export const POTENT_ACTIVES: readonly IngredientClass[] = [
  'retinoid',
  'aha',
  'bha',
  'benzoyl-peroxide',
] as const;

export function isPotent(active: IngredientClass): boolean {
  return POTENT_ACTIVES.includes(active);
}

/**
 * [E] Multiplier applied to a product's score when it carries a potent active
 *     and the user reported redness.
 *
 *     0.85 — a de-rate, not a veto. Redness is a self-reported sensitivity
 *     signal, and a signal is not a contraindication: plenty of people with
 *     redness use these ingredients under guidance. So the engine ranks them
 *     lower and says why, rather than deciding on the user's behalf.
 *
 *     The reason string is always attached to the item. A silent penalty would
 *     be the dishonest version of this rule.
 */
export const SENSITIVITY_DERATE = 0.85;

export const SENSITIVITY_DERATE_REASON =
  'Ranked lower because it contains a strong active and you told us about redness. It is not ruled out — introduce it slowly, or ask a professional.';

/* -------------------------------------------------------------------------- */
/* 05 — Pairwise conflicts                                                    */
/* -------------------------------------------------------------------------- */

export interface PairConflictRule {
  readonly id: ConflictRuleId;
  readonly a: IngredientClass;
  readonly b: IngredientClass;
  readonly severity: ConflictSeverity;
  /** Plain language, safe to render verbatim. Never diagnostic. */
  readonly reason: string;
}

/**
 * [E] Pairwise same-session conflicts.
 *
 *     PROVENANCE, honestly stated: these pairings are the ones repeated across
 *     mainstream consumer skincare guidance. They were not derived from
 *     clinical literature, this module cites no study, and the severities are a
 *     judgement call by the author of this file. That is exactly why the engine
 *     separates rather than forbids, tells the user what it did, and carries
 *     `CONFLICT_DISCLOSURE` alongside.
 *
 *     Both severities cause separation — see `ConflictSeverity` in `types.ts`.
 *     The level records how firm the underlying advice is, so the UI can word
 *     itself honestly, not how hard the engine acts.
 *
 *     Retinoid pairings are `avoid` because cumulative irritation is the
 *     failure mode people actually report, and a retinoid has an obvious home
 *     (evening) to be moved to, so separating costs almost nothing. Acid-on-acid
 *     is `caution` because two mild acids may well be fine together — the
 *     engine still separates them, but a UI should not tell the user that
 *     combination is forbidden.
 */
export const PAIR_CONFLICTS: readonly PairConflictRule[] = [
  {
    id: 'retinoid+aha',
    a: 'retinoid',
    b: 'aha',
    severity: 'avoid',
    reason:
      'Retinoids and AHA exfoliants are irritating together. We put them in different sessions.',
  },
  {
    id: 'retinoid+bha',
    a: 'retinoid',
    b: 'bha',
    severity: 'avoid',
    reason:
      'Retinoids and BHA exfoliants are irritating together. We put them in different sessions.',
  },
  {
    id: 'retinoid+benzoyl-peroxide',
    a: 'retinoid',
    b: 'benzoyl-peroxide',
    severity: 'avoid',
    reason:
      'Benzoyl peroxide can break down a retinoid applied at the same time, and the pair is harsh. We keep them apart.',
  },
  {
    id: 'retinoid+vitamin-c',
    a: 'retinoid',
    b: 'vitamin-c-ascorbic',
    severity: 'caution',
    reason:
      'Vitamin C and retinoids are usually split between morning and evening rather than layered.',
  },
  {
    id: 'vitamin-c+aha',
    a: 'vitamin-c-ascorbic',
    b: 'aha',
    severity: 'caution',
    reason:
      'Vitamin C alongside an AHA can be more irritating than either alone. We separate them where we can.',
  },
  {
    id: 'vitamin-c+bha',
    a: 'vitamin-c-ascorbic',
    b: 'bha',
    severity: 'caution',
    reason:
      'Vitamin C alongside a BHA can be more irritating than either alone. We separate them where we can.',
  },
  {
    id: 'vitamin-c+benzoyl-peroxide',
    a: 'vitamin-c-ascorbic',
    b: 'benzoyl-peroxide',
    severity: 'caution',
    reason:
      'Benzoyl peroxide can oxidise vitamin C applied at the same time. We separate them where we can.',
  },
  {
    id: 'aha+bha',
    a: 'aha',
    b: 'bha',
    severity: 'caution',
    reason:
      'Two exfoliating acids in one session is a lot at once. We spread them out.',
  },
  {
    id: 'aha+benzoyl-peroxide',
    a: 'aha',
    b: 'benzoyl-peroxide',
    severity: 'caution',
    reason:
      'An acid exfoliant with benzoyl peroxide is a harsh combination in one session.',
  },
  {
    id: 'bha+benzoyl-peroxide',
    a: 'bha',
    b: 'benzoyl-peroxide',
    severity: 'caution',
    reason:
      'An acid exfoliant with benzoyl peroxide is a harsh combination in one session.',
  },
];

/**
 * [E] Stacking two products from the same potent class in one session.
 *     Doubling up on retinoids or acids is the same irritation risk as any
 *     listed pair, so it gets the same treatment rather than slipping through
 *     because the table only lists distinct classes.
 */
export const DUPLICATE_POTENT_RULE: PairConflictRule = {
  id: 'duplicate-potent-active',
  a: 'retinoid',
  b: 'retinoid',
  severity: 'avoid',
  reason:
    'Two products with the same strong active in one session doubles the strength. We kept the better fit.',
};

/**
 * Find the rule for an unordered pair of actives. Returns null when the pair is
 * not in the table — which means "no rule fired", NOT "verified compatible".
 */
export function findPairConflict(
  a: IngredientClass,
  b: IngredientClass,
): PairConflictRule | null {
  if (a === b) {
    return isPotent(a) ? DUPLICATE_POTENT_RULE : null;
  }
  for (const rule of PAIR_CONFLICTS) {
    if (
      (rule.a === a && rule.b === b) ||
      (rule.a === b && rule.b === a)
    ) {
      return rule;
    }
  }
  return null;
}

/**
 * The strongest conflict between two active sets, or null.
 * `avoid` outranks `caution`; ties break by table order so the result is
 * deterministic regardless of how the active arrays are ordered.
 */
export function findConflict(
  left: readonly IngredientClass[],
  right: readonly IngredientClass[],
): PairConflictRule | null {
  let best: PairConflictRule | null = null;
  for (const a of left) {
    for (const b of right) {
      const rule = findPairConflict(a, b);
      if (rule === null) continue;
      if (best === null) {
        best = rule;
      } else if (best.severity === 'caution' && rule.severity === 'avoid') {
        best = rule;
      }
    }
  }
  return best;
}

/* -------------------------------------------------------------------------- */
/* 06 — Session rules                                                         */
/* -------------------------------------------------------------------------- */

/**
 * [E] SPF is morning-only, and morning is never without it.
 *
 *     This is the one rule in the file that is not a judgement call. Sunscreen
 *     applied in the evening does nothing, and a morning routine that quietly
 *     omits sun protection while the rest of the routine pushes exfoliants and
 *     retinoids is actively harmful advice. So:
 *
 *     - a `protect` product is removed from the evening session, with a reason;
 *     - a `protect` product in the morning is exempt from conflict demotion —
 *       when it collides with something, the other product yields;
 *     - a morning routine with no `protect` product emits a `missing-spf` note
 *       instead of rendering as if nothing were wrong.
 */
export const SPF_SLOT: RoutineSlot = 'morning';

export const SPF_EVENING_REASON =
  'Sunscreen only does anything during the day, so it is not in your evening routine.';

export const SPF_PROTECTED_REASON =
  'Sun protection stays in your morning routine — we moved the other product instead.';

export const MISSING_SPF_MESSAGE =
  'This morning routine has no sunscreen. Add one — it matters most if you are using exfoliants or a retinoid.';

/**
 * [E] Retinoids belong in the evening where the catalogue allows it.
 *
 *     Retinoids increase sun sensitivity, and the convention is unambiguous.
 *     Where a product is eligible for both sessions the engine moves it to the
 *     evening. Where the catalogue lists it as morning-only the engine keeps it
 *     — overriding the catalogue would be inventing data — and attaches the
 *     caution instead.
 */
export const RETINOID_EVENING_REASON =
  'Retinoids increase sun sensitivity, so this sits in your evening routine.';

export const RETINOID_MORNING_ONLY_CAUTION =
  'This retinoid is listed as a morning product. Retinoids increase sun sensitivity — wear sunscreen.';

/** True when this product must not be demoted out of the given session. */
export function isProtectedInSlot(
  step: RoutineStep,
  slot: RoutineSlot,
): boolean {
  return step === 'protect' && slot === SPF_SLOT;
}

/* -------------------------------------------------------------------------- */
/* 07 — Explanation copy                                                      */
/* -------------------------------------------------------------------------- */

/**
 * [E] Mid-sentence phrasing for each concern.
 *
 *     Deliberately a local copy rather than an import of `CONCERNS` from the
 *     onboarding module: those labels are Title Case for option rows ('Fine
 *     lines'), and these need to read inside a sentence ('Targets fine lines
 *     and dryness.'). Keeping them separate also stops routine copy from
 *     breaking when the question screen is reworded.
 */
export const CONCERN_PHRASE: Readonly<Record<Concern, string>> = {
  'fine-lines': 'fine lines',
  pores: 'visible pores',
  'uneven-tone': 'uneven tone',
  dryness: 'dryness',
  redness: 'redness',
  dullness: 'dullness',
};

/** [E] Noun for a step, for use inside explanation copy. */
export const STEP_NOUN: Readonly<Record<RoutineStep, string>> = {
  cleanse: 'cleanser',
  treat: 'treatment',
  moisturise: 'moisturiser',
  protect: 'sunscreen',
};

/**
 * [E] Why a product is in the routine when it matches none of the user's
 *     stated concerns. A routine still needs these steps, and saying so plainly
 *     is better than manufacturing a personalised-sounding reason that is not
 *     true.
 */
export const STEP_FALLBACK_REASON: Readonly<Record<RoutineStep, string>> = {
  cleanse: 'Every routine starts with a cleanser.',
  treat: 'A treatment step, chosen on general fit rather than a concern you listed.',
  moisturise: 'A moisturiser to finish — this step holds the rest of the routine in.',
  protect: 'Sun protection — the step we never leave out of a morning routine.',
};

/** [E] Shown when the user has answered nothing at all. */
export const NO_USER_INPUT_MESSAGE =
  'You have not told us anything about your skin yet, so this is a general starter routine rather than a personalised one.';

/** [E] Shown when a canonical step has nothing in it. */
export function missingStepMessage(step: RoutineStep): string {
  return `No ${STEP_NOUN[step]} in this routine — nothing in the catalogue fits that step for this session.`;
}

/* -------------------------------------------------------------------------- */
/* 08 — Data hygiene                                                          */
/* -------------------------------------------------------------------------- */

const INGREDIENT_SET: ReadonlySet<string> = new Set<string>(INGREDIENT_CLASSES);

/**
 * Defensive read of a product's actives.
 *
 * Typed as `IngredientClass[]`, but the catalogue is destined to be loaded from
 * JSON or SQLite where the type system guarantees nothing. An unrecognised
 * string is dropped rather than carried into the conflict engine, because a
 * class the rules do not know about would silently never match a rule and read
 * as "checked and clear".
 */
export function normaliseActives(
  actives: readonly IngredientClass[] | undefined,
): readonly IngredientClass[] {
  if (actives === undefined) return [];
  const seen = new Set<string>();
  const out: IngredientClass[] = [];
  for (const a of actives) {
    if (!INGREDIENT_SET.has(a) || seen.has(a)) continue;
    seen.add(a);
    out.push(a);
  }
  return out;
}
