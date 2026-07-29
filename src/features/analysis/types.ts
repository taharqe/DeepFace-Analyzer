/**
 * Skin-analysis pipeline — types and constants.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SUBSYSTEM IS
 * ---------------------------------------------------------------------------
 * It measures a PHOTOGRAPH. It does not examine a person.
 *
 * Everything below describes statistics of an image buffer: how bright it is,
 * how much its brightness varies, how far the red channel sits from the mean of
 * the other two, and how much detail there is between neighbouring pixels.
 * Those four things are genuinely computable and are computed exactly, from
 * real pixels, deterministically. They are real numbers about an image.
 *
 * They are NOT a finding about skin. There is no trained model behind this, no
 * validation set, no ground truth and no clinical standard. A number that goes
 * up when someone stands nearer a window is not a number that went up because
 * their skin changed.
 *
 * ---------------------------------------------------------------------------
 * HOW THE TYPES ENFORCE THAT
 * ---------------------------------------------------------------------------
 * The distinction is structural, not just documented, so that a future caller
 * cannot quietly present a proxy as a diagnosis:
 *
 *  - {@link SkinReading} carries `confidence: 'heuristic'` as a discriminant.
 *    A model-backed reading would add a second member to
 *    {@link ReadingConfidence} and every `switch` over it would stop compiling.
 *  - Every derived figure is a {@link ProxyScore}, which carries
 *    `isDiagnostic: false` and `calibration: 'uncalibrated-heuristic'` as
 *    literal types. Neither can be widened by assignment.
 *  - Field names say what the number is (`evennessProxy`, `rednessProxy`),
 *    never what a marketer would like it to be (`skinHealth`, `skinAge`).
 *  - `disclaimer` is typed as `typeof HEURISTIC_DISCLAIMER`, so a reading
 *    cannot be constructed carrying softened wording.
 *
 * ---------------------------------------------------------------------------
 * PROVENANCE
 * ---------------------------------------------------------------------------
 * [M] measured   [D] derived   [E] estimated / proposed
 *
 * The 50-capture corpus behind `docs/MEASUREMENT-SPEC.md` measured a design
 * system, not an analysis pipeline. It contains no scan output, no scoring and
 * no ground truth. So almost every constant in this subsystem is [E], and each
 * one is marked at its definition together with the reason it was chosen.
 *
 * The two exceptions are marked [M] because they come from a published
 * standard rather than from this project's guesswork:
 * {@link LUMA_COEFFICIENTS} (ITU-R BT.709) and the PNG format constants in
 * `metrics.ts` (RFC 2083 / RFC 1950 / RFC 1951).
 */

/* -------------------------------------------------------------------------- */
/* The disclaimer                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The text the UI is expected to surface next to any figure from this
 * subsystem.
 *
 * [E] Wording is a proposal and wants a review pass from someone who
 *     understands the regulatory line between a cosmetic claim and a medical
 *     one. It is written to fail safe: it says what was measured, says what
 *     was not, names the confounders, and points at a clinician.
 *
 * It is deliberately part of {@link SkinReading} rather than a UI string. A
 * screen that renders a reading has the disclaimer in hand; there is no path
 * that produces numbers without it.
 */
export const HEURISTIC_DISCLAIMER =
  'These figures are statistics computed from a photograph — its brightness, ' +
  'how evenly that brightness is spread, how far its red channel sits from ' +
  'green and blue, and how much fine detail it contains. They are not a ' +
  'medical or cosmetic assessment. Nothing here has been validated against a ' +
  'clinical or dermatological standard, and it cannot detect, diagnose or ' +
  'rule out any skin condition. Lighting, camera, distance, make-up and ' +
  'screen all move these numbers more than skin does. Talk to a doctor or a ' +
  'pharmacist about anything that worries you.';

/**
 * Short form, for places with no room for the full text — a caption under a
 * dial, a chart footnote. It must never be the ONLY disclosure on a screen:
 * {@link HEURISTIC_DISCLAIMER} has to be reachable from anywhere a figure is
 * shown.
 */
export const HEURISTIC_DISCLAIMER_SHORT =
  'Image statistics, not a diagnosis. Lighting changes these numbers.';

/* -------------------------------------------------------------------------- */
/* Colour science                                                             */
/* -------------------------------------------------------------------------- */

/**
 * [M] ITU-R BT.709-6 luma coefficients, applied to GAMMA-ENCODED sRGB.
 *
 * Not invented here — they are the standard's own values. Applying them to
 * gamma-encoded rather than linearised samples yields luma (Y'), which is the
 * conventional input for image-statistics work such as variance and local
 * contrast. It is NOT the linear relative luminance used by the WCAG contrast
 * formula, so do not reuse this for contrast auditing; `src/theme` owns that.
 */
export const LUMA_COEFFICIENTS = {
  red: 0.2126,
  green: 0.7152,
  blue: 0.0722,
} as const;

/* -------------------------------------------------------------------------- */
/* Raw statistics                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Statistics computed directly from pixels. Every field is an exact function
 * of the input buffer — no anchors, no tuning, no interpretation.
 *
 * These are the honest layer. If a future reviewer trusts nothing else in this
 * subsystem, they can still trust that these numbers describe the bitmap that
 * was handed in, because `metrics.ts` computes them with arithmetic a reader
 * can check by hand.
 */
export interface ImageStatistics {
  /** Mean luma Y' over all sampled pixels. Range 0-1. */
  readonly meanLuminance: number;
  /**
   * Population standard deviation of luma Y'. Range 0-0.5 in principle (a
   * two-level black/white image); real photographs sit far lower.
   *
   * Low means the frame is evenly lit OR flat and featureless — the statistic
   * cannot tell those apart, which is why {@link CaptureQuality} exists.
   */
  readonly luminanceStdDev: number;
  /**
   * Mean absolute difference between each interior pixel's luma and the mean
   * luma of its 3x3 neighbourhood. Range 0-1; typical photographs are small,
   * on the order of 1e-3 to 1e-1.
   *
   * A high-pass detail measure. Dominated by focus, sharpening and resampling
   * at least as much as by anything in front of the lens.
   */
  readonly localContrast: number;
  /**
   * Mean of `R' - (G' + B') / 2` over all sampled pixels. Range -1 to +1.
   * Positive means the frame leans red relative to the other two channels.
   *
   * This is an a*-LIKE channel separation and nothing more. It is not CIELAB
   * a*: there is no white-point adaptation, no linearisation and no opponent
   * transform. Any white balance error moves it directly.
   */
  readonly rednessSeparation: number;
  /** Mean of each channel over all sampled pixels. Range 0-1. */
  readonly channelMeans: {
    readonly red: number;
    readonly green: number;
    readonly blue: number;
  };
  /**
   * Largest gap between any two channel means. Range 0-1. A white-balance /
   * colour-cast indicator: a neutral frame sits near 0.
   */
  readonly channelSpread: number;
  /** Fraction of pixels whose every channel is at or above the clipping ceiling. Range 0-1. */
  readonly clippedHighFraction: number;
  /** Fraction of pixels whose every channel is at or below the crush floor. Range 0-1. */
  readonly clippedLowFraction: number;
  /** How many pixels went into the figures above. */
  readonly sampleCount: number;
  /** Dimensions of the buffer the figures were computed from. */
  readonly width: number;
  readonly height: number;
}

/** The statistics a {@link ProxyScore} is allowed to name as its source. */
export type StatisticKey =
  | 'meanLuminance'
  | 'luminanceStdDev'
  | 'localContrast'
  | 'rednessSeparation';

/* -------------------------------------------------------------------------- */
/* Proxies                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The four quantities this pipeline is willing to put a 0-100 needle on.
 *
 * Every name ends in the thing it actually is. There is deliberately no
 * `hydration`, `poreCount`, `wrinkleDepth` or `skinAge` here: none of those
 * are computable from a mean and a variance, and inventing them is exactly
 * the failure this codebase is trying not to repeat.
 */
export type ProxyKind =
  /** Brightness of the frame. Mostly a statement about the light in the room. */
  | 'brightness'
  /** Inverse of luma spread. High = brightness is uniform ACROSS THE FRAME. */
  | 'evenness'
  /** Red-channel separation. High = the frame leans red. */
  | 'redness'
  /** Fine local detail. High = lots of pixel-scale structure. */
  | 'textureProminence';

/**
 * Where a score sits on its own 0-100 scale. Nothing more.
 *
 * These are NOT verdicts. 'high' evenness is not "good skin" and 'high'
 * redness is not "irritation" — a red jumper in frame does the same thing.
 * User-facing copy must describe the measurement, never grade the person.
 */
export type ProxyBand = 'low' | 'mid' | 'high';

/**
 * One 0-100 figure derived from one statistic.
 *
 * `isDiagnostic: false` and `calibration: 'uncalibrated-heuristic'` are
 * literal types, not booleans-with-a-comment. They cannot be set to anything
 * else, so a `ProxyScore` can never be laundered into something that claims
 * more than it is.
 */
export interface ProxyScore {
  readonly proxyOf: ProxyKind;
  /** 0-100, rounded to one decimal place. Position on an arbitrary scale. */
  readonly score: number;
  /** Which band {@link score} falls in. Describes the score, not the person. */
  readonly band: ProxyBand;
  /** The statistic this was derived from. */
  readonly derivedFrom: StatisticKey;
  /** That statistic's own value, in its own units, before any rescaling. */
  readonly rawValue: number;
  /**
   * Always `'uncalibrated-heuristic'`. The mapping from `rawValue` to `score`
   * uses [E] anchors chosen to span a plausible range — see `PROXY_RAMPS` in
   * `metrics.ts`. They have never been fitted to a capture set, let alone to
   * an outcome. Re-anchor them before any copy interprets the number.
   */
  readonly calibration: 'uncalibrated-heuristic';
  /** Always `false`. See the file header. */
  readonly isDiagnostic: false;
}

/** The four proxies, keyed so callers can address one without a search. */
export interface ProxySet {
  readonly brightnessProxy: ProxyScore;
  readonly evennessProxy: ProxyScore;
  readonly rednessProxy: ProxyScore;
  readonly textureProminenceProxy: ProxyScore;
}

/* -------------------------------------------------------------------------- */
/* Capture quality                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Reasons a frame is not worth computing statistics from.
 *
 * This matters more than the statistics do. A blown-out or out-of-focus frame
 * still produces perfectly well-formed numbers, and those numbers are noise.
 * Showing them anyway is how an app ends up implying a change in someone's
 * skin when all that changed was the weather.
 */
export type CaptureQualityFlag =
  /** Frame is too dark for the statistics to separate anything. */
  | 'too-dark'
  /** Frame is too bright; highlight detail is gone. */
  | 'too-bright'
  /** A large share of pixels are at the top of the range and carry no detail. */
  | 'clipped-highlights'
  /** A large share of pixels are at the bottom of the range. */
  | 'crushed-shadows'
  /** Almost no pixel-scale structure: out of focus, or not a face. */
  | 'low-detail'
  /** Channel means are far apart: coloured light, or a strong white-balance error. */
  | 'strong-colour-cast';

export interface CaptureQuality {
  /**
   * `true` only when no flag fired.
   *
   * [E] Deliberately strict. The cost of refusing a usable frame is that
   *     someone retakes a photo; the cost of accepting a bad one is a number
   *     about a person's skin that is really a number about a lamp.
   */
  readonly usable: boolean;
  readonly flags: readonly CaptureQualityFlag[];
}

/* -------------------------------------------------------------------------- */
/* The reading                                                                */
/* -------------------------------------------------------------------------- */

/**
 * How much weight a reading may be given.
 *
 * One member today, on purpose. When a validated model is dropped in behind
 * {@link SkinAnalyzer}, add `'model'` here — every exhaustive `switch` in the
 * app then fails to compile until it has been told how to present the
 * stronger claim. That noisy break is the point.
 */
export type ReadingConfidence = 'heuristic';

/** A reading produced by image statistics alone. */
export interface HeuristicSkinReading {
  readonly confidence: 'heuristic';
  /** Which analyzer produced this. See {@link SkinAnalyzer.id}. */
  readonly analyzerId: string;
  /**
   * Analyzer version. Bump it whenever a constant in `metrics.ts` moves:
   * two readings are only comparable when this matches, and a trend chart
   * that silently mixes versions is a fabricated trend.
   */
  readonly analyzerVersion: string;
  /** Epoch ms, supplied by the caller — never read from a clock in pure code. */
  readonly capturedAt: number;
  /** The exact, uninterpreted figures. */
  readonly statistics: ImageStatistics;
  /** The 0-100 rescalings. Uncalibrated — see {@link ProxyScore.calibration}. */
  readonly proxies: ProxySet;
  /** Whether the frame was worth analysing at all. Check this first. */
  readonly captureQuality: CaptureQuality;
  /** Always {@link HEURISTIC_DISCLAIMER}. Typed so it cannot be softened. */
  readonly disclaimer: typeof HEURISTIC_DISCLAIMER;
}

/**
 * The union of every reading kind. One member today; see
 * {@link ReadingConfidence}.
 */
export type SkinReading = HeuristicSkinReading;

/* -------------------------------------------------------------------------- */
/* Analyzer interface                                                         */
/* -------------------------------------------------------------------------- */

/** A decoded bitmap: 4 bytes per pixel, row-major, no padding. */
export interface RgbaBitmap {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/** What an analyzer is handed. */
export interface AnalyzerInput {
  /**
   * Local file URI (`file://…`) or a base64 data URI. Whatever
   * `CameraView.takePictureAsync` returned is fine.
   */
  readonly uri: string;
  /**
   * Epoch ms to stamp on the reading. Defaults to the analyzer's injected
   * clock. Pass it explicitly to keep a test deterministic.
   */
  readonly capturedAt?: number;
}

/**
 * The pluggable seam.
 *
 * A real model — on-device or server-side — drops in here without any caller
 * changing, provided it can honestly widen {@link ReadingConfidence}. Until
 * one exists, {@link HeuristicAnalyzer} is the only implementation, and it
 * reports itself as heuristic.
 */
export interface SkinAnalyzer {
  /** Stable identifier recorded on every reading. */
  readonly id: string;
  /** See {@link HeuristicSkinReading.analyzerVersion}. */
  readonly version: string;
  analyze(image: AnalyzerInput): Promise<SkinReading>;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Why an analysis could not be produced.
 *
 * Failure is a first-class outcome here. The alternative — returning a
 * plausible-looking reading when the image could not be read — is the single
 * worst thing this subsystem could do.
 */
export type AnalysisErrorCode =
  /** expo-image-manipulator could not load, resize or re-encode the source. */
  | 'image-load-failed'
  /** The re-encode returned no base64 payload. */
  | 'no-image-data'
  /** The bytes are not a PNG this decoder supports. */
  | 'unsupported-image-format'
  /** The PNG is structurally broken, or its zlib stream is. */
  | 'image-decode-failed'
  /** The decoded bitmap has no pixels, or its dimensions disagree with its length. */
  | 'empty-image';

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AnalysisError';
    this.code = code;
    // Required for `instanceof` to survive the ES5 class-extends downlevel that
    // some React Native transform chains still apply to built-in subclasses.
    Object.setPrototypeOf(this, AnalysisError.prototype);
  }
}
