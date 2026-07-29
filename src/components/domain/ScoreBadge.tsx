import { Badge, type BadgeTone } from '../primitives';
import { bandForScore, type ScoreBand } from '../../features/catalogue/match';

/**
 * "99% fit" / "76% fit".
 *
 * Owns the band -> tone mapping. features/catalogue/match.ts returns a domain
 * band and deliberately knows nothing about Badge: a pure-logic module that
 * imports a UI type cannot be tested or reused without the component layer.
 *
 * The score passed here must be COMPUTED for the current user by the routine
 * engine. It used to be a literal on each product - the same "99% fit" for
 * everyone - which is the defect this component's input contract now rules out.
 */
const TONE_FOR_BAND: Record<ScoreBand, BadgeTone> = {
  high: 'scoreHigh',
  mid: 'scoreMid',
  // No measured colour exists below 70. Neutral rather than an invented red,
  // which would imply a warning the product data does not support.
  unbanded: 'neutral',
};

export interface ScoreBadgeProps {
  /** 0-100, computed per user. */
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <Badge
      label={`${Math.round(score)}% fit`}
      tone={TONE_FOR_BAND[bandForScore(score)]}
    />
  );
}
