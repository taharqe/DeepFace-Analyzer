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

/**
 * [E] 56pt.
 *
 * No CTA height is measured anywhere in the corpus - section 02 gives only the
 * 120px (64pt) option row. This is a free choice, proposed as two 4pt steps
 * below that row so the CTA reads as lighter than a question option.
 *
 * It was previously marked [D] with the comment "one 4pt step below the 64pt
 * option row", which was both arithmetically wrong (64 - 56 = 8, two steps) and
 * claimed measurement provenance the corpus does not supply.
 */
export const BUTTON_HEIGHT = 56;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const t = useTheme();

  const enabledFill =
    variant === 'primary'
      ? t.color.palette.actionPrimary
      : variant === 'secondary'
        ? t.color.palette.surface
        : 'transparent';

  /**
   * Disabled primary tints the fill and switches the label to ink, rather than
   * fading the whole control.
   *
   * Reducing opacity across the subtree - the obvious approach - measured
   * 1.94:1 on the rendered DOM, because indigo's luminance is 0.1798 and white
   * text needs a ground at or below 0.1833. Indigo sits 2% from that cliff, so
   * any lightening at all breaks white-on-indigo. A tinted indigo is no longer
   * the commitment indigo; it is a tint, and by the system's own rule tints
   * carry ink. 10.72:1.
   */
  const showDisabledFill = disabled && variant === 'primary';
  const backgroundColor = showDisabledFill ? t.color.disabled.fill : enabledFill;
  const labelTone =
    variant === 'primary' && !showDisabledFill ? 'inverse' : 'primary';

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
          // minHeight, not height: at large Dynamic Type settings a fixed height
          // clips the label instead of letting the control grow.
          minHeight: BUTTON_HEIGHT,
          paddingVertical: t.spacing.md,
          paddingHorizontal: t.spacing.xl,
          borderRadius: t.radius.capsule,
          backgroundColor,
          // [E] Press feedback is not observable in a still.
          // Only the ENABLED control dims on press; the disabled state carries
          // its own fill and must not be dimmed further.
          opacity: !disabled && pressed ? 0.92 : 1,
        },
        variant === 'secondary' && !disabled && t.shadow.card,
        // Ghost has no fill to tint, so it keeps the opacity treatment.
        disabled && variant !== 'primary' && styles.dim,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text variant="title.sm" tone={labelTone}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.4 },
});
