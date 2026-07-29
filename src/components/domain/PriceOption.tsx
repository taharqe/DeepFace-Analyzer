import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Badge, CheckMark, PRESS_OPACITY, Text } from '../primitives';

/**
 * A plan row on the paywall: "Weekly €5,99" / "Yearly BEST VALUE €39,99".
 *
 * Selection is pink, per the two-accent rule - even here, where the row leads
 * to a purchase. The temptation is to make the selected plan indigo because
 * money feels like commitment, but commitment is what the Continue button
 * expresses. The row is still just a choice, and choices are pink.
 *
 * [E] The "BEST VALUE" flag's exact fill is not resolvable from the spec's
 *     colour list. Commerce yellow is the honest guess: it is the only
 *     accent reserved for pricing, and ink on it measures 14.08:1.
 */
export interface PriceOptionProps {
  title: string;
  price: string;
  /** e.g. "billed once a year" */
  note?: string;
  flag?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function PriceOption({
  title,
  price,
  note,
  flag,
  selected = false,
  onPress,
}: PriceOptionProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${price}${note ? `, ${note}` : ''}`}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: t.metrics.optionRowHeight,
          borderRadius: t.radius.capsule,
          backgroundColor: t.color.palette.surface,
          paddingHorizontal: t.spacing.xl,
          paddingVertical: t.spacing.md,
          gap: t.spacing.md,
          opacity: pressed ? PRESS_OPACITY : 1,
        },
        t.shadow.card,
      ]}
    >
      <View style={[styles.grow, { gap: t.spacing.half }]}>
        <View style={[styles.titleRow, { gap: t.spacing.sm }]}>
          <Text variant="title.sm">{title}</Text>
          {flag ? <Badge label={flag} tone="commerce" /> : null}
        </View>
        <Text variant="body.md" tone="secondary">
          {price}
          {note ? ` · ${note}` : ''}
        </Text>
      </View>

      <CheckMark empty={!selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
