import type { InboxProvider } from "../inbox-provider.server.ts";
import { DomainError } from "../../session/errors.server.ts";
import {
  generateInboxAddress,
  getMessageDetail,
  listInboxMessages,
  type EmailnatorRuntime,
} from "./provider.server.ts";
import { EmailnatorError } from "./errors.server.ts";
import type { EmailnatorProviderState } from "./schemas.server.ts";

function normalizeEmailnatorError(error: unknown): DomainError {
  if (!(error instanceof EmailnatorError)) {
    return new DomainError("PROVIDER_UNAVAILABLE", "Unexpected inbox provider failure.", {
      cause: error,
      safeMessage: "The inbox provider is temporarily unavailable.",
    });
  }

  switch (error.code) {
    case "PROVIDER_BLOCKED":
      return new DomainError("PROVIDER_CHALLENGE", "The inbox provider returned a challenge.", {
        cause: error,
        safeMessage: "The inbox provider rejected the request with a challenge or rate limit.",
      });
    case "PROVIDER_RESPONSE_INVALID":
    case "REQUEST_TOO_LARGE":
    case "STATE_INVALID":
      return new DomainError(
        "PROVIDER_RESPONSE_INCOMPATIBLE",
        "The inbox provider returned an incompatible response.",
        {
          cause: error,
          safeMessage: "The inbox provider response is not compatible with this application.",
        },
      );
    case "REQUEST_TIMEOUT":
      return new DomainError("TIMEOUT", "The inbox provider request timed out.", {
        cause: error,
        safeMessage: "The inbox provider request timed out.",
      });
    case "CONFIG_INVALID":
    case "UNSUPPORTED_RUNTIME":
      return new DomainError("CONFIGURATION_INVALID", "The Emailnator provider is misconfigured.", {
        cause: error,
        safeMessage: "The inbox provider configuration is invalid.",
      });
    default:
      return new DomainError("PROVIDER_UNAVAILABLE", "The inbox provider request failed.", {
        cause: error,
        safeMessage: "The inbox provider is temporarily unavailable.",
      });
  }
}

export function createEmailnatorInboxProvider(
  runtime?: EmailnatorRuntime,
): InboxProvider<EmailnatorProviderState> {
  return {
    providerId: "emailnator",
    async createInbox() {
      try {
        const result = await generateInboxAddress(runtime);
        return {
          address: result.address,
          providerState: result.state,
        };
      } catch (error) {
        throw normalizeEmailnatorError(error);
      }
    },
    async listMessages({ providerState }) {
      try {
        const result = await listInboxMessages(providerState, runtime);
        return {
          providerState: result.state,
          messages: result.messages.map((message) => ({
            providerMessageId: message.messageID,
            from: message.from,
            subject: message.subject,
            time: message.time,
          })),
        };
      } catch (error) {
        throw normalizeEmailnatorError(error);
      }
    },
    async getMessageDetail({ providerState, providerMessageId }) {
      try {
        const result = await getMessageDetail(providerState, providerMessageId, runtime);
        return {
          providerState: result.state,
          detail: result.detail,
        };
      } catch (error) {
        throw normalizeEmailnatorError(error);
      }
    },
  };
}
