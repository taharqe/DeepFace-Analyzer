/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { describe } from 'node:test';

// @ts-ignore - the explicit .ts extension is required by Node's native type
// stripping (`node --test src/features/catalogue/match.test.ts`). The repo's
// tsconfig does not set `allowImportingTsExtensions`, so tsc flags TS5097 here;
// the import itself resolves and is fully typed.
import { SCORE_BANDS, bandForScore, isMeasuredBand } from './match.ts';
import type { ScoreBand } from './match.ts';

/**
 * Unit tests for match-score banding.
 *
 * Ground truth: docs/MEASUREMENT-SPEC.md, "01 - Colour":
 *     M | score / high | `#B16BFF` | >=90% match
 *     M | score / mid  | `#40BB7C` | 70-89% match
 *
 * Only node:test / node:assert are used - the repo ships no test runner.
 */

/* -------------------------------------------------------------------------- */
/* Design-system fixtures                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The measured palette, read from the same file src/theme/color.ts imports and
 * scripts/verify-contrast.mjs reads. Loaded from disk rather than imported so
 * this test never pulls the react-native-dependent theme module into Node.
 */
const PALETTE: Record<string, string> = JSON.parse(
  readFileSync(new URL('../../theme/palette.json', import.meta.url), 'utf8'),
) as Record<string, string>;

/**
 * Every band the logic can return, mapped to the palette token that paints it.
 *
 * The band -> tone mapping itself lives in components/domain/ScoreBadge.tsx;
 * features/ must not import the UI layer. What this table guards is the
 * property that matters here: a band this module can RETURN must correspond to
 * a colour the design system actually measured. `unbanded` maps to the surface
 * fill (per the Badge union doc), which is a real token, not an invented one.
 *
 * Typed as Record<ScoreBand, ...> so adding a band breaks the build here.
 */
const PALETTE_TOKEN_FOR_BAND: Record<ScoreBand, string> = {
  high: 'scoreHigh',
  mid: 'scoreMid',
  unbanded: 'surface',
};

/** The largest double strictly below `n` - used to probe boundaries exactly. */
function justBelow(n: number): number {
  const buf = new Float64Array(1);
  buf[0] = n;
  const bits = new BigInt64Array(buf.buffer);
  bits[0] = bits[0]! - 1n;
  return buf[0]!;
}

/** The smallest double strictly above `n`. */
function justAbove(n: number): number {
  const buf = new Float64Array(1);
  buf[0] = n;
  const bits = new BigInt64Array(buf.buffer);
  bits[0] = bits[0]! + 1n;
  return buf[0]!;
}

/** 0 to 100 in quarter-point steps, plus every boundary neighbour. */
const SWEEP: readonly number[] = (() => {
  const xs: number[] = [];
  for (let i = 0; i <= 400; i += 1) xs.push(i / 4);
  for (const b of [SCORE_BANDS.mid, SCORE_BANDS.high]) {
    xs.push(justBelow(b), b, justAbove(b), b - 0.5, b + 0.5, b - 1, b + 1);
  }
  xs.push(-1, 0, 100, 100.5, 1000);
  return xs;
})();

/* -------------------------------------------------------------------------- */
/* Band thresholds                                                             */
/* -------------------------------------------------------------------------- */

describe('SCORE_BANDS', () => {
  test('pins the two thresholds the spec states', () => {
    // MEASUREMENT-SPEC.md 01 - Colour: score/high ">=90% match", score/mid "70-89% match".
    assert.equal(SCORE_BANDS.high, 90);
    assert.equal(SCORE_BANDS.mid, 70);
  });
});

/* -------------------------------------------------------------------------- */
/* Boundaries                                                                  */
/* -------------------------------------------------------------------------- */

describe('bandForScore - band boundaries', () => {
  test('90 is high, 89 is mid - the boundary is inclusive at 90', () => {
    // Spec 01: high is ">=90%", so 90 itself belongs to high, and the mid band
    // is stated as "70-89%", so 89 must not leak upward.
    assert.equal(bandForScore(90), 'high');
    assert.equal(bandForScore(89), 'mid');
  });

  test('the largest value below 90 is still mid', () => {
    assert.equal(bandForScore(justBelow(90)), 'mid');
    assert.equal(bandForScore(89.999999999999), 'mid');
  });

  test('the smallest value above 90 is high', () => {
    assert.equal(bandForScore(justAbove(90)), 'high');
    assert.equal(bandForScore(90.000000000001), 'high');
  });

  test('70 is mid, 69 is neutral - the boundary is inclusive at 70', () => {
    // Spec 01: mid is "70-89%". 69 sits below every measured band.
    assert.equal(bandForScore(70), 'mid');
    assert.equal(bandForScore(69), 'unbanded');
  });

  test('the largest value below 70 is unbanded', () => {
    assert.equal(bandForScore(justBelow(70)), 'unbanded');
    assert.equal(bandForScore(69.999999999999), 'unbanded');
  });

  test('the smallest value above 70 is mid', () => {
    assert.equal(bandForScore(justAbove(70)), 'mid');
  });
});

/* -------------------------------------------------------------------------- */
/* Range ends and non-integers                                                 */
/* -------------------------------------------------------------------------- */

describe('bandForScore - range ends and fractional scores', () => {
  test('0 is neutral', () => {
    assert.equal(bandForScore(0), 'unbanded');
  });

  test('100 is high', () => {
    assert.equal(bandForScore(100), 'high');
  });

  test('fractional scores band by value, not by rounding', () => {
    // A fractional score is placed by where it actually falls. 89.5 is inside
    // the 70-89 mid band even though it would *print* as "90% fit".
    assert.equal(bandForScore(89.5), 'mid');
    assert.equal(bandForScore(76.4), 'mid');
    assert.equal(bandForScore(93.7), 'high');
    assert.equal(bandForScore(12.5), 'unbanded');
    assert.equal(bandForScore(69.5), 'unbanded');
  });

  test('out-of-range scores still resolve to a paintable tone', () => {
    // -1 is the LEGACY_SCORE_SENTINEL from catalogue/products.ts, which relies
    // on this landing outside every measured band.
    assert.equal(bandForScore(-1), 'unbanded');
    assert.equal(bandForScore(-1000), 'unbanded');
    assert.equal(bandForScore(1000), 'high');
  });

  test('NaN is not treated as a measured band', () => {
    assert.equal(bandForScore(Number.NaN), 'unbanded');
    assert.equal(isMeasuredBand(Number.NaN), false);
  });
});

/* -------------------------------------------------------------------------- */
/* Colour coverage                                                             */
/* -------------------------------------------------------------------------- */

describe('bandForScore - every returned band has a colour', () => {
  test('never returns a band outside the design system', () => {
    const returned = new Set(SWEEP.map(bandForScore));
    returned.add(bandForScore(Number.NaN));

    for (const tone of returned) {
      assert.ok(
        Object.hasOwn(PALETTE_TOKEN_FOR_BAND, tone),
        `bandForScore returned "${tone}", which the design system has no fill for`,
      );
      const token = PALETTE_TOKEN_FOR_BAND[tone]!;
      assert.match(
        PALETTE[token] ?? '',
        /^#[0-9A-F]{6}$/,
        `tone "${tone}" maps to palette token "${token}", which is not a measured colour`,
      );
    }
  });

  test('the sweep actually exercises all three bands', () => {
    // Guards the test above from passing vacuously.
    const returned = new Set(SWEEP.map(bandForScore));
    assert.deepEqual([...returned].sort(), ['high', 'mid', 'unbanded']);
  });

  test('the score fills are the exact measured hexes', () => {
    // MEASUREMENT-SPEC.md 01 - Colour: score/high #B16BFF, score/mid #40BB7C.
    assert.equal(PALETTE[PALETTE_TOKEN_FOR_BAND[bandForScore(95)]!], '#B16BFF');
    assert.equal(PALETTE[PALETTE_TOKEN_FOR_BAND[bandForScore(75)]!], '#40BB7C');
    // Nothing below 70% is measured, so the fallback is the plain surface fill
    // (bg/surface #FFFFFF) - deliberately not an invented warning colour.
    assert.equal(PALETTE[PALETTE_TOKEN_FOR_BAND[bandForScore(50)]!], '#FFFFFF');
  });
});

/* -------------------------------------------------------------------------- */
/* isMeasuredBand agreement                                                    */
/* -------------------------------------------------------------------------- */

describe('isMeasuredBand', () => {
  test('agrees with bandForScore at every boundary', () => {
    const boundaries = [
      justBelow(70),
      70,
      justAbove(70),
      justBelow(90),
      90,
      justAbove(90),
      69,
      69.5,
      70.5,
      89,
      89.5,
      90.5,
      0,
      100,
      -1,
    ];
    for (const score of boundaries) {
      assert.equal(
        isMeasuredBand(score),
        bandForScore(score) !== 'unbanded',
        `disagreement at ${score}`,
      );
    }
  });

  test('agrees with bandForScore across the whole sweep', () => {
    for (const score of SWEEP) {
      assert.equal(
        isMeasuredBand(score),
        bandForScore(score) !== 'unbanded',
        `disagreement at ${score}`,
      );
    }
  });

  test('is true from 70 upward and false below it', () => {
    assert.equal(isMeasuredBand(70), true);
    assert.equal(isMeasuredBand(justBelow(70)), false);
    assert.equal(isMeasuredBand(69), false);
    assert.equal(isMeasuredBand(90), true);
    assert.equal(isMeasuredBand(100), true);
    assert.equal(isMeasuredBand(0), false);
    // catalogue/products.ts LEGACY_SCORE_SENTINEL relies on this being false.
    assert.equal(isMeasuredBand(-1), false);
  });
});

/* -------------------------------------------------------------------------- */
/* Ordering invariant                                                          */
/* -------------------------------------------------------------------------- */

describe('banding invariants', () => {
  test('band never decreases as the score rises', () => {
    const rank: Record<ScoreBand, number> = { unbanded: 0, mid: 1, high: 2 };
    const ordered = [...SWEEP].sort((a, b) => a - b);
    let previous = -1;
    for (const score of ordered) {
      const current = rank[bandForScore(score)]!;
      assert.ok(
        current >= previous,
        `band went backwards at ${score}: ${bandForScore(score)}`,
      );
      previous = current;
    }
  });

  test('a score is measured exactly when it is at or above the mid threshold', () => {
    for (const score of SWEEP) {
      assert.equal(isMeasuredBand(score), score >= SCORE_BANDS.mid, `at ${score}`);
    }
  });
});
