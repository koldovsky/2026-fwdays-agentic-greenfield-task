"use client";

// Paid-gated "attach the original PDF" zone (gate-premium-upload-zone, T4;
// FR-PAYWALL-01/02, NFR-SEC-04, BC-HONESTY-01). For a paid user this is a live
// PDF drop target; for free/anon users it renders a blurred, inert shell under a
// semi-transparent Premium banner whose CTA opens the paywall.
//
// SECURITY: the blur + banner are cosmetic. When `paid` is false NO file input
// is rendered and NO drop/dragover handlers are attached, so removing the
// overlay via devtools still leaves no client path to a file read. The real
// trust boundary is `/api/tailor/generate` (`attachmentAllowed` flips to true
// only after a server-side `hasPaidAccess` check).
import { useRef, useState, type DragEvent } from "react";

import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

/** PDF-only intake for the original-document attachment. */
const ATTACH_ACCEPT = ".pdf,application/pdf";

export interface PremiumAttachZoneProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Server-resolved paid entitlement. Never client-derived. */
  readonly paid?: boolean;
  /** Name of the currently attached PDF, or null when none is attached. */
  readonly attachedName?: string | null;
  /** True when the last picked PDF exceeded the attachment size cap. */
  readonly attachTooLarge?: boolean;
  /** Called with the picked File (paid path only). */
  readonly onFileSelected: (file: File) => void;
  /** Clears the current attachment. */
  readonly onClearAttachment: () => void;
  /** Opens the upgrade surface from the Premium banner CTA. */
  readonly onUpgrade?: () => void;
}

export function PremiumAttachZone({
  locale = "ua",
  paid = false,
  attachedName = null,
  attachTooLarge = false,
  onFileSelected,
  onClearAttachment,
  onUpgrade,
}: PremiumAttachZoneProps) {
  const copy = t(locale).uploadCv;
  const banner = copy.premiumZone;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // ── Free / anon: cosmetic blurred shell + Premium banner. No input, no
  //    handlers — there is no client path to attach without paid status. ──
  if (!paid) {
    return (
      <div className="relative overflow-hidden rounded-xl">
        {/* Decorative blurred backdrop. Absolute so the banner content below —
            NOT this short shell — drives the container height. The previous
            layout had these swapped: the banner was the absolute overlay and
            this shell sized the box, so with `overflow-hidden` the taller banner
            (headline + body + CTA) was clipped / overlapped the form beneath it
            for non-paid users. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none blur-sm"
        >
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-white px-6 py-8 text-center">
            <p className="text-base font-semibold text-ink">
              {copy.attach.addOriginalPdf}
            </p>
            <p className="text-sm text-ink-soft">{banner.body}</p>
          </div>
        </div>
        {/* Premium banner in normal flow: it sizes the container, so nothing is
            clipped regardless of copy length or locale. */}
        <div className="relative flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-canvas/90 p-6 text-center shadow-card">
          <span className="inline-flex items-center rounded-xs bg-brand-wash px-[7px] py-[2px] font-body text-[10px] font-bold uppercase tracking-wide leading-[1.6] text-brand">
            {copy.attach.premiumBadge}
          </span>
          <p className="text-base font-semibold text-ink">{banner.headline}</p>
          <p className="max-w-[34em] text-sm text-ink-soft">{banner.body}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onUpgrade}
            aria-label={banner.upgradeAction}
          >
            {banner.upgradeAction}
          </Button>
        </div>
      </div>
    );
  }

  // ── Paid: live PDF drop target. ──
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        className={
          "flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center " +
          (dragActive ? "border-brand bg-brand-wash" : "border-hairline bg-white")
        }
      >
        {/* Premium badge on the paid branch too (per spec): a paid user sees the
            same premium marker on the now-live drop target. */}
        <span className="inline-flex items-center rounded-xs bg-brand-wash px-[7px] py-[2px] font-body text-[10px] font-bold uppercase tracking-wide leading-[1.6] text-brand">
          {copy.attach.premiumBadge}
        </span>
        <p className="text-base font-semibold text-ink">
          {copy.attach.addOriginalPdf}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          {copy.browseAction}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ATTACH_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label={copy.attach.addOriginalPdf}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelected(file);
            // Allow re-selecting the same file.
            event.target.value = "";
          }}
        />
      </div>

      {attachedName !== null && (
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>
            {copy.attach.attachedLabel}: {attachedName}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onClearAttachment}>
            {copy.attach.remove}
          </Button>
        </div>
      )}

      {attachTooLarge && (
        <p role="alert" className="text-sm text-gap-text">
          {copy.attach.tooLarge}
        </p>
      )}
    </div>
  );
}
