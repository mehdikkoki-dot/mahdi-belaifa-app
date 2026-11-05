import SwiftUI
import UIKit

/// Direction «بطاقة البيجر LED» — the chosen design (board 5).
/// A warm paper ticket floating on a dark espresso scene; the order number
/// is an LED dot-matrix display. The scene is always dark — the ticket is
/// the light.
enum Theme {
    static let scene = Color(red: 0.090, green: 0.066, blue: 0.043)       // #17110B
    static let sceneCard = Color(red: 0.141, green: 0.102, blue: 0.063)   // #241A10
    static let sceneLine = Color(red: 0.227, green: 0.173, blue: 0.110)   // #3A2C1C
    static let cream = Color(red: 1.00, green: 0.969, blue: 0.929)        // #FFF7ED
    static let mutedScene = Color(red: 0.722, green: 0.647, blue: 0.549)  // #B8A58C

    static let paperTop = Color(red: 1.00, green: 0.976, blue: 0.933)      // #FFF9EE
    static let paperBottom = Color(red: 1.00, green: 0.937, blue: 0.847)  // #FFEFD8
    static let ink = Color(red: 0.169, green: 0.102, blue: 0.071)         // #2B1A12
    static let tan = Color(red: 0.663, green: 0.561, blue: 0.463)         // #A98F76

    static let orange = Color(red: 0.957, green: 0.318, blue: 0.043)      // #F4510B
    static let orangeBright = Color(red: 1.00, green: 0.471, blue: 0.278) // #FF7847
    static let orangeDeep = Color(red: 0.839, green: 0.239, blue: 0.008)  // #D63D02
    static let gold = Color(red: 1.00, green: 0.725, blue: 0.125)         // #FFB020
    static let goldDeep = Color(red: 0.80, green: 0.52, blue: 0.05)
    static let greenBg = Color(red: 0.914, green: 0.976, blue: 0.941)     // #E9F9F0
    static let greenInk = Color(red: 0.055, green: 0.420, blue: 0.263)    // #0E6B43

    static var paperGradient: LinearGradient {
        LinearGradient(colors: [paperTop, paperBottom], startPoint: .top, endPoint: .bottom)
    }
    /// The saturated brand field the whole ticket experience lives on.
    static var brandGradient: LinearGradient {
        LinearGradient(colors: [Color(red: 0.808, green: 0.290, blue: 0.031),
                                Color(red: 0.486, green: 0.149, blue: 0.008)],
                       startPoint: .top, endPoint: .bottom)
    }
    static var readyGradient: LinearGradient {
        LinearGradient(colors: [orangeBright, orange, orangeDeep], startPoint: .top, endPoint: .bottom)
    }

    // Light app canvas (Pingloy-grade clarity): warm light grey + white cards
    static let canvas = Color(red: 0.957, green: 0.945, blue: 0.918)      // #F4F1EA
    static let cardWhite = Color.white
    static let greyPill = Color(red: 0.933, green: 0.925, blue: 0.898)    // #EEECE5
    static let readyCardTop = Color(red: 0.965, green: 0.322, blue: 0.043)
    static let readyCardBottom = Color(red: 0.827, green: 0.220, blue: 0.008)

    // Legacy aliases (scene surfaces)
    static var paper: Color { canvas }
    static var card: Color { cardWhite }
    static var muted: Color { tan }
    static var sand: Color { greyPill }
    static var orangeSoft: Color { paperTop }
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

/// Ticket outline: rounded card whose bottom edge is punched with
/// semicircular scallops — a torn receipt.
struct TicketShape: Shape {
    var radius: CGFloat = 26
    var notch: CGFloat = 9

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let r = radius
        p.move(to: CGPoint(x: rect.minX + r, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX - r, y: rect.minY))
        p.addArc(center: CGPoint(x: rect.maxX - r, y: rect.minY + r), radius: r,
                 startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: true)
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - r))
        p.addArc(center: CGPoint(x: rect.maxX - r, y: rect.maxY - r), radius: r,
                 startAngle: .degrees(0), endAngle: .degrees(90), clockwise: true)
        let startX = rect.maxX - r
        let endX = rect.minX + r
        let span = startX - endX
        let count = max(1, Int(span / (notch * 2)))
        let step = span / CGFloat(count)
        var x = startX
        for _ in 0..<count {
            p.addArc(center: CGPoint(x: x - step / 2, y: rect.maxY), radius: step / 2,
                     startAngle: .degrees(0), endAngle: .degrees(180), clockwise: false)
            x -= step
        }
        p.addArc(center: CGPoint(x: rect.minX + r, y: rect.maxY - r), radius: r,
                 startAngle: .degrees(90), endAngle: .degrees(180), clockwise: true)
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + r))
        p.addArc(center: CGPoint(x: rect.minX + r, y: rect.minY + r), radius: r,
                 startAngle: .degrees(180), endAngle: .degrees(270), clockwise: true)
        p.closeSubpath()
        return p
    }
}

/// The paper ticket itself: gradient fill, punched bottom, soft shadow.
struct TicketCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(20)
            .padding(.bottom, 8)
            .background(TicketShape().fill(Theme.paperGradient))
            .shadow(color: .black.opacity(0.45), radius: 24, y: 14)
    }
}

/// The hero order number as text (lists / fallback): last digit in orange.
/// Digits are forced LTR so 57 never renders as 75 in the RTL layout.
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
        .environment(\.layoutDirection, .leftToRight)
        .accessibilityLabel("رقم الطلب \(number)")
    }

    private func color(for idx: Int, count: Int) -> Color {
        if onOrange { return .white }
        return idx == count - 1 ? Theme.orange : Theme.cream
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
            .background(status == "ready" ? Theme.orange : Theme.greyPill)
            .foregroundStyle(status == "ready" ? .white : Theme.orangeDeep)
            .clipShape(Capsule())
    }
}

/// Felt, not seen: a pager you can feel in your pocket.
enum Haptics {
    static func ready() {
        let gen = UINotificationFeedbackGenerator()
        gen.notificationOccurred(.error)   // strongest built-in pattern — a pager buzz
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
    }
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    static func tap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}


/// Frosted glass bar/card on the brand field.
struct FrostedBar<Content: View>: View {
    var radius: CGFloat = 18
    @ViewBuilder var content: Content

    var body: some View {
        content
            .background(Color.white.opacity(0.13))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Color.white.opacity(0.20), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: radius))
    }
}

/// «يعمل بواسطة رنّلي» with a tiny dot-grid mark.
struct PoweredBy: View {
    let s: Strings

    var body: some View {
        HStack(spacing: 7) {
            Text(s.poweredBy)
                .font(.cairo(12.5, .bold)).foregroundStyle(.white.opacity(0.65))
            HStack(spacing: 2.5) {
                ForEach(0..<3, id: \.self) { _ in
                    VStack(spacing: 2.5) {
                        ForEach(0..<3, id: \.self) { _ in
                            Circle().fill(Theme.orangeBright).frame(width: 3.5, height: 3.5)
                        }
                    }
                }
            }
            Text(s.appName)
                .font(.cairo(13.5, .black)).foregroundStyle(.white.opacity(0.9))
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }
}
