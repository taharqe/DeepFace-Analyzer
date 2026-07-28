import { Platform, type ViewStyle } from 'react-native';

import { palette } from './color';

/**
 * Shadow, recovered rather than guessed.
 *
 * [M] Card edge falls off over 12px, peaking at delta 11/255 at +6px and
 *     reaching the noise floor by +12px. That solves to:
 *
 *       0 1.5px 7px rgba(11, 11, 10, 0.043)
 *
 * rgb(11,11,10) is #0B0B0A - the same ink as fg/primary, not a separate value.
 */
export const SHADOW_SOURCE = {
  offsetY: 1.5,
  blur: 7,
  color: palette.fgPrimary,
  opacity: 0.043,
} as const;

/**
 * The one shadow in the system.
 *
 * [D] iOS shadowRadius is half the CSS blur - the two parameterise the same
 *     Gaussian differently. Android has no equivalent and quantises to an
 *     integer elevation; 1 is the closest step to a 7px blur at 4.3% alpha.
 */
export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: SHADOW_SOURCE.color,
      shadowOffset: { width: 0, height: SHADOW_SOURCE.offsetY },
      shadowOpacity: SHADOW_SOURCE.opacity,
      shadowRadius: SHADOW_SOURCE.blur / 2,
    },
    android: { elevation: 1 },
    default: {
      boxShadow: `0 ${SHADOW_SOURCE.offsetY}px ${SHADOW_SOURCE.blur}px rgba(11, 11, 10, ${SHADOW_SOURCE.opacity})`,
    } as ViewStyle,
  })!,
} as const;

/**
 * Two blur treatments, both solved by fitting a Gaussian to a clean/blurred
 * capture pair of the same screen and minimising RMSE against brightness.
 *
 * The sheet fit swept sigma and found a clean minimum at 20px:
 *
 *   sigma 12 -> scale 0.414, rmse 2.837
 *   sigma 16 -> scale 0.495, rmse 1.866
 *   sigma 18 -> scale 0.532, rmse 1.574
 *   sigma 20 -> scale 0.567, rmse 1.455   <- minimum
 *   sigma 24 -> scale 0.632, rmse 1.642
 *   sigma 28 -> scale 0.694, rmse 2.082
 *
 * The pattern across both: surfaces that replace context blur deep and dim
 * light; surfaces that interrupt it blur shallow and dim hard.
 */
export const scrim = {
  /** [M] sigma 20px -> 10.8pt, 43% dim. Sheets - they replace the context. */
  sheet: { blurRadius: 20 / 1.85, dim: 0.43 },
  /** [M] sigma 8px -> 4.3pt, 52% dim. Dialogs - they interrupt. */
  dialog: { blurRadius: 8 / 1.85, dim: 0.52 },
} as const;

export type ScrimToken = keyof typeof scrim;
