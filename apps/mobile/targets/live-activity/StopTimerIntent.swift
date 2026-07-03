import ActivityKit
import AppIntents
import Foundation

// Stop control for iOS 17+ (interactive Live Activity buttons require iOS 17). The intent
// carries NO timer/auth logic (TC-NATIVE-03): it records the intent in the shared App
// Group, pings the app via a Darwin notification so the running app can stop through the
// existing JS `useStopEntry` path, and ends the Activity optimistically so the UI feels
// instant. If the app was terminated, it reconciles the persisted request on next
// foreground.
@available(iOS 17.0, *)
struct StopTimerIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Stop Timer"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Entry ID")
  var entryId: String

  init() {}

  init(entryId: String) {
    self.entryId = entryId
  }

  func perform() async throws -> some IntentResult {
    let appGroupId = "group.com.blackflamy.honeydo"
    let requestedAt = ISO8601DateFormatter().string(from: Date())

    if let defaults = UserDefaults(suiteName: appGroupId) {
      defaults.set(["entryId": entryId, "requestedAt": requestedAt], forKey: "pendingStop")
    }

    // Wake the app process (if alive) to run the real stop through JS.
    CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      CFNotificationName("honeydo.timer.stopRequested" as CFString),
      nil,
      nil,
      true
    )

    // Optimistically end the matching activity.
    for activity in Activity<HoneydoTimerAttributes>.activities
    where activity.attributes.entryId == entryId {
      await activity.end(nil, dismissalPolicy: .immediate)
    }

    return .result()
  }
}
