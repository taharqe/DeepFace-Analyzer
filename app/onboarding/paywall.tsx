import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  PriceOption,
  StickyDock,
  Text,
} from '../../src/components';
import { COPY } from '../../src/features/onboarding/questions';
import { useOnboarding } from '../../src/features/onboarding/state';
import { formatPrice } from '../../src/lib/format';
import { useTheme } from '../../src/theme';

export default function Paywall() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useOnboarding();

  return (
    <View style={{ flex: 1, backgroundColor: t.color.palette.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 200,
          gap: t.spacing.lg,
        }}
      >
        <Text variant="display.md">{COPY.paywall.title}</Text>

        <View style={{ gap: t.spacing.md }}>
          {COPY.paywall.benefits.map(({ glyph, label }) => (
            <View key={label} style={[styles.benefit, { gap: t.spacing.md }]}>
              <Text variant="title.sm" accessibilityElementsHidden>
                {glyph}
              </Text>
              <Text variant="body.lg">{label}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: t.spacing.md, marginTop: t.spacing.sm }}>
          <PriceOption
            title="Weekly"
            price={formatPrice(599)}
            selected={state.plan === 'weekly'}
            onPress={() => dispatch({ type: 'setPlan', plan: 'weekly' })}
          />
          <PriceOption
            title="Yearly"
            flag="BEST VALUE"
            price={formatPrice(3999)}
            note="billed once a year"
            selected={state.plan === 'yearly'}
            onPress={() => dispatch({ type: 'setPlan', plan: 'yearly' })}
          />
        </View>

        {/*
          Disclosure sits with the price, above the CTA - not buried in the
          dock. Secondary tone still clears AA on canvas at 5.09:1.
        */}
        <Text variant="caption" tone="secondary">
          {COPY.paywall.disclosure}
        </Text>
      </ScrollView>

      <StickyDock>
        <Button
          label={COPY.paywall.cta}
          onPress={() => {
            dispatch({ type: 'subscribe' });
            router.replace('/(tabs)/today');
          }}
        />
      </StickyDock>
    </View>
  );
}

const styles = StyleSheet.create({
  benefit: { flexDirection: 'row', alignItems: 'center' },
});
