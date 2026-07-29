import type {
  Concern,
  Product,
  ProductAttribute,
  RoutineSlot,
} from './types';
import {
  activeClassesOf,
  blockedClaims,
  cautionsOf,
  concernsOf,
  getIngredients,
  peakIrritancy,
  type ActiveClass,
  type IngredientCaution,
  type IngredientId,
  type Ingredient,
  type IrritancyTier,
} from './ingredients';

/**
 * Catalogue — products.
 *
 * ============================================================================
 * WHAT THIS DATA IS, PLAINLY
 * ============================================================================
 *
 * [E] THESE ARE REPRESENTATIVE PLACEHOLDER ENTRIES. Every product here is
 *     invented. The brands are invented. The prices are invented. The pack
 *     sizes are invented.
 *
 *     THIS IS NOT A LICENSED PRODUCT DATABASE and nothing in it describes a
 *     real product you can buy. What is realistic — deliberately so — is the
 *     *composition*: each entry is built from the ingredient library in
 *     `ingredients.ts` using combinations, concentrations-by-implication and
 *     step assignments that match how such products are actually formulated.
 *     That is enough for the routine engine to be exercised honestly, and it is
 *     the part that would survive a swap to real data.
 *
 *     When real catalogue data arrives it replaces `PRODUCT_DEFS` and nothing
 *     else. The derivation, the audit and the exported shape all stay.
 *
 * ============================================================================
 * THE `score` FIELD IS GONE, ON PURPOSE
 * ============================================================================
 *
 * `catalogue/data.ts` gives every product a hardcoded `score` — 99, 94, 88, 76.
 * Those numbers are the defect this file exists to remove. A static score says
 * "this product is a 99% fit for you" before the user has answered anything,
 * which is a claim about a person made from a constant.
 *
 * Fit is not a property of a product. It is a relation between a product and
 * what a user told us, so it is computed per user by the routine engine
 * (`src/features/routine`) and it is not storable here. {@link CatalogueProduct}
 * therefore has no `score` field at all — not zero, not optional, absent — so
 * the old bug cannot be reintroduced by filling in a blank.
 *
 * ============================================================================
 * CLAIMS NARROW, CAUTIONS WIDE
 * ============================================================================
 *
 * Two fields are derived from the formula rather than typed by hand, and they
 * are derived from deliberately different inputs:
 *
 *   `targets` ← keyIngredientIds — only the ingredients present at a level the
 *               product's claims actually rest on. A rinse-off cleanser with a
 *               dusting of niacinamide does not get to claim niacinamide's
 *               benefits, because it is on the skin for twenty seconds.
 *
 *   `actives` ← ingredientIds — EVERY ingredient with an engine active class,
 *               key or not. This feeds conflict detection, where the failure we
 *               want is over-triggering.
 *
 * So a product under-claims and over-warns, and neither can drift from the
 * formula, because neither is written down.
 *
 * The rule applied consistently to rinse-off products: an ingredient is key
 * only if its benefit survives being washed off. Humectants and lipids that
 * deposit and stop a wash from stripping do; anything sold as a treatment does
 * not. That is why no cleanser here claims to calm redness on the strength of
 * the panthenol in it, and why the BHA wash claims pores on its salicylic acid
 * — an acid does its work during contact, which is the product's whole purpose,
 * while niacinamide needs to still be there an hour later.
 *
 * ============================================================================
 * KNOWN INTERACTION WITH THE ROUTINE ENGINE — READ BEFORE "FIXING" IT
 * ============================================================================
 *
 * The engine's conflict table keys off coarse active classes and cannot see
 * {@link ContactMode}. `bha-clarifying-wash` is a rinse-off cleanser, so its
 * `actives` include `bha`, and the engine will therefore separate or demote
 * leave-on retinoids and acids out of a session that contains it — a routine
 * built around that cleanser can lose its entire treat step to a product the
 * user rinses off in twenty seconds.
 *
 * That is a real effect of real data, and this file does NOT work around it by
 * quietly dropping the class: an active that is in the formula is reported as
 * being in the formula. The engine's own documentation states that coarse
 * classes over-trigger and that over-triggering is the failure mode it wants,
 * and it reports every separation it makes with a reason, so the behaviour is
 * visible rather than silent.
 *
 * If that trade is later judged too costly, the fix belongs in the engine — a
 * rule that reads `contact` and treats rinse-off actives differently — and
 * {@link ContactMode} is carried on every product so that rule has data to work
 * from. Deleting `salicylic-acid` from a salicylic acid wash is not the fix.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Step labels.
 *
 * `Product.step` in `types.ts` is a free `string`; this narrows it to the four
 * the app has steps for. The routine engine lower-cases and looks the string up
 * in its own synonym table before ordering anything, and refuses to guess at an
 * unrecognised one — these four are chosen to match entries in that table, so
 * every product in this file is placeable.
 */
export type ProductStep = 'Cleanse' | 'Treat' | 'Moisturise' | 'Protect';

/** [E] Physical form. Affects how a product feels and layers, not what it does. */
export type ProductFormat =
  | 'gel'
  | 'cream'
  | 'gel-cream'
  | 'lotion'
  | 'fluid'
  | 'serum'
  | 'oil'
  | 'balm'
  | 'foam'
  | 'toner';

/**
 * How long the product stays on the skin.
 *
 * Load-bearing, not decoration: it is why a rinse-off product's supporting
 * actives are kept out of `keyIngredientIds`, and therefore out of its claims.
 */
export type ContactMode = 'rinse-off' | 'leave-on';

/**
 * [E] How often the product is ordinarily used.
 *
 *     `build-up-nightly` is its own value rather than a note, because "start
 *     twice a week and work up" is the single most important instruction
 *     attached to a retinoid and it should not be losable in prose.
 */
export type UsageFrequency =
  | 'twice-daily'
  | 'daily'
  | 'up-to-3x-week'
  | 'build-up-nightly'
  | 'as-needed-spot';

export interface PackSize {
  readonly amount: number;
  readonly unit: 'ml' | 'g';
}

/* -------------------------------------------------------------------------- */
/* The model                                                                  */
/* -------------------------------------------------------------------------- */

/** A catalogue entry as authored — before `targets` and `actives` are derived. */
export interface ProductDef {
  readonly name: string;
  /** [E] Invented house brand. No real company is described by this file. */
  readonly brand: string;
  /** Minor units, to avoid float drift. 3999 = EUR 39.99. */
  readonly priceMinor: number;
  readonly currency: 'EUR';
  readonly size: PackSize;
  readonly step: ProductStep;
  readonly slots: readonly RoutineSlot[];
  readonly contact: ContactMode;
  readonly format: ProductFormat;
  readonly usage: UsageFrequency;
  /**
   * Manufacturer-style claims. `Sulfate-free` and `Fragrance-free` are checkable
   * against the formula and `auditCatalogue` checks them. `Non-comedogenic` is
   * not — it has no agreed definition or test behind it — so it is carried as a
   * claim and never derived. See {@link UNVERIFIABLE_CLAIMS}.
   */
  readonly attributes: readonly ProductAttribute[];
  /**
   * The formula, roughly in order of inclusion, the way a label reads.
   *
   * Not a complete INCI list: preservatives, buffers and chelators are omitted
   * throughout because nothing in the app reasons about them and listing a
   * partial set as if it were complete would be the misleading option.
   */
  readonly ingredientIds: readonly IngredientId[];
  /**
   * The subset of {@link ingredientIds} present at a level the product's claims
   * rest on. `targets` is derived from these and only these.
   *
   * Must be a subset of `ingredientIds`; `auditCatalogue` enforces it.
   */
  readonly keyIngredientIds: readonly IngredientId[];
  /** Plain language, safe to render verbatim. Never diagnostic. */
  readonly note: string;
}

/** A catalogue entry as consumed: authored fields plus derived ones. */
export interface CatalogueProduct extends ProductDef {
  readonly id: ProductId;
  /**
   * DERIVED from `keyIngredientIds`. What the product is ordinarily used for —
   * never a prediction of a result for a given person.
   */
  readonly targets: readonly Concern[];
  /**
   * DERIVED from `ingredientIds`. The coarse active classes the routine engine
   * checks for clashes.
   *
   * Always present and possibly empty. Empty means "we looked and there are
   * none", which the engine reads differently from a missing field — see
   * `ProductIngredients` in `routine/types.ts`.
   */
  readonly actives: readonly ActiveClass[];
  /** DERIVED. Price per 100 ml or 100 g, in minor units. */
  readonly pricePer100Minor: number;
}

/* -------------------------------------------------------------------------- */
/* The catalogue                                                              */
/* -------------------------------------------------------------------------- */

/**
 * [E] 24 invented entries spanning the four steps.
 *
 * Keys are product ids, so an id can never disagree with the entry it names and
 * {@link ProductId} is derived from the data.
 *
 * The spread is chosen so the routine engine has something real to do: several
 * products per step, competing actives that its conflict table must separate
 * (retinoids against acids, acids against benzoyl peroxide), gentle
 * alternatives for a user who reports redness, and one thoroughly unremarkable
 * cleanser that claims nothing at all — because a catalogue where every entry
 * is excellent is a catalogue that cannot be ranked.
 */
export const PRODUCT_DEFS = {
  /* --- Cleanse ----------------------------------------------------------- */

  'everyday-gel-cleanser': {
    name: 'Everyday Gel Cleanser',
    brand: 'Quiet Skin',
    priceMinor: 1290,
    currency: 'EUR',
    size: { amount: 200, unit: 'ml' },
    step: 'Cleanse',
    slots: ['morning', 'evening'],
    contact: 'rinse-off',
    format: 'gel',
    usage: 'twice-daily',
    attributes: ['Sulfate-free', 'Fragrance-free'],
    ingredientIds: [
      'coco-glucoside',
      'sodium-cocoyl-isethionate',
      'glycerin',
      'panthenol',
      'allantoin',
      'carbomer',
    ],
    keyIngredientIds: ['glycerin'],
    note: 'A low-drama daily wash built on mild sugar- and coconut-derived cleansing agents. It removes the day without stripping, and it is the safe default when the rest of a routine is doing the work. The panthenol and allantoin make it more comfortable to use; they are not counted as claims, because a wash is not a treatment.',
  },

  'milk-cleanser': {
    name: 'Milk Cleanser',
    brand: 'Nord & Bloom',
    priceMinor: 1690,
    currency: 'EUR',
    size: { amount: 150, unit: 'ml' },
    step: 'Cleanse',
    slots: ['morning', 'evening'],
    contact: 'rinse-off',
    format: 'cream',
    usage: 'twice-daily',
    attributes: ['Sulfate-free', 'Fragrance-free'],
    ingredientIds: [
      'coco-glucoside',
      'glycerin',
      'caprylic-capric-triglyceride',
      'squalane',
      'shea-butter',
      'ceramide-np',
      'panthenol',
    ],
    keyIngredientIds: ['glycerin', 'squalane', 'ceramide-np'],
    note: 'Barely foams, and that is the point. For skin that feels tight after washing, or for anyone using retinoids or acids and paying for it.',
  },

  'bha-clarifying-wash': {
    name: '2% BHA Clarifying Wash',
    brand: 'Plainform',
    priceMinor: 1490,
    currency: 'EUR',
    size: { amount: 150, unit: 'ml' },
    step: 'Cleanse',
    slots: ['morning', 'evening'],
    contact: 'rinse-off',
    format: 'gel',
    usage: 'daily',
    attributes: ['Sulfate-free'],
    ingredientIds: [
      'sodium-cocoyl-isethionate',
      'cocamidopropyl-betaine',
      'salicylic-acid',
      'niacinamide',
      'glycerin',
      'carbomer',
    ],
    keyIngredientIds: ['salicylic-acid'],
    note: 'Salicylic acid in a rinse-off base — a gentler way to use a BHA than a leave-on one. The niacinamide on the label is not counted towards what this product claims: twenty seconds of contact before it goes down the drain is not how niacinamide works.',
  },

  'deep-clean-foaming-wash': {
    name: 'Deep Clean Foaming Wash',
    brand: 'Meridian Skin',
    priceMinor: 990,
    currency: 'EUR',
    size: { amount: 200, unit: 'ml' },
    step: 'Cleanse',
    slots: ['morning', 'evening'],
    contact: 'rinse-off',
    format: 'foam',
    usage: 'twice-daily',
    attributes: [],
    ingredientIds: [
      'sodium-laureth-sulfate',
      'cocamidopropyl-betaine',
      'glycerin',
      'parfum',
    ],
    keyIngredientIds: [],
    note: 'A cheap, high-foam wash of the sort that dominates a real catalogue. It claims nothing here because there is nothing in it to claim — it is included so the ranking has an ordinary product to rank, and so the sulfate-free and fragrance-free labels elsewhere mean something.',
  },

  'cleansing-oil': {
    name: 'Cleansing Oil',
    brand: 'Halcyon',
    priceMinor: 2290,
    currency: 'EUR',
    size: { amount: 150, unit: 'ml' },
    step: 'Cleanse',
    slots: ['evening'],
    contact: 'rinse-off',
    format: 'oil',
    usage: 'daily',
    attributes: ['Sulfate-free', 'Fragrance-free'],
    ingredientIds: [
      'caprylic-capric-triglyceride',
      'squalane',
      'coco-glucoside',
      'tocopherol',
    ],
    keyIngredientIds: ['squalane'],
    note: 'Dissolves sunscreen and makeup, which water-based cleansers do poorly. Evening only, since that is when there is something to remove.',
  },

  /* --- Treat -------------------------------------------------------------- */

  'niacinamide-tranexamic-serum': {
    name: 'Niacinamide 10% + Tranexamic 2%',
    brand: 'Aura Lab',
    priceMinor: 1799,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['morning', 'evening'],
    contact: 'leave-on',
    format: 'serum',
    usage: 'daily',
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    ingredientIds: [
      'niacinamide',
      'tranexamic-acid',
      'zinc-pca',
      'propanediol',
      'glycerin',
      'sodium-hyaluronate',
    ],
    keyIngredientIds: ['niacinamide', 'tranexamic-acid', 'zinc-pca'],
    note: 'The unglamorous workhorse of a routine: oil, tone and marks, with very little to go wrong. Layers under almost anything, which is why it is here in both sessions.',
  },

  'vitamin-c-ferulic-serum': {
    name: '15% Vitamin C + Ferulic',
    brand: 'Meridian Skin',
    priceMinor: 3899,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['morning'],
    contact: 'leave-on',
    format: 'serum',
    usage: 'daily',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'ascorbic-acid',
      'ferulic-acid',
      'tocopherol',
      'propanediol',
      'glycerin',
    ],
    keyIngredientIds: ['ascorbic-acid'],
    note: 'Pure vitamin C stabilised with ferulic acid and vitamin E — the classic combination. Morning only, where it complements sunscreen. It will sting slightly and it will not last forever once opened.',
  },

  'glycolic-renewing-solution': {
    name: '7% Glycolic Renewing Solution',
    brand: 'Plainform',
    priceMinor: 1290,
    currency: 'EUR',
    size: { amount: 100, unit: 'ml' },
    step: 'Treat',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'toner',
    usage: 'up-to-3x-week',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'glycolic-acid',
      'glycerin',
      'panthenol',
      'allantoin',
      'propanediol',
    ],
    keyIngredientIds: ['glycolic-acid'],
    note: 'The strongest exfoliant in this catalogue and the one most likely to be overused. Two or three evenings a week is plenty. Sunscreen the next morning is not optional.',
  },

  'lactic-pha-exfoliant': {
    name: '5% Lactic + 2% PHA Gentle Exfoliant',
    brand: 'Quiet Skin',
    priceMinor: 1690,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'serum',
    usage: 'up-to-3x-week',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'lactic-acid',
      'gluconolactone',
      'sodium-hyaluronate',
      'panthenol',
      'centella-asiatica',
      'glycerin',
    ],
    keyIngredientIds: ['lactic-acid', 'gluconolactone'],
    note: 'Exfoliation for people who did not get on with glycolic acid. Both acids here are larger molecules that work nearer the surface, and both are hydrating in their own right.',
  },

  'retinol-03-squalane': {
    name: 'Retinol 0.3% in Squalane',
    brand: 'Aura Lab',
    priceMinor: 2499,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'oil',
    usage: 'build-up-nightly',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'squalane',
      'retinol',
      'caprylic-capric-triglyceride',
      'tocopherol',
    ],
    keyIngredientIds: ['retinol'],
    note: 'A starting-strength retinol in a plain oil base — the fewest things to react to while the skin adjusts. Twice a week to begin with. Expect some dryness and flaking in the first month.',
  },

  'retinal-night-serum': {
    name: 'Retinal 0.05% Night Serum',
    brand: 'Halcyon',
    priceMinor: 3499,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'serum',
    usage: 'build-up-nightly',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'retinal',
      'ceramide-np',
      'squalane',
      'glycerin',
      'tocopherol',
    ],
    keyIngredientIds: ['retinal', 'ceramide-np'],
    note: 'A step up from retinol, not a gentler version of it — retinal is one conversion closer to the active form, so a small number on the label goes further. The ceramides are there to offset the dryness.',
  },

  'adapalene-gel': {
    name: 'Adapalene 0.1% Gel',
    brand: 'Plainform',
    priceMinor: 1190,
    currency: 'EUR',
    size: { amount: 45, unit: 'g' },
    step: 'Treat',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'gel',
    usage: 'build-up-nightly',
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    ingredientIds: ['adapalene', 'carbomer', 'propanediol', 'glycerin'],
    keyIngredientIds: ['adapalene'],
    note: 'A retinoid developed specifically for spots, with strong evidence behind it for that. It is a medicine rather than a cosmetic — over the counter in the US, prescription-only across much of Europe — so where you live decides whether this is something you can simply buy.',
  },

  'azelaic-10-suspension': {
    name: 'Azelaic Acid 10% Suspension',
    brand: 'Meridian Skin',
    priceMinor: 1799,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['morning', 'evening'],
    contact: 'leave-on',
    format: 'gel-cream',
    usage: 'daily',
    attributes: ['Fragrance-free'],
    ingredientIds: ['azelaic-acid', 'dimethicone', 'glycerin', 'tocopherol'],
    keyIngredientIds: ['azelaic-acid'],
    note: 'Redness, marks and spots at once, and gentle enough for most people to use twice a day. The 10% here is the cosmetic strength; the 15–20% versions prescribed for rosacea are medicines and are a different conversation.',
  },

  'benzoyl-peroxide-gel': {
    name: 'Benzoyl Peroxide 2.5% Gel',
    brand: 'Plainform',
    priceMinor: 990,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'gel',
    usage: 'as-needed-spot',
    attributes: ['Fragrance-free'],
    ingredientIds: ['benzoyl-peroxide', 'carbomer', 'glycerin'],
    keyIngredientIds: ['benzoyl-peroxide'],
    note: 'For spots specifically, applied to them rather than everywhere. 2.5% works about as well as the stronger versions with less peeling. It will bleach your pillowcase and your towels, permanently.',
  },

  'hydrating-serum': {
    name: 'Hydrating Serum',
    brand: 'Quiet Skin',
    priceMinor: 1390,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['morning', 'evening'],
    contact: 'leave-on',
    format: 'serum',
    usage: 'twice-daily',
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    ingredientIds: [
      'sodium-hyaluronate',
      'glycerin',
      'panthenol',
      'centella-asiatica',
      'allantoin',
    ],
    keyIngredientIds: [
      'sodium-hyaluronate',
      'glycerin',
      'panthenol',
      'centella-asiatica',
      'allantoin',
    ],
    note: 'No actives, nothing to clash with, nothing to build up to. Worth having in a routine that is otherwise full of strong ingredients, and the sensible thing to reach for on a week when skin is unhappy.',
  },

  'bakuchiol-nightly-oil': {
    name: 'Bakuchiol 1% Nightly Oil',
    brand: 'Nord & Bloom',
    priceMinor: 2199,
    currency: 'EUR',
    size: { amount: 30, unit: 'ml' },
    step: 'Treat',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'oil',
    usage: 'daily',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'squalane',
      'bakuchiol',
      'caprylic-capric-triglyceride',
      'tocopherol',
    ],
    keyIngredientIds: ['bakuchiol', 'squalane'],
    note: 'Usually sold as a natural alternative to retinol. It is not a retinoid and this app does not treat it as one — the evidence behind it is a fraction of retinol’s, and buying it expecting retinol’s results is how people end up disappointed. What it does offer is a gentle option for skin that cannot tolerate the real thing.',
  },

  /* --- Moisturise ---------------------------------------------------------- */

  'ceramide-barrier-cream': {
    name: 'Ceramide Barrier Cream',
    brand: 'Aura Lab',
    priceMinor: 2899,
    currency: 'EUR',
    size: { amount: 50, unit: 'ml' },
    step: 'Moisturise',
    slots: ['morning', 'evening'],
    contact: 'leave-on',
    format: 'cream',
    usage: 'twice-daily',
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    ingredientIds: [
      'glycerin',
      'ceramide-np',
      'cholesterol',
      'squalane',
      'cetearyl-alcohol',
      'dimethicone',
      'panthenol',
    ],
    keyIngredientIds: ['glycerin', 'ceramide-np', 'cholesterol', 'squalane'],
    note: 'Built around the three lipid families skin actually makes — ceramides, cholesterol and fatty acids — rather than ceramides alone, because the ratio between them is what the research is about.',
  },

  'oil-free-gel-moisturiser': {
    name: 'Oil-free Gel Moisturiser',
    brand: 'Meridian Skin',
    priceMinor: 1990,
    currency: 'EUR',
    size: { amount: 50, unit: 'ml' },
    step: 'Moisturise',
    slots: ['morning', 'evening'],
    contact: 'leave-on',
    format: 'gel-cream',
    usage: 'twice-daily',
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    ingredientIds: [
      'glycerin',
      'sodium-hyaluronate',
      'niacinamide',
      'dimethicone',
      'carbomer',
    ],
    keyIngredientIds: ['glycerin', 'sodium-hyaluronate', 'niacinamide'],
    note: 'A light gel for skin that finds creams too much. Enough niacinamide to count, unlike the cleanser.',
  },

  'urea-smoothing-cream': {
    name: '10% Urea Smoothing Cream',
    brand: 'Plainform',
    priceMinor: 1490,
    currency: 'EUR',
    size: { amount: 100, unit: 'ml' },
    step: 'Moisturise',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'cream',
    usage: 'daily',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'urea',
      'glycerin',
      'ceramide-np',
      'petrolatum',
      'cetearyl-alcohol',
    ],
    keyIngredientIds: ['urea', 'glycerin', 'ceramide-np', 'petrolatum'],
    note: 'At 10% urea does two jobs — holds water in and softens rough, thickened patches. Effective on very dry skin, and liable to sting anywhere already cracked.',
  },

  'overnight-repair-balm': {
    name: 'Overnight Repair Balm',
    brand: 'Halcyon',
    priceMinor: 2599,
    currency: 'EUR',
    size: { amount: 50, unit: 'ml' },
    step: 'Moisturise',
    slots: ['evening'],
    contact: 'leave-on',
    format: 'balm',
    usage: 'daily',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'petrolatum',
      'shea-butter',
      'squalane',
      'ceramide-np',
      'panthenol',
      'palmitoyl-tripeptide-1',
      'acetyl-hexapeptide-8',
      'tocopherol',
    ],
    keyIngredientIds: [
      'petrolatum',
      'shea-butter',
      'ceramide-np',
      'palmitoyl-tripeptide-1',
    ],
    note: 'A heavy occlusive balm for overnight. The sealing ingredients are doing nearly all of the work; the peptides are a pleasant extra whose evidence is thin, and this catalogue would rather say that than let them carry the price.',
  },

  'oat-relief-cream': {
    name: 'Colloidal Oat Relief Cream',
    brand: 'Quiet Skin',
    priceMinor: 1790,
    currency: 'EUR',
    size: { amount: 50, unit: 'ml' },
    step: 'Moisturise',
    slots: ['morning', 'evening'],
    contact: 'leave-on',
    format: 'cream',
    usage: 'twice-daily',
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    ingredientIds: [
      'colloidal-oatmeal',
      'glycerin',
      'panthenol',
      'allantoin',
      'squalane',
      'cetearyl-alcohol',
    ],
    keyIngredientIds: [
      'colloidal-oatmeal',
      'glycerin',
      'panthenol',
      'allantoin',
    ],
    note: 'For skin that is red, tight and complaining — after too much exfoliation, or in cold weather. Colloidal oat is one of the few soothing ingredients a regulator has actually recognised.',
  },

  /* --- Protect ------------------------------------------------------------- */

  'mineral-fluid-spf-50': {
    name: 'Mineral Fluid SPF 50',
    brand: 'Aura Lab',
    priceMinor: 2499,
    currency: 'EUR',
    size: { amount: 50, unit: 'ml' },
    step: 'Protect',
    slots: ['morning'],
    contact: 'leave-on',
    format: 'fluid',
    usage: 'daily',
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    ingredientIds: [
      'zinc-oxide',
      'titanium-dioxide',
      'squalane',
      'caprylic-capric-triglyceride',
      'tocopherol',
    ],
    keyIngredientIds: ['zinc-oxide', 'titanium-dioxide'],
    note: 'Mineral filters only, which is the least reactive option and the usual recommendation for sensitive skin. It may leave a slight cast on deeper skin tones — that is the trade-off with zinc oxide, not a formulation fault.',
  },

  'tinted-mineral-spf-30': {
    name: 'Tinted Mineral SPF 30',
    brand: 'Nord & Bloom',
    priceMinor: 2199,
    currency: 'EUR',
    size: { amount: 40, unit: 'ml' },
    step: 'Protect',
    slots: ['morning'],
    contact: 'leave-on',
    format: 'fluid',
    usage: 'daily',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'zinc-oxide',
      'iron-oxides',
      'glycerin',
      'dimethicone',
      'squalane',
    ],
    keyIngredientIds: ['zinc-oxide'],
    note: 'The tint cancels the white cast and adds cover against visible light, which matters for some kinds of pigmentation. Worth being clear that the evening-out you see on application is makeup — the sun protection underneath is the part that changes anything.',
  },

  'daily-fluid-spf-50': {
    name: 'Daily Fluid SPF 50',
    brand: 'Meridian Skin',
    priceMinor: 2899,
    currency: 'EUR',
    size: { amount: 50, unit: 'ml' },
    step: 'Protect',
    slots: ['morning'],
    contact: 'leave-on',
    format: 'fluid',
    usage: 'daily',
    attributes: ['Fragrance-free'],
    ingredientIds: [
      'bemotrizinol',
      'bisoctrizole',
      'avobenzone',
      'octocrylene',
      'glycerin',
      'propanediol',
      'tocopherol',
    ],
    keyIngredientIds: ['bemotrizinol', 'bisoctrizole', 'avobenzone'],
    note: 'Four organic filters together: modern broad-spectrum ones plus avobenzone held stable by octocrylene. Cosmetically far nicer than a mineral sunscreen, and the reason European sunscreens feel different — several of these filters are not approved in the US.',
  },

} satisfies Record<string, ProductDef>;

/* -------------------------------------------------------------------------- */
/* Derived catalogue                                                          */
/* -------------------------------------------------------------------------- */

/** Every product id, derived from the catalogue itself. */
export type ProductId = keyof typeof PRODUCT_DEFS;

/** All product ids, in declaration order. */
export const PRODUCT_IDS = Object.keys(PRODUCT_DEFS) as readonly ProductId[];

/** Price per 100 ml / 100 g in minor units. Rounded to the nearest minor unit. */
function pricePer100(def: ProductDef): number {
  return Math.round((def.priceMinor / def.size.amount) * 100);
}

function build(id: ProductId, def: ProductDef): CatalogueProduct {
  return {
    ...def,
    id,
    /* Claims narrow: key ingredients only. */
    targets: concernsOf(def.keyIngredientIds),
    /* Cautions wide: the whole formula. */
    actives: activeClassesOf(def.ingredientIds),
    pricePer100Minor: pricePer100(def),
  };
}

/**
 * The catalogue.
 *
 * `targets` and `actives` are computed here, once, at module load — from pure
 * functions over the ingredient library, so they cannot disagree with the
 * formulas above.
 */
export const PRODUCTS: readonly CatalogueProduct[] = PRODUCT_IDS.map((id) =>
  build(id, PRODUCT_DEFS[id]),
);

const BY_ID: ReadonlyMap<ProductId, CatalogueProduct> = new Map(
  PRODUCTS.map((product) => [product.id, product]),
);

/** Look a product up. Total: `ProductId` cannot name a missing entry. */
export function getProduct(id: ProductId): CatalogueProduct {
  const found = BY_ID.get(id);
  /* istanbul ignore next — unreachable while `id` is a ProductId. */
  if (found === undefined) {
    throw new Error(`Unknown product id: ${String(id)}`);
  }
  return found;
}

/**
 * [M] Catalogue size shown on the tailoring screen.
 *     Read off the capture: "47750 products in the catalogue".
 *
 * This is a measured *string from the source screens*, not a count of
 * {@link PRODUCTS}. It is kept because the tailoring screen's layout was
 * measured against a five-digit number. It must never be presented as the size
 * of this catalogue, which has {@link PRODUCTS}.length entries.
 */
export const CATALOGUE_SIZE = 47_750;

/**
 * Products available in a session.
 *
 * Availability, not a recommendation — the routine engine decides what is
 * actually used, and it applies conflict and session rules this does not.
 */
export const routineFor = (slot: RoutineSlot): readonly CatalogueProduct[] =>
  PRODUCTS.filter((p) => p.slots.includes(slot));

/** Products at a given step, in declaration order. */
export const productsForStep = (
  step: ProductStep,
): readonly CatalogueProduct[] => PRODUCTS.filter((p) => p.step === step);

/* -------------------------------------------------------------------------- */
/* Ingredient views over a product                                            */
/* -------------------------------------------------------------------------- */

/** The full formula, resolved, in label order. */
export const ingredientsOf = (
  product: CatalogueProduct,
): readonly Ingredient[] => getIngredients(product.ingredientIds);

/** Only the ingredients the product's claims rest on. */
export const keyIngredientsOf = (
  product: CatalogueProduct,
): readonly Ingredient[] => getIngredients(product.keyIngredientIds);

/**
 * Every caution the formula raises, mapped to the ingredients responsible.
 *
 * Derived from the whole formula, never only the key ingredients: an ingredient
 * too minor to claim a benefit for is not too minor to irritate someone.
 */
export const cautionsFor = (
  product: CatalogueProduct,
): ReadonlyMap<IngredientCaution, readonly IngredientId[]> =>
  cautionsOf(product.ingredientIds);

/** The most challenging ingredient in the formula, as a tier. Worst case. */
export const irritancyOf = (product: CatalogueProduct): IrritancyTier =>
  peakIrritancy(product.ingredientIds);

/* -------------------------------------------------------------------------- */
/* Bridge to the legacy `Product` shape                                       */
/* -------------------------------------------------------------------------- */

/**
 * [E] Placeholder for the legacy `Product.score` field.
 *
 *     `catalogue/types.ts` still declares `score: number` as required, so a
 *     `CatalogueProduct` cannot be handed to anything typed against `Product`
 *     without one — including the routine engine, whose `ScorableProduct` is
 *     `Product & …`. The engine never reads it; it computes its own score from
 *     the user's answers and ignores whatever is here.
 *
 *     -1 is chosen because it is IMPOSSIBLE as a real fit score. Scores are
 *     0–100, so:
 *       · any UI that renders this value shows something visibly wrong rather
 *         than something plausibly wrong;
 *       · `isMeasuredBand(-1)` in `match.ts` is already false, so screens that
 *         filter on it drop these rows instead of displaying a fake figure.
 *
 *     A neutral-looking 50, or a flattering 90, would have hidden the bug this
 *     file exists to remove. Delete this once `score` leaves `Product`.
 */
export const LEGACY_SCORE_SENTINEL = -1;

/** A legacy `Product`, carrying ingredient data the routine engine can read. */
export type ScorableCatalogueProduct = Product & {
  readonly actives: readonly ActiveClass[];
};

/**
 * Adapt to the legacy `Product` shape for the routine engine and for screens
 * not yet migrated.
 *
 * Arrays are copied because `Product` declares them mutable; the catalogue's
 * own arrays stay readonly and shared.
 */
export function toScorableProduct(
  product: CatalogueProduct,
): ScorableCatalogueProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    priceMinor: product.priceMinor,
    currency: product.currency,
    score: LEGACY_SCORE_SENTINEL,
    attributes: [...product.attributes],
    targets: [...product.targets],
    slots: [...product.slots],
    step: product.step,
    actives: product.actives,
  };
}

/**
 * The catalogue in the shape the routine engine takes.
 *
 *   const plan = generateRoutinePlan(SCORABLE_PRODUCTS, { concerns, age });
 *
 * Every entry carries `actives` — always present, sometimes empty — so the
 * engine's conflict checking is never blind here, and it will not emit its
 * `no-ingredient-data` note for this catalogue.
 */
export const SCORABLE_PRODUCTS: readonly ScorableCatalogueProduct[] =
  PRODUCTS.map(toScorableProduct);

/* -------------------------------------------------------------------------- */
/* Audit                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Claims that cannot be checked against an ingredient list, and why.
 *
 * `Non-comedogenic` has no legal definition, no agreed test and no regulator
 * behind it. It is recorded as a manufacturer claim and is never derived, never
 * verified, and should never be presented by the app as a finding of its own.
 */
export const UNVERIFIABLE_CLAIMS: Readonly<
  Partial<Record<ProductAttribute, string>>
> = {
  'Non-comedogenic':
    'Manufacturer claim. There is no agreed test or legal definition behind it, so it cannot be checked against the ingredient list.',
};

export type AuditFindingKind =
  /** `keyIngredientIds` contains an id absent from `ingredientIds`. */
  | 'key-ingredient-not-in-formula'
  /** A claim the formula falsifies — e.g. "Sulfate-free" over a sulfate. */
  | 'claim-contradicted-by-formula'
  /** A `Protect` product available in the evening, or absent in the morning. */
  | 'sun-protection-slot'
  /** Claims a concern no key ingredient supports, or vice versa. */
  | 'targets-empty-but-claims-made'
  /** Price or pack size outside a sane range — catches transcription slips. */
  | 'implausible-price';

export interface AuditFinding {
  readonly productId: ProductId;
  readonly kind: AuditFindingKind;
  readonly detail: string;
}

/**
 * Check the catalogue's internal consistency.
 *
 * Returns findings rather than throwing: a data problem should fail a test or a
 * dev check, not crash a user's app at import time. Intended to be asserted
 * empty in CI.
 */
export function auditCatalogue(): readonly AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const product of PRODUCTS) {
    const formula = new Set<IngredientId>(product.ingredientIds);

    for (const keyId of product.keyIngredientIds) {
      if (!formula.has(keyId)) {
        findings.push({
          productId: product.id,
          kind: 'key-ingredient-not-in-formula',
          detail: `"${keyId}" is claimed as a key ingredient but is not in the formula.`,
        });
      }
    }

    for (const claim of blockedClaims(product.ingredientIds)) {
      if (product.attributes.includes(claim)) {
        findings.push({
          productId: product.id,
          kind: 'claim-contradicted-by-formula',
          detail: `Claims "${claim}", but the formula contains an ingredient that falsifies it.`,
        });
      }
    }

    if (product.step === 'Protect') {
      if (!product.slots.includes('morning')) {
        findings.push({
          productId: product.id,
          kind: 'sun-protection-slot',
          detail: 'Sun protection is not available in the morning session.',
        });
      }
      if (product.slots.includes('evening')) {
        findings.push({
          productId: product.id,
          kind: 'sun-protection-slot',
          detail:
            'Sun protection is offered in the evening session, where it does nothing.',
        });
      }
    }

    if (product.targets.length === 0 && product.keyIngredientIds.length > 0) {
      findings.push({
        productId: product.id,
        kind: 'targets-empty-but-claims-made',
        detail:
          'Has key ingredients but no derived targets — the key list may name only structural ingredients.',
      });
    }

    if (product.priceMinor <= 0 || product.priceMinor > 50_000) {
      findings.push({
        productId: product.id,
        kind: 'implausible-price',
        detail: `priceMinor ${product.priceMinor} is outside the plausible range.`,
      });
    }
  }

  return findings;
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * [E] Disclosure for any surface listing these products.
 *
 *     Required wherever the catalogue is shown while it holds placeholder data.
 *     Shipping invented products without this line would be the same class of
 *     mistake as the predecessor project's unevidenced accuracy claim.
 */
export const CATALOGUE_PLACEHOLDER_DISCLOSURE =
  'These are example products with realistic ingredient lists, not a real product catalogue. Brands, prices and pack sizes are illustrative.';

/** [E] Shown wherever a derived `targets` list is rendered. */
export const TARGETS_DISCLOSURE =
  'What a product is aimed at, based on its main ingredients. Not a prediction of what it will do for your skin.';
