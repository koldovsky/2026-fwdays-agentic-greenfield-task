import type { InboxMessage, InboxSession } from "@/types/inbox";
import type { InboxProvider } from "./inboxProvider";

const HANDLES = [
  "nova.panel",
  "shadow.route",
  "inbox.vector",
  "cipher.drift",
  "quiet.orbit",
  "atlas.hush",
  "signal.echo",
  "mono.relay",
];
const DOMAINS = ["googlemail.com", "gmail.com"];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hash(input: string): number {
  return [...input].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function randomAddress(): string {
  const handle = HANDLES[Math.floor(Math.random() * HANDLES.length)];
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const n = Math.floor(Math.random() * 900 + 100);
  return `${handle}.${n}@${domain}`;
}

function otp(seed?: string) {
  if (!seed) return String(Math.floor(100000 + Math.random() * 900000));
  return String(100000 + (hash(seed) % 900000));
}

function seedMessages(inboxId: string): InboxMessage[] {
  const now = Date.now();
  const code = otp(inboxId);
  return [
    {
      id: `${inboxId}-m1`,
      inboxId,
      sender: "Linear Security",
      senderAddress: "no-reply@linear.app",
      subject: `Your verification code is ${code}`,
      preview: `Use ${code} to finish signing in. This code expires in 10 minutes.`,
      bodyText: `Hi there,

We received a request to sign in to your workspace.

Your verification code is ${code}

This code will expire in 10 minutes. If you didn't request this, you can safely ignore this message.

- The Linear team`,
      receivedAt: new Date(now - 12_000).toISOString(),
      isRead: false,
    },
    {
      id: `${inboxId}-m2`,
      inboxId,
      sender: "Vercel",
      senderAddress: "welcome@vercel.com",
      subject: "Welcome to Vercel - let's ship something",
      preview: "Thanks for signing up. Here are a few things to try in the first ten minutes...",
      bodyText: `Welcome aboard.

You now have a fresh workspace ready to go. Here's what most new teams do first:

  1. Import a repository from GitHub or GitLab.
  2. Deploy your first preview environment.
  3. Invite one teammate to review it.

No rush - the platform waits for you.

- The Vercel team`,
      receivedAt: new Date(now - 65_000).toISOString(),
      isRead: false,
    },
    {
      id: `${inboxId}-m3`,
      inboxId,
      sender: "GitHub",
      senderAddress: "noreply@github.com",
      subject: "New sign-in from an unrecognized device",
      preview: "We noticed a new sign-in to your GitHub account from a device we don't recognize.",
      bodyText: `Hi,

A new sign-in was detected on your account:

  Device:   Chromium on macOS
  Location: Approximate - Amsterdam, NL
  Time:     Just now

If this was you, no action is needed. If it wasn't, review your active sessions and rotate your credentials.

- GitHub Security`,
      receivedAt: new Date(now - 4 * 60_000).toISOString(),
      isRead: true,
    },
  ];
}

const inboxes = new Map<string, InboxSession>();
const messages = new Map<string, InboxMessage[]>();

export const mockEmailnatorProvider: InboxProvider = {
  id: "emailnator",
  name: "Emailnator",

  async createInbox(): Promise<InboxSession> {
    await delay(700 + Math.random() * 500);
    const id = `esp_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const session: InboxSession = {
      id,
      providerId: "emailnator",
      address: randomAddress(),
      status: "ready",
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
    inboxes.set(id, session);
    messages.set(id, []);
    setTimeout(() => {
      messages.set(id, seedMessages(id));
      const cur = inboxes.get(id);
      if (cur) {
        inboxes.set(id, {
          ...cur,
          messageCount: 3,
          updatedAt: new Date().toISOString(),
        });
      }
    }, 1400);
    return session;
  },

  async refreshMessages(inboxId: string): Promise<InboxMessage[]> {
    await delay(420);
    if (!messages.has(inboxId)) {
      messages.set(inboxId, seedMessages(inboxId));
    }
    return messages.get(inboxId) ?? [];
  },

  async getMessage(messageId: string): Promise<InboxMessage> {
    await delay(120);
    for (const list of messages.values()) {
      const m = list.find((x) => x.id === messageId);
      if (m) return m;
    }
    throw new Error("Message not found");
  },

  async closeInbox(inboxId: string): Promise<void> {
    await delay(200);
    const s = inboxes.get(inboxId);
    if (s) inboxes.set(inboxId, { ...s, status: "closed" });
    messages.delete(inboxId);
  },
};
