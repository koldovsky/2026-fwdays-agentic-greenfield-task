// @trace FR-AI-01 FR-AI-02 FR-AI-03 FR-AI-04 FR-AI-05 FR-AI-06 FR-AI-07 FR-AI-09 TC-AI-04 TC-VALID-01 BC-PRIVACY-04 NFR-SEC-01 NFR-OBS-01

import { z } from "zod";
import { db } from "@/lib/db";
import { uk } from "@/lib/i18n/uk";
import { tokenBoundarySchema } from "../schemas";
import { snapshotSchema, type TemplateSnapshot } from "@/lib/cycles/snapshot";
import { isResponseComplete } from "@/lib/cycles/status";
import { isValidAnchorValue } from "@/lib/schemas/answer";
import { getAiEnv } from "@/lib/ai/env";
import { recordUsage } from "@/lib/ai/record-usage";
import { judgeReply } from "@/lib/ai/interview/judge";
import { streamInterviewerReply } from "@/lib/ai/interview/interviewer";
import { mapReplyToAnchor } from "@/lib/ai/interview/scale";
import { decideTurn } from "@/lib/ai/interview/turn";
import { MAX_RESPONDENT_MESSAGE_CHARS } from "@/lib/ai/interview/config";
import {
  interviewTranscriptSchema,
  clampMessage,
  followupsUsed,
  priorReplies,
  bestAvailableText,
  nextInterviewQuestionId,
  hasAskedQuestion,
  type InterviewMessage,
} from "@/lib/ai/interview/transcript";
import type { InterviewerTurn } from "@/lib/ai/interview/prompts";

// Node runtime: this handler uses Prisma and the Anthropic SDK, not the edge
// runtime. Streaming is plain server-side HTTP (TC-AI-04, no WebSockets).
export const runtime = "nodejs";

const t = uk.respondent;

const bodySchema = z.object({
  // Optional: a greeting/ask turn carries no reply. Hard cap bounds request
  // size; the prompt-facing text is further clamped by pure lib logic.
  message: z.string().max(MAX_RESPONDENT_MESSAGE_CHARS * 2).optional(),
});

type SnapshotQuestion = TemplateSnapshot["questions"][number];

function calm(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Flatten Answer rows into the Record shape isResponseComplete expects. */
function toAnswersRecord(
  rows: ReadonlyArray<{ questionId: string; scaleValue: number | null; text: string | null }>,
): Record<string, number | string> {
  const record: Record<string, number | string> = {};
  for (const row of rows) {
    if (row.scaleValue !== null) record[row.questionId] = row.scaleValue;
    else if (row.text !== null) record[row.questionId] = row.text;
  }
  return record;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  // AI env first: a missing key degrades calmly with no DB or model work.
  let aiEnv;
  try {
    aiEnv = getAiEnv();
  } catch {
    return calm(t.interviewUnavailable, 503);
  }

  const { token: rawToken } = await params;
  const tokenResult = tokenBoundarySchema.safeParse(rawToken);
  if (!tokenResult.success) return calm(t.notFound, 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return calm(t.interviewError, 400);
  }
  const bodyResult = bodySchema.safeParse(body);
  if (!bodyResult.success) return calm(t.interviewError, 400);

  // Resolve the token to a single collecting interview-mode cycle. Any other
  // state declines calmly with no model call and no data about other cycles.
  const cycle = await db.cycle.findUnique({
    where: { token: tokenResult.data },
    select: {
      id: true,
      status: true,
      mode: true,
      templateSnapshot: true,
      subject: { select: { fullName: true } },
    },
  });
  if (cycle === null) return calm(t.notFound, 404);
  if (cycle.status !== "collecting") return calm(t.modeChoiceClosed, 409);
  if (cycle.mode !== "interview") return calm(t.notFound, 404);

  const snapshotResult = snapshotSchema.safeParse(cycle.templateSnapshot);
  if (!snapshotResult.success) {
    console.warn("[interview] cycle has an invalid templateSnapshot");
    return calm(t.interviewError, 500);
  }
  const snapshot = snapshotResult.data;
  const questions = snapshot.questions;

  const firstWord = cycle.subject.fullName.split(" ")[0];
  const subjectFirstName = firstWord !== undefined && firstWord.length > 0 ? firstWord : null;

  // Load the transcript (corrupt blob → start fresh, never drive the agent
  // with junk) and the recorded answers (the source of truth for traversal).
  const dialog = await db.dialog.findUnique({
    where: { cycleId: cycle.id },
    select: { messages: true },
  });
  const transcriptResult = interviewTranscriptSchema.safeParse(dialog?.messages ?? []);
  const transcript: InterviewMessage[] = transcriptResult.success ? transcriptResult.data : [];

  const response = await db.response.findUnique({
    where: { cycleId: cycle.id },
    select: { id: true, answers: { select: { questionId: true } } },
  });
  const recordedIds = (response?.answers ?? []).map((a) => a.questionId);

  const currentQuestionId = nextInterviewQuestionId(questions, recordedIds);

  // ---- Decide the turn (pure logic + judge), persisting anything that must
  // survive an outage BEFORE the stream opens (FR-AI-07). ----
  let turn: InterviewerTurn;
  let userMessage: InterviewMessage | null = null;

  if (currentQuestionId === null) {
    // Every question already has a row — closing turn (idempotent).
    turn = { kind: "complete" };
  } else {
    const currentQuestion = questions.find((q) => q.id === currentQuestionId);
    if (currentQuestion === undefined) return calm(t.interviewError, 500);

    if (!hasAskedQuestion(transcript, currentQuestionId)) {
      // The current question has not been put yet: ask it (greeting on the
      // very first turn). No reply to judge, nothing recorded.
      turn =
        transcript.length === 0
          ? { kind: "greeting", question: currentQuestion }
          : { kind: "ask", question: currentQuestion };
    } else {
      // Awaiting a reply to the current question — judge it.
      const reply = clampMessage(bodyResult.data.message ?? "", MAX_RESPONDENT_MESSAGE_CHARS);
      userMessage = { role: "user", content: reply, questionId: currentQuestionId };

      const decision = await judgeAndDecide({
        question: currentQuestion,
        reply,
        transcript,
        cycleId: cycle.id,
        judgeModel: aiEnv.AI_JUDGE_MODEL,
      });

      if (decision.action === "followup") {
        turn = { kind: "followup", question: currentQuestion };
      } else {
        await recordAnswer({
          cycleId: cycle.id,
          questionId: currentQuestionId,
          answer: decision.answer,
          insufficient: decision.insufficient,
        });
        const nextId = nextInterviewQuestionId(questions, [...recordedIds, currentQuestionId]);
        if (nextId === null) {
          // Every question now has a row, so the respondent-facing interview is
          // over (nothing more to ask). The cycle flips to `done` ONLY if the
          // canonical predicate passes (FR-CYCLE-04: every required question has
          // a valid answer). A required question that capped out as insufficient
          // intentionally leaves the cycle `collecting` — by design the agent
          // does not loop past the cap (FR-AI-03); HR sees the partial progress
          // and follows up. The closing turn still thanks the respondent.
          await maybeComplete(cycle.id, snapshot);
          turn = { kind: "complete" };
        } else {
          const nextQuestion = questions.find((q) => q.id === nextId);
          turn = nextQuestion === undefined ? { kind: "complete" } : { kind: "ask", question: nextQuestion };
        }
      }
    }
  }

  // ---- Stream the interviewer reply; persist transcript + usage on success. ----
  const askedQuestionId = turn.kind === "complete" ? undefined : turn.question.id;
  const assistantKind = turn.kind === "greeting" ? "greeting" : turn.kind === "ask" ? "question" : turn.kind;

  // The streamer MUST see the respondent's current reply (appended here),
  // otherwise it answers the PREVIOUS turn — e.g. declining an earlier
  // off-topic message after the respondent has already given a valid answer.
  const transcriptForPrompt =
    userMessage !== null ? [...transcript, userMessage] : transcript;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      try {
        const ai = streamInterviewerReply({
          questions,
          transcript: transcriptForPrompt,
          subjectFirstName,
          turn,
        });
        ai.on("text", (delta) => {
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        });
        const finalMessage = await ai.finalMessage();

        const assistantMessage: InterviewMessage = {
          role: "assistant",
          content: fullText,
          kind: assistantKind,
          ...(askedQuestionId !== undefined ? { questionId: askedQuestionId } : {}),
        };
        const nextTranscript = [
          ...transcript,
          ...(userMessage !== null ? [userMessage] : []),
          assistantMessage,
        ];

        await db.dialog.upsert({
          where: { cycleId: cycle.id },
          create: { cycleId: cycle.id, messages: nextTranscript },
          update: { messages: nextTranscript },
        });

        try {
          await recordUsage({
            cycleId: cycle.id,
            purpose: "interview",
            model: aiEnv.AI_INTERVIEW_MODEL,
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
          });
        } catch (usageError) {
          console.error("[interview] failed to record interviewer usage", usageError);
        }

        controller.close();
      } catch (streamError) {
        console.error("[interview] stream failed", streamError);
        // Answers recorded above survive; signal the client to show the calm
        // retry + form fallback (FR-AI-07).
        controller.error(streamError);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      // Lets the client disable input and show the quiet completion state once
      // the agent has nothing more to ask (FR-AI-06).
      "x-interview-complete": turn.kind === "complete" ? "true" : "false",
    },
  });
}

// ---- helpers ---------------------------------------------------------------

async function judgeAndDecide(args: {
  question: SnapshotQuestion;
  reply: string;
  transcript: ReadonlyArray<InterviewMessage>;
  cycleId: string;
  judgeModel: string;
}): Promise<ReturnType<typeof decideTurn>> {
  const { question, reply, transcript, cycleId, judgeModel } = args;

  let scaleValue: number | null = null;
  let addressesQuestion = false;

  if (question.type === "scale") {
    // Deterministic locale mapping first (FR-AI-05); judge only as a fallback
    // for prose like "десь четвірка".
    scaleValue = mapReplyToAnchor(reply, question.anchors);
    if (scaleValue === null) {
      const judged = await judgeReply({ question, reply });
      if (judged !== null) {
        await safeRecordJudgeUsage(cycleId, judgeModel, judged.usage);
        const candidate = judged.judgment.scaleCandidate;
        if (candidate !== null && isValidAnchorValue(candidate, question.anchors)) {
          scaleValue = candidate;
        }
      }
    }
  } else {
    const judged = await judgeReply({ question, reply });
    if (judged !== null) {
      await safeRecordJudgeUsage(cycleId, judgeModel, judged.usage);
      addressesQuestion = judged.judgment.addressesQuestion;
    }
  }

  const allReplies = [...priorReplies(transcript, question.id), reply];
  return decideTurn({
    question: question.type === "scale" ? { type: "scale", anchors: question.anchors } : { type: "open" },
    scaleValue,
    addressesQuestion,
    followupsUsed: followupsUsed(transcript, question.id),
    currentText: reply,
    bestText: bestAvailableText(allReplies),
  });
}

async function safeRecordJudgeUsage(
  cycleId: string,
  model: string,
  usage: { inputTokens: number; outputTokens: number },
): Promise<void> {
  try {
    await recordUsage({
      cycleId,
      purpose: "interview",
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  } catch (error) {
    console.error("[interview] failed to record judge usage", error);
  }
}

async function recordAnswer(args: {
  cycleId: string;
  questionId: string;
  answer: { type: "scale"; value: number | null } | { type: "open"; text: string };
  insufficient: boolean;
}): Promise<void> {
  const response = await db.response.upsert({
    where: { cycleId: args.cycleId },
    create: { cycleId: args.cycleId },
    update: {},
    select: { id: true },
  });

  const valueFields =
    args.answer.type === "scale"
      ? { scaleValue: args.answer.value, text: null }
      : { text: args.answer.text, scaleValue: null };

  await db.answer.upsert({
    where: {
      responseId_questionId: { responseId: response.id, questionId: args.questionId },
    },
    create: {
      responseId: response.id,
      questionId: args.questionId,
      insufficient: args.insufficient,
      ...valueFields,
    },
    update: { insufficient: args.insufficient, ...valueFields },
  });
}

async function maybeComplete(cycleId: string, snapshot: TemplateSnapshot): Promise<void> {
  const rows = await db.answer.findMany({
    where: { response: { cycleId } },
    select: { questionId: true, scaleValue: true, text: true },
  });
  if (isResponseComplete(snapshot, toAnswersRecord(rows))) {
    await db.cycle.updateMany({
      where: { id: cycleId, status: "collecting" },
      data: { status: "done" },
    });
  }
}
