/// <reference types="node" />

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import type { Concern } from '../catalogue/types';

// @ts-ignore - the explicit .ts extension is required by Node's native type
// stripping (`node --test src/features/insights/trend.test.ts`). The repo's
// tsconfig does not set `allowImportingTsExtensions`, so tsc flags TS5097 here;
// the import itself resolves and is fully typed.
import { WEEKS, trendFor } from './trend.ts';

/**
 * Unit tests for the synthetic insights trend.
 *
 * `trend.ts` is explicitly marked [E] ESTIMATED: it is placeholder shape, not
 * measured product data. Its ONE hard contract is determinism - the module
 * comment states that "a random walk would make every render different, which
 * breaks screenshot diffing and makes a visual regression impossible to spot."
 * These tests protect that contract and the numeric envelope the `Trend`
 * interface documents ("Oldest first. 0-100.").
 *
 * Only node:test / node:assert are used - the repo ships no test runner.
 */

/**
 * Every member of the `Concern` union (src/features/catalogue/types.ts).
 * These are the six concerns spec "Screen flow" step 3 lists:
 *   "Fine lines - Visible pores - Uneven tone - Dryness - Redness - Dullness"
 */
const CONCERNS: readonly Concern[] = [
  'fine-lines',
  'pores',
  'uneven-tone',
  'dryness',
  'redness',
  'dullness',
];

describe('WEEKS', () => {
  /**
   * NOTE ON PROVENANCE: the source comments WEEKS as "the trend length the
   * stat-tile spec calls for", but docs/MEASUREMENT-SPEC.md contains no
   * stat-tile section and no mention of trends or a 12-week window at all
   * (the closest copy is the paywall bullet "Track results weekly", spec
   * "Screen flow" step 6). The value is correctly marked [E] ESTIMATED, so it
   * is not an unmarked invention - but it is NOT spec-pinned. This test locks
   * the current constant so a change is deliberate, not so a spec is honoured.
   */
  test('is 12 weekly points', () => {
    assert.equal(WEEKS, 12);
  });

  test('is a positive integer, so the ease curve has a defined denominator', () => {
    // `trendFor` divides by WEEKS - 1; anything below 2 would emit NaN.
    assert.ok(Number.isInteger(WEEKS));
    assert.ok(WEEKS >= 2);
  });
});

describe('trendFor - determinism', () => {
  /**
   * The headline invariant. Screenshot diffing is only meaningful if a concern
   * draws the same line on every render.
   */
  test('returns an identical series on repeated calls for the same concern', () => {
    for (const id of CONCERNS) {
      const first = trendFor(id);
      for (let i = 0; i < 25; i++) {
        assert.deepEqual(trendFor(id), first, `${id} drifted on call ${i + 2}`);
      }
    }
  });

  test('is not disturbed by calls for other concerns in between', () => {
    // Guards against any accumulator/closure state being introduced later.
    const baseline = new Map(CONCERNS.map((id) => [id, trendFor(id)]));
    for (let round = 0; round < 5; round++) {
      for (const id of [...CONCERNS].reverse()) {
        assert.deepEqual(trendFor(id), baseline.get(id), `${id} drifted when interleaved`);
      }
    }
  });

  test('never returns the same array instance twice, so callers cannot corrupt it', () => {
    const a = trendFor('pores');
    const b = trendFor('pores');
    assert.notEqual(a.values, b.values, 'values array is shared between calls');

    a.values[0] = 999;
    assert.notEqual(trendFor('pores').values[0], 999, 'mutating a result leaked into later calls');
  });

  /**
   * Cross-RUN determinism, which in-process repetition cannot prove. Screenshot
   * baselines are captured in a different process from the diff run, so the
   * numbers have to survive a fresh module load. This golden pins them.
   *
   * If you deliberately retune `start`/`gain`/the ease curve, regenerate this
   * block AND regenerate the insights screenshot baselines in the same commit -
   * that pairing is the whole point of the test.
   */
  test('produces the same series across processes (screenshot-diff golden)', () => {
    assert.deepEqual(
      Object.fromEntries(CONCERNS.map((id) => [id, trendFor(id).values])),
      {
        'fine-lines': [50, 53, 57, 58, 62, 63, 66, 66, 68, 68, 69, 68],
        pores: [54, 56, 61, 65, 67, 69, 72, 72, 75, 75, 76, 77],
        'uneven-tone': [35, 38, 40, 44, 47, 49, 49, 51, 51, 51, 52, 53],
        dryness: [53, 56, 59, 61, 64, 66, 67, 67, 68, 68, 70, 69],
        redness: [50, 52, 56, 58, 60, 61, 63, 62, 64, 64, 65, 66],
        dullness: [51, 53, 56, 60, 61, 65, 65, 68, 70, 69, 69, 71],
      },
    );
  });
});

describe('trendFor - series length', () => {
  test('emits exactly WEEKS points for every concern', () => {
    for (const id of CONCERNS) {
      assert.equal(trendFor(id).values.length, WEEKS, `${id} has the wrong point count`);
    }
  });

  test('emits exactly WEEKS points for arbitrary ids too', () => {
    // The chart allocates WEEKS slots; a short series would leave a gap.
    for (const id of ['', 'a', 'not-a-real-concern', 'x'.repeat(500)]) {
      assert.equal(trendFor(id as Concern).values.length, WEEKS, `"${id}" has the wrong count`);
    }
  });
});

describe('trendFor - value envelope', () => {
  /** `Trend.values` is documented as "Oldest first. 0-100." */
  test('keeps every value within 0-100 inclusive for every concern', () => {
    for (const id of CONCERNS) {
      for (const [i, v] of trendFor(id).values.entries()) {
        assert.ok(v >= 0 && v <= 100, `${id}[${i}] = ${v} is outside 0-100`);
      }
    }
  });

  test('keeps every value within 0-100 across a broad sweep of ids', () => {
    // The hash feeds `start` and `gain` through modulo, so the envelope should
    // hold for any string, not just the six shipped concerns.
    for (let n = 0; n < 3000; n++) {
      const id = `sweep-${n.toString(36)}-${(n * 7919).toString(16)}` as Concern;
      for (const [i, v] of trendFor(id).values.entries()) {
        assert.ok(v >= 0 && v <= 100, `${id}[${i}] = ${v} is outside 0-100`);
      }
    }
  });

  test('emits only finite integers - the chart plots whole score points', () => {
    for (const id of CONCERNS) {
      for (const [i, v] of trendFor(id).values.entries()) {
        assert.ok(Number.isInteger(v), `${id}[${i}] = ${v} is not an integer`);
      }
    }
  });
});

describe('trendFor - delta', () => {
  /** `Trend.delta` is documented as "Change from first to last point". */
  test('equals last minus first for every concern', () => {
    for (const id of CONCERNS) {
      const { values, delta } = trendFor(id);
      assert.equal(delta, values[values.length - 1] - values[0], `${id} delta disagrees`);
    }
  });

  test('equals last minus first for arbitrary ids too', () => {
    for (let n = 0; n < 1000; n++) {
      const { values, delta } = trendFor(`delta-${n.toString(36)}` as Concern);
      assert.equal(delta, values[values.length - 1] - values[0]);
    }
  });

  test('is positive for every concern - the placeholder always reads as improvement', () => {
    // `gain` is 12-28 and the wobble is bounded at +/-1.2, so the window can
    // never net out flat or negative.
    for (const id of CONCERNS) {
      assert.ok(trendFor(id).delta > 0, `${id} delta was not positive`);
    }
  });
});

describe('trendFor - distinctness', () => {
  test('every concern draws a different line', () => {
    const seen = new Map<string, Concern>();
    for (const id of CONCERNS) {
      const key = JSON.stringify(trendFor(id).values);
      const clash = seen.get(key);
      assert.equal(clash, undefined, `${id} draws the same line as ${clash}`);
      seen.set(key, id);
    }
    assert.equal(seen.size, CONCERNS.length);
  });

  test('concerns differ in starting point, not only in shape', () => {
    // A chart legend is unreadable if every line starts at the same height.
    const starts = new Set(CONCERNS.map((id) => trendFor(id).values[0]));
    assert.ok(starts.size > 1, 'all concerns start at the same value');
  });
});

describe('trendFor - curve shape', () => {
  /**
   * The source describes an ease-out: "visible early movement, tapering - how a
   * routine actually reads." Observable consequence: more of the total gain
   * lands in the first half of the window than the second.
   *
   * Scoped to the six shipped concerns on purpose. It is NOT a universal
   * property - a sweep of arbitrary ids finds roughly 0.1% where the bounded
   * wobble flattens the difference - so asserting it for all strings would be
   * a flaky test of something the product never renders.
   */
  test('front-loads the gain for every concern', () => {
    const mid = Math.floor(WEEKS / 2) - 1; // index 5 of 0..11
    for (const id of CONCERNS) {
      const v = trendFor(id).values;
      const front = v[mid] - v[0];
      const back = v[v.length - 1] - v[mid];
      assert.ok(front > back, `${id}: front half gained ${front}, back half ${back}`);
    }
  });

  // TODO(trend): the series is NOT monotonically non-decreasing - the wobble can
  // pull the final point below its predecessor. 'fine-lines' peaks at 69 in week
  // 11 and renders 68 in week 12, so the last plotted point is not the maximum
  // even though delta is +18. Harmless for placeholder data, but if a future
  // stat tile labels the endpoint "best yet" it will be wrong. Documenting
  // current behaviour rather than changing the source.
  test('may dip at the final point despite a positive delta (current behaviour)', () => {
    const v = trendFor('fine-lines').values;
    assert.ok(v[WEEKS - 1] < v[WEEKS - 2], 'fine-lines no longer dips at the end');
    assert.ok(trendFor('fine-lines').delta > 0);
    assert.ok(Math.max(...v) > v[WEEKS - 1], 'the endpoint is not the series maximum');
  });
});
