/** @trace FR-SHELL-04 */
export function ShellSkeleton() {
  return (
    <div className="shell-skeleton" aria-hidden="true">
      <div className="shell-skeleton__block shell-skeleton__block--hero" />
      <div className="shell-skeleton__block shell-skeleton__block--row" />
      <div className="shell-skeleton__block shell-skeleton__block--row shell-skeleton__block--short" />
    </div>
  );
}
