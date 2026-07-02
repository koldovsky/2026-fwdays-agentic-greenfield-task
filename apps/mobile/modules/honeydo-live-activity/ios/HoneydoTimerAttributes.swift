import ActivityKit
import Foundation

// MUST stay byte-for-byte identical to the extension copy at
// `apps/mobile/targets/live-activity/HoneydoTimerAttributes.swift`. The app (this module)
// and the widget extension are separate compilation units, but ActivityKit matches the
// activity by this type's name + Codable shape, so both copies must agree.
struct HoneydoTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var startedAt: Date
    var isRunning: Bool
  }

  var entryId: String
}
