# progress-photo-logging Specification

## Purpose
TBD - created by syncing change progress-photo. Update Purpose after archive.
## Requirements
### Requirement: A photo is routed to the progress flow by caption keyword or a prior /progress
The system SHALL treat an inbound photo as a **progress photo** when either (a) its caption contains a
progress keyword — Russian `прогресс`, Ukrainian `прогрес`, or English `progress` (case-insensitive) —
**or** (b) the user sent **`/progress`** shortly beforehand, which arms an ephemeral per-chat flag so
the **next** photo is read as progress. A photo meeting neither condition SHALL remain a food plate
(the existing food-photo path, unchanged). The `/progress` command SHALL also reply with a short
instruction telling the user to send the photo.

#### Scenario: A captioned photo enters the progress flow
- **WHEN** a user sends a photo whose caption contains `прогресс`, `прогрес`, or `progress`
- **THEN** the photo is processed as a progress photo (vision → observations), not logged as food

#### Scenario: /progress arms the next photo
- **WHEN** a user sends `/progress` and then sends a photo (with no progress caption) before the flag
  expires
- **THEN** the command replies with a send-your-photo instruction, and the following photo is
  processed as a progress photo

#### Scenario: An uncaptioned, unarmed photo is still a food plate
- **WHEN** a user sends a photo with no progress caption and without a preceding `/progress`
- **THEN** the photo is handled by the food-plate path (`logPhoto`), not the progress flow

### Requirement: The /progress arming flag is ephemeral and never persisted
The `/progress` arming flag SHALL live only in an in-memory, per-chat store with a **lazy TTL**
(checked on the next inbound message, no timer/cron — ADR-0019). It SHALL NOT be written to the
database or any persistent store, and it SHALL be **consumed** (read-and-removed) when the next photo
is handled so a single `/progress` arms at most one photo. An expired or absent flag SHALL leave the
photo on the food-plate path.

#### Scenario: The flag is consumed by one photo
- **WHEN** a user sends `/progress` then two photos in a row
- **THEN** only the first photo is treated as progress; the second (absent a progress caption) is a
  food plate

#### Scenario: An expired flag does not arm
- **WHEN** the arming flag's TTL has elapsed before a photo arrives
- **THEN** the photo is not treated as progress (it falls back to the food-plate path)

### Requirement: A progress photo yields qualitative observations in exactly one vision call
The system SHALL send the photo to the vision model in **exactly one** request through the shared LLM
seam (invariant #5 — no agent loop, no re-vision) and receive **qualitative text observations** in the
honest coach voice, keyed on visible markers (notably the **belly in profile**). The observations
SHALL be descriptive prose only — **never a diagnosis**, and **never a body-fat percentage or other
fabricated number** (invariant #2 — the model emits no metrics here). The system SHALL NOT issue a
second model call for a progress photo.

#### Scenario: One call produces prose observations
- **WHEN** a progress photo is processed
- **THEN** the system issues exactly one vision request and receives qualitative text observations,
  with no follow-up model round-trip

#### Scenario: No diagnosis or body-fat number
- **WHEN** the observations are produced
- **THEN** they are qualitative prose and do not assert a body-fat % or a medical/clinical diagnosis

### Requirement: Only the text observations are persisted, tenant-scoped, with no image
The system SHALL persist **only the text observations** to a `progress_notes` row carrying the acting
user's `user_id` and the user's current local date (invariant #8). The `progress_notes` table SHALL
have **no image column** and the write SHALL never include image bytes. Body/progress data is
sensitive (invariant #9): raw values SHALL NOT be logged verbosely and the row SHALL be reachable only
through the tenant-scoped path.

#### Scenario: One progress row is written for the acting user
- **WHEN** a progress photo is processed for a user
- **THEN** one `progress_notes` row is inserted with that user's `user_id`, the local date, and the
  observations text — and it is never returned to or mutated by another user

#### Scenario: The stored row holds no image
- **WHEN** a `progress_notes` row is written
- **THEN** it contains only `user_id`, `date`, `observations`, and `created_at` — no image bytes in
  any column

### Requirement: The image is never persisted
The system SHALL stream the photo bytes to the vision call and discard them immediately. It SHALL NOT
write the image to disk, object storage, or the database at any point (invariant #4). Only the
extracted text observations are persisted; the bytes live transiently in memory for the duration of
the vision call and are then released.

#### Scenario: No image bytes are written anywhere
- **WHEN** a progress photo is processed end-to-end
- **THEN** no filesystem, storage, or database write of the image bytes occurs across the full run

### Requirement: Observation prose mirrors the user's language
The observation prose SHALL mirror the user's language (invariant #6): detected from the caption when
present (Russian / Ukrainian / English). When an armed photo carries **no caption** (no language
signal), the prose SHALL default to **Russian** (the primary user base). The `progress_notes` row
stores only prose, so no structural/enum value is involved.

#### Scenario: Prose mirrors a caption's language
- **WHEN** the progress photo's caption is in Russian, Ukrainian, or English
- **THEN** the observations are produced in that language

#### Scenario: No caption defaults to Russian
- **WHEN** an armed progress photo has no caption
- **THEN** the observations are produced in Russian
