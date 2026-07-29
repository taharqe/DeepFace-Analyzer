import type { Concern } from '../catalogue/types';

/**
 * [E] Synthetic trend data.
 *
 * Nothing in the corpus shows this screen's charts, and there is no scan
 * history to plot until scanning is real. This is placeholder shape, not
 * measured product data - it exists so the layout can be built and reviewed.
 *
 * It is deterministic on purpose. A random walk would make every render
 * different, which breaks screenshot diffing and makes a visual regression
 * impossible to spot. The values come from a small integer hash of the concern
 * id, so a given concern always draws the same line.
 *
 * Replace `trendFor` with a real query when scan history exists; the component
 * contract (an array of numbers, oldest first) should not need to change.
 */

/** [E] 12 weekly points - the trend length the stat-tile spec calls for. */
export const WEEKS = 12;

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export interface Trend {
  /** Oldest first. 0-100. */
  values: number[];
  /** Change from first to last point, in points. */
  delta: number;
}

export function trendFor(id: Concern): Trend {
  const seed = hash(id);
  const start = 34 + (seed % 22); // 34-55
  const gain = 12 + (seed % 17); // 12-28 over the window

  const values = Array.from({ length: WEEKS }, (_, i) => {
    const progress = i / (WEEKS - 1);
    // Ease-out: visible early movement, tapering - how a routine actually reads.
    const eased = 1 - (1 - progress) ** 2;
    // Deterministic wobble so the line is not a clean curve.
    const wobble = (((seed >> (i % 8)) % 5) - 2) * 0.6;
    return Math.round(start + gain * eased + wobble);
  });

  return { values, delta: values[values.length - 1] - values[0] };
}
