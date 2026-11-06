import PassKit
import SwiftUI
import UIKit

private let apiBase = "https://rennli.basatbelaifa7.workers.dev"

// MARK: - Hex colour helper

private func colorFromHex(_ hex: String) -> Color? {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    guard s.count == 6, let v = UInt64(s, radix: 16) else { return nil }
    let r = Double((v >> 16) & 0xFF) / 255.0
    let g = Double((v >> 8) & 0xFF) / 255.0
    let b = Double(v & 0xFF) / 255.0
    return Color(red: r, green: g, blue: b)
}

// MARK: - Brand bundle

struct BrandBundle: Decodable {
    let shopCode: String?
    let name: String?
    let primary: String?
    let logoUrl: String?
    let template: String?
    let font: String?
    let goal: Int?
    let reward: String?
    let title: String?
    let poweredBy: Bool?
    let googleWallet: Bool?
    let moduleEnabled: Bool?
}

// MARK: - Loyalty API

struct LoyaltyMember: Decodable {
    let name: String?
    let phone: String?
    let code: String
    let stamps: Int
    let goal: Int
    let rewardReady: Bool
    let rewards: Int
    let totalStamps: Int
    let passUrl: String?
}

private struct LoyaltyJoinResponse: Decodable {
    let ok: Bool
    let token: String
    let member: LoyaltyMember
}

private struct LoyaltyMeResponse: Decodable {
    let member: LoyaltyMember?
}

private struct GoogleSaveResponse: Decodable {
    let url: String
}

@MainActor
final class LoyaltyStore: ObservableObject {
    @Published var member: LoyaltyMember?
    @Published var brand: BrandBundle?
    private var brandCache: [String: BrandBundle] = [:]
    private var linkedTickets = Set<String>()

    private func tokenKey(_ shopCode: String) -> String { "cf_loyalty_token_" + shopCode }
    func token(shopCode: String) -> String {
        UserDefaults.standard.string(forKey: tokenKey(shopCode)) ?? ""
    }

    func load(shopCode: String) async {
        guard !token(shopCode: shopCode).isEmpty else { return }
        await refresh(shopCode: shopCode)
    }

    func refresh(shopCode: String) async {
        let tok = token(shopCode: shopCode)
        guard !tok.isEmpty,
              let url = URL(string: "\(apiBase)/api/loyalty/me?shop=\(shopCode)&token=\(tok)") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            member = try JSONDecoder().decode(LoyaltyMeResponse.self, from: data).member
        } catch {}
    }

    func fetchBrand(shopCode: String) async {
        if let cached = brandCache[shopCode] {
            brand = cached
            return
        }
        guard let url = URL(string: "\(apiBase)/api/shops/\(shopCode)/brand") else { return }
        do {
            let (data, resp) = try await URLSession.shared.data(from: url)
            guard (resp as? HTTPURLResponse)?.statusCode == 200 else { return }
            let decoded = try JSONDecoder().decode(BrandBundle.self, from: data)
            brandCache[shopCode] = decoded
            brand = decoded
        } catch {}
    }

    func join(shopCode: String) async -> Bool {
        guard let url = URL(string: "\(apiBase)/api/loyalty/join") else { return false }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["shop": shopCode])
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard (resp as? HTTPURLResponse)?.statusCode == 200 else { return false }
            let r = try JSONDecoder().decode(LoyaltyJoinResponse.self, from: data)
            UserDefaults.standard.set(r.token, forKey: tokenKey(shopCode))
            member = r.member
            return true
        } catch { return false }
    }

    func fetchGoogleSaveURL(shopCode: String) async -> URL? {
        let tok = token(shopCode: shopCode)
        guard !tok.isEmpty,
              let url = URL(string: "\(apiBase)/api/loyalty/google-save?shop=\(shopCode)&token=\(tok)") else { return nil }
        do {
            let (data, resp) = try await URLSession.shared.data(from: url)
            guard (resp as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            let decoded = try JSONDecoder().decode(GoogleSaveResponse.self, from: data)
            return URL(string: decoded.url)
        } catch { return nil }
    }

    /// Link the current ticket to the member so completion auto-stamps it.
    func link(shopCode: String, ticketId: String) async {
        let tok = token(shopCode: shopCode)
        guard !tok.isEmpty, !ticketId.isEmpty, !linkedTickets.contains(ticketId) else { return }
        linkedTickets.insert(ticketId)
        guard let url = URL(string: "\(apiBase)/api/loyalty/link") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["shop": shopCode, "token": tok, "ticketId": ticketId])
        _ = try? await URLSession.shared.data(for: req)
    }
}

// MARK: - PassKit add sheet

private struct AddPassView: UIViewControllerRepresentable {
    let pass: PKPass
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator { Coordinator { dismiss() } }

    func makeUIViewController(context: Context) -> UIViewController {
        guard PKAddPassesViewController.canAddPasses(),
              let vc = PKAddPassesViewController(pass: pass) else { return UIViewController() }
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ vc: UIViewController, context: Context) {}

    final class Coordinator: NSObject, PKAddPassesViewControllerDelegate {
        let done: () -> Void
        init(done: @escaping () -> Void) { self.done = done }
        func addPassesViewControllerDidFinish(_ controller: PKAddPassesViewController) { done() }
    }
}

private func downloadPass(passUrl: String) async -> PKPass? {
    guard let url = URL(string: passUrl + "/apple.pkpass") else { return nil }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        return try PKPass(data: data)
    } catch { return nil }
}

// MARK: - Checkmark shape (for trim-draw animation)

private struct CheckShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX + rect.width * 0.22, y: rect.minY + rect.height * 0.52))
        p.addLine(to: CGPoint(x: rect.minX + rect.width * 0.42, y: rect.minY + rect.height * 0.74))
        p.addLine(to: CGPoint(x: rect.maxX - rect.width * 0.18, y: rect.minY + rect.height * 0.26))
        return p
    }
}

// MARK: - Loyalty card (waiting + completed screens)

struct LoyaltyCardView: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @StateObject private var store = LoyaltyStore()
    @State private var showJoin = false
    @State private var joining = false
    @State private var joinFailed = false
    @State private var pass: PKPass?
    @State private var showPass = false
    @State private var loadingPass = false
    @State private var loadingGoogle = false
    @State private var trims: [Int: Double] = [:]
    @State private var scales: [Int: CGFloat] = [:]
    @State private var animatingIndices: Set<Int> = []
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var primaryColor: Color {
        if let hex = store.brand?.primary, let c = colorFromHex(hex) { return c }
        return Color(red: 0.843, green: 0.0, blue: 0.082) // #D70015 default
    }

    private var goal: Int {
        if let g = store.brand?.goal, g > 0 { return g }
        if let g = store.member?.goal, g > 0 { return g }
        return model.loyaltyGoal
    }

    private var displayTitle: String {
        if let t = store.brand?.title, !t.isEmpty { return t }
        return s.loyaltyTitle
    }

    private var displayReward: String {
        if let r = store.brand?.reward, !r.isEmpty { return r }
        return ""
    }

    private var stamps: Int { store.member?.stamps ?? 0 }

    var body: some View {
        VStack(spacing: 12) {
            // White card shell
            VStack(spacing: 0) {
                // Top band — shop primary colour
                HStack(spacing: 8) {
                    Text(displayTitle)
                        .font(.cairo(16.5, .black))
                        .foregroundStyle(.white)
                    Spacer()
                    Text("\(stamps)/\(goal)")
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.25))
                        .clipShape(Capsule())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(primaryColor)

                // Body on white
                VStack(alignment: .leading, spacing: 12) {
                    if !displayReward.isEmpty {
                        Text("\(s.loyaltyRewardLabel): \(displayReward)")
                            .font(.cairo(13.5, .bold))
                            .foregroundStyle(Theme.tan)
                    }

                    stampGrid

                    // Thin progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(primaryColor.opacity(0.12))
                            Capsule().fill(primaryColor)
                                .frame(width: geo.size.width * progressFraction)
                        }
                    }
                    .frame(height: 5)
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.35), value: stamps)

                    if let m = store.member {
                        if m.rewardReady {
                            HStack(spacing: 8) {
                                Image(systemName: "gift.fill")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(primaryColor)
                                Text(s.loyaltyRewardReady)
                                    .font(.cairo(14, .black))
                                    .foregroundStyle(primaryColor)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(primaryColor.opacity(0.10))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else if model.status != "completed" {
                            Text(s.loyaltyLinked)
                                .font(.cairo(12.5))
                                .foregroundStyle(Theme.tan)
                        }
                        Text(s.loyaltyStamps(m.stamps, goal))
                            .font(.cairo(13, .bold))
                            .foregroundStyle(Theme.tan)
                    } else {
                        Text(s.loyaltyJoinLine)
                            .font(.cairo(13.5))
                            .foregroundStyle(Theme.tan)
                        Button {
                            Haptics.tap()
                            showJoin = true
                        } label: {
                            Text(s.loyaltyGetCard)
                                .font(.cairo(15.5, .black))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(primaryColor)
                                .clipShape(RoundedRectangle(cornerRadius: 999))
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(16)
            }
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .shadow(color: .black.opacity(0.08), radius: 14, y: 6)

            // Buttons below / outside the card
            if let m = store.member {
                if let passUrl = m.passUrl, !passUrl.isEmpty {
                    Button {
                        Haptics.tap()
                        loadingPass = true
                        Task {
                            if let p = await downloadPass(passUrl: passUrl) {
                                pass = p; showPass = true
                            } else if let u = URL(string: passUrl) {
                                openURL(u)
                            }
                            loadingPass = false
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "wallet.pass.fill").font(.system(size: 16))
                            Text(s.loyaltyAddWallet).font(.cairo(15, .black))
                            if loadingPass { ProgressView().tint(.white) }
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.black)
                        .clipShape(RoundedRectangle(cornerRadius: 999))
                    }
                    .buttonStyle(PressableStyle())
                }

                if store.brand?.googleWallet == true {
                    Button {
                        Haptics.tap()
                        loadingGoogle = true
                        Task {
                            if let u = await store.fetchGoogleSaveURL(shopCode: model.shopCode) {
                                openURL(u)
                            }
                            loadingGoogle = false
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "wallet.pass").font(.system(size: 16, weight: .bold))
                            Text(s.loyaltyAddGoogle).font(.cairo(15, .black))
                            if loadingGoogle { ProgressView() }
                        }
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 999).stroke(Color.black.opacity(0.18), lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 999))
                    }
                    .buttonStyle(PressableStyle())
                }

                Text(s.loyaltyMemberNo(m.code))
                    .font(.cairo(12, .bold))
                    .foregroundStyle(Theme.tan)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .task(id: model.ticketId + "|" + model.shopCode) {
            await store.fetchBrand(shopCode: model.shopCode)
            await store.load(shopCode: model.shopCode)
            if store.member != nil {
                await store.link(shopCode: model.shopCode, ticketId: model.ticketId)
            }
        }
        .onChange(of: model.status) { _, newStatus in
            if newStatus == "completed" {
                Task { await store.refresh(shopCode: model.shopCode) }
            }
        }
        .onChange(of: store.member?.stamps) { _, newValue in
            if let newValue {
                Task { await evaluateNewStamps(current: newValue) }
            }
        }
        .sheet(isPresented: $showJoin) {
            joinSheet
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showPass) {
            if let pass { AddPassView(pass: pass) }
        }
    }

    private var progressFraction: Double {
        guard goal > 0 else { return 0 }
        return min(1.0, max(0.0, Double(stamps) / Double(goal)))
    }

    // MARK: Stamp grid

    private var stampGrid: some View {
        Group {
            if goal <= 12 {
                let columns = max(1, (goal + 1) / 2) // ceil(goal/2): 6→3, 8→4, 10→5
                let rows = Array(stride(from: 0, to: goal, by: columns))
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(rows, id: \.self) { rowStart in
                        HStack(spacing: 10) {
                            ForEach(rowStart..<min(rowStart + columns, goal), id: \.self) { idx in
                                stampCell(index: idx)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                }
            } else {
                ProgressView(value: Double(stamps), total: Double(max(goal, 1)))
                    .tint(primaryColor)
            }
        }
    }

    private func stampCell(index idx: Int) -> some View {
        let isFilled = idx < stamps
        let isLast = idx == goal - 1
        let isAnimating = animatingIndices.contains(idx)
        return ZStack {
            Circle()
                .fill(isFilled ? primaryColor : Color.white)
                .frame(width: 44, height: 44)
            Circle()
                .stroke(isFilled ? primaryColor : primaryColor.opacity(0.35), lineWidth: 1.5)
                .frame(width: 44, height: 44)
            if isFilled {
                if isLast {
                    Image(systemName: "gift.fill")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                } else if isAnimating {
                    CheckShape()
                        .trim(from: 0, to: CGFloat(trims[idx] ?? 0))
                        .stroke(Color.white, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                        .frame(width: 22, height: 22)
                } else {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .black))
                        .foregroundStyle(.white)
                }
            } else {
                if isLast {
                    Image(systemName: "gift")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(primaryColor)
                }
            }
        }
        .frame(width: 44, height: 44)
        .scaleEffect(scales[idx] ?? 1.0)
    }

    // MARK: New-stamp animation

    private func evaluateNewStamps(current: Int) async {
        let key = "cf_loy_seen_" + model.shopCode
        // First-ever load: set silently, no animation.
        guard UserDefaults.standard.object(forKey: key) != nil else {
            UserDefaults.standard.set(current, forKey: key)
            return
        }
        let last = UserDefaults.standard.integer(forKey: key)
        guard current > last else {
            UserDefaults.standard.set(current, forKey: key)
            return
        }
        if reduceMotion {
            UserDefaults.standard.set(current, forKey: key)
            return
        }
        let newIndices = Array(last..<current)
        for idx in newIndices {
            animatingIndices.insert(idx)
            trims[idx] = 0
            scales[idx] = 0.55
        }
        for (offset, idx) in newIndices.enumerated() {
            if offset > 0 {
                try? await Task.sleep(nanoseconds: 180_000_000)
            }
            withAnimation(.spring(response: 0.35, dampingFraction: 0.55)) {
                scales[idx] = 1.0
            }
            withAnimation(.easeInOut(duration: 0.35)) {
                trims[idx] = 1.0
            }
        }
        try? await Task.sleep(nanoseconds: 420_000_000)
        UserDefaults.standard.set(current, forKey: key)
        animatingIndices.removeAll()
    }

    // MARK: Join sheet — anonymous, one button

    private var joinSheet: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(displayTitle)
                .font(.cairo(19, .black)).foregroundStyle(Theme.ink)
            if !displayReward.isEmpty {
                Text("\(s.loyaltyRewardLabel): \(displayReward)")
                    .font(.cairo(14, .bold)).foregroundStyle(Theme.tan)
            }
            Text(s.loyaltyJoinLine)
                .font(.cairo(13.5)).foregroundStyle(Theme.tan)
            // Teaser grid (all empty, bundle goal)
            teaserGrid
            if joinFailed {
                Text(s.loyaltyJoinError)
                    .font(.cairo(13)).foregroundStyle(.red)
            }
            Button {
                joining = true; joinFailed = false
                Task {
                    let ok = await store.join(shopCode: model.shopCode)
                    joining = false
                    if ok {
                        await store.link(shopCode: model.shopCode, ticketId: model.ticketId)
                        showJoin = false
                    } else {
                        joinFailed = true
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    Text(s.loyaltyGetCard).font(.cairo(16, .black))
                    if joining { ProgressView().tint(.white) }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(primaryColor)
                .clipShape(RoundedRectangle(cornerRadius: 999))
            }
            .buttonStyle(PressableStyle())
            .disabled(joining)
            Spacer()
        }
        .padding(20)
    }

    private var teaserGrid: some View {
        Group {
            if goal <= 12 {
                let columns = max(1, (goal + 1) / 2)
                let rows = Array(stride(from: 0, to: goal, by: columns))
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(rows, id: \.self) { rowStart in
                        HStack(spacing: 10) {
                            ForEach(rowStart..<min(rowStart + columns, goal), id: \.self) { idx in
                                ZStack {
                                    Circle()
                                        .fill(Color.white)
                                        .frame(width: 44, height: 44)
                                    Circle()
                                        .stroke(primaryColor.opacity(0.35), lineWidth: 1.5)
                                        .frame(width: 44, height: 44)
                                    if idx == goal - 1 {
                                        Image(systemName: "gift")
                                            .font(.system(size: 17, weight: .bold))
                                            .foregroundStyle(primaryColor)
                                    }
                                }
                                .frame(width: 44, height: 44)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                }
            } else {
                ProgressView(value: 0, total: Double(max(goal, 1)))
                    .tint(primaryColor)
            }
        }
    }
}
