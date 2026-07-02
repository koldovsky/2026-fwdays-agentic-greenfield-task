import ActivityKit
import Foundation

// ActivityAttributes for the running-timer Live Activity (FR-LIVE-01/02/04).
//
// Kept intentionally tiny (TC-NATIVE-03): static `entryId` identifies which entry the
// activity tracks; the dynamic ContentState carries only what the UI renders. Elapsed is
// derived by the OS from `startedAt` via `Text(timerInterval:)` — no push, no polling.
//
// NOTE: this struct is duplicated verbatim in the `HoneydoLiveActivity` Expo module
// (`modules/honeydo-live-activity/ios/HoneydoTimerAttributes.swift`) because the app and
// the extension are separate compilation units. ActivityKit matches by the type's name +
// Codable shape, so the two copies MUST stay byte-for-byte in sync.
struct HoneydoTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var startedAt: Date
    var isRunning: Bool
  }

  var entryId: String
}
