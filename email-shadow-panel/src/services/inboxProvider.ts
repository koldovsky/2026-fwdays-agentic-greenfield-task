// Provider interface. All UI code depends on this — never the mock directly.
// A future backend adapter (Playwright-backed, SSE-driven) can be swapped in
// without touching any component.
//
// Safety constraints (enforced by convention here; enforced in backend later):
//   * No CAPTCHA bypass.
//   * No stealth automation.
//   * No proxy evasion.
//   * No hidden automation tricks.
//   * Stop cleanly on provider protection states.
//   * Real provider automation, if ever added, belongs in backend adapters —
//     never in this frontend module.

import type { InboxMessage, InboxSession, ProviderId } from "@/types/inbox";

export interface InboxProvider {
  id: ProviderId | string;
  name: string;
  createInbox(): Promise<InboxSession>;
  refreshMessages(inboxId: string): Promise<InboxMessage[]>;
  getMessage(messageId: string): Promise<InboxMessage>;
  closeInbox(inboxId: string): Promise<void>;
}

import { mockEmailnatorProvider } from "./mockEmailnatorProvider";

const registry: Record<string, InboxProvider> = {
  emailnator: mockEmailnatorProvider,
};

export function getProvider(id: ProviderId | string): InboxProvider {
  const p = registry[id];
  if (!p) throw new Error(`No provider registered for "${id}"`);
  return p;
}

// Thin façade so components stay agnostic of the registry.
export async function createInbox(providerId: ProviderId): Promise<InboxSession> {
  return getProvider(providerId).createInbox();
}
export async function refreshMessages(
  providerId: ProviderId,
  inboxId: string,
): Promise<InboxMessage[]> {
  return getProvider(providerId).refreshMessages(inboxId);
}
export async function getMessage(providerId: ProviderId, messageId: string): Promise<InboxMessage> {
  return getProvider(providerId).getMessage(messageId);
}
export async function closeInbox(providerId: ProviderId, inboxId: string): Promise<void> {
  return getProvider(providerId).closeInbox(inboxId);
}
