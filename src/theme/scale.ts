/**
 * Source-capture scale factor.
 *
 * [M] 50 captures at 728x1568 px. Pixel analysis resolved 1.85 px/pt, which puts
 *     the logical frame at 393x848 pt.
 *
 * The confirming evidence, per the spec: the inter-card gap measures 15px. At
 * 1.85 that is 8.1pt, landing on the 8pt token. At any other candidate device
 * scale it resolves to ~8.9pt, which nobody would ship as a token.
 */
export const PX_PER_PT = 1.85;

/** Convert a measured source pixel value to points. */
export const px = (n: number): number => n / PX_PER_PT;

/** Source capture dimensions, in px. */
export const SOURCE_FRAME = { width: 728, height: 1568 } as const;

/** Logical frame the captures represent, in pt. [D] */
export const LOGICAL_FRAME = {
  width: SOURCE_FRAME.width / PX_PER_PT,
  height: SOURCE_FRAME.height / PX_PER_PT,
} as const;
