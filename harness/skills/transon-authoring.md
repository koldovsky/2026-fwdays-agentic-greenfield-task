---
name: transon-authoring
description: Author, read, and verify Transon JSON-to-JSON templates — the rule/marker model, the built-in rules/operators/functions, marker escaping, and multi-marker staging for templates that generate templates (e.g. metadata-driven projections). Use when writing or reviewing any Transon template, reasoning about rule semantics or NO_CONTENT, or generating a template from data. Authority is the running engine + engine SPECIFICATION, never web/LLM memory.
disable-model-invocation: true
---

# Transon authoring

How to author **Transon** templates (`Transformer(template).transform(data)` — homogeneous
JSON-to-JSON). This skill is engine-language only; for the Blockly/Zelos/workspace layer use the
`blockly-authoring` skill instead.

## Authority — do not trust memory or the web

Transon is **new**. Your training data and general web search do **not** reliably know its rules,
operator names, or semantics, and **Context7 has no Transon coverage** (use Context7 only for
Blockly/React/Vite, never for Transon). The public docs site is **generative** — its content is
produced at runtime from engine docstrings + the test corpus, so reading the rendered page is not a
substitute for the engine.

**The only authorities are, in order:**

1. **A running engine** — install and query it (below). The behavior the engine produces is correct
   by definition.
2. **The engine SPECIFICATION** — [`docs/SPECIFICATION.md`](https://github.com/transon-org/transon/blob/main/docs/SPECIFICATION.md)
   in the engine repo. Describes the engine *as implemented*.

When unsure about a rule's parameters, an operator/function name, or an edge case (`NO_CONTENT`,
ordering, type rules) — **run it**, don't guess.

## Get a runtime (don't assume a local checkout)

Reference the engine by its repository, not a hard-coded sibling path:

```bash
pip install transon          # from PyPI: https://pypi.org/project/transon/
# or install from source: https://github.com/transon-org/transon
```

Query the authoritative catalog and try templates:

```python
import transon, json
# Full rule/operator/function docs (the same data the docs site renders):
from transon.docs import get_all_docs
print(json.dumps(get_all_docs(), indent=2))   # rules, params, operators, functions, examples

# Run a template to confirm behavior:
t = transon.Transformer({"$": "attr", "name": "email"})
print(t.transform({"email": "a@b.c"}))         # -> "a@b.c"
```

`transon.metadata.get_editor_metadata()` gives the projection-ready catalog (per-param `kind`,
resolved enum `options`, pre-derived variant signatures) when you need machine-readable structure.

## Mental model (verify specifics against the runtime)

- **Template = any JSON.** The engine walks it recursively and rebuilds the same JSON shape.
- **Marker dict = rule.** A dict containing the marker key (default `"$"`) is a **rule invocation**:
  `{"$": "<rule>", ...params}`. Any other dict/list/scalar is **literal** and copied through (its
  values still walked).
- **Parameters are themselves templates.** They are walked too, so rules nest and compose. There is
  **no** string-embedded DSL or path syntax — everything is JSON structure.
- **Context.** `this` = current value; inside `map`/`filter` you also get `item`, `index`, `key`,
  `value`; `parent` = the previous scope's value.
- **Variables.** `set` stores `this` under a name in the current scope (downward-visible only);
  `get` reads it (with optional `default`). `set` is a side effect, so its order among siblings
  matters.
- **`NO_CONTENT`.** The "no value" sentinel. Container rules (`map`/`object`/`filter`/`join`/`file`)
  **skip** it; many rules accept a `default` param to substitute when a value is `NO_CONTENT`.
- **Purity.** `transform()` never mutates input or template; output never aliases input.

## Built-in surface (v0.1.1 — confirm via `get_all_docs()`)

22 rules. Treat this as a map, not a spec — confirm parameters by running the engine.

- **Context:** `this`, `parent`, `item`, `index`, `key`, `value`
- **Variables:** `set`, `get`
- **Data access:** `attr` (single `name` or `names` path; optional `default`)
- **Construct:** `object` (`key`+`value`, or literal-keyed `fields`)
- **Iterate:** `map`, `filter`
- **Combine:** `zip`, `join`
- **Compose (pipeline):** `chain` — see "Composition with `chain`" below
- **Compute:** `expr` (`op` + optional `value`/`values`), `call` (`name` + optional `value`/`values`)
- **Format:** `format`
- **Side effect:** `file`
- **Include:** `include`
- **Conditional dispatch (lazy):** `switch` (equality on `key` → `cases` mapping), `cond` (ordered
  `[{when, then}]` arms); both take optional `default` and evaluate **only** the selected branch.

Operators (`expr.op`) and functions (`call.name`) are a **closed set owned by the engine** —
get the exact names + aliases from `get_all_docs()` / `get_editor_metadata()`, never invent them.

## Composition with `chain` (pipelines, not inside-out nesting)

`chain` is the backbone of multi-step transformations and "formula" pipelines. Most rules
(`attr`, `expr`, `call`, `map`, `filter`, `format`…) read their subject from `this`, so composing
them by nesting reads **inside-out** and gets unwieldy fast. `chain` flattens that into a
**left-to-right pipeline**: `funcs` is an ordered list of templates; **each step's result becomes
`this` for the next** — `chain(f1, f2, f3)(x) === f3(f2(f1(x)))`.

```json
{"$": "chain", "funcs": [
  {"$": "item"},
  {"$": "attr", "name": "a"},
  {"$": "attr", "name": "b"}
]}
```

Step 1 **seeds `this`** (here the current `item`); each later step transforms the previous result
(→ `item.a`, then `item.a.b`). Use the same shape to thread a value through `expr`/`call` steps to
build a computed formula, or through `filter`→`map` to reshape a list in stages.

Notes that matter:

- `funcs` holds **templates**, not only rules — any JSON template is a valid step.
- The **first** func runs in the **caller's** context (a `set` there is visible *outside* the
  chain); each later func runs in a derived context. Order is significant.
- A step that yields `NO_CONTENT` becomes the next step's `this` — guard with `default` where a miss
  should not propagate.

## Literal marker key (`$` as data)

A plain dict key equal to the marker would be read as a rule. To emit a literal `$` key, use the
`object` rule's `fields` (keys verbatim, values walked):

```json
{"$": "object", "fields": {"$": "literal value for a $ key"}}
```

Alternatively, configure a different marker on the `Transformer` (`marker=` kwarg) template-wide.

## Advanced: templates that generate templates (staging)

When a template must **emit another Transon template** (e.g. turning metadata into a codec/projection
template), use **two markers** so the levels don't collide:

- Run the generator with a **meta-marker** (e.g. `@`) — `@`-keyed dicts evaluate **now** (reading the
  source data).
- Ordinary **`$`-keyed structure is literal** under marker `@`, so it is emitted **verbatim** into
  the produced template.

```python
generator = {"@": "format", "pattern": "rule_{}", "value": {"@": "attr", "name": "name"}}
transon.Transformer(generator, marker="@").transform({"name": "attr"})  # -> "rule_attr"
# A {"$": ...} dict inside `generator` is copied through unchanged → it becomes a rule in the OUTPUT.
```

Useful building blocks for generation: `map`/`object` to build structure from a list/dict,
`switch`/`cond` for per-item dispatch (only the chosen arm is walked), and `include` to split large
generators into per-item fragments. `include` inherits the parent's default marker (v0.1.1) so staged
fragments stay consistent. The engine has **no** `eval`/`apply` and **no** `quote`/`raw` — two-marker
staging is the supported way to control what evaluates vs. what is emitted.

## Authoring workflow

```
- [ ] 1. Confirm the rule/operator/function exists and its params via get_all_docs() — not memory.
- [ ] 2. Draft the template as pure JSON; nest rules in params rather than reaching for any DSL.
- [ ] 3. Decide NO_CONTENT behavior: which misses should be skipped vs. given a `default`.
- [ ] 4. For meta/generator templates, pick a distinct marker so inner `$` is emitted verbatim.
- [ ] 5. RUN it on representative data (and edge cases: missing fields, empty lists, mixed types).
- [ ] 6. On error, read the message — DefinitionError = template mistake; TransformationError = data.
```

## Anti-patterns

- ❌ Inventing rules, operator names, function names, or parameters from memory or web results.
- ❌ Treating the rendered docs site as authoritative (it is generated output, not the engine).
- ❌ Using Context7 for Transon semantics (it has none).
- ❌ Any string-embedded expression/path mini-language — Transon is pure JSON structure.
- ❌ Hard-coding a local engine path (e.g. a sibling folder); install/reference it by repository.

## Reference (engine repository — links, not local paths)

- Engine repo: https://github.com/transon-org/transon
- Specification: https://github.com/transon-org/transon/blob/main/docs/SPECIFICATION.md
- Changelog: https://github.com/transon-org/transon/blob/main/CHANGELOG.md
- PyPI: https://pypi.org/project/transon/
- Live (generative) docs & playground: https://transon-org.github.io/ — needs the runtime to render;
  not a substitute for running the engine yourself.
