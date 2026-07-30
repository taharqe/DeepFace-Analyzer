import SwiftUI

/// Ambient backdrop: soft colour fields behind the content, so the near-black
/// page reads as lit rather than flat.
///
/// The layer is static. A drifting orb would animate continuously behind every
/// screen for a decorative gain that no user is waiting on, and it would keep the
/// GPU awake while the content above it scrolls.
public struct Aurora: View {
    public init() {}

    public var body: some View {
        ZStack {
            Theme.Surface.base

            orb(Theme.Accent.violet, radius: 260, opacity: 0.30)
                .offset(x: -140, y: -280)

            orb(Theme.Accent.emerald, radius: 210, opacity: 0.18)
                .offset(x: 160, y: -20)

            orb(Theme.Accent.violet, radius: 240, opacity: 0.16)
                .offset(x: -100, y: 320)
        }
        .ignoresSafeArea()
        // Decoration only — VoiceOver should walk straight past it.
        .accessibilityHidden(true)
    }

    private func orb(_ color: Color, radius: CGFloat, opacity: Double) -> some View {
        RadialGradient(
            gradient: Gradient(colors: [color.opacity(opacity), color.opacity(0)]),
            center: .center,
            startRadius: 0,
            endRadius: radius
        )
        .frame(width: radius * 2, height: radius * 2)
    }
}
