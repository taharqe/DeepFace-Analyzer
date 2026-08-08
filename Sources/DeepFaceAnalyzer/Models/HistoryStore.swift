import Observation
import SwiftUI

/// Session history.
///
/// Results live for the lifetime of the app process. Nothing is written to disk:
/// the images are faces, and persisting biometric analysis by default is not a
/// decision this app should make for the user.
@Observable
public final class HistoryStore {
    public private(set) var results: [Analysis] = []

    public init() {}

    public func add(_ analysis: Analysis) {
        results.insert(analysis, at: 0)
    }

    public func remove(_ analysis: Analysis) {
        results.removeAll { $0.id == analysis.id }
    }

    public func clear() {
        results.removeAll()
    }

    // MARK: - Aggregates

    public var count: Int { results.count }

    public var averageElapsed: TimeInterval {
        guard !results.isEmpty else { return 0 }
        return results.reduce(0) { $0 + $1.elapsed } / Double(results.count)
    }

    /// Mean confidence across every attribute that reports one. Continuous
    /// attributes are excluded — age has no confidence to average.
    public var averageConfidence: Double {
        let values = results
            .flatMap(\.attributes)
            .filter { !$0.isContinuous }
            .map(\.confidence)
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Double(values.count)
    }
}
