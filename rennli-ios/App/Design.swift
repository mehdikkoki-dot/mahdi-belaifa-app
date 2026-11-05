import SwiftUI
import UIKit

/// Direction 2 — «دفء النهار» design system: warm café daylight.
/// Cream paper, bold orange, espresso ink. Cairo is the voice.
enum Theme {
    static func dyn(light: UIColor, dark: UIColor) -> Color {
        Color(UIColor { traits in traits.userInterfaceStyle == .dark ? dark : light })
    }

    /// Warm cream paper (app background, light) / deep espresso (dark)
    static var paper: Color { dyn(light: UIColor(red: 1.00, green: 0.976, blue: 0.941, alpha: 1),
                                  dark: UIColor(red: 0.114, green: 0.075, blue: 0.047, alpha: 1)) }
    /// Card surface
    static var card: Color { dyn(light: .white,
                                 dark: UIColor(red: 0.165, green: 0.106, blue: 0.067, alpha: 1)) }
    /// Espresso ink
    static var ink: Color { dyn(light: UIColor(red: 0.169, green: 0.102, blue: 0.071, alpha: 1),
                                dark: UIColor(red: 1.00, green: 0.957, blue: 0.902, alpha: 1)) }
    /// Warm muted text
    static var muted: Color { dyn(light: UIColor(red: 0.663, green: 0.561, blue: 0.463, alpha: 1),
                                  dark: UIColor(red: 0.769, green: 0.647, blue: 0.510, alpha: 1)) }
    /// Hairline / soft fill
    static var sand: Color { dyn(light: UIColor(red: 0.945, green: 0.890, blue: 0.753, alpha: 1),
                                 dark: UIColor(red: 0.29, green: 0.20, blue: 0.13, alpha: 1)) }

    static let orange = Color(red: 0.969, green: 0.404, blue: 0.027)      // #F76707
    static let orangeDeep = Color(red: 0.910, green: 0.349, blue: 0.047)  // #E8590C
    static let orangeSoft = Color(red: 1.00, green: 0.957, blue: 0.902)   // #FFF4E6
    static let gold = Color(red: 1.00, green: 0.788, blue: 0.302)         // #FFC94D

    static var readyGradient: LinearGradient {
        LinearGradient(colors: [Color(red: 1.00, green: 0.663, blue: 0.302),
                                orange, orangeDeep],
                       startPoint: .top, endPoint: .bottom)
    }
}

extension Font {
    /// Cairo faces bundled with the app (cairo-400/700/900.ttf).
    static func cairo(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .black, .heavy: name = "Cairo-Black"
        case .bold, .semibold: name = "Cairo-Bold"
        default: name = "Cairo-Regular"
        }
        return .custom(name, size: size)
    }
}

/// The hero order number: every digit in ink except the last one in orange
/// (on the ready screen: all white).
struct HeroNumber: View {
    let number: String
    var onOrange: Bool = false
    var size: CGFloat = 150

    var body: some View {
        let chars = Array(number.isEmpty ? "—" : number)
        HStack(spacing: 0) {
            ForEach(Array(chars.enumerated()), id: \.offset) { idx, ch in
                Text(String(ch))
                    .font(.cairo(size, .black))
                    .foregroundStyle(color(for: idx, count: chars.count))
            }
        }
        .accessibilityLabel("رقم الطلب \(number)")
    }

    private func color(for idx: Int, count: Int) -> Color {
        if onOrange { return .white }
        return idx == count - 1 ? Theme.orange : Theme.ink
    }
}

/// Status pill used in lists.
struct StatusPill: View {
    let status: String
    let s: Strings

    var body: some View {
        Text(s.statusShort(status))
            .font(.cairo(12, .black))
            .padding(.horizontal, 11).padding(.vertical, 6)
            .background(status == "ready" ? Theme.orange : Theme.orangeSoft)
            .foregroundStyle(status == "ready" ? .white : Theme.orangeDeep)
            .clipShape(Capsule())
    }
}
