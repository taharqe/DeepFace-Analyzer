#if DEBUG
import Foundation
import SwiftUI

/// Fixture data for Xcode canvas previews.
///
/// Compiled only in debug, so none of this reaches a release build.
enum PreviewData {
    /// A URL that intentionally does not resolve. The result card renders its
    /// "image no longer available" placeholder, which is the correct preview for
    /// a canvas with no photo library behind it.
    static let placeholderImage = URL(fileURLWithPath: "/dev/null/preview.jpg")

    static let analysis = Analysis(
        imageURL: placeholderImage,
        elapsed: 1.24,
        attributes: [
            Attribute(
                key: .emotion,
                distribution: ["neutral": 62.4, "happy": 21.1, "surprise": 8.9, "sad": 4.2, "angry": 3.4]
            ),
            Attribute(key: .gender, distribution: ["Woman": 71.2, "Man": 28.8]),
            Attribute(key: .age, dominant: "31", confidence: 0, scores: []),
            Attribute(
                key: .race,
                distribution: ["asian": 40.1, "white": 22.6, "middle eastern": 15.3, "black": 14.0, "indian": 8.0]
            )
        ]
    )

    /// A second result with a weaker top score, so the confidence colours are
    /// visible across their thresholds rather than all reading green.
    static let lowConfidenceAnalysis = Analysis(
        imageURL: placeholderImage,
        elapsed: 0.62,
        attributes: [
            Attribute(key: .emotion, distribution: ["sad": 38.2, "neutral": 31.0, "fear": 18.4, "angry": 12.4]),
            Attribute(key: .gender, distribution: ["Man": 54.1, "Woman": 45.9]),
            Attribute(key: .age, dominant: "47", confidence: 0, scores: [])
        ]
    )

    /// A store with results already in it, for previewing History's populated state.
    static var populatedHistory: HistoryStore {
        let store = HistoryStore()
        store.add(lowConfidenceAnalysis)
        store.add(analysis)
        return store
    }
}

// MARK: - Component previews

#Preview("Result card") {
    ZStack {
        Aurora()
        ScrollView {
            ResultCard(analysis: PreviewData.analysis)
                .padding(Theme.Space.xl)
        }
    }
    .preferredColorScheme(.dark)
}

#Preview("Buttons") {
    ZStack {
        Aurora()
        VStack(spacing: Theme.Space.md) {
            ActionButton("Analyze", symbol: "sparkles") {}
            ActionButton("Analyzing", symbol: "sparkles", isBusy: true) {}
            ActionButton("Camera", symbol: "camera", variant: .secondary) {}
            HStack {
                IconButton(symbol: "trash", label: "Delete") {}
                Eyebrow("4 attributes")
                Eyebrow("Read this first", tone: Theme.Accent.amber)
            }
        }
        .padding(Theme.Space.xl)
    }
    .preferredColorScheme(.dark)
}

#Preview("Confidence thresholds") {
    ZStack {
        Aurora()
        Bezel {
            VStack(spacing: Theme.Space.md) {
                ConfidenceBar(label: "high", value: 88.4)
                ConfidenceBar(label: "medium", value: 61.2)
                ConfidenceBar(label: "low", value: 32.7)
                ConfidenceBar(label: "muted sibling", value: 12.1, isMuted: true)
            }
        }
        .padding(Theme.Space.xl)
    }
    .preferredColorScheme(.dark)
}

#Preview("Stat row") {
    ZStack {
        Aurora()
        HStack(spacing: Theme.Space.md) {
            StatTile(value: "12", label: "Analyzed")
            StatTile(value: "1.4s", label: "Avg. time")
            StatTile(value: "68%", label: "Avg. confidence", tone: Theme.Accent.emerald)
        }
        .padding(Theme.Space.xl)
    }
    .preferredColorScheme(.dark)
}
#endif
