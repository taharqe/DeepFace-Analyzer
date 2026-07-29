import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BUTTON_HEIGHT,
  Button,
  StickyDock,
  Text,
  useStickyDockHeight,
} from '../../src/components';
import { COPY } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { CONCERNS } from '../../src/features/onboarding/questions';
import { useTheme } from '../../src/theme';

/**
 * Screen flow item 5 - the before/after reveal, between Tailoring and Paywall.
 *
 * This screen was missing entirely: Tailoring routed straight to Paywall, so
 * the user was asked to pay before being shown what they were paying for.
 *
 * [E] The comparison panels are placeholders. The spec's terms exclude
 *     reproducing the source's photography, and the corpus does not resolve
 *     what the before/after actually depicts - a face capture, a projected
 *     score, an illustration. The layout, labelling and the ordering
 *     (before on the left, after on the right, after carrying the emphasis)
 *     are what this commits to; the panel contents are not.
 */
export default function Reveal() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const dockClearance = useStickyDockHeight(BUTTON_HEIGHT);

  const tracked = CONCERNS.filter((c) => state.concerns.includes(c.id));

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: dockClearance + t.spacing.xl,
          gap: t.spacing.lg,
        }}
      >
        <View style={{ gap: t.spacing.xs }}>
          <Text variant="display.md">{COPY.reveal.title}</Text>
          <Text variant="body.lg" tone="secondary">
            {COPY.reveal.body}
          </Text>
        </View>

        <View style={[styles.compare, { gap: t.spacing.md }]}>
          {[
            { key: 'before', label: COPY.reveal.before, emphasis: false },
            { key: 'after', label: COPY.reveal.after, emphasis: true },
          ].map((panel) => (
            <View key={panel.key} style={[styles.grow, { gap: t.spacing.sm }]}>
              <View
                style={[
                  styles.panel,
                  {
                    borderRadius: t.radius.lg,
                    // BOTH panels are surface. Giving "before" the canvas token
                    // made it invisible - the page is canvas, so a canvas panel
                    // on it has no edge at all and read as empty space.
                    //
                    // The corpus has no borders, so separation has to come from
                    // the one measured shadow: "after" is raised, "before" sits
                    // flat. That is the only elevation distinction the system
                    // offers, and it is enough.
                    backgroundColor: t.color.palette.surface,
                  },
                  panel.emphasis && t.shadow.card,
                ]}
              >
                <Text variant="caption" tone="secondary">
                  {COPY.reveal.placeholder}
                </Text>
              </View>
              <Text
                variant="label.md"
                tone={panel.emphasis ? 'primary' : 'secondary'}
                style={styles.centred}
              >
                {panel.label}
              </Text>
            </View>
          ))}
        </View>

        {tracked.length > 0 ? (
          <View style={{ gap: t.spacing.sm }}>
            <Text variant="title.md">{COPY.reveal.targeting}</Text>
            {tracked.map((c) => (
              <View key={c.id} style={[styles.bullet, { gap: t.spacing.md }]}>
                <Text
                  variant="title.sm"
                  tone="secondary"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {c.glyph}
                </Text>
                <Text variant="body.lg">{c.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <StickyDock>
        <Button
          label={COPY.reveal.cta}
          onPress={() => router.push('/onboarding/paywall')}
        />
      </StickyDock>
    </View>
  );
}

const styles = StyleSheet.create({
  compare: { flexDirection: 'row' },
  grow: { flex: 1 },
  panel: { aspectRatio: 3 / 4, alignItems: 'center', justifyContent: 'center' },
  centred: { textAlign: 'center' },
  bullet: { flexDirection: 'row', alignItems: 'center' },
});
