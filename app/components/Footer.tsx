import { strings } from "@/lib/strings";

// Footer credits the GitHub REST API with a hyperlink (FR-SHELL-03, BC-BRAND-02).
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-6 py-6 font-sans text-caption text-text-muted">
        <span>{strings.brand.name}</span>
        <a
          href={strings.brand.githubApiUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm underline decoration-border underline-offset-4 transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          {strings.brand.footerCredit}
        </a>
      </div>
    </footer>
  );
}
