import type { Concern, RoutineSlot } from '../catalogue/types';
import {
  AGE_CONCERN_PRIOR,
  COMPONENT_WEIGHTS,
  CONCERN_COVERAGE_SHARE,
  CONCERN_HIT_SHARE,
  CONCERN_PHRASE,
  MISSING_SPF_MESSAGE,
  NEUTRAL_SUBSCORE,
  NO_USER_INPUT_MESSAGE,
  RETINOID_EVENING_REASON,
  RETINOID_MORNING_ONLY_CAUTION,
  SCAN_MAX_SHARE,
  SCAN_MEAN_SHARE,
  SENSITIVITY_DERATE,
  SENSITIVITY_DERATE_REASON,
  SPF_EVENING_REASON,
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
  isPotent,
  type PairConflictRule,
  isProtectedInSlot,
  missingStepMessage,
  normaliseActives,
  normaliseStep,
  stepRank,
} from './rules';
import {
  NO_INGREDIENT_DATA,
  type ExcludedProduct,
  type FitScoreBreakdown,
  type IngredientClass,
  type Routine,
  type RoutineInput,
  type RoutineItem,
  type RoutineNote,
  type RoutinePlan,
  type RoutineStep,
  type ScorableProduct,
  type ScoreComponent,
  type ScoreComponentKey,
  type ResolvedConflict,
} from './types';

/**
 * Routine engine — scoring and generation.
 *
 * DETERMINISM. No `Date.now`, no `Math.random`, no locale-sensitive compares,
 * no reliance on object key order for anything that reaches the output. Every
 * sort is total: score descending, then product id ascending as a tiebreak. The
 * same catalogue and the same answers produce byte-identical output.
 *
 * HONESTY. Products are never dropped in silence. Every product that could have
 * been in a session and is not appears in `Routine.excluded` with a reason, and
 * every rule that fired appears in `Routine.conflicts` with what it did about
 * it. See `types.ts` for what the score is and — more importantly — is not.
 */

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Total, locale-independent ordering on ids so output never drifts. */
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Heuristic 0–100 fit score for one product against one set of answers.
 *
 * Weighted sum of up to four components (see `COMPONENT_WEIGHTS`). Components
 * with no input are given zero weight and the remainder is renormalised, so a
 * user who has never scanned is not capped below the design system's badge
 * bands. A conservative caution multiplier is applied last, and whatever it
 * did is reported in `cautions` rather than folded silently into the total.
 *
 * This is a ranking heuristic. It is not a probability, an efficacy estimate,
 * or a percentage of anything.
 */
export function scoreProduct(
  product: ScorableProduct,
  input: RoutineInput,
): FitScoreBreakdown {
  const concerns = input.concerns;
  const targets = product.targets;
  const actives = normaliseActives(product.actives);

  const matchedConcerns: Concern[] = concerns.filter((c) =>
    targets.includes(c),
  );

  const components: ScoreComponent[] = [];

  /* concernMatch — the user's own words, weighted highest. */
  if (concerns.length > 0) {
    const hit = matchedConcerns.length > 0 ? 1 : 0;
    const coverage = matchedConcerns.length / concerns.length;
    components.push({
      key: 'concernMatch',
      weight: COMPONENT_WEIGHTS.concernMatch,
      value: clamp01(
        CONCERN_HIT_SHARE * hit + CONCERN_COVERAGE_SHARE * coverage,
      ),
      note:
        matchedConcerns.length > 0
          ? `Targets ${matchedConcerns.length} of the ${concerns.length} thing${concerns.length === 1 ? '' : 's'} you listed.`
          : 'Does not target anything you listed.',
    });
  } else {
    components.push(inactive('concernMatch', 'You have not picked any concerns yet.'));
  }

  /* scanSeverity — an image heuristic, so it sits below the stated concerns. */
  const severity = input.scan?.severity;
  const scanKeys = severity === undefined ? [] : keysOf(severity);
  if (severity !== undefined && scanKeys.length > 0) {
    const readings = targets
      .map((t) => severity[t])
      .filter((v): v is number => typeof v === 'number')
      .map((v) => clamp01(v / 100));

    if (readings.length === 0) {
      components.push({
        key: 'scanSeverity',
        weight: COMPONENT_WEIGHTS.scanSeverity,
        value: NEUTRAL_SUBSCORE,
        note: 'Your last scan did not look at what this product targets.',
      });
    } else {
      let max = readings[0] ?? 0;
      let sum = 0;
      for (const r of readings) {
        if (r > max) max = r;
        sum += r;
      }
      const mean = sum / readings.length;
      components.push({
        key: 'scanSeverity',
        weight: COMPONENT_WEIGHTS.scanSeverity,
        value: clamp01(SCAN_MAX_SHARE * max + SCAN_MEAN_SHARE * mean),
        note: 'Weighted by what your last scan picked up. Scan readings are an estimate from a photo, not a measurement.',
      });
    }
  } else {
    components.push(inactive('scanSeverity', 'No scan yet.'));
  }

  /* ageFit — a weak tilt, never a veto. */
  if (input.age !== null && targets.length > 0) {
    let sum = 0;
    for (const t of targets) sum += agePrior(input.age, t);
    components.push({
      key: 'ageFit',
      weight: COMPONENT_WEIGHTS.ageFit,
      value: clamp01(sum / targets.length),
      note: `Typical priorities for ${input.age}. A general tilt, not a statement about you.`,
    });
  } else {
    components.push(
      inactive(
        'ageFit',
        input.age === null
          ? 'No age given.'
          : 'This product does not list what it targets.',
      ),
    );
  }

  /* tolerance — formulation attributes matched to sensitivity signals. */
  let tolerance = TOLERANCE_BASE;
  const toleranceHits: string[] = [];
  for (const attr of product.attributes) {
    let bonus = TOLERANCE_UNCONDITIONAL_BONUS;
    if (attr === 'Fragrance-free' && concerns.includes('redness')) {
      bonus = Math.max(bonus, TOLERANCE_BONUS.fragranceFreeForRedness);
      toleranceHits.push('fragrance-free, which you may prefer with redness');
    } else if (attr === 'Non-comedogenic' && concerns.includes('pores')) {
      bonus = Math.max(bonus, TOLERANCE_BONUS.nonComedogenicForPores);
      toleranceHits.push('non-comedogenic, which you may prefer with visible pores');
    } else if (attr === 'Sulfate-free' && concerns.includes('dryness')) {
      bonus = Math.max(bonus, TOLERANCE_BONUS.sulfateFreeForDryness);
      toleranceHits.push('sulfate-free, which you may prefer with dryness');
    }
    tolerance += bonus;
  }
  components.push({
    key: 'tolerance',
    weight: COMPONENT_WEIGHTS.tolerance,
    value: clamp01(tolerance),
    note:
      toleranceHits.length > 0
        ? `It is ${toleranceHits.join(' and ')}.`
        : 'Formulation attributes only; nothing you listed points at them.',
  });

  /* Weighted sum over active components, renormalised. */
  let weighted = 0;
  let totalWeight = 0;
  for (const c of components) {
    weighted += c.weight * c.value;
    totalWeight += c.weight;
  }
  const base = totalWeight > 0 ? weighted / totalWeight : NEUTRAL_SUBSCORE;

  /* Conservative de-rate — always explained, never silent. */
  const cautions: string[] = [];
  let cautionFactor = 1;
  if (concerns.includes('redness') && actives.some(isPotent)) {
    cautionFactor = SENSITIVITY_DERATE;
    cautions.push(SENSITIVITY_DERATE_REASON);
  }

  const total = Math.round(clamp01(base * cautionFactor) * 100);

  return { total, components, matchedConcerns, cautions, cautionFactor };
}

function inactive(key: ScoreComponentKey, note: string): ScoreComponent {
  return { key, weight: 0, value: 0, note: `Not used: ${note}` };
}

/** Own enumerable keys, typed. Order is never used for anything observable. */
function keysOf(severity: Partial<Record<Concern, number>>): Concern[] {
  return Object.keys(severity) as Concern[];
}

/* -------------------------------------------------------------------------- */
/* Candidate assembly                                                         */
/* -------------------------------------------------------------------------- */

interface Candidate {
  readonly product: ScorableProduct;
  readonly step: RoutineStep;
  readonly actives: readonly IngredientClass[];
  /** False when the catalogue gave us nothing to check for clashes. */
  readonly hasIngredientData: boolean;
  readonly breakdown: FitScoreBreakdown;
  readonly score: number;
}

/** A rule that fired, before we know where the affected product ended up. */
interface PendingConflict {
  readonly ruleId: ResolvedConflict['ruleId'];
  readonly severity: ResolvedConflict['severity'];
  readonly slot: RoutineSlot;
  readonly keptProductId: string | null;
  readonly affectedProductId: string;
  readonly reason: string;
  /** 'rejected' resolves to split or demoted once both sessions are built. */
  readonly outcome: 'rejected' | 'kept';
}

interface SlotDraft {
  readonly slot: RoutineSlot;
  readonly admitted: readonly Candidate[];
  readonly pending: readonly PendingConflict[];
  readonly excluded: readonly ExcludedProduct[];
  /** productId -> extra caution lines to show on the item. */
  readonly itemCautions: ReadonlyMap<string, readonly string[]>;
  readonly anyMissingIngredientData: boolean;
}

/**
 * Session rules are applied here, before scoring, because they decide whether a
 * product is a candidate for this session at all.
 */
function collectCandidates(
  products: readonly ScorableProduct[],
  input: RoutineInput,
  slot: RoutineSlot,
): {
  candidates: Candidate[];
  excluded: ExcludedProduct[];
  pending: PendingConflict[];
  cautions: Map<string, string[]>;
} {
  const candidates: Candidate[] = [];
  const excluded: ExcludedProduct[] = [];
  const pending: PendingConflict[] = [];
  const cautions = new Map<string, string[]>();

  for (const product of products) {
    if (!product.slots.includes(slot)) continue;

    const step = normaliseStep(product.step);
    if (step === null) {
      excluded.push({
        productId: product.id,
        step: null,
        reason: 'unknown-step',
        explanation: `We could not tell which step "${product.step}" belongs to, so we left it out rather than guess.`,
      });
      continue;
    }

    const actives = normaliseActives(product.actives);

    // SPF is morning-only. Not a judgement call: sunscreen at night does
    // nothing, so an evening slot on the product is catalogue error.
    if (step === 'protect' && slot !== SPF_SLOT) {
      excluded.push({
        productId: product.id,
        step,
        reason: 'session-rule',
        explanation: SPF_EVENING_REASON,
      });
      pending.push({
        ruleId: 'spf-morning-only',
        severity: 'avoid',
        slot,
        keptProductId: null,
        affectedProductId: product.id,
        reason: SPF_EVENING_REASON,
        outcome: 'rejected',
      });
      continue;
    }

    // Retinoids move to the evening where the catalogue allows it. Where it
    // does not, we keep the product and carry the caution rather than
    // overriding data we do not have.
    if (actives.includes('retinoid') && slot === 'morning') {
      if (product.slots.includes('evening')) {
        excluded.push({
          productId: product.id,
          step,
          reason: 'session-rule',
          explanation: RETINOID_EVENING_REASON,
        });
        pending.push({
          ruleId: 'retinoid-evening-preferred',
          severity: 'caution',
          slot,
          keptProductId: null,
          affectedProductId: product.id,
          reason: RETINOID_EVENING_REASON,
          outcome: 'rejected',
        });
        continue;
      }
      addCaution(cautions, product.id, RETINOID_MORNING_ONLY_CAUTION);
      pending.push({
        ruleId: 'retinoid-evening-preferred',
        severity: 'caution',
        slot,
        keptProductId: null,
        affectedProductId: product.id,
        reason: RETINOID_MORNING_ONLY_CAUTION,
        outcome: 'kept',
      });
    }

    const breakdown = scoreProduct(product, input);
    candidates.push({
      product,
      step,
      actives,
      hasIngredientData: product.actives !== undefined,
      breakdown,
      score: breakdown.total,
    });
  }

  return { candidates, excluded, pending, cautions };
}

function addCaution(
  map: Map<string, string[]>,
  productId: string,
  line: string,
): void {
  const existing = map.get(productId);
  if (existing === undefined) {
    map.set(productId, [line]);
  } else if (!existing.includes(line)) {
    existing.push(line);
  }
}

/* -------------------------------------------------------------------------- */
/* Admission                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Admission priority.
 *
 * Morning sun protection sorts first so that it is admitted before anything can
 * collide with it — that is how "SPF is never omitted from the morning" is
 * guaranteed structurally rather than by a special case buried in the loop.
 * Everything after it is canonical step order, then score, then id.
 */
function admissionOrder(slot: RoutineSlot) {
  return (a: Candidate, b: Candidate): number => {
    const pa = isProtectedInSlot(a.step, slot) ? 0 : 1;
    const pb = isProtectedInSlot(b.step, slot) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const ra = stepRank(a.step);
    const rb = stepRank(b.step);
    if (ra !== rb) return ra - rb;
    if (a.score !== b.score) return b.score - a.score;
    return byId(a.product.id, b.product.id);
  };
}

function buildSlot(
  products: readonly ScorableProduct[],
  input: RoutineInput,
  slot: RoutineSlot,
): SlotDraft {
  const { candidates, excluded, pending, cautions } = collectCandidates(
    products,
    input,
    slot,
  );

  const ordered = [...candidates].sort(admissionOrder(slot));

  const admitted: Candidate[] = [];
  const counts = new Map<RoutineStep, number>();
  let anyMissingIngredientData = false;

  for (const candidate of ordered) {
    const used = counts.get(candidate.step) ?? 0;
    if (used >= STEP_LIMITS[candidate.step]) {
      excluded.push({
        productId: candidate.product.id,
        step: candidate.step,
        reason: 'step-limit',
        explanation: `Something that fits your answers better already fills the ${STEP_NOUN[candidate.step]} step.`,
      });
      continue;
    }

    const clash = firstClash(candidate, admitted);
    if (clash !== null) {
      const { rule, other } = clash;

      // Both severities separate. A `caution` that cannot be moved to the other
      // session is demoted rather than layered: the cost of separating is one
      // product missing from a list, the cost of not separating is telling
      // someone to put two irritants on their face at once. The reason is
      // always returned, so nothing is dropped silently.
      //
      // The candidate is always the one that yields — everything already
      // admitted outranks it by construction of `admissionOrder`, which is also
      // what keeps morning sun protection un-demotable.
      excluded.push({
        productId: candidate.product.id,
        step: candidate.step,
        reason: 'conflict',
        explanation: rule.reason,
      });
      pending.push({
        ruleId: rule.id,
        severity: rule.severity,
        slot,
        keptProductId: other.product.id,
        affectedProductId: candidate.product.id,
        reason: rule.reason,
        outcome: 'rejected',
      });
      continue;
    }

    admitted.push(candidate);
    counts.set(candidate.step, used + 1);
    if (!candidate.hasIngredientData) anyMissingIngredientData = true;
  }

  return {
    slot,
    admitted,
    pending,
    excluded,
    itemCautions: cautions,
    anyMissingIngredientData,
  };
}

/**
 * First rule that fires between a candidate and the already-admitted set.
 *
 * Scans in admission order, so the reported counterpart is deterministic. A
 * product with no ingredient data can never clash — which is why absent data
 * raises a `no-ingredient-data` note rather than passing as "checked".
 */
function firstClash(
  candidate: Candidate,
  admitted: readonly Candidate[],
): { rule: PairConflictRule; other: Candidate } | null {
  for (const other of admitted) {
    const rule = findConflict(candidate.actives, other.actives);
    if (rule !== null) return { rule, other };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

function itemReason(
  candidate: Candidate,
  slot: RoutineSlot,
  extraCautions: readonly string[],
): string | undefined {
  const parts: string[] = [];
  const matched = candidate.breakdown.matchedConcerns;

  if (isProtectedInSlot(candidate.step, slot)) {
    parts.push(STEP_FALLBACK_REASON.protect);
  } else if (matched.length > 0) {
    const phrases = matched.map((c) => CONCERN_PHRASE[c]);
    parts.push(`Targets ${listPhrase(phrases)}.`);
  } else {
    parts.push(STEP_FALLBACK_REASON[candidate.step]);
  }

  parts.push(...candidate.breakdown.cautions, ...extraCautions);
  const reason = parts.join(' ').trim();
  return reason.length > 0 ? reason : undefined;
}

/** "a", "a and b", "a, b and c" — deterministic, no Intl dependency. */
function listPhrase(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  const head = items.slice(0, -1).join(', ');
  return `${head} and ${items[items.length - 1] ?? ''}`;
}

function finaliseSlot(
  draft: SlotDraft,
  otherSlotItemIds: ReadonlySet<string>,
  input: RoutineInput,
): Routine {
  const items: RoutineItem[] = [...draft.admitted]
    .sort((a, b) => {
      const ra = stepRank(a.step);
      const rb = stepRank(b.step);
      if (ra !== rb) return ra - rb;
      if (a.score !== b.score) return b.score - a.score;
      return byId(a.product.id, b.product.id);
    })
    .map((candidate) => {
      const extra = draft.itemCautions.get(candidate.product.id) ?? [];
      const reason = itemReason(candidate, draft.slot, extra);
      return {
        step: candidate.step,
        product: candidate.product,
        score: candidate.score,
        ...(reason === undefined ? {} : { reason }),
        breakdown: candidate.breakdown,
      };
    });

  const conflicts: ResolvedConflict[] = draft.pending.map((p) => {
    if (p.outcome === 'kept') {
      return {
        ruleId: p.ruleId,
        severity: p.severity,
        slot: p.slot,
        keptProductId: p.keptProductId,
        affectedProductId: p.affectedProductId,
        resolution: 'kept-with-caution',
        movedTo: 'same-session',
        reason: p.reason,
      };
    }
    const landedElsewhere = otherSlotItemIds.has(p.affectedProductId);
    const otherSlot: RoutineSlot = p.slot === 'morning' ? 'evening' : 'morning';
    return {
      ruleId: p.ruleId,
      severity: p.severity,
      slot: p.slot,
      keptProductId: p.keptProductId,
      affectedProductId: p.affectedProductId,
      resolution: landedElsewhere ? 'split' : 'demoted',
      movedTo: landedElsewhere ? otherSlot : 'none',
      reason: landedElsewhere
        ? `${p.reason} It is in your ${otherSlot} routine instead.`
        : `${p.reason} We left it out of your routine.`,
    };
  });

  const notes: RoutineNote[] = [];
  const presentSteps = new Set(items.map((i) => i.step));

  if (draft.slot === SPF_SLOT && !presentSteps.has('protect')) {
    notes.push({ kind: 'missing-spf', message: MISSING_SPF_MESSAGE });
  }
  for (const step of STEP_ORDER) {
    if (step === 'protect') continue; // covered by missing-spf / not an evening step
    if (!presentSteps.has(step)) {
      notes.push({ kind: 'missing-step', message: missingStepMessage(step) });
    }
  }
  if (draft.anyMissingIngredientData) {
    notes.push({ kind: 'no-ingredient-data', message: NO_INGREDIENT_DATA });
  }
  if (
    input.concerns.length === 0 &&
    input.age === null &&
    (input.scan === undefined || input.scan === null)
  ) {
    notes.push({ kind: 'no-user-input', message: NO_USER_INPUT_MESSAGE });
  }

  return {
    slot: draft.slot,
    items,
    conflicts,
    excluded: [...draft.excluded].sort((a, b) => byId(a.productId, b.productId)),
    notes,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Build both sessions from a catalogue and a set of answers.
 *
 * Both sessions are built before either is finalised, because whether a
 * conflict was a SPLIT or a DEMOTION is only knowable once we can see where the
 * affected product actually landed. Selection itself never depends on the other
 * session, so the result stays deterministic.
 */
export function generateRoutinePlan(
  products: readonly ScorableProduct[],
  input: RoutineInput,
): RoutinePlan {
  const morningDraft = buildSlot(products, input, 'morning');
  const eveningDraft = buildSlot(products, input, 'evening');

  const morningIds = new Set(morningDraft.admitted.map((c) => c.product.id));
  const eveningIds = new Set(eveningDraft.admitted.map((c) => c.product.id));

  return {
    morning: finaliseSlot(morningDraft, eveningIds, input),
    evening: finaliseSlot(eveningDraft, morningIds, input),
    input,
  };
}

/**
 * One session. Builds the whole plan internally so that a conflict is reported
 * as a SPLIT when the product really is in the other session, rather than being
 * mislabelled a demotion just because the caller only asked for one slot.
 */
export function generateRoutine(
  products: readonly ScorableProduct[],
  input: RoutineInput,
  slot: RoutineSlot,
): Routine {
  const plan = generateRoutinePlan(products, input);
  return slot === 'morning' ? plan.morning : plan.evening;
}

/**
 * Rank a catalogue without building a routine — for the products tab, where the
 * list is browsed rather than sequenced. Highest score first, id as tiebreak.
 */
export function rankProducts(
  products: readonly ScorableProduct[],
  input: RoutineInput,
): readonly { product: ScorableProduct; breakdown: FitScoreBreakdown }[] {
  return products
    .map((product) => ({ product, breakdown: scoreProduct(product, input) }))
    .sort((a, b) =>
      a.breakdown.total !== b.breakdown.total
        ? b.breakdown.total - a.breakdown.total
        : byId(a.product.id, b.product.id),
    );
}
