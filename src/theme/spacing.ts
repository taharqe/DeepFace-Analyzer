/**
 * Spacing scale. 4pt base.
 *
 * Step 2 (8pt) is [M] - the inter-card gap measured 15px, which at 1.85 px/pt
 * is 8.1pt. Step 6 (24pt) is [D]. The rest follow the base.
 *
 * Steps 5, 7, 9, 11 are deliberately absent: they appear nowhere in the corpus.
 */
export const spacing = {
  /** 1 */
  xs: 4,
  /** 2 [M] */
  sm: 8,
  /** 3 */
  md: 12,
  /** 4 */
  lg: 16,
  /** 6 [D] */
  xl: 24,
  /** 8 */
  xxl: 32,
  /** 10 */
  xxxl: 40,
  /** 12 */
  huge: 48,
  /** 16 */
  giant: 64,
} as const;

export type SpacingToken = keyof typeof spacing;
