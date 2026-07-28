import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useTheme, type TypeVariant } from '../theme';

/**
 * Reconstructed from the AURA v0.1.0 spec - the Text.tsx upload arrived as an
 * iCloud placeholder.
 *
 * The point of this component is that `fontSize` never appears at a call site.
 * Nine measured styles cover the whole corpus; anything outside them is a
 * design decision, not a styling one.
 */

export type TextTone =
  /** #0B0B0A - 18.07:1 on canvas, 19.69:1 on surface. */
  | 'primary'
  /** #6B6864 - 5.54:1 on surface, 5.09:1 on canvas. */
  | 'secondary'
  /** #5363FF - 4.57:1 on surface ONLY. Fails at 4.19:1 on canvas. */
  | 'accent'
  /** #FFFFFF - for the void ramp and indigo fills. */
  | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body.md',
  tone = 'primary',
  style,
  ...rest
}: TextProps) {
  const t = useTheme();

  const color =
    tone === 'accent'
      ? t.color.text.onSurfaceAccent
      : tone === 'inverse'
        ? t.color.text.inverse
        : tone === 'secondary'
          ? t.color.text.secondary
          : t.color.text.primary;

  return (
    <RNText
      {...rest}
      style={[t.typography[variant], { color, fontFamily: t.fontFamily }, style]}
    />
  );
}
