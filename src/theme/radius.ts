import { px } from './scale';

/**
 * Radius ladder. [D] - arc-fitted against measured corner insets.
 *
 * Fitted values, with the component each was recovered from:
 *   12  search field      (13.2 measured)
 *   16  shortcut card     (17.0 measured)
 *   22  section / tile    (21.9 and 23.0 measured)
 *   capsule
 *
 * The 28 and 36 steps in the first draft were extrapolated from the ladder's
 * shape rather than fitted, and appear nowhere in the corpus. They are gone.
 */
export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  /**
   * True capsule. Always this constant, never a literal half-height.
   *
   * The arc fit on the option row gave r = 60px against a row height of 120px
   * - exactly h/2, at rmse 0.75. Predicted insets tracked the measurements to
   * within 0.8px across all four probe depths:
   *
   *   dy 10px -> measured 26.0, r=60 predicts 26.8
   *   dy 20px -> measured 15.0, r=60 predicts 15.3
   *   dy 30px -> measured  8.0, r=60 predicts  8.0
   *   dy 40px -> measured  3.0, r=60 predicts  3.4
   *
   * Because it is h/2 the shape is a capsule, so the token has to be a large
   * constant. Writing 60 here would break the moment a row changes height.
   */
  capsule: 9999,
} as const;

/**
 * [D] Option row height: 120px measured / 1.85 = 64.9pt, rounded to the 4pt
 * grid. This is the height the capsule fit was solved against.
 */
export const OPTION_ROW_HEIGHT = Math.round(px(120) / 4) * 4;

export type RadiusToken = keyof typeof radius;
