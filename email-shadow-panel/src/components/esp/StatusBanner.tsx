import { AlertTriangle, CheckCircle2, Info, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  tone?: "info" | "warning" | "error" | "success";
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const toneMap = {
  info: {
    icon: Info,
    border: "border-signal/35",
    bg: "bg-signal/8",
    text: "text-signal",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber/35",
    bg: "bg-amber/10",
    text: "text-amber",
  },
  error: {
    icon: WifiOff,
    border: "border-destructive/35",
    bg: "bg-destructive/10",
    text: "text-destructive",
  },
  success: {
    icon: CheckCircle2,
    border: "border-primary/35",
    bg: "bg-primary/10",
    text: "text-primary",
  },
} as const;

export function StatusBanner({
  title,
  description,
  tone = "info",
  actionLabel,
  onAction,
  className,
}: Props) {
  const palette = toneMap[tone];
  const Icon = palette.icon;

  return (
    <div className={cn("rounded-md border px-4 py-3", palette.border, palette.bg, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className={cn("mt-0.5 shrink-0", palette.text)}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="font-mono-tabular text-[10px] uppercase tracking-[0.2em] text-foreground">
              {title}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-sm border border-hairline bg-background/50 px-2.5 py-1.5 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-signal/40 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
