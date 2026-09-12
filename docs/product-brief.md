# Ticket2MD — Product Brief

> Working name `Ticket2MD` has status `proposed`; the toolbar icon reads "md".

## What it is

A Chrome extension that exports the currently open Jira ticket into a clean Markdown folder on the user's machine. One click in the toolbar popup produces a self-contained folder: a `.md` file with the full ticket content and a `media/` subfolder with every attachment the extension could reach.

Everything happens locally in the browser. No servers, no third-party services, no telemetry.

## Target user

A single persona: an engineer, QA, or analyst who needs a portable, offline, tracker-independent copy of a ticket — to archive it, paste it into documentation or an Obsidian vault, attach it to a report, or feed it to an LLM without granting the tool tracker access.

There are no accounts, roles, or profiles. Anyone with the extension installed and a ticket open is a full user.

## Core problem solved

Tickets live behind tracker logins and custom UIs. Copy-pasting a ticket by hand loses structure, comments, and attachments, and leaks personal names when shared outside the team. MCP servers and tracker APIs exist, but they require tokens, network access, and setup. This extension needs none of that: it reads what is already rendered in the open tab and converts it locally.

## Key features (MVP)

- **Ticket detection.** Recognizes an open Jira ticket page in the active tab.
- **One-click export.** Toolbar popup with a single Export button; the result lands in the Downloads folder as `TICKET-ID/`, containing `TICKET-ID-<title>.md` and `media/`.
- **Full content capture.** Everything the ticket contains: title, key fields, description, checklists, links, comments, and attachments.
- **DOM-first extraction.** Data is read from the rendered page, not from tracker APIs — no tokens, works with whatever the user can already see. Attachments are pulled best-effort; a failed media download is reported but never aborts the Markdown export.
- **Anonymization by default.** First and last names in ticket text, comments, and media file names are replaced with `User1`, `User2`, … (consistent within one export). A checkbox in the popup, enabled by default, controls this.
- **Ordered media.** Attachments are saved as `01-name.ext`, `02-name.ext`, … preserving the order they appear in the ticket.

## Verification

- **Unit tests.** Vitest covers the framework-free `lib/` — DOM parsers, Markdown serializer, anonymizer — against static ticket-page fixtures.
- **E2E tests.** Playwright drives a real Chrome instance with the unpacked extension loaded: opens the popup, walks all four states (idle/progress/success/error), and verifies the exported folder/media on disk against a live reference ticket ([ROVODEV-36](https://jira.atlassian.com/browse/ROVODEV-36)).

## Operating constraints

- **Privacy.** No analytics, tracking, fingerprinting, or third-party requests. The only network activity is downloading attachments from the tracker's own storage — the same hosts the open page already talks to. All conversion is local.
- **Cost.** Zero paid APIs, zero backend. The extension is a static bundle.
- **Language.** English-only UI.
- **Distribution.** Unpacked extension is sufficient for the demo; Chrome Web Store publication is out of scope.
- **Degradation.** Failures stay visible and specific: the popup error state names what broke (for example, which attachments could not be fetched) instead of failing silently.

## Out of scope (MVP)

Trackers other than Jira (Azure DevOps is a post-MVP candidate), Firefox and other browsers, export formats other than Markdown (PDF, HTML), user-editable export templates, two-way sync back to the tracker, bulk/board export, tracker API or MCP integration.
