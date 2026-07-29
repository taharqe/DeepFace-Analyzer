import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, useStickyDockHeight } from '../../src/components';
import { successGradient, useTheme, voidGradient } from '../../src/theme';
import { TAB_ITEM_HEIGHT } from './_layout';

/**
 * Scan.
 *
 * Two measured gradients meet here: the void ramp for capture/analysis, and
 * the success flood for the resolution frame.
 *
 * The success flood carries INK, not white. This is the one place the spec's
 * own audit left a gap and the recomputation caught it: white measures 3.51:1
 * on #019A88 and 2.55:1 on #00B1D3 - both fail. Ink on the cyan end is 7.72:1.
 * A "success" screen nobody can read is the worst possible place for this bug.
 */
export default function Scan() {
  const t = useTheme();
  const dockClearance = useStickyDockHeight(TAB_ITEM_HEIGHT, 8);
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'idle' | 'done'>('idle');
  const focused = useIsFocused();

  const colors: [string, string] =
    phase === 'done'
      ? [successGradient[0], successGradient[1]]
      : [voidGradient[0], voidGradient[1]];

  return (
    <LinearGradient
      colors={colors}
      style={[
        styles.screen,
        {
          paddingTop: insets.top + t.spacing.xl,
          paddingBottom: dockClearance + t.spacing.xl,
          paddingHorizontal: t.spacing.lg,
        },
      ]}
    >
      {/*
        Focus-gated. expo-router/ui's TabSlot never unmounts a visited tab - it
        keeps rendering it with display:none - so an unconditional StatusBar
        here stayed on the props stack forever and left every other tab (all
        near-white canvas) with light status text.
      */}
      {focused ? (
        <StatusBar style={phase === 'done' ? 'dark' : 'light'} />
      ) : null}

      <View style={styles.center}>
        <Text
          variant="display.md"
          tone={phase === 'done' ? 'primary' : 'inverse'}
          style={styles.centred}
        >
          {phase === 'done' ? 'Scan complete' : 'Check your skin'}
        </Text>
        <Text
          variant="body.lg"
          tone={phase === 'done' ? 'primary' : 'inverse'}
          style={styles.centred}
        >
          {phase === 'done'
            ? 'Your routine has been updated.'
            : 'Find even light and hold still.'}
        </Text>
      </View>

      <Button
        label={phase === 'done' ? 'Scan again' : 'Start scan'}
        variant={phase === 'done' ? 'secondary' : 'primary'}
        ground={phase === 'done' ? successGradient[0] : voidGradient[0]}
        onPress={() => setPhase(phase === 'done' ? 'idle' : 'done')}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  centred: { textAlign: 'center' },
});
