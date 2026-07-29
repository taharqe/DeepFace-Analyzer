import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ProgressTrack, Text } from '../../src/components';
import { CATALOGUE_SIZE } from '../../src/features/catalogue/products';
import { COPY } from '../../src/features/onboarding/questions';
import { rawCount } from '../../src/lib/format';
import { onVoid, useTheme, voidGradient } from '../../src/theme';

/**
 * The analysis sequence.
 *
 * [M] This is the only place the void ramp (#030B0E -> #0B1C2C) appears. White
 *     on it measures 19.85:1 at the dark end and 17.26:1 at the light end, so
 *     inverse text is safe across the whole gradient.
 *
 * [E] The count animation is a proposal - a still cannot show whether the
 *     number counts up, how fast, or whether it eases. The duration below is
 *     invented and marked as such.
 */
const COUNT_MS = 2200;

export default function Tailoring() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);
  const focused = useIsFocused();

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / COUNT_MS);
      setProgress(p);
      if (p >= 1) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const done = progress >= 1;

  return (
    <LinearGradient
      colors={[voidGradient[0], voidGradient[1]]}
      style={[
        styles.screen,
        {
          paddingTop: insets.top + t.spacing.giant,
          paddingBottom: insets.bottom + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
        },
      ]}
    >
      <View style={styles.center}>
        <Text variant="title.lg" tone="inverse" style={styles.centred}>
          {COPY.tailoring.title}
        </Text>

        <Text variant="display.lg" tone="inverse" style={styles.count}>
          {rawCount(CATALOGUE_SIZE * progress)}
        </Text>
        <Text variant="body.md" tone="inverse" style={styles.centred}>
          {COPY.tailoring.caption}
        </Text>

        <ProgressTrack
          value={progress}
          // [E] marked token, not a literal. See color.ts onVoid.track - the
          // canvas token vanishes against the ramp, and this value is a
          // proposal rather than a measurement.
          trackColor={onVoid.track}
          style={{ width: '100%', marginTop: t.spacing.xl }}
          accessibilityLabel="Tailoring your routine"
        />
      </View>

      {/*
        Focus-GATED, not merely mounted.

        expo-status-bar merges a static props stack in MOUNT order, and a native
        stack keeps screens below the top one mounted. An unconditional
        <StatusBar style="light" /> here therefore stayed the last-pushed entry
        after pushing to Reveal and Paywall - both of which render on the
        near-white canvas - leaving white status text on a white background for
        the rest of onboarding.
      */}
      {focused ? <StatusBar style="light" /> : null}

      <Button
        label={COPY.tailoring.cta}
        disabled={!done}
        // The disabled tint is computed against this ground. Without it the
        // disabled CTA rendered lighter than its own enabled state here.
        ground={voidGradient[0]}
        onPress={() => router.push('/onboarding/reveal')}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  centred: { textAlign: 'center' },
  count: { marginTop: 24 },
});
