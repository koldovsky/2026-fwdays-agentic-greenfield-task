# Use NLTK punkt_tab for sentence tokenization in the translation pipeline

## Context and Problem Statement

Phase 2 ships the F3 html-aware translation pipeline: an EPUB is split into sentence-bounded chunks, each chunk is sent to a translation provider, and the translated chunks are reassembled into the target EPUB. The chunker's correctness gates the BDD acceptance contract — `html-aware-translation-pipeline.feature` asserts that a 100-sentence chapter produces exactly 100 chunks, that a single-sentence chapter produces exactly 1 chunk, and that chunk boundaries never split a sentence. The chunker must also feed the per-chunk work loop with a 4096-character cap, and it must work for ≥55 declared target languages. Which sentence-tokenization library should we standardize on?

## Considered Options

* NLTK `punkt_tab`
* NLTK `punkt` (legacy — deprecated by NLTK as of 3.8.2)
* spaCy sentencizer
* Regex-based splitter
* Custom rule-based splitter (no external dep)

## Decision Outcome

Chosen option: "NLTK `punkt_tab`", because it is the only option that simultaneously satisfies the BDD 100-sentence=100-chunks invariant on real prose (Gutenberg fixture), ships deterministic offline tokenization with a 19-language model set that covers the bulk of our target-language list out of the box, and has a small additive footprint (one `nltk>=3.9.4,<3.10` dep + ~4MB of downloaded data — the legacy `punkt` package is marked deprecated by NLTK as of 3.8.2 and is NOT installed). spaCy sentencizer is rule-based and would also need a small dep footprint, but its abbreviation handling produces splits inside the Gutenberg fixture (e.g. "Mr. Smith" → 2 sentences) which breaks the 100/1 BDD assertion — fixing spaCy for this would require shipping a per-language model (~50MB+ each), ballooning the demo container for marginal benefit on a mocked provider. Regex splitting is the cheapest fallback and is already implemented (D-09) for languages outside the NLTK 19-language coverage, but it is not accurate enough as a primary strategy (single-letter abbreviations, multi-sentence paragraphs, and quote-attached punctuation all misbehave). A hand-rolled rule-based splitter would re-invent punkt and lose the ML advantage on the long tail of languages we care about.

The D-09 fallback design (NLTK when supported, regex when not) makes NLTK's closed-set 19-language coverage a non-issue: any target language outside the model set transparently falls back to the regex splitter with a frontend hint banner that explains the trade-off. When the picked target language IS in the NLTK set but the `punkt_tab` pickle is not installed on disk, the banner offers a one-click `nltk.downloader` install command. When the target language is NOT in the NLTK set at all, the banner renders without the install command (NLTK does not ship a tokenizer for that language).

### Implementation

The decision is implemented in plan `02-01` (`.planning/phases/02-job-orchestrator-translation-spine/02-01-PLAN.md`):

- `backend/pyproject.toml` declares `nltk>=3.9.4,<3.10` in `[project] dependencies` (not `[dependency-groups] dev` — runtime dep consumed by the chunker).
- `backend/src/epubtv/tools/bake_nltk.py` ships the `bake()` helper, idempotent via `nltk.data.find` guards; CLI entry `python -m epubtv.tools.bake_nltk` warms the CI cache. Only `punkt_tab` is downloaded — the legacy `punkt` package is NOT installed.
- `backend/src/epubtv/domain/nltk_languages.py` exports `SUPPORTED_LANGUAGES` (the closed 19-element frozenset), `ISO_639_1_BY_NLTK_NAME` + `NLTK_NAME_BY_ISO_639_1` (the bidirectional name↔ISO map; NLTK 3.9.4 `PunktTokenizer` takes the full English name at construction time), `TARGET_LANGUAGES` (87-element set, F2 AC ≥55), and `compute_health()` returning the locked D-09 envelope.
- `backend/src/epubtv/domain/chunkers.py` implements `SentenceChunker.chunk(html, language, chapter_idx) -> list[Chunk]` with the NLTK branch (19 langs) + the D-09 regex fallback + the 4096-char hard cap with sub-chunk character split. `chunk_id` format `tx_ch{N}_s{M}` per D-04.
- The `/api/v1/health/nltk` HTTP route ships in plan 02-03 (router wiring); this plan ships the data + the `compute_health()` helper so the route is a one-liner.

### Consequences

* Good, because the BDD 100-sentence=100-chunks acceptance test passes deterministically on the Gutenberg fixture across all 9 BDD prose shapes.
* Good, because NLTK is offline, hermetic, and works in the demo container (the bake step in `tools/bake_nltk.py` downloads once into the image layer).
* Good, because the regex fallback (D-09) is the same code path used for translation AND voice-over chunking, so we do not need a second chunker implementation in Phase 3.
* Good, because `nltk.data.find` is a one-call capability check that the `/health/nltk` endpoint uses to report `supported_languages` to the SPA without an extra config layer.
* Bad, because NLTK ships `punkt_tab` as a bundled all-or-nothing package — there is no per-language model download. Users installing a new language cannot opt into a smaller download. (Mitigated by the bake script + CI cache; mitigated again by the regex fallback.)
* Bad, because NLTK's sentence boundary detection is not 100% accurate on heavily stylized prose (e.g. dialogue with em-dashes, lists). The 95% structural-tag-preservation BDD scenario covers structural fidelity, not tokenization fidelity, so any rare miss does not break the BDD contract but may produce a slightly off chunking for edge-case manuscripts. (Mitigated by the per-chunk provider call: a mis-split sentence is translated atomically and the structural output is still preserved.)
* Bad, because NLTK's API (`PunktTokenizer(language).tokenize(text)`) requires a model download per language. We do not change this: the bake is a one-time dev-time / CI-time concern.
