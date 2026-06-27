/**
 * Thin wrapper over the Notification API. Permission is requested only from an
 * explicit user action (see AppShell's enable handler) — never on load
 * (FR-NOTIFY-03, BC-NOTIFY-01). Unsupported or denied degrades to card-only,
 * never an error (FR-NOTIFY-04).
 *
 * Constructor notifications can't carry action buttons (that needs a service
 * worker, which is out of scope — FR-PWA-03), so the two actions live on the
 * in-app card; the Notification is a mirror nudge.
 */

function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Request permission. No-op when unsupported; swallows any rejection. */
export async function requestNotificationPermission(): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    await Notification.requestPermission();
  } catch {
    // Older browsers / denied prompts — fall back to card-only silently.
  }
}

/** Raise the break nudge if (and only if) permission has been granted. */
export function raiseBreakNotification(snoozeMinutes: number): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification("Time for a break", {
      body: `Step away for a moment — or snooze ${snoozeMinutes} min.`,
      tag: "break-reminder",
    });
  } catch {
    // Some environments throw on construction; the in-app card still shows.
  }
}
