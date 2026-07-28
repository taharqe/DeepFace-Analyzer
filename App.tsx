import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Badge, OptionRow, StickyDock, Text } from './src/components';
import { ThemeProvider, useTheme } from './src/theme';

const AGES = ['Under 25', '25 – 34', '35 – 44', '45 – 60', 'Over 60'];

const CONCERNS = [
  { glyph: '◇', label: 'Fine lines' },
  { glyph: '○', label: 'Visible pores' },
  { glyph: '◐', label: 'Uneven tone' },
  { glyph: '△', label: 'Dryness' },
  { glyph: '▽', label: 'Redness' },
  { glyph: '◈', label: 'Dullness' },
];

/**
 * Demonstrates the advance rule from the spec, which is the whole reason
 * OptionRow takes a `mode`:
 *
 *   single-select -> answer is complete on tap -> the row advances
 *   multi-select  -> only the user knows they're done -> a CTA advances
 */
function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'age' | 'concerns'>('age');
  const [age, setAge] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);

  const toggle = (label: string) =>
    setConcerns((c) =>
      c.includes(label) ? c.filter((x) => x !== label) : [...c, label],
    );

  return (
    <View style={[styles.screen, { backgroundColor: t.color.palette.canvas }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.xxl,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 160,
          gap: t.spacing.md,
        }}
      >
        {step === 'age' ? (
          <>
            <Text variant="title.lg">How old are you?</Text>
            <Text variant="body.lg" tone="secondary" style={styles.sub}>
              Skin needs different care at different ages.
            </Text>
            {AGES.map((label) => (
              <OptionRow
                key={label}
                label={label}
                mode="single"
                selected={age === label}
                onPress={() => {
                  setAge(label);
                  setStep('concerns'); // complete by definition -> advance
                }}
              />
            ))}
          </>
        ) : (
          <>
            <Text variant="title.lg">What matters most to you?</Text>
            <Text variant="body.lg" tone="secondary" style={styles.sub}>
              Pick everything that applies.
            </Text>
            {CONCERNS.map(({ glyph, label }) => (
              <OptionRow
                key={label}
                label={label}
                glyph={glyph}
                mode="multi"
                selected={concerns.includes(label)}
                onPress={() => toggle(label)} // toggles only - CTA advances
              />
            ))}

            <View style={[styles.badges, { marginTop: t.spacing.xl }]}>
              <Badge label="Sulfate-free" />
              <Badge label="99% fit" tone="scoreHigh" />
              <Badge label="76% fit" tone="scoreMid" />
              <Badge label="Selected" tone="selection" />
              <Badge label="€39.99" tone="commerce" />
            </View>
          </>
        )}
      </ScrollView>

      {step === 'concerns' ? (
        <StickyDock>
          <Pressable
            disabled={concerns.length === 0}
            onPress={() => setStep('age')}
            accessibilityRole="button"
            style={{
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: t.radius.capsule,
              // Flat fill. The gradient in the first extraction pass turned out
              // to be glow contamination; core spread measured R6 G5 B1.
              backgroundColor: t.color.palette.actionPrimary,
              opacity: concerns.length === 0 ? 0.4 : 1,
            }}
          >
            {/* Indigo is the one fill white text clears: 4.57:1. */}
            <Text variant="title.sm" tone="inverse">
              Continue
            </Text>
          </Pressable>
        </StickyDock>
      ) : null}

      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Onboarding />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sub: { marginBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
