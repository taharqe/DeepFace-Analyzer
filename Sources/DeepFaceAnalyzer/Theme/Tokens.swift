import SwiftUI

/// Design tokens for the cinematic visual direction.
///
/// The palette is fixed to a dark world rather than following the system
/// appearance: the result surfaces render photography against confidence meters,
/// and that contrast relationship only holds on a dark backdrop.
public enum Theme {}

// MARK: - Colour

public extension Theme {
    enum Surface {
        /// Page backdrop. Near-OLED black, so the gradient orbs read as light sources.
        public static let base = Color(hex: 0x050505)
        /// Outer shell of a bezelled container.
        public static let shell = Color.white.opacity(0.04)
        /// Inner core of a bezelled container.
        public static let core = Color(hex: 0x0C0C0E)
        /// Raised inner core, for rows sitting on top of a core.
        public static let raised = Color(hex: 0x141417)
    }

    /// Hairlines. Never a solid grey 1pt line.
    enum Line {
        public static let shell = Color.white.opacity(0.08)
        public static let core = Color.white.opacity(0.06)
        public static let strong = Color.white.opacity(0.14)
    }

    enum Ink {
        public static let primary = Color(hex: 0xF4F4F5)
        public static let secondary = Color(hex: 0xF4F4F5).opacity(0.62)
        public static let tertiary = Color(hex: 0xF4F4F5).opacity(0.38)
        public static let onAccent = Color(hex: 0x050505)
    }

    /// Spot colours. Used for the ambient orbs and for semantic meaning only.
    enum Accent {
        public static let violet = Color(hex: 0x7C5CFF)
        public static let emerald = Color(hex: 0x34D399)
        public static let amber = Color(hex: 0xFBBF24)
        public static let rose = Color(hex: 0xFB7185)
    }

    /// Confidence is the one place colour carries meaning, so the thresholds are
    /// named rather than inlined at each call site.
    static func confidenceColor(_ percent: Double) -> Color {
        switch percent {
        case 75...: return Accent.emerald
        case 50..<75: return Accent.amber
        default: return Accent.rose
        }
    }
}

// MARK: - Geometry

public extension Theme {
    /// Concentric radii. An inner radius must be the outer radius minus the shell
    /// padding, otherwise the two curves are not parallel and the nesting reads as
    /// a mistake rather than as machined hardware.
    enum Radius {
        public static let shell: CGFloat = 32
        public static let shellPadding: CGFloat = 6
        public static var core: CGFloat { shell - shellPadding }
        public static let row: CGFloat = 16
    }

    /// Macro-whitespace scale. Sections breathe heavily.
    enum Space {
        public static let xs: CGFloat = 4
        public static let sm: CGFloat = 8
        public static let md: CGFloat = 12
        public static let lg: CGFloat = 16
        public static let xl: CGFloat = 24
        public static let xxl: CGFloat = 32
        public static let section: CGFloat = 48
    }
}

// MARK: - Motion

public extension Theme {
    /// Durations stay short for anything the user triggers directly; only ambient
    /// and first-run motion runs longer.
    enum Motion {
        /// Press feedback. Fast enough to feel like the button heard the tap.
        public static let press = Animation.spring(duration: 0.18, bounce: 0)
        /// Content entering the screen.
        public static let enter = Animation.spring(duration: 0.42, bounce: 0.12)
        /// A meter filling. Long enough to read as a measurement being taken.
        public static let reveal = Animation.spring(duration: 0.62, bounce: 0)
        /// Delay between staggered siblings.
        public static let stagger: Double = 0.06
    }
}

// MARK: - Type

public extension Font {
    /// Rounded numerals throughout: the interface is mostly measurements, and the
    /// rounded face keeps them from reading as clinical.
    static let dfDisplay = Font.system(size: 38, weight: .bold, design: .default)
    static let dfTitle = Font.system(size: 26, weight: .bold, design: .default)
    static let dfHeading = Font.system(size: 17, weight: .semibold, design: .default)
    static let dfBody = Font.system(size: 15, weight: .regular, design: .default)
    static let dfCaption = Font.system(size: 13, weight: .regular, design: .default)
    static let dfEyebrow = Font.system(size: 10, weight: .semibold, design: .default)
    static let dfMetric = Font.system(size: 28, weight: .bold, design: .rounded)
}

// MARK: - Helpers

public extension Color {
    /// Hex literal initialiser, so the palette above reads as the values a
    /// designer would hand over.
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}
