"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Settings } from "@/lib/types";
import { isDue, shouldFire } from "@/lib/notify/due";
import {
  getClockSnapshot,
  getServerClockSnapshot,
  subscribeClock,
} from "../storage/clockStore";
import {
  getFirstRunSnapshot,
  getNextReminderSnapshot,
  getServerFirstRunSnapshot,
  getServerNextReminderSnapshot,
  getServerSettingsSnapshot,
  getSettingsSnapshot,
  markBreakDone,
  snoozeBreak,
  subscribeSettings,
  updateSettings,
} from "../storage/settingsStore";
import {
  raiseBreakNotification,
  requestNotificationPermission,
} from "../notify/notifications";
import { playReminderSound } from "../notify/sound";
import { recordBreakEvent } from "../storage/events";
import { DueBreakCard } from "./DueBreakCard";
import { MainView } from "./MainView";
import { SettingsView } from "./SettingsView";
import { StatsView } from "./StatsView";

type View = "main" | "settings" | "stats";

const NAV: { id: View; label: string }[] = [
  { id: "main", label: "Now" },
  { id: "settings", label: "Settings" },
  { id: "stats", label: "Stats" },
];

/**
 * The single-screen app shell: a main / Settings / Stats switcher with a quiet
 * bottom nav (FR-SHELL-01). Settings, first-run state, the next-reminder target,
 * and the live clock are read from client stores via `useSyncExternalStore`, so
 * there is no mount effect and SSR stays deterministic.
 */
// fallow-ignore-next-line complexity -- Single app orchestrator; splitting would add indirection.
export default function AppShell() {
  const [view, setView] = useState<View>("main");

  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  );
  const firstRun = useSyncExternalStore(
    subscribeSettings,
    getFirstRunSnapshot,
    getServerFirstRunSnapshot,
  );
  const nextReminder = useSyncExternalStore(
    subscribeSettings,
    getNextReminderSnapshot,
    getServerNextReminderSnapshot,
  );
  const now = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getServerClockSnapshot,
  );

  // Request Notification permission only when the user turns reminders ON — an
  // explicit action, never on load (FR-NOTIFY-03, BC-NOTIFY-01).
  const handleSettingsChange = (next: Settings) => {
    const wasEnabled = settings.enabled;
    updateSettings(next);
    if (!wasEnabled && next.enabled) void requestNotificationPermission();
  };

  // Fire the one-shot notification + sound when a break first comes due. The
  // visible card is derived (below), so this effect only does side effects and
  // mutates a ref — no setState, so no cascading renders.
  const lastFiredRef = useRef<number | null>(null);
  // fallow-ignore-next-line complexity -- Effect has explicit one-shot guards for notification safety.
  useEffect(() => {
    if (now && settings.enabled && shouldFire(now, nextReminder, lastFiredRef.current)) {
      lastFiredRef.current = (nextReminder as Date).getTime();
      raiseBreakNotification(settings.snoozeMinutes);
      if (settings.soundEnabled) playReminderSound(settings.soundChoice);
    }
  }, [
    now,
    nextReminder,
    settings.enabled,
    settings.snoozeMinutes,
    settings.soundEnabled,
    settings.soundChoice,
  ]);

  // The due-break card shows whenever a break is due; acting reschedules the
  // next reminder, which makes this false again (FR-NOTIFY-01).
  const due = settings.enabled && now !== null && isDue(now, nextReminder);

  // Each action records a BreakEvent for stats (FR-STATS-01), then reschedules.
  const handleDone = () => {
    void recordBreakEvent("done");
    markBreakDone();
  };
  const handleSnooze = () => {
    void recordBreakEvent("snoozed");
    snoozeBreak();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col">
        {view === "main" && (
          <MainView
            settings={settings}
            now={now}
            nextReminder={nextReminder}
            firstRun={firstRun}
          />
        )}
        {view === "settings" && (
          <SettingsView settings={settings} onChange={handleSettingsChange} />
        )}
        {view === "stats" && <StatsView />}
      </main>

      <nav
        aria-label="Primary"
        className="sticky bottom-0 flex justify-center gap-2 border-t border-muted/15 bg-surface/80 px-4 py-3 backdrop-blur"
      >
        {NAV.map((item) => {
          const active = item.id === view;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active ? "bg-accent/10 text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {due && (
        <DueBreakCard
          snoozeMinutes={settings.snoozeMinutes}
          onDone={handleDone}
          onSnooze={handleSnooze}
        />
      )}
    </div>
  );
}
