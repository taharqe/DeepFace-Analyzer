export type Concern =
  | 'fine-lines'
  | 'pores'
  | 'uneven-tone'
  | 'dryness'
  | 'redness'
  | 'dullness';

export type RoutineSlot = 'morning' | 'evening';

export type ProductAttribute =
  | 'Sulfate-free'
  | 'Fragrance-free'
  | 'Non-comedogenic';

export interface Product {
  id: string;
  name: string;
  brand: string;
  /** Minor units, to avoid float drift. 3999 = EUR 39.99. */
  priceMinor: number;
  currency: 'EUR';
  /** 0-100 fit against the user's answers. */
  score: number;
  attributes: ProductAttribute[];
  targets: Concern[];
  slots: RoutineSlot[];
  step: string;
}
