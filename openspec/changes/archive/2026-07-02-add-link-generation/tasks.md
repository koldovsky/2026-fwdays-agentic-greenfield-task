## 1. Package scaffolding

- [x] 1.1 Create the link-generation package under the `md/agentic/monojar` module (e.g. `internal/linkgen`)
- [x] 1.2 Define `Link{Name string, Amount int, URL string}` and the `jarLinkBaseURL = "https://send.monobank.ua/jar/"` constant

## 2. Core link construction

- [x] 2.1 Implement `GenerateLinks(matched []jarmatching.Matched) []Link`
- [x] 2.2 Implement `buildURL(sendID string, amount int) string` returning `https://send.monobank.ua/jar/{sendId}?a={amount}` via `fmt.Sprintf`, amount applied 1:1 with no conversion
- [x] 2.3 Map each `Matched` to one `Link{Name, Amount, URL}` at the same index, preserving input order with no reordering/dedup/grouping

## 3. Tests

- [x] 3.1 Table-driven tests asserting the exact link string for a range of `sendId`/`amount` pairs
- [x] 3.2 Test that the `a` query parameter equals the input amount verbatim (no ×100 or other scaling)
- [x] 3.3 Test that the generated link contains no query parameter other than `a` and no substring of an arbitrary token-like value placed elsewhere in the environment
- [x] 3.4 Test that `GenerateLinks` preserves input order across multiple matched entries

## 4. V-1 runtime verification gate (manual, one-time)

- [ ] 4.1 Using a real `MONO_TOKEN` and a real personal jar, run the pipeline up through `link-generation` (ad hoc, e.g. a small `main.go` or test harness) to produce one real `https://send.monobank.ua/jar/{sendId}?a=N` link
- [ ] 4.2 Open that link in a browser and confirm the prefilled transfer amount reads `N ₴`, not `N` kopiykas
- [ ] 4.3 Record the outcome in `docs/current-state.md` and update FR-LINK-01's status in `docs/product-requirements.md` from `accepted` to `shipped` (or reopen this capability if the check fails)
