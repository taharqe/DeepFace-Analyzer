/**
 * [E] Press feedback.
 *
 * Not observable in a still - the spec marks motion and haptics as estimated
 * throughout, and this is a proposal.
 *
 * It lives in its own module because the literal 0.92 had been pasted into four
 * components and carried the [E] marker in only two of them, so half the call
 * sites read as though the value were measured.
 */
export const PRESS_OPACITY = 0.92;

/** [E] Applied to a control that is present but not actionable. */
export const DISABLED_OPACITY = 0.4;
