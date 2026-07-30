/**
 * Design tokens for the cinematic visual direction.
 *
 * The palette is deliberately fixed to a dark "Ethereal Glass" world rather than
 * tracking the system light/dark setting: the analysis surfaces render photography
 * and confidence meters, both of which depend on a stable dark backdrop for contrast.
 */

/** Surface colours, darkest to lightest. */
export const surface = {
  /** Page backdrop. Near-OLED black so the gradient orbs read as light sources. */
  base: '#050505',
  /** Outer shell of a bezelled container. */
  shell: 'rgba(255, 255, 255, 0.04)',
  /** Inner core of a bezelled container. */
  core: '#0C0C0E',
  /** Raised inner core, for rows that sit on top of a core. */
  raised: '#141417',
} as const;

/** Hairline borders. Never a solid grey 1px line. */
export const line = {
  shell: 'rgba(255, 255, 255, 0.08)',
  core: 'rgba(255, 255, 255, 0.06)',
  strong: 'rgba(255, 255, 255, 0.14)',
} as const;

export const text = {
  primary: '#F4F4F5',
  secondary: 'rgba(244, 244, 245, 0.62)',
  tertiary: 'rgba(244, 244, 245, 0.38)',
  onAccent: '#050505',
} as const;

/** Spot colours. Used for the ambient orbs and for semantic meaning only. */
export const accent = {
  violet: '#7C5CFF',
  emerald: '#34D399',
  amber: '#FBBF24',
  rose: '#FB7185',
} as const;

/**
 * Confidence is the one place colour carries meaning, so the thresholds are
 * named rather than inlined at each call site.
 */
export function confidenceColor(percent: number): string {
  if (percent >= 75) return accent.emerald;
  if (percent >= 50) return accent.amber;
  return accent.rose;
}

/**
 * Concentric radii. An inner radius must be the outer radius minus the shell
 * padding, otherwise the two curves are not parallel and the nesting reads as
 * a mistake rather than as machined hardware.
 */
export const radius = {
  shell: 32,
  shellPadding: 6,
  get core() {
    return this.shell - this.shellPadding;
  },
  row: 16,
  pill: 999,
} as const;

/** Macro-whitespace scale. Sections breathe heavily. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 48,
} as const;

export const type = {
  display: { fontSize: 40, lineHeight: 42, letterSpacing: -1.2, fontWeight: '700' },
  title: { fontSize: 26, lineHeight: 30, letterSpacing: -0.6, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 23, letterSpacing: -0.3, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: -0.1, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' },
  eyebrow: { fontSize: 10, lineHeight: 12, letterSpacing: 2, fontWeight: '600' },
  metric: { fontSize: 30, lineHeight: 34, letterSpacing: -1, fontWeight: '700' },
} as const;

/**
 * Motion. Durations stay under 300ms for anything the user triggers directly;
 * only ambient and first-run motion runs longer.
 */
export const motion = {
  press: 120,
  enter: 260,
  reveal: 520,
  stagger: 60,
  /** Strong ease-out. The built-in curves are too weak to read as intentional. */
  easeOut: [0.23, 1, 0.32, 1] as const,
  /** iOS drawer curve, for anything that translates a long distance. */
  easeDrawer: [0.32, 0.72, 0, 1] as const,
} as const;
