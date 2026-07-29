import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ProgressTrack, Text } from '../../src/components';
import { CONCERNS } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { useTheme } from '../../src/theme';

/**
 * Insights - "Track results weekly", per the paywall benefit.
 *
 * [E] No capture shows this screen's charts, so the visualisation is a
 *     proposal built only from tokens that exist: filled indigo tracks and the
 *     one card shadow. Nothing here should be read as measured.
 */
export default function Insights() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();

  const tracked = CONCERNS.filter((c) => state.concerns.includes(c.id));

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 140,
          gap: t.spacing.md,
        }}
      >
        <Text variant="title.lg">Insights</Text>

        {tracked.length === 0 ? (
          <Text variant="body.lg" tone="secondary">
            Finish onboarding to start tracking.
          </Text>
        ) : (
          tracked.map((c, i) => (
            <Card key={c.id}>
              <View style={[styles.row, { marginBottom: t.spacing.md }]}>
                <Text variant="title.sm" accessibilityElementsHidden>
                  {c.glyph}
                </Text>
                <Text variant="title.sm" style={styles.grow}>
                  {c.label}
                </Text>
                <Text variant="label.md" tone="secondary">
                  week {i + 1}
                </Text>
              </View>
              <ProgressTrack
                value={0.35 + i * 0.12}
                accessibilityLabel={`${c.label} progress`}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
});
