import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from '../primitives';

/**
 * The assistant speech bubble.
 *
 * [M] #F9F4F8 - warm lilac. The spec is emphatic that this colour is for the
 *     speech bubble ONLY. It is the third background in a system that
 *     otherwise runs on canvas and surface, and spending it anywhere else
 *     would cost the assistant its distinct voice on screen.
 *
 * Ink on it measures 18.12:1.
 */
export interface AssistantBubbleProps {
  children: string;
  style?: StyleProp<ViewStyle>;
}

export function AssistantBubble({ children, style }: AssistantBubbleProps) {
  const t = useTheme();

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: t.color.palette.assistant,
          borderRadius: t.radius.lg,
          paddingHorizontal: t.spacing.lg,
          paddingVertical: t.spacing.md,
        },
        style,
      ]}
    >
      <Text variant="body.lg">{children}</Text>
    </View>
  );
}
