/**
 * Nested container: an outer shell holding an inner core, so a card reads as a
 * machined part rather than a rectangle floating on the background.
 *
 * The inner radius is derived from the outer radius minus the shell padding, so
 * the two curves stay concentric. Hardcoding both values is how this pattern
 * usually goes wrong.
 */

import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { line, radius, surface } from '@/theme/tokens';

type BezelProps = {
  children: ReactNode;
  /** Padding inside the core. */
  padding?: number;
  style?: ViewStyle;
  /** Override the core fill, e.g. to let an image bleed to the inner edge. */
  coreColor?: string;
  /** Drop the core's inset highlight, for cores that hold media rather than text. */
  flat?: boolean;
};

export function Bezel({ children, padding = 20, style, coreColor, flat = false }: BezelProps) {
  return (
    <View
      style={[
        {
          backgroundColor: surface.shell,
          borderRadius: radius.shell,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: line.shell,
          padding: radius.shellPadding,
        },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: coreColor ?? surface.core,
          borderRadius: radius.core,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: line.core,
          padding,
          overflow: 'hidden',
          // A one-pixel top highlight is what sells the "inset panel" read.
          boxShadow: flat ? undefined : 'inset 0 1px 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {children}
      </View>
    </View>
  );
}
