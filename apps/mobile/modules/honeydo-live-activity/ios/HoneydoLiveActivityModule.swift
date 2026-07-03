import ActivityKit
import ExpoModulesCore
import Foundation

private let appGroupId = "group.com.blackflamy.honeydo"
private let stopDarwinName = "honeydo.timer.stopRequested"
private let currentKey = "currentActivity"
private let pendingStopKey = "pendingStop"

// Thin ActivityKit bridge (TC-NATIVE-03): starts/updates/ends the single running-timer
// Live Activity on request from JS, and forwards the extension's Darwin "stop requested"
// ping up to JS so the app can stop through its existing `useStopEntry` path. It holds no
// timer/auth logic and makes no network calls. No-ops on iOS < 16.2.
public class HoneydoLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HoneydoLiveActivity")

    Events("onStopRequested")

    Property("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    Function("start") { (input: [String: Any]) in
      guard #available(iOS 16.2, *) else { return }
      guard
        let entryId = input["entryId"] as? String,
        let title = input["title"] as? String,
        let startedAtIso = input["startedAt"] as? String,
        let startedAt = Self.parseDate(startedAtIso)
      else { return }
      self.persistCurrent(entryId: entryId, title: title, startedAt: startedAt)
      Task { await self.startActivity(entryId: entryId, title: title, startedAt: startedAt) }
    }

    Function("update") { (input: [String: Any]) in
      guard #available(iOS 16.2, *) else { return }
      let title = input["title"] as? String ?? ""
      let isRunning = input["isRunning"] as? Bool ?? true
      Task { await self.updateActivity(title: title, isRunning: isRunning) }
    }

    Function("end") {
      guard #available(iOS 16.2, *) else { return }
      Task { await self.endActivity() }
    }

    Function("readPendingStop") { () -> [String: String]? in
      guard
        let defaults = UserDefaults(suiteName: appGroupId),
        let dict = defaults.dictionary(forKey: pendingStopKey) as? [String: String]
      else { return nil }
      return dict
    }

    Function("clearPendingStop") {
      UserDefaults(suiteName: appGroupId)?.removeObject(forKey: pendingStopKey)
    }

    OnCreate { self.registerDarwinObserver() }
    OnDestroy { self.unregisterDarwinObserver() }
  }

  // MARK: - Darwin notification (extension → app)

  private func registerDarwinObserver() {
    let observer = Unmanaged.passUnretained(self).toOpaque()
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      observer,
      { (_, observer, _, _, _) in
        guard let observer = observer else { return }
        let module = Unmanaged<HoneydoLiveActivityModule>.fromOpaque(observer).takeUnretainedValue()
        module.handleStopRequested()
      },
      stopDarwinName as CFString,
      nil,
      .deliverImmediately
    )
  }

  private func unregisterDarwinObserver() {
    let observer = Unmanaged.passUnretained(self).toOpaque()
    CFNotificationCenterRemoveObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      observer,
      CFNotificationName(stopDarwinName as CFString),
      nil
    )
  }

  private func handleStopRequested() {
    var payload: [String: String] = [:]
    if
      let defaults = UserDefaults(suiteName: appGroupId),
      let dict = defaults.dictionary(forKey: pendingStopKey) as? [String: String] {
      payload = dict
    }
    self.sendEvent("onStopRequested", payload)
  }

  // MARK: - ActivityKit

  private func persistCurrent(entryId: String, title: String, startedAt: Date) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.set(
      [
        "entryId": entryId,
        "title": title,
        "startedAt": ISO8601DateFormatter().string(from: startedAt),
      ],
      forKey: currentKey
    )
  }

  @available(iOS 16.2, *)
  private func startActivity(entryId: String, title: String, startedAt: Date) async {
    // Already tracking this entry → treat as an update, not a new activity.
    if Activity<HoneydoTimerAttributes>.activities.contains(where: { $0.attributes.entryId == entryId }) {
      await self.updateActivity(title: title, isRunning: true)
      return
    }
    // Clear anything stale for a different entry (app enforces one running entry).
    await self.endAllActivities(except: entryId)

    let attributes = HoneydoTimerAttributes(entryId: entryId)
    let state = HoneydoTimerAttributes.ContentState(title: title, startedAt: startedAt, isRunning: true)
    do {
      _ = try Activity.request(attributes: attributes, content: .init(state: state, staleDate: nil))
    } catch {
      // Feature degrades silently if the system refuses (disabled, budget, etc.).
    }
  }

  @available(iOS 16.2, *)
  private func updateActivity(title: String, isRunning: Bool) async {
    for activity in Activity<HoneydoTimerAttributes>.activities {
      let startedAt = activity.content.state.startedAt
      let newState = HoneydoTimerAttributes.ContentState(
        title: title,
        startedAt: startedAt,
        isRunning: isRunning
      )
      await activity.update(.init(state: newState, staleDate: nil))
    }
  }

  @available(iOS 16.2, *)
  private func endActivity() async {
    for activity in Activity<HoneydoTimerAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    UserDefaults(suiteName: appGroupId)?.removeObject(forKey: currentKey)
  }

  @available(iOS 16.2, *)
  private func endAllActivities(except entryId: String) async {
    for activity in Activity<HoneydoTimerAttributes>.activities
    where activity.attributes.entryId != entryId {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  // MARK: - Helpers

  private static func parseDate(_ iso: String) -> Date? {
    let withFraction = ISO8601DateFormatter()
    withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = withFraction.date(from: iso) { return date }
    return ISO8601DateFormatter().date(from: iso)
  }
}
