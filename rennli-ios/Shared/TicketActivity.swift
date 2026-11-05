import ActivityKit
import Foundation

/// Shared between the app and the widget extension: the Live Activity contract.
struct TicketAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// "waiting" | "ready" | "completed"
        var status: String
        var statusText: String
    }

    /// Order number shown big, e.g. "83"
    var number: String
    /// Shop name shown on the activity
    var shop: String
}
