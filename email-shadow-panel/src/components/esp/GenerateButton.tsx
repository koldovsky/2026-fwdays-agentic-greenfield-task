import { cn } from "@/lib/utils";
import { ArrowRight, Loader2, Play } from "lucide-react";

interface Props {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function GenerateButton({ onClick, loading, disabled, label = "Generate inbox" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative h-16 w-full overflow-hidden rounded-md px-6 text-left",
        "border border-signal/55 bg-gradient-to-b from-signal/30 via-signal/18 to-signal/8",
        "text-foreground shadow-[0_18px_52px_-32px_var(--signal)]",
        "transition-[transform,box-shadow,border-color,background-color] duration-200",
        "hover:border-signal/80 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--signal)_28%,transparent),0_22px_70px_-32px_var(--signal)]",
        "active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-75",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(100deg, transparent, color-mix(in oklab, white 10%, transparent), transparent)",
        }}
      />
      <span className="relative flex items-center justify-between gap-4">
        <span className="flex items-center gap-4">
          <Play className="size-4 text-signal" fill="currentColor" aria-hidden />
          <span className="text-lg font-semibold">{loading ? "Opening inbox..." : label}</span>
        </span>
        <span className="grid size-10 place-items-center rounded-md border border-signal/45 bg-background/35 text-signal transition-transform duration-300 group-hover:translate-x-1">
          {loading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="size-5" strokeWidth={2.25} aria-hidden />
          )}
        </span>
      </span>
    </button>
  );
}
