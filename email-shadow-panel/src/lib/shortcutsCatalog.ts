export interface ShortcutItem {
  keys: string[];
  label: string;
  description: string;
}

export interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

export function getGenerateShortcutSections(): ShortcutSection[] {
  return [
    {
      title: "General",
      items: [
        {
          keys: ["?"],
          label: "Show shortcuts",
          description: "Open this help panel.",
        },
        {
          keys: ["Esc"],
          label: "Exit handoff",
          description: "Return from the handoff overlay when it is open.",
        },
      ],
    },
    {
      title: "Inbox",
      items: [
        {
          keys: ["G", "N"],
          label: "Generate inbox",
          description: "Open a new temporary inbox.",
        },
      ],
    },
  ];
}

export function getMailboxShortcutSections(options: {
  hasVerificationLink: boolean;
  hasVerificationCode: boolean;
}): ShortcutSection[] {
  const verificationItems: ShortcutItem[] = [];

  if (options.hasVerificationLink) {
    verificationItems.push({
      keys: ["L"],
      label: "Open link",
      description: "Open the detected verification link in a new tab.",
    });
  }

  if (options.hasVerificationCode) {
    verificationItems.push({
      keys: ["O"],
      label: "Copy code",
      description: "Copy the detected one-time code.",
    });
  }

  return [
    {
      title: "General",
      items: [
        {
          keys: ["?"],
          label: "Show shortcuts",
          description: "Open this help panel.",
        },
        {
          keys: ["Esc"],
          label: "Back to control panel",
          description: "Return to the control panel view.",
        },
      ],
    },
    {
      title: "Inbox",
      items: [
        {
          keys: ["R"],
          label: "Refresh inbox",
          description: "Refresh the current inbox.",
        },
        {
          keys: ["C"],
          label: "Copy address",
          description: "Copy the current inbox address.",
        },
        {
          keys: ["G", "N"],
          label: "New inbox",
          description: "Open a brand-new inbox.",
        },
        {
          keys: ["Delete", "Backspace"],
          label: "Forget inbox",
          description: "Open the confirmation dialog before forgetting this inbox.",
        },
      ],
    },
    {
      title: "Messages",
      items: [
        {
          keys: ["J", "ArrowDown"],
          label: "Next message",
          description: "Move the selected message down.",
        },
        {
          keys: ["K", "ArrowUp"],
          label: "Previous message",
          description: "Move the selected message up.",
        },
      ],
    },
    {
      title: "Verification",
      items: verificationItems,
    },
  ].filter((section) => section.items.length > 0);
}
