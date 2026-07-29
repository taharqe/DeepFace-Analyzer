import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme';
import { CheckMark } from './CheckMark';
import { PRESS_OPACITY } from './press';
import { Text } from './Text';

/**
 * Reconstructed from the AURA v0.1.0 spec - the OptionRow.tsx upload arrived as
 * an iCloud placeholder.
 *
 * Two things are load-bearing here.
 *
 * 1. The capsule. Arc-fitting the corner gave r = 60px against a 120px row -
 *    exactly h/2, rmse 0.75 - so these are true capsules and the radius token
 *    is 9999, never a literal. A literal 60 breaks the moment a row reflows to
 *    two lines, which it now can: the row uses minHeight, not height.
 *
 * 2. The advance rule, quoted from the spec: "Answer complete by definition ->
 *    advance. Only the user knows they're done -> CTA." A single-select answer
 *    is complete the instant it is tapped, so the row owns the transition. A
 *    multi-select answer is only complete when the user says so, so the row
 *    reports state and a CTA in a StickyDock owns the transition.
 */

export type OptionRowMode = 'single' | 'multi';

export interface OptionRowProps {
  label: string;
  /** Leading glyph, e.g. the concern icons. Purely decorative. */
  glyph?: string;
  selected?: boolean;
  mode?: OptionRowMode;
  /**
   * Single-select: the answer is complete on tap, so this both records the
   * choice and advances. Multi-select: this toggles only - the CTA advances.
   */
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OptionRow({
  label,
  glyph,
  selected = false,
  mode = 'single',
  onPress,
  disabled = false,
  style,
}: OptionRowProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        {
          // minHeight, not height. A fixed height clips a label that wraps to
          // two lines, and clips every label once Dynamic Type is turned up.
          minHeight: t.metrics.optionRowHeight,
          paddingVertical: t.spacing.lg,
          borderRadius: t.radius.capsule,
          backgroundColor: t.color.palette.surface,
          paddingHorizontal: t.spacing.xl,
          gap: t.spacing.md,
          opacity: pressed && !disabled ? PRESS_OPACITY : 1,
        },
        // No borders anywhere in the corpus - separation is the 2% canvas/
        // surface step plus the single measured shadow.
        t.shadow.card,
        disabled && styles.disabled,
        style,
      ]}
    >
      {glyph ? (
        <Text
          variant="title.sm"
          tone="secondary"
          // Both are needed: accessibilityElementsHidden is iOS-only and
          // importantForAccessibility is Android-only. With just the first,
          // TalkBack reads "white diamond suit" before every option label.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {glyph}
        </Text>
      ) : null}

      <Text variant="body.md" style={styles.label}>
        {label}
      </Text>

      {selected ? <CheckMark /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
  disabled: {
    opacity: 0.4,
  },
});
