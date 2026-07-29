import type { Concern } from '../catalogue/types';

/**
 * [M] Both question screens, read off the captures verbatim - including the
 *     en-dash ranges and the glyph set.
 */

export const AGE_BANDS = [
  'Under 25',
  '25 – 34',
  '35 – 44',
  '45 – 60',
  'Over 60',
] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export const CONCERNS: { id: Concern; glyph: string; label: string }[] = [
  { id: 'fine-lines', glyph: '◇', label: 'Fine lines' },
  { id: 'pores', glyph: '○', label: 'Visible pores' },
  { id: 'uneven-tone', glyph: '◐', label: 'Uneven tone' },
  { id: 'dryness', glyph: '△', label: 'Dryness' },
  { id: 'redness', glyph: '▽', label: 'Redness' },
  { id: 'dullness', glyph: '◈', label: 'Dullness' },
];

export const COPY = {
  welcome: {
    title: 'Skin that knows what it needs',
    body: 'A few questions, one scan, and a routine built only for you.',
    primary: 'Get started',
    secondary: 'I already have an account',
  },
  age: {
    title: 'How old are you?',
    body: 'Skin needs different care at different ages.',
  },
  concerns: {
    title: 'What matters most to you?',
    body: 'Pick everything that applies.',
    cta: 'Continue',
  },
  tailoring: {
    title: 'Tailoring your routine…',
    caption: 'products in the catalogue',
    cta: 'Show my routine',
  },
  reveal: {
    title: 'Results with routine',
    body: 'Built from your answers, adjusted every time you scan.',
    before: 'Today',
    after: 'With routine',
    /** [E] Stands in for whatever the panels actually depict. */
    placeholder: 'Preview',
    targeting: 'Targeting',
    cta: 'See my plan',
  },
  paywall: {
    title: 'Unlock your full routine',
    benefits: [
      { glyph: '✦', label: 'Routine built around you' },
      { glyph: '◹', label: 'Track results weekly' },
      { glyph: '⊙', label: 'Rescan any time' },
    ],
    disclosure: 'Charged today. Cancel any time in Settings.',
    cta: 'Continue',
  },
} as const;
