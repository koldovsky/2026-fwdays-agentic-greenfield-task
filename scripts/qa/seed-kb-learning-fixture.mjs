// scripts/qa/seed-kb-learning-fixture.mjs — kb-learning S5 rendered-UI gate
// fixture seeder (tasks.md §G.1). Mirrors
// `scripts/qa/seed-dashboard-fixture.mjs`'s `<mode> <dbPath>` CLI shape and
// `scripts/qa/seed-booking-hitl-fixture.mjs`'s `@kamerton/db`-only, no-HTTP
// seeding style.
//
// `mode === "empty"`: schema only, zero `questions` rows — proves the
// Question-inbox panel's explicit EmptyState (never a blank area, FR-KB-02).
//
// `mode === "populated"`: one lead + one request, backing FOUR `questions`
// rows so a single render of the panel shows every reachable inbox state at
// once (design.md Decision 2's own "visibility rule", `packages/db/src/
// questions.ts`'s `findOpenInboxQuestions`):
//   - OPEN unanswered  → the normal inbox item with a real answer form
//     (`answer_source='unanswered'`, `status='open'`, `delivery_status`
//     stays the column DEFAULT `'pending'` — irrelevant while `status` is
//     `'open'`).
//   - ANSWERED + delivery FAILED → the visually-distinct failed row: a
//     retry action, NO answer form (`@trace FR-KB-04`).
//   - ANSWERED + delivery PENDING (i.e. "sending…") → the review-gate Fix 2
//     "⏳ надсилається…" indicator: NO form, NO retry action.
//   - `answer_source='kb'` (auto-answered, never surfaced for admin review)
//     → MUST be excluded from `findOpenInboxQuestions`'s result — proves the
//     inbox's exclusion rule, not just its inclusion rules.
//
// Usage: node scripts/qa/seed-kb-learning-fixture.mjs <empty|populated> <dbPath>

import {
  openDatabase,
  insertLead,
  insertRequest,
  insertQuestion,
  markQuestionAnswered,
  markQuestionDeliveryStatus,
} from "@kamerton/db";

const [, , mode, dbPath] = process.argv;

if (mode !== "empty" && mode !== "populated") {
  console.error(`usage: node scripts/qa/seed-kb-learning-fixture.mjs <empty|populated> <dbPath>`);
  process.exit(1);
}
if (!dbPath) {
  console.error(`usage: node scripts/qa/seed-kb-learning-fixture.mjs <empty|populated> <dbPath>`);
  process.exit(1);
}

const db = openDatabase(dbPath);

if (mode === "populated") {
  const lead = insertLead(db, {
    telegramUserId: "qa-kb-learning-user-1",
    telegramChatId: "qa-kb-learning-chat-1",
    telegramDisplayName: "Оксана (QA fixture)",
  });

  const request = insertRequest(db, {
    leadId: lead.id,
    telegramChatId: lead.telegram_chat_id,
  });

  // OPEN — the normal inbox item, real answer form.
  const openQuestion = insertQuestion(db, {
    leadId: lead.id,
    requestId: request.id,
    telegramChatId: lead.telegram_chat_id,
    text: "Скільки коштує одне заняття для дорослого?",
    answerSource: "unanswered",
  });

  // ANSWERED + FAILED — visually distinct, retry action, no form.
  const failedQuestion = insertQuestion(db, {
    leadId: lead.id,
    requestId: request.id,
    telegramChatId: lead.telegram_chat_id,
    text: "Чи можна перенести заняття на вихідні?",
    answerSource: "unanswered",
  });
  const failedAnswered = markQuestionAnswered(
    db,
    failedQuestion.id,
    "Так, заняття у вихідні можливі за окремою домовленістю з викладачкою.",
  );
  if (failedAnswered !== 1) throw new Error("expected markQuestionAnswered to change exactly one row (failed fixture)");
  const failedDelivery = markQuestionDeliveryStatus(db, failedQuestion.id, "failed");
  if (failedDelivery !== 1) throw new Error("expected markQuestionDeliveryStatus to change exactly one row (failed fixture)");

  // ANSWERED + PENDING delivery ("sending…") — no form, no retry.
  const sendingQuestion = insertQuestion(db, {
    leadId: lead.id,
    requestId: request.id,
    telegramChatId: lead.telegram_chat_id,
    text: "Чи є групові заняття для підлітків?",
    answerSource: "unanswered",
  });
  const sendingAnswered = markQuestionAnswered(
    db,
    sendingQuestion.id,
    "Так, у нас є групи для підлітків 13-16 років, до 5 осіб у групі.",
  );
  if (sendingAnswered !== 1) throw new Error("expected markQuestionAnswered to change exactly one row (sending fixture)");
  // delivery_status stays the column DEFAULT ('pending') — no further call
  // needed; asserted explicitly below so a future DEFAULT change fails loud.

  // answer_source='kb' — must NEVER render in the inbox (proves exclusion).
  const kbQuestion = insertQuestion(db, {
    leadId: lead.id,
    requestId: request.id,
    telegramChatId: lead.telegram_chat_id,
    text: "Скільки триває одне заняття?",
    answerSource: "kb",
  });

  console.log(`seeded kb-learning fixture (populated) at ${dbPath}`);
  console.log(`  lead.id=${lead.id} request.id=${request.id}`);
  console.log(`  open question.id=${openQuestion.id}`);
  console.log(`  failed question.id=${failedQuestion.id}`);
  console.log(`  sending question.id=${sendingQuestion.id}`);
  console.log(`  kb (excluded) question.id=${kbQuestion.id}`);
} else {
  console.log(`seeded kb-learning fixture (empty) at ${dbPath} — schema only, zero questions rows`);
}

db.close();
