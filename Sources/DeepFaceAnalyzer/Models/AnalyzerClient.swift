import Foundation

/// A failure the interface can render.
///
/// Every message names a next step. "Something went wrong" tells the user nothing
/// they can act on.
public struct AnalysisError: LocalizedError, Sendable {
    public let message: String
    public var errorDescription: String? { message }

    public init(_ message: String) {
        self.message = message
    }
}

/// Posts an image to a DeepFace inference service and parses the response.
///
/// DeepFace is a Python library; its models cannot run on-device. With no
/// endpoint configured the client runs in demo mode so the interface is
/// explorable without a backend.
public struct AnalyzerClient: Sendable {
    public let endpoint: URL?

    /// Reads `ANALYZER_URL` from the app's Info.plist, falling back to the
    /// process environment so it can be set from an Xcode scheme.
    public init(endpoint: URL? = AnalyzerClient.configuredEndpoint()) {
        self.endpoint = endpoint
    }

    public var isDemo: Bool { endpoint == nil }

    public static func configuredEndpoint() -> URL? {
        let raw = (Bundle.main.object(forInfoDictionaryKey: "ANALYZER_URL") as? String)
            ?? ProcessInfo.processInfo.environment["ANALYZER_URL"]
        guard let raw, !raw.isEmpty else { return nil }
        return URL(string: raw)
    }

    // MARK: - Request

    public func analyze(imageURL: URL) async throws -> Analysis {
        let started = Date()

        guard let endpoint else {
            return try await demoAnalysis(imageURL: imageURL, started: started)
        }

        let imageData: Data
        do {
            imageData = try Data(contentsOf: imageURL)
        } catch {
            throw AnalysisError("Could not read that image. Pick it again, or choose a different photo.")
        }

        // Multipart rather than base64 JSON: the payload stays the size of the
        // file instead of growing a third on the way out.
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = Self.multipartBody(imageData: imageData, boundary: boundary)
        request.timeoutInterval = 30

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw AnalysisError("Could not reach the analysis service. Check your connection and try again.")
        }

        if let http = response as? HTTPURLResponse {
            if http.statusCode == 422 {
                throw AnalysisError("No face was detected. Try a photo where the face is unobstructed and well lit.")
            }
            guard (200..<300).contains(http.statusCode) else {
                throw AnalysisError("The analysis service returned \(http.statusCode). Try again in a moment.")
            }
        }

        let attributes = try Self.parse(data)
        return Analysis(
            imageURL: imageURL,
            elapsed: Date().timeIntervalSince(started),
            attributes: attributes
        )
    }

    private static func multipartBody(imageData: Data, boundary: String) -> Data {
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"upload.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        return body
    }

    // MARK: - Parsing

    /// DeepFace returns each attribute as either a number (age) or a
    /// label→confidence map, so the payload is decoded loosely rather than into
    /// a rigid Codable shape.
    private static func parse(_ data: Data) throws -> [Attribute] {
        guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AnalysisError("The analysis service sent a response the app could not read.")
        }

        var attributes: [Attribute] = []

        for key in AttributeKey.displayOrder {
            switch key {
            case .age:
                if let age = root["age"] as? Double {
                    attributes.append(
                        Attribute(key: .age, dominant: "\(Int(age.rounded()))", confidence: 0, scores: [])
                    )
                }
            default:
                if let raw = root[key.rawValue] as? [String: Any] {
                    let distribution = raw.compactMapValues { $0 as? Double }
                    if !distribution.isEmpty {
                        attributes.append(Attribute(key: key, distribution: distribution))
                    }
                }
            }
        }

        guard !attributes.isEmpty else {
            throw AnalysisError("The service returned no attributes for that image. Try a different photo.")
        }
        return attributes
    }

    // MARK: - Demo

    /// Deterministic per image, so a given photo always renders the same card.
    /// Random values on every open would read as a working model that changed its
    /// mind, which is worse than an obviously fixed placeholder.
    private func demoAnalysis(imageURL: URL, started: Date) async throws -> Analysis {
        // Long enough that the progress state is visible, short enough not to annoy.
        try? await Task.sleep(for: .milliseconds(900))

        // `magnitude`, not `abs`: `abs(Int.min)` traps, and hashValue can return it.
        var seed = UInt64(imageURL.absoluteString.hashValue.magnitude)
        func next(_ bound: UInt64) -> Int {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            return Int((seed >> 33) % bound)
        }

        /// Spreads `top` percent across the first label and the remainder over the rest.
        func spread(_ labels: [String], top: Double) -> [String: Double] {
            var out: [String: Double] = [labels[0]: top]
            var remaining = 100 - top
            let others = labels.dropFirst()
            for (i, label) in others.enumerated() {
                let isLast = i == others.count - 1
                let share = isLast ? remaining : (remaining / Double(others.count - i)) * 0.7
                out[label] = (share * 10).rounded() / 10
                remaining -= share
            }
            return out
        }

        func rotate(_ xs: [String], by n: Int) -> [String] {
            guard !xs.isEmpty else { return xs }
            let k = n % xs.count
            return Array(xs[k...] + xs[..<k])
        }

        let emotions = ["neutral", "happy", "surprise", "sad", "angry", "fear", "disgust"]
        let genders = ["Woman", "Man"]
        let races = ["asian", "white", "middle eastern", "indian", "latino hispanic", "black"]

        let attributes: [Attribute] = [
            Attribute(key: .emotion, distribution: spread(rotate(emotions, by: next(7)), top: 46 + Double(next(38)))),
            Attribute(key: .gender, distribution: spread(rotate(genders, by: next(2)), top: 62 + Double(next(34)))),
            Attribute(key: .age, dominant: "\(21 + next(38))", confidence: 0, scores: []),
            Attribute(key: .race, distribution: spread(rotate(races, by: next(6)), top: 38 + Double(next(40))))
        ]

        return Analysis(
            imageURL: imageURL,
            elapsed: Date().timeIntervalSince(started),
            attributes: attributes
        )
    }
}
