# implement-cli — tasks

## 1. CLI implementation

- [x] 1.1 Implement `askdocs/cli.py`: `render_answer(answer) -> str` pure formatter (answer text + `Джерела:` list, or `Джерела: —` on refusal)
- [x] 1.2 Implement `main()`: build retriever + LLM from env, single-shot mode (question arg) and interactive REPL (no arg), print `render_answer` output; `python -m askdocs.cli` entrypoint

## 2. Tests

- [x] 2.1 Unit tests for `render_answer`: found answer lists its sources in order; refusal shows the refusal text and the explicit no-sources marker

## 3. Done criteria

- [x] 3.1 Full suite green via `docker compose run --rm app pytest`
- [x] 3.2 Manual check: `docker compose run --rm app python -m askdocs.cli "питання"` prints answer + sources against the fixture corpus
