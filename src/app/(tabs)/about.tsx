import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Aurora } from '@/components/aurora';
import { Bezel } from '@/components/bezel';
import { Eyebrow } from '@/components/eyebrow';
import { Glyph } from '@/components/glyph';
import { ANALYZER_URL, IS_DEMO } from '@/lib/analyzer';
import {
  accent,
  line,
  motion,
  radius,
  space,
  surface,
  text,
  type as typography,
} from '@/theme/tokens';

const LIMITATIONS = [
  {
    title: 'Ethnicity prediction is unreliable',
    body: 'DeepFace’s race classifier has documented accuracy disparities across skin tones and was never validated for consequential use. It is shown here with a caveat because hiding it would be worse than labelling it, but it should not drive any decision about a person.',
  },
  {
    title: 'Gender is a binary guess',
    body: 'The model returns two classes. That is a property of its training data, not of people, and it says nothing about how anyone identifies.',
  },
  {
    title: 'Age carries years of error',
    body: 'Estimates shift with lighting, pose, expression, and image quality. Treat the number as a range, not a value.',
  },
  {
    title: 'Faces are personal data',
    body: 'In many jurisdictions facial analysis is regulated biometric processing. Analyzing someone else’s photograph may require their consent.',
  },
];

function Row({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * motion.stagger).duration(motion.enter)}
      style={{
        gap: space.sm,
        padding: space.lg,
        borderRadius: radius.row,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: line.core,
        backgroundColor: surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Glyph name="exclamationmark.triangle" size={14} color={accent.amber} />
        <Text style={{ ...typography.heading, color: text.primary, flex: 1 }}>{title}</Text>
      </View>
      <Text style={{ ...typography.caption, color: text.secondary }}>{body}</Text>
    </Animated.View>
  );
}

export default function AboutScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.section,
          paddingBottom: space.section,
          gap: space.xl,
        }}
      >
        <Animated.View entering={FadeInDown.duration(motion.reveal)} style={{ gap: space.md }}>
          <Eyebrow tone={accent.amber}>Read this first</Eyebrow>
          <Text style={{ ...typography.display, color: text.primary }}>What this{'\n'}can&apos;t tell you.</Text>
          <Text style={{ ...typography.body, color: text.secondary, maxWidth: 320 }}>
            The interface reports what the model returned. That is not the same as what is true, and
            for several attributes the gap is wide.
          </Text>
        </Animated.View>

        <View style={{ gap: space.md }}>
          {LIMITATIONS.map((item, i) => (
            <Row key={item.title} title={item.title} body={item.body} index={i} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(motion.stagger * 4).duration(motion.reveal)}>
          <Bezel>
            <View style={{ gap: space.md }}>
              <Text style={{ ...typography.heading, color: text.primary }}>Inference service</Text>
              <Text style={{ ...typography.caption, color: text.secondary }}>
                DeepFace runs in Python and cannot execute on-device. The app posts an image to an
                endpoint and renders the response.
              </Text>
              <View
                style={{
                  padding: space.md,
                  borderRadius: radius.row,
                  borderCurve: 'continuous',
                  backgroundColor: surface.raised,
                  borderWidth: 1,
                  borderColor: line.core,
                }}
              >
                <Text
                  selectable
                  style={{ ...typography.caption, color: IS_DEMO ? accent.amber : accent.emerald }}
                >
                  {IS_DEMO ? 'Demo mode — results are generated locally' : ANALYZER_URL}
                </Text>
              </View>
              <Text style={{ ...typography.caption, color: text.tertiary }}>
                Set EXPO_PUBLIC_ANALYZER_URL to a service that accepts{' '}
                <Text style={{ color: text.secondary }}>{'{ image: base64 }'}</Text> and returns
                DeepFace attribute objects.
              </Text>
            </View>
          </Bezel>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
