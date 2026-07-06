"use client";

import { useId, useState } from "react";
import type { RepoSummary } from "@/lib/types";
import { formatCompact, formatMonthYear } from "@/lib/metrics/format";
import { strings } from "@/lib/strings";

// Collapsible "Top repositories" section (user-stats: top repositories). The
// title toggles a ranked list of the ten most-starred repos; each row links to
// GitHub, with a "view all" out-link below. The ranking itself is pure (see
// buildTopRepos); this component only presents it.
const FALLBACK_DOT = "var(--text-muted)";

export function TopRepos({ login, repos }: { login: string; repos: RepoSummary[] }) {
  const [open, setOpen] = useState(true);
  const listId = useId();
  const allReposUrl = `https://github.com/${encodeURIComponent(login)}?tab=repositories`;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={strings.stats.toggleRepos}
        className="flex w-full items-start justify-between gap-4 p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-xl"
      >
        <span>
          <span className="block font-serif text-h2">{strings.stats.topReposTitle}</span>
          <span className="mt-1 block font-sans text-small text-text-muted">
            {strings.stats.topReposSub}
          </span>
        </span>
        <span
          aria-hidden
          className="mt-1 text-text-muted transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div id={listId}>
          {repos.length === 0 ? (
            <p className="px-6 pb-6 font-sans text-small text-text-muted">
              {strings.stats.noRepos}
            </p>
          ) : (
            <ol className="border-t border-border">
              {repos.map((repo, i) => (
                <li key={repo.name} className="border-b border-border last:border-b-0">
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-track focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary"
                  >
                    <span className="w-6 shrink-0 font-serif text-body italic text-text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-sans text-body font-semibold text-accent-primary group-hover:underline">
                          {repo.name}
                        </span>
                        {repo.language && (
                          <span className="flex shrink-0 items-center gap-1.5 font-sans text-small text-text-muted">
                            <span
                              className="size-[10px] rounded-[3px]"
                              style={{ background: repo.languageColor ?? FALLBACK_DOT }}
                              aria-hidden
                            />
                            {repo.language}
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="mt-1 truncate font-sans text-small text-text-muted">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-serif text-body">
                        <span aria-hidden>★ </span>
                        <span className="sr-only">stars: </span>
                        {formatCompact(repo.stars)}
                      </div>
                      <div className="mt-0.5 font-sans text-caption text-text-muted">
                        {formatMonthYear(repo.pushedAt)}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
              <li className="px-6 py-5 text-center">
                <a
                  href={allReposUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-sans text-small font-semibold text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  {strings.stats.viewAllRepos} <span aria-hidden>→</span>
                </a>
              </li>
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
