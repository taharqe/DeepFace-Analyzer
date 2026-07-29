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
 * Reconstructed from the AURA v0.1.0 spec - the OptionRow.tsx upload arrived as
 * an iCloud placeholder.
 *
 * Two things are load-bearing here.
 *
 * 1. The capsule. Arc-fitting the corner gave r = 60px against a 120px row -
 *    exactly h/2, rmse 0.75 - so these are true capsules and the radius token
 *    is 9999, never a literal. A literal 60 breaks the moment a row reflows to
 *    two lines.
 *
 * 2. The advance rule, quoted from the spec: "Answer complete by definition ->
 *    advance. Only the user knows they're done -> CTA." A single-select answer
 *    is complete the instant it is tapped, so the row owns the transition. A
 *    multi-select answer is only complete when the user says so, so the row
 *    reports state and a CTA in a StickyDock owns the transition.
 *
 *    That is why `onSelect` fires the advance in single mode and `onToggle`
 *    does not in multi mode. Collapsing the two would break the grammar.
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
          height: t.metrics.optionRowHeight,
          borderRadius: t.radius.capsule,
          backgroundColor: t.color.palette.surface,
          paddingHorizontal: t.spacing.xl,
          gap: t.spacing.md,
          // [E] Press feedback is not observable in a still. The spec marks
          // motion and haptics as estimated; this is a proposal, not a
          // measurement. Haptics belong here too, on the same event.
          opacity: pressed && !disabled ? 0.92 : 1,
        },
        // No borders anywhere in the corpus - separation is the 2% canvas/
        // surface step plus the single measured shadow.
        t.shadow.card,
        disabled && styles.disabled,
        style,
      ]}
    >
      {glyph ? (
        <Text variant="title.sm" tone="secondary" accessibilityElementsHidden>
          {glyph}
        </Text>
      ) : null}

      <Text variant="body.md" style={styles.label}>
        {label}
      </Text>

      {/*
        Pink means selection and nothing else. Indigo would read as commitment,
        which is a different promise - across all 50 screens the two never swap.
        Ink on pink for the check: 8.90:1.
      */}
      {selected ? (
        <View
          style={[
            styles.check,
            {
              backgroundColor: t.color.palette.actionSelection,
              borderRadius: t.radius.capsule,
            },
          ]}
        >
          <Text variant="label.md" tone="primary">
            ✓
          </Text>
        </View>
      ) : null}
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
  check: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
