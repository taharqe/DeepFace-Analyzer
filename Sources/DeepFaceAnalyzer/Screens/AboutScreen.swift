import Foundation
import SwiftUI

/// Model limitations and inference-service configuration.
///
/// This screen exists because the rest of the app is deliberately high-confidence
/// in its visual register, and that register makes an unreliable percentage read
/// as a fact.
public struct AboutScreen: View {
    private let client = AnalyzerClient()

    private struct Limitation: Identifiable {
        let id = UUID()
        let title: String
        let detail: String
    }

    private let limitations: [Limitation] = [
        Limitation(
            title: "Ethnicity prediction is unreliable",
            detail: "DeepFace's race classifier has documented accuracy disparities across skin tones and was never validated for consequential use. It is shown with a caveat because hiding it would be worse than labelling it, but it should not drive any decision about a person."
        ),
        Limitation(
            title: "Gender is a binary guess",
            detail: "The model returns two classes. That is a property of its training data, not of people, and it says nothing about how anyone identifies."
        ),
        Limitation(
            title: "Age carries years of error",
            detail: "Estimates shift with lighting, pose, expression, and image quality. Treat the number as a range, not a value."
        ),
        Limitation(
            title: "Faces are personal data",
            detail: "In many jurisdictions facial analysis is regulated biometric processing. Analyzing someone else's photograph may require their consent."
        )
    ]

    public init() {}

    public var body: some View {
        ZStack {
            Aurora()

            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.xl) {
                    header

                    VStack(spacing: Theme.Space.md) {
                        ForEach(Array(limitations.enumerated()), id: \.element.id) { index, item in
                            LimitationRow(title: item.title, detail: item.detail, index: index)
                        }
                    }

                    service
                }
                .padding(.horizontal, Theme.Space.xl)
                .padding(.top, Theme.Space.xxl)
                .padding(.bottom, Theme.Space.section)
            }
            .scrollIndicators(.hidden)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Space.md) {
            Eyebrow("Read this first", tone: Theme.Accent.amber)

            Text("What this\ncan't tell you.")
                .font(.dfDisplay)
                .foregroundStyle(Theme.Ink.primary)
                .fixedSize(horizontal: false, vertical: true)

            Text("The interface reports what the model returned. That is not the same as what is true, and for several attributes the gap is wide.")
                .font(.dfBody)
                .foregroundStyle(Theme.Ink.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 330, alignment: .leading)
        }
    }

    private var service: some View {
        Bezel {
            VStack(alignment: .leading, spacing: Theme.Space.md) {
                Text("Inference service")
                    .font(.dfHeading)
                    .foregroundStyle(Theme.Ink.primary)

                Text("DeepFace runs in Python and cannot execute on-device. The app posts an image to an endpoint and renders the response.")
                    .font(.dfCaption)
                    .foregroundStyle(Theme.Ink.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                Text(client.isDemo ? "Demo mode — results are generated locally" : (client.endpoint?.absoluteString ?? ""))
                    .font(.dfCaption)
                    .foregroundStyle(client.isDemo ? Theme.Accent.amber : Theme.Accent.emerald)
                    .textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(Theme.Space.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.Surface.raised, in: .rect(cornerRadius: Theme.Radius.row, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: Theme.Radius.row, style: .continuous)
                            .strokeBorder(Theme.Line.core, lineWidth: 1)
                    }

                Text("Set ANALYZER_URL in Info.plist, or as a scheme environment variable, to a service that accepts a multipart image and returns DeepFace attribute objects.")
                    .font(.dfCaption)
                    .foregroundStyle(Theme.Ink.tertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct LimitationRow: View {
    let title: String
    /// Named `detail` rather than `body`: a stored `body` collides with the
    /// `View` protocol's own requirement.
    let detail: String
    let index: Int

    @State private var hasAppeared = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.sm) {
            HStack(spacing: Theme.Space.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.Accent.amber)
                    .accessibilityHidden(true)

                Text(title)
                    .font(.dfHeading)
                    .foregroundStyle(Theme.Ink.primary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Text(detail)
                .font(.dfCaption)
                .foregroundStyle(Theme.Ink.secondary)
                .fixedSize(horizontal: false, vertical: true)
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
