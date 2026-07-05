import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center px-6 py-14", className)}
    >
      {icon && (
        <div className="mb-4 grid place-items-center size-11 rounded-md border border-hairline bg-surface-raised text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </div>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-muted-foreground/80">{description}</p>
      )}
    </div>
  );
}
