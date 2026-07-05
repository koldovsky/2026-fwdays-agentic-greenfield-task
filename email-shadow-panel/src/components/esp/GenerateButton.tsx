import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";

interface Props {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function GenerateButton({ onClick, loading, disabled, label = "Generate Inbox" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative w-full overflow-hidden rounded-md",
        "h-14 px-6 text-left",
        "border border-signal/40 bg-gradient-to-b from-signal/25 to-signal/5",
        "text-foreground font-medium tracking-tight",
        "transition-[transform,box-shadow,border-color] duration-200",
        "hover:border-signal/70 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--signal)_35%,transparent),0_20px_60px_-20px_color-mix(in_oklab,var(--signal)_60%,transparent)]",
        "active:translate-y-[1px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60",
        "disabled:opacity-70 disabled:cursor-not-allowed",
      )}
    >
      {/* scanline shimmer on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 8px, color-mix(in oklab, var(--signal) 6%, transparent) 8px 9px)",
        }}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-mono-tabular text-[10px] uppercase tracking-[0.28em] text-signal">
            &gt; run
          </span>
          <span className="text-[15px]">{loading ? "Opening channel..." : label}</span>
        </div>
        <span
          className={cn(
            "grid place-items-center size-9 rounded-sm border border-signal/50 bg-background/40 text-signal",
            "transition-transform duration-300 group-hover:translate-x-0.5",
          )}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" strokeWidth={2.25} />
          )}
        </span>
      </div>
    </button>
  );
}
