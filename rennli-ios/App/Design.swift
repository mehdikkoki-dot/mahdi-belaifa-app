import SwiftUI
import UIKit

/// Direction «بطاقة البيجر LED» — the chosen design (board 5).
/// A warm paper ticket floating on a dark espresso scene; the order number
/// is an LED dot-matrix display. The scene is always dark — the ticket is
/// the light.
enum Theme {
    // Apple system scales: label / secondaryLabel / grouped background.
    static let scene = Color(red: 0.110, green: 0.110, blue: 0.118)       // #1C1C1E
    static let sceneCard = Color(red: 0.173, green: 0.173, blue: 0.180)
    static let sceneLine = Color(red: 0.290, green: 0.290, blue: 0.310)
    static let cream = Color(red: 1.00, green: 0.969, blue: 0.929)
    static let mutedScene = Color(red: 0.690, green: 0.690, blue: 0.710)

    static let paperTop = Color.white
    static let paperBottom = Color(red: 0.949, green: 0.949, blue: 0.969)
    static let ink = Color(red: 0.110, green: 0.110, blue: 0.118)         // #1C1C1E Apple label
    static let tan = Color(red: 0.431, green: 0.431, blue: 0.451)         // #6E6E73 Apple secondaryLabel

    /// Rennli Red — vivid, saturated, unmissable.
    static let orange = Color(red: 1.00, green: 0.231, blue: 0.188)       // #FF3B30
    static let orangeBright = Color(red: 1.00, green: 0.373, blue: 0.322) // #FF5F52
    static let orangeDeep = Color(red: 0.843, green: 0.000, blue: 0.082)  // #D70015
    static let gold = Color(red: 1.00, green: 0.725, blue: 0.125)
    static let goldDeep = Color(red: 0.72, green: 0.45, blue: 0.02)
    static let greenBg = Color(red: 0.910, green: 0.969, blue: 0.929)
    static let greenInk = Color(red: 0.141, green: 0.541, blue: 0.239)    // Apple systemGreen (dark variant)

    static var paperGradient: LinearGradient {
        LinearGradient(colors: [paperTop, paperBottom], startPoint: .top, endPoint: .bottom)
    }
    /// The saturated brand field the whole ticket experience lives on.
    static var brandGradient: LinearGradient {
        LinearGradient(colors: [Color(red: 0.843, green: 0.000, blue: 0.082),
                                Color(red: 0.478, green: 0.047, blue: 0.012)],
                       startPoint: .top, endPoint: .bottom)
    }
    static var readyGradient: LinearGradient {
        LinearGradient(colors: [orangeBright, orange, orangeDeep], startPoint: .top, endPoint: .bottom)
    }

    // Light app canvas (Pingloy-grade clarity): warm light grey + white cards
    static let canvas = Color(red: 0.949, green: 0.949, blue: 0.969)      // #F2F2F7 iOS grouped bg
    static let cardWhite = Color.white
    static let greyPill = Color(red: 0.898, green: 0.898, blue: 0.918)    // #E5E5EA
    static let readyCardTop = Color(red: 1.00, green: 0.231, blue: 0.188)
    static let readyCardBottom = Color(red: 0.843, green: 0.000, blue: 0.082)

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

/// «Powered by C'est Fait!» with a tiny dot-grid mark.
/// `dark` = sits on the red/dark scene (white text); otherwise grey on light.
struct PoweredBy: View {
    let s: Strings
    var dark: Bool = false

    var body: some View {
        HStack(spacing: 7) {
            Image("BrandLogo")
                .resizable().scaledToFill()
                .frame(width: 19, height: 19)
                .clipShape(RoundedRectangle(cornerRadius: 5.5))
            Text(s.poweredBy)
                .font(.cairo(12.5, .bold))
                .foregroundStyle(dark ? .white.opacity(0.7) : Theme.tan)
            HStack(spacing: 2.5) {
                ForEach(0..<3, id: \.self) { _ in
                    VStack(spacing: 2.5) {
                        ForEach(0..<3, id: \.self) { _ in
                            Circle().fill(Theme.orange).frame(width: 3.5, height: 3.5)
                        }
                    }
                }
            }
            Text(s.appName)
                .font(.cairo(13.5, .black))
                .foregroundStyle(dark ? .white.opacity(0.95) : Theme.ink)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }
}


// MARK: - Motion kit (60 fps, Reduce-Motion aware)

/// The brand's glossy diagonal light — two soft bands, like the logo's sheen.
/// Parents clip it to their shape.
struct GlossBands: View {
    var opacity: Double = 0.13
    var body: some View {
        ZStack {
            LinearGradient(colors: [.clear, .white.opacity(opacity), .clear],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            Rectangle()
                .fill(LinearGradient(colors: [.clear, .white.opacity(opacity * 0.9), .clear],
                                     startPoint: .leading, endPoint: .trailing))
                .frame(width: 120)
                .rotationEffect(.degrees(18))
                .offset(x: -120, y: -40)
                .blur(radius: 5)
        }
    }
}

/// The brand wordmark — heavy italic, exactly like the logo. Latin-only by
/// design: the name stays French in every language.
struct BrandWordmark: View {
    var size: CGFloat = 20
    var color: Color = .white
    var body: some View {
        Text("C'est Fait!")
            .font(.system(size: size, weight: .black))
            .italic()
            .foregroundStyle(color)
    }
}

/// Staggered entrance: rise + fade on a spring. Degrades to a plain
/// fade when the system Reduce Motion setting is on.
struct Entrance: ViewModifier {
    let delay: Double
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown || reduceMotion ? 0 : 16)
            .onAppear {
                withAnimation(.spring(response: 0.55, dampingFraction: 0.86).delay(reduceMotion ? 0 : delay)) {
                    shown = true
                }
            }
    }
}

/// Tactile press feedback for primary buttons.
struct PressableStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.965 : 1)
            .opacity(configuration.isPressed ? 0.92 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// A small live dot that breathes while an order is ready.
struct PulsingDot: View {
    @State private var on = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Circle()
            .fill(Theme.orange)
            .frame(width: 9, height: 9)
            .opacity(on ? 0.35 : 1)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true)) { on = true }
            }
    }
}

extension View {
    func entrance(_ delay: Double = 0) -> some View { modifier(Entrance(delay: delay)) }
}


// MARK: - Masterpiece kit (v8)

/// A slow light sweep across a surface — polished glass, not glitter.
struct ShineSweep: ViewModifier {
    let radius: CGFloat
    @State private var x: CGFloat = -1.4
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    Rectangle()
                        .fill(LinearGradient(colors: [.clear, .white.opacity(0.15), .clear],
                                             startPoint: .leading, endPoint: .trailing))
                        .frame(width: geo.size.width * 0.45)
                        .rotationEffect(.degrees(-16))
                        .offset(x: x * geo.size.width * 1.5)
                        .blur(radius: 6)
                }
                .clipShape(RoundedRectangle(cornerRadius: radius))
                .allowsHitTesting(false)
            )
            .task {
                guard !reduceMotion else { return }
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 2_400_000_000)
                    withAnimation(.easeInOut(duration: 1.05)) { x = 1.4 }
                    try? await Task.sleep(nanoseconds: 1_150_000_000)
                    var tx = Transaction()
                    tx.disablesAnimations = true
                    withTransaction(tx) { x = -1.4 }
                }
            }
    }
}

/// Expanding signal rings around the bell — the pager is listening.
struct SignalWaves<Content: View>: View {
    @ViewBuilder var content: () -> Content
    @State private var t: Double = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let ink = Color(red: 0.13, green: 0.66, blue: 0.33)

    var body: some View {
        ZStack {
            if !reduceMotion {
                ForEach(0..<3, id: \.self) { i in
                    let f = (t + Double(i) / 3.0).truncatingRemainder(dividingBy: 1.0)
                    Circle()
                        .stroke(ink.opacity(0.55 * (1 - f)), lineWidth: 1.6)
                        .scaleEffect(0.45 + 0.95 * f)
                }
            }
            content()
        }
        .frame(width: 46, height: 46)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.linear(duration: 2.6).repeatForever(autoreverses: false)) { t = 1 }
        }
    }
}

/// One-shot burst of brand dots — the «بالعافية» celebration.
struct DotBurst: View {
    @State private var go = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let palette: [Color] = [Theme.orange, Theme.gold, .white, Theme.orangeBright]

    var body: some View {
        ZStack {
            ForEach(0..<16, id: \.self) { i in
                let angle = Double(i) / 16.0 * 2 * Double.pi + Double(i % 3) * 0.22
                let dist = 92.0 + Double((i * 37) % 55)
                Circle()
                    .fill(palette[i % palette.count])
                    .frame(width: i % 3 == 0 ? 9 : 6, height: i % 3 == 0 ? 9 : 6)
                    .offset(x: go ? cos(angle) * dist : 0,
                            y: go ? sin(angle) * dist - 22 : 0)
                    .opacity(go ? 0 : 0.95)
                    .animation(.spring(response: 0.95, dampingFraction: 0.68).delay(Double(i) * 0.014), value: go)
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            guard !reduceMotion else { return }
            go = true
        }
    }
}

/// Living background: two warm glows drifting very slowly under the UI.
struct AmbientBackground: View {
    @State private var drift = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Theme.canvas
            Circle()
                .fill(Theme.orange.opacity(0.10))
                .frame(width: 300, height: 300)
                .blur(radius: 80)
                .offset(x: drift ? -70 : -120, y: drift ? -250 : -290)
            Circle()
                .fill(Theme.gold.opacity(0.09))
                .frame(width: 260, height: 260)
                .blur(radius: 80)
                .offset(x: drift ? 130 : 90, y: drift ? 300 : 340)
            ForEach(0..<10, id: \.self) { i in
                Circle()
                    .fill(Theme.gold.opacity(0.28))
                    .frame(width: i % 3 == 0 ? 5 : 3, height: i % 3 == 0 ? 5 : 3)
                    .offset(x: CGFloat((i * 67) % 340 - 170),
                            y: CGFloat((i * 113) % 640 - 320) + (drift ? -26 : 0))
                    .opacity(drift ? 0.9 : 0.35)
            }
        }
        .ignoresSafeArea()
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 11).repeatForever(autoreverses: true)) { drift = true }
        }
    }
}

extension View {
    func shineSweep(radius: CGFloat) -> some View { modifier(ShineSweep(radius: radius)) }
}
