/**
 * One analysis, expanded.
 *
 * Every attribute renders with its confidence and, where the underlying model is
 * unreliable, an explicit caveat. A percentage rendered in the same weight as a
 * fact reads as a fact, which is the failure mode this layout is built to avoid.
 */

import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Bezel } from '@/components/bezel';
import { ConfidenceBar } from '@/components/confidence-bar';
import { Eyebrow } from '@/components/eyebrow';
import { Glyph } from '@/components/glyph';
import { IconButton } from '@/components/action-button';
import {
  ATTRIBUTE_META,
  type Analysis,
  type Attribute,
} from '@/lib/analyzer';
import {
  accent,
  confidenceColor,
  line,
  motion,
  radius,
  space,
  surface,
  text,
  type as typography,
} from '@/theme/tokens';

function elapsedLabel(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function AttributeBlock({ attribute, index }: { attribute: Attribute; index: number }) {
  const meta = ATTRIBUTE_META[attribute.key];
  const isContinuous = attribute.scores.length === 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * motion.stagger).duration(motion.enter)}
      style={{
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.row,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: line.core,
        backgroundColor: surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Glyph name={meta.symbol} size={15} color={text.tertiary} />
        <Text style={{ ...typography.caption, color: text.tertiary, flexShrink: 1 }}>
          {meta.title}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: space.sm,
        }}
      >
        <Text
          selectable
          numberOfLines={1}
          style={{
            ...typography.title,
            color: text.primary,
            textTransform: isContinuous ? 'none' : 'capitalize',
            flexShrink: 1,
          }}
        >
          {isContinuous ? `${attribute.dominant} yrs` : attribute.dominant}
        </Text>
        {!isContinuous && (
          <Text
            selectable
            style={{
              ...typography.caption,
              color: confidenceColor(attribute.confidence),
              fontVariant: ['tabular-nums'],
            }}
          >
            {attribute.confidence.toFixed(1)}%
          </Text>
        )}
      </View>

      {attribute.scores.length > 1 && (
        <View style={{ gap: space.sm, paddingTop: space.xs }}>
          {attribute.scores.slice(0, 4).map((score, i) => (
            <ConfidenceBar
              key={score.label}
              label={score.label}
              value={score.confidence}
              index={i}
              muted={i > 0}
            />
          ))}
        </View>
      )}

      {meta.reliability === 'caveated' && (
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            paddingTop: space.sm,
            borderTopWidth: 1,
            borderTopColor: line.core,
          }}
        >
          <Glyph name="exclamationmark.triangle" size={13} color={accent.amber} />
          <Text style={{ ...typography.caption, color: text.tertiary, flex: 1 }}>
            {attribute.key === 'age'
              ? 'Age estimates carry a typical error of several years and skew with lighting and pose.'
              : attribute.key === 'race'
                ? 'This classifier has documented accuracy disparities across skin tones. Treat it as a low-confidence signal, not an identification.'
                : 'A binary prediction that does not describe how a person identifies.'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export function ResultCard({
  analysis,
  onRemove,
}: {
  analysis: Analysis;
  onRemove?: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(motion.enter)}>
      <Bezel padding={space.md}>
        <View style={{ gap: space.lg }}>
          <View
            style={{
              borderRadius: radius.row,
              borderCurve: 'continuous',
              overflow: 'hidden',
              backgroundColor: surface.raised,
            }}
          >
            <Image
              source={{ uri: analysis.uri }}
              style={{ width: '100%', aspectRatio: 1 }}
              contentFit="cover"
              transition={200}
              accessibilityLabel="The analyzed photograph"
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.sm,
              paddingHorizontal: space.xs,
            }}
          >
            <View style={{ flexDirection: 'row', gap: space.sm, flexShrink: 1 }}>
              <Eyebrow>{`${analysis.attributes.length} attributes`}</Eyebrow>
              <Eyebrow>{elapsedLabel(analysis.elapsedMs)}</Eyebrow>
            </View>
            {onRemove && <IconButton icon="trash" label="Delete this result" onPress={onRemove} />}
          </View>

          <View style={{ gap: space.md }}>
            {analysis.attributes.map((attribute, i) => (
              <AttributeBlock key={attribute.key} attribute={attribute} index={i} />
            ))}
          </View>
        </View>
      </Bezel>
    </Animated.View>
  );
}
