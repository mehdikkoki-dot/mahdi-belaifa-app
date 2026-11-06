import PassKit
import SwiftUI
import UIKit

private let apiBase = "https://rennli.basatbelaifa7.workers.dev"

// MARK: - Loyalty API

struct LoyaltyMember: Decodable {
    let name: String
    let phone: String
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

@MainActor
final class LoyaltyStore: ObservableObject {
    @Published var member: LoyaltyMember?
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

    func join(shopCode: String, name: String, phone: String) async -> Bool {
        guard let url = URL(string: "\(apiBase)/api/loyalty/join") else { return false }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["shop": shopCode, "name": name, "phone": phone])
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard (resp as? HTTPURLResponse)?.statusCode == 200 else { return false }
            let r = try JSONDecoder().decode(LoyaltyJoinResponse.self, from: data)
            UserDefaults.standard.set(r.token, forKey: tokenKey(shopCode))
            member = r.member
            return true
        } catch { return false }
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

// MARK: - Loyalty card (waiting + completed screens)

struct LoyaltyCardView: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @StateObject private var store = LoyaltyStore()
    @State private var showJoin = false
    @State private var name = ""
    @State private var phone = ""
    @State private var joining = false
    @State private var joinFailed = false
    @State private var pass: PKPass?
    @State private var showPass = false
    @State private var loadingPass = false
    @Environment(\.openURL) private var openURL

    private var goal: Int { store.member?.goal ?? model.loyaltyGoal }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 19)).foregroundStyle(.white)
                Text(s.loyaltyTitle)
                    .font(.cairo(16.5, .black)).foregroundStyle(.white)
                Spacer()
                if let m = store.member {
                    Text(s.loyaltyCode(m.code))
                        .font(.cairo(12, .bold)).foregroundStyle(.white.opacity(0.85))
                }
            }
            if let m = store.member {
                if goal <= 12 {
                    HStack(spacing: 6) {
                        ForEach(0..<goal, id: \.self) { i in
                            ZStack {
                                Circle()
                                    .fill(i < m.stamps ? Color.white : Color.white.opacity(0.22))
                                    .frame(width: 25, height: 25)
                                if i < m.stamps {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 12, weight: .black))
                                        .foregroundStyle(Theme.orangeDeep)
                                }
                            }
                        }
                        Spacer()
                    }
                } else {
                    ProgressView(value: Double(m.stamps), total: Double(max(goal, 1)))
                        .tint(.white)
                }
                Text(s.loyaltyStamps(m.stamps, goal))
                    .font(.cairo(13.5, .bold)).foregroundStyle(.white.opacity(0.9))
                if m.rewardReady {
                    Text(s.loyaltyRewardReady)
                        .font(.cairo(14, .black)).foregroundStyle(Theme.gold)
                } else if model.status != "completed" {
                    Text(s.loyaltyLinked)
                        .font(.cairo(12.5)).foregroundStyle(.white.opacity(0.8))
                }
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
            } else {
                Text(s.loyaltyJoinLine)
                    .font(.cairo(13.5)).foregroundStyle(.white.opacity(0.88))
                Button {
                    Haptics.tap()
                    showJoin = true
                } label: {
                    Text(s.loyaltyJoin)
                        .font(.cairo(15.5, .black)).foregroundStyle(Theme.orangeDeep)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 999))
                }
                .buttonStyle(PressableStyle())
            }
        }
        .padding(16)
        .background(Theme.brandGradient)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: Theme.orangeDeep.opacity(0.30), radius: 14, y: 6)
        .task(id: model.ticketId + "|" + model.shopCode) {
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
        .sheet(isPresented: $showJoin) {
            joinSheet
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showPass) {
            if let pass { AddPassView(pass: pass) }
        }
    }

    private var joinSheet: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(s.loyaltyTitle)
                .font(.cairo(19, .black)).foregroundStyle(Theme.ink)
            TextField(s.loyaltyName, text: $name)
                .font(.cairo(16)).foregroundStyle(Theme.ink)
                .padding(13)
                .background(Theme.greyPill.opacity(0.6))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            TextField(s.loyaltyPhone, text: $phone)
                .font(.cairo(16)).foregroundStyle(Theme.ink)
                .keyboardType(.phonePad)
                .padding(13)
                .background(Theme.greyPill.opacity(0.6))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            if joinFailed {
                Text(s.loyaltyJoinError)
                    .font(.cairo(13)).foregroundStyle(.red)
            }
            Button {
                joining = true; joinFailed = false
                Task {
                    let ok = await store.join(shopCode: model.shopCode, name: name, phone: phone)
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
                    Text(s.loyaltyJoin).font(.cairo(16, .black))
                    if joining { ProgressView().tint(.white) }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.brandGradient)
                .clipShape(RoundedRectangle(cornerRadius: 999))
            }
            .buttonStyle(PressableStyle())
            .disabled(joining || name.trimmingCharacters(in: .whitespaces).count < 2 || phone.count < 8)
            Spacer()
        }
        .padding(20)
    }
}
