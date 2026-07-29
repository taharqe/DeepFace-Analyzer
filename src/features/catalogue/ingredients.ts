import type { Concern } from './types';
import type { IngredientClass } from '../routine/types';

/**
 * Catalogue — ingredient reference library.
 *
 * ============================================================================
 * WHAT THIS FILE IS
 * ============================================================================
 *
 * [E] EVERY ENTRY IN THIS FILE IS ESTIMATED/AUTHORED, NOT MEASURED.
 *
 * The 50-capture corpus behind `docs/MEASUREMENT-SPEC.md` contains no ingredient
 * data of any kind — it shows product *rows*, not formulations. So nothing here
 * can be marked [M] or [D]. This is a hand-written reference set: a small
 * library of the actives and bases that consumer skincare is actually built
 * from, written so the routine engine has something real to reason over instead
 * of guessing from a product name.
 *
 * The INCI names are real and are the load-bearing part of each entry. The
 * functions, the concerns and the cautions are the author's reading of
 * mainstream consumer-level guidance and ingredient documentation. They are not
 * a systematic review, they cite no study, and they are not medical advice.
 *
 * ============================================================================
 * HOW THE CLAIMS ARE KEPT HONEST
 * ============================================================================
 *
 * 1. `addresses` is deliberately SHORT. An ingredient is only listed against a
 *    concern where that use is the ordinary, widely-repeated one. Ingredients
 *    that are in a formula to stabilise, thicken, colour or preserve it carry
 *    an empty `addresses` — the honest answer for them is "nothing".
 *
 * 2. `evidence` records how firm the ground is, per ingredient, and it is a
 *    required field so it cannot be quietly skipped. `limited` appears on the
 *    entries where marketing is well ahead of the evidence (peptides,
 *    bakuchiol) and the note says so in plain language.
 *
 * 3. `cautions` is deliberately LONG — wider than `addresses`. Where guidance
 *    is divided the entry carries the caution anyway. Over-flagging costs a
 *    user a sentence of text; under-flagging costs them their face. See
 *    `pregnancy-discuss`, which exists precisely so divided guidance does not
 *    have to be rounded to yes or no.
 *
 * 4. NOTHING HERE DIAGNOSES ANYTHING. `addresses` means "this is what the
 *    ingredient is ordinarily used for", never "this will work for you".
 *
 * ============================================================================
 * RELATIONSHIP TO THE ROUTINE ENGINE
 * ============================================================================
 *
 * The engine (`src/features/routine`) reasons about a deliberately coarse set
 * of active classes — {@link IngredientClass}. {@link ActiveClass} mirrors it,
 * and {@link ACTIVE_CLASS_MIRROR_CHECK} makes any drift between the two a
 * compile error rather than a silent hole in conflict detection. That failure
 * mode matters: if this file said `'vitamin-c'` and the engine expected
 * `'vitamin-c-ascorbic'`, no rule would ever fire and nothing would look wrong.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * [E] What an ingredient is doing in a formula.
 *
 *     Function is not benefit. `emulsifier`, `thickener` and `colourant` are
 *     here because most of a real INCI list is structural, and a catalogue that
 *     only modelled actives would imply every listed ingredient does something
 *     for the user's skin.
 */
export type IngredientFunction =
  | 'humectant'
  | 'occlusive'
  | 'emollient'
  | 'barrier-lipid'
  | 'surfactant'
  | 'emulsifier'
  | 'exfoliant'
  | 'keratolytic'
  | 'retinoid'
  | 'antioxidant'
  | 'uv-filter'
  | 'soothing'
  | 'antimicrobial'
  | 'sebum-regulator'
  | 'pigment-modulator'
  | 'peptide'
  | 'thickener'
  | 'solvent'
  | 'colourant'
  | 'fragrance';

/**
 * [E] Four tiers, chosen to be describable in one word to a user.
 *
 *     This is a tier for *typical, correctly formulated, correctly used*
 *     product — not a prediction for an individual. Anyone can react to
 *     anything, including everything in the `minimal` tier.
 */
export type IrritancyTier = 'minimal' | 'low' | 'moderate' | 'high';

/** [E] Ordering for "what is the most irritating thing in this product". */
export const IRRITANCY_RANK: Readonly<Record<IrritancyTier, number>> = {
  minimal: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

/**
 * [E] Cautions. Wider than the benefit claims, on purpose.
 *
 * `photosensitising`        — makes skin more sun-sensitive; daily SPF matters
 *                             more than usual while using it.
 * `pregnancy-avoid`         — mainstream guidance is to stop during pregnancy
 *                             and breastfeeding. Used only where that advice is
 *                             consistent and well known (topical retinoids).
 * `pregnancy-discuss`       — guidance is divided or concentration-dependent.
 *                             NOT a softer "avoid": it means the honest answer
 *                             is "ask someone who knows your situation", and
 *                             the app must not resolve it on the user's behalf.
 * `bleaches-fabric`         — practical, not medical. Ruins towels and pillows.
 * `contact-allergen-notable`— a recognised contact allergen at a rate worth
 *                             mentioning. Most people are fine with these.
 * `low-ph-stings`           — formulated acidic; stinging on application is
 *                             expected rather than a sign of damage.
 * `not-on-broken-skin`      — do not apply to cracked, raw or freshly shaved
 *                             skin.
 * `unstable-in-light-or-air`— degrades in sunlight or once opened; a
 *                             formulation and storage caution, not a skin one.
 * `introduce-gradually`     — start with low frequency and build up.
 * `medicine-not-cosmetic`   — regulated as a drug in at least one major market.
 *                             See each entry's `regulatory` note.
 */
export type IngredientCaution =
  | 'photosensitising'
  | 'pregnancy-avoid'
  | 'pregnancy-discuss'
  | 'bleaches-fabric'
  | 'contact-allergen-notable'
  | 'low-ph-stings'
  | 'not-on-broken-skin'
  | 'unstable-in-light-or-air'
  | 'introduce-gradually'
  | 'medicine-not-cosmetic';

/**
 * [E] How firm the ground under `addresses` is.
 *
 *     `well-established` — repeated across mainstream dermatological guidance;
 *                          an informed sceptic would not argue about it.
 *     `supported`        — commonly recommended, reasonable published backing,
 *                          effect sizes typically modest.
 *     `limited`          — popular and plausible, but the marketing is ahead of
 *                          the evidence. UI copy must not level this up.
 *     `structural`       — makes no skin claim at all; it is in the formula to
 *                          make the formula work.
 */
export type EvidenceTier =
  | 'well-established'
  | 'supported'
  | 'limited'
  | 'structural';

/**
 * [E] When an ingredient is ordinarily used.
 *
 *     Advisory only. The routine engine owns slot decisions; this is the
 *     ingredient-level input to that, not a second competing rule.
 */
export type SlotGuidance = 'any' | 'evening-preferred' | 'morning-only';

/**
 * Product claims whose truth is decidable from an ingredient list.
 *
 * `Non-comedogenic` is deliberately absent: it has no agreed definition or test
 * behind it, so it cannot be derived from an INCI list and is carried as a
 * manufacturer claim only. See `auditCatalogue` in `products.ts`.
 */
export type ClaimBlock = 'Sulfate-free' | 'Fragrance-free';

/* -------------------------------------------------------------------------- */
/* Active classes — mirror of the routine engine's vocabulary                 */
/* -------------------------------------------------------------------------- */

/**
 * The coarse active classes the routine engine's conflict table keys off.
 *
 * Mirrored here rather than re-exported so this file stands alone as data, but
 * the mirror is checked at compile time in both directions — see
 * {@link ACTIVE_CLASS_MIRROR_CHECK}. If the engine adds or renames a class,
 * this file stops compiling. That is the intended behaviour: a silently
 * mismatched string here would disable a conflict rule without any visible
 * symptom.
 */
export type ActiveClass =
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

/** [E] Stable ordering, so derived `actives` arrays are deterministic. */
export const ACTIVE_CLASS_ORDER: readonly ActiveClass[] = [
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
];

type AssignableTo<A extends B, B> = true;

/**
 * Compile-time proof that {@link ActiveClass} and the engine's
 * `IngredientClass` are the same set, checked in both directions. Purely a
 * type; it is erased at build and costs nothing at runtime.
 *
 * If this line goes red, the engine's vocabulary moved. Re-sync `ActiveClass`
 * and `ACTIVE_CLASS_ORDER` — do not weaken the check, because the symptom of
 * an unsynced class is a conflict rule that silently never fires.
 */
export type ACTIVE_CLASS_MIRROR_CHECK = AssignableTo<
  ActiveClass,
  IngredientClass
> &
  AssignableTo<IngredientClass, ActiveClass>;

/** [E] Stable ordering for derived `targets`. Matches `types.ts`. */
export const CONCERN_ORDER: readonly Concern[] = [
  'fine-lines',
  'pores',
  'uneven-tone',
  'dryness',
  'redness',
  'dullness',
];

/* -------------------------------------------------------------------------- */
/* The model                                                                  */
/* -------------------------------------------------------------------------- */

/** An ingredient, minus its id — the id is the key it is stored under. */
export interface IngredientDef {
  /** Display name, as a person would say it. */
  readonly name: string;
  /**
   * INCI name — the standardised label name. This is the one field that is a
   * fact rather than a judgement, and it is what a user can check a real
   * product's carton against.
   */
  readonly inci: string;
  readonly functions: readonly IngredientFunction[];
  /**
   * The engine's coarse class, or null when the engine has no class for it.
   *
   * NULL IS NOT "SAFE". It means "no conflict rule keys off this", which is a
   * statement about the engine's vocabulary, not about the ingredient.
   */
  readonly activeClass: ActiveClass | null;
  /**
   * Concerns this ingredient is ordinarily used for. Empty is a valid and
   * common answer. Never a promise of a result.
   */
  readonly addresses: readonly Concern[];
  readonly irritancy: IrritancyTier;
  readonly cautions: readonly IngredientCaution[];
  readonly evidence: EvidenceTier;
  readonly slotGuidance: SlotGuidance;
  /** Claims its presence in a formula falsifies. */
  readonly claimBlocks?: readonly ClaimBlock[];
  /** Plain language, safe to render verbatim. Non-diagnostic by construction. */
  readonly note: string;
  /** Where the ingredient is regulated as a medicine rather than a cosmetic. */
  readonly regulatory?: string;
}

/* -------------------------------------------------------------------------- */
/* The library                                                                */
/* -------------------------------------------------------------------------- */

/**
 * [E] The reference library.
 *
 * Keys are the ids products reference. `satisfies` keeps each entry checked
 * against {@link IngredientDef} with errors landing on the offending property,
 * while letting {@link IngredientId} be derived from the keys — so a product
 * referencing an id that does not exist is a compile error, and an id can never
 * disagree with the entry it names.
 */
export const INGREDIENTS = {
  /* --- Humectants & hydration ------------------------------------------- */

  glycerin: {
    name: 'Glycerin',
    inci: 'Glycerin',
    functions: ['humectant'],
    activeClass: 'humectant',
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'The most studied and most boring humectant there is. Draws water into the upper layers of skin. Present in a large share of moisturisers because it works and almost nobody reacts to it.',
  },

  'sodium-hyaluronate': {
    name: 'Hyaluronic acid',
    inci: 'Sodium Hyaluronate',
    functions: ['humectant'],
    activeClass: 'humectant',
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'Labelled as hyaluronic acid, almost always present as its sodium salt. Holds water at the skin surface; it hydrates while it is there rather than changing the skin underneath. Works best applied to damp skin and sealed with a moisturiser.',
  },

  panthenol: {
    name: 'Panthenol',
    inci: 'Panthenol',
    functions: ['humectant', 'soothing'],
    activeClass: 'humectant',
    addresses: ['dryness', 'redness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'Provitamin B5. Hydrating and calming, and one of the few ingredients that is genuinely uncontroversial in irritated or over-exfoliated skin.',
  },

  urea: {
    name: 'Urea',
    inci: 'Urea',
    functions: ['humectant', 'keratolytic'],
    activeClass: 'humectant',
    addresses: ['dryness'],
    irritancy: 'low',
    cautions: ['not-on-broken-skin'],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'Concentration changes what it does. Below roughly 10% it is a humectant; at 10% and above it also loosens hardened skin, which is why it appears in creams for rough or scaly areas. It can sting on cracked skin.',
  },

  propanediol: {
    name: 'Propanediol',
    inci: 'Propanediol',
    functions: ['solvent', 'humectant'],
    activeClass: null,
    addresses: [],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A solvent that dissolves actives and helps them spread evenly. Mildly hydrating, but it is in the formula to carry other things.',
  },

  /* --- Emollients, occlusives, barrier lipids ---------------------------- */

  squalane: {
    name: 'Squalane',
    inci: 'Squalane',
    functions: ['emollient'],
    activeClass: null,
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'A light, stable oil, now generally made from olives or sugarcane. Softens skin and slows water loss without the heaviness of a butter. Commonly used to dilute retinoids because it is so unreactive.',
  },

  'caprylic-capric-triglyceride': {
    name: 'Caprylic/capric triglyceride',
    inci: 'Caprylic/Capric Triglyceride',
    functions: ['emollient', 'solvent'],
    activeClass: null,
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A fractionated coconut-derived oil used as a light emollient and as a carrier for oil-soluble ingredients.',
  },

  'cetearyl-alcohol': {
    name: 'Cetearyl alcohol',
    inci: 'Cetearyl Alcohol',
    functions: ['emollient', 'emulsifier', 'thickener'],
    activeClass: null,
    addresses: [],
    irritancy: 'low',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A fatty alcohol — not the drying kind. It thickens creams and holds oil and water together. Occasionally implicated in contact reactions, but for most people it is unremarkable.',
  },

  dimethicone: {
    name: 'Dimethicone',
    inci: 'Dimethicone',
    functions: ['occlusive', 'emollient'],
    activeClass: null,
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'A silicone that forms a breathable film, reducing water loss and giving the slip that makes a cream feel smooth. Does not block pores in the way its reputation suggests.',
  },

  petrolatum: {
    name: 'Petrolatum',
    inci: 'Petrolatum',
    functions: ['occlusive'],
    activeClass: null,
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'The most effective occlusive available and the reference point every other one is measured against. Cuts water loss through the skin dramatically. Heavy, and cosmetically unfashionable, which is not the same as ineffective.',
  },

  'shea-butter': {
    name: 'Shea butter',
    inci: 'Butyrospermum Parkii Butter',
    functions: ['emollient', 'occlusive'],
    activeClass: null,
    addresses: ['dryness'],
    irritancy: 'low',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'A rich plant butter that softens and seals. Heavy enough that some people find it too much on the face.',
  },

  cholesterol: {
    name: 'Cholesterol',
    inci: 'Cholesterol',
    functions: ['barrier-lipid'],
    activeClass: null,
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'One of the three lipid families the skin barrier is actually built from, alongside ceramides and fatty acids. Barrier creams include it because the ratio between the three matters, not just the ceramide content.',
  },

  'ceramide-np': {
    name: 'Ceramides',
    inci: 'Ceramide NP',
    functions: ['barrier-lipid', 'emollient'],
    activeClass: 'ceramide',
    addresses: ['dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'Ceramide NP (once called ceramide 3) is the one most often used. Ceramides are a natural component of the skin barrier, and topping them up helps skin that has been stripped by weather, cleansers or over-exfoliation hold water again.',
  },

  /* --- Cleansing surfactants --------------------------------------------- */

  'sodium-cocoyl-isethionate': {
    name: 'Sodium cocoyl isethionate',
    inci: 'Sodium Cocoyl Isethionate',
    functions: ['surfactant'],
    activeClass: null,
    addresses: [],
    irritancy: 'low',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A mild coconut-derived cleansing agent that foams well without stripping. The usual choice when a formula is built to be sulfate-free but still lather.',
  },

  'coco-glucoside': {
    name: 'Coco-glucoside',
    inci: 'Coco-Glucoside',
    functions: ['surfactant'],
    activeClass: null,
    addresses: [],
    irritancy: 'low',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A gentle sugar-based cleansing agent. Low foam, low irritation; common in cleansers aimed at dry or reactive skin.',
  },

  'cocamidopropyl-betaine': {
    name: 'Cocamidopropyl betaine',
    inci: 'Cocamidopropyl Betaine',
    functions: ['surfactant'],
    activeClass: null,
    addresses: [],
    irritancy: 'moderate',
    cautions: ['contact-allergen-notable'],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A secondary cleansing agent used to make harsher surfactants milder. Worth knowing that it is a recognised contact allergen — impurities left from its manufacture are usually the cause — so it is a candidate to suspect if cleansers reliably cause trouble.',
  },

  'sodium-laureth-sulfate': {
    name: 'Sodium laureth sulfate',
    inci: 'Sodium Laureth Sulfate',
    functions: ['surfactant'],
    activeClass: null,
    addresses: [],
    irritancy: 'moderate',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    claimBlocks: ['Sulfate-free'],
    note: 'A strong foaming cleansing agent. Milder than the sodium lauryl sulfate it is often confused with, but it still removes more oil than dry or compromised skin can spare.',
  },

  /* --- Actives: barrier & tone ------------------------------------------- */

  niacinamide: {
    name: 'Niacinamide',
    inci: 'Niacinamide',
    functions: ['sebum-regulator', 'soothing', 'pigment-modulator'],
    activeClass: 'niacinamide',
    addresses: ['pores', 'uneven-tone', 'redness'],
    irritancy: 'low',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'Vitamin B3. Unusually versatile and unusually well tolerated: it moderates oil, helps with uneven tone, and supports the barrier. A small number of people flush at higher concentrations. The old warning about not using it with vitamin C came from a lab condition that does not apply to modern formulas.',
  },

  'zinc-pca': {
    name: 'Zinc PCA',
    inci: 'Zinc PCA',
    functions: ['sebum-regulator'],
    activeClass: null,
    addresses: ['pores'],
    irritancy: 'low',
    cautions: [],
    evidence: 'limited',
    slotGuidance: 'any',
    note: 'A zinc salt included to moderate oiliness. Frequently paired with niacinamide. The evidence for it on its own is thin.',
  },

  'tranexamic-acid': {
    name: 'Tranexamic acid',
    inci: 'Tranexamic Acid',
    functions: ['pigment-modulator'],
    activeClass: null,
    addresses: ['uneven-tone'],
    irritancy: 'low',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'Used topically for stubborn discolouration, including the kind that follows spots. Gentle for what it does. It is also a prescription medicine taken by mouth for entirely unrelated reasons — the topical cosmetic use is not the same thing.',
  },

  /* --- Actives: exfoliants ----------------------------------------------- */

  'glycolic-acid': {
    name: 'Glycolic acid',
    inci: 'Glycolic Acid',
    functions: ['exfoliant'],
    activeClass: 'aha',
    addresses: ['dullness', 'uneven-tone', 'fine-lines', 'pores'],
    irritancy: 'high',
    cautions: [
      'photosensitising',
      'low-ph-stings',
      'not-on-broken-skin',
      'introduce-gradually',
    ],
    evidence: 'well-established',
    slotGuidance: 'evening-preferred',
    note: 'The smallest AHA, so it penetrates furthest and works fastest — and irritates most. Loosens dull surface cells. It increases sun sensitivity: daily sunscreen is not optional alongside it.',
  },

  'lactic-acid': {
    name: 'Lactic acid',
    inci: 'Lactic Acid',
    functions: ['exfoliant', 'humectant'],
    activeClass: 'aha',
    addresses: ['dullness', 'uneven-tone', 'dryness'],
    irritancy: 'moderate',
    cautions: [
      'photosensitising',
      'low-ph-stings',
      'not-on-broken-skin',
      'introduce-gradually',
    ],
    evidence: 'well-established',
    slotGuidance: 'evening-preferred',
    note: 'A larger AHA than glycolic, so it works more slowly and gently, and it is hydrating in its own right — the usual starting point for exfoliation on dry skin. Still increases sun sensitivity.',
  },

  gluconolactone: {
    name: 'Gluconolactone (PHA)',
    inci: 'Gluconolactone',
    functions: ['exfoliant', 'humectant', 'antioxidant'],
    activeClass: 'aha',
    addresses: ['dullness', 'uneven-tone'],
    irritancy: 'low',
    cautions: ['introduce-gradually'],
    evidence: 'supported',
    slotGuidance: 'evening-preferred',
    note: 'A polyhydroxy acid: a much larger molecule than glycolic or lactic, so it stays nearer the surface and is markedly gentler. Unlike the smaller AHAs it is not generally reported to increase sun sensitivity — daily sunscreen is still the right habit. Classed with the AHAs here so that the routine engine treats acid-stacking cautiously; that is deliberately over-careful.',
  },

  'salicylic-acid': {
    name: 'Salicylic acid',
    inci: 'Salicylic Acid',
    functions: ['exfoliant', 'keratolytic', 'sebum-regulator'],
    activeClass: 'bha',
    addresses: ['pores'],
    irritancy: 'moderate',
    cautions: [
      'pregnancy-discuss',
      'not-on-broken-skin',
      'introduce-gradually',
    ],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'A BHA, and oil-soluble, which is why it gets into pores where water-soluble acids cannot. The standard choice for congestion and blackheads. Guidance in pregnancy is divided and depends on strength and how much skin is covered, so it is flagged for a conversation rather than answered here.',
  },

  'azelaic-acid': {
    name: 'Azelaic acid',
    inci: 'Azelaic Acid',
    functions: ['antimicrobial', 'pigment-modulator', 'soothing'],
    activeClass: 'azelaic-acid',
    addresses: ['redness', 'uneven-tone', 'pores'],
    irritancy: 'low',
    cautions: ['medicine-not-cosmetic'],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'Unusual in doing three useful things at once — calming redness, fading marks and helping with spots — while staying gentle. Often tingles for the first minute. It is one of the few actives in this class routinely considered suitable during pregnancy, though that is still a conversation to have with a clinician rather than a decision this app makes.',
    regulatory:
      'Cosmetic use is typically capped near 10%. The 15–20% strengths are licensed medicines in the EU, UK and US and are not cosmetics.',
  },

  'benzoyl-peroxide': {
    name: 'Benzoyl peroxide',
    inci: 'Benzoyl Peroxide',
    functions: ['antimicrobial', 'keratolytic'],
    activeClass: 'benzoyl-peroxide',
    addresses: ['pores'],
    irritancy: 'high',
    cautions: [
      'bleaches-fabric',
      'not-on-broken-skin',
      'introduce-gradually',
      'medicine-not-cosmetic',
    ],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'Reduces the bacteria involved in spots, and unlike an antibiotic they do not become resistant to it. Drying and often peeling at first, and lower strengths work about as well as higher ones with less of that. It bleaches towels, pillowcases and clothing on contact — this is permanent and catches everyone out once.',
    regulatory:
      'Regulated as a medicine, not a cosmetic: an OTC drug in the US, and not permitted in cosmetic products in the EU.',
  },

  /* --- Actives: retinoids ------------------------------------------------ */

  retinol: {
    name: 'Retinol',
    inci: 'Retinol',
    functions: ['retinoid'],
    activeClass: 'retinoid',
    addresses: ['fine-lines', 'uneven-tone', 'pores'],
    irritancy: 'moderate',
    cautions: [
      'pregnancy-avoid',
      'photosensitising',
      'unstable-in-light-or-air',
      'introduce-gradually',
      'not-on-broken-skin',
    ],
    evidence: 'well-established',
    slotGuidance: 'evening-preferred',
    note: 'The best-evidenced over-the-counter ingredient for fine lines and texture. The skin converts it in two steps to the form that actually does the work, which is why it is milder and slower than prescription retinoids. Expect dryness and flaking for the first few weeks; build up from twice a week. Used at night because it degrades in light.',
  },

  retinal: {
    name: 'Retinal (retinaldehyde)',
    inci: 'Retinal',
    functions: ['retinoid'],
    activeClass: 'retinoid',
    addresses: ['fine-lines', 'uneven-tone', 'pores'],
    irritancy: 'moderate',
    cautions: [
      'pregnancy-avoid',
      'photosensitising',
      'unstable-in-light-or-air',
      'introduce-gradually',
      'not-on-broken-skin',
    ],
    evidence: 'supported',
    slotGuidance: 'evening-preferred',
    note: 'One conversion step closer to the active form than retinol, so it works at lower concentrations while generally staying well tolerated. Treat it as a step up from retinol, not a mild alternative.',
  },

  adapalene: {
    name: 'Adapalene',
    inci: 'Adapalene',
    functions: ['retinoid'],
    activeClass: 'retinoid',
    addresses: ['pores', 'uneven-tone'],
    irritancy: 'moderate',
    cautions: [
      'pregnancy-avoid',
      'introduce-gradually',
      'not-on-broken-skin',
      'medicine-not-cosmetic',
    ],
    evidence: 'well-established',
    slotGuidance: 'evening-preferred',
    note: 'A synthetic retinoid developed for acne, and strong evidence for exactly that. Two things set it apart from retinol: it is photostable, and it is stable alongside benzoyl peroxide — licensed products combine the two in one tube. This app still keeps retinoids and benzoyl peroxide apart, because the routine engine works from coarse ingredient classes and being over-careful there is the safer error.',
    regulatory:
      'A medicine, not a cosmetic. 0.1% is sold over the counter in the US; in much of the EU and in the UK it is prescription-only.',
  },

  bakuchiol: {
    name: 'Bakuchiol',
    inci: 'Bakuchiol',
    functions: ['antioxidant'],
    activeClass: null,
    addresses: ['fine-lines'],
    irritancy: 'low',
    cautions: [],
    evidence: 'limited',
    slotGuidance: 'any',
    note: 'Marketed as a natural alternative to retinol. It is not a retinoid — chemically unrelated, and it is deliberately not classed as one here. A small number of studies suggest a retinol-like effect with less irritation; the evidence base is nothing like retinol’s. Because it is not a retinoid, the usual pregnancy advice about retinoids does not automatically transfer, and there is little data either way.',
  },

  /* --- Actives: antioxidants --------------------------------------------- */

  'ascorbic-acid': {
    name: 'Vitamin C (L-ascorbic acid)',
    inci: 'Ascorbic Acid',
    functions: ['antioxidant', 'pigment-modulator'],
    activeClass: 'vitamin-c-ascorbic',
    addresses: ['dullness', 'uneven-tone', 'fine-lines'],
    irritancy: 'moderate',
    cautions: ['low-ph-stings', 'unstable-in-light-or-air'],
    evidence: 'supported',
    slotGuidance: 'morning-only',
    note: 'Pure vitamin C: the best-studied form, and the most awkward. It needs a low pH to be absorbed, which is what makes it sting, and it oxidises once opened — a serum that has turned dark orange has already lost its potency. Used in the morning because it complements sunscreen. Stable derivatives such as tetrahexyldecyl ascorbate behave quite differently and the layering advice written for this form does not simply carry over to them.',
  },

  'ferulic-acid': {
    name: 'Ferulic acid',
    inci: 'Ferulic Acid',
    functions: ['antioxidant'],
    activeClass: null,
    addresses: [],
    irritancy: 'low',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A plant antioxidant used mainly to stabilise vitamin C formulas and extend how long they stay effective. It is here for the formula, not as a claim of its own.',
  },

  tocopherol: {
    name: 'Vitamin E',
    inci: 'Tocopherol',
    functions: ['antioxidant', 'emollient'],
    activeClass: null,
    addresses: [],
    irritancy: 'low',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'An antioxidant that protects the oils in a formula from going off, and works alongside vitamin C. Listed with no concern of its own because that is the honest answer for how it is used here.',
  },

  /* --- Actives: peptides -------------------------------------------------- */

  'palmitoyl-tripeptide-1': {
    name: 'Palmitoyl tripeptide-1',
    inci: 'Palmitoyl Tripeptide-1',
    functions: ['peptide'],
    activeClass: 'peptide',
    addresses: ['fine-lines'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'limited',
    slotGuidance: 'any',
    note: 'A signal peptide included for firmness and fine lines. Well tolerated and pleasant to use. Most of the supporting work comes from ingredient suppliers rather than independent research, and the effects reported are small — treat it as a nice-to-have rather than a workhorse.',
  },

  'acetyl-hexapeptide-8': {
    name: 'Acetyl hexapeptide-8',
    inci: 'Acetyl Hexapeptide-8',
    functions: ['peptide'],
    activeClass: 'peptide',
    addresses: ['fine-lines'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'limited',
    slotGuidance: 'any',
    note: 'Often sold with comparisons to injectable muscle relaxants. It is a peptide in a cream; it does not do that. The published effects on expression lines are modest and the independent evidence is thin.',
  },

  /* --- Soothing ----------------------------------------------------------- */

  'centella-asiatica': {
    name: 'Centella asiatica',
    inci: 'Centella Asiatica Extract',
    functions: ['soothing', 'antioxidant'],
    activeClass: null,
    addresses: ['redness'],
    irritancy: 'low',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'Also sold as cica. Used to calm visible redness and support skin recovering from irritation. The purified fractions — madecassoside, asiaticoside — are what most of the research is on.',
  },

  allantoin: {
    name: 'Allantoin',
    inci: 'Allantoin',
    functions: ['soothing'],
    activeClass: null,
    addresses: ['redness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'supported',
    slotGuidance: 'any',
    note: 'A quiet, cheap soothing agent used to take the edge off other ingredients. Rarely the reason to buy a product, frequently the reason one feels comfortable.',
  },

  'colloidal-oatmeal': {
    name: 'Colloidal oatmeal',
    inci: 'Avena Sativa (Oat) Kernel Flour',
    functions: ['soothing', 'occlusive'],
    activeClass: null,
    addresses: ['redness', 'dryness'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'any',
    note: 'Finely milled oat, long used for itchy and irritated skin. One of the few soothing ingredients with a regulator-recognised role: it is an approved skin protectant in the US OTC monograph, where "colloidal oatmeal" is the drug name for it.',
  },

  /* --- UV filters --------------------------------------------------------- */

  'zinc-oxide': {
    name: 'Zinc oxide',
    inci: 'Zinc Oxide',
    functions: ['uv-filter'],
    activeClass: 'spf-mineral',
    addresses: ['fine-lines', 'uneven-tone'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'morning-only',
    note: 'A mineral filter covering the widest range of any single filter, including the long UVA wavelengths involved in ageing and pigmentation. Very well tolerated, which is why it dominates sunscreens for sensitive and reactive skin. It can leave a white cast. Listed against fine lines and uneven tone because sun protection is the best-evidenced way to prevent both — prevention, not correction.',
  },

  'titanium-dioxide': {
    name: 'Titanium dioxide',
    inci: 'Titanium Dioxide',
    functions: ['uv-filter'],
    activeClass: 'spf-mineral',
    addresses: ['fine-lines', 'uneven-tone'],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'morning-only',
    note: 'The other mineral filter. Strong against UVB and shorter UVA, weaker at the long UVA end, so it is usually paired with zinc oxide rather than used alone. Same prevention-not-correction caveat.',
  },

  bemotrizinol: {
    name: 'Bemotrizinol',
    inci: 'Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine',
    functions: ['uv-filter'],
    activeClass: 'spf-chemical',
    addresses: ['fine-lines', 'uneven-tone'],
    irritancy: 'low',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'morning-only',
    note: 'A modern organic filter with broad, photostable coverage and an elegant texture. It also stabilises less robust filters formulated alongside it.',
    regulatory:
      'Approved in the EU, UK, Australia and much of Asia. Not in the US OTC sunscreen monograph at the time of writing, which is why identical-looking sunscreens differ between markets.',
  },

  bisoctrizole: {
    name: 'Bisoctrizole',
    inci: 'Methylene Bis-Benzotriazolyl Tetramethylbutylphenol',
    functions: ['uv-filter'],
    activeClass: 'spf-chemical',
    addresses: ['fine-lines', 'uneven-tone'],
    irritancy: 'low',
    cautions: [],
    evidence: 'well-established',
    slotGuidance: 'morning-only',
    note: 'A hybrid filter — an organic molecule that also scatters light like a mineral one. Broad and photostable, and it stays on the skin surface rather than being absorbed.',
    regulatory:
      'Approved in the EU, UK and elsewhere; not in the US OTC sunscreen monograph at the time of writing.',
  },

  avobenzone: {
    name: 'Avobenzone',
    inci: 'Butyl Methoxydibenzoylmethane',
    functions: ['uv-filter'],
    activeClass: 'spf-chemical',
    addresses: ['fine-lines', 'uneven-tone'],
    irritancy: 'moderate',
    cautions: ['unstable-in-light-or-air'],
    evidence: 'well-established',
    slotGuidance: 'morning-only',
    note: 'For a long time the main UVA filter available in the US. It breaks down in sunlight on its own, so it is always paired with a stabiliser — octocrylene is the usual one. A sunscreen containing it needs reapplying as directed rather than treated as all-day cover.',
  },

  octocrylene: {
    name: 'Octocrylene',
    inci: 'Octocrylene',
    functions: ['uv-filter'],
    activeClass: 'spf-chemical',
    addresses: ['fine-lines', 'uneven-tone'],
    irritancy: 'moderate',
    cautions: ['contact-allergen-notable'],
    evidence: 'well-established',
    slotGuidance: 'morning-only',
    note: 'A UVB filter used mainly to keep avobenzone from degrading. It is among the more common causes of sunscreen contact and photocontact reactions, and it slowly forms benzophenone as a product ages — a reason to replace old sunscreen rather than to avoid the ingredient.',
  },

  'iron-oxides': {
    name: 'Iron oxides',
    inci: 'CI 77491, CI 77492, CI 77499',
    functions: ['colourant'],
    activeClass: null,
    addresses: [],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'The pigments that make a sunscreen tinted. They also block visible light, which matters for some kinds of pigmentation that ordinary sunscreen does not fully address. The even skin tone a tint gives on application is makeup, not treatment.',
  },

  /* --- Structural --------------------------------------------------------- */

  carbomer: {
    name: 'Carbomer',
    inci: 'Carbomer',
    functions: ['thickener'],
    activeClass: null,
    addresses: [],
    irritancy: 'minimal',
    cautions: [],
    evidence: 'structural',
    slotGuidance: 'any',
    note: 'A gelling agent. It decides whether a product is a runny liquid or a gel, and nothing else.',
  },

  parfum: {
    name: 'Fragrance',
    inci: 'Parfum',
    functions: ['fragrance'],
    activeClass: null,
    addresses: [],
    irritancy: 'moderate',
    cautions: ['contact-allergen-notable'],
    evidence: 'structural',
    slotGuidance: 'any',
    claimBlocks: ['Fragrance-free'],
    note: 'A single label word covering a mixture that can run to dozens of components. It is there to make the product pleasant to use and does nothing for skin. The leading cause of cosmetic contact allergy, and the first thing to drop if a routine is causing trouble.',
  },
} satisfies Record<string, IngredientDef>;

/* -------------------------------------------------------------------------- */
/* Derived types and lookups                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every ingredient id, derived from the library itself.
 *
 * A product referencing an id that does not exist is a compile error, and no id
 * can disagree with the entry it names, because the id *is* the key.
 */
export type IngredientId = keyof typeof INGREDIENTS;

/** An ingredient with its id attached. */
export interface Ingredient extends IngredientDef {
  readonly id: IngredientId;
}

/** All ingredient ids, in declaration order. */
export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as readonly IngredientId[];

/** The library as a flat list, id attached. Declaration order. */
export const ALL_INGREDIENTS: readonly Ingredient[] = INGREDIENT_IDS.map(
  (id) => ({ id, ...INGREDIENTS[id] }),
);

const BY_ID: ReadonlyMap<IngredientId, Ingredient> = new Map(
  ALL_INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
);

/**
 * Look an ingredient up. Total: `IngredientId` cannot name a missing entry, so
 * this never returns undefined and callers need no null branch.
 */
export function getIngredient(id: IngredientId): Ingredient {
  const found = BY_ID.get(id);
  /* istanbul ignore next — unreachable while `id` is an IngredientId. */
  if (found === undefined) {
    throw new Error(`Unknown ingredient id: ${String(id)}`);
  }
  return found;
}

/** Resolve a list of ids, preserving the order given. */
export function getIngredients(
  ids: readonly IngredientId[],
): readonly Ingredient[] {
  return ids.map(getIngredient);
}

/* -------------------------------------------------------------------------- */
/* Derivation helpers                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The concerns a set of ingredients is ordinarily used for.
 *
 * Deduplicated and returned in {@link CONCERN_ORDER}, so two products with the
 * same ingredients always produce byte-identical arrays regardless of the order
 * they were listed in.
 */
export function concernsOf(ids: readonly IngredientId[]): readonly Concern[] {
  const seen = new Set<Concern>();
  for (const ingredient of getIngredients(ids)) {
    for (const concern of ingredient.addresses) seen.add(concern);
  }
  return CONCERN_ORDER.filter((concern) => seen.has(concern));
}

/**
 * The engine active classes present in a set of ingredients.
 *
 * Deduplicated and returned in {@link ACTIVE_CLASS_ORDER}.
 */
export function activeClassesOf(
  ids: readonly IngredientId[],
): readonly ActiveClass[] {
  const seen = new Set<ActiveClass>();
  for (const ingredient of getIngredients(ids)) {
    if (ingredient.activeClass !== null) seen.add(ingredient.activeClass);
  }
  return ACTIVE_CLASS_ORDER.filter((cls) => seen.has(cls));
}

/**
 * Every distinct caution across a set of ingredients, with the ingredients that
 * raised it. Cautions are never collapsed to a single worst case — a user
 * asking "why" deserves to know which ingredient is responsible.
 */
export function cautionsOf(
  ids: readonly IngredientId[],
): ReadonlyMap<IngredientCaution, readonly IngredientId[]> {
  const out = new Map<IngredientCaution, IngredientId[]>();
  for (const ingredient of getIngredients(ids)) {
    for (const caution of ingredient.cautions) {
      const existing = out.get(caution);
      if (existing === undefined) out.set(caution, [ingredient.id]);
      else existing.push(ingredient.id);
    }
  }
  return out;
}

/** True when any ingredient in the set carries the caution. */
export function hasCaution(
  ids: readonly IngredientId[],
  caution: IngredientCaution,
): boolean {
  return getIngredients(ids).some((i) => i.cautions.includes(caution));
}

/**
 * The highest irritancy tier present.
 *
 * A worst-case reading, not an average: a formula is as challenging as its most
 * challenging ingredient, and averaging would let a long list of bland
 * emollients hide a high-tier acid.
 */
export function peakIrritancy(ids: readonly IngredientId[]): IrritancyTier {
  let peak: IrritancyTier = 'minimal';
  for (const ingredient of getIngredients(ids)) {
    if (IRRITANCY_RANK[ingredient.irritancy] > IRRITANCY_RANK[peak]) {
      peak = ingredient.irritancy;
    }
  }
  return peak;
}

/** Claims that the presence of these ingredients falsifies. */
export function blockedClaims(
  ids: readonly IngredientId[],
): readonly ClaimBlock[] {
  const seen = new Set<ClaimBlock>();
  for (const ingredient of getIngredients(ids)) {
    for (const claim of ingredient.claimBlocks ?? []) seen.add(claim);
  }
  return [...seen];
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * [E] Disclosure for any surface that lists ingredients or their uses.
 *
 *     Mirrors the routine engine's `FIT_SCORE_DISCLOSURE` in intent: the honest
 *     sentence exists once, as a shared string, rather than being re-invented
 *     per screen or quietly omitted.
 */
export const INGREDIENT_DISCLOSURE =
  'Ingredient information is general, not personal. It describes what an ingredient is commonly used for — not what it will do for your skin.';

/** [E] Shown wherever a pregnancy caution is surfaced. */
export const PREGNANCY_DISCLOSURE =
  'If you are pregnant or breastfeeding, check any active ingredient with your midwife, GP or dermatologist. This app cannot make that call for you.';

/** [E] Shown alongside any irritancy tier. */
export const IRRITANCY_DISCLOSURE =
  'Irritancy is a general guide for a typical product, not a prediction. Anyone can react to anything — patch test, and introduce one new active at a time.';

/** [E] Human-readable labels. Plain, non-alarming, safe to render verbatim. */
export const CAUTION_LABEL: Readonly<Record<IngredientCaution, string>> = {
  photosensitising: 'Increases sun sensitivity — wear sunscreen daily',
  'pregnancy-avoid': 'Usually avoided in pregnancy and breastfeeding',
  'pregnancy-discuss': 'Pregnancy guidance is mixed — ask a professional',
  'bleaches-fabric': 'Bleaches towels, bedding and clothing',
  'contact-allergen-notable': 'A recognised contact allergen for some people',
  'low-ph-stings': 'Acidic — brief stinging on application is common',
  'not-on-broken-skin': 'Not for broken, raw or freshly shaved skin',
  'unstable-in-light-or-air': 'Degrades in light or air — store closed and dark',
  'introduce-gradually': 'Start slowly and build up frequency',
  'medicine-not-cosmetic': 'Regulated as a medicine in some countries',
};

/** [E] Human-readable labels for irritancy tiers. */
export const IRRITANCY_LABEL: Readonly<Record<IrritancyTier, string>> = {
  minimal: 'Very well tolerated',
  low: 'Well tolerated',
  moderate: 'Can irritate — introduce slowly',
  high: 'Frequently irritating — introduce slowly',
};

/** [E] Human-readable labels for evidence tiers. */
export const EVIDENCE_LABEL: Readonly<Record<EvidenceTier, string>> = {
  'well-established': 'Well established',
  supported: 'Reasonable evidence',
  limited: 'Limited evidence',
  structural: 'Formulation ingredient — no skin claim',
};
