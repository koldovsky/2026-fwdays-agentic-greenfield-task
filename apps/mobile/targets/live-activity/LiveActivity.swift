import ActivityKit
import SwiftUI
import WidgetKit

// Honeydo brand accents (extension can't import the RN theme, so tokens are ported as
// literals here to match the app's honey-on-dark look — NFR-WIDGET-01).
private let honey = Color(red: 0.98, green: 0.80, blue: 0.35)
private let ink = Color(red: 0.11, green: 0.10, blue: 0.09)

// System-timer elapsed text: the OS advances it with no push/polling (FR-LIVE-04).
private func elapsed(_ startedAt: Date) -> Text {
  Text(timerInterval: startedAt...Date.distantFuture, countsDown: false)
}

@main
struct HoneydoWidgetBundle: WidgetBundle {
  var body: some Widget {
    HoneydoLiveActivityWidget()
  }
}

struct HoneydoLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: HoneydoTimerAttributes.self) { context in
      LockScreenLiveActivityView(context: context)
        .activityBackgroundTint(ink)
        .activitySystemActionForegroundColor(honey)
    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded: description + live elapsed + Stop (FR-LIVE-02/03).
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text(context.state.title).lineLimit(1)
          } icon: {
            Image(systemName: "timer")
          }
          .font(.headline)
          .foregroundStyle(honey)
        }
        DynamicIslandExpandedRegion(.trailing) {
          elapsed(context.state.startedAt)
            .font(.system(.title2, design: .rounded).monospacedDigit())
            .foregroundStyle(.white)
            .frame(maxWidth: 96)
        }
        DynamicIslandExpandedRegion(.bottom) {
          StopButton(entryId: context.attributes.entryId)
        }
      } compactLeading: {
        Image(systemName: "timer").foregroundStyle(honey)
      } compactTrailing: {
        elapsed(context.state.startedAt)
          .font(.system(.caption, design: .rounded).monospacedDigit())
          .foregroundStyle(honey)
          .frame(maxWidth: 52)
      } minimal: {
        Image(systemName: "timer").foregroundStyle(honey)
      }
      .widgetURL(URL(string: "honeydo://timer"))
      .keylineTint(honey)
    }
  }
}

struct LockScreenLiveActivityView: View {
  let context: ActivityViewContext<HoneydoTimerAttributes>

  var body: some View {
    HStack(alignment: .center, spacing: 14) {
      VStack(alignment: .leading, spacing: 4) {
        Text("Tracking")
          .font(.caption)
          .foregroundStyle(.secondary)
        Text(context.state.title)
          .font(.headline)
          .foregroundStyle(.primary)
          .lineLimit(1)
        elapsed(context.state.startedAt)
          .font(.system(.title, design: .rounded).monospacedDigit())
          .foregroundStyle(honey)
      }
      Spacer(minLength: 8)
      StopButton(entryId: context.attributes.entryId)
    }
    .padding()
  }
}

// Stop control. iOS 17+ runs the App Intent in-place (no app launch, FR-LIVE-03); on
// iOS 16.2–16.x, which has no interactive Live Activity buttons, it deep-links into the
// app to stop there (graceful degrade).
struct StopButton: View {
  let entryId: String

  var body: some View {
    if #available(iOS 17.0, *) {
      Button(intent: StopTimerIntent(entryId: entryId)) {
        Label("Stop", systemImage: "stop.fill")
      }
      .buttonStyle(.borderedProminent)
      .tint(honey)
      .foregroundStyle(ink)
    } else {
      Link(destination: stopDeepLink(entryId)) {
        Label("Stop", systemImage: "stop.fill")
          .padding(.horizontal, 12)
          .padding(.vertical, 6)
      }
      .tint(honey)
    }
  }
}

private func stopDeepLink(_ entryId: String) -> URL {
  let encoded = entryId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? entryId
  return URL(string: "honeydo://timer/stop?entryId=\(encoded)") ?? URL(string: "honeydo://timer")!
}
