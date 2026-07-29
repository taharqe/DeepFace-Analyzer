import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme, type ScrimToken } from '../../theme';

/**
 * The backdrop behind sheets and dialogs.
 *
 * Both treatments were recovered by fitting a Gaussian to a clean/blurred
 * capture pair of the same screen and minimising RMSE against brightness:
 *
 *   sheet   sigma 20px (10.8pt), 43% dim  - replaces the context
 *   dialog  sigma  8px  (4.3pt), 52% dim  - interrupts it
 *
 * The pattern is worth stating because it is counter-intuitive: the surface
 * that blurs MORE dims LESS. A sheet takes over, so the context should read as
 * pushed away but still present. A dialog is a momentary interruption, so the
 * context stays legible in shape but is pressed down hard.
 *
 * [D] expo-blur takes an `intensity` on 0-100, not a sigma, and the mapping is
 *     not linear or documented. The intensities below are fitted by eye to the
 *     measured sigmas and are the least trustworthy numbers in this file. The
 *     sigma values in `theme.scrim` are the measurement; treat these as a
 *     rendering detail to re-tune on device.
 */
const INTENSITY: Record<ScrimToken, number> = {
  sheet: 60,
  dialog: 24,
};

export interface ScrimProps {
  variant?: ScrimToken;
  onPress?: () => void;
  /** Accessibility label for the dismiss affordance. */
  dismissLabel?: string;
}

export function Scrim({
  variant = 'sheet',
  onPress,
  dismissLabel = 'Dismiss',
}: ScrimProps) {
  const t = useTheme();
  const { dim } = t.scrim[variant];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BlurView
        intensity={INTENSITY[variant]}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? dismissLabel : undefined}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: t.color.palette.fgPrimary, opacity: dim },
        ]}
      />
    </View>
  );
}
