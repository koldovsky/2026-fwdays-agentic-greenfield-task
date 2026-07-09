import type { ProviderId } from "../types/inbox.ts";

export const TRANSITION_PROGRESS_STEPS = [
  {
    id: "address",
    label: "Address generated",
    description: "Temporary email address created successfully.",
  },
  {
    id: "connected",
    label: "Mailbox connected",
    description: "Secure connection to provider established.",
  },
  {
    id: "stream",
    label: "Preparing message stream",
    description: "Listening for first messages...",
  },
] as const;

export type TransitionStepStatus = "complete" | "active" | "pending" | "error";

export function getTransitionProviderLabel(providerId: ProviderId): string {
  return providerId === "emailnator" ? "Emailnator" : providerId;
}

export function getTransitionProgressState(input: {
  hasAddress: boolean;
  mailboxConnected: boolean;
  ready: boolean;
  failed: boolean;
}): {
  progressPercent: number;
  steps: Array<(typeof TRANSITION_PROGRESS_STEPS)[number] & { status: TransitionStepStatus }>;
} {
  const statuses: TransitionStepStatus[] = [
    input.hasAddress || input.ready ? "complete" : input.failed ? "error" : "active",
    input.mailboxConnected || input.ready
      ? "complete"
      : input.hasAddress
        ? input.failed
          ? "error"
          : "active"
        : "pending",
    input.ready
      ? "complete"
      : input.mailboxConnected
        ? input.failed
          ? "error"
          : "active"
        : "pending",
  ];

  const completed = statuses.filter((status) => status === "complete").length;
  const progressPercent = input.ready
    ? 100
    : input.failed
      ? Math.max(18, completed * 32)
      : Math.max(18, completed * 32 + 18);

  return {
    progressPercent,
    steps: TRANSITION_PROGRESS_STEPS.map((step, index) => ({
      ...step,
      status: statuses[index] ?? "pending",
    })),
  };
}

export function getTransitionStatusText(input: {
  providerId: ProviderId;
  hasAddress: boolean;
  mailboxConnected: boolean;
  ready: boolean;
  failed?: boolean;
}): string {
  const provider = getTransitionProviderLabel(input.providerId);
  if (input.failed) {
    return `Inbox generation failed while opening the ${provider} mailbox.`;
  }

  if (input.ready) {
    return "Inbox generation succeeded. Handoff to the mailbox view is ready.";
  }

  if (input.mailboxConnected) {
    return `${provider} mailbox connected. Preparing the message stream.`;
  }

  if (input.hasAddress) {
    return `${provider} address generated. Connecting the mailbox.`;
  }

  return `Generating an ${provider} inbox address.`;
}
