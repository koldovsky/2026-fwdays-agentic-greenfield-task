// Types for the Email Shadow Panel. These match the shape a real backend
// provider adapter (e.g. Playwright-driven Emailnator) would return.

export type ProviderId = "emailnator";

export type InboxStatus = "creating" | "ready" | "refreshing" | "closed" | "error";

export interface InboxSession {
  id: string;
  providerId: ProviderId;
  address: string;
  status: InboxStatus;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface InboxMessage {
  id: string;
  inboxId: string;
  sender: string;
  senderAddress?: string;
  subject: string;
  preview: string;
  bodyText: string;
  receivedAt: string;
  isRead: boolean;
}

export interface ProviderDescriptor {
  id: ProviderId | string;
  name: string;
  available: boolean;
  description: string;
}
