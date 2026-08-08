# DeepFace Analyzer

A SwiftUI app for running DeepFace facial attribute analysis and reading the result
alongside the model's confidence in it.

Shipped as a Swift package so it opens in Xcode without a checked-in `.xcodeproj`.
The UI layer is complete; there is no backend yet, and the app runs in demo mode
until you point it at one.

## Getting it running

1. **Xcode → File → New → Project → iOS → App.** Name it `DeepFaceAnalyzer`,
   interface SwiftUI, minimum deployment **iOS 17**.
2. **Add this package.** File → Add Package Dependencies → Add Local → select this
   repository folder. Add the `DeepFaceAnalyzer` library to your app target.
3. **Replace the generated app file** with `AppTarget/DeepFaceAnalyzerApp.swift`.
4. **Merge `AppTarget/Info.plist`** into your target's Info settings. The two usage
   description keys are mandatory — iOS terminates the app on first camera or photo
   access if either is missing, with no prompt.
5. Build and run.

## Connecting an inference service

DeepFace is a Python library; its models cannot run on-device. The app posts each
image to an endpoint and renders the response.

Set `ANALYZER_URL` in `Info.plist`, or as an environment variable on your Xcode
scheme. The endpoint receives a `multipart/form-data` POST with the image under the
field name `image`, and should return DeepFace's attribute objects:

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

**With no URL set, the app runs in demo mode.** Results are derived from a hash of
the image path: deterministic per photo, and not predictions. The Analyze screen
says so on-screen.

## What the app does not claim

Facial attribute inference is unreliable in ways that a confidence percentage
rendered in a polished interface tends to obscure. The About tab states this in the
product, and result cards repeat it beside the specific attributes affected:

- **Ethnicity prediction** has documented accuracy disparities across skin tones and
  was never validated for consequential use.
- **Gender** is returned as one of two classes, which is a property of the training
  data and not of people.
- **Age** carries several years of typical error and shifts with lighting and pose.
- **Faces are biometric data.** Analyzing someone else's photograph may require their
  consent depending on jurisdiction.

Results live in memory for the session only. Picked images are written to the caches
directory, never to documents, so the system can reclaim them under pressure.

## Layout

```
Package.swift
AppTarget/                      Files for your Xcode app target (not in the package)
  DeepFaceAnalyzerApp.swift     @main entry point
  Info.plist                    Usage descriptions and ANALYZER_URL
Sources/DeepFaceAnalyzer/
  App/RootView.swift            Tab shell, owns the HistoryStore
  Screens/
    AnalyzeScreen.swift         Pick or capture, run, read the result
    HistoryScreen.swift         Session results and aggregate stats
    AboutScreen.swift           Model limitations and service configuration
  Components/
    Aurora.swift                Ambient radial-gradient backdrop
    Bezel.swift                 Nested container with concentric radii
    ActionButton.swift          Primary/secondary actions, icon button
    ConfidenceBar.swift         One score from a distribution, as a meter
    ResultCard.swift            One analysis, expanded
    StatTile.swift              A number and its label
    Eyebrow.swift               Small uppercase label, caveat note
    CameraPicker.swift          UIImagePickerController bridge, image caching
  Models/
    Analysis.swift              Attribute types and reliability metadata
    AnalyzerClient.swift        Inference client, demo mode
    HistoryStore.swift          Observable session history
  Theme/Tokens.swift            Colour, type, spacing, radii, motion
```

## Verification status

This was written on Linux, where SwiftUI cannot compile. What has been checked:

- **Syntax:** all 18 Swift sources pass `swiftc -parse` under Swift 6.0.3.
- **Manifest:** `swift package dump-package` resolves cleanly.

What has **not** been checked: type-checking against SwiftUI, UIKit, and PhotosUI,
and anything visual. The first Xcode build is the real test.

## Previews

Every screen and the main components carry `#Preview` blocks, so the Xcode canvas
works as soon as the package opens — no need to build and run to see the design.

| Preview | Where |
| --- | --- |
| Analyze | `Screens/AnalyzeScreen.swift` |
| History — populated / empty | `Screens/HistoryScreen.swift` |
| About | `Screens/AboutScreen.swift` |
| Result card | `Theme/PreviewSupport.swift` |
| Buttons | `Theme/PreviewSupport.swift` |
| Confidence thresholds | `Theme/PreviewSupport.swift` |
| Stat row | `Theme/PreviewSupport.swift` |

Fixtures live in `Theme/PreviewSupport.swift` behind `#if DEBUG`, so none of it
reaches a release build. The fixture image URL deliberately does not resolve, so
result cards render their "image no longer available" placeholder in the canvas.
