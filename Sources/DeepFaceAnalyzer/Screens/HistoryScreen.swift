import Foundation
import SwiftUI

/// Session results and aggregate stats.
public struct HistoryScreen: View {
    @Environment(HistoryStore.self) private var history
    @State private var isConfirmingClear = false

    public init() {}

    public var body: some View {
        ZStack {
            Aurora()

            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.xl) {
                    header

                    if history.results.isEmpty {
                        emptyState
                    } else {
                        stats
                        results
                        ActionButton("Clear all results", symbol: "trash", variant: .secondary) {
                            isConfirmingClear = true
                        }
                    }
                }
                .padding(.horizontal, Theme.Space.xl)
                .padding(.top, Theme.Space.xxl)
                .padding(.bottom, Theme.Space.section)
            }
            .scrollIndicators(.hidden)
        }
        // Wiping the session is unrecoverable, so it asks first.
        .confirmationDialog(
            "Clear all results?",
            isPresented: $isConfirmingClear,
            titleVisibility: .visible
        ) {
            Button("Clear", role: .destructive) {
                withAnimation(Theme.Motion.enter) { history.clear() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes \(history.count) \(history.count == 1 ? "result" : "results") from this session. It cannot be undone.")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Space.md) {
            Eyebrow("This session", tone: Theme.Accent.emerald)

            Text("History")
                .font(.dfDisplay)
                .foregroundStyle(Theme.Ink.primary)

            Text("Results are held in memory only. Closing the app discards them — nothing about a face is written to disk.")
                .font(.dfBody)
                .foregroundStyle(Theme.Ink.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 330, alignment: .leading)
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Space.md) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 26))
                .foregroundStyle(Theme.Ink.tertiary)

            Text("Nothing analyzed yet. Results will collect here as you go.")
                .font(.dfBody)
                .foregroundStyle(Theme.Ink.tertiary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 260)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Space.section)
    }

    private var stats: some View {
        HStack(spacing: Theme.Space.md) {
            StatTile(value: "\(history.count)", label: "Analyzed")
            StatTile(
                value: String(format: "%.1fs", history.averageElapsed),
                label: "Avg. time"
            )
            StatTile(
                value: String(format: "%.0f%%", history.averageConfidence),
                label: "Avg. confidence",
                tone: Theme.Accent.emerald
            )
        }
    }

    private var results: some View {
        VStack(spacing: Theme.Space.xl) {
            ForEach(history.results) { analysis in
                ResultCard(analysis: analysis) {
                    withAnimation(Theme.Motion.enter) {
                        history.remove(analysis)
                    }
                }
            }
        }
    }
}
