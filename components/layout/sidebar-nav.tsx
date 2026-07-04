"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type SidebarNavLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function SidebarNavLink({
  href,
  label,
  icon,
  collapsed = false,
  onNavigate,
}: SidebarNavLinkProps) {
  const pathname = usePathname();
  const active =
    href === "/notes"
      ? pathname === "/notes" || pathname.startsWith("/notes/")
      : pathname === href || pathname.startsWith(`${href}/`);
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border-none px-2.5 py-[7px] text-left no-underline transition-[background] duration-[var(--duration-fast)]"
      style={{
        background: active
          ? "var(--color-selected)"
          : hover
            ? "var(--color-hover)"
            : "transparent",
        color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
        justifyContent: collapsed ? "center" : "flex-start",
        paddingLeft: collapsed ? undefined : 10,
        paddingRight: collapsed ? undefined : 10,
        minHeight: 44,
      }}
    >
      <span className="shrink-0" style={{ display: "inline-flex" }}>
        {icon}
      </span>
      {!collapsed && (
        <span
          className="min-w-0 flex-1 truncate text-sm"
          style={{
            fontWeight: active ? "var(--fw-semibold)" : "var(--fw-medium)",
            color: active ? "var(--color-text)" : "inherit",
          }}
        >
          {label}
        </span>
      )}
    </Link>
  );
}

type SidebarSectionProps = {
  label: string;
  collapsed?: boolean;
  children: ReactNode;
};

export function SidebarSection({
  label,
  collapsed = false,
  children,
}: SidebarSectionProps) {
  if (collapsed) {
    return <div className="mt-4 flex flex-col gap-px">{children}</div>;
  }

  return (
    <div className="mt-[18px]">
      <div className="flex items-center justify-between px-2.5 pb-1.5">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

type PlaceholderRowProps = {
  label: string;
  icon?: ReactNode;
  color?: string;
  collapsed?: boolean;
};

export function SidebarPlaceholderRow({
  label,
  icon,
  color,
  collapsed = false,
}: PlaceholderRowProps) {
  if (collapsed) return null;

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-[7px] text-sm"
      style={{ color: "var(--color-text-secondary)" }}
      aria-hidden
    >
      {color ? (
        <span
          className="size-[9px] shrink-0 rounded-full"
          style={{ background: color }}
        />
      ) : (
        <span className="shrink-0 opacity-60">{icon}</span>
      )}
      <span className="truncate">{label}</span>
    </div>
  );
}
