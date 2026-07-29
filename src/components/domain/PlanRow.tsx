import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../../theme';
import { CheckMark, PRESS_OPACITY, Text } from '../primitives';

/**
 * A row in "First steps" / "Daily plan" on the Today tab.
 *
 * The captures show a progression: one unlocked row carrying a glyph (🧴) and
 * the rest carrying a lock (🔒). Locked rows stay legible rather than greyed
 * to near-invisibility - the point is to show what is coming, not to hide it.
 * Ink at 40% would drop below AA, so the lock state is carried by the trailing
 * glyph and the disabled press target, not by fading the label.
 */
export interface PlanRowProps {
  label: string;
  /** Leading glyph for an unlocked row. */
  glyph?: string;
  locked?: boolean;
  done?: boolean;
  onPress?: () => void;
}

export function PlanRow({
  label,
  glyph,
  locked = false,
  done = false,
  onPress,
}: PlanRowProps) {
  const t = useTheme();

  // A row with nothing to do is not a button. Announcing "Meet your scanner,
  // button" and then doing nothing on activation is worse than announcing text.
  const actionable = !locked && !!onPress;

  return (
    <Pressable
      onPress={actionable ? onPress : undefined}
      disabled={!actionable}
      accessibilityRole={actionable ? 'button' : undefined}
      accessibilityState={actionable ? undefined : { disabled: locked }}
      accessibilityLabel={locked ? `${label}, locked` : label}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: t.metrics.optionRowHeight,
          paddingVertical: t.spacing.lg,
          borderRadius: t.radius.capsule,
          backgroundColor: t.color.palette.surface,
          paddingHorizontal: t.spacing.xl,
          gap: t.spacing.md,
          opacity: pressed && actionable ? PRESS_OPACITY : 1,
        },
        t.shadow.card,
      ]}
    >
      <Text
        variant="title.sm"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {locked ? '🔒' : (glyph ?? '·')}
      </Text>

      {/* Secondary tone on a locked row still clears AA: 5.54:1 on surface. */}
      <Text
        variant="body.md"
        tone={locked ? 'secondary' : 'primary'}
        style={styles.label}
      >
        {label}
      </Text>

      {done ? <CheckMark /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
});
