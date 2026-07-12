# STATUS — session log
> RULE: Each prompt: assess `STATUS.md`. Log only substantive product, artifact, workflow-decision, or next-work change; skip acknowledgement, liveness, read-only check, and bookkeeping of pre-existing work. Keep newest 3; trim on log. Entry starts <YYYY-MM-DD HH:MM> (24h, local). English terse. `Did` starts `Codex:` or `Claude:` and records only that actor's direct action. Markdown, Obsidian + GitHub compatible.
> Claude resume: not recorded; root Claude replaces this row when current session ID is known.
> Codex resume: `codex resume 019f557e-d742-7113-a586-aa91c275c3e8`
---

**2026-07-12 21:50** — **Prompt:** Clarify status-log threshold

**Did:** Codex: status now excludes read-only inspection and bookkeeping of work already done.

**2026-07-12 21:48** — **Prompt:** Correct status-log authorship

**Did:** Codex: corrected own log entry and rule; no agent claims another actor's work.

**2026-07-12 20:08** — **Prompt:** Review both PRDs; finalize

**Did:** Claude: PRD finalized. Closed five gaps in `docs/prd.md`: partial publish (approved as prose, rest dimmed in callout, page banner, human-triggered — user accepted unreviewed text going public since censor runs first); file layout (`article.md` working surface vs generated `gitbook/README.md`); status set `draft`/`changes_requested`/`edited`/`approved`; checks split into shared/card-only/article-only (12 total); card status in YAML frontmatter. `prd-final.md` aligned. Next: `openspec/config.yaml` context, then Day_02 spike.
