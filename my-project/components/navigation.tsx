"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navigation.module.css";

const links = [
  { href: "/dashboard", label: "Огляд" },
  { href: "/inventory", label: "Запаси" },
  { href: "/procurement", label: "Закупівлі" },
  { href: "/manufacturing", label: "Виробництво" },
  { href: "/ledger", label: "Журнал рухів" },
];

export const isNavigationActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function Navigation() {
  const pathname = usePathname();
  return <nav className="primary-nav" aria-label="Головна навігація">{links.map(({ href, label }) => {
    const active = isNavigationActive(pathname, href);
    return <Link key={href} href={href} className={active ? styles.active : undefined} aria-current={active ? "page" : undefined}>{label}</Link>;
  })}</nav>;
}
