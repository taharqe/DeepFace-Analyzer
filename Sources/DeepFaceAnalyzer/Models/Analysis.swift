import Foundation

/// One attribute the model reports on.
public enum AttributeKey: String, CaseIterable, Sendable, Codable {
    case emotion
    case gender
    case age
    case race
}

/// A single label within an attribute, with the model's confidence in it.
public struct Score: Identifiable, Hashable, Sendable {
    public let label: String
    /// 0–100.
    public let confidence: Double

    public var id: String { label }

    public init(label: String, confidence: Double) {
        self.label = label
        self.confidence = confidence
    }
}

public struct Attribute: Identifiable, Hashable, Sendable {
    public let key: AttributeKey
    /// Highest-scoring label.
    public let dominant: String
    /// Confidence in `dominant`, 0–100.
    public let confidence: Double
    /// Full distribution, descending. Empty for continuous attributes like age.
    public let scores: [Score]

    public var id: AttributeKey { key }

    /// Age has no distribution — it comes back as a single number.
    public var isContinuous: Bool { scores.isEmpty }

    public init(key: AttributeKey, dominant: String, confidence: Double, scores: [Score]) {
        self.key = key
        self.dominant = dominant
        self.confidence = confidence
        self.scores = scores
    }

    /// Builds an attribute from a raw label→confidence map, sorted descending.
    init(key: AttributeKey, distribution: [String: Double]) {
        let sorted = distribution
            .map { Score(label: $0.key, confidence: $0.value) }
            .sorted { $0.confidence > $1.confidence }
        self.key = key
        self.scores = sorted
        self.dominant = sorted.first?.label ?? "unknown"
        self.confidence = sorted.first?.confidence ?? 0
    }
}

public struct Analysis: Identifiable, Hashable, Sendable {
    public let id: UUID
    /// Local file URL of the analyzed image.
    public let imageURL: URL
    public let createdAt: Date
    public let elapsed: TimeInterval
    public let attributes: [Attribute]

    public init(
        id: UUID = UUID(),
        imageURL: URL,
        createdAt: Date = .now,
        elapsed: TimeInterval,
        attributes: [Attribute]
    ) {
        self.id = id
        self.imageURL = imageURL
        self.createdAt = createdAt
        self.elapsed = elapsed
        self.attributes = attributes
    }

    /// Formatted for display. Sub-second results read better in milliseconds.
    public var elapsedLabel: String {
        elapsed >= 1
            ? String(format: "%.1fs", elapsed)
            : "\(Int((elapsed * 1000).rounded()))ms"
    }
}

// MARK: - Reliability

/// How much weight an attribute's output can carry.
///
/// `caveated` attributes render a disclosure next to the reading. DeepFace's
/// published accuracy for age, gender, and race degrades sharply outside its
/// training distribution — most severely on darker skin tones for the race
/// classifier — and a percentage set in the same weight as a fact reads as a fact.
public enum Reliability: Sendable {
    case reported
    case caveated
}

public struct AttributeMeta: Sendable {
    public let title: String
    public let symbol: String
    public let reliability: Reliability
    /// Shown beside the reading when `reliability` is `.caveated`.
    public let caveat: String?
}

public extension AttributeKey {
    var meta: AttributeMeta {
        switch self {
        case .emotion:
            return AttributeMeta(
                title: "Expression",
                symbol: "face.smiling",
                reliability: .reported,
                caveat: nil
            )
        case .gender:
            return AttributeMeta(
                title: "Predicted gender",
                symbol: "person",
                reliability: .caveated,
                caveat: "A binary prediction that does not describe how a person identifies."
            )
        case .age:
            return AttributeMeta(
                title: "Estimated age",
                symbol: "calendar",
                reliability: .caveated,
                caveat: "Age estimates carry a typical error of several years and skew with lighting and pose."
            )
        case .race:
            return AttributeMeta(
                title: "Predicted ethnicity",
                symbol: "globe",
                reliability: .caveated,
                caveat: "This classifier has documented accuracy disparities across skin tones. Treat it as a low-confidence signal, not an identification."
            )
        }
    }

    /// Display order: most reliable first, so the caveated readings do not lead.
    static let displayOrder: [AttributeKey] = [.emotion, .gender, .age, .race]
}
