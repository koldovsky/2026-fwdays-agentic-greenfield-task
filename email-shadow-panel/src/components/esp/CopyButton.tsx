import { useEffect, useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "solid" | "ghost";
  successMessage?: string;
}

export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "md",
  variant = "solid",
  successMessage,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const onClick = useCallback(async () => {
    const ok = await copyToClipboard(value, {
      success: successMessage ?? `${label} copied`,
    });
    if (ok) setCopied(true);
  }, [label, successMessage, value]);

  const sizing = size === "sm" ? "h-8 px-2.5 text-[11px] gap-1.5" : "h-10 px-3 text-xs gap-2";

  const variantStyle =
    variant === "ghost"
      ? "bg-transparent hover:bg-white/5 border border-transparent hover:border-hairline text-muted-foreground hover:text-foreground"
      : "bg-surface-raised hover:bg-surface border border-hairline text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-md font-mono-tabular uppercase tracking-wider transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        sizing,
        variantStyle,
        copied && "text-signal border-signal/40",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="size-3.5" strokeWidth={2.25} /> Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" strokeWidth={2} /> {label}
        </>
      )}
    </button>
  );
}
