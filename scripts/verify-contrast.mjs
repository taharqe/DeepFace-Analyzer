/**
 * Asserts every foreground/background pairing the design system ships.
 *
 * This exists because the contrast fixes are the easiest thing in the system
 * to undo by accident. "White text on the pink badge" looks right to almost
 * everyone until it is measured at 2.21:1. A regression here is invisible in
 * review and invisible in a screenshot.
 *
 * Run: node scripts/verify-contrast.mjs
 * Exits non-zero if any shipped pairing drops below its required ratio.
 */

const INK = '#0B0B0A';
const WHITE = '#FFFFFF';
const CANVAS = '#F6F5F3';

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};

const ratio = (fg, bg) => {
  const [a, b] = [luminance(fg), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/** Every pairing the components actually render, with its required minimum. */
const SHIPPED = [
  ['ink on canvas', INK, CANVAS, 4.5],
  ['ink on surface', INK, WHITE, 4.5],
  ['secondary on surface', '#6B6864', WHITE, 4.5],
  ['secondary on canvas', '#6B6864', CANVAS, 4.5],
  ['ink on assistant lilac', INK, '#F9F4F8', 4.5],

  // Badge tones - all ink, none white. See Badge.tsx.
  ['badge ink on selection pink', INK, '#FF88BB', 4.5],
  ['badge ink on score/high', INK, '#B16BFF', 4.5],
  ['badge ink on score/mid', INK, '#40BB7C', 4.5],
  ['badge ink on commerce', INK, '#F8D94B', 4.5],

  // Indigo is the only fill that carries white.
  ['white on indigo CTA', WHITE, '#5363FF', 4.5],

  // Void ramp, both ends.
  ['inverse on void start', WHITE, '#030B0E', 4.5],
  ['inverse on void end', WHITE, '#0B1C2C', 4.5],

  // Success flood carries ink, not white - the gap the spec's audit missed.
  ['ink on success start', INK, '#019A88', 4.5],
  ['ink on success end', INK, '#00B1D3', 4.5],
];

/** Pairings that must NEVER ship. Guards against a well-meaning "fix". */
const FORBIDDEN = [
  ['white on selection pink', WHITE, '#FF88BB'],
  ['white on score/high', WHITE, '#B16BFF'],
  ['white on score/mid', WHITE, '#40BB7C'],
  ['white on success start', WHITE, '#019A88'],
  ['white on success end', WHITE, '#00B1D3'],
  ['indigo text on canvas', '#5363FF', CANVAS],
  ['old secondary #838383 on surface', '#838383', WHITE],
];

let failed = 0;

console.log('SHIPPED PAIRINGS');
for (const [label, fg, bg, min] of SHIPPED) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (min ${min})  ${label}`,
  );
}

console.log('\nFORBIDDEN PAIRINGS (must stay below 4.5)');
for (const [label, fg, bg] of FORBIDDEN) {
  const r = ratio(fg, bg);
  // If one of these ever passes, a colour changed - the guard is stale and
  // the reasoning behind the ink rule needs rechecking, not silent deletion.
  const stillFails = r < 4.5;
  if (!stillFails) failed++;
  console.log(
    `  ${stillFails ? 'OK  ' : 'STALE'}  ${r.toFixed(2).padStart(6)}:1  ${label}`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} contrast assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll contrast assertions hold.');
