import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type RadiusToken } from '../../theme';

/**
 * Raised surface.
 *
 * Two rules from the corpus, both easy to break by accident:
 *
 *  - No borders. Anywhere. Separation comes from the 2% step between canvas
 *    (#F6F5F3) and surface (#FFFFFF) plus the single measured shadow. A 1px
 *    hairline is not in the system.
 *  - One shadow. There is no "elevated card" or "floating card" tier; the
 *    extraction found exactly one falloff profile across every raised element.
 */
export interface CardProps {
  children: React.ReactNode;
  /** Defaults to `lg` (22) - the section/tile radius. */
  radius?: RadiusToken;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  radius = 'lg',
  padded = true,
  style,
}: CardProps) {
  const t = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: t.color.palette.surface,
          borderRadius: t.radius[radius],
          padding: padded ? t.spacing.lg : 0,
        },
        t.shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
