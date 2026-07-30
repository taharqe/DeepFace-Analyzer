import PhotosUI
import SwiftUI
import UIKit

/// Pick or capture a photo, run it, read the result.
public struct AnalyzeScreen: View {
    @Environment(HistoryStore.self) private var history

    private let client = AnalyzerClient()

    @State private var imageURL: URL?
    @State private var result: Analysis?
    @State private var errorMessage: String?
    @State private var isBusy = false
    @State private var photoSelection: PhotosPickerItem?
    @State private var isShowingCamera = false

    public init() {}

    public var body: some View {
        ZStack {
            Aurora()

            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.xl) {
                    header

                    if client.isDemo {
                        demoNotice
                    }

                    picker

                    if let errorMessage {
                        errorBanner(errorMessage)
                    }

                    if let result {
                        ResultCard(analysis: result)
                            .transition(.opacity.combined(with: .offset(y: 12)))
                    }
                }
                .padding(.horizontal, Theme.Space.xl)
                .padding(.top, Theme.Space.xxl)
                .padding(.bottom, Theme.Space.section)
            }
            .scrollIndicators(.hidden)
        }
        .fullScreenCover(isPresented: $isShowingCamera) {
            CameraPicker { url in
                if let url { adopt(url) }
            }
            .ignoresSafeArea()
        }
        .onChange(of: photoSelection) { _, item in
            guard let item else { return }
            Task { await loadFromLibrary(item) }
        }
    }

    // MARK: - Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Space.md) {
            Eyebrow("On-image analysis", tone: Theme.Accent.violet)

            Text("Read a face,\nwith its uncertainty.")
                .font(.dfDisplay)
                .foregroundStyle(Theme.Ink.primary)
                .fixedSize(horizontal: false, vertical: true)

            Text("Every attribute comes back with the model's confidence attached, and a note where that confidence should not be trusted.")
                .font(.dfBody)
                .foregroundStyle(Theme.Ink.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 330, alignment: .leading)
        }
    }

    private var demoNotice: some View {
        HStack(alignment: .top, spacing: Theme.Space.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 14))
                .foregroundStyle(Theme.Accent.amber)
                .accessibilityHidden(true)

            Text("Demo mode. No inference service is configured, so results are generated locally and are not real predictions. Set ANALYZER_URL to connect a DeepFace backend.")
                .font(.dfCaption)
                .foregroundStyle(Theme.Ink.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Theme.Space.lg)
        .background(Theme.Accent.amber.opacity(0.08), in: .rect(cornerRadius: Theme.Radius.row, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Theme.Radius.row, style: .continuous)
                .strokeBorder(Theme.Accent.amber.opacity(0.28), lineWidth: 1)
        }
    }

    private var picker: some View {
        Bezel(padding: Theme.Space.md) {
            VStack(spacing: Theme.Space.lg) {
                preview

                HStack(spacing: Theme.Space.md) {
                    ActionButton("Camera", symbol: "camera", variant: .secondary) {
                        isShowingCamera = true
                    }

                    PhotosPicker(selection: $photoSelection, matching: .images, photoLibrary: .shared()) {
                        libraryButtonLabel
                    }
                    .accessibilityLabel("Choose from library")
                }

                if imageURL != nil {
                    VStack(spacing: Theme.Space.md) {
                        ActionButton(
                            result == nil ? "Analyze" : "Analyze again",
                            symbol: "sparkles",
                            isBusy: isBusy
                        ) {
                            Task { await run() }
                        }

                        ActionButton("Clear", symbol: "trash", variant: .secondary) {
                            reset()
                        }
                    }
                }
            }
        }
    }

    /// `PhotosPicker` takes a label rather than an action, so the secondary
    /// button's appearance is rebuilt here instead of reusing `ActionButton`.
    private var libraryButtonLabel: some View {
        HStack(spacing: Theme.Space.md) {
            Text("Library")
                .font(.dfHeading)
                .foregroundStyle(Theme.Ink.primary)
            Spacer(minLength: Theme.Space.sm)
            ZStack {
                Circle().fill(Color.white.opacity(0.08))
                Image(systemName: "photo")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.Ink.primary)
            }
            .frame(width: 38, height: 38)
        }
        .padding(.leading, Theme.Space.lg)
        .padding(.trailing, Theme.Space.sm)
        .padding(.vertical, Theme.Space.sm)
        .frame(minHeight: 56)
        .background(Color.white.opacity(0.06), in: .capsule)
        .overlay { Capsule().strokeBorder(Theme.Line.strong, lineWidth: 1) }
    }

    private var preview: some View {
        ZStack {
            if let imageURL, let image = UIImage(contentsOfFile: imageURL.path) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Theme.Surface.raised
                VStack(spacing: Theme.Space.md) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 26))
                        .foregroundStyle(Theme.Ink.tertiary)
                    Text("Choose a photo with one clearly visible, well-lit face.")
                        .font(.dfCaption)
                        .foregroundStyle(Theme.Ink.tertiary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 220)
                }
                .padding(Theme.Space.xl)
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(1, contentMode: .fit)
        .clipShape(.rect(cornerRadius: Theme.Radius.row, style: .continuous))
        .overlay {
            if imageURL == nil {
                RoundedRectangle(cornerRadius: Theme.Radius.row, style: .continuous)
                    .strokeBorder(Theme.Line.core, style: StrokeStyle(lineWidth: 1, dash: [6, 5]))
            }
        }
        .accessibilityLabel(imageURL == nil ? "No photo selected" : "Selected photograph, ready to analyze")
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: Theme.Space.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 14))
                .foregroundStyle(Theme.Accent.rose)
                .accessibilityHidden(true)

            Text(message)
                .font(.dfCaption)
                .foregroundStyle(Theme.Ink.primary)
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
        }
        .padding(Theme.Space.lg)
        .background(Theme.Accent.rose.opacity(0.09), in: .rect(cornerRadius: Theme.Radius.row, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Theme.Radius.row, style: .continuous)
                .strokeBorder(Theme.Accent.rose.opacity(0.32), lineWidth: 1)
        }
        // Announced without stealing focus from whatever the user is doing.
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isStaticText)
    }

    // MARK: - Actions

    private func loadFromLibrary(_ item: PhotosPickerItem) async {
        errorMessage = nil
        guard
            let data = try? await item.loadTransferable(type: Data.self),
            let image = UIImage(data: data),
            let url = ImageStore.persist(image)
        else {
            errorMessage = "Could not load that photo. Pick a different one, or use the camera."
            return
        }
        adopt(url)
    }

    private func adopt(_ url: URL) {
        imageURL = url
        // A new image invalidates the previous result; leaving it on screen would
        // pair the old numbers with the new photo.
        withAnimation(Theme.Motion.enter) {
            result = nil
            errorMessage = nil
        }
    }

    private func run() async {
        guard let imageURL else { return }
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }

        do {
            let analysis = try await client.analyze(imageURL: imageURL)
            withAnimation(Theme.Motion.enter) {
                result = analysis
            }
            history.add(analysis)
        } catch let error as AnalysisError {
            errorMessage = error.message
        } catch {
            errorMessage = "The analysis did not finish. Try again in a moment."
        }
    }

    private func reset() {
        withAnimation(Theme.Motion.enter) {
            imageURL = nil
            result = nil
            errorMessage = nil
            photoSelection = nil
        }
    }
}

#if DEBUG
#Preview("Analyze") {
    AnalyzeScreen()
        .environment(HistoryStore())
        .preferredColorScheme(.dark)
}
#endif
