/**
 * Spacing scale. 4pt base.
 *
 * Step 2 (8pt) is [M] - the inter-card gap measured 15px, which at 1.85 px/pt
 * is 8.1pt. Step 6 (24pt) is [D]. The rest follow the base.
 *
 * Steps 5, 7, 9, 11 are deliberately absent: they appear nowhere in the corpus.
 */
export const spacing = {
  /**
   * [E] 2pt half-step. NOT on the 4pt base and not present in the corpus.
   *
   * It exists only because tight text pairs - a dock glyph above its label, a
   * plan title above its price - read as separated paragraphs at 4pt. It is a
   * token rather than a bare `gap: 2` at call sites so that it is greppable and
   * carries this marker; two unmarked 2s had already appeared before it existed.
   * Prefer xs; reach for this only when 4 visibly breaks a pair apart.
   */
  half: 2,
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
