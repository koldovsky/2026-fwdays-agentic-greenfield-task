import { useEffect, useRef } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ShortcutSection } from "@/lib/shortcutsCatalog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ShortcutSection[];
  className?: string;
}

export function ShortcutsHelp({ open, onOpenChange, sections, className }: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousOpen = useRef(open);

  useEffect(() => {
    if (previousOpen.current && !open && triggerRef.current) {
      const handle = window.requestAnimationFrame(() => triggerRef.current?.focus());
      previousOpen.current = open;
      return () => window.cancelAnimationFrame(handle);
    }

    previousOpen.current = open;
    return undefined;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open keyboard shortcuts help"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border border-hairline/70 bg-background/24 px-3 text-sm text-muted-foreground transition-colors hover:border-signal/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
        >
          <Keyboard className="size-4 text-signal" aria-hidden />
          <span>Shortcuts</span>
        </button>
      </DialogTrigger>
      <DialogContent className="panel corner-ticks w-[min(92vw,720px)] max-w-[720px] border-hairline bg-surface-raised p-5 text-foreground shadow-panel sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-mono-tabular text-sm uppercase tracking-[0.18em] text-signal">
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Shortcuts pause automatically while you are typing in an input, textarea, or other
            editable field.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-xl border border-hairline/55 bg-background/26 p-4"
            >
              <h3 className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] text-signal">
                {section.title}
              </h3>
              <div className="mt-3 grid gap-3">
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.label}`} className="grid gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.keys.map((key) => (
                        <span
                          key={`${item.label}-${key}`}
                          className="rounded-md border border-signal/20 bg-signal/10 px-2 py-1 font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-signal"
                        >
                          {key}
                        </span>
                      ))}
                      <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
