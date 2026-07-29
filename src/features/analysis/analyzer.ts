/**
 * Skin-analysis pipeline — the analyzer seam and its heuristic implementation.
 *
 * ---------------------------------------------------------------------------
 * WHAT expo-image-manipulator 57.0.6 ACTUALLY EXPOSES
 * ---------------------------------------------------------------------------
 * Checked against `node_modules/expo-image-manipulator/build/*.d.ts` rather
 * than remembered, because the API changed to a context/render form and the
 * old `manipulateAsync` is deprecated in this version. What exists:
 *
 *   ImageManipulator.manipulate(source: string | SharedRef<'image'>)
 *       -> ImageManipulatorContext          (chainable, synchronous)
 *   context.resize({ width?, height? })     -> ImageManipulatorContext
 *   context.crop({ originX, originY, width, height })
 *   context.renderAsync()                   -> Promise<ImageRef>
 *   imageRef.width / imageRef.height        (numbers)
 *   imageRef.saveAsync({ base64, compress, format }) -> Promise<ImageResult>
 *   ImageResult.base64?: string
 *
 * THERE IS NO RAW PIXEL ACCESS. `base64` is the base64 of an ENCODED file —
 * PNG, JPEG or WebP — not a pixel buffer. The package exposes nothing that
 * returns samples. So the pipeline asks for PNG (lossless, and the only format
 * whose container is simple enough to decode without a dependency), then
 * decodes it in `metrics.ts`. House rule 3 forbids pulling in `pngjs` or
 * `base64-js`, so both decoders are written out there against their RFCs.
 *
 * JPEG is deliberately not supported: a baseline JPEG decoder is a Huffman
 * stage, a dequantiser, an inverse DCT and a chroma upsampler, and getting any
 * of that subtly wrong would produce plausible pixels and therefore plausible
 * wrong numbers. Requesting PNG avoids the whole question.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT WIRED
 * ---------------------------------------------------------------------------
 * This file takes a URI. Nothing in the app produces one yet: the Scan screen
 * is still a `useState` over a gradient, and `expo-camera` is installed but
 * unused. Whoever owns the capture UI calls `takePictureAsync`, hands the
 * resulting `uri` to {@link HeuristicAnalyzer.analyze}, and surfaces
 * `reading.captureQuality` and `reading.disclaimer`. No change is needed here.
 *
 * Provenance: [M] measured / from a standard, [D] derived, [E] estimated.
 */

import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from 'expo-image-manipulator';

import { analyzeRgba, decodeBase64, decodePng } from './metrics';
import {
  AnalysisError,
  type AnalyzerInput,
  type RgbaBitmap,
  type SkinAnalyzer,
  type SkinReading,
} from './types';

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

/** Stable id recorded on every reading this analyzer produces. */
export const HEURISTIC_ANALYZER_ID = 'heuristic-image-statistics';

/**
 * [E] Version of the heuristic pipeline.
 *
 * Bump this whenever anything that changes a number changes: a `PROXY_RAMPS`
 * anchor, a `QUALITY_THRESHOLDS` value, {@link DEFAULT_SAMPLE_SIZE}, the crop
 * rule, or the statistics themselves. Readings only mean the same thing as
 * each other when this string matches, and a trend line drawn across a version
 * boundary is a fabricated trend.
 */
export const HEURISTIC_ANALYZER_VERSION = '0.1.0';

/* -------------------------------------------------------------------------- */
/* Sampling                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * [E] Edge length of the square the statistics are computed from: 64px.
 *
 * Chosen for three reasons, none of them measured:
 *   - 64x64 is 4096 pixels, enough for a stable mean and variance while small
 *     enough that a hand-written PNG inflate finishes without a visible pause.
 *   - Downscaling averages away sensor noise, which would otherwise dominate
 *     `localContrast` in dim light.
 *   - It is small enough that the buffer can be kept in memory and thrown away
 *     without ever writing pixel data of someone's face to disk.
 *
 * The cost is real and worth stating: at 64px, everything at the scale of a
 * pore or a fine line is gone. `textureProminence` measures image detail that
 * SURVIVED the downscale — it is not a measurement of skin texture, and the
 * ramp that scores it is anchored to this size (see `PROXY_RAMPS`). Changing
 * this constant invalidates that ramp and every stored reading.
 */
export const DEFAULT_SAMPLE_SIZE = 64;

/**
 * [E] The centre square of the frame is what gets measured.
 *
 * There is no face detection in this app and none is available within the
 * allowed dependencies. A centre crop is the honest fallback: it matches where
 * a capture UI would put an alignment guide, and it keeps some of the
 * background out of the statistics. It does NOT isolate skin. Hair, clothing,
 * a bright window behind the subject and the wall all still contribute — most
 * visibly to `rednessSeparation`, which a red jumper moves as readily as a
 * flushed cheek. Any copy derived from these numbers has to survive that fact.
 */
export const CROP_TO_CENTRE_SQUARE = true;

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

export interface HeuristicAnalyzerOptions {
  /** Edge length of the analysed square. Defaults to {@link DEFAULT_SAMPLE_SIZE}. */
  readonly sampleSize?: number;
  /**
   * Clock used when `AnalyzerInput.capturedAt` is omitted. Injected so tests
   * can be deterministic; the pipeline itself never reads a clock.
   */
  readonly now?: () => number;
}

/* -------------------------------------------------------------------------- */
/* Decode path                                                                */
/* -------------------------------------------------------------------------- */

/**
 * URI in, RGBA out.
 *
 * Split out from `analyze` so the native half of the work is one readable
 * function, and so a future model-backed analyzer can reuse it.
 */
async function loadBitmap(
  uri: string,
  sampleSize: number
): Promise<RgbaBitmap> {
  let source: ImageRef | null = null;
  let sampled: ImageRef | null = null;
  let base64: string | undefined;

  try {
    // Render once with no operations, purely to learn the source dimensions:
    // `ImageManipulatorContext` is synchronous and chainable but exposes no
    // size, and the crop rectangle cannot be computed without one.
    source = await ImageManipulator.manipulate(uri).renderAsync();

    const { width, height } = source;
    if (!(width > 0) || !(height > 0)) {
      throw new AnalysisError(
        'empty-image',
        `Image reports dimensions ${width}x${height}.`
      );
    }

    let context = ImageManipulator.manipulate(source);

    if (CROP_TO_CENTRE_SQUARE) {
      const side = Math.min(width, height);
      context = context.crop({
        originX: Math.floor((width - side) / 2),
        originY: Math.floor((height - side) / 2),
        width: side,
        height: side,
      });
    }

    // Never upscale: interpolating a small image up would manufacture
    // smooth gradients and quietly lower `localContrast`.
    const target = Math.min(sampleSize, Math.min(width, height));
    sampled = await context.resize({ width: target, height: target }).renderAsync();

    // PNG because it is lossless and decodable here. `compress` is ignored for
    // PNG but is passed explicitly so a later format change cannot silently
    // start applying lossy compression to the pixels being measured.
    const result = await sampled.saveAsync({
      base64: true,
      compress: 1,
      format: SaveFormat.PNG,
    });
    base64 = result.base64;
  } catch (cause) {
    if (cause instanceof AnalysisError) throw cause;
    throw new AnalysisError(
      'image-load-failed',
      `Could not load or resize the image at ${uri}.`,
      { cause }
    );
  } finally {
    // Release the native bitmaps rather than waiting for the JS collector.
    // These are full-resolution camera frames; holding two of them until a
    // GC happens is how a scan screen runs out of memory on a mid-range phone.
    source?.release();
    sampled?.release();
  }

  if (base64 === undefined || base64.length === 0) {
    throw new AnalysisError(
      'no-image-data',
      'The image was re-encoded but no base64 payload came back.'
    );
  }

  return decodePng(decodeBase64(base64));
}

/* -------------------------------------------------------------------------- */
/* The analyzer                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The default {@link SkinAnalyzer}: real image statistics, no model.
 *
 * It computes exactly four things about a photograph — mean luma, luma spread,
 * red-channel separation and local contrast — and rescales them onto
 * uncalibrated 0-100 dials. Every reading it returns carries
 * `confidence: 'heuristic'`, a `disclaimer`, and per-figure
 * `isDiagnostic: false`.
 *
 * WHAT IT CANNOT DO, stated plainly so nobody has to infer it: it cannot see a
 * face, cannot tell skin from background, cannot detect a spot, a line, a
 * pore, dryness or irritation, and cannot tell a change in someone's skin from
 * a change in the light. Nothing it produces has been checked against ground
 * truth of any kind, because there is none in this project.
 *
 * Replacing it with a real model means implementing {@link SkinAnalyzer} and
 * widening `ReadingConfidence` in `types.ts`. Every consumer breaks loudly at
 * that point, which is the intended way to force a conversation about what the
 * new thing is allowed to claim.
 */
export class HeuristicAnalyzer implements SkinAnalyzer {
  readonly id = HEURISTIC_ANALYZER_ID;
  readonly version = HEURISTIC_ANALYZER_VERSION;

  private readonly sampleSize: number;
  private readonly now: () => number;

  constructor(options: HeuristicAnalyzerOptions = {}) {
    const requested = options.sampleSize ?? DEFAULT_SAMPLE_SIZE;
    if (!Number.isInteger(requested) || requested < 3) {
      throw new AnalysisError(
        'empty-image',
        `sampleSize must be an integer of at least 3; got ${requested}. ` +
          'Local contrast needs a 3x3 neighbourhood to exist at all.'
      );
    }
    this.sampleSize = requested;
    this.now = options.now ?? Date.now;
  }

  async analyze(image: AnalyzerInput): Promise<SkinReading> {
    const bitmap = await loadBitmap(image.uri, this.sampleSize);

    return analyzeRgba(bitmap.data, bitmap.width, bitmap.height, {
      analyzerId: this.id,
      analyzerVersion: this.version,
      capturedAt: image.capturedAt ?? this.now(),
    });
  }
}

/**
 * A ready-made instance for callers with nothing to configure.
 *
 * Stateless, so sharing one is safe. Construct your own `HeuristicAnalyzer`
 * when a test needs a fixed clock or a different sample size.
 */
export const heuristicAnalyzer: SkinAnalyzer = new HeuristicAnalyzer();
