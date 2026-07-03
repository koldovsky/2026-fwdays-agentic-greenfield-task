# Demo video — narration script

> Phase 0 artifact (see [PLAN.md](PLAN.md)). This file is the **single source** for narration
> audio (TTS input), burned-in captions, and the `.srt` — the assembly pipeline parses it.
> Visual segments are cut to each beat's *actual* audio duration; the timecodes below are targets.
>
> **Format:** one `## Beat <id>` section per beat. `Narration` is the TTS input (what is spoken).
> `Caption` is the short burned-in text (the muted-playback carrier). `Visual` describes what is
> on screen. `Target` is the planned duration at ~145 wpm.
>
> **TTS:** macOS `say -v "Evan (Enhanced)"`, one clip per beat → `out/audio/<id>.mp3`
> (natural pace ~147 wpm ≈ budget; OpenAI `tts-1-hd` stays a config-switch alternative).
>
> **TTS respellings** — applied mechanically by the TTS step to narration text ONLY (captions,
> cards, and this file keep true spellings). Verified by ear on Evan (Enhanced):
>
> | written | spoken as | status |
> |---|---|---|
> | `JSON` | `Jaysawn` | ☑ user-picked (option 3, `fix-json.mp3`) |
> | `diff it` | `dihf it` | ☑ user-picked (option 3, `fix-diff.mp3`) |
> | `Transon` | (unchanged) | ☑ verified OK (`evan-pronunciation.mp3`) |
>
> Substitution order: phrase-level first (`diff it`), then word-level (`JSON`).

---

## Running example (used in Acts I and II)

Corpus recipe **`RecipeSwapKeysAndValues`** — *"Swap the keys and values of a dict."*

```json
// input                                   // output
{"FR": "France",                           {"France": "FR",
 "GB": "United Kingdom",                    "United Kingdom": "GB",
 "JP": "Japan"}                             "Japan": "JP"}
```

```json
// the Transon template (3 rules: map, value, key)
{"$": "map", "key": {"$": "value"}, "value": {"$": "key"}}
```

```sh
# the same transformation in jq (Act I foil, honest version)
jq 'with_entries({key: .value, value: .key})'

# the "readability cliff" jq example (real-world: group transactions by user, sum amounts)
jq 'group_by(.user) | map({key: .[0].user, value: map(.amount) | add}) | from_entries'
```

---

# Act I — Transformations as data (0:00–0:55)

## Beat I.1 — the problem
- **Target:** 0:00–0:12 (~30 words)
- **Visual:** dark card: "every system speaks JSON" — three mismatched JSON snippets (an API
  response, a config, a webhook payload) that clearly don't fit each other.
- **Caption:** Every system speaks JSON — never the same JSON.

**Narration:**
> Every system speaks JSON — but never the same JSON. So we spend our days reshaping it: this
> API's output into that service's input. Usually with throwaway code — or a one-liner.

## Beat I.2 — the string-DSL foil
- **Target:** 0:12–0:26 (~36 words)
- **Visual:** card 1: the honest jq swap one-liner with the input/output beside it. Card 2: the
  group-and-sum jq one-liner sliding in below it. Both rendered as real terminal-styled code.
- **Caption:** Your logic — hidden inside a string.

**Narration:**
> Here's jq, swapping the keys and values of a dictionary. Compact. And here's a real-world one.
> The problem isn't just readability — it's that your transformation logic is a program hidden
> inside a string.

## Beat I.3 — enter Transon
- **Target:** 0:26–0:46 (~52 words)
- **Visual:** the input → template → output pipeline diagram (clean redraw of the README ASCII);
  then the swap template JSON fades in as the "template" node's content; benefit words tick in
  one by one: *store · send · validate · diff · generate · safe*.
- **Caption:** Transon: the transformation itself is JSON.

**Narration:**
> Transon makes a different bet: the transformation itself is JSON. A template — pure JSON — plus
> your input, produces your output. Because the template is data, you can store it in a database,
> send it over an API, validate it, diff it — even generate it programmatically. And it's safe:
> no arbitrary code execution.

## Beat I.4 — the pivot
- **Target:** 0:46–0:55 (~26 words)
- **Visual:** the swap template JSON alone, center screen; on the last sentence it morphs
  (crossfade) into the same template as three connected blocks — the Act II reveal frame.
- **Caption:** Trees don't have to be written by hand.

**Narration:**
> The trade-off? A JSON tree is more verbose to write by hand than a one-liner. But here's the
> thing about trees: you don't have to write them by hand.

---

# Act II — The editor (0:55–1:45)

## Beat II.1 — reveal
- **Target:** 0:55–1:09 (~34 words)
- **Visual:** LIVE reference host. Examples picker opens (curated groups visible), selects
  *"Swap the keys and values of a dict"*; three blocks appear on the canvas; template JSON panel
  beside them; input panel shows the country dict.
- **Caption:** Every Transon rule is a block.

**Narration:**
> This is a visual editor for Transon. Every rule is a block. Let's load that same recipe — swap
> the keys and values of a dict. Three blocks — and the template JSON, live beside them.

## Beat II.2 — run, verify, then edit live
- **Target:** 1:09–1:24 (~37 words)
- **Visual:** LIVE. Click Run → output panel fills; gentle zoom on "✓ Output matches expected".
  Then drag the `Current value (value)` block out of its socket — the JSON panel updates
  **mid-drag** (pre-flight verified) — and drag it back; JSON restores. (Run-first order keeps the
  ✓ honest: the pristine template is what matches expected.)
- **Caption:** Run → ✓ matches expected. Blocks → JSON, live.

**Narration:**
> Hit Run — the real engine executes the template against the sample input and checks it against
> the expected result. That check mark means it matches. And editing is live: drag a block, and
> the JSON follows instantly.

## Beat II.3 — the reverse direction
- **Target:** 1:24–1:36 (~29 words)
- **Visual:** LIVE. Cursor moves to the JSON panel; a small text edit is typed; the blocks
  re-render to match.
- **Caption:** JSON → blocks, too.

**Narration:**
> And it works both ways: edit the JSON text directly, and the blocks follow. Two views of one
> document — and the JSON is always the source of truth.

## Beat II.4 — the guarantee
- **Target:** 1:36–1:45 (~28 words)
- **Visual:** LIVE, calm wide shot of the editor; caption carries the claim.
- **Caption:** Round-trip guaranteed — never silently rewritten.

**Narration:**
> The canvas is just a projection. Import, edit, export — the round-trip is guaranteed, and the
> editor will refuse a document it can't represent faithfully, rather than silently rewrite it.

---

# Act III — The generative architecture (1:45–2:35)

## Beat III.1 — the editor is generated
- **Target:** 1:45–2:05 (~50 words)
- **Visual:** animated pipeline diagram: `engine` node exports `metadata` (catalog scrolls by:
  rules, params, operators) → `G_palette / G_toolbox / G_encode / G_decode` generator nodes →
  `palette · toolbox · codec` artifacts → the editor screenshot. Arrows light up left to right
  in sync with the narration.
- **Caption:** No hand-written code per rule. The editor is generated.

**Narration:**
> Now, the part that makes this project unusual: there is no hand-written editor code per rule —
> the editor is generated. The engine exports its entire catalog — every rule, parameter, and
> operator — as metadata. Generators project that metadata into the block palette, the toolbox,
> and the codec that translates blocks to JSON and back.

## Beat III.2 — the metacompiler
- **Target:** 2:05–2:22 (~44 words)
- **Visual:** the diagram's generator nodes flip over to reveal they contain Transon markers
  (`"$"` / `"@"`); a recursion glyph draws around the whole pipeline. Then a split-flap style
  line: *new engine rule → new block, zero editor code*.
- **Caption:** The generators are Transon templates. A metacompiler, written in the language it compiles.

**Narration:**
> And those generators are themselves Transon templates. Transon, transforming a description of
> Transon, into the programs that edit Transon — a metacompiler, written in the language it
> compiles. When the engine gains a new rule, the editor grows a block — with zero editor code
> changed.

## Beat III.3 — self-hosting proof
- **Target:** 2:22–2:35 (~20 words)
- **Visual:** LIVE. The editor's Import dialog opens `G_palette` — its own palette generator —
  and it loads as blocks on the canvas. Hold the shot; let it land.
- **Caption:** The editor, editing its own source.

**Narration:**
> And the proof: the editor can open its own generators — and edit them.

---

# Act IV — Built by agents, gated by machines (2:35–3:45)

## Beat IV.1 — spec-first
- **Target:** 2:35–2:52 (~42 words)
- **Visual:** SPEC.md scrolls past numbered `FR-` requirement blocks; one requirement highlights;
  a small annotation stamps: *append-only · never renumbered*.
- **Caption:** Every behavior is a numbered, append-only requirement.

**Narration:**
> One more thing. This editor was built almost entirely by AI agents — but not by vibe-coding.
> The project runs on a spec-first harness: every behavior is a numbered requirement in a
> contract document. Requirements are append-only — never renumbered, never quietly rewritten.

## Beat IV.2 — test-first, machine-checked
- **Target:** 2:52–3:06 (~35 words)
- **Visual:** a test file header citing its FR ID → the traceability table (requirement → tests)
  → a terminal runs `check_traceability.py`, exits green.
- **Caption:** Requirement → test → traceability. Checked by a script, not by trust.

**Narration:**
> Each requirement is implemented test-first, and a traceability table maps every requirement to
> its tests. And that mapping isn't kept honest by discipline — a script checks it, on every
> single commit.

## Beat IV.3 — maker ≠ checker
- **Target:** 3:06–3:26 (~48 words)
- **Visual:** styled terminal replay of a real `round-trip-reviewer` finding — the M4 must-fix
  (surface check wrongly rejecting an in-surface document whose *data* contained the marker
  token): finding appears → verdict `MUST-FIX` → fix commit → re-verify `PASS`.
- **Caption:** The agent that writes the code never reviews it.

**Narration:**
> And the agent that writes the code never reviews it. Independent reviewer agents adversarially
> probe every risky change — this is a real finding, catching a real round-trip bug in the import
> gate before merge. Maker never equals checker.

## Beat IV.4 — the gates
- **Target:** 3:26–3:45 (~47 words)
- **Visual:** gate names cascade with green checks (round-trip corpus · engine parity · byte-equal
  regen · traceability); then the animated test-count ramp across milestones:
  **13 → 133 → 763 → 1387 → 1551 → 1600+**, M0…M5 labels beneath.
- **Caption:** 6 milestones · 1600+ tests · gates a model can't sweet-talk.

**Narration:**
> Deterministic gates hold the line: round-trip fidelity over the engine's entire example corpus,
> engine parity, byte-equal regeneration of every generated artifact. Six milestones, from empty
> repository to embeddable component — sixteen hundred tests — every one signed off by gates a
> model can't sweet-talk.

---

# Close (3:45–4:00)

## Beat C.1 — takeaway
- **Target:** 3:45–4:00 (~28 words)
- **Visual:** close card: the three-line takeaway stacked; beneath it a 3-line `<transon-editor>`
  embed snippet; repo URL + QR. Hold to end.
- **Caption:** Transformations as data. An editor that never lies about your JSON. Built by agents, gated by machines.

**Narration:**
> Transformations as data. An editor that never lies about your JSON. Built by agents — gated by
> machines. Transon is open source, MIT licensed. Come build with it.

---

## Word-count budget

| Act | Beats | Words | @145 wpm | Target |
|---|---|---|---|---|
| I | 4 | ~144 | ~0:60 | 0:55 |
| II | 4 | ~128 | ~0:53 | 0:50 |
| III | 3 | ~114 | ~0:47 | 0:50 |
| IV | 4 | ~172 | ~0:71 | 0:70 |
| Close | 1 | ~28 | ~0:12 | 0:15 |
| **Total** | **16** | **~586** | **~4:03** | **4:00** |

Acts I and IV run ~5s hot against target — acceptable (TTS pace is settable, and visuals are cut
to actual audio). If the rough cut runs long, the designated trims are: I.2 loses its second
sentence, and IV.4 loses "from empty repository to embeddable component".
