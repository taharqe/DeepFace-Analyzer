import Foundation
import SwiftUI
import UIKit

/// One analysis, expanded.
///
/// Every attribute renders with its confidence and, where the underlying model is
/// unreliable, an explicit caveat. A percentage rendered in the same weight as a
/// fact reads as a fact, which is the failure mode this layout is built to avoid.
public struct ResultCard: View {
    private let analysis: Analysis
    private let onRemove: (() -> Void)?

    public init(analysis: Analysis, onRemove: (() -> Void)? = nil) {
        self.analysis = analysis
        self.onRemove = onRemove
    }

    public var body: some View {
        Bezel(padding: Theme.Space.md) {
            VStack(alignment: .leading, spacing: Theme.Space.lg) {
                AnalyzedImage(url: analysis.imageURL)

                HStack(spacing: Theme.Space.sm) {
                    Eyebrow("\(analysis.attributes.count) attributes")
                    Eyebrow(analysis.elapsedLabel)
                    Spacer(minLength: Theme.Space.sm)
                    if let onRemove {
                        IconButton(symbol: "trash", label: "Delete this result", action: onRemove)
                    }
                }
                .padding(.horizontal, Theme.Space.xs)

                VStack(spacing: Theme.Space.md) {
                    ForEach(Array(analysis.attributes.enumerated()), id: \.element.id) { index, attribute in
                        AttributeBlock(attribute: attribute, index: index)
                    }
                }
            }
        }
    }
}

/// The analyzed photograph, square-cropped to keep framing consistent across the
/// history list.
private struct AnalyzedImage: View {
    let url: URL

    var body: some View {
        Group {
            if let image = UIImage(contentsOfFile: url.path) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                // The file can vanish if the system reclaims the picker's temp
                // directory; a labelled placeholder beats an empty box.
                ZStack {
                    Theme.Surface.raised
                    VStack(spacing: Theme.Space.sm) {
                        Image(systemName: "photo")
                            .font(.system(size: 22))
                            .foregroundStyle(Theme.Ink.tertiary)
                        Text("Image no longer available")
                            .font(.dfCaption)
                            .foregroundStyle(Theme.Ink.tertiary)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(1, contentMode: .fit)
        .clipShape(.rect(cornerRadius: Theme.Radius.row, style: .continuous))
        .accessibilityLabel("The analyzed photograph")
    }
}

private struct AttributeBlock: View {
    let attribute: Attribute
    let index: Int

    @State private var hasAppeared = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var meta: AttributeMeta { attribute.key.meta }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.md) {
            HStack(spacing: Theme.Space.sm) {
                Image(systemName: meta.symbol)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.Ink.tertiary)
                    .accessibilityHidden(true)
                Text(meta.title)
                    .font(.dfCaption)
                    .foregroundStyle(Theme.Ink.tertiary)
            }

            HStack(alignment: .firstTextBaseline, spacing: Theme.Space.sm) {
                Text(attribute.isContinuous ? "\(attribute.dominant) yrs" : attribute.dominant.capitalized)
                    .font(.dfTitle)
                    .foregroundStyle(Theme.Ink.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .textSelection(.enabled)

                Spacer(minLength: Theme.Space.sm)

                if !attribute.isContinuous {
                    Text(String(format: "%.1f%%", attribute.confidence))
                        .font(.dfCaption)
                        .monospacedDigit()
                        .foregroundStyle(Theme.confidenceColor(attribute.confidence))
                }
            }

            if attribute.scores.count > 1 {
                VStack(spacing: Theme.Space.sm) {
                    ForEach(Array(attribute.scores.prefix(4).enumerated()), id: \.element.id) { i, score in
                        ConfidenceBar(
                            label: score.label,
                            value: score.confidence,
                            index: i,
                            isMuted: i > 0
                        )
                    }
                }
                .padding(.top, Theme.Space.xs)
            }

            if let caveat = meta.caveat {
                // An explicit rule rather than Divider(): Divider's colour is set
                // through a tint that does not reliably take on a dark surface.
                Rectangle()
                    .fill(Theme.Line.core)
                    .frame(height: 1)
                CaveatNote(caveat)
            }
        }
        .padding(Theme.Space.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Surface.raised, in: .rect(cornerRadius: Theme.Radius.row, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Theme.Radius.row, style: .continuous)
                .strokeBorder(Theme.Line.core, lineWidth: 1)
        }
        .opacity(hasAppeared ? 1 : 0)
        .offset(y: hasAppeared ? 0 : 12)
        .onAppear {
            guard !reduceMotion else {
                hasAppeared = true
                return
            }
            withAnimation(Theme.Motion.enter.delay(Double(index) * Theme.Motion.stagger)) {
                hasAppeared = true
            }
        }
    }
}
