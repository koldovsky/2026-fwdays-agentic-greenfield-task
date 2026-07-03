/**
 * Global honesty disclaimer (BC-HONESTY-01, passive surface).
 *
 * Persistent on every route: states that chances are estimates, never a
 * guarantee. Passive only — it does not compute or gate any chance value.
 */
import { DISCLAIMER_TEXT } from "@/app/lib/copy";

export function Disclaimer() {
  return (
    <aside className="pk-disclaimer" role="note" aria-label="Застереження">
      <div className="pk-container pk-disclaimer__inner">
        <span className="pk-disclaimer__mark" aria-hidden="true">
          i
        </span>
        <p className="pk-text-sm">{DISCLAIMER_TEXT}</p>
      </div>
    </aside>
  );
}
