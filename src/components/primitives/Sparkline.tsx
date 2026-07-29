import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '../../theme';

/**
 * Single-series trend line.
 *
 * SINGLE series on purpose. AURA has no categorical ramp: indigo and pink are
 * semantically reserved (commitment / selection) and the two score colours are a
 * status pair banded at 90 and 70, not identities. Plotting six tracked concerns
 * as six lines would need six invented hues, which breaks the two-accent rule and
 * would be unmarked invention besides. Small multiples - one of these per concern -
 * gets the same comparison across facets while every chart stays single-series.
 *
 * A single series also needs no legend: the card's own title says what is plotted,
 * and a one-swatch legend box would just restate it.
 *
 * Mark specs:
 *   line        2px, round join and cap
 *   area        series hue at 10% - a wash, never a saturated block
 *   end marker  r=4 (8px), series hue, with a 2px surface ring so it stays legible
 *               where it crosses the line
 *   baseline    hairline, solid, one step off surface
 *
 * [D] The baseline colour is the canvas token. The spec measures canvas as a 2%
 *     step from surface, which is exactly the "one step off surface, recessive"
 *     value a gridline wants - so the grid needs no new colour.
 *
 * Text never wears the data colour. Labels around this component use text tokens;
 * identity comes from the mark, not from tinting type. That matters more than usual
 * here, because indigo measures 4.19:1 on canvas and fails as text outright.
 */
export interface SparklineProps {
  /** Ordered oldest → newest. Fewer than 2 points renders nothing. */
  values: number[];
  height?: number;
  /** Draw the 10% area wash beneath the line. */
  area?: boolean;
  /** Draw a hairline at the series minimum. */
  baseline?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** [D] 40pt keeps a 12-point trend readable without competing with the value above it. */
const DEFAULT_HEIGHT = 40;
const STROKE = 2;
const DOT_R = 4;
const RING = 2;

export function Sparkline({
  values,
  height = DEFAULT_HEIGHT,
  area = true,
  baseline = false,
  style,
  accessibilityLabel,
}: SparklineProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const ready = width > 0 && values.length >= 2;

  // Inset by the end marker plus its ring so the dot is never clipped at the edges.
  const pad = DOT_R + RING;
  const w = Math.max(0, width - pad * 2);
  const h = Math.max(0, height - pad * 2);

  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series has no range; centre it rather than dividing by zero.
  const span = max - min || 1;

  const pt = (v: number, i: number): [number, number] => [
    pad + (i / (values.length - 1)) * w,
    pad + (max === min ? h / 2 : (1 - (v - min) / span) * h),
  ];

  const points = ready ? values.map(pt) : [];
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const fill = points.length
    ? `${line} L${points[points.length - 1][0]} ${height} L${points[0][0]} ${height} Z`
    : '';
  const last = points[points.length - 1];

  return (
    <View
      onLayout={onLayout}
      style={[{ height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ??
        `Trend, ${values.length} points, from ${values[0]} to ${values[values.length - 1]}`
      }
    >
      {ready ? (
        <Svg width={width} height={height}>
          {baseline ? (
            <Line
              x1={pad}
              y1={height - pad}
              x2={width - pad}
              y2={height - pad}
              stroke={t.color.palette.canvas}
              strokeWidth={1}
            />
          ) : null}

          {area ? (
            <Path d={fill} fill={t.color.palette.actionPrimary} fillOpacity={0.1} />
          ) : null}

          <Path
            d={line}
            stroke={t.color.palette.actionPrimary}
            strokeWidth={STROKE}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />

          {/* Surface ring first, then the dot on top - the ring is a mark, not a border. */}
          <Circle
            cx={last[0]}
            cy={last[1]}
            r={DOT_R + RING / 2}
            fill={t.color.palette.surface}
          />
          <Circle cx={last[0]} cy={last[1]} r={DOT_R} fill={t.color.palette.actionPrimary} />
        </Svg>
      ) : null}
    </View>
  );
}
