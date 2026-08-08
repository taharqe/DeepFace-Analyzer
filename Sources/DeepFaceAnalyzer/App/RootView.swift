import SwiftUI
import UIKit

/// The app's root. Host this from your app target's `App` body.
///
/// Owns the single `HistoryStore` and injects it into the environment, so the
/// Analyze and History tabs read the same session.
public struct RootView: View {
    @State private var history = HistoryStore()

    public init() {}

    public var body: some View {
        TabView {
            AnalyzeScreen()
                .tabItem {
                    Label("Analyze", systemImage: "sparkles")
                }

            HistoryScreen()
                .tabItem {
                    Label("History", systemImage: "clock.arrow.circlepath")
                }

            AboutScreen()
                .tabItem {
                    Label("About", systemImage: "info.circle")
                }
        }
        .environment(history)
        .tint(Theme.Accent.violet)
        // The palette is built for a dark world; following the system appearance
        // would strand light-mode users with white text on white surfaces.
        .preferredColorScheme(.dark)
        .background(Theme.Surface.base)
        .onAppear(perform: styleTabBar)
    }

    /// `TabView` still resolves its bar chrome through UIKit, so the dark
    /// treatment has to be set on the appearance proxy rather than in SwiftUI.
    private func styleTabBar() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Theme.Surface.core)
        appearance.shadowColor = UIColor(Theme.Line.core)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

#Preview {
    RootView()
}
