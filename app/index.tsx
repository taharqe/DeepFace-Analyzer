import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '../src/components';
import { COPY } from '../src/features/onboarding/questions';
import { useTheme } from '../src/theme';

/** Welcome. */
export default function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: t.color.palette.canvas,
          paddingTop: insets.top + t.spacing.giant,
          paddingBottom: insets.bottom + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
        },
      ]}
    >
      <View style={[styles.copy, { gap: t.spacing.md }]}>
        <Text variant="display.lg">{COPY.welcome.title}</Text>
        <Text variant="body.lg" tone="secondary">
          {COPY.welcome.body}
        </Text>
      </View>

      <View style={{ gap: t.spacing.sm }}>
        <Button
          label={COPY.welcome.primary}
          onPress={() => router.push('/onboarding/age')}
        />
        <Button
          label={COPY.welcome.secondary}
          variant="ghost"
          onPress={() => router.replace('/(tabs)/today')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between' },
  copy: { flex: 1, justifyContent: 'center' },
});
