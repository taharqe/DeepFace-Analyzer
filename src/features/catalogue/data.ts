import type { Product } from './types';

/**
 * Catalogue size shown on the tailoring screen.
 * [M] Read off the capture: "47750 products in the catalogue".
 */
export const CATALOGUE_SIZE = 47_750;

/**
 * Sample products.
 *
 * Only "Soy Face Cleanser" by "Peach & Lily" and the €39.99 price pill appear
 * in the capture set - they are the type-specimen strings in the spec. The
 * rest are placeholders with the same shape, so the list screens have
 * something to lay out. Replace with real catalogue data.
 */
export const PRODUCTS: Product[] = [
  {
    id: 'soy-face-cleanser',
    name: 'Soy Face Cleanser',
    brand: 'Peach & Lily',
    priceMinor: 3999,
    currency: 'EUR',
    score: 99,
    attributes: ['Sulfate-free', 'Fragrance-free'],
    targets: ['dryness', 'redness'],
    slots: ['morning', 'evening'],
    step: 'Cleanse',
  },
  {
    id: 'barrier-serum',
    name: 'Barrier Repair Serum',
    brand: 'Peach & Lily',
    priceMinor: 4899,
    currency: 'EUR',
    score: 94,
    attributes: ['Fragrance-free', 'Non-comedogenic'],
    targets: ['dryness', 'fine-lines'],
    slots: ['evening'],
    step: 'Treat',
  },
  {
    id: 'niacinamide-10',
    name: 'Niacinamide 10% Concentrate',
    brand: 'Peach & Lily',
    priceMinor: 1899,
    currency: 'EUR',
    score: 88,
    attributes: ['Fragrance-free'],
    targets: ['pores', 'uneven-tone'],
    slots: ['morning'],
    step: 'Treat',
  },
  {
    id: 'daily-spf-50',
    name: 'Daily Mineral SPF 50',
    brand: 'Peach & Lily',
    priceMinor: 2499,
    currency: 'EUR',
    score: 76,
    attributes: ['Non-comedogenic', 'Fragrance-free'],
    targets: ['uneven-tone', 'redness'],
    slots: ['morning'],
    step: 'Protect',
  },
  {
    id: 'ceramide-cream',
    name: 'Ceramide Night Cream',
    brand: 'Peach & Lily',
    priceMinor: 3299,
    currency: 'EUR',
    score: 91,
    attributes: ['Sulfate-free', 'Non-comedogenic'],
    targets: ['dryness', 'dullness'],
    slots: ['evening'],
    step: 'Moisturise',
  },
];

export const routineFor = (slot: 'morning' | 'evening'): Product[] =>
  PRODUCTS.filter((p) => p.slots.includes(slot));
