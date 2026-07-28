/**
 * AURA colour tokens.
 *
 * Provenance markers match the spec:
 *   [M] measured off the captures by script
 *   [D] derived from a measurement
 *   [E] estimated - not observable in a still
 *
 * Every ratio quoted below was recomputed from the hex values (WCAG 2.1
 * relative luminance), not copied from the spec. All ten of the spec's own
 * audited pairs reproduced to within 0.003.
 */

export const palette = {
  /** [M] 100.0% purity, quiet band. */
  canvas: '#F6F5F3',
  /** [M] 2% step from canvas. No borders anywhere in the corpus. */
  surface: '#FFFFFF',
  /** [M] Warm lilac. Speech bubble only. */
  assistant: '#F9F4F8',

  /**
   * [M] FLAT fill - core spread measured R6 G5 B1.
   * The gradient inferred in the first pass was glow contamination.
   */
  actionPrimary: '#5363FF',
  /** [M] 4 samples, delta <= 4/255. */
  actionSelection: '#FF88BB',

  /** [M] >=90% match. */
  scoreHigh: '#B16BFF',
  /** [M] 70-89% match. */
  scoreMid: '#40BB7C',

  /** [M] Price pills only. */
  accentCommerce: '#F8D94B',

  /** [M] 18.07:1 on canvas, 19.69:1 on surface. */
  fgPrimary: '#0B0B0A',
  /**
   * [D] Corrected from the measured #838383, which fails WCAG on both
   * backgrounds (3.79:1 on surface, 3.48:1 on canvas). This value holds
   * AA on both: 5.54:1 on surface, 5.09:1 on canvas.
   */
  fgSecondary: '#6B6864',
} as const;

/** [M] Analysis sequence background. */
export const voidGradient = ['#030B0E', '#0B1C2C'] as const;

/** [M] Resolution frame background. */
export const successGradient = ['#019A88', '#00B1D3'] as const;

/**
 * Foreground colours paired with each fill.
 *
 * The rule the corpus enforces: a fill keeps its measured brand value and the
 * text on top moves to ink. Darkening the fills instead does not work - the
 * spec found the obvious fix tops out at 3.82:1.
 *
 * Indigo is the only fill light enough text can stay white.
 */
export const onFill = {
  /** 4.57:1 - AA. The one fill that carries white. */
  actionPrimary: palette.surface,
  /** 8.90:1 - AAA. White would be 2.21:1 and fail outright. */
  actionSelection: palette.fgPrimary,
  /**
   * 6.02:1 - AA. Not audited in the spec; computed here.
   * White on this purple is 3.27:1 and fails.
   */
  scoreHigh: palette.fgPrimary,
  /** 8.08:1 - AAA. White would be 2.44:1 and fail. */
  scoreMid: palette.fgPrimary,
  /** 14.08:1 - AAA. */
  accentCommerce: palette.fgPrimary,
  /** 19.85:1 / 17.26:1 across the void ramp. */
  void: palette.surface,
  /**
   * 7.72:1 against the cyan end - AAA.
   *
   * Not audited in the spec, and it matters: white on the success flood
   * measures 3.51:1 at the teal end and 2.55:1 at the cyan end. Both fail.
   * Text over the resolution frame must be ink, not white.
   */
  success: palette.fgPrimary,
} as const;

/**
 * Text colours, by surface.
 *
 * indigo is listed only under `onSurface`. As a text colour it measures
 * 4.57:1 on white but 4.19:1 on canvas, so it passes on one and fails on the
 * other. Not audited in the spec; computed here.
 */
export const text = {
  primary: palette.fgPrimary,
  secondary: palette.fgSecondary,
  /** Safe on #FFFFFF only. Do not place on canvas. */
  onSurfaceAccent: palette.actionPrimary,
  inverse: palette.surface,
} as const;

export type PaletteToken = keyof typeof palette;
export type OnFillToken = keyof typeof onFill;
export type TextToken = keyof typeof text;
