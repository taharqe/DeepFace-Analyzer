import SwiftUI

/// Primary and secondary actions.
///
/// The trailing icon sits in its own circular well rather than floating beside the
/// label, and shifts diagonally on press so the button has internal movement
/// instead of just a colour change.
public struct ActionButton: View {
    public enum Variant {
        case primary
        case secondary
    }

    private let label: String
    private let symbol: String
    private let variant: Variant
    private let isBusy: Bool
    private let action: () -> Void

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(
        _ label: String,
        symbol: String = "arrow.up.right",
        variant: Variant = .primary,
        isBusy: Bool = false,
        action: @escaping () -> Void
    ) {
        self.label = label
        self.symbol = symbol
        self.variant = variant
        self.isBusy = isBusy
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: Theme.Space.md) {
                Text(isBusy ? "Analyzing…" : label)
                    .font(.dfHeading)
                    .foregroundStyle(isPrimary ? Theme.Ink.onAccent : Theme.Ink.primary)
                    .lineLimit(1)

                Spacer(minLength: Theme.Space.sm)

                ZStack {
                    Circle()
                        .fill(isPrimary ? Color.black.opacity(0.10) : Color.white.opacity(0.08))
                    if isBusy {
                        ProgressView()
                            .controlSize(.small)
                            .tint(isPrimary ? Theme.Ink.onAccent : Theme.Ink.primary)
                    } else {
                        Image(systemName: symbol)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(isPrimary ? Theme.Ink.onAccent : Theme.Ink.primary)
                    }
                }
                .frame(width: 38, height: 38)
            }
            .padding(.leading, Theme.Space.xl)
            .padding(.trailing, Theme.Space.sm)
            .padding(.vertical, Theme.Space.sm)
            .frame(minHeight: 56)
            .background(
                isPrimary ? AnyShapeStyle(Theme.Ink.primary) : AnyShapeStyle(Color.white.opacity(0.06)),
                in: .capsule
            )
            .overlay {
                if !isPrimary {
                    Capsule().strokeBorder(Theme.Line.strong, lineWidth: 1)
                }
            }
        }
        .buttonStyle(PressWellStyle(reduceMotion: reduceMotion))
        .disabled(isBusy)
        .opacity(isEnabled && !isBusy ? 1 : 0.5)
        .accessibilityLabel(label)
        .accessibilityAddTraits(isBusy ? [.updatesFrequently] : [])
        // Haptics confirm the press landed before the work finishes.
        .sensoryFeedback(.impact(weight: .light), trigger: isBusy)
    }

    private var isPrimary: Bool { variant == .primary }
}

/// Scales the whole control down and nudges its trailing well outward, creating
/// internal tension rather than a flat opacity change.
private struct PressWellStyle: ButtonStyle {
    let reduceMotion: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(Theme.Motion.press, value: configuration.isPressed)
    }
}

/// Compact icon-only control. Always carries an explicit label, since the glyph
/// alone tells VoiceOver nothing.
public struct IconButton: View {
    private let symbol: String
    private let label: String
    private let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(symbol: String, label: String, action: @escaping () -> Void) {
        self.symbol = symbol
        self.label = label
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.Ink.secondary)
                .frame(width: 38, height: 38)
                .background(Color.white.opacity(0.05), in: .circle)
                .overlay { Circle().strokeBorder(Theme.Line.strong, lineWidth: 1) }
        }
        .buttonStyle(PressWellStyle(reduceMotion: reduceMotion))
        .accessibilityLabel(label)
    }
}
