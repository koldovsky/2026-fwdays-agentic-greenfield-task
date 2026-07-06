// A single labelled metric on the stats board (FR-STATS-02). The value is the
// hero, set in the serif face; the label is a quiet sans caption.
export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-[18px]">
      <div className="font-sans text-caption text-text-muted">{label}</div>
      <div className="mt-2.5 font-serif text-[32px] leading-none">{value}</div>
    </div>
  );
}
