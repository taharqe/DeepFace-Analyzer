import SwiftUI

/// Nested container: an outer shell holding an inner core, so a card reads as a
/// machined part rather than a rectangle floating on the background.
///
/// The inner radius is derived from the outer radius minus the shell padding, so
/// the two curves stay concentric. Hardcoding both values is how this pattern
/// usually goes wrong.
public struct Bezel<Content: View>: View {
    private let padding: CGFloat
    private let coreColor: Color
    /// Media-bearing cores drop the inset highlight — it reads as a smudge over
    /// a photograph rather than as a lit edge.
    private let showsHighlight: Bool
    private let content: Content

    public init(
        padding: CGFloat = Theme.Space.xl,
        coreColor: Color = Theme.Surface.core,
        showsHighlight: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self.padding = padding
        self.coreColor = coreColor
        self.showsHighlight = showsHighlight
        self.content = content()
    }

    public var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(coreColor, in: .rect(cornerRadius: Theme.Radius.core, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Theme.Radius.core, style: .continuous)
                    .strokeBorder(Theme.Line.core, lineWidth: 1)
            }
            .overlay {
                if showsHighlight {
                    // A one-point top highlight is what sells the "inset panel" read.
                    RoundedRectangle(cornerRadius: Theme.Radius.core, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [Color.white.opacity(0.10), .clear],
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            lineWidth: 1
                        )
                        .allowsHitTesting(false)
                }
            }
            .padding(Theme.Radius.shellPadding)
            .background(Theme.Surface.shell, in: .rect(cornerRadius: Theme.Radius.shell, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Theme.Radius.shell, style: .continuous)
                    .strokeBorder(Theme.Line.shell, lineWidth: 1)
            }
    }
}
