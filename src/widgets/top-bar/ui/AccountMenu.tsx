"use client";

// Signed-in account menu (FR-SHELL-01): a burger trigger that opens a dropdown
// with the account destinations. Client-only because it owns open/close state,
// outside-click and Escape handling. The burger glyph is drawn with three CSS
// bars — DESIGN.md forbids icon libraries and SVG icon paths. Logout composes
// the existing sign-in feature's SignOutButton rather than re-implementing
// signOut here (FSD: the widget stays above and reuses the feature).
//
// This is a disclosure (button toggles a labeled panel of links), NOT a WAI-ARIA
// `menu` — those are for application commands and require roving arrow-key focus.
// A dropdown of navigation links is correctly a disclosure of Tab-focusable
// links, which also avoids nesting a focusable control inside a `menuitem`.
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SignOutButton } from "@/features/sign-in";
import { t, type Locale } from "@/shared/lib/i18n";
import type { TopBarUser } from "./TopBar";

export interface AccountMenuProps {
  readonly user: TopBarUser;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

const itemClass =
  "flex items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm text-ink-soft " +
  "transition-colors hover:bg-surface-warm hover:text-ink focus-visible:outline-2 " +
  "focus-visible:outline-offset-1 focus-visible:outline-brand";

export function AccountMenu({ user, locale = "ua" }: AccountMenuProps) {
  const copy = t(locale);
  const menu = copy.accountMenu;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close on outside click or Escape — a dropdown that traps focus or lingers
  // after navigation reads as broken (NFR-OBS-02: calm, predictable UI).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={menu.triggerLabel}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-sm border border-hairline bg-white text-ink transition-colors hover:bg-surface-warm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
      >
        <span aria-hidden="true" className="flex w-[18px] flex-col gap-[3px]">
          <span className="h-[2px] w-full rounded-pill bg-ink" />
          <span className="h-[2px] w-full rounded-pill bg-ink" />
          <span className="h-[2px] w-full rounded-pill bg-ink" />
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          aria-label={copy.topBar.accountLabel}
          className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-hairline bg-white p-1.5 shadow-lifted"
        >
          <p className="truncate px-3 py-2 text-sm font-semibold text-ink">
            {user.name ?? user.email}
          </p>
          <div className="my-1 h-px bg-hairline" />

          <Link href="/account/profile" className={itemClass} onClick={close}>
            {menu.profile}
          </Link>
          <Link href="/tailor" className={itemClass} onClick={close}>
            {menu.tailoring}
          </Link>
          {/* Real link (add-tailoring-history) — the paid gate lives on the
              route/view, which shows the upgrade state for a free user. */}
          <Link href="/history" className={itemClass} onClick={close}>
            {menu.history}
          </Link>
          {/* Usage is not built yet — a disabled row, honestly labeled (no dead link). */}
          <span
            aria-disabled="true"
            className="flex items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm text-ink-faint"
          >
            {menu.usage}
            <span className="text-xs text-ink-faint">{menu.comingSoon}</span>
          </span>
          <Link href="/account/billing" className={itemClass} onClick={close}>
            {menu.subscription}
          </Link>

          <div className="my-1 h-px bg-hairline" />
          <div className="px-1 py-0.5">
            <SignOutButton locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
