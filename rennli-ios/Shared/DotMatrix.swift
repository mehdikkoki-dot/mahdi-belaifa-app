import SwiftUI

/// LED dot-matrix digits — the pager's own visual language, drawn by us.
/// 5×7 pixel glyphs rendered as dots; off-dots stay faintly visible.
public struct DotMatrixNumber: View {
    let text: String
    var color: Color = .white

    public init(text: String, color: Color = .white) {
        self.text = text
        self.color = color
    }

    private static let glyphs: [Character: [[Bool]]] = {
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
            for (ci, ch) in chars.enumerated() {
                let g = Self.glyphs[ch] ?? Self.glyphs["-"]!
                for row in 0..<7 {
                    for col in 0..<5 where col < g[row].count {
                        let cx = CGFloat(ci * 6 + col) * cell + cell / 2
                        let cy = CGFloat(row) * cell + cell / 2
                        let rect = CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)
                        ctx.fill(Path(ellipseIn: rect),
                                 with: .color(color.opacity(g[row][col] ? 1.0 : 0.13)))
                    }
                }
            }
        }
        .aspectRatio(CGFloat(totalCols) / 7.0, contentMode: .fit)
        .accessibilityLabel(text)
    }
}
