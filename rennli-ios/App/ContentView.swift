import ActivityKit
import PhotosUI
import Vision
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

    private var pollTask: Task<Void, Never>?
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
        // Task loop, not Timer: a Timer scheduled off the main run loop
        // (e.g. from the camera callback) never fires, which froze the
        // screen on its first failed fetch.
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refresh()
                try? await Task.sleep(nanoseconds: 3_000_000_000)
            }
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
        error = ""
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
        pollTask?.cancel()
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

    func clearAll() {
        tickets = []
        UserDefaults.standard.removeObject(forKey: "tickets")
        selectedId = ""
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
        .preferredColorScheme(.light)
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
        .animation(.spring(response: 0.5, dampingFraction: 0.9), value: app.detail.status)
        .animation(.spring(response: 0.5, dampingFraction: 0.9), value: app.selectedId)
    }
}

struct ConnectView: View {
    @ObservedObject var app: AppModel
    let s: Strings
    @State private var input: String = ""
    @State private var showScanner = false
    @State private var showGallery = false
    @State private var galleryItem: PhotosPickerItem?
    @State private var galleryError: String = ""

    /// Temporary bridge (his request): read a ticket QR from a saved photo.
    /// Vision first (strong on photos of screens), CIDetector as fallback.
    static func decodeQR(from data: Data) -> String? {
        guard let image = UIImage(data: data) else { return nil }
        if let cg = image.cgImage {
            let request = VNDetectBarcodesRequest()
            request.symbologies = [.qr]
            let orientation: CGImagePropertyOrientation
            switch image.imageOrientation {
            case .up: orientation = .up
            case .down: orientation = .down
            case .left: orientation = .left
            case .right: orientation = .right
            case .upMirrored: orientation = .upMirrored
            case .downMirrored: orientation = .downMirrored
            case .leftMirrored: orientation = .leftMirrored
            case .rightMirrored: orientation = .rightMirrored
            @unknown default: orientation = .up
            }
            let handler = VNImageRequestHandler(cgImage: cg, orientation: orientation, options: [:])
            if (try? handler.perform([request])) != nil,
               let payload = request.results?.first?.payloadStringValue {
                return payload
            }
        }
        guard let ci = CIImage(image: image) else { return nil }
        let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: nil,
                                  options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
        let features = detector?.features(in: ci) as? [CIQRCodeFeature]
        return features?.first?.messageString
    }

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            ZStack {
                Circle().fill(Theme.cardWhite).frame(width: 92, height: 92)
                    .shadow(color: .black.opacity(0.08), radius: 14, y: 6)
                Image(systemName: "bell.fill").font(.system(size: 40)).foregroundStyle(Theme.orange)
                    .symbolEffect(.wiggle, options: .nonRepeating, isActive: true)
            }
            Text(s.appName).font(.cairo(34, .black)).foregroundStyle(Theme.ink)
            Text(s.connectHint)
                .font(.cairo(15)).foregroundStyle(Theme.tan)
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
            Button {
                showGallery = true
            } label: {
                Label(s.galleryButton, systemImage: "photo.on.rectangle.angled")
                    .font(.cairo(16, .bold))
                    .frame(maxWidth: .infinity).padding(.vertical, 5)
            }
            .buttonStyle(.bordered).tint(Theme.orange)
            .photosPicker(isPresented: $showGallery, selection: $galleryItem, matching: .images)
            .onChange(of: galleryItem) { _, item in
                guard let item else { return }
                Task {
                    let data = try? await item.loadTransferable(type: Data.self)
                    if let data, let code = Self.decodeQR(from: data) {
                        galleryError = ""
                        app.open(rawInput: code)
                    } else {
                        galleryError = s.qrNotFound
                    }
                }
            }
            if !galleryError.isEmpty {
                Text(galleryError).font(.cairo(13)).foregroundStyle(.red)
            }
            Text(s.orPaste).font(.cairo(13, .bold)).foregroundStyle(Theme.tan)
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
        HStack(spacing: 11) {
            ZStack {
                RoundedRectangle(cornerRadius: 13).fill(Theme.orange).frame(width: 42, height: 42)
                Text(String(shop.prefix(1)))
                    .font(.cairo(19, .black)).foregroundStyle(.white)
            }
            Text(shop).font(.cairo(16.5, .black)).foregroundStyle(Theme.ink)
            Spacer()
            if let chip {
                HStack(spacing: 5) {
                    Circle().fill(Color(red: 0.13, green: 0.72, blue: 0.35)).frame(width: 7, height: 7)
                    Text(chip).font(.cairo(12.5, .bold)).foregroundStyle(Theme.tan)
                }
            }
        }
    }
}

/// White ticket card with the soft Pingloy-grade shadow.
struct WhiteCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(20)
            .background(Theme.cardWhite)
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .shadow(color: .black.opacity(0.07), radius: 18, y: 8)
    }
}

struct WaitingView: View {
    @ObservedObject var model: TicketModel
    let s: Strings

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                WhiteCard {
                    VStack(spacing: 0) {
                        ShopHeader(shop: model.shopName.isEmpty ? s.shopFallback : model.shopName,
                                   chip: s.live)
                        Text(s.orderNumber)
                            .font(.cairo(13, .bold)).foregroundStyle(Theme.tan)
                            .padding(.top, 22)
                        DotMatrixNumber(text: model.number, color: Theme.ink, offOpacity: 0)
                            .frame(height: 92)
                            .padding(.top, 10)
                        Text(s.waitingLine)
                            .font(.cairo(19, .black)).foregroundStyle(Theme.ink)
                            .padding(.top, 14)
                        if let eta = model.etaMinutes, eta > 0 {
                            Text(s.etaText(eta))
                                .font(.cairo(13.5)).foregroundStyle(Theme.tan)
                                .padding(.top, 4)
                        }
                    }
                }
                .entrance(0)
                WhiteCard {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "bell.badge.fill")
                            .font(.system(size: 19))
                            .foregroundStyle(Color(red: 0.13, green: 0.66, blue: 0.33))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(s.alertOn)
                                .font(.cairo(14, .bold)).foregroundStyle(Theme.ink)
                            Text(s.alertSub)
                                .font(.cairo(12.5)).foregroundStyle(Theme.tan)
                        }
                        Spacer()
                    }
                    .padding(-4)
                }
                .entrance(0.08)
                VenueLinks(model: model, s: s)
                    .entrance(0.16)
                PoweredBy(s: s)
                    .padding(.top, 2)
                    .entrance(0.24)
                if !model.error.isEmpty {
                    Text(model.error).font(.cairo(13)).foregroundStyle(.red)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
    }
}

struct ReadyView: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @State private var pulse = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                VStack(spacing: 0) {
                    ShopHeader(shop: model.shopName.isEmpty ? s.shopFallback : model.shopName,
                               chip: nil)
                    .padding(.horizontal, 4)
                }
                VStack(spacing: 0) {
                    Text(s.orderNumber)
                        .font(.cairo(13, .bold)).foregroundStyle(.white.opacity(0.75))
                    DotMatrixNumber(text: model.number,
                                    color: Color(red: 1.0, green: 0.914, blue: 0.878),
                                    offOpacity: 0)
                        .frame(height: 92)
                        .padding(.top, 10)
                    HStack(spacing: 7) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 17))
                            .foregroundStyle(Color(red: 0.35, green: 0.9, blue: 0.5))
                            .symbolEffect(.bounce, value: model.status)
                        Text(s.readyTitle)
                            .font(.cairo(20, .black)).foregroundStyle(.white)
                    }
                    .padding(.top, 14)
                    Text(s.readySub)
                        .font(.cairo(13.5)).foregroundStyle(.white.opacity(0.85))
                        .padding(.top, 4)
                    if !model.acked {
                        Button(s.ackSeen) { model.ack() }
                            .font(.cairo(17, .black)).foregroundStyle(Theme.orangeDeep)
                            .frame(maxWidth: .infinity).padding(.vertical, 16)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 999))
                            .buttonStyle(PressableStyle())
                            .padding(.top, 18)
                    } else {
                        Text(s.ackDone)
                            .font(.cairo(14.5, .bold)).foregroundStyle(.white)
                            .padding(.top, 18)
                    }
                }
                .padding(22)
                .background(
                    LinearGradient(colors: [Theme.readyCardTop, Theme.readyCardBottom],
                                   startPoint: .top, endPoint: .bottom)
                )
                .clipShape(RoundedRectangle(cornerRadius: 26))
                .shadow(color: Theme.orange.opacity(model.flashOn ? 0.6 : 0.3),
                        radius: model.flashOn ? 32 : 18, y: 10)
                .scaleEffect(model.ringing && model.flashOn ? 1.015 : 1.0)
                .opacity(model.flashOn ? 0.92 : 1.0)
                .animation(.easeInOut(duration: 0.3), value: model.flashOn)
                PoweredBy(s: s)
            }
            .padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .onAppear { pulse = true }
    }
}

struct VenueLinks: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @Environment(\.openURL) private var openURL

    private var hasAny: Bool {
        !model.menuUrl.isEmpty || !model.instagramUrl.isEmpty || !model.tiktokUrl.isEmpty || !model.mapsUrl.isEmpty
    }

    var body: some View {
        if hasAny {
            WhiteCard {
                VStack(alignment: .leading, spacing: 10) {
                    Text(s.followUs)
                        .font(.cairo(13, .bold)).foregroundStyle(Theme.tan)
                    if !model.menuUrl.isEmpty {
                        bigBar(title: s.menu, icon: "book.pages", url: model.menuUrl,
                               bg: Theme.orange, fg: Color.white)
                    }
                    HStack(spacing: 10) {
                        if !model.instagramUrl.isEmpty {
                            smallPill(title: s.instagram, icon: "camera", url: model.instagramUrl)
                        }
                        if !model.tiktokUrl.isEmpty {
                            smallPill(title: s.tiktok, icon: "music.note", url: model.tiktokUrl)
                        }
                    }
                    if !model.mapsUrl.isEmpty {
                        bigBar(title: s.map, icon: "mappin.and.ellipse", url: model.mapsUrl,
                               bg: Theme.greyPill, fg: Theme.ink)
                    }
                }
                .padding(-4)
            }
        }
    }

    private func bigBar(title: String, icon: String, url: String, bg: Color, fg: Color) -> some View {
        Button {
            if let u = URL(string: url) { openURL(u) }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 15, weight: .bold))
                Text(title).font(.cairo(15, .black))
            }
            .foregroundStyle(fg)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(bg)
            .clipShape(RoundedRectangle(cornerRadius: 13))
        }
    }

    private func smallPill(title: String, icon: String, url: String) -> some View {
        Button {
            if let u = URL(string: url) { openURL(u) }
        } label: {
            HStack(spacing: 7) {
                Image(systemName: icon).font(.system(size: 14, weight: .bold))
                Text(title).font(.cairo(14, .bold))
            }
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
            .background(Theme.greyPill)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

struct CompletedView: View {
    @ObservedObject var app: AppModel
    @ObservedObject var model: TicketModel
    let s: Strings
    @Environment(\.openURL) private var openURL

    var body: some View {
        ZStack {
            Theme.brandGradient.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 14) {
                    HStack(spacing: 11) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 13).fill(Color.white).frame(width: 42, height: 42)
                            Image(systemName: "bell.fill")
                                .font(.system(size: 18)).foregroundStyle(Theme.orangeDeep)
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            Text(model.shopName.isEmpty ? s.shopFallback : model.shopName)
                                .font(.cairo(16.5, .black)).foregroundStyle(.white)
                            Text(s.statusShort(model.status))
                                .font(.cairo(12.5, .bold)).foregroundStyle(.white.opacity(0.75))
                        }
                        Spacer()
                    }
                    .padding(.top, 8)
                    LEDPanel(text: model.number)
                        .frame(height: 168)
                        .entrance(0.05)
                    Text(s.rateTitle)
                        .font(.cairo(21, .black)).foregroundStyle(.white)
                        .entrance(0.14)
                    if model.status == "completed" && !model.reviewUrl.isEmpty {
                        FrostedBar(radius: 22) {
                            VStack(spacing: 8) {
                                Text(s.thanksTitle)
                                    .font(.cairo(18, .black)).foregroundStyle(.white)
                                Text(s.rateLine(model.shopName.isEmpty ? s.shopFallback : model.shopName))
                                    .font(.cairo(13.5)).foregroundStyle(.white.opacity(0.85))
                                    .multilineTextAlignment(.center)
                                Button {
                                    if let u = URL(string: model.reviewUrl) { openURL(u) }
                                } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: "star.fill").font(.system(size: 16))
                                        Text(s.rateButton).font(.cairo(16, .black))
                                    }
                                    .foregroundStyle(Theme.ink)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(Color.white)
                                    .clipShape(RoundedRectangle(cornerRadius: 999))
                                }
                                .padding(.top, 4)
                            }
                            .padding(18)
                        }
                    }
                    VenueLinksDark(model: model, s: s)
                        .entrance(0.2)
                    PoweredBy(s: s, dark: true)
                    Button(s.newTicket) {
                        Haptics.tap()
                        app.closeCurrent()
                    }
                    .font(.cairo(15, .bold)).foregroundStyle(.white.opacity(0.85))
                    .padding(.top, 4)
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 20)
            }
        }
    }
}

/// Venue links on the dark completed scene: one frosted menu bar + circles.
struct VenueLinksDark: View {
    @ObservedObject var model: TicketModel
    let s: Strings
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 12) {
            if !model.menuUrl.isEmpty {
                FrostedBar(radius: 16) {
                    Button {
                        if let u = URL(string: model.menuUrl) { openURL(u) }
                    } label: {
                        HStack {
                            Text(s.menu).font(.cairo(15.5, .black)).foregroundStyle(.white)
                            Spacer()
                            Image(systemName: "book.pages").foregroundStyle(.white)
                        }
                        .padding(.horizontal, 18).padding(.vertical, 14)
                    }
                }
            }
            HStack(spacing: 14) {
                Spacer()
                if !model.tiktokUrl.isEmpty {
                    circle(icon: "music.note", url: model.tiktokUrl)
                }
                if !model.instagramUrl.isEmpty {
                    circle(icon: "camera", url: model.instagramUrl)
                }
                if !model.mapsUrl.isEmpty {
                    circle(icon: "mappin.and.ellipse", url: model.mapsUrl)
                }
                Spacer()
            }
        }
    }

    private func circle(icon: String, url: String) -> some View {
        Button {
            if let u = URL(string: url) { openURL(u) }
        } label: {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .background(Color.white.opacity(0.13))
                .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 1))
                .clipShape(Circle())
        }
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
    @State private var showScanner = false
    @State private var confirmClear = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        showScanner = true
                    } label: {
                        HStack(spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 13).fill(Theme.orange).frame(width: 44, height: 44)
                                Image(systemName: "qrcode.viewfinder")
                                    .font(.system(size: 20, weight: .bold)).foregroundStyle(.white)
                            }
                            VStack(alignment: .leading, spacing: 1) {
                                Text(s.scanTitle).font(.cairo(15.5, .black)).foregroundStyle(Theme.ink)
                                Text(s.scanSub).font(.cairo(12.5)).foregroundStyle(Theme.tan)
                            }
                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Theme.cardWhite)
                }
                Section(s.currentOrders) {
                    if app.tickets.isEmpty {
                        Text(s.ordersEmpty).font(.cairo(15)).foregroundStyle(Theme.tan)
                    }
                    ForEach(app.tickets) { t in
                        Button {
                            app.select(t)
                            onPick()
                        } label: {
                            HStack(spacing: 14) {
                                DotMatrixNumber(text: t.number, color: Theme.orange, offOpacity: 0)
                                    .frame(width: 74, height: 27)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(t.shop).font(.cairo(15.5, .bold)).foregroundStyle(Theme.ink)
                                    Text(timeAgo(t.addedAt)).font(.cairo(12.5)).foregroundStyle(Theme.tan)
                                }
                                Spacer()
                                if t.status == "ready" { PulsingDot() }
                                Text(s.statusShort(t.status))
                                    .font(.cairo(13, .black))
                                    .foregroundStyle(t.status == "ready" ? Theme.orange : Theme.tan)
                            }
                            .padding(.vertical, 6)
                        }
                        .listRowBackground(Theme.cardWhite)
                    }
                    .onDelete(perform: app.remove)
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Theme.canvas)
            .navigationTitle(s.ordersTitle)
            .toolbar {
                if !app.tickets.isEmpty {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(role: .destructive) { confirmClear = true } label: {
                            Label(s.clearAll, systemImage: "trash")
                        }
                        .tint(Theme.orange)
                    }
                }
            }
            .confirmationDialog(s.clearConfirm, isPresented: $confirmClear, titleVisibility: .visible) {
                Button(s.deleteWord, role: .destructive) { app.clearAll() }
            }
            .sheet(isPresented: $showScanner) {
                ScannerSheet { code in
                    app.open(rawInput: code)
                    onPick()
                }
            }
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
                    LabeledContent(s.version, value: "7.0")
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
