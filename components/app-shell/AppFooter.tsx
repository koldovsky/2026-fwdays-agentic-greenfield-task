import { uk } from "@/lib/i18n/uk";

/** @trace FR-SHELL-01 @trace FR-I18N-01 @trace FR-SAYINGS-01 */
export function AppFooter({ saying }: { saying?: string }) {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <p className="app-footer__provenance">{uk.shell.footerProvenance}</p>
        {saying && <p className="app-footer__saying">{saying}</p>}
      </div>
    </footer>
  );
}
