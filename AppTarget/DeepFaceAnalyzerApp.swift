// Drop this file into your Xcode app target (it cannot live in the Swift
// package — `@main` needs to be in the executable, not the library).
//
// File → New → Project → iOS → App, then add the package as a local dependency
// and replace the generated App file with this one.

import DeepFaceAnalyzer
import SwiftUI

@main
struct DeepFaceAnalyzerApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
