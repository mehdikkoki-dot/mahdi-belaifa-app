import ActivityKit
import AudioToolbox
import AVFoundation
import SwiftUI
import UIKit

private let apiBase = "https://rennli.basatbelaifa7.workers.dev"

// MARK: - API

struct TicketState: Decodable {
    let number: String
    let status: String
    let acknowledgedAt: Double?
    let shopName: String?
    let reviewUrl: String?
    let menuUrl: String?
    let instagramUrl: String?
    let tiktokUrl: String?
    let mapsUrl: String?
    let etaMinutes: Int?
}

struct StoredTicket: Codable, Identifiable, Equatable {
    var id: String
    var number: String
    var shop: String
    var status: String
    var addedAt: Double
}

// MARK: - Single-ticket engine (polling + Live Activity + ringing)

final class TicketModel: ObservableObject {
    @Published var ticketId: String = ""
    @Published var number: String = ""
    @Published var shopName: String = ""
    @Published var reviewUrl: String = ""
    @Published var menuUrl: String = ""
    @Published var instagramUrl: String = ""
    @Published var tiktokUrl: String = ""
    @Published var mapsUrl: String = ""
    @Published var etaMinutes: Int? = nil
    @Published var status: String = ""        // waiting | ready | completed
    @Published var acked: Bool = false
    @Published var error: String = ""
    @Published var ringing: Bool = false
    @Published var flashOn: Bool = false

    var onSync: ((StoredTicket) -> Void)?

    private var timer: Timer?
    private var activity: Activity<TicketAttributes>?
    private var player: AVAudioPlayer?
    private var flashTimer: Timer?

    private var s: Strings { Strings.current() }
    var statusText: String { s.statusText(status) }

    func connect(rawInput: String) {
        let id = Self.extractId(from: rawInput)
        guard !id.isEmpty else { error = s.badLink; return }
        error = ""
        if id != ticketId { status = ""; number = ""; acked = false }
        ticketId = id
        startPolling()
        Task { await refresh() }
    }

    static func extractId(from raw: String) -> String {
        let pattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        if let range = raw.range(of: pattern, options: .regularExpression) {
            return String(raw[range]).lowercased()
        }
        return raw.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func startPolling() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            Task { await self?.refresh() }
        }
    }

    func refresh() async {
        guard !ticketId.isEmpty,
              let url = URL(string: "\(apiBase)/api/tickets/\(ticketId)") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let state = try JSONDecoder().decode(TicketState.self, from: data)
            await MainActor.run { self.apply(state) }
        } catch {
            await MainActor.run { self.error = self.s.serverError }
        }
    }

    private func apply(_ state: TicketState) {
        let wasReady = (status == "ready")
        number = state.number
        status = state.status
        if let sn = state.shopName, !sn.isEmpty { shopName = sn }
        if let ru = state.reviewUrl, !ru.isEmpty { reviewUrl = ru }
        if let v = state.menuUrl { menuUrl = v }
        if let v = state.instagramUrl { instagramUrl = v }
        if let v = state.tiktokUrl { tiktokUrl = v }
        if let v = state.mapsUrl { mapsUrl = v }
        etaMinutes = state.etaMinutes
        acked = state.acknowledgedAt != nil
        if status == "ready" && !acked {
            if !wasReady { beginRinging() }
        } else if ringing {
            stopRinging()
        }
        if status == "completed" || status == "cancelled" {
            Task { await endActivity() }
        } else {
            error = ""
            Task { await updateActivity() }
        }
        onSync?(StoredTicket(id: ticketId, number: number,
                              shop: shopName.isEmpty ? s.shopFallback : shopName,
                              status: status, addedAt: Date().timeIntervalSince1970))
    }

    // MARK: Live Activity

    func startActivity() {
        guard status == "waiting" || status == "ready" else { return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            error = s.activitiesOff
            return
        }
        let attrs = TicketAttributes(number: number.isEmpty ? "—" : number,
                                     shop: shopName.isEmpty ? s.shopFallback : shopName)
        let state = TicketAttributes.ContentState(status: status.isEmpty ? "waiting" : status,
                                                  statusText: statusText)
        do {
            activity = try Activity.request(attributes: attrs,
                                            content: ActivityContent(state: state, staleDate: nil),
                                            pushType: nil)
        } catch {
            self.error = s.activityFail
        }
    }

    private func updateActivity() async {
        if activity == nil, !number.isEmpty { startActivity() }
        guard let act = activity else { return }
        let state = TicketAttributes.ContentState(status: status, statusText: statusText)
        await act.update(ActivityContent(state: state, staleDate: nil))
    }

    private func endActivity() async {
        guard let act = activity else { return }
        let state = TicketAttributes.ContentState(status: "completed", statusText: statusText)
        await act.end(ActivityContent(state: state, staleDate: nil),
                      dismissalPolicy: .after(Date().addingTimeInterval(60)))
        activity = nil
    }

    // MARK: Ringing (foreground pager)

    private func beginRinging() {
        ringing = true
        Haptics.ready()
        flashTimer?.invalidate()
        flashTimer = Timer.scheduledTimer(withTimeInterval: 0.55, repeats: true) { [weak self] _ in
            self?.flashOn.toggle()
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        }
        let tone = UserDefaults.standard.string(forKey: "tone") ?? "ring"
        if let url = Bundle.main.url(forResource: tone, withExtension: "wav") {
            player = try? AVAudioPlayer(contentsOf: url)
            player?.numberOfLoops = -1
            try? AVAudioSession.sharedInstance().setCategory(.playback)
            player?.play()
        }
    }

    func stopRinging() {
        ringing = false
        flashOn = false
        flashTimer?.invalidate()
        player?.stop()
    }

    func stopAll() {
        timer?.invalidate()
        stopRinging()
        Task { await endActivity() }
        ticketId = ""
        status = ""
        number = ""
    }

    func ack() {
        guard let url = URL(string: "\(apiBase)/api/tickets/\(ticketId)/ack") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        let request = req
        stopRinging()
        Haptics.success()
        acked = true
        Task {
            _ = try? await URLSession.shared.data(for: request)
            await refresh()
        }
    }
}

// MARK: - App model (multi-ticket store + anonymous device id)

final class AppModel: ObservableObject {
    @Published var tickets: [StoredTicket] = []
    @Published var selectedId: String = ""
    let detail = TicketModel()

    init() {
        if let data = UserDefaults.standard.data(forKey: "tickets"),
           let saved = try? JSONDecoder().decode([StoredTicket].self, from: data) {
            tickets = saved
        }
        detail.onSync = { [weak self] t in
            self?.upsert(t)
        }
        if let first = tickets.first(where: { $0.status != "completed" }) ?? tickets.first {
            selectedId = first.id
            detail.connect(rawInput: first.id)
        }
    }

    /// Anonymous device identifier — no phone number, no account. Used later
    /// to register this device for APNs once the Developer account exists.
    static func deviceId() -> String {
        if let d = UserDefaults.standard.string(forKey: "deviceId") { return d }
        let d = UUID().uuidString
        UserDefaults.standard.set(d, forKey: "deviceId")
        return d
    }

    func open(rawInput: String) {
        let id = TicketModel.extractId(from: rawInput)
        guard !id.isEmpty else { return }
        selectedId = id
        detail.connect(rawInput: id)
    }

    func closeCurrent() {
        selectedId = ""
        detail.stopAll()
    }

    func select(_ t: StoredTicket) {
        selectedId = t.id
        detail.connect(rawInput: t.id)
    }

    private func upsert(_ t: StoredTicket) {
        if let i = tickets.firstIndex(where: { $0.id == t.id }) {
            var keep = tickets[i]
            keep.number = t.number; keep.shop = t.shop; keep.status = t.status
            tickets[i] = keep
        } else {
            tickets.insert(t, at: 0)
        }
        if let data = try? JSONEncoder().encode(tickets) {
            UserDefaults.standard.set(data, forKey: "tickets")
        }
    }

    func remove(at offsets: IndexSet) {
        tickets.remove(atOffsets: offsets)
        if let data = try? JSONEncoder().encode(tickets) {
            UserDefaults.standard.set(data, forKey: "tickets")
        }
    }
}

// MARK: - Root

struct ContentView: View {
    @StateObject private var app = AppModel()
    @AppStorage("lang") private var lang: String = "ar"
    @State private var tab: Int = 0

    private var s: Strings { Strings(lang: lang) }

    var body: some View {
        TabView(selection: $tab) {
            TicketTab(app: app, s: s, goOrders: { tab = 1 })
                .tabItem { Label(s.tabTicket, systemImage: "bell.fill") }
                .tag(0)
            OrdersView(app: app, s: s, onPick: { tab = 0 })
                .tabItem { Label(s.tabOrders, systemImage: "list.bullet") }
                .tag(1)
            SettingsView(s: s)
                .tabItem { Label(s.tabSettings, systemImage: "gearshape.fill") }
                .tag(2)
        }
        .tint(Theme.orange)
        .preferredColorScheme(.dark)
        .environment(\.layoutDirection, s.isRTL ? .rightToLeft : .leftToRight)
        .onOpenURL { url in
            app.open(rawInput: url.absoluteString)
            tab = 0
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
            if let url = activity.webpageURL {
                app.open(rawInput: url.absoluteString)
                tab = 0
            }
        }
    }
}

// MARK: - Ticket tab

struct TicketTab: View {
    @ObservedObject var app: AppModel
    let s: Strings
    var goOrders: () -> Void

    var body: some View {
        Group {
            if app.selectedId.isEmpty {
                ConnectView(app: app, s: s)
            } else if app.detail.status == "ready" {
                ReadyView(model: app.detail, s: s)
            } else if app.detail.status == "completed" || app.detail.status == "cancelled" {
                CompletedView(app: app, model: app.detail, s: s)
            } else {
                WaitingView(model: app.detail, s: s)
            }
        }
        .background(Theme.paper.ignoresSafeArea())
    }
}

struct ConnectView: View {
    @ObservedObject var app: AppModel
    let s: Strings
    @State private var input: String = ""
    @State private var showScanner = false

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            ZStack {
                Circle().fill(Theme.orangeSoft).frame(width: 92, height: 92)
                Image(systemName: "bell.fill").font(.system(size: 40)).foregroundStyle(Theme.orange)
            }
            Text(s.appName).font(.cairo(34, .black)).foregroundStyle(Theme.cream)
            Text(s.connectHint)
                .font(.cairo(15)).foregroundStyle(Theme.mutedScene)
                .multilineTextAlignment(.center)
            Button {
                showScanner = true
            } label: {
                Label(s.scanButton, systemImage: "qrcode.viewfinder")
                    .font(.cairo(18, .black))
                    .frame(maxWidth: .infinity).padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent).tint(Theme.orange)
            .sheet(isPresented: $showScanner) {
                ScannerSheet { code in app.open(rawInput: code) }
            }
            Text(s.orPaste).font(.cairo(13, .bold)).foregroundStyle(Theme.mutedScene)
            TextField(s.linkPlaceholder, text: $input)
                .textFieldStyle(.roundedBorder)
                .font(.cairo(15))
            Button(s.connect) { app.open(rawInput: input) }
                .font(.cairo(18, .bold))
                .frame(maxWidth: .infinity).padding(.vertical, 6)
                .buttonStyle(.borderedProminent).tint(Theme.orange)
            if !app.detail.error.isEmpty {
                Text(app.detail.error).font(.cairo(13)).foregroundStyle(.red)
            }
            Spacer()
        }
        .padding(24)
    }
}

struct ShopHeader: View {
    let shop: String
    let chip: String?

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 12).fill(Theme.ink).frame(width: 38, height: 38)
                Image(systemName: "bell.fill").font(.system(size: 17)).foregroundStyle(Theme.gold)
            }
            VStack(alignment: .leading, spacing: 0) {
                Text(shop).font(.cairo(16, .bold)).foregroundStyle(Theme.ink)
            }
            Spacer()
            if let chip {
                Text(chip)
                    .font(.cairo(12.5, .black)).foregroundStyle(Theme.gold)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Theme.ink)
                    .clipShape(Capsule())
            }
        }
    }
}

struct WaitingView: View {
    @ObservedObject var model: TicketModel
    let s: Strings

    var body: some View {
        VStack(spacing: 0) {
            TicketCard {
                VStack(spacing: 0) {
                    ShopHeader(shop: model.shopName.isEmpty ? s.shopFallback : model.shopName,
                               chip: s.live)
                    Text(s.orderNumber)
                        .font(.cairo(13, .bold)).foregroundStyle(Theme.tan)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 20)
                    DotMatrixNumber(text: model.number, color: Theme.ink, accent: Theme.orange)
                        .frame(height: 84)
                        .padding(.top, 8)
                    Text(s.waitingLine)
                        .font(.cairo(19, .black)).foregroundStyle(Theme.ink)
                        .padding(.top, 12)
                    Text(s.waitingSub)
                        .font(.cairo(13.5)).foregroundStyle(Theme.tan)
                        .multilineTextAlignment(.center)
                        .padding(.top, 3)
                    if let eta = model.etaMinutes, eta > 0 {
                        Text(s.etaText(eta))
                            .font(.cairo(13, .black)).foregroundStyle(Theme.gold)
                            .padding(.horizontal, 14).padding(.vertical, 7)
                            .background(Theme.ink)
                            .clipShape(Capsule())
                            .padding(.top, 12)
                    }
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Theme.greenInk)
                        Text(s.alertOn)
                            .font(.cairo(13, .bold)).foregroundStyle(Theme.greenInk)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(11)
                    .background(Theme.greenBg)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .padding(.top, 16)
                }
            }
            .padding(.top, 26)
            VenueLinks(model: model, s: s)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 18)
            Spacer()
            VStack(spacing: 3) {
                Text(s.tagline1)
                    .font(.cairo(13.5, .bold)).foregroundStyle(Theme.mutedScene)
                Text(s.tagline2)
                    .font(.cairo(15, .black)).foregroundStyle(Theme.cream)
            }
            .multilineTextAlignment(.center)
            if !model.error.isEmpty {
                Text(model.error).font(.cairo(13)).foregroundStyle(.red).padding(.top, 10)
            }
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 22)
    }
}

struct ReadyView: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @State private var pulse = false

    var body: some View {
        ZStack {
            Theme.readyGradient.ignoresSafeArea()
                .opacity(model.flashOn ? 0.82 : 1.0)
                .animation(.easeInOut(duration: 0.25), value: model.flashOn)
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .stroke(Color.white.opacity(0.35), lineWidth: 2)
                    .frame(width: 330, height: 330)
                    .scaleEffect(pulse ? 1.5 + Double(i) * 0.35 : 0.95 + Double(i) * 0.3)
                    .opacity(pulse ? 0 : 0.5)
                    .animation(.easeOut(duration: 2.4).repeatForever(autoreverses: false)
                        .delay(Double(i) * 0.8), value: pulse)
            }
            VStack(spacing: 0) {
                Text(s.ringNow)
                    .font(.cairo(21, .black)).foregroundStyle(.white)
                    .padding(.top, 28)
                Text(s.ringNowSub)
                    .font(.cairo(13.5, .bold)).foregroundStyle(.white.opacity(0.85))
                    .padding(.top, 3)
                TicketCard {
                    VStack(spacing: 0) {
                        Text(model.shopName.isEmpty ? s.shopFallback : model.shopName)
                            .font(.cairo(15, .black)).foregroundStyle(Theme.ink)
                        Text(s.orderNumber)
                            .font(.cairo(13, .bold)).foregroundStyle(Theme.tan)
                            .padding(.top, 14)
                        DotMatrixNumber(text: model.number, color: Theme.orangeDeep, accent: Theme.orangeDeep)
                            .frame(height: 84)
                            .padding(.top, 8)
                        Text(s.readyTitle)
                            .font(.cairo(24, .black)).foregroundStyle(Theme.orangeDeep)
                            .padding(.top, 12)
                        Text(s.readySub)
                            .font(.cairo(14, .bold)).foregroundStyle(Theme.tan)
                            .padding(.top, 3)
                    }
                }
                .padding(.top, 24)
                Spacer()
                if !model.acked {
                    Button(s.ackButton) { model.ack() }
                        .font(.cairo(18, .black)).foregroundStyle(Theme.orangeDeep)
                        .frame(maxWidth: .infinity).padding(.vertical, 19)
                        .background(Theme.paperTop)
                        .clipShape(RoundedRectangle(cornerRadius: 999))
                        .shadow(color: .black.opacity(0.3), radius: 16, y: 8)
                } else {
                    Text(s.ackDone)
                        .font(.cairo(16, .bold)).foregroundStyle(.white)
                        .padding(.vertical, 19)
                }
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 22)
        }
        .onAppear { pulse = true }
    }
}

struct VenueLinks: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @Environment(\.openURL) private var openURL

    private var links: [(String, String, String)] {
        var out: [(String, String, String)] = []
        if !model.menuUrl.isEmpty { out.append((s.menu, "book.pages", model.menuUrl)) }
        if !model.instagramUrl.isEmpty { out.append((s.instagram, "camera", model.instagramUrl)) }
        if !model.tiktokUrl.isEmpty { out.append((s.tiktok, "music.note", model.tiktokUrl)) }
        if !model.mapsUrl.isEmpty { out.append((s.map, "map", model.mapsUrl)) }
        return out
    }

    var body: some View {
        if !links.isEmpty {
            HStack(spacing: 8) {
                ForEach(Array(links.enumerated()), id: \.offset) { _, link in
                    Button {
                        if let u = URL(string: link.2) { openURL(u) }
                    } label: {
                        Label(link.0, systemImage: link.1)
                            .font(.cairo(13.5, .bold))
                            .padding(.horizontal, 14).padding(.vertical, 9)
                            .background(Theme.paperTop)
                            .foregroundStyle(Theme.ink)
                            .clipShape(Capsule())
                    }
                }
            }
        }
    }
}

struct CompletedView: View {
    @ObservedObject var app: AppModel
    @ObservedObject var model: TicketModel
    let s: Strings

    var body: some View {
        VStack(spacing: 0) {
            TicketCard {
                VStack(spacing: 0) {
                    ShopHeader(shop: model.shopName.isEmpty ? s.shopFallback : model.shopName,
                               chip: s.statusShort(model.status))
                    ZStack {
                        Circle().fill(Theme.greenBg).frame(width: 96, height: 96)
                        Image(systemName: "checkmark")
                            .font(.system(size: 44, weight: .black))
                            .foregroundStyle(Theme.greenInk)
                    }
                    .padding(.top, 22)
                    Text(s.statusText(model.status))
                        .font(.cairo(21, .black)).foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.center)
                        .padding(.top, 14)
                    Text(s.orderNumber)
                        .font(.cairo(13, .bold)).foregroundStyle(Theme.tan)
                        .padding(.top, 14)
                    DotMatrixNumber(text: model.number, color: Theme.ink, accent: Theme.orange)
                        .frame(height: 48)
                        .padding(.top, 6)
                }
            }
            .padding(.top, 26)
            if model.status == "completed" {
                RatingCard(model: model, s: s).padding(.top, 18)
            }
            Spacer()
            Button(s.newTicket) {
                Haptics.tap()
                app.closeCurrent()
            }
            .font(.cairo(17, .black)).foregroundStyle(Theme.orange)
            .padding(.top, 18)
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 22)
    }
}

// MARK: - Rating

struct RatingCard: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @State private var rating: Int = 0
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 6) {
            Text(s.rateTitle).font(.cairo(16, .black)).foregroundStyle(Theme.ink)
            Text(rating == 0 ? s.rateAsk : s.rateThanks)
                .font(.cairo(13, .bold)).foregroundStyle(Theme.tan)
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { i in
                    Button {
                        rating = i
                        if !model.reviewUrl.isEmpty, let u = URL(string: model.reviewUrl) {
                            openURL(u)
                        }
                    } label: {
                        Image(systemName: i <= rating ? "star.fill" : "star")
                            .font(.system(size: 22))
                            .foregroundStyle(Theme.goldDeep)
                    }
                    .accessibilityLabel("\(i)")
                }
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(18)
        .background(Theme.paperGradient)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: .black.opacity(0.35), radius: 18, y: 10)
    }
}

// MARK: - Orders

struct OrdersView: View {
    @ObservedObject var app: AppModel
    let s: Strings
    var onPick: () -> Void

    var body: some View {
        NavigationStack {
            List {
                if app.tickets.isEmpty {
                    Text(s.ordersEmpty).font(.cairo(15)).foregroundStyle(Theme.mutedScene)
                }
                ForEach(app.tickets) { t in
                    Button {
                        app.select(t)
                        onPick()
                    } label: {
                        HStack(spacing: 14) {
                            DotMatrixNumber(text: t.number, color: Theme.cream, accent: Theme.orange)
                                .frame(width: 84, height: 30)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(t.shop).font(.cairo(15.5, .bold)).foregroundStyle(Theme.cream)
                                Text(timeAgo(t.addedAt)).font(.cairo(12.5)).foregroundStyle(Theme.mutedScene)
                            }
                            Spacer()
                            StatusPill(status: t.status, s: s)
                        }
                        .padding(.vertical, 6)
                    }
                    .listRowBackground(Theme.card)
                }
                .onDelete(perform: app.remove)
            }
            .listStyle(.plain)
            .background(Theme.paper)
            .navigationTitle(s.ordersTitle)
        }
    }

    private func timeAgo(_ ts: Double) -> String {
        let mins = max(1, Int((Date().timeIntervalSince1970 - ts) / 60))
        return s.lang == "ar" ? "قبل \(mins) \(s.minutesAgo)" : "il y a \(mins) \(s.minutesAgo)"
    }
}

// MARK: - Settings

struct SettingsView: View {
    let s: Strings
    @AppStorage("tone") private var tone: String = "ring"
    @AppStorage("lang") private var lang: String = "ar"
    @State private var previewPlayer: AVAudioPlayer?

    var body: some View {
        NavigationStack {
            Form {
                Section(s.tone) {
                    Picker(s.tone, selection: $tone) {
                        Text(s.tone1).tag("ring")
                        Text(s.tone2).tag("ring2")
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                    .onChange(of: tone) { _, newValue in preview(newValue) }
                }
                Section(s.language) {
                    Picker(s.language, selection: $lang) {
                        Text("العربية").tag("ar")
                        Text("Français").tag("fr")
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }
                Section {
                    LabeledContent(s.device, value: String(AppModel.deviceId().prefix(8)).uppercased())
                    LabeledContent(s.version, value: "4.0")
                }
            }
            .navigationTitle(s.settingsTitle)
        }
    }

    private func preview(_ name: String) {
        guard let url = Bundle.main.url(forResource: name, withExtension: "wav") else { return }
        previewPlayer = try? AVAudioPlayer(contentsOf: url)
        try? AVAudioSession.sharedInstance().setCategory(.playback)
        previewPlayer?.play()
    }
}
