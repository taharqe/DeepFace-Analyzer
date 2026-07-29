import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

/**
 * Reconstructed from the AURA v0.1.0 spec - the Badge.tsx upload arrived as an
 * iCloud placeholder.
 *
 * The finding this component exists to encode: badge text is ink, never white.
 *
 * White on the pink selection fill measures 2.21:1 and fails WCAG outright.
 * Ink on the same untouched fill measures 8.90:1. Darkening the fills to rescue
 * white text does not work either - the spec found that approach tops out at
 * 3.82:1, still failing, and it costs you the brand colour.
 *
 * The same holds for every fill except indigo:
 *
 *   pink    #FF88BB   white 2.21 FAIL   ink 8.90 AAA
 *   green   #40BB7C   white 2.44 FAIL   ink 8.08 AAA
 *   purple  #B16BFF   white 3.27 FAIL   ink 6.02 AA    (computed, not in spec)
 *   yellow  #F8D94B   white 1.19 FAIL   ink 14.08 AAA
 *   indigo  #5363FF   white 4.57 AA                    (the only exception)
 */

export type BadgeTone =
  /** Attribute chips - "Sulfate-free", "Fragrance-free". Surface fill. */
  | 'neutral'
  /** >=90% match. Purple. */
  | 'scoreHigh'
  /** 70-89% match. Green. */
  | 'scoreMid'
  /** Selection state. Pink - and pink means selection, nothing else. */
  | 'selection'
  /** Price pills only. Yellow. */
  | 'commerce';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const t = useTheme();

  const backgroundColor =
    tone === 'scoreHigh'
      ? t.color.palette.scoreHigh
      : tone === 'scoreMid'
        ? t.color.palette.scoreMid
        : tone === 'selection'
          ? t.color.palette.actionSelection
          : tone === 'commerce'
            ? t.color.palette.accentCommerce
            : t.color.palette.surface;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor,
          borderRadius: t.radius.capsule,
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.xs,
        },
        tone === 'neutral' && t.shadow.card,
        style,
      ]}
    >
      {/* Ink on every tone. See the block comment above. */}
      <Text variant="label.md" tone="primary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
