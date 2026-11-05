import SwiftUI
import UIKit

// MARK: - Shop ads (v10): animated carousel on the waiting screen

struct AdItem: Decodable, Identifiable {
    let id: String
    let kind: String
    let title: String
    let sub: String
    let price: String
    let imageUrl: String?
    let theme: String
    let linkUrl: String?
}

private struct AdsResponse: Decodable { let ads: [AdItem] }

@MainActor
final class AdsModel: ObservableObject {
    @Published var ads: [AdItem] = []

    func load(ticketId: String) async {
        guard let url = URL(string: "https://rennli.basatbelaifa7.workers.dev/api/ads?ticket=" + ticketId) else { return }
        if let (data, _) = try? await URLSession.shared.data(from: url),
           let decoded = try? JSONDecoder().decode(AdsResponse.self, from: data) {
            ads = decoded.ads
        }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255)
    }
}

func adThemeColors(_ theme: String) -> [Color] {
    switch theme {
    case "gold": return [Color(hex: 0x8A6D1F), Color(hex: 0xD9A83E), Color(hex: 0xF5D67B)]
    case "green": return [Color(hex: 0x0E7A4A), Color(hex: 0x22B573), Color(hex: 0x63DFA8)]
    case "night": return [Color(hex: 0x14100C), Color(hex: 0x3A2C1C), Color(hex: 0x7A4A21)]
    default: return [Color(hex: 0xFF3B30), Color(hex: 0xF76707), Color(hex: 0xFFC94D)]
    }
}

/// Loads ad images once and keeps the UIImages: the carousel frame is
/// flexible — it takes each image's own aspect ratio (his rule: the whole
/// frame must show, e.g. a 16:9 photo shows as a full 16:9 frame).
@MainActor
final class AdImageStore: ObservableObject {
    @Published var images: [String: UIImage] = [:]

    func load(_ ads: [AdItem]) async {
        for ad in ads where ad.kind == "image" {
            if images[ad.id] != nil { continue }
            guard let u = ad.imageUrl, let url = URL(string: u) else { continue }
            if let (data, _) = try? await URLSession.shared.data(from: url),
               let img = UIImage(data: data) {
                images[ad.id] = img
            }
        }
    }
}

struct AdCarouselView: View {
    let ads: [AdItem]
    let s: Strings
    @State private var idx = 0
    @StateObject private var store = AdImageStore()
    @State private var kb = false
    @State private var flow = false
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                ForEach(Array(ads.enumerated()), id: \.element.id) { i, ad in
                    slide(ad)
                        .opacity(idx == i ? 1 : 0)
                        .scaleEffect(idx == i ? 1 : 1.045)
                        .animation(.easeInOut(duration: 0.7), value: idx)
                        .allowsHitTesting(idx == i)
                }
            }
            .frame(height: 248)
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .shadow(color: .black.opacity(0.16), radius: 20, y: 10)
            .contentShape(RoundedRectangle(cornerRadius: 24))
            .onTapGesture {
                if let link = ads.indices.contains(idx) ? ads[idx].linkUrl : nil,
                   let url = URL(string: link) { openURL(url) }
            }
            if ads.count > 1 {
                HStack(spacing: 5) {
                    ForEach(ads.indices, id: \.self) { i in
                        Capsule()
                            .fill(idx == i ? Theme.orange : Theme.tan.opacity(0.35))
                            .frame(width: idx == i ? 18 : 6, height: 6)
                            .animation(.easeInOut(duration: 0.35), value: idx)
                    }
                }
            }
        }
        .task(id: ads.map(\.id).joined(separator: ",")) {
            await store.load(ads)
        }
        .onAppear {
            if !reduceMotion {
                withAnimation(.easeInOut(duration: 7).repeatForever(autoreverses: true)) { kb = true }
                withAnimation(.easeInOut(duration: 4.5).repeatForever(autoreverses: true)) { flow = true }
            }
        }
        .task(id: ads.count) {
            guard ads.count > 1 else { return }
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 6_000_000_000)
                if Task.isCancelled { break }
                withAnimation(.easeInOut(duration: 0.7)) { idx = (idx + 1) % ads.count }
            }
        }
    }

    @ViewBuilder
    private func slide(_ ad: AdItem) -> some View {
        if ad.kind == "template" {
            ZStack {
                LinearGradient(colors: adThemeColors(ad.theme),
                               startPoint: flow ? .topLeading : .bottomTrailing,
                               endPoint: flow ? .bottomTrailing : .topLeading)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ad.title)
                        .font(.cairo(52, .black)).foregroundStyle(.white)
                        .lineLimit(1).minimumScaleFactor(0.5)
                    if !ad.sub.isEmpty {
                        Text(ad.sub)
                            .font(.cairo(20, .black)).foregroundStyle(.white)
                    }
                    if !ad.price.isEmpty {
                        Text(ad.price)
                            .font(.cairo(14.5, .black)).foregroundStyle(Theme.ink)
                            .padding(.horizontal, 15).padding(.vertical, 8)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 999))
                            .scaleEffect(flow ? 1.07 : 1.0)
                            .padding(.top, 10)
                    }
                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(22)
                tag
            }
        } else {
            ZStack {
                if let img = store.images[ad.id] {
                    Image(uiImage: img)
                        .resizable().scaledToFill()
                        .scaleEffect(reduceMotion ? 1.0 : (kb ? 1.13 : 1.02))
                        .offset(x: reduceMotion ? 0 : (kb ? -8 : 0), y: reduceMotion ? 0 : (kb ? -5 : 0))
                } else {
                    Color(hex: 0x2B1A12)
                }
                LinearGradient(colors: [.clear, .clear, .black.opacity(0.86)],
                               startPoint: .top, endPoint: .bottom)
                VStack(alignment: .leading, spacing: 1) {
                    Spacer()
                    if !ad.title.isEmpty {
                        Text(ad.title).font(.cairo(21, .black)).foregroundStyle(.white)
                    }
                    if !ad.sub.isEmpty {
                        Text(ad.sub).font(.cairo(13.5, .bold)).foregroundStyle(.white.opacity(0.85))
                    }
                    if !ad.price.isEmpty {
                        Text(ad.price)
                            .font(.cairo(15, .black)).foregroundStyle(.white)
                            .padding(.horizontal, 14).padding(.vertical, 7)
                            .background(Theme.readyCardTop)
                            .clipShape(RoundedRectangle(cornerRadius: 999))
                            .padding(.top, 8)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                tag
            }
        }
    }

    private var tag: some View {
        VStack {
            HStack {
                Text(s.adTag)
                    .font(.cairo(11, .bold)).foregroundStyle(.white)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Color.black.opacity(0.5))
                    .clipShape(RoundedRectangle(cornerRadius: 999))
                Spacer()
            }
            Spacer()
        }
        .padding(10)
    }
}

// v11.3 — ads are fetched per ticket shop.

// build retry 21:38
