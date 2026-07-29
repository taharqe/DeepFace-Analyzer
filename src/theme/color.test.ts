// @ts-nocheck — this file is executed by `node --test`, never compiled by tsc.
// The repo ships no @types/node (so `node:test`, `node:assert/strict` and
// `node:module` are unresolvable) and tsconfig leaves allowImportingTsExtensions
// off (so the required `./color.ts` specifier is an error). Without this pragma
// `npm run check` fails on the test file alone. The suppression is scoped to
// this file; tsconfig and package.json are untouched.

/**
 * Unit tests for src/theme/color.ts + src/theme/palette.json.
 *
 * Run: node --test src/theme/color.test.ts
 * (Node 22 strips the TypeScript types natively; no build step, no test framework.)
 *
 * ---------------------------------------------------------------------------
 * WHY color.ts IS LOADED VIA A DYNAMIC import()
 *
 * color.ts does `import raw from './palette.json'` with no import attribute.
 * Metro/Expo resolve that fine, but Node's ESM loader rejects it:
 *
 *     ERR_IMPORT_ATTRIBUTE_MISSING: Module ".../palette.json" needs an import
 *     attribute of "type: json"
 *
 * A static `import ... from './color.ts'` here would therefore fail during
 * linking, before any test body runs — and linking resolves the whole graph
 * before evaluating anything, so no amount of import ordering fixes it. The
 * synchronous resolve hook below supplies the missing attribute, and color.ts
 * is then pulled in with `await import('./color.ts')` — still the real source
 * module, still a relative specifier with the explicit .ts extension.
 *
 * This is a Node-loader gap, not a colour bug, so nothing in the source is
 * changed to accommodate it. See the notes returned with this file.
 * ---------------------------------------------------------------------------
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// palette.json can be imported statically because we can spell the attribute.
import paletteRaw from './palette.json' with { type: 'json' };

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    if (resolved.url.endsWith('.json')) {
      resolved.importAttributes = { ...resolved.importAttributes, type: 'json' };
    }
    return resolved;
  },
});

const {
  mixHex,
  palette,
  onFill,
  text,
  onVoid,
  disabled,
  DISABLED_FILL_ALPHA,
  voidGradient,
  successGradient,
} = await import('./color.ts');

// ---------------------------------------------------------------------------
// Independent WCAG 2.1 oracle.
//
// Deliberately reimplemented here rather than imported: color.ts ships no
// contrast function, and a test that borrowed the shipped one would only ever
// compare an implementation against itself. Every ratio below is COMPUTED from
// the hex values at run time — the only numbers hardcoded in a contrast
// assertion are the WCAG thresholds themselves and the spec's own audit table.
// ---------------------------------------------------------------------------

/** WCAG 2.1 SC 1.4.3 — normal-size body text. Spec §06 marks 4.5+ as "AA". */
const AA = 4.5;
/** WCAG 2.1 SC 1.4.6. Spec §06 marks 7+ as "AAA". */
const AAA = 7;

const channel = (hex: string, i: number) =>
  parseInt(hex.replace('#', '').slice(i * 2, i * 2 + 2), 16);

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) =>
  0.2126 * toLinear(channel(hex, 0)) +
  0.7152 * toLinear(channel(hex, 1)) +
  0.0722 * toLinear(channel(hex, 2));

const contrast = (fg: string, bg: string) => {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const HEX6 = /^#[0-9A-F]{6}$/;

/** palette.json carries a "$comment" documentation key alongside the colours. */
const paletteColourEntries = Object.entries(paletteRaw).filter(
  ([key]) => !key.startsWith('$'),
);

// ===========================================================================
// mixHex
// ===========================================================================

describe('mixHex', () => {
  test('alpha 0 yields the background untouched', () => {
    // Nothing of the foreground survives at zero opacity.
    assert.equal(mixHex('#5363FF', '#F6F5F3', 0), '#F6F5F3');
    assert.equal(mixHex('#FFFFFF', '#030B0E', 0), '#030B0E');
    // Every channel of the foreground is irrelevant, not just some of them.
    assert.equal(mixHex('#000000', '#00B1D3', 0), mixHex('#FFFFFF', '#00B1D3', 0));
  });

  test('alpha 1 yields the foreground untouched', () => {
    assert.equal(mixHex('#5363FF', '#F6F5F3', 1), '#5363FF');
    assert.equal(mixHex('#0B0B0A', '#F8D94B', 1), '#0B0B0A');
    assert.equal(mixHex('#B16BFF', '#000000', 1), mixHex('#B16BFF', '#FFFFFF', 1));
  });

  test('alpha 0.4 composites each channel independently, rounding to nearest', () => {
    // Indigo #5363FF over canvas #F6F5F3 at 0.4 — the shipped disabled fill.
    //   R: 0x53*0.4 + 0xF6*0.6 =  33.2 + 147.6 = 180.8 -> 181 = 0xB5
    //   G: 0x63*0.4 + 0xF5*0.6 =  39.6 + 147.0 = 186.6 -> 187 = 0xBB
    //   B: 0xFF*0.4 + 0xF3*0.6 = 102.0 + 145.8 = 247.8 -> 248 = 0xF8
    assert.equal(mixHex('#5363FF', '#F6F5F3', 0.4), '#B5BBF8');

    // A second, arithmetically trivial case so the above is not a lucky fit:
    // 0x00*0.4 + 0xFF*0.6 = 153 = 0x99, and 0xFF*0.4 + 0x00*0.6 = 102 = 0x66.
    assert.equal(mixHex('#00FF00', '#FF00FF', 0.4), '#996699');
  });

  test('the mix is linear in alpha and lands on the true midpoint at 0.5', () => {
    // 0 * 0.5 + 255 * 0.5 = 127.5, rounded half-up to 128 = 0x80.
    assert.equal(mixHex('#000000', '#FFFFFF', 0.5), '#808080');
    // Swapping the operands and complementing alpha describes the same blend.
    assert.equal(
      mixHex('#5363FF', '#F6F5F3', 0.4),
      mixHex('#F6F5F3', '#5363FF', 0.6),
    );
  });

  test('always returns an opaque 6-digit uppercase hex, whatever the input case', () => {
    for (const alpha of [0, 0.16, 0.4, 0.5, 1]) {
      const out = mixHex('#5363ff', '#f6f5f3', alpha);
      assert.match(out, HEX6, `mixHex(..., ${alpha}) returned ${out}`);
    }
    // Lowercase in, canonical uppercase out — so results are directly
    // comparable against the uppercase palette tokens.
    assert.equal(mixHex('#5363ff', '#f6f5f3', 0.4), mixHex('#5363FF', '#F6F5F3', 0.4));
    assert.equal(mixHex('#aabbcc', '#ddeeff', 1), '#AABBCC');
  });
});

// ===========================================================================
// palette.json
// ===========================================================================

describe('palette.json', () => {
  test('every colour value is a 6-digit uppercase hex', () => {
    assert.ok(paletteColourEntries.length > 0, 'palette.json exposed no colours');
    for (const [token, value] of paletteColourEntries) {
      assert.equal(typeof value, 'string', `${token} is not a string`);
      // No 3-digit shorthand, no 8-digit alpha hex, no rgba(): the palette is
      // the measured, opaque set. scripts/verify-contrast.mjs assumes the same.
      assert.match(value as string, HEX6, `${token} = ${String(value)}`);
    }
  });

  test('carries exactly the fourteen colours the spec measures, at the spec values', () => {
    // Spec §01 — Colour. "Colours measured: 14" (spec header table).
    assert.deepEqual(paletteColourEntries.map(([k]) => k), [
      'canvas',
      'surface',
      'assistant',
      'actionPrimary',
      'actionSelection',
      'scoreHigh',
      'scoreMid',
      'accentCommerce',
      'fgPrimary',
      'fgSecondary',
      'voidStart',
      'voidEnd',
      'successStart',
      'successEnd',
    ]);

    assert.deepEqual(Object.fromEntries(paletteColourEntries), {
      canvas: '#F6F5F3', //          spec §01  M  bg / canvas
      surface: '#FFFFFF', //         spec §01  M  bg / surface
      assistant: '#F9F4F8', //       spec §01  M  bg / assistant
      actionPrimary: '#5363FF', //   spec §01  M  action / primary
      actionSelection: '#FF88BB', // spec §01  M  action / selection
      scoreHigh: '#B16BFF', //       spec §01  M  score / high
      scoreMid: '#40BB7C', //        spec §01  M  score / mid
      accentCommerce: '#F8D94B', //  spec §01  M  accent / commerce
      fgPrimary: '#0B0B0A', //       spec §01  M  fg / primary
      // spec §01 [D] — corrected from the measured #838383, which fails AA.
      fgSecondary: '#6B6864',
      voidStart: '#030B0E', //       spec §01  M  void #030B0E -> #0B1C2C
      voidEnd: '#0B1C2C',
      successStart: '#019A88', //    spec §01  M  success flood #019A88 -> #00B1D3
      successEnd: '#00B1D3',
    });
  });

  test('color.ts re-exports the JSON values without transforming them', () => {
    // The whole point of palette.json is that color.ts and
    // scripts/verify-contrast.mjs read one set of values. If the module ever
    // massaged a token on the way out, the guard would be checking a colour
    // the app does not render.
    for (const [token, value] of Object.entries(palette)) {
      assert.equal(value, (paletteRaw as Record<string, string>)[token], token);
    }
    assert.deepEqual([...voidGradient], [paletteRaw.voidStart, paletteRaw.voidEnd]);
    assert.deepEqual(
      [...successGradient],
      [paletteRaw.successStart, paletteRaw.successEnd],
    );
  });

  test('the estimated track colour stays out of the measured set', () => {
    // color.ts marks onVoid.track [E] and keeps it out of palette.json on
    // purpose: palette.json is the measured corpus, and a translucent proposal
    // is not a member of it.
    assert.equal(onVoid.track, 'rgba(255, 255, 255, 0.16)');
    assert.ok(
      !Object.values(paletteRaw).includes(onVoid.track),
      'an estimated rgba() value leaked into palette.json',
    );
  });
});

// ===========================================================================
// onFill — every foreground/fill pairing the system ships
// ===========================================================================

/**
 * The fill each onFill key sits on. Gradient fills are checked at BOTH stops,
 * because a ramp only passes if its worst end passes.
 */
const FILLS: Record<string, readonly string[]> = {
  actionPrimary: [palette.actionPrimary],
  actionSelection: [palette.actionSelection],
  scoreHigh: [palette.scoreHigh],
  scoreMid: [palette.scoreMid],
  accentCommerce: [palette.accentCommerce],
  void: voidGradient,
  success: successGradient,
};

describe('onFill pairings', () => {
  test('every onFill token names a fill that exists', () => {
    // Guards the real failure mode: someone adds a fill + its foreground and
    // the contrast loop below silently never covers it.
    assert.deepEqual(Object.keys(onFill).sort(), Object.keys(FILLS).sort());
  });

  for (const token of Object.keys(FILLS)) {
    test(`${token}: its foreground clears WCAG AA on the fill`, () => {
      const fg = (onFill as Record<string, string>)[token];
      assert.match(fg, HEX6, `onFill.${token} is not an opaque hex`);

      for (const bg of FILLS[token]) {
        const ratio = contrast(fg, bg);
        assert.ok(
          ratio >= AA,
          `onFill.${token}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1, below AA ${AA}:1`,
        );
      }
    });
  }

  test('ink, not white, carries every fill except indigo', () => {
    // Spec §05: "Badge text is ink, not white." Indigo is the single exception
    // — spec §06 audits #FFFFFF on #5363FF at 4.57:1 (AA).
    //
    // Asserted as a property, not a list: for each fill, whichever of ink and
    // white the system picked must be the one that actually passes.
    for (const [token, stops] of Object.entries(FILLS)) {
      const fg = (onFill as Record<string, string>)[token];
      const alternative = fg === palette.fgPrimary ? palette.surface : palette.fgPrimary;
      for (const bg of stops) {
        assert.ok(
          contrast(fg, bg) > contrast(alternative, bg),
          `onFill.${token} chose ${fg} over ${alternative} on ${bg}, but ${alternative} has more contrast`,
        );
      }
    }
    // And indigo really is the only fill light enough for white.
    const whiteCarriers = Object.keys(FILLS).filter(
      (t) => (onFill as Record<string, string>)[t] === palette.surface,
    );
    assert.deepEqual(whiteCarriers.sort(), ['actionPrimary', 'void']);
  });

  test('white on the success flood fails at both ends', () => {
    // Not in the spec's §06 audit table; color.ts computes it and says it
    // matters. Text over the resolution frame must be ink.
    for (const stop of successGradient) {
      const ratio = contrast(palette.surface, stop);
      assert.ok(
        ratio < AA,
        `white on success stop ${stop} = ${ratio.toFixed(2)}:1 — it now passes AA, so the ink rule needs rechecking rather than deleting`,
      );
    }
    // Ink does clear AA there, so there is a working alternative.
    for (const stop of successGradient) {
      assert.ok(contrast(palette.fgPrimary, stop) >= AA);
    }
  });

  test('accent text is safe on surface and unsafe on canvas', () => {
    // color.ts: onSurfaceAccent is "Safe on #FFFFFF only. Do not place on
    // canvas." Both halves are load-bearing — the second is why indigo is not
    // offered as a general text colour.
    assert.equal(text.onSurfaceAccent, palette.actionPrimary);
    assert.ok(contrast(text.onSurfaceAccent, palette.surface) >= AA);
    assert.ok(contrast(text.onSurfaceAccent, palette.canvas) < AA);
  });

  test('body text clears AA on both backgrounds', () => {
    for (const bg of [palette.surface, palette.canvas]) {
      assert.ok(contrast(text.primary, bg) >= AAA, `primary on ${bg}`);
      assert.ok(contrast(text.secondary, bg) >= AA, `secondary on ${bg}`);
    }
    // The regression this whole guard exists for: spec §06 audits the original
    // measured #838383 at 3.79:1 on #FFFFFF — FAILS.
    assert.notEqual(text.secondary, '#838383');
    assert.ok(contrast('#838383', palette.surface) < AA);
  });
});

// ===========================================================================
// Disabled fill
// ===========================================================================

describe('disabled fill', () => {
  test('is computed from the palette rather than pasted', () => {
    // A literal here would be a colour scripts/verify-contrast.mjs could not
    // trace, and it would stop matching if indigo or canvas ever moved.
    assert.equal(
      disabled.fill,
      mixHex(palette.actionPrimary, palette.canvas, DISABLED_FILL_ALPHA),
    );
    assert.match(disabled.fill, HEX6);
  });

  test('tints indigo at 40% over canvas', () => {
    // color.ts pins the alpha: "DISABLED_FILL_ALPHA = 0.4".
    assert.equal(DISABLED_FILL_ALPHA, 0.4);
    assert.equal(disabled.fill, '#B5BBF8');
    // A tint, not the commitment indigo: strictly lighter on every channel.
    for (const i of [0, 1, 2]) {
      assert.ok(
        channel(disabled.fill, i) > channel(palette.actionPrimary, i) ||
          channel(palette.actionPrimary, i) === 255,
        `channel ${i} did not lighten`,
      );
    }
  });

  test('clears WCAG AA with ink', () => {
    const ratio = contrast(palette.fgPrimary, disabled.fill);
    assert.ok(
      ratio >= AA,
      `ink on disabled fill = ${ratio.toFixed(2)}:1, below AA ${AA}:1`,
    );
  });

  test('FAILS WCAG AA with white — the property that forced the design', () => {
    // This direction is the reason a disabled CTA switches its label to ink
    // instead of keeping white text. Indigo's relative luminance is 0.1798 and
    // white text needs a ground at or below 0.1833, so ANY lightening of the
    // fill breaks white-on-indigo. If this ever starts passing, a colour moved
    // and the ink rule needs rechecking — not deleting.
    const ratio = contrast(palette.surface, disabled.fill);
    assert.ok(
      ratio < AA,
      `white on disabled fill = ${ratio.toFixed(2)}:1 — it now clears AA ${AA}:1, so the ink-on-tint rule is stale`,
    );
    // Ink is not merely the better choice, it is the only viable one.
    assert.ok(contrast(palette.fgPrimary, disabled.fill) > ratio);
  });
});

// ===========================================================================
// Oracle calibration against the spec's own audit
// ===========================================================================

describe('spec §06 contrast audit', () => {
  test('reproduces every audited pair to two decimal places', () => {
    // Spec §06 — Contrast audit. These are the only ratios hardcoded in this
    // file, and they exist to prove the oracle above matches the methodology
    // the spec used; every other contrast assertion computes its own number.
    // color.ts claims all ten reproduce "to within 0.003".
    const AUDIT: Array<[string, string, number, string]> = [
      [palette.fgPrimary, palette.canvas, 18.07, 'AAA'],
      [palette.fgPrimary, palette.surface, 19.69, 'AAA'],
      ['#838383', palette.surface, 3.79, 'FAILS'],
      [palette.fgSecondary, palette.surface, 5.54, 'AA'],
      [palette.surface, palette.actionPrimary, 4.57, 'AA'],
      [palette.surface, palette.actionSelection, 2.21, 'FAILS'],
      [palette.fgPrimary, palette.actionSelection, 8.9, 'AA'],
      [palette.surface, palette.scoreMid, 2.44, 'FAILS'],
      [palette.fgPrimary, palette.scoreMid, 8.08, 'AA'],
      [palette.fgPrimary, palette.accentCommerce, 14.08, 'AAA'],
    ];

    for (const [fg, bg, expected, verdict] of AUDIT) {
      const ratio = contrast(fg, bg);
      assert.ok(
        Math.abs(ratio - expected) < 0.005,
        `${fg} on ${bg}: computed ${ratio.toFixed(4)}:1, spec §06 says ${expected}:1`,
      );
      if (verdict === 'FAILS') assert.ok(ratio < AA, `${fg} on ${bg} should fail`);
      if (verdict === 'AA') assert.ok(ratio >= AA, `${fg} on ${bg}`);
      if (verdict === 'AAA') assert.ok(ratio >= AAA, `${fg} on ${bg}`);
    }
  });

  test('the two pairs spec §06 under-labels as "AA" in fact clear AAA', () => {
    // Documenting current behaviour, not endorsing the spec's table.
    // Spec §06 gives ink-on-pink 8.90:1 and ink-on-score/mid 8.08:1 the verdict
    // "AA", but both are above the 7:1 AAA floor the same table applies
    // elsewhere (18.07, 19.69, 14.08 are all marked AAA). color.ts's own
    // docblocks call these two AAA, and color.ts is right.
    // TODO: spec §06's verdict column is wrong for these two rows.
    for (const fill of [palette.actionSelection, palette.scoreMid]) {
      assert.ok(contrast(palette.fgPrimary, fill) >= AAA, fill);
    }
  });
});
