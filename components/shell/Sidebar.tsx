import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/shell/Wordmark";
import { NavItem } from "@/components/shell/NavItem";
import { navIcon } from "@/components/shell/nav-icons";
import { CABINET_NAV } from "@/lib/nav/cabinet-nav";
import { uk } from "@/lib/i18n/uk";
import type { CurrentHrUser } from "@/app/(cabinet)/current-user";

/** Display-only HR identity shown at the bottom of the sidebar. */
type SidebarUser = Pick<CurrentHrUser, "name" | "email">;

/**
 * The fixed 220px HR workspace sidebar (FR-SHELL-01). Wordmark on top, the
 * primary navigation in the middle, the signed-in user plus a sign-out control
 * at the bottom. Sign-out posts to the auth handler at `/api/auth/sign-out`.
 * All copy comes from `lib/i18n` (Ukrainian-first); oversized values truncate.
 */
export function Sidebar({ user }: { user: SidebarUser | null }) {
  const t = uk.shell;

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-line-soft bg-surface">
      <div className="px-[var(--space-7)] py-[var(--space-8)]">
        <Wordmark />
      </div>

      <nav
        aria-label={t.nav.label}
        className="flex flex-1 flex-col gap-[var(--space-2)] px-[var(--space-5)]"
      >
        {CABINET_NAV.map((item) => (
          <NavItem
            key={item.key}
            href={item.href}
            label={t.nav[item.key]}
            icon={navIcon(item.key)}
          />
        ))}
      </nav>

      {user !== null ? (
        <div className="border-t border-line-soft px-[var(--space-7)] py-[var(--space-7)]">
          <div className="mb-[var(--space-5)] flex flex-col gap-[var(--space-1)]">
            <span
              id="sidebar-user-label"
              className="text-[length:var(--label-size)] uppercase tracking-[var(--label-spacing)] text-ink-muted"
            >
              {t.signedInAs}
            </span>
            <span
              aria-labelledby="sidebar-user-label"
              className="truncate text-[var(--text-base)] font-[var(--weight-medium)] text-ink"
            >
              {user.name}
            </span>
            <span className="truncate font-[family-name:var(--font-mono)] text-[var(--text-sm)] text-ink-muted">
              {user.email}
            </span>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              className="focus-ring flex w-full items-center gap-[var(--space-4)] rounded-[var(--radius-sm)] px-[var(--space-6)] py-[var(--space-4)] text-left text-[var(--text-base)] text-ink-muted transition-colors duration-[var(--motion-fast)] hover:bg-[var(--line-faint)]"
            >
              <LogOut aria-hidden="true" size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="truncate">{t.signOut}</span>
            </button>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
