export type ProviderId = "emailnator";

export interface InboxMetadata {
  address: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface RecentInboxRecord {
  id: string;
  providerId: ProviderId;
  address: string;
  capabilityToken: string;
  createdAt: string;
  expiresAt: string;
  lastOpenedAt: string;
  lastCheckedAt?: string;
  lastMessageCount?: number;
}

export interface InboxMessageSummary {
  reference: string;
  from: string;
  subject: string;
  time: string;
  preview: string;
}

export interface InboxMessageDetail {
  reference: string;
  contentType: string;
  bodyLength: number;
  htmlBody?: string | null;
  textBody?: string | null;
  text: string;
  textPreview: string;
  markerFound: boolean;
}

export type InboxApiErrorKind =
  | "activeInboxLimit"
  | "invalidRequest"
  | "invalidSession"
  | "internal"
  | "malformedResponse"
  | "messageNotFound"
  | "offline"
  | "providerDisabled"
  | "providerUnavailable"
  | "rateLimited"
  | "refreshInProgress"
  | "sessionExpired"
  | "sessionMissing"
  | "timeout";
