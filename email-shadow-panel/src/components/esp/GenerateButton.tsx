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
        "group relative h-[3.15rem] w-full overflow-hidden rounded-[0.95rem] px-4 text-left sm:h-[3.4rem] sm:px-5",
        "border border-signal/55 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--signal)_28%,transparent),color-mix(in_oklab,var(--signal)_16%,transparent)_55%,color-mix(in_oklab,var(--signal)_8%,transparent))]",
        "text-foreground shadow-[0_18px_52px_-32px_var(--signal)]",
        "transition-[transform,box-shadow,border-color,background-position] duration-250",
        "hover:border-signal/80 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--signal)_28%,transparent),0_22px_70px_-32px_var(--signal)]",
        "active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-75",
      )}
    >
      <span
        aria-hidden
        className="esp-button-sheen pointer-events-none absolute inset-0"
        data-active={loading ? "true" : "false"}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--signal)_70%,transparent),transparent)] opacity-70"
      />
      <span className="relative flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <Play className="size-4 shrink-0 text-signal" fill="currentColor" aria-hidden />
          <span className="text-[clamp(0.95rem,0.28vw+0.92rem,1.08rem)] font-semibold">
            {loading ? "Opening inbox..." : label}
          </span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-signal/45 bg-background/35 text-signal transition-transform duration-300 group-hover:translate-x-1">
          {loading ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="size-[18px]" strokeWidth={2.25} aria-hidden />
          )}
        </span>
      </span>
    </button>
  );
}
