import ActivityKit
import AudioToolbox
import AVFoundation
import SwiftUI
import UIKit

private let apiBase = "https://rennli.basatbelaifa7.workers.dev"

struct TicketState: Decodable {
    let number: String
    let status: String
    let acknowledgedAt: Double?
}

final class TicketModel: ObservableObject {
    @Published var ticketId: String = ""
    @Published var number: String = ""
    @Published var status: String = ""        // waiting | ready | completed
    @Published var acked: Bool = false
    @Published var error: String = ""
    @Published var ringing: Bool = false

    private var timer: Timer?
    private var activity: Activity<TicketAttributes>?
    private var player: AVAudioPlayer?
    private var flashTimer: Timer?
    @Published var flashOn: Bool = false

    var statusText: String {
        switch status {
        case "waiting": return "قيد التحضير"
        case "ready": return "جاهز — تفضل للكاشير"
        case "completed": return "تم الاستلام — بالعافية"
        default: return status
        }
    }

    func connect(rawInput: String) {
        let id = Self.extractId(from: rawInput)
        guard !id.isEmpty else { error = "الرابط أو الرقم غير صحيح"; return }
        error = ""
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
            await MainActor.run { self.error = "تعذر الاتصال بالخادم" }
        }
    }

    private func apply(_ state: TicketState) {
        let wasReady = (status == "ready")
        number = state.number
        status = state.status
        acked = state.acknowledgedAt != nil
        if status == "ready" && !acked {
            if !wasReady { beginRinging() }
            Task { await updateActivity() }
        } else {
            if ringing { stopRinging() }
            Task { await updateActivity() }
        }
        if status == "completed" {
            Task { await endActivity() }
        }
    }

    // MARK: - Live Activity

    func startActivity() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            error = "الأنشطة الحية غير مفعلة على هذا الهاتف"
            return
        }
        let attrs = TicketAttributes(number: number.isEmpty ? "—" : number, shop: "رنّلي")
        let state = TicketAttributes.ContentState(status: status.isEmpty ? "waiting" : status,
                                                  statusText: statusText)
        do {
            activity = try Activity.request(attributes: attrs,
                                            content: ActivityContent(state: state, staleDate: nil),
                                            pushType: nil)
        } catch {
            self.error = "تعذر بدء النشاط الحي"
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
        await act.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .after(Date().addingTimeInterval(60)))
        activity = nil
    }

    // MARK: - Ringing (foreground pager)

    private func beginRinging() {
        ringing = true
        flashTimer?.invalidate()
        flashTimer = Timer.scheduledTimer(withTimeInterval: 0.55, repeats: true) { [weak self] _ in
            self?.flashOn.toggle()
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        }
        if let url = Bundle.main.url(forResource: "ring", withExtension: "wav") {
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

    func ack() {
        guard let url = URL(string: "\(apiBase)/api/tickets/\(ticketId)/ack") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        stopRinging()
        acked = true
        Task {
            _ = try? await URLSession.shared.data(for: req)
            await refresh()
        }
    }
}

struct ContentView: View {
    @StateObject private var model = TicketModel()
    @State private var input: String = ""

    var body: some View {
        ZStack {
            background
            VStack(spacing: 22) {
                Text("رنّلي")
                    .font(.system(size: 34, weight: .heavy))
                    .padding(.top, 26)

                if model.ticketId.isEmpty {
                    connectCard
                } else {
                    ticketCard
                }
                Spacer()
            }
            .padding(20)
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private var background: some View {
        Group {
            if model.ringing {
                (model.flashOn ? Color(red: 0.07, green: 0.55, blue: 0.32) : Color(red: 0.03, green: 0.25, blue: 0.15))
                    .ignoresSafeArea()
                    .animation(.easeInOut(duration: 0.2), value: model.flashOn)
            } else {
                Color(red: 0.05, green: 0.055, blue: 0.05).ignoresSafeArea()
            }
        }
    }

    private var connectCard: some View {
        VStack(spacing: 14) {
            Text("الصق رابط تذكرتك أو امسح الـQR من صفحة التذكرة")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            TextField("رابط التذكرة", text: $input)
                .textFieldStyle(.roundedBorder)
                .font(.system(size: 15))
            Button("اتصال بالتذكرة") { model.connect(rawInput: input) }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 0.11, green: 0.62, blue: 0.40))
                .font(.system(size: 18, weight: .bold))
            if !model.error.isEmpty {
                Text(model.error).foregroundStyle(.red).font(.system(size: 14))
            }
        }
        .padding(18)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    private var ticketCard: some View {
        VStack(spacing: 16) {
            Text("طلبك رقم")
                .font(.system(size: 18)).foregroundStyle(.secondary)
            Text(model.number.isEmpty ? "—" : model.number)
                .font(.system(size: 92, weight: .black))
            Text(model.statusText)
                .font(.system(size: 24, weight: .bold))
                .multilineTextAlignment(.center)

            if model.status == "ready" && !model.acked {
                Button("شفت التنبيه — راني جاي") { model.ack() }
                    .buttonStyle(.borderedProminent)
                    .tint(.white)
                    .foregroundStyle(.black)
                    .font(.system(size: 19, weight: .bold))
            }
            if model.acked && model.status == "ready" {
                Text("تمام — الكاشير شاف بلي راك جاي")
                    .foregroundStyle(.secondary)
            }
            Button("تحديث") { Task { await model.refresh() } }
                .buttonStyle(.bordered)
            if !model.error.isEmpty {
                Text(model.error).foregroundStyle(.red).font(.system(size: 14))
            }
        }
        .padding(20)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}
