import { detectCode } from "./codeDetection.ts";
import { sanitizeEmailHtml, type SanitizedEmailHtml } from "./emailHtml.ts";
import { prepareSafeMessageText, type PreparedMessageText } from "./safeMessageText.ts";
import {
  detectVerificationLink,
  extractSafeLinks,
  type VerificationLink,
} from "./verificationActions.ts";
import type { InboxMessageDetail, InboxMessageSummary } from "../types/inbox.ts";

export interface MessageRenderBadge {
  label: string;
  tone: "default" | "signal";
}

export interface MessageRenderModel {
  reference: string;
  subject: string;
  sender: string;
  receivedAt: string;
  htmlBody: string | null;
  textBody: string | null;
  extractedLinks: VerificationLink[];
  verificationLink: VerificationLink | null;
  verificationCode: string | null;
  rawPayload: string | null;
  badges: MessageRenderBadge[];
}

export type MessageBodyRenderState =
  | {
      kind: "html";
      html: SanitizedEmailHtml;
    }
  | {
      kind: "text";
      text: PreparedMessageText;
    }
  | {
      kind: "empty";
      title: string;
      description: string;
    };

function normalizeBody(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getMatchingDetail(
  message: InboxMessageSummary,
  detail: InboxMessageDetail | null,
): InboxMessageDetail | null {
  if (!detail || detail.reference !== message.reference) {
    return null;
  }

  return detail;
}

function safelyExtractLinks(value: string): VerificationLink[] {
  try {
    return extractSafeLinks(value);
  } catch {
    return [];
  }
}

function safelyDetectVerificationLink(value: string): VerificationLink | null {
  try {
    return detectVerificationLink(value);
  } catch {
    return null;
  }
}

function safelyDetectCode(value: string): string | null {
  try {
    return detectCode(value);
  } catch {
    return null;
  }
}

function safelyPrepareText(value: string): PreparedMessageText | null {
  try {
    const prepared = prepareSafeMessageText(value);
    return prepared.blocks.length > 0 || prepared.text.length > 0 ? prepared : null;
  } catch {
    return null;
  }
}

function collectMessageSource(
  detail: InboxMessageDetail | null,
  message: InboxMessageSummary,
): string {
  return [
    detail?.htmlBody ?? "",
    detail?.textBody ?? "",
    detail?.text ?? "",
    detail?.textPreview ?? "",
    message.subject,
    message.preview,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function createMessageRenderModel(
  message: InboxMessageSummary | null,
  detail: InboxMessageDetail | null,
): MessageRenderModel | null {
  if (!message) {
    return null;
  }

  const matchingDetail = getMatchingDetail(message, detail);
  const htmlBody = normalizeBody(matchingDetail?.htmlBody);
  const textBody =
    normalizeBody(matchingDetail?.textBody) ??
    normalizeBody(matchingDetail?.text) ??
    normalizeBody(matchingDetail?.textPreview);
  const rawPayload = htmlBody ?? textBody ?? null;
  const source = collectMessageSource(matchingDetail, message);
  const extractedLinks = safelyExtractLinks(source);
  const verificationLink = safelyDetectVerificationLink(source);
  const verificationCode = safelyDetectCode(textBody ?? source);

  const badges: MessageRenderBadge[] = [];
  if (verificationCode) {
    badges.push({ label: "Code detected", tone: "signal" });
  }
  if (extractedLinks.length > 0) {
    badges.push({ label: "Link detected", tone: "signal" });
  }
  if (htmlBody) {
    badges.push({ label: "HTML", tone: "default" });
  }
  if (textBody) {
    badges.push({ label: htmlBody ? "Plain-text fallback" : "Plain text", tone: "default" });
  }

  return {
    reference: message.reference,
    subject: message.subject,
    sender: message.from,
    receivedAt: message.time,
    htmlBody,
    textBody,
    extractedLinks,
    verificationLink,
    verificationCode,
    rawPayload,
    badges,
  };
}

export function createMessageBodyRenderState(
  model: MessageRenderModel,
  options?: { allowRemoteImages?: boolean },
): MessageBodyRenderState {
  if (model.htmlBody) {
    try {
      const sanitized = sanitizeEmailHtml(model.htmlBody, options);
      if (sanitized.hasUsableContent) {
        return {
          kind: "html",
          html: sanitized,
        };
      }
    } catch {
      // Fall through to the plain-text or empty state.
    }
  }

  if (model.textBody) {
    const preparedText = safelyPrepareText(model.textBody);
    if (preparedText) {
      return {
        kind: "text",
        text: preparedText,
      };
    }
  }

  return {
    kind: "empty",
    title: "Message body is not available",
    description:
      "This message did not include a usable HTML or text body. Refresh the inbox to check again.",
  };
}
