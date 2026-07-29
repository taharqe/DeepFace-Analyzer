import raw from './palette.json';

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
 *
 * The hex values live in palette.json rather than here, because
 * scripts/verify-contrast.mjs reads that same file. A guard that keeps its own
 * copies of the values cannot detect a change to the originals - which is
 * exactly the bug an earlier version of that script had.
 */

export const palette = {
  /** [M] 100.0% purity, quiet band. */
  canvas: raw.canvas,
  /** [M] 2% step from canvas. No borders anywhere in the corpus. */
  surface: raw.surface,
  /** [M] Warm lilac. Speech bubble only. */
  assistant: raw.assistant,

  /**
   * [M] FLAT fill - core spread measured R6 G5 B1.
   * The gradient inferred in the first pass was glow contamination.
   */
  actionPrimary: raw.actionPrimary,
  /** [M] 4 samples, delta <= 4/255. */
  actionSelection: raw.actionSelection,

  /** [M] >=90% match. */
  scoreHigh: raw.scoreHigh,
  /** [M] 70-89% match. */
  scoreMid: raw.scoreMid,

  /** [M] Price pills only. */
  accentCommerce: raw.accentCommerce,

  /** [M] 18.07:1 on canvas, 19.69:1 on surface. */
  fgPrimary: raw.fgPrimary,
  /**
   * [D] Corrected from the measured #838383, which fails WCAG on both
   * backgrounds (3.79:1 on surface, 3.48:1 on canvas). This value holds
   * AA on both: 5.54:1 on surface, 5.09:1 on canvas.
   */
  fgSecondary: raw.fgSecondary,
} as const;

/** [M] Analysis sequence background. */
export const voidGradient = [raw.voidStart, raw.voidEnd] as const;

/** [M] Resolution frame background. */
export const successGradient = [raw.successStart, raw.successEnd] as const;

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
   * 5.61:1 / 7.72:1 across the success ramp - AA at both ends.
   *
   * Not audited in the spec, and it matters: white on the success flood
   * measures 3.51:1 at the teal end and 2.55:1 at the cyan end. Both fail.
   * Text over the resolution frame must be ink, not white.
   */
  success: palette.fgPrimary,
} as const;

/**
 * Colours that sit ON the void ramp.
 *
 * [E] Nothing in the corpus measures a progress track over the analysis
 *     sequence. 16% white is a proposal: the canvas token vanishes against the
 *     ramp, and a translucent white holds at both #030B0E and #0B1C2C. It is an
 *     invented value and is marked as one - it is deliberately NOT in
 *     palette.json, because that file is the measured set and this is not a
 *     member of it.
 */
export const onVoid = {
  track: 'rgba(255, 255, 255, 0.16)',
} as const;

/**
 * Text colours, by surface.
 *
 * indigo is listed only under `onSurfaceAccent`. As a text colour it measures
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

/**
 * Disabled fill treatment.
 *
 * [E] No capture shows a disabled control. This is a proposal, but a
 *     constrained one: indigo's relative luminance is 0.1798 and white text
 *     needs a ground at or below 0.1833, so indigo sits 2% from the cliff and
 *     ANY lightening breaks white-on-indigo. Reducing opacity across the whole
 *     control - the obvious approach - measured 1.94:1 on the rendered DOM.
 *
 *     So a disabled CTA tints the fill and switches the label to ink, which is
 *     the system's existing ink-on-fills rule: a lightened indigo is no longer
 *     the commitment indigo, it is a tint, and tints carry ink. 10.68:1.
 */
export const DISABLED_FILL_ALPHA = 0.4;

/** Composite `fg` over `bg` at `alpha`, returning an opaque hex. */
export function mixHex(fg: string, bg: string, alpha: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2]
    .map((i) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  return `#${out.toUpperCase()}`;
}

export const disabled = {
  /**
   * Indigo at 40% over canvas, COMPUTED rather than pasted. A literal here
   * would be a colour the guard cannot trace, and would silently stop matching
   * if actionPrimary or canvas ever changed.
   */
  fill: mixHex(palette.actionPrimary, palette.canvas, DISABLED_FILL_ALPHA),
} as const;

export type PaletteToken = keyof typeof palette;
export type OnFillToken = keyof typeof onFill;
export type TextToken = keyof typeof text;
