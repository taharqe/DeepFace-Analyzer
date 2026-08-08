import Foundation
import SwiftUI

/// One label from a score distribution, as a meter.
///
/// The bar grows from zero on appear rather than snapping, because the row is
/// usually the first thing drawn after a result arrives and the growth is what
/// communicates "this is a measured quantity, not a fact".
public struct ConfidenceBar: View {
    private let label: String
    /// 0–100.
    private let value: Double
    /// Position in the list, used to cascade the reveal.
    private let index: Int
    /// Dims everything but the top result.
    private let isMuted: Bool

    @State private var progress: Double = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(label: String, value: Double, index: Int = 0, isMuted: Bool = false) {
        self.label = label
        self.value = value
        self.index = index
        self.isMuted = isMuted
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: Theme.Space.sm) {
                Text(label.capitalized)
                    .font(.dfCaption)
                    .foregroundStyle(isMuted ? Theme.Ink.tertiary : Theme.Ink.secondary)
                    .lineLimit(1)
                    // Without this the label pushes the value off the row on long strings.
                    .truncationMode(.tail)

                Spacer(minLength: Theme.Space.sm)

                Text(String(format: "%.1f%%", value))
                    .font(.dfCaption)
                    .monospacedDigit()
                    .foregroundStyle(isMuted ? Theme.Ink.tertiary : Theme.Ink.primary)
                    .textSelection(.enabled)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.Line.core)
                    Capsule()
                        .fill(isMuted ? Theme.Ink.tertiary : Theme.confidenceColor(value))
                        .frame(width: geo.size.width * progress)
                }
            }
            .frame(height: 4)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue(Text("\(Int(value.rounded())) percent"))
        .onAppear {
            let target = min(max(value, 0), 100) / 100
            guard !reduceMotion else {
                progress = target
                return
            }
            withAnimation(Theme.Motion.reveal.delay(Double(index) * Theme.Motion.stagger)) {
                progress = target
            }
        }
    }
}
