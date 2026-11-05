import ActivityKit
import SwiftUI
import WidgetKit

@main
struct RennliWidgets: WidgetBundle {
    var body: some Widget {
        TicketLiveActivity()
    }
}

struct TicketLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TicketAttributes.self) { context in
            // Lock screen / banner presentation
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.shop)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text(context.state.statusText)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(context.state.status == "ready" ? .green : .primary)
                }
                Spacer()
                Text(context.attributes.number)
                    .font(.system(size: 40, weight: .black))
            }
            .padding(16)
            .activityBackgroundTint(context.state.status == "ready"
                ? Color(red: 0.05, green: 0.35, blue: 0.20)
                : Color(red: 0.08, green: 0.09, blue: 0.08))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.shop)
                        .font(.system(size: 13, weight: .semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.number)
                        .font(.system(size: 26, weight: .black))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.statusText)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(context.state.status == "ready" ? .green : .primary)
                }
            } compactLeading: {
                Text("رنّلي").font(.system(size: 12, weight: .bold))
            } compactTrailing: {
                Text(context.attributes.number)
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(context.state.status == "ready" ? .green : .primary)
            } minimal: {
                Text(context.attributes.number)
                    .font(.system(size: 12, weight: .black))
            }
        }
    }
}
