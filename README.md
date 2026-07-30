# DeepFace Analyzer

An Expo app for running DeepFace facial attribute analysis and reading the result
alongside the model's confidence in it.

The previous version of this project was a Streamlit web app. It was removed and
rebuilt here as a React Native app targeting iOS, Android, and web.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. No custom native build is required — every native
module in use ships inside Expo Go.

## Connecting an inference service

DeepFace is a Python library and its models cannot run on-device, so the app posts
each image to an endpoint and renders the response.

```bash
EXPO_PUBLIC_ANALYZER_URL=https://your-service.example/analyze npx expo start
```

The endpoint receives a `multipart/form-data` POST with the image under the field
name `image`, and should return DeepFace's attribute objects:

```json
{
  "age": 31,
  "emotion": { "neutral": 62.4, "happy": 21.1, "sad": 8.0 },
  "gender": { "Woman": 71.2, "Man": 28.8 },
  "race": { "asian": 40.1, "white": 22.6, "black": 14.0 }
}
```

Return `422` when no face is detected — the app renders a specific message for that
case rather than a generic failure.

**With no URL set, the app runs in demo mode.** Results are generated locally from a
hash of the image URI. They are deterministic per image and are not predictions. The
Analyze screen says so on-screen; this is for exercising the interface, not for
evaluating a model.

## What the app does not claim

Facial attribute inference is unreliable in ways that a confidence percentage
rendered in a clean interface tends to obscure. The About tab states this in the
product, and the result cards repeat it next to the specific attributes affected:

- **Ethnicity prediction** has documented accuracy disparities across skin tones and
  was never validated for consequential use.
- **Gender** is returned as one of two classes, which is a property of the training
  data and not of people.
- **Age** carries several years of typical error and shifts with lighting and pose.
- **Faces are biometric data.** Analyzing someone else's photograph may require their
  consent depending on jurisdiction.

Results are held in memory for the session only. Nothing is written to disk.

## Layout

```
src/
  app/
    _layout.tsx           Root stack, theme, history provider
    (tabs)/
      _layout.tsx         Tab bar
      index.tsx           Analyze — pick or capture, run, read the result
      history.tsx         Session results and aggregate stats
      about.tsx           Model limitations and service configuration
  components/
    aurora.tsx            Ambient backdrop
    bezel.tsx             Nested container with concentric radii
    action-button.tsx     Primary/secondary actions, icon button
    confidence-bar.tsx    One score from a distribution, as a meter
    result-card.tsx       One analysis, expanded
    stat-tile.tsx         A number and its label
    eyebrow.tsx           Small uppercase label
    glyph.tsx             SF Symbols on iOS, unicode fallback elsewhere
  lib/
    analyzer.ts           Inference client, demo mode, attribute metadata
    store.tsx             In-memory session history
  theme/
    tokens.ts             Colour, type, spacing, radii, motion
```

## Checks

```bash
npx tsc --noEmit                      # types
npx expo lint                         # lint
npx expo export --platform android    # bundle
```
