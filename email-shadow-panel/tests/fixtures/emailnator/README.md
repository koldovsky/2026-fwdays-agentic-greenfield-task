# Emailnator Fixtures

These Phase 0 fixtures are intentionally sanitized and carry explicit provenance labels.

- `synthetic`: invented for deterministic tests only. These do not prove the live provider contract.
- `public-reference-derived`: derived from public Emailnator page or client-bundle behavior without using a generated inbox.
- `live-sanitized`: reserved for future manually collected evidence after approved live verification.

Current fixture provenance:

- `bootstrap.public-reference.json` and `bootstrap.public-reference.html`: `public-reference-derived`
- `generate.public-reference-derived.json`: `public-reference-derived`
- `message-list-empty.synthetic.json`: `synthetic`
- `message-list-populated.synthetic.json`: `synthetic`
- `message-detail.synthetic.html`: `synthetic`
- `provider-error.synthetic.json`: `synthetic`
- `provider-challenge.synthetic.html`: `synthetic`

No fixture in this directory contains live cookies, live XSRF values, active inbox addresses, personal senders, or real message content.