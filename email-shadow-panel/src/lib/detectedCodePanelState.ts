export type MessageDetailStatus = "idle" | "loading" | "loaded" | "error";

export type DetectedCodePanelState =
  | {
      kind: "code";
    }
  | {
      kind: "empty";
      title: string;
      description: string;
    };

export function getDetectedCodePanelState(input: {
  code: string | null;
  hasSelection: boolean;
  detailStatus: MessageDetailStatus;
  detailErrorMessage?: string | null;
}): DetectedCodePanelState {
  if (input.code) {
    return { kind: "code" };
  }

  if (!input.hasSelection) {
    return {
      kind: "empty",
      title: "Awaiting selection",
      description: "Select an OTP or verification email to extract a code.",
    };
  }

  if (input.detailStatus === "loading") {
    return {
      kind: "empty",
      title: "Checking message detail",
      description: "Loading the safe message text before deciding whether a code is present.",
    };
  }

  if (input.detailStatus === "error") {
    return {
      kind: "empty",
      title: "Code check unavailable",
      description:
        input.detailErrorMessage ??
        "Message detail could not be loaded, so no-code detection is not confirmed.",
    };
  }

  if (input.detailStatus === "idle") {
    return {
      kind: "empty",
      title: "Awaiting safe preview",
      description: "Open the message detail before treating this as a no-code result.",
    };
  }

  return {
    kind: "empty",
    title: "No code found",
    description: "This message detail does not look like it contains a verification code.",
  };
}
