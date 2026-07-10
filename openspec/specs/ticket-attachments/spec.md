# ticket-attachments Specification

## Purpose

Photo attachments on a ticket (FR-ATTACH-01…03, NFR-STOR-01, Р-13, with
FR-ACCESS-01/NFR-SEC-03 carried through and FR-FEED-02 attachment events):
upload of JPEG/PNG/WebP images validated server-side against declared type
and magic bytes (≤ 10 MB, ≤ 10 per ticket), original bytes stored on a
configurable local disk directory (Railway Volume in prod, ADR-0003),
metadata and binaries served only through the API with owner checks, delete
with a confirmation in the SPA, add/delete recorded as system events in the
ticket feed.

## Requirements

### Requirement: Owner can upload a photo attachment to a ticket

The API SHALL let the ticket owner upload an image file (multipart) to a
ticket, storing the original bytes unmodified on the configured local disk
directory under a generated name and keeping the original file name,
MIME type and size in the database (FR-ATTACH-01, ADR-0003). Upload SHALL
be owner-scoped: a foreign or missing ticket answers in `404` style
(FR-ACCESS-01, NFR-SEC-03).

#### Scenario: Photo is attached

- **WHEN** the owner uploads a 3 MB JPEG to their ticket
- **THEN** the attachment appears in the ticket's attachment list with its original file name, and the file is persisted on disk under a generated name

#### Scenario: Foreign ticket rejects upload

- **WHEN** user Б uploads a file to a ticket of user А
- **THEN** the response is the same `404`-style error as for a nonexistent ticket and no file is stored

### Requirement: Upload validation enforces type, size and count limits

The API SHALL reject uploads that are not JPEG/PNG/WebP, exceed 10 MB, or
would exceed 10 attachments on the ticket, with `400`-style errors in the
locale-free `{ code, message }` contract (FR-ATTACH-01, Р-13: HEIC and all
other types are rejected). Type validation SHALL check both the declared
MIME type and the file's magic bytes — a mismatching payload is rejected
even with an accepted declared type. Validation SHALL happen server-side
before the file is persisted; nothing is written to disk or the database
for a rejected upload.

#### Scenario: Unsupported type is rejected

- **WHEN** the owner uploads a PDF or a HEIC photo
- **THEN** the response is a `400`-style `ATTACHMENT_TYPE_INVALID` error and nothing is stored

#### Scenario: Spoofed content type is rejected

- **WHEN** the owner uploads a file declared as `image/jpeg` whose bytes are not a JPEG
- **THEN** the response is a `400`-style `ATTACHMENT_TYPE_INVALID` error and nothing is stored

#### Scenario: Oversized file is rejected

- **WHEN** the owner uploads a 12 MB JPEG
- **THEN** the response is a `400`-style `ATTACHMENT_TOO_LARGE` error and nothing is stored

#### Scenario: Eleventh attachment is rejected

- **WHEN** the owner uploads a valid photo to a ticket that already has 10 attachments
- **THEN** the response is a `400`-style `ATTACHMENT_LIMIT_REACHED` error and nothing is stored

### Requirement: Attachments are listed and served only through the API with owner checks

The API SHALL provide the ticket's attachment metadata list (id, original
file name, MIME type, size, created date-time) and the attachment binary
(streamed inline with the stored MIME type and original file name) only to
the ticket owner; a foreign or missing ticket, attachment, or a missing
disk file all answer in the same `404` style (FR-ATTACH-03, FR-ACCESS-01,
NFR-SEC-03). There SHALL be no public static route to the storage
directory; the generated on-disk name SHALL never appear in API responses.

#### Scenario: Owner reads metadata and binary

- **WHEN** the owner requests the attachment list and then one attachment's binary
- **THEN** the list carries original names and sizes, and the binary response streams the original bytes with the stored MIME type

#### Scenario: Foreign attachment URL is invisible

- **WHEN** user Б requests the binary of an attachment on a ticket of user А by its direct URL
- **THEN** the response is the same `404`-style error as for a nonexistent attachment

#### Scenario: Missing disk file does not leak storage details

- **WHEN** the owner requests an attachment whose file is absent from the disk
- **THEN** the response is the same `404`-style error, with no storage paths or internal details in the body

### Requirement: Owner can delete an attachment

The API SHALL let the ticket owner delete an attachment, removing the
database row and the file on disk (FR-ATTACH-02); deletion is owner-scoped
with `404`-parity for foreign or missing objects (FR-ACCESS-01).

#### Scenario: Attachment is deleted

- **WHEN** the owner deletes an attachment
- **THEN** it disappears from the attachment list and its binary URL answers in `404` style

### Requirement: Attachment changes are recorded as feed system events

Adding an attachment and deleting an attachment SHALL each append a system
event to the ticket's feed (FR-FEED-02), in the same transaction as the
attachment change, using the existing locale-free event snapshot contract
with the original file name as the value; the SPA renders the Ukrainian
sentence.

#### Scenario: Upload produces a feed event

- **WHEN** the owner uploads a photo
- **THEN** the feed gains a system event recording the added file's original name, author and date-time

#### Scenario: Delete produces a feed event

- **WHEN** the owner deletes an attachment
- **THEN** the feed gains a system event recording the removed file's original name

### Requirement: Files persist on a configurable local directory

The storage directory SHALL be configured by an environment variable; in
production the application SHALL fail fast at startup when it is not set
(NFR-STOR-01, ADR-0003/0005), and in development it SHALL default to a
git-ignored local folder created automatically. Files SHALL survive a
redeploy when the directory is a persistent volume (Railway Volume, single
instance).

#### Scenario: Production without storage configuration does not start

- **WHEN** the application starts in production without the storage directory variable
- **THEN** startup fails fast with a clear error and the previous deployment stays live

#### Scenario: Attachments survive a redeploy

- **WHEN** the application is redeployed with the same volume mounted and the owner opens the ticket card
- **THEN** previously uploaded photos are still listed and their binaries load

### Requirement: SPA shows attachments in the ticket card

The ticket card SHALL render an attachments section (mobile-first,
NFR-COMPAT-01): thumbnails of the ticket's photos, a full-size view, an
upload control limited to JPEG/PNG/WebP via the file input's `accept`
filter, and deletion with a confirmation step (FR-ATTACH-02). Validation
and API errors SHALL be shown as understandable Ukrainian messages mapped
from the locale-free codes (S-02 D6 contract).

#### Scenario: Thumbnail opens full size

- **WHEN** the owner opens the card of a ticket with photos and taps a thumbnail
- **THEN** the photo opens in full size

#### Scenario: Upload from the card

- **WHEN** the owner picks a photo through the card's upload control
- **THEN** the new thumbnail appears in the card without a manual reload, and the feed shows the system event

#### Scenario: Rejected upload shows an understandable message

- **WHEN** the owner picks a file the API rejects (type or size)
- **THEN** an understandable Ukrainian error message is shown and the attachment list stays unchanged

#### Scenario: Delete asks for confirmation

- **WHEN** the owner taps delete on an attachment and confirms
- **THEN** the thumbnail disappears from the card; cancelling keeps it
