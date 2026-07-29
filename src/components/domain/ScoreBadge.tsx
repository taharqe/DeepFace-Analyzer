import { Badge } from '../primitives';
import { toneForScore } from '../../features/catalogue/match';

/**
 * "99% fit" / "76% fit".
 *
 * Wraps Badge so the band thresholds live in one place. A caller that reaches
 * for `<Badge tone="scoreHigh">` directly can drift out of sync with the
 * 90/70 bands; this cannot.
 */
export interface ScoreBadgeProps {
  /** 0-100. */
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <Badge label={`${Math.round(score)}% fit`} tone={toneForScore(score)} />
  );
}
