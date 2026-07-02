# Sport & Nutrition Coach

The ubiquitous language for the Telegram bot that acts as a personal cutting coach: it logs food
and body data, keeps an authoritative store, and writes honest reviews.

This file is a **glossary, nothing else** — what each term *is*, and which synonyms to avoid. The
*how* (data model, stack, flows) lives in [docs/requirements.md](./docs/requirements.md); the *why*
behind decisions lives in [docs/adr/](./docs/adr/).

## Coaching frame

**Cutting**:
Losing fat while preserving muscle — the user's whole objective and the bot's coaching stance.
_Avoid_: dieting, weight loss (plain weight loss ignores the muscle-preservation point).

**Goal**:
A user's chosen objective that drives their target calculation — one of `cut`, `maintain`,
`lean-bulk`.
_Avoid_: plan, mode.

**Targets**:
A user's daily calorie and macro goals, computed once at onboarding from their body data.
_Avoid_: limits, budget, allowance.

**Macros**:
The tracked nutrients — protein, fat, carbs — alongside calories (kcal). The unit of both Targets
and every Food Entry.
_Avoid_: nutrients, stats.

**Review**:
An honest coaching verdict for a period — Daily, Weekly, or Monthly — with a concrete next action.
Its numbers are computed from the logged data; only its prose is written by the model.
_Avoid_: summary, report, recap, digest.

**Coaching Voice**:
The bot's single honest persona across every reply — blunt-factual about energy balance and
trade-offs ("pizza won't make you thinner"), never moralizing about food (no good/bad foods, guilt,
or shame) and always mirroring the user's language. The same voice in logging and in a Review.
_Avoid_: tone, personality, cheerleader.

## Food logging

**Food Database**:
The shared reference list of foods with known macros, plus per-user additions. A match against it
is what makes a Food Entry a Fact.
_Avoid_: catalog, food DB, fooddb.

**Food Entry**:
One logged food item a user consumed on a date — its name, quantity, Macros, and Source. The atomic
unit of logging.
_Avoid_: log entry, record, meal (a meal is the slot, not the item).

**Food Log**:
The collection of a user's Food Entries — their per-user, per-day consumed record. Totals come from
the logged entries, never re-read from chat.
_Avoid_: diary, journal, history.

**Meal**:
The slot a Food Entry belongs to — `breakfast`, `lunch`, `dinner`, `snack` — inferred when unstated.
A grouping of entries, not an entry itself.
_Avoid_: using "meal" to mean a single Food Entry.

**Source** (**Fact** / **Estimate**):
The trust tag every Food Entry carries. **Fact** — macros taken from a Food Database match **or a
Nutrition Label the user provided**. **Estimate** — macros inferred from text or a photo, honest to
±20–30%. The Estimate tag is the pressure-release valve that lets the bot log confidently instead of
interrogating the user.
_Avoid_: guess, approximation, assumption (the tag value is *estimate*).

## Body & progress

**Body Metric**:
A quantitative body measurement on a date — weight and tape measures (waist, chest, hips, bicep,
thigh). Diffed against the most recent prior entry (trend), not against the start.
_Avoid_: measurement (as a standalone term), stat, reading.

**Progress Note**:
Qualitative text observations drawn from a body photo (key marker: belly in profile). Not a
measurement and not a body-fat number. The photo that produced it is never stored.
_Avoid_: progress report, body-fat reading, assessment.

**Plate Photo**:
A photo of a plate of food, identified visually and streamed to vision to produce Food Entries, then
discarded. Distinct from a Nutrition Label (a printed macro table) and from a Progress Photo.
_Avoid_: food pic, meal photo.

**Nutrition Label**:
A photo of a product's printed nutrition-facts / КБЖУ table. Its macros are read as exact numbers, so
the resulting Food Entry is a **Fact** (not an Estimate), overriding a Food Database match for that
product. A kind of food photo, distinct from a Plate Photo.
_Avoid_: nutrition table, КБЖУ photo, packaging shot.

**Media Group**:
Several photos the user sends as one Telegram message (plates and/or Nutrition Labels), with a single
caption. It is one logging event → one vision call → one confirmation, never several. A lone photo is
the degenerate one-photo case.
_Avoid_: album, batch, gallery, multi-upload.

**Progress Photo**:
A photo of the user's body, streamed to vision to produce a Progress Note, then discarded. Distinct
from a Plate Photo.
_Avoid_: body pic, selfie.

## Conversation

**Intent**:
The single classification the bot assigns to every inbound message — one of `log`, `query`,
`metric`, `review_trigger`, `correction`, `answer`. Routing is driven by Intent, not by commands.
_Avoid_: command, action, message type.

**Open Question**:
An ephemeral, per-user clarification the bot raised because something materially changes macros and
can't be resolved confidently. The next message answers it; it expires in minutes. Nothing else from
the conversation is remembered.
_Avoid_: prompt, follow-up, pending message.

## People & data

**User**:
Anyone the bot coaches, identified by their Telegram chat — the chat *is* the auth. Every domain
record belongs to exactly one user.
_Avoid_: client, customer, account.

**Owner**:
The single User who hosts the bot and owns the connected Notion workspace; today the only User with
the Mirror enabled.
_Avoid_: admin, super-user.

**Source of Truth**:
The authoritative store (Postgres). Every answer and total comes from it — never reconstructed from
chat history.
_Avoid_: primary DB, master.

**Mirror**:
The best-effort, asynchronous copy of a User's data into their own Notion workspace. It never blocks
the bot and is never authoritative — losing a Mirror write loses nothing.
_Avoid_: sync, backup (the backup is the separate database dump).

**Sync Job**:
One pending unit of Mirror work — enqueued the moment a Postgres write commits, then drained
independently of the reply. It is retried on failure and, once it has exhausted its attempts, parked
(dead) rather than lost; the source row stays safe in the Source of Truth regardless.
_Avoid_: task, queue item, message (those are the plumbing, not the domain unit).
