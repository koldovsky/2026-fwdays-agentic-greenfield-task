import type { RecentInboxRecord } from "../types/inbox.ts";

export interface RecentInboxPanelRow {
  id: string;
  address: string;
  lastUsedLabel: string;
  messageBadgeLabel: string;
  expired: boolean;
  forgetLabel: string;
}

export interface RecentInboxPanelState {
  kind: "empty" | "saved";
  savedCountLabel: string | null;
  rows: RecentInboxPanelRow[];
}

function formatRelativeTime(iso: string, nowMs: number): string {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) {
    return "recently";
  }

  const diffSeconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (diffSeconds < 60) {
    return "just now";
  }

  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)} minutes ago`;
  }

  if (diffSeconds < 86_400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  if (diffSeconds < 172_800) {
    return "yesterday";
  }

  const days = Math.floor(diffSeconds / 86_400);
  return `${days} days ago`;
}

function formatMessageBadgeLabel(count: number | undefined): string {
  if (count === undefined) {
    return "0 new";
  }

  return `${count} ${count === 1 ? "message" : "messages"}`;
}

export function getRecentInboxPanelState(
  items: RecentInboxRecord[],
  nowMs = Date.now(),
): RecentInboxPanelState {
  const rows = items.map((item) => {
    const expired = Date.parse(item.expiresAt) <= nowMs;
    const lastUsed = formatRelativeTime(item.lastOpenedAt, nowMs);

    return {
      id: item.id,
      address: item.address,
      expired,
      lastUsedLabel: expired
        ? `Expired ${formatRelativeTime(item.expiresAt, nowMs)}`
        : `Last used ${lastUsed}`,
      messageBadgeLabel: formatMessageBadgeLabel(item.lastMessageCount),
      forgetLabel: `Forget recent inbox ${item.address}`,
    };
  });

  return {
    kind: rows.length > 0 ? "saved" : "empty",
    savedCountLabel: rows.length > 0 ? `${rows.length} saved` : null,
    rows,
  };
}
