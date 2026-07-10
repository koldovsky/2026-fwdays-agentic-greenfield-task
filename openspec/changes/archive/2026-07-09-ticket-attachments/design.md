## Context

S-04…S-06 delivered the ticket entity, card, lifecycle, feed and list. The
ticket card has no attachments section; the API has no file handling and no
`attachment` table. ADR-0003 fixes the storage approach: local disk
(Railway Volume in prod), original file kept as-is, generated name on disk,
original name in the DB, serving only through the API with an owner check.
Р-13 (PRD v1.4) fixes the accepted types: JPEG/PNG/WebP, HEIC rejected.

Existing idioms this design must follow:

- Owner scoping on every query, 404-parity for foreign/missing ids
  (FR-ACCESS-01; houses/tickets idiom — lookup by `id + userId`).
- Locale-free `{ code, message }` error contract (S-02 D6,
  `ticket-errors.ts`); the SPA maps codes to Ukrainian copy.
- System events are locale-free snapshots in `ticket_feed_item`
  (`field` + `old_value`/`new_value`); the SPA composes the Ukrainian
  sentences (S-05).
- Env config resolved once at DI bootstrap with fail-fast validation
  (`auth-config.ts` precedent, ADR-0004/0005).
- Web: ADR-0009 — zoneless + OnPush, container/presentational, signals +
  facade, Material tokens only.

## Goals / Non-Goals

**Goals:**

- Upload/view/delete photos on a ticket with backend validation of type,
  size and count (FR-ATTACH-01, Р-13) and system events in the feed
  (FR-FEED-02).
- Files on a configurable local directory (Railway Volume in prod), served
  exclusively through the API with owner checks (FR-ATTACH-03, NFR-STOR-01,
  NFR-SEC-03).
- Mobile-first attachments UI in the existing ticket card
  (NFR-COMPAT-01).

**Non-Goals:**

- Server-side image processing (resize/thumbnails/EXIF) — «мініатюра» is
  the original image scaled by CSS; acceptable at POC volumes (десятки
  фото, NFR-PERF-01).
- HEIC in any form; non-image types; S3; multi-instance serving; volume
  backup (accepted risks, ADR-0003/NFR-REL-01).

## Decisions

### D1. Endpoints nested under the ticket

All routes live in a new `attachments` module but keep the ticket in the
path — ownership is always checked through the ticket first
(`ticket.id + userId` lookup, 404-parity), then the attachment through
`attachment.id + ticketId`:

```
POST   /api/tickets/:id/attachments                  multipart upload (field `file`)
GET    /api/tickets/:id/attachments                  metadata list
GET    /api/tickets/:id/attachments/:attachmentId    binary (inline)
DELETE /api/tickets/:id/attachments/:attachmentId    delete
```

The metadata list is a separate endpoint mirroring `GET :id/feed` — the
card DTO stays untouched and the SPA facade refetches the list after
upload/delete. _Alternative:_ embed attachments in the card DTO — rejected:
bloats an existing contract and forces a full card refetch per upload.

Metadata DTO: `{ id, fileName, mimeType, size, createdAt }` — `fileName` is
the original name; the stored disk name never leaves the API.

### D2. `attachment` table

```prisma
model Attachment {
  id         BigInt   @id @default(autoincrement())
  ticketId   BigInt   @map("ticket_id")
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  fileName   String   @map("file_name") @db.VarChar(255)   // original name
  storedName String   @unique @map("stored_name") @db.VarChar(64) // generated disk name
  mimeType   String   @map("mime_type") @db.VarChar(32)
  size       Int
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([ticketId])
  @@map("attachment")
}
```

No `userId` column — ownership is derived through the ticket (single
source, no denormalized copy to drift). `onDelete: Cascade` keeps rows
consistent if a ticket is ever deleted; disk files have no such hook —
acceptable POC orphan risk (tickets have no delete API today).

### D3. Storage: `ATTACHMENTS_DIR` env, memory-buffered upload, UUID names

- New `attachments-config.ts` per the `auth-config.ts` idiom: production
  requires `ATTACHMENTS_DIR` (fail-fast at bootstrap); dev defaults to
  `.data/attachments` (git-ignored). The directory is created on startup
  (`mkdir -p` semantics) so a fresh clone works with zero setup.
- Upload uses multer **memory storage** (bundled with
  `@nestjs/platform-express`) with a 10 MB limit: the buffer is validated
  (D4) _before_ anything touches the disk, so no temp-file cleanup path
  exists. 10 MB × single instance × POC traffic is a safe memory envelope.
  _Alternative:_ multer disk storage — rejected: writes before validation
  and needs cleanup on every reject path.
- Disk name: `randomUUID()` + extension derived from the validated MIME
  type, flat in `ATTACHMENTS_DIR`. Write file first, then the DB row + feed
  event in one transaction; unlink the file if the transaction fails.

### D4. Validation: declared MIME + magic bytes, limits server-side

`400`-style errors in the `{ code, message }` contract:

- `ATTACHMENT_TYPE_INVALID` — declared `Content-Type` not one of
  `image/jpeg | image/png | image/webp`, **or** the buffer's magic bytes
  don't match that type (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP
  `RIFF….WEBP`). Sniffing is ~10 lines, no dependency, and stops
  content-type spoofing (NFR-SEC-03 hygiene) — a renamed PDF is rejected
  even with a forged header.
- `ATTACHMENT_TOO_LARGE` — multer's 10 MB limit error mapped to the
  contract (FR-ATTACH-01).
- `ATTACHMENT_LIMIT_REACHED` — service counts existing rows for the ticket;
  ≥ 10 rejects the upload (FR-ATTACH-01).
- `ATTACHMENT_FILE_REQUIRED` — multipart without a `file` part.

### D5. Feed events reuse the `field` snapshot model

`TicketEventField` gains an `ATTACHMENT` value. Add → `oldValue = null`,
`newValue = <original fileName>`; delete → `oldValue = <fileName>`,
`newValue = null`. The SPA composes «Додано фото …» / «Видалено фото …»
from the same locale-free event contract it already renders — no new event
shape, one enum migration. _Alternative:_ a new feed-item kind — rejected:
duplicates the event pipeline for no behavioral gain.

### D6. Serving: streamed inline response

`GET …/:attachmentId` streams the file (`StreamableFile`) with
`Content-Type` from the DB row and
`Content-Disposition: inline; filename*=UTF-8''<encoded original name>`
(RFC 5987 — original names may be Cyrillic). Missing DB row, foreign ticket
**or a missing disk file** all answer the same `404`-style
`ATTACHMENT_NOT_FOUND` (a disk/DB mismatch is logged server-side but must
not leak storage details). `Cache-Control: private, max-age=3600` —
attachments are immutable (no re-upload/rename API), so the browser may
cache thumbnails within a session, but only privately (owner-scoped data).

### D7. Web: attachments section in the ticket card

Per ADR-0009: `ticket-attachments` presentational component (thumbnail
grid + upload button + delete affordance) fed by the ticket facade;
full-size view is a Material dialog showing the same URL. `<img>` tags
point at the binary endpoint directly — the session cookie is httpOnly and
same-origin, so plain image requests are authenticated as-is. The file
input carries `accept="image/jpeg,image/png,image/webp"` and `multiple`
(files upload sequentially; first failure shows the mapped Ukrainian error
and stops). Client-side pre-checks (type/size/count) give instant feedback;
the API remains the enforcement point (NFR-SEC-02 idiom). Delete asks for
confirmation (reuse the houses confirm-dialog).

## Risks / Trade-offs

- [Upload count race: two parallel uploads can pass the ≤10 check together]
  → accepted for POC (single user per workspace, single instance); noted,
  not engineered around.
- [10 MB in memory per in-flight upload] → bounded by single-instance POC
  traffic; multer rejects oversize before buffering past the limit.
- [Orphan files if the process dies between file write and DB commit] →
  write-then-insert order means orphans are invisible-but-harmless disk
  noise; acceptable (ADR-0003 already accepts volume loss).
- [CSS-scaled originals on the card can be heavy on slow mobile links] →
  POC volumes are десятки фото per ticket ≤10; `loading="lazy"` on
  thumbnails mitigates; real thumbnails are an explicit non-goal.
- [`Cache-Control: private` still leaves copies in the browser cache after
  logout] → same trust boundary as the httpOnly session on a shared
  device; accepted.

## Migration Plan

1. Prisma migration: `attachment` table + `ATTACHMENT` enum value —
   additive, no data backfill, safe on prod.
2. Railway: mount the Volume (provisioned in S-01) into the service and set
   `ATTACHMENTS_DIR` to the mount path via `railway variables --set`
   (staged-dashboard-variables pitfall noted in CLAUDE.md). Deploy fails
   fast if the variable is missing in production — previous deployment
   stays live (ADR-0005 behavior).
3. Rollback: revert the commits; the table and files are unreferenced but
   harmless.

## Open Questions

_None — В-02 (HEIC) was the only open product question and is closed by
Р-13._
