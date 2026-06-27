import type { Settings, SoundChoice } from "@/lib/types";

interface SettingsViewProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

// Date.getDay() order: 0 = Sun … 6 = Sat.
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const fieldLabel = "block text-sm font-medium text-ink";
const textInput =
  "mt-2 rounded-xl border border-muted/25 bg-surface px-3 py-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const SOUND_OPTIONS: { value: SoundChoice; label: string }[] = [
  { value: "ping", label: "Ping" },
  { value: "melody-10", label: "Melody 10 sec" },
  { value: "melody-30", label: "Melody 30 sec" },
];

/** The Settings view: calm controls for every field, wired to persist on change. */
export function SettingsView({ settings, onChange }: SettingsViewProps) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const toggleDay = (day: number) => {
    const has = settings.workingDays.includes(day);
    const next = has
      ? settings.workingDays.filter((d) => d !== day)
      : [...settings.workingDays, day].sort((a, b) => a - b);
    update({ workingDays: next });
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-6 py-10">
      <h2 className="font-display text-2xl text-ink">Settings</h2>

      <label className="flex items-center justify-between gap-4">
        <span className={fieldLabel}>Reminders enabled</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="size-5 accent-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col">
          <span className={fieldLabel}>Work starts</span>
          <input
            type="time"
            value={settings.workStart}
            onChange={(e) => update({ workStart: e.target.value })}
            className={textInput}
          />
        </label>
        <label className="flex flex-col">
          <span className={fieldLabel}>Work ends</span>
          <input
            type="time"
            value={settings.workEnd}
            onChange={(e) => update({ workEnd: e.target.value })}
            className={textInput}
          />
        </label>
      </div>

      <fieldset>
        <legend className={fieldLabel}>Working days</legend>
        <div className="mt-2 flex gap-2">
          {DAY_LABELS.map((label, day) => {
            const active = settings.workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={active}
                aria-label={DAY_NAMES[day]}
                className={`size-9 rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active
                    ? "bg-accent text-surface"
                    : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col">
          <span className={fieldLabel}>Interval (min)</span>
          <input
            type="number"
            min={1}
            value={settings.intervalMinutes}
            onChange={(e) => update({ intervalMinutes: Number(e.target.value) })}
            className={textInput}
          />
        </label>
        <label className="flex flex-col">
          <span className={fieldLabel}>Snooze (min)</span>
          <input
            type="number"
            min={1}
            value={settings.snoozeMinutes}
            onChange={(e) => update({ snoozeMinutes: Number(e.target.value) })}
            className={textInput}
          />
        </label>
      </div>

      <label className="flex items-center justify-between gap-4">
        <span className={fieldLabel}>Sound</span>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => update({ soundEnabled: e.target.checked })}
          className="size-5 accent-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      <fieldset className={settings.soundEnabled ? undefined : "opacity-50"}>
        <legend className={fieldLabel}>Sound style</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SOUND_OPTIONS.map((option) => {
            const active = settings.soundChoice === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ soundChoice: option.value })}
                aria-pressed={active}
                disabled={!settings.soundEnabled}
                className={`min-h-11 rounded-xl px-3 py-2 text-sm leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed ${
                  active
                    ? "bg-accent text-surface"
                    : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
