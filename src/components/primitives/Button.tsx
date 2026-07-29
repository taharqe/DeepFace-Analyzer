import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { disabledFillOn, readableOn, useTheme } from '../../theme';
import { PRESS_OPACITY } from './press';
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
  /**
   * Hex of the background this button sits on. Defaults to canvas.
   *
   * Required for correctness on the void ramp, not a nicety - see the disabled
   * treatment below.
   */
  ground?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * [E] 56pt.
 *
 * No CTA height is measured anywhere in the corpus - section 02 gives only the
 * 120px (64pt) option row. This is a free choice, proposed as two 4pt steps
 * below that row so the CTA reads as lighter than a question option.
 */
export const BUTTON_HEIGHT = 56;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  ground,
  style,
}: ButtonProps) {
  const t = useTheme();
  const bg = ground ?? t.color.palette.canvas;

  const enabledFill =
    variant === 'primary'
      ? t.color.palette.actionPrimary
      : variant === 'secondary'
        ? t.color.palette.surface
        : 'transparent';

  /**
   * Disabled primary tints the fill TOWARD ITS GROUND, and picks the label by
   * luminance.
   *
   * Two failures are being avoided here. Fading the whole control measured
   * 1.94:1 on the rendered DOM, because indigo's luminance is 0.1798 and white
   * needs a ground at or below 0.1833 - it sits 2% from the cliff, so any
   * lightening breaks white text.
   *
   * The first fix, a single tint computed against canvas, was worse in a way
   * that only showed up on a dark screen: on the void ramp that fixed light
   * fill measured 10.80:1 while the ENABLED indigo measured 4.34:1, making the
   * disabled button ~2.5x more prominent than its own enabled state and the
   * brightest thing on a near-black screen.
   *
   * Tinting toward the ground makes it recede on any background, which is what
   * disabled should look like everywhere.
   */
  const showTintedDisabled = disabled && variant === 'primary';
  const disabledFill = showTintedDisabled ? disabledFillOn(bg) : null;
  const backgroundColor = disabledFill ?? enabledFill;

  const labelColor = disabledFill
    ? readableOn(disabledFill)
    : variant === 'primary'
      ? t.color.onFill.actionPrimary
      : t.color.text.primary;

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
          // [E] Press feedback is not observable in a still. Only the ENABLED
          // control dims; the disabled state carries its own fill.
          opacity: !disabled && pressed ? PRESS_OPACITY : 1,
        },
        variant === 'secondary' && !disabled && t.shadow.card,
        // Ghost has no fill to tint, so it keeps the opacity treatment.
        disabled && variant !== 'primary' && styles.dim,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text variant="title.sm" style={{ color: labelColor }}>
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
