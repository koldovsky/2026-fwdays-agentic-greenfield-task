# 14 — The render function must forget, and NFR-SEC-01 must say so

Type: research
Status: open
Blocked by: 05

## Why this ticket exists

The map's settled decision 2 was revised: the PDF is rendered by a **stateless**
Vercel Route Handler. "Stateless" is now the load-bearing word in the product's
entire privacy story, and it is currently an adjective rather than a
requirement.

Every invoice carries the entrepreneur's **tax ID** and **IBAN**, plus the
client's name, address, email and phone. Before the revision, none of that ever
left the device. Now it is POSTed to a function on every render. Nothing is
stored — but "nothing is stored" has to be something we can point at, not
something we assert.

## Question

**(a) What does Vercel retain by default?** Establish, from Vercel's own
documentation: are request bodies captured in runtime logs? What is written to
logs on an unhandled exception — does the request payload appear in the stack
trace or the function's input? What is the log retention period on the plan this
project uses? Are logs readable by anyone with repo access?

**(b) What must our code do to keep the promise?** Enumerate concretely:
no `console.log` of the payload; `Cache-Control: no-store` on the PDF response;
no analytics or error-reporting middleware on this route; no writing to `/tmp`
beyond Chromium's own scratch, and confirmation that `/tmp` does not survive
between invocations on the same warm instance.

**(c) What replaces `NFR-SEC-01`?** It currently reads: *"Supplier tax ID and
IBAN never hardcoded in client bundle; use env/config."* Ticket `01` and the
charting decisions have made every clause of that wrong:

- The data is **never in the bundle** because the user types it, not because it
  is in env.
- `NEXT_PUBLIC_*` env vars are **inlined into the bundle at build time**, so the
  prescribed remedy is the disease.
- The real obligation is now twofold: the repo never contains real supplier
  data, **and** the render function never retains it.

Write the replacement requirement, or requirements, in a form that can be tested
rather than believed.

**(d) Is there a cheaper shape?** Consider, and reject or accept with reasons:
sending only a rendered HTML string to the function rather than structured data;
or having the browser POST the fully-substituted HTML so the function is a pure
`html → pdf` pipe that never sees a field name. Note this does not reduce what
transits — only what the server understands.

## Output

A markdown summary at `.scratch/mvp-spec-coherence/assets/14-privacy.md`, ending
in the exact replacement text for `NFR-SEC-01` and any new `NFR-SEC-*` siblings.
