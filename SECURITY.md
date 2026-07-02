# Security Policy

Vouch handles sensitive personal data (résumé text, job descriptions, account
credentials — see `NFR-SEC-01/02`, `NFR-GDPR-01/02` in
[`docs/cv-agent-requirements.md`](docs/cv-agent-requirements.md)). We take
security reports seriously and appreciate responsible disclosure.

## Supported versions

This is a greenfield project developed on a single `main` branch with no
released version line yet. Security fixes land on `main`; there are no older
branches receiving patches.

| Version | Supported |
| ------- | --------- |
| `main`  | Yes       |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately using one of these channels, in order of preference:

1. **GitHub Security Advisories** (preferred): open a
   [private security advisory](https://github.com/romanr460/2026-fwdays-agentic-greenfield-task/security/advisories/new)
   for this repository. This keeps the report private until a fix ships and
   lets us collaborate with you directly through GitHub.
2. **Email**: [rromanko15@gmail.com](mailto:rromanko15@gmail.com). Please
   include:
   - A description of the vulnerability and its potential impact
   - Steps to reproduce (a proof-of-concept is very helpful)
   - Any affected files, routes, or requirement IDs you can identify
   - Your assessment of severity, if you have one

We will acknowledge your report within **3 business days** and aim to provide
an initial assessment (validity + rough timeline) within **7 business days**.
We'll keep you updated as a fix is developed and will credit you in the fix's
changelog/commit unless you prefer to remain anonymous.

## Scope

In scope:

- The Next.js application in this repository (`src/`), including
  authentication (`src/app/auth.ts`, `/api/auth/*`), the tailoring pipeline
  (`/api/tailor`, `features/run-tailoring`), and data-handling code
  (`shared/lib/crypto`, `shared/lib/db`, `shared/lib/account`).
- Infrastructure-as-code and dev tooling in this repo (migrations, Docker
  specs) if the issue would carry over to a real deployment.

Out of scope:

- Third-party services we depend on (Anthropic API, hosting providers) —
  report those directly to the vendor.
- Findings that require physical access to a user's device, or that rely
  solely on social engineering.
- Denial-of-service reports based purely on volumetric load.

## Disclosure policy

We ask that you give us a reasonable window to investigate and remediate
before any public disclosure — 90 days from your initial report, or sooner if
we confirm a fix has shipped. We will not pursue legal action against
good-faith security research that respects this policy and does not access,
modify, or exfiltrate data beyond what is needed to demonstrate the issue.
