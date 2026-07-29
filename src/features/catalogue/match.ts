import type { BadgeTone } from '../../components/primitives';

/**
 * Match-score banding.
 *
 * [M] The spec measures exactly two score colours and states their bands:
 *       score/high  #B16BFF  >= 90%
 *       score/mid   #40BB7C  70-89%
 *
 * [E] Nothing below 70% appears anywhere in the 50 captures, so there is no
 *     measured "low" colour. Two readings are possible: either low-scoring
 *     products are filtered out before render, or a third colour exists that
 *     the capture set never hit. Inventing a red here would be the worst
 *     option - it would imply a warning the product data does not support.
 *
 *     This falls back to `neutral` (surface fill, ink text) and callers can
 *     decide whether to show the item at all. Revisit once a capture with a
 *     sub-70 score exists.
 */
export const SCORE_BANDS = { high: 90, mid: 70 } as const;

export function toneForScore(score: number): BadgeTone {
  if (score >= SCORE_BANDS.high) return 'scoreHigh';
  if (score >= SCORE_BANDS.mid) return 'scoreMid';
  return 'neutral';
}

/** True when the score falls into a band the design system has a colour for. */
export function isMeasuredBand(score: number): boolean {
  return score >= SCORE_BANDS.mid;
}
