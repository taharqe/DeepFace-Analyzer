/**
 * Primary and secondary actions.
 *
 * The trailing icon sits in its own circular well rather than floating beside the
 * label, and shifts diagonally on press so the button has internal movement
 * instead of just a colour change.
 */

import * as Haptics from 'expo-haptics';
import { Pressable, Text, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Glyph } from '@/components/glyph';
import { line, motion, radius, space, text, type as typography } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EASE = Easing.bezier(...motion.easeOut);

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  /** SF Symbol for the trailing well. */
  icon?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Replaces the label while work is in flight. */
  busy?: boolean;
  style?: ViewStyle;
};

export function ActionButton({
  label,
  onPress,
  icon = 'arrow.up.right',
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: ActionButtonProps) {
  const pressed = useSharedValue(0);
  const isPrimary = variant === 'primary';
  const inert = disabled || busy;

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
  }));

  const wellStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressed.value * 3 },
      { translateY: pressed.value * -3 },
      { scale: 1 + pressed.value * 0.06 },
    ],
  }));

  // Plain functions, not useCallback: a shared value is already stable, and
  // naming it as a hook dependency trips the compiler's immutability rule.
  const handlePressIn = () => {
    pressed.value = withTiming(1, { duration: motion.press, easing: EASE });
  };

  const handlePressOut = () => {
    pressed.value = withTiming(0, { duration: motion.press, easing: EASE });
  };

  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.md,
          paddingLeft: space.xl,
          paddingRight: space.sm,
          paddingVertical: space.sm,
          minHeight: 56,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: isPrimary ? 'transparent' : line.strong,
          backgroundColor: isPrimary ? text.primary : 'rgba(255, 255, 255, 0.06)',
          opacity: inert ? 0.5 : 1,
        },
        containerStyle,
        style,
      ]}
    >
      <Text
        style={{
          ...typography.heading,
          color: isPrimary ? text.onAccent : text.primary,
        }}
      >
        {busy ? 'Analyzing…' : label}
      </Text>
      <Animated.View
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isPrimary ? 'rgba(5, 5, 5, 0.1)' : 'rgba(255, 255, 255, 0.08)',
          },
          wellStyle,
        ]}
      >
        <Glyph
          name={busy ? 'sparkles' : icon}
          size={18}
          color={isPrimary ? text.onAccent : text.primary}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

/** Compact icon-only control. Always carries an explicit label. */
export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: motion.press, easing: EASE });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: motion.press, easing: EASE });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: line.strong,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        animatedStyle,
      ]}
    >
      <Glyph name={icon} size={16} color={text.secondary} />
    </AnimatedPressable>
  );
}
