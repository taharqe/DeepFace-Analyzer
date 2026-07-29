/**
 * Asserts every foreground/background pairing the design system ships.
 *
 * This exists because the contrast fixes are the easiest thing in the system to
 * undo by accident. "White text on the pink badge" looks right to almost
 * everyone until it is measured at 2.21:1. A regression here is invisible in
 * review and invisible in a screenshot.
 *
 * It reads src/theme/palette.json - the SAME file src/theme/color.ts imports.
 * An earlier version of this script held its own copies of the hex values, which
 * meant it only ever compared its constants against each other: reverting
 * fgSecondary to the failing #838383 left the script printing "All contrast
 * assertions hold" while the app shipped 3.79:1 body text. A guard with its own
 * copy of the data guards nothing.
 *
 * Run: node scripts/verify-contrast.mjs
 * Exits non-zero if any shipped pairing drops below its required ratio, if a
 * forbidden pairing starts passing, or if a token named here has gone missing.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PALETTE_PATH = join(ROOT, 'src/theme/palette.json');
const COLOR_TS = join(ROOT, 'src/theme/color.ts');

const P = JSON.parse(readFileSync(PALETTE_PATH, 'utf8'));

/**
 * Mirrors mixHex() in color.ts. The disabled fill is COMPUTED from the palette
 * in both places rather than pasted, so it cannot drift.
 */
const mixHex = (fg, bg, alpha) => {
  const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
};

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

let failed = 0;

/** Guard against a token being renamed or dropped out from under the assertions. */
const REQUIRED = [
  'canvas', 'surface', 'assistant', 'actionPrimary', 'actionSelection',
  'scoreHigh', 'scoreMid', 'accentCommerce', 'fgPrimary', 'fgSecondary',
  'voidStart', 'voidEnd', 'successStart', 'successEnd',
];
const missing = REQUIRED.filter((k) => typeof P[k] !== 'string');
if (missing.length) {
  console.error(`palette.json is missing: ${missing.join(', ')}`);
  process.exit(1);
}
const malformed = REQUIRED.filter((k) => !/^#[0-9A-Fa-f]{6}$/.test(P[k]));
if (malformed.length) {
  console.error(`palette.json has malformed hex for: ${malformed.join(', ')}`);
  process.exit(1);
}

/**
 * color.ts must consume palette.json rather than reintroducing literals.
 * Without this check the two could silently diverge again.
 */
const colorSrc = readFileSync(COLOR_TS, 'utf8');
if (!/from\s+'\.\/palette\.json'/.test(colorSrc)) {
  console.error('src/theme/color.ts no longer imports palette.json - the guard is detached.');
  process.exit(1);
}
const strayHex = [...colorSrc.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0]);
// Hexes quoted inside comments are documentation (e.g. "corrected from #838383").
// Only a hex in actual code is a re-introduced literal.
const strayInCode = strayHex.filter((hex) => {
  const re = new RegExp(`['"\`]${hex}['"\`]`);
  return re.test(colorSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));
});
if (strayInCode.length) {
  console.error(`src/theme/color.ts reintroduced literal hex values: ${[...new Set(strayInCode)].join(', ')}`);
  console.error('Move them into palette.json so the guard can see them.');
  failed++;
}

const INK = P.fgPrimary;
const WHITE = P.surface;
const CANVAS = P.canvas;

/** Every pairing the components actually render, with its required minimum. */
const SHIPPED = [
  ['ink on canvas', INK, CANVAS, 4.5],
  ['ink on surface', INK, WHITE, 4.5],
  ['secondary on surface', P.fgSecondary, WHITE, 4.5],
  ['secondary on canvas', P.fgSecondary, CANVAS, 4.5],
  ['ink on assistant lilac', INK, P.assistant, 4.5],

  // Badge tones - all ink, none white. See Badge.tsx.
  ['badge ink on selection pink', INK, P.actionSelection, 4.5],
  ['badge ink on score/high', INK, P.scoreHigh, 4.5],
  ['badge ink on score/mid', INK, P.scoreMid, 4.5],
  ['badge ink on commerce', INK, P.accentCommerce, 4.5],

  // Indigo is the only fill that carries white.
  ['white on indigo CTA', WHITE, P.actionPrimary, 4.5],

  // Void ramp, both ends.
  ['inverse on void start', WHITE, P.voidStart, 4.5],
  ['inverse on void end', WHITE, P.voidEnd, 4.5],

  // Success flood carries ink, not white - the gap the spec's audit missed.
  ['ink on success start', INK, P.successStart, 4.5],
  ['ink on success end', INK, P.successEnd, 4.5],

  // Disabled CTA: tinted fill with an ink label, not a faded white one.
  // A whole-subtree opacity measured 1.94:1 on the rendered DOM.
  ['ink on disabled fill', INK, mixHex(P.actionPrimary, P.canvas, 0.4), 4.5],
];

/** Pairings that must NEVER ship. Guards against a well-meaning "fix". */
const FORBIDDEN = [
  ['white on selection pink', WHITE, P.actionSelection],
  ['white on score/high', WHITE, P.scoreHigh],
  ['white on score/mid', WHITE, P.scoreMid],
  ['white on success start', WHITE, P.successStart],
  ['white on success end', WHITE, P.successEnd],
  ['indigo text on canvas', P.actionPrimary, CANVAS],
  ['white on disabled fill', WHITE, mixHex(P.actionPrimary, P.canvas, 0.4)],
  // Not read from the palette on purpose: this is the value fgSecondary must
  // never revert to, so it is pinned here as a literal.
  ['reverted secondary #838383 on surface', '#838383', WHITE],
];

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
