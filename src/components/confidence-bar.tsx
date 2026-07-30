/**
 * One label from a score distribution, as a meter.
 *
 * The bar grows from zero on mount rather than snapping, because the row is
 * usually the first thing rendered after a result arrives and the growth is what
 * communicates "this is a measured quantity, not a fact".
 */

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { confidenceColor, line, motion, radius, space, text, type as typography } from '@/theme/tokens';

const EASE = Easing.bezier(...motion.easeOut);

type ConfidenceBarProps = {
  label: string;
  /** 0-100. */
  value: number;
  /** Position in the list, used to cascade the reveal. */
  index?: number;
  /** Dims everything but the top result. */
  muted?: boolean;
};

export function ConfidenceBar({ label, value, index = 0, muted = false }: ConfidenceBarProps) {
  const progress = useSharedValue(0);
  const color = muted ? text.tertiary : confidenceColor(value);

  useEffect(() => {
    progress.value = withDelay(
      index * motion.stagger,
      withTiming(Math.max(0, Math.min(100, value)) / 100, {
        duration: motion.reveal,
        easing: EASE,
      })
    );
  }, [progress, value, index]);

  const fillStyle = useAnimatedStyle(() => ({
    // Reanimated interpolates the numeric part of a percentage string fine, and
    // a percentage keeps the fill correct regardless of the row's measured width.
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text
          numberOfLines={1}
          style={{
            ...typography.caption,
            color: muted ? text.tertiary : text.secondary,
            textTransform: 'capitalize',
            // Without this the label pushes the value off the row on long strings.
            flexShrink: 1,
            flexGrow: 1,
          }}
        >
          {label}
        </Text>
        <Text
          selectable
          style={{
            ...typography.caption,
            color: muted ? text.tertiary : text.primary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value.toFixed(1)}%
        </Text>
      </View>
      <View
        style={{
          height: 4,
          borderRadius: radius.pill,
          backgroundColor: line.core,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[{ height: '100%', borderRadius: radius.pill, backgroundColor: color }, fillStyle]}
        />
      </View>
    </View>
  );
}
