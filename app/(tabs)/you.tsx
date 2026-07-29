import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  Text,
  useStickyDockHeight,
} from '../../src/components';
import { CONCERNS } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { useTheme } from '../../src/theme';
import { TAB_ITEM_HEIGHT } from './_layout';

export default function You() {
  const t = useTheme();
  const dockClearance = useStickyDockHeight(TAB_ITEM_HEIGHT, 8);
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useOnboarding();

  const labels = CONCERNS.filter((c) => state.concerns.includes(c.id));

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
            // No dismissAll() here. Both routes into (tabs) already leave the
            // root stack holding a single entry - Welcome's "I already have an
            // account" replaces index, and the paywall dismissAll()s before
            // replacing - so there is never anything to dismiss from this
            // screen, and calling it logs a dev-mode error.
            router.replace('/');
          }}
        />
      </ScrollView>
    </View>
  );
}
