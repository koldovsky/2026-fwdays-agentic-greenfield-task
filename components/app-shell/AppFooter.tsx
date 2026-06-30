import { uk } from "@/lib/i18n/uk";

/** @trace FR-SHELL-01 @trace FR-I18N-01 */
export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <p className="app-footer__provenance">{uk.shell.footerProvenance}</p>
      </div>
    </footer>
  );
}
