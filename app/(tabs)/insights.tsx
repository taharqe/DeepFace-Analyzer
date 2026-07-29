import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Card,
  Sparkline,
  Text,
  useStickyDockHeight,
} from '../../src/components';
import { CONCERNS } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { trendFor, WEEKS } from '../../src/features/insights/trend';
import { useTheme } from '../../src/theme';
import { TAB_ITEM_HEIGHT } from './_layout';

/**
 * Insights - "Track results weekly", per the paywall benefit.
 *
 * SMALL MULTIPLES, one facet per tracked concern, each a single series.
 *
 * The alternative - all six concerns as six lines on one chart - needs six
 * categorical hues, and AURA has none. Indigo and pink are semantically
 * reserved by the two-accent rule, and score/high and score/mid are a status
 * pair banded at 90 and 70, not identities. Generating four more hues would be
 * unmarked invention AND would break the rule the whole system rests on. Six
 * converging lines would also need direct labels or a legend to stay readable,
 * which is the point past which small multiples is the standard answer anyway.
 *
 * Each facet is a stat tile: label, delta against a named period, and a
 * 12-point trend. A single series needs no legend - the card title says what
 * is plotted.
 *
 * [E] The trend data is synthetic. See features/insights/trend.ts.
 */
export default function Insights() {
  const t = useTheme();
  const dockClearance = useStickyDockHeight(TAB_ITEM_HEIGHT, 8);
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();

  const tracked = CONCERNS.filter((c) => state.concerns.includes(c.id));
  const series = tracked.map((c) => ({ ...c, ...trendFor(c.id) }));

  // Hero figure: exactly one per view.
  const meanDelta = series.length
    ? Math.round(series.reduce((sum, s) => sum + s.delta, 0) / series.length)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: dockClearance + t.spacing.xl,
          gap: t.spacing.md,
        }}
      >
        <Text variant="title.lg">Insights</Text>

        {series.length === 0 ? (
          <Text variant="body.lg" tone="secondary">
            Finish onboarding to start tracking.
          </Text>
        ) : (
          <>
            <Card>
              <Text variant="caption" tone="secondary">
                Average change over {WEEKS} weeks
              </Text>
              <Text variant="display.lg" style={styles.hero}>
                {meanDelta > 0 ? '+' : ''}
                {meanDelta}%
              </Text>
              <Text variant="body.md" tone="secondary">
                Across {series.length} tracked{' '}
                {series.length === 1 ? 'concern' : 'concerns'}
              </Text>
            </Card>

            {series.map((s) => (
              <Card key={s.id}>
                <View style={[styles.head, { marginBottom: t.spacing.sm }]}>
                  <Text
                    variant="title.sm"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    {s.glyph}
                  </Text>
                  <Text variant="title.sm" style={styles.grow}>
                    {s.label}
                  </Text>
                  {/*
                    Delta wears a TEXT token, never the series colour. Identity
                    comes from the mark below it - and indigo as text would fail
                    on canvas at 4.19:1 anyway.
                  */}
                  <Text variant="label.md" tone="secondary">
                    {s.delta > 0 ? '+' : ''}
                    {s.delta}% vs wk 1
                  </Text>
                </View>

                <Sparkline
                  values={s.values}
                  accessibilityLabel={`${s.label}: ${s.values[0]} at week 1, ${s.values[s.values.length - 1]} now`}
                />
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  hero: { marginVertical: 4 },
});
