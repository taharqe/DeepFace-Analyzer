import { useCallback } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { Aurora } from '@/components/aurora';
import { Eyebrow } from '@/components/eyebrow';
import { Glyph } from '@/components/glyph';
import { ResultCard } from '@/components/result-card';
import { StatTile } from '@/components/stat-tile';
import { useHistory, useHistoryStats } from '@/lib/store';
import { accent, motion, space, text, type as typography } from '@/theme/tokens';

export default function HistoryScreen() {
  const { results, remove, clear } = useHistory();
  const stats = useHistoryStats();

  /** Wiping the session is unrecoverable, so it asks first. */
  const confirmClear = useCallback(() => {
    Alert.alert(
      'Clear all results?',
      `This removes ${results.length} ${results.length === 1 ? 'result' : 'results'} from this session. It cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clear },
      ]
    );
  }, [results.length, clear]);

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.section,
          paddingBottom: space.section,
          gap: space.xl,
        }}
      >
        <Animated.View entering={FadeInDown.duration(motion.reveal)} style={{ gap: space.md }}>
          <Eyebrow tone={accent.emerald}>This session</Eyebrow>
          <Text style={{ ...typography.display, color: text.primary }}>History</Text>
          <Text style={{ ...typography.body, color: text.secondary, maxWidth: 320 }}>
            Results are held in memory only. Closing the app discards them — nothing about a face is
            written to disk.
          </Text>
        </Animated.View>

        {results.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(motion.stagger).duration(motion.reveal)}
            style={{ alignItems: 'center', gap: space.md, paddingVertical: space.section }}
          >
            <Glyph name="clock.arrow.circlepath" size={30} color={text.tertiary} />
            <Text
              style={{
                ...typography.body,
                color: text.tertiary,
                textAlign: 'center',
                maxWidth: 260,
              }}
            >
              Nothing analyzed yet. Results will collect here as you go.
            </Text>
          </Animated.View>
        ) : (
          <>
            <Animated.View
              entering={FadeInDown.delay(motion.stagger).duration(motion.reveal)}
              style={{ flexDirection: 'row', gap: space.md }}
            >
              <StatTile value={`${stats.count}`} label="Analyzed" />
              <StatTile
                value={`${(stats.avgElapsed / 1000).toFixed(1)}s`}
                label="Avg. time"
              />
              <StatTile
                value={`${stats.avgConfidence.toFixed(0)}%`}
                label="Avg. confidence"
                tone={accent.emerald}
              />
            </Animated.View>

            <View style={{ gap: space.xl }}>
              {results.map((analysis) => (
                <ResultCard
                  key={analysis.id}
                  analysis={analysis}
                  onRemove={() => remove(analysis.id)}
                />
              ))}
            </View>

            <ActionButton
              label="Clear all results"
              icon="trash"
              variant="secondary"
              onPress={confirmClear}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
