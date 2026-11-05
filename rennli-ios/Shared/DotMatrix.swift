import SwiftUI

/// LED dot-matrix digits — the pager's own visual language, drawn by us.
/// 5×7 pixel glyphs rendered as dots; off-dots stay faintly visible.
public struct DotMatrixNumber: View {
    let text: String
    var color: Color = .white
    var accent: Color? = nil
    var offOpacity: Double = 0.13
    /// Marquee chase: a light wave sweeps the dots (ready state).
    var chase: Bool = false
    @State private var salt: Int = 0
    @State private var settled: Int = .max
    @State private var phase: Int = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(text: String, color: Color = .white, accent: Color? = nil, offOpacity: Double = 0.13, chase: Bool = false) {
        self.text = text
        self.color = color
        self.accent = accent
        self.offOpacity = offOpacity
        self.chase = chase
    }

    static let glyphs: [Character: [[Bool]]] = {
        let raw: [Character: [String]] = [
            "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
            "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
            "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
            "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
            "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
            "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
            "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
            "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
            "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
            "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
            "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"]
        ]
        return raw.mapValues { rows in rows.map { row in row.map { $0 == "1" } } }
    }()

    public var body: some View {
        let chars = Array(text.isEmpty ? "—" : text)
        let totalCols = max(1, chars.count * 6 - 1)
        Canvas { ctx, size in
            let cell = size.height / 7
            let r = cell * 0.34
            let wave = Double(phase % (totalCols + 12)) - 6.0
            for (ci, ch) in chars.enumerated() {
                var g = Self.glyphs[ch] ?? Self.glyphs["-"]!
                if salt != 0 && ci >= settled && ch.isNumber {
                    let pool: [Character] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
                    g = Self.glyphs[pool[(salt * 7 + ci * 3) % 10]]!
                }
                for row in 0..<7 {
                    for col in 0..<5 where col < g[row].count {
                        let cx = CGFloat(ci * 6 + col) * cell + cell / 2
                        let cy = CGFloat(row) * cell + cell / 2
                        let rect = CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)
                        var on = g[row][col]
                        if salt != 0 && ci >= settled && (row * 31 + col * 17 + ci * 13 + salt * 7) % 5 == 0 { on.toggle() }
                        let dotColor = (on && ci == chars.count - 1) ? (accent ?? color) : color
                        var alpha = on ? 1.0 : offOpacity
                        var fill = dotColor
                        if chase {
                            let gc = Double(ci * 6 + col)
                            let boost = max(0.0, 1.0 - abs(gc - wave) / 2.5)
                            if on {
                                if boost > 0.45 { fill = .white }
                            } else {
                                alpha = max(alpha, boost * 0.38)
                            }
                        }
                        ctx.fill(Path(ellipseIn: rect), with: .color(fill.opacity(alpha)))
                    }
                }
            }
        }
        .aspectRatio(CGFloat(totalCols) / 7.0, contentMode: .fit)
        .accessibilityLabel(text)
        .onChange(of: text) { _, _ in scramble() }
        .onAppear { scramble() }
        .task(id: chase) {
            guard chase && !reduceMotion else { return }
            while !Task.isCancelled {
                phase += 1
                try? await Task.sleep(nanoseconds: 85_000_000)
            }
        }
    }

    /// Slot-roll settle: digits cycle, then lock one by one, left to right.
    private func scramble() {
        guard !reduceMotion else { return }
        let count = max(1, text.count)
        Task { @MainActor in
            let frames = count + 5
            for f in 0...frames {
                salt = f + 1
                settled = f - 2
                try? await Task.sleep(nanoseconds: 42_000_000)
            }
            salt = 0
            settled = .max
        }
    }
}


/// A real LED board: a full field of dots on black glass, the number lit
/// in warm light at the centre — off-dots stay faintly visible everywhere.
public struct LEDPanel: View {
    let text: String
    var lit: Color = Color(red: 0.93, green: 0.87, blue: 0.74)
    @State private var salt: Int = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(text: String, lit: Color = Color(red: 0.93, green: 0.87, blue: 0.74)) {
        self.text = text
        self.lit = lit
    }

    public var body: some View {
        Canvas { ctx, size in
            let cols = 25
            let cell = size.width / CGFloat(cols)
            let rows = max(1, Int(size.height / cell))
            let chars = Array(text.isEmpty ? "—" : text)
            let blockCols = max(1, chars.count * 6 - 1)
            let startCol = (cols - blockCols) / 2
            let startRow = max(0, (rows - 7) / 2)
            let r = cell * 0.32
            for row in 0..<rows {
                for col in 0..<cols {
                    var on = false
                    let gc = col - startCol
                    let gr = row - startRow
                    if gr >= 0 && gr < 7 && gc >= 0 {
                        let ci = gc / 6
                        let cc = gc % 6
                        if ci < chars.count && cc < 5 {
                            let g = DotMatrixNumber.glyphs[chars[ci]] ?? DotMatrixNumber.glyphs["-"]!
                            on = g[gr][cc]
                        }
                    }
                    if salt != 0 && (row * 29 + col * 11 + salt * 5) % 9 == 0 { on.toggle() }
                    let cx = CGFloat(col) * cell + cell / 2
                    let cy = CGFloat(row) * cell + cell / 2
                    ctx.fill(Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)),
                             with: .color(lit.opacity(on ? 1.0 : 0.07)))
                }
            }
        }
        .background(Color.black)
        .clipShape(RoundedRectangle(cornerRadius: 26))
        .overlay(RoundedRectangle(cornerRadius: 26).stroke(Color.white.opacity(0.16), lineWidth: 1))
        .accessibilityLabel(text)
        .onAppear {
            guard !reduceMotion else { return }
            Task { @MainActor in
                for i in 1...4 {
                    salt = i
                    try? await Task.sleep(nanoseconds: 55_000_000)
                }
                salt = 0
            }
        }
    }
}
