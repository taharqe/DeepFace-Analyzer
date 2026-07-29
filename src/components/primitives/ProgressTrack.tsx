import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme';

/**
 * Filled track - onboarding step progress, analysis progress.
 *
 * The fill is indigo because a progress track is a commitment signal: it says
 * "this is going somewhere". Pink here would read as selection and break the
 * two-accent rule.
 */
export interface ProgressTrackProps {
  /** 0..1. Clamped. */
  value: number;
  /** [D] 4pt - the smallest spacing step. */
  height?: number;
  /** Track colour behind the fill. Defaults to canvas. */
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ProgressTrack({
  value,
  height = 4,
  trackColor,
  style,
  accessibilityLabel,
}: ProgressTrackProps) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          height,
          borderRadius: t.radius.capsule,
          backgroundColor: trackColor ?? t.color.palette.canvas,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: t.radius.capsule,
          backgroundColor: t.color.palette.actionPrimary,
        }}
      />
    </View>
  );
}
