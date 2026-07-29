import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

/**
 * The commitment control.
 *
 * Indigo means commitment - CTAs, filled tracks, verification - and pink means
 * selection. Across all 50 captured screens the two never swap roles. That is
 * why this component has no "pink" variant: a pink button would promise the
 * wrong thing.
 *
 * The fill is FLAT #5363FF. The gradient inferred in the first extraction pass
 * was glow contamination - core spread measured R6 G5 B1, which is noise, not
 * a ramp. Do not reintroduce a gradient here.
 */

export type ButtonVariant =
  /** Flat indigo, white label. The only fill that clears white text (4.57:1). */
  | 'primary'
  /** Surface fill, ink label. Secondary actions on canvas. */
  | 'secondary'
  /** No fill. "I already have an account". */
  | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** [D] 56pt - the CTA is one 4pt step below the 64pt option row. */
export const BUTTON_HEIGHT = 56;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const t = useTheme();

  const backgroundColor =
    variant === 'primary'
      ? t.color.palette.actionPrimary
      : variant === 'secondary'
        ? t.color.palette.surface
        : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        {
          height: BUTTON_HEIGHT,
          borderRadius: t.radius.capsule,
          backgroundColor,
          // [E] Press feedback is not observable in a still.
          opacity: disabled ? 0.4 : pressed ? 0.92 : 1,
        },
        variant === 'secondary' && t.shadow.card,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text
          variant="title.sm"
          tone={variant === 'primary' ? 'inverse' : 'primary'}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
});
