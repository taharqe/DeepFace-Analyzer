import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BUTTON_HEIGHT,
  Button,
  OptionRow,
  ProgressTrack,
  StickyDock,
  Text,
  useStickyDockHeight,
} from '../../src/components';
import { CONCERNS, COPY } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { useTheme } from '../../src/theme';

/**
 * Multi-select.
 *
 * Only the user knows when they are finished picking, so the rows toggle and a
 * CTA in the StickyDock owns the transition. The CTA is disabled until at
 * least one concern is chosen - an empty answer here would produce a routine
 * with nothing to target.
 */
export default function ConcernsStep() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useOnboarding();
  const dockClearance = useStickyDockHeight(BUTTON_HEIGHT);

  const ready = state.concerns.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          // Measured off the dock itself rather than guessed - the old 160
          // ignored the safe-area inset entirely.
          paddingBottom: dockClearance + t.spacing.xl,
          gap: t.spacing.md,
        }}
      >
        <ProgressTrack value={2 / 2} accessibilityLabel="Step 2 of 2" />

        <View style={{ gap: t.spacing.xs, marginTop: t.spacing.lg }}>
          <Text variant="title.lg">{COPY.concerns.title}</Text>
          <Text variant="body.lg" tone="secondary">
            {COPY.concerns.body}
          </Text>
        </View>

        <View style={{ gap: t.spacing.md, marginTop: t.spacing.sm }}>
          {CONCERNS.map(({ id, glyph, label }) => (
            <OptionRow
              key={id}
              label={label}
              glyph={glyph}
              mode="multi"
              selected={state.concerns.includes(id)}
              onPress={() => dispatch({ type: 'toggleConcern', concern: id })}
            />
          ))}
        </View>
      </ScrollView>

      <StickyDock>
        <Button
          label={COPY.concerns.cta}
          disabled={!ready}
          onPress={() => router.push('/onboarding/tailoring')}
        />
      </StickyDock>
    </View>
  );
}
