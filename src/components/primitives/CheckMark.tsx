import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

/**
 * The selection tick.
 *
 * Extracted because OptionRow, PlanRow and PriceOption each carried their own
 * copy of the same 24x24 pink capsule, all three with the size hardcoded and
 * unmarked. Three copies meant three places for the two-accent rule to drift.
 *
 * Pink means selection and nothing else. Ink on pink measures 8.90:1; white
 * would be 2.21:1 and fail outright.
 */
export interface CheckMarkProps {
  /** Render the empty track instead of the filled tick. */
  empty?: boolean;
}

export function CheckMark({ empty = false }: CheckMarkProps) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.mark,
        {
          width: t.metrics.checkSize,
          height: t.metrics.checkSize,
          borderRadius: t.radius.capsule,
          backgroundColor: empty
            ? t.color.palette.canvas
            : t.color.palette.actionSelection,
        },
      ]}
    >
      {empty ? null : (
        <Text variant="label.md" tone="primary">
          ✓
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
});
