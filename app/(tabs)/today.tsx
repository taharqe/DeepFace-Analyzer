import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantBubble, PlanRow, Text } from '../../src/components';
import { useOnboarding } from '../../src/features/onboarding/state';
import { useTheme } from '../../src/theme';

/**
 * Today.
 *
 * Locked rows are the spine of this screen: the plan is visible in full from
 * the first session, with progress gating access rather than hiding structure.
 */
export default function Today() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 140,
          gap: t.spacing.lg,
        }}
      >
        <Text variant="title.lg">Today</Text>

        <AssistantBubble>
          {state.concerns.length > 0
            ? `We built this around ${state.concerns.length} thing${state.concerns.length > 1 ? 's' : ''} you told us about.`
            : 'Scan your skin to get your first routine.'}
        </AssistantBubble>

        <View style={{ gap: t.spacing.md }}>
          <Text variant="title.md">First steps</Text>
          <PlanRow label="Meet your scanner" glyph="🧴" />
          <PlanRow label="Learn your daily plan" locked />
          <PlanRow label="Check your skin" locked />
        </View>

        <View style={{ gap: t.spacing.md }}>
          <Text variant="title.md">Daily plan</Text>
          <PlanRow label="Morning routine" locked={!state.subscribed} />
          <PlanRow label="Evening routine" locked={!state.subscribed} />
        </View>
      </ScrollView>
    </View>
  );
}
