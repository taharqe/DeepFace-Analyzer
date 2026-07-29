/**
 * Skin analysis — public surface.
 *
 * Read `types.ts` before using any of this. The short version:
 *
 *   const reading = await heuristicAnalyzer.analyze({ uri });
 *
 *   if (!reading.captureQuality.usable) {
 *     // Ask for another photo. Do NOT show the numbers.
 *     // reading.captureQuality.flags says why.
 *   }
 *
 *   reading.proxies.evennessProxy.score   // 0-100, UNCALIBRATED
 *   reading.disclaimer                    // must be surfaced alongside it
 *
 * Three rules for anything that consumes a reading:
 *
 *  1. Check `captureQuality.usable` first. Statistics from a blown-out or
 *     defocused frame are well-formed and meaningless, which is worse than an
 *     error.
 *  2. Show `disclaimer` (or `HEURISTIC_DISCLAIMER_SHORT` with the full text
 *     one tap away) wherever a figure appears.
 *  3. Describe the measurement, never grade the person. "Your photo was
 *     evenly lit" is honest; "your skin tone is even" is not, and "your skin
 *     improved" is a claim this pipeline cannot support at all.
 *
 * `metrics.ts` is exported in full because it is pure and camera-free — it can
 * be exercised from a plain Node script with a hand-built buffer, which is the
 * only way any of this arithmetic gets checked today.
 */

export {
  AnalysisError,
  HEURISTIC_DISCLAIMER,
  HEURISTIC_DISCLAIMER_SHORT,
  LUMA_COEFFICIENTS,
  type AnalysisErrorCode,
  type AnalyzerInput,
  type CaptureQuality,
  type CaptureQualityFlag,
  type HeuristicSkinReading,
  type ImageStatistics,
  type ProxyBand,
  type ProxyKind,
  type ProxyScore,
  type ProxySet,
  type ReadingConfidence,
  type RgbaBitmap,
  type SkinAnalyzer,
  type SkinReading,
  type StatisticKey,
} from './types';

export {
  ALPHA_SAMPLE_THRESHOLD,
  BAND_LOW_CEILING,
  BAND_MID_CEILING,
  CLIP_HIGH_THRESHOLD,
  CLIP_LOW_THRESHOLD,
  QUALITY_THRESHOLDS,
  analyzeRgba,
  assessCaptureQuality,
  computeImageStatistics,
  decodeBase64,
  decodePng,
  deriveProxies,
  inflateRaw,
} from './metrics';

export {
  CROP_TO_CENTRE_SQUARE,
  DEFAULT_SAMPLE_SIZE,
  HEURISTIC_ANALYZER_ID,
  HEURISTIC_ANALYZER_VERSION,
  HeuristicAnalyzer,
  heuristicAnalyzer,
  type HeuristicAnalyzerOptions,
} from './analyzer';
