# STATUS — session log
> RULE: After every prompt, prepend ONE entry (newest on top). Keep only the last 3 — delete older ones every time (mandatory trim). Each entry starts with <YYYY-MM-DD HH:MM> (24h, local). English, terse. Markdown, Obsidian + GitHub compatible.
> Claude resume: not recorded; root Claude replaces this row when current session ID is known.
> Codex resume: `codex resume 019f557e-d742-7113-a586-aa91c275c3e8`
---

**2026-07-12 15:04** — **Prompt:** Audit baseline readiness; verify staging is correct; Codex stopped

**Did:** Audit passed: no secret hits, LF normalized, Markdown targets valid, `main` ahead 1 (`6e13703`), `Day-01` sources untracked as agreed. Found index stale for three files after concurrent Codex edits, plus a duplicated `TODO.md` entry (`Add local Claude settings ignore` in both `Now` and `Done`) — removed the `Now` copy. `.coderabbit.yaml` shows as modified but is byte-identical to HEAD (WSL stat noise). Restaging all before commit.

**2026-07-12 14:55** — **Prompt:** Keep transcripts visible until Day-01 sample exists

**Did:** Removed transcript ignore rules from `.gitignore`; kept only `.claude/settings.local.json` ignored; updated backlog to defer transcript ignore until the sample fixture lands.

**2026-07-12 14:54** — **Prompt:** Add local-safety gitignore rules for transcripts and Claude settings

**Did:** Added `.claude/settings.local.json` to `.gitignore`; transcript ignore was later deferred until the sample fixture lands.
