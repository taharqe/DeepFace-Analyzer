import SwiftUI

/// Small uppercase label that precedes a heading, giving it something to sit
/// against so the type has a hierarchy rather than a single loud size.
public struct Eyebrow: View {
    private let text: String
    private let tone: Color?

    public init(_ text: String, tone: Color? = nil) {
        self.text = text
        self.tone = tone
    }

    public var body: some View {
        Text(text.uppercased())
            .font(.dfEyebrow)
            .tracking(2)
            .foregroundStyle(tone ?? Theme.Ink.secondary)
            .padding(.horizontal, Theme.Space.md)
            .padding(.vertical, 5)
            .background(
                (tone ?? Color.white).opacity(tone == nil ? 0.04 : 0.10),
                in: .capsule
            )
            .overlay {
                Capsule().strokeBorder(
                    tone?.opacity(0.35) ?? Theme.Line.strong,
                    lineWidth: 1
                )
            }
    }
}

/// A short caution attached to a reading. Used wherever the model's output needs
/// a qualifier sitting directly beside it rather than buried in a help screen.
public struct CaveatNote: View {
    private let text: String
    private let tone: Color

    public init(_ text: String, tone: Color = Theme.Accent.amber) {
        self.text = text
        self.tone = tone
    }

    public var body: some View {
        HStack(alignment: .top, spacing: Theme.Space.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 11))
                .foregroundStyle(tone)
                .accessibilityHidden(true)

            Text(text)
                .font(.dfCaption)
                .foregroundStyle(Theme.Ink.tertiary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
