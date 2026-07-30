/**
 * A single number with its label. Used in the History summary row.
 */

import { Text, View } from 'react-native';

import { line, radius, space, surface, text, type as typography } from '@/theme/tokens';

export function StatTile({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        // Without a floor, a long value squeezes its siblings to nothing.
        minWidth: 0,
        gap: space.xs,
        padding: space.lg,
        borderRadius: radius.row,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: line.core,
        backgroundColor: surface.raised,
      }}
    >
      <Text
        selectable
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          ...typography.metric,
          color: tone ?? text.primary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text numberOfLines={2} style={{ ...typography.caption, color: text.tertiary }}>
        {label}
      </Text>
    </View>
  );
}
