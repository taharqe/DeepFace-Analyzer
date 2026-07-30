import SwiftUI

/// A single number with its label. Used in the History summary row.
public struct StatTile: View {
    private let value: String
    private let label: String
    private let tone: Color?

    public init(value: String, label: String, tone: Color? = nil) {
        self.value = value
        self.label = label
        self.tone = tone
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            Text(value)
                .font(.dfMetric)
                .monospacedDigit()
                .foregroundStyle(tone ?? Theme.Ink.primary)
                .lineLimit(1)
                // Long values shrink rather than truncate — a clipped number is
                // worse than a small one.
                .minimumScaleFactor(0.6)
                .textSelection(.enabled)

            Text(label)
                .font(.dfCaption)
                .foregroundStyle(Theme.Ink.tertiary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.Space.lg)
        .background(Theme.Surface.raised, in: .rect(cornerRadius: Theme.Radius.row, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Theme.Radius.row, style: .continuous)
                .strokeBorder(Theme.Line.core, lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
    }
}
