import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { Aurora } from '@/components/aurora';
import { Bezel } from '@/components/bezel';
import { Eyebrow } from '@/components/eyebrow';
import { Glyph } from '@/components/glyph';
import { ResultCard } from '@/components/result-card';
import { analyze, IS_DEMO, type Analysis, type AnalysisError } from '@/lib/analyzer';
import { useHistory } from '@/lib/store';
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

/** Square crop keeps the framing consistent across the result grid. */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

export default function AnalyzeScreen() {
  const { add } = useHistory();
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = useCallback(async (source: 'camera' | 'library') => {
    setError(null);

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Camera access is off. Turn it on in Settings to take a photo, or pick one from your library instead.'
          : 'Photo access is off. Turn it on in Settings, or use the camera instead.'
      );
      return;
    }

    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

    if (picked.canceled) return;

    setUri(picked.assets[0].uri);
    // A new image invalidates the previous result; leaving it on screen would
    // pair the old numbers with the new photo.
    setResult(null);
  }, []);

  const run = useCallback(async () => {
    if (!uri) return;
    setBusy(true);
    setError(null);
    try {
      const analysis = await analyze(uri);
      setResult(analysis);
      add(analysis);
    } catch (caught) {
      setError((caught as AnalysisError).message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }, [uri, add]);

  const reset = useCallback(() => {
    setUri(null);
    setResult(null);
    setError(null);
  }, []);

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
          <Eyebrow tone={accent.violet}>On-image analysis</Eyebrow>
          <Text style={{ ...typography.display, color: text.primary }}>
            Read a face,{'\n'}with its uncertainty.
          </Text>
          <Text style={{ ...typography.body, color: text.secondary, maxWidth: 320 }}>
            Every attribute comes back with the model&apos;s confidence attached, and a note where
            that confidence should not be trusted.
          </Text>
        </Animated.View>

        {IS_DEMO && (
          <Animated.View entering={FadeIn.delay(motion.stagger).duration(motion.enter)}>
            <View
              style={{
                flexDirection: 'row',
                gap: space.md,
                padding: space.lg,
                borderRadius: radius.row,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: `${accent.amber}44`,
                backgroundColor: `${accent.amber}12`,
              }}
            >
              <Glyph name="exclamationmark.triangle" size={16} color={accent.amber} />
              <Text style={{ ...typography.caption, color: text.secondary, flex: 1 }}>
                Demo mode. No inference service is configured, so results are generated locally and
                are not real predictions. Set{' '}
                <Text style={{ color: text.primary }}>EXPO_PUBLIC_ANALYZER_URL</Text> to connect a
                DeepFace backend.
              </Text>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(motion.stagger).duration(motion.reveal)}>
          <Bezel padding={space.md}>
            <View style={{ gap: space.lg }}>
              <View
                style={{
                  aspectRatio: 1,
                  borderRadius: radius.row,
                  borderCurve: 'continuous',
                  overflow: 'hidden',
                  backgroundColor: surface.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: uri ? 0 : 1,
                  borderColor: line.core,
                  borderStyle: uri ? 'solid' : 'dashed',
                }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={220}
                    accessibilityLabel="Selected photograph, ready to analyze"
                  />
                ) : (
                  <View style={{ alignItems: 'center', gap: space.md, padding: space.xl }}>
                    <Glyph name="photo" size={30} color={text.tertiary} />
                    <Text
                      style={{
                        ...typography.caption,
                        color: text.tertiary,
                        textAlign: 'center',
                        maxWidth: 220,
                      }}
                    >
                      Choose a photo with one clearly visible, well-lit face.
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: space.md }}>
                <ActionButton
                  label="Camera"
                  icon="camera"
                  variant="secondary"
                  onPress={() => choose('camera')}
                  style={{ flex: 1, paddingLeft: space.lg }}
                />
                <ActionButton
                  label="Library"
                  icon="photo"
                  variant="secondary"
                  onPress={() => choose('library')}
                  style={{ flex: 1, paddingLeft: space.lg }}
                />
              </View>

              {uri && (
                <Animated.View entering={FadeIn.duration(motion.enter)} style={{ gap: space.md }}>
                  <ActionButton
                    label={result ? 'Analyze again' : 'Analyze'}
                    icon="sparkles"
                    onPress={run}
                    busy={busy}
                  />
                  <ActionButton
                    label="Clear"
                    icon="trash"
                    variant="secondary"
                    onPress={reset}
                    style={{ paddingLeft: space.lg }}
                  />
                </Animated.View>
              )}
            </View>
          </Bezel>
        </Animated.View>

        {error && (
          <Animated.View
            entering={FadeIn.duration(motion.enter)}
            // Announced without stealing focus from whatever the user is doing.
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <View
              style={{
                flexDirection: 'row',
                gap: space.md,
                padding: space.lg,
                borderRadius: radius.row,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: `${accent.rose}55`,
                backgroundColor: `${accent.rose}14`,
              }}
            >
              <Glyph name="exclamationmark.triangle" size={16} color={accent.rose} />
              <Text selectable style={{ ...typography.caption, color: text.primary, flex: 1 }}>
                {error}
              </Text>
            </View>
          </Animated.View>
        )}

        {result && <ResultCard analysis={result} />}
      </ScrollView>
    </View>
  );
}
