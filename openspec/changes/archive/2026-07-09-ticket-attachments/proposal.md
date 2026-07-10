## Why

Slice **S-07 «Фото-вкладення»** (Е-6) from `docs/mvp-capability-plan.md`.
After S-04…S-06 a ticket carries its full attribute set, lifecycle and feed,
but a resident's problem is usually best shown, not described — there is no
way to attach a photo. This slice lets the owner attach photos to a ticket,
view them (thumbnails + full size) and delete them, with files persisted on
the Railway Volume and reachable only through the API with an owner check.

Covers **FR-ATTACH-01…03, NFR-STOR-01** (PRD §7.7, §8), plus the attachment
half of FR-FEED-02 (add/delete system events) and the cross-cutting
FR-ACCESS-01/NFR-SEC-03 isolation for the new object type.

Closes **В-02 (HEIC)** per **Р-13** (user decision 2026-07-09, PRD v1.4):
accepted types are **JPEG/PNG/WebP only** — HEIC is rejected with a clear
validation error; iPhone Safari transparently converts HEIC→JPEG when
uploading through an `accept`-filtered file input, and server-side
conversion would add complexity against BC-PRIN-01.

## What Changes

- New attachment endpoints in the API: upload (multipart) with backend
  validation of type (JPEG/PNG/WebP), size (≤ 10 MB per file) and count
  (≤ 10 per ticket) per FR-ATTACH-01/Р-13; binary download; delete.
- Files are stored on local disk under a directory configured by an env
  variable (Railway Volume in prod, plain folder locally — ADR-0003,
  NFR-STOR-01): generated name on disk, original name in the DB, original
  bytes kept (no resize/EXIF processing).
- Attachment binaries are served **only through the API** with an owner
  check — foreign or missing attachments answer in `404` style
  (FR-ATTACH-03, FR-ACCESS-01, NFR-SEC-03); no public static serving.
- Adding and deleting an attachment appends a **system event** to the
  ticket's feed (FR-FEED-02) using the existing locale-free event contract.
- New DB entity `attachment` (ticket FK, stored/original names, MIME type,
  size, timestamps).
- Ticket card (SPA, mobile-first): attachments section with thumbnails,
  full-size view, upload action with client-side `accept` filter and
  Ukrainian validation/error copy, delete with confirmation.

## Capabilities

### New Capabilities

- `ticket-attachments`: photo attachments on a ticket — upload with
  type/size/count validation (FR-ATTACH-01, Р-13), viewing thumbnails and
  full size plus deletion in the card (FR-ATTACH-02), storage on local
  disk/Railway Volume with API-only owner-checked serving (FR-ATTACH-03,
  NFR-STOR-01, NFR-SEC-03), add/delete system events in the ticket feed
  (FR-FEED-02).

### Modified Capabilities

_None._ The feed mechanics (append-only, chronological, visually distinct
items — `ticket-feed`) are unchanged; attachment events are new event
emitters specified in `ticket-attachments` and reuse the existing system
event contract. `ticket-crud`'s "no attachment UI in this capability"
statement scopes that capability only and needs no delta.

## Impact

- **API** (`api/`): new `attachments` module (controller + service) wired
  into the existing guard/ownership pattern; multipart handling for upload;
  streamed binary responses for download. Errors stay in the locale-free
  `{ code, message }` contract (S-02 D6). New env variable for the storage
  root (validated at startup like the existing config).
- **DB** (Prisma): one migration adding the `attachment` table; a new
  `TicketEventField` value (or equivalent) for attachment system events.
- **Web** (`web/`): attachments section in the ticket card
  (container/presentational per ADR-0009, signals + facade); upload,
  thumbnail grid, full-size dialog, delete; Ukrainian copy mapped from API
  codes.
- **Infra**: Railway Volume mount + env variable on prod; local folder is
  git-ignored. Docker image unchanged in shape (single container,
  ADR-0002).
- **Tests**: api unit + api-e2e for validation limits, owner isolation
  (404-style), feed events, delete; web unit for the facade; Playwright for
  the S-07 acceptance scenarios.

## Non-goals

- Image processing: no resize, no thumbnails generation, no EXIF handling —
  the original file is stored and served as-is (plan §S-07 non-goals);
  «мініатюра» is the original image rendered small by CSS.
- HEIC acceptance or conversion (Р-13) and any non-image types.
- S3 or any external storage (ADR-0003); multi-instance serving
  (NFR-STOR-01 fixes a single instance).
- Backup of the volume — loss of files with the volume is an accepted POC
  risk (NFR-REL-01).
