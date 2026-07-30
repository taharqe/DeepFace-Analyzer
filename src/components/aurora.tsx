/**
 * Ambient backdrop: soft colour fields behind the content, so the near-black
 * page reads as lit rather than flat.
 *
 * React Native has no radial gradient, so each orb is a stack of concentric
 * circles with decaying opacity. That approximates the falloff at a fraction of
 * the cost of a real blur pass, and — unlike a blur — it does not force a GPU
 * repaint while the content above it scrolls.
 *
 * The layer is static. A drifting orb would animate continuously behind every
 * screen for a decorative gain that no user is waiting on.
 */

import { View } from 'react-native';

import { accent, surface } from '@/theme/tokens';

type OrbProps = {
  color: string;
  size: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  /** Peak opacity at the centre. Kept low so text contrast never depends on it. */
  intensity?: number;
};

const RINGS = 6;

function Orb({ color, size, top, bottom, left, right, intensity = 0.16 }: OrbProps) {
  return (
    <View
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: RINGS }).map((_, i) => {
        // Outermost ring first, so the densest circle paints last and sits on top.
        const scale = 1 - i / RINGS;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: size * scale,
              height: size * scale,
              borderRadius: (size * scale) / 2,
              backgroundColor: color,
              opacity: intensity / RINGS,
            }}
          />
        );
      })}
    </View>
  );
}

export function Aurora() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: surface.base }}
      // The backdrop is decoration; screen readers should walk straight past it.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Orb color={accent.violet} size={420} top={-140} left={-120} intensity={0.22} />
      <Orb color={accent.emerald} size={340} top={180} right={-140} intensity={0.14} />
      <Orb color={accent.violet} size={380} bottom={-160} left={-60} intensity={0.12} />
    </View>
  );
}
