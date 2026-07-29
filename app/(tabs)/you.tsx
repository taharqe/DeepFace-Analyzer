import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Text } from '../../src/components';
import { CONCERNS } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { useTheme } from '../../src/theme';

export default function You() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useOnboarding();

  const labels = CONCERNS.filter((c) => state.concerns.includes(c.id));

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
        <Text variant="title.lg">You</Text>

        <Card>
          <Text variant="caption" tone="secondary">
            Age
          </Text>
          <Text variant="title.sm">{state.age ?? 'Not set'}</Text>
        </Card>

        <Card>
          <Text variant="caption" tone="secondary">
            Tracking
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: t.spacing.sm,
              marginTop: t.spacing.sm,
            }}
          >
            {labels.length > 0 ? (
              labels.map((c) => (
                <Badge key={c.id} label={c.label} tone="selection" />
              ))
            ) : (
              <Text variant="body.md" tone="secondary">
                Nothing yet
              </Text>
            )}
          </View>
        </Card>

        <Card>
          <Text variant="caption" tone="secondary">
            Plan
          </Text>
          <Text variant="title.sm">
            {state.subscribed ? `Premium · ${state.plan}` : 'Free'}
          </Text>
        </Card>

        <Button
          label="Start over"
          variant="secondary"
          onPress={() => {
            dispatch({ type: 'reset' });
            router.replace('/');
          }}
        />
      </ScrollView>
    </View>
  );
}
