// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "DeepFaceAnalyzer",
    platforms: [
        // Observation, .sensoryFeedback, and .symbolEffect all require iOS 17.
        .iOS(.v17)
    ],
    products: [
        .library(name: "DeepFaceAnalyzer", targets: ["DeepFaceAnalyzer"])
    ],
    targets: [
        .target(name: "DeepFaceAnalyzer")
    ]
)
