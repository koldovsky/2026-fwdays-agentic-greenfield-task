# STATUS — session log
> RULE: After every prompt, prepend ONE entry (newest on top). Keep only the last 3 — delete older ones every time (mandatory trim). Each entry starts with <YYYY-MM-DD HH:MM> (24h, local). English, terse. Markdown, Obsidian + GitHub compatible.
---

**2026-07-12 11:44** — **Prompt:** Prepare everything for the commit, propose the message, then commit

**Did:** Found the pre-existing diffs in `.coderabbit.yaml`, `README.md` and the PR template were pure CRLF noise — no content change. Added `.gitattributes` (normalize to LF), ran `git add --renormalize`, which made the noise vanish, so no separate EOL commit was needed. Untracked `README.original.md` (moved to the git-ignored stash). Committed the whole restructure as `docs: restructure agent context ahead of SDD`.

**2026-07-12 11:26** — **Prompt:** Keep the code exception as-is (plugin likely fences code off so compression cannot corrupt it); park a low-priority task to research it

**Did:** Added a P2 item to `TODO.md` — investigate the caveman plugin's `Boundaries` rule, hypothesis recorded, explicit "do not optimize away the code exception" note. No rule changed.

**2026-07-12 11:04** — **Prompt:** Create TODO.md; add rules — always consult TODO, caveman style for internal docs, Obsidian-compatible Markdown

**Did:** Created `TODO.md` (priority backlog, P0/P1/P2, Done section). Added three `AGENTS.md` rules: read `TODO.md` before picking work; internal docs caveman-compressed; every `.md` must render in both Obsidian and GitHub. `CLAUDE.md` now states the three-file split (rules / next / log). Dropped the term-extraction duplicate — `README.md` items 5–8 already own it.
