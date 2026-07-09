// Landing footer: brand lock, nav links, honest attribution. No trackers.
// Copy via shared/lib/i18n.
import Link from "next/link";
import { type Locale } from "@/shared/lib/i18n";
import { footerContent, legalLinks, navLinks } from "../lib/content";
import { Wrap } from "./primitives";

export function Footer({ locale = "ua" }: { readonly locale?: Locale }) {
  const nav = navLinks(locale);
  const legal = legalLinks(locale);
  const { anthropicCredit } = footerContent(locale);
  return (
    <footer className="mt-6 border-t border-hairline py-11">
      <Wrap className="flex flex-wrap items-center justify-between gap-5">
        <a href="#top" aria-label="Vouch home" className="flex items-center gap-[10px]">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-brand font-display text-[17px] font-bold text-white">
            V
          </span>
          <span className="text-md font-semibold tracking-normal text-ink">Vouch</span>
        </a>
        <nav aria-label="Footer" className="flex gap-[22px] text-sm text-ink-soft">
          {nav.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </a>
          ))}
          {legal.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="text-sm text-ink-muted">{anthropicCredit}</div>
      </Wrap>
    </footer>
  );
}
