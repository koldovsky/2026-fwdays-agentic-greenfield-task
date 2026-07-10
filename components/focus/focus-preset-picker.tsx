import { Button } from "@/components/ui/button";
import { FOCUS_PRESETS } from "@/lib/focus/constants";

interface FocusPresetPickerProps {
  onSelect: (minutes: number) => void;
  onShrink: () => void;
}

export function FocusPresetPicker({
  onSelect,
  onShrink,
}: FocusPresetPickerProps) {
  return (
    <section
      aria-label="Choose focus duration"
      className="flex w-full max-w-md flex-col items-center gap-6"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Choose a duration
        </h1>
        <p className="text-sm text-foreground-muted">
          Just 2 minutes. You can stop after.
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        {FOCUS_PRESETS.map((minutes) => (
          <Button
            key={minutes}
            type="button"
            onClick={() => onSelect(minutes)}
            className="w-full"
          >
            {minutes} min
          </Button>
        ))}
      </div>

      <Button type="button" variant="ghost" onClick={onShrink}>
        Too hard? Shrink it
      </Button>
    </section>
  );
}
