/**
 * Small uppercase label that precedes a heading, giving it something to sit
 * against so the type has a hierarchy rather than a single loud size.
 */

import { Text, View } from 'react-native';

import { line, radius, space, text, type as typography } from '@/theme/tokens';

export function Eyebrow({ children, tone }: { children: string; tone?: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: space.md,
        paddingVertical: 5,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: tone ? `${tone}55` : line.strong,
        backgroundColor: tone ? `${tone}1A` : 'rgba(255, 255, 255, 0.04)',
      }}
    >
      <Text
        style={{
          ...typography.eyebrow,
          color: tone ?? text.secondary,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}
