/**
 * Icon.
 *
 * SF Symbols are the right call on iOS — they inherit weight and optical sizing
 * from the system. They do not exist anywhere else, so Android and web fall back
 * to a unicode glyph rather than shipping a broken image box.
 */

import { Image } from 'expo-image';
import { Text, View, type ColorValue } from 'react-native';

import { text as textColor } from '@/theme/tokens';

/** SF Symbol name → fallback character for platforms without SF Symbols. */
const FALLBACK: Record<string, string> = {
  camera: '◉',
  photo: '▣',
  'face.smiling': '☺',
  person: '‣',
  calendar: '▤',
  globe: '◍',
  sparkles: '✦',
  'clock.arrow.circlepath': '↺',
  'info.circle': 'ⓘ',
  trash: '✕',
  'exclamationmark.triangle': '⚠',
  'chevron.right': '›',
  'arrow.up.right': '↗',
  'checkmark.circle': '✓',
};

type GlyphProps = {
  /** SF Symbol name. */
  name: string;
  size?: number;
  /**
   * Accepts `ColorValue` rather than `string` so navigator-supplied colours
   * (which may be opaque platform colours) pass through without a cast.
   */
  color?: ColorValue;
  /**
   * Describes the glyph for assistive tech. Omit when the glyph sits next to a
   * text label that already says the same thing — a duplicate reading is worse
   * than none.
   */
  label?: string;
};

export function Glyph({ name, size = 18, color = textColor.primary, label }: GlyphProps) {
  const a11y = label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

  if (process.env.EXPO_OS === 'ios') {
    return (
      <Image
        source={`sf:${name}`}
        tintColor={color as string}
        style={{ width: size, height: size }}
        {...a11y}
      />
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} {...a11y}>
      <Text style={{ fontSize: size * 0.86, lineHeight: size, color, textAlign: 'center' }}>
        {FALLBACK[name] ?? '•'}
      </Text>
    </View>
  );
}
