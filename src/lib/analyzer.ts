/**
 * Analysis client.
 *
 * DeepFace is a Python library and its models cannot run on-device, so the app
 * posts an image to an inference endpoint and renders what comes back. Set
 * `EXPO_PUBLIC_ANALYZER_URL` to point at that service; with no URL configured the
 * app runs in demo mode so the interface is explorable without a backend.
 */

export type AttributeKey = 'age' | 'gender' | 'emotion' | 'race';

/** A single label within an attribute, with the model's confidence in it. */
export type Score = {
  label: string;
  /** 0-100. */
  confidence: number;
};

export type Attribute = {
  key: AttributeKey;
  /** Highest-scoring label. */
  dominant: string;
  /** Confidence in `dominant`, 0-100. */
  confidence: number;
  /** Full distribution, descending. Empty for continuous attributes like age. */
  scores: Score[];
};

export type Analysis = {
  id: string;
  uri: string;
  createdAt: number;
  /** Wall-clock milliseconds the request took. */
  elapsedMs: number;
  attributes: Attribute[];
};

export type AnalysisError = {
  /** Shown to the user. Always names a next step, never just the failure. */
  message: string;
  recoverable: boolean;
};

/**
 * How much weight each attribute's output can carry.
 *
 * `age` and `race` are surfaced with an explicit caveat because DeepFace's
 * published accuracy for both degrades sharply outside its training
 * distribution — most severely on darker skin tones for the race classifier.
 * The UI reads this to decide what disclosure to render alongside a result.
 */
export const ATTRIBUTE_META: Record<
  AttributeKey,
  { title: string; symbol: string; reliability: 'reported' | 'caveated' }
> = {
  emotion: { title: 'Expression', symbol: 'face.smiling', reliability: 'reported' },
  gender: { title: 'Predicted gender', symbol: 'person', reliability: 'caveated' },
  age: { title: 'Estimated age', symbol: 'calendar', reliability: 'caveated' },
  race: { title: 'Predicted ethnicity', symbol: 'globe', reliability: 'caveated' },
};

export const ANALYZER_URL = process.env.EXPO_PUBLIC_ANALYZER_URL ?? '';
export const IS_DEMO = ANALYZER_URL.length === 0;

function sortScores(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => b.confidence - a.confidence);
}

function buildAttribute(key: AttributeKey, raw: Record<string, number>): Attribute {
  const scores = sortScores(
    Object.entries(raw).map(([label, confidence]) => ({ label, confidence }))
  );
  return {
    key,
    dominant: scores[0]?.label ?? 'unknown',
    confidence: scores[0]?.confidence ?? 0,
    scores,
  };
}

/**
 * Demo results. Deterministic per image so a given photo always renders the same
 * card — random values on every open would read as a working model that changed
 * its mind, which is worse than an obviously fixed placeholder.
 */
function demoAnalysis(uri: string, elapsedMs: number): Analysis {
  let seed = 0;
  for (let i = 0; i < uri.length; i++) seed = (seed * 31 + uri.charCodeAt(i)) >>> 0;
  const pick = (n: number) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % n;
  };

  const spread = (labels: string[], top: number) => {
    const rest = 100 - top;
    const out: Record<string, number> = {};
    const others = labels.slice(1);
    let left = rest;
    others.forEach((label, i) => {
      const share = i === others.length - 1 ? left : Math.round((left / (others.length - i)) * 0.7);
      out[label] = Number(share.toFixed(1));
      left -= share;
    });
    out[labels[0]] = Number(top.toFixed(1));
    return out;
  };

  const emotions = ['neutral', 'happy', 'surprise', 'sad', 'angry', 'fear', 'disgust'];
  const genders = ['Woman', 'Man'];
  const races = ['asian', 'white', 'middle eastern', 'indian', 'latino hispanic', 'black'];

  const rotate = <T,>(xs: T[], by: number) => [...xs.slice(by % xs.length), ...xs.slice(0, by % xs.length)];

  const age = 21 + pick(38);
  return {
    id: `${Date.now()}-${pick(100000)}`,
    uri,
    createdAt: Date.now(),
    elapsedMs,
    attributes: [
      buildAttribute('emotion', spread(rotate(emotions, pick(7)), 46 + pick(38))),
      buildAttribute('gender', spread(rotate(genders, pick(2)), 62 + pick(34))),
      {
        key: 'age',
        dominant: `${age}`,
        confidence: 0,
        scores: [],
      },
      buildAttribute('race', spread(rotate(races, pick(6)), 38 + pick(40))),
    ],
  };
}

/**
 * Analyze one image.
 *
 * Throws {@link AnalysisError}-shaped objects so the caller can render a message
 * with a next step rather than a raw stack.
 */
export async function analyze(uri: string): Promise<Analysis> {
  const started = Date.now();

  if (IS_DEMO) {
    // Enough delay that the progress state is visible, short enough not to annoy.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return demoAnalysis(uri, Date.now() - started);
  }

  // Multipart rather than base64 JSON: the file streams straight off disk with no
  // 33% encoding overhead, which matters on a phone connection.
  const form = new FormData();
  form.append('image', {
    uri,
    name: 'upload.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(ANALYZER_URL, { method: 'POST', body: form });
  } catch {
    throw {
      message: 'Could not reach the analysis service. Check your connection and try again.',
      recoverable: true,
    } satisfies AnalysisError;
  }

  if (response.status === 422) {
    throw {
      message: 'No face was detected. Try a photo where the face is unobstructed and well lit.',
      recoverable: true,
    } satisfies AnalysisError;
  }

  if (!response.ok) {
    throw {
      message: `The analysis service returned ${response.status}. Try again in a moment.`,
      recoverable: true,
    } satisfies AnalysisError;
  }

  const payload = (await response.json()) as {
    age?: number;
    emotion?: Record<string, number>;
    gender?: Record<string, number>;
    race?: Record<string, number>;
  };

  const attributes: Attribute[] = [];
  if (payload.emotion) attributes.push(buildAttribute('emotion', payload.emotion));
  if (payload.gender) attributes.push(buildAttribute('gender', payload.gender));
  if (typeof payload.age === 'number') {
    attributes.push({ key: 'age', dominant: `${Math.round(payload.age)}`, confidence: 0, scores: [] });
  }
  if (payload.race) attributes.push(buildAttribute('race', payload.race));

  if (attributes.length === 0) {
    throw {
      message: 'The service returned no attributes for that image. Try a different photo.',
      recoverable: true,
    } satisfies AnalysisError;
  }

  return {
    id: `${Date.now()}-${Math.round(Math.random() * 1e5)}`,
    uri,
    createdAt: started,
    elapsedMs: Date.now() - started,
    attributes,
  };
}
