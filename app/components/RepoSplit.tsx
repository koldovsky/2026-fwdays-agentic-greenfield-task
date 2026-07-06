import { strings } from "@/lib/strings";

// Stacked bar splitting original vs forked repositories (user-stats). Uses the
// two brand accents; zero-repo safe. Pure CSS.
export function RepoSplit({ original, forked }: { original: number; forked: number }) {
  const total = original + forked;
  const originalPct = total === 0 ? 0 : Math.round((original / total) * 100);

  return (
    <div className="font-sans">
      <div className="flex h-[34px] overflow-hidden rounded-lg bg-surface-track">
        <div className="bg-accent-primary" style={{ width: `${originalPct}%` }} />
        <div className="flex-1 bg-accent-secondary" />
      </div>
      <div className="mt-4 flex flex-wrap gap-6 text-[14px]">
        <Chip color="var(--accent-primary)" label={`${strings.stats.original} · ${original}`} />
        <Chip color="var(--accent-secondary)" label={`${strings.stats.forked} · ${forked}`} />
      </div>
    </div>
  );
}

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-3 rounded-[3px]" style={{ background: color }} aria-hidden />
      {label}
    </div>
  );
}
