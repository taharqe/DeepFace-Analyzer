import type { TextStyle } from 'react-native';

/**
 * Type scale. [D] - derived from measured cap heights across the capture set.
 *
 * Nine styles, no more. Every screen in the corpus is built from these.
 */

export type TypeVariant =
  | 'display.lg'
  | 'display.md'
  | 'title.lg'
  | 'title.md'
  | 'title.sm'
  | 'body.lg'
  | 'body.md'
  | 'label.md'
  | 'caption';

type Spec = Required<Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>>;

export const typography: Record<TypeVariant, Spec> = {
  /** "Let's commit" */
  'display.lg': { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  /** "Unlock Premium" */
  'display.md': { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  /** "How old are you?" */
  'title.lg': { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  /** "Results with routine" */
  'title.md': { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  /** "Soy Face Cleanser" */
  'title.sm': { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  /** "At different ages, your skin needs different care." */
  'body.lg': { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  /** "Under 25" - option row label */
  'body.md': { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  /** "99% fit" - badge */
  'label.md': { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  /** "Peach & Lily" */
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

/**
 * [E] Typeface is not recoverable from the captures - the extraction pass
 * measured cap heights and leading, not glyph identity. System font is a
 * placeholder until the real family is confirmed.
 */
export const fontFamily = undefined;
