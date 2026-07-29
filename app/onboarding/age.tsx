import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OptionRow, ProgressTrack, Text } from '../../src/components';
import { AGE_BANDS, COPY } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { useTheme } from '../../src/theme';

/**
 * Single-select.
 *
 * The answer is complete the moment a row is tapped, so the row advances. No
 * CTA appears on this screen at all - adding one would ask the user to confirm
 * something they have already fully expressed.
 */
export default function AgeStep() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useOnboarding();

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: insets.bottom + t.spacing.xl,
          gap: t.spacing.md,
        }}
      >
        <ProgressTrack value={1 / 2} accessibilityLabel="Step 1 of 2" />

        <View style={{ gap: t.spacing.xs, marginTop: t.spacing.lg }}>
          <Text variant="title.lg">{COPY.age.title}</Text>
          <Text variant="body.lg" tone="secondary">
            {COPY.age.body}
          </Text>
        </View>

        <View style={{ gap: t.spacing.md, marginTop: t.spacing.sm }}>
          {AGE_BANDS.map((band) => (
            <OptionRow
              key={band}
              label={band}
              mode="single"
              selected={state.age === band}
              onPress={() => {
                dispatch({ type: 'setAge', age: band });
                router.push('/onboarding/concerns');
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
