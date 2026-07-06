import {
  createRecentInboxId,
  createRecentInboxesStorage,
  type RecentInboxesStorage,
} from "./localSessions.ts";
import {
  InboxApiClientError,
  createBrowserInboxApiClient,
  isAbortError,
  type CreateInboxResult,
  type InboxApiClient,
  type ListMessagesResult,
} from "./inboxApiClient.ts";
import type { InboxMessageDetail, InboxMessageSummary, RecentInboxRecord } from "../types/inbox.ts";

export const POLL_INTERVAL_MS = 15_000;
export const HIDDEN_POLL_INTERVAL_MS = 60_000;
export const POLL_RESUME_DELAY_MS = 1_200;
export const TRANSIENT_BACKOFF_MS = [5_000, 15_000, 30_000, 60_000] as const;

export interface InboxControllerState {
  initialized: boolean;
  storageRecovered: boolean;
  recentInboxes: RecentInboxRecord[];
  selectedInboxId: string | null;
  selectedInbox: RecentInboxRecord | null;
  generateStatus: "idle" | "pending";
  createError: InboxApiClientError | null;
  sessionNotice: string | null;
  messageListStatus: "idle" | "loading" | "refreshing" | "error";
  messageListError: InboxApiClientError | null;
  messages: InboxMessageSummary[];
  selectedMessageReference: string | null;
  messageDetailStatus: "idle" | "loading" | "loaded" | "error";
  messageDetailError: InboxApiClientError | null;
  selectedMessageDetail: InboxMessageDetail | null;
  removalStatus: "idle" | "pending";
  removalNotice: string | null;
  polling: {
    active: boolean;
    hidden: boolean;
    nextDelayMs: number | null;
  };
}

export interface TimerScheduler {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface VisibilitySource {
  isHidden(): boolean;
  subscribe(listener: () => void): () => void;
}

export interface InboxControllerDependencies {
  api: InboxApiClient;
  storage: RecentInboxesStorage;
  scheduler: TimerScheduler;
  visibility: VisibilitySource;
}

export function createBrowserVisibilitySource(): VisibilitySource {
  return {
    isHidden() {
      return typeof document !== "undefined" ? document.hidden : false;
    },
    subscribe(listener) {
      if (typeof document === "undefined") {
        return () => {};
      }

      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
  };
}

export function createBrowserScheduler(): TimerScheduler {
  return {
    now() {
      return Date.now();
    },
    setTimeout(callback, delayMs) {
      return window.setTimeout(callback, delayMs);
    },
    clearTimeout(handle) {
      window.clearTimeout(handle as number);
    },
  };
}

function createInitialState(): InboxControllerState {
  return {
    initialized: false,
    storageRecovered: false,
    recentInboxes: [],
    selectedInboxId: null,
    selectedInbox: null,
    generateStatus: "idle",
    createError: null,
    sessionNotice: null,
    messageListStatus: "idle",
    messageListError: null,
    messages: [],
    selectedMessageReference: null,
    messageDetailStatus: "idle",
    messageDetailError: null,
    selectedMessageDetail: null,
    removalStatus: "idle",
    removalNotice: null,
    polling: {
      active: false,
      hidden: false,
      nextDelayMs: null,
    },
  };
}

function messagePreviewFor(
  message: ListMessagesResult["messages"][number] | InboxMessageSummary,
  detail?: InboxMessageDetail,
): string {
  return detail?.textPreview || `Received ${message.time}`;
}

function isSessionTerminal(error: InboxApiClientError): boolean {
  return (
    error.kind === "invalidSession" ||
    error.kind === "sessionExpired" ||
    error.kind === "sessionMissing"
  );
}

function isTransientListError(error: InboxApiClientError): boolean {
  return (
    error.kind === "offline" ||
    error.kind === "providerUnavailable" ||
    error.kind === "providerDisabled" ||
    error.kind === "rateLimited" ||
    error.kind === "refreshInProgress" ||
    error.kind === "timeout"
  );
}

function refineProviderError(error: InboxApiClientError, health: "ok" | "degraded" | null) {
  if (error.kind !== "providerUnavailable" || health !== "degraded") {
    return error;
  }

  return new InboxApiClientError("providerDisabled", "Inbox generation is temporarily paused.", {
    retryAfterSeconds: error.retryAfterSeconds,
    retryable: error.retryable,
    stableCode: error.stableCode,
    requestId: error.requestId,
    status: error.status,
  });
}

export class InboxController {
  private readonly dependencies: InboxControllerDependencies;
  private state = createInitialState();
  private readonly listeners = new Set<() => void>();
  private readonly detailCache = new Map<string, InboxMessageDetail>();
  private pollHandle: unknown = null;
  private listAbortController: AbortController | null = null;
  private detailAbortController: AbortController | null = null;
  private visibilityUnsubscribe: (() => void) | null = null;
  private listRequestInboxId: string | null = null;
  private backoffIndex = 0;

  constructor(dependencies: InboxControllerDependencies) {
    this.dependencies = dependencies;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): InboxControllerState {
    return this.state;
  }

  initialize(): void {
    if (this.state.initialized) {
      return;
    }

    const snapshot = this.dependencies.storage.load();
    this.setState({
      initialized: true,
      storageRecovered: snapshot.recovered,
      recentInboxes: snapshot.inboxes,
      selectedInboxId: snapshot.selectedInboxId,
      selectedInbox:
        snapshot.inboxes.find((record) => record.id === snapshot.selectedInboxId) ?? null,
      sessionNotice: snapshot.recovered
        ? "Malformed or expired browser storage was recovered safely."
        : null,
    });
    this.visibilityUnsubscribe = this.dependencies.visibility.subscribe(() => {
      this.handleVisibilityChange();
    });

    if (this.state.selectedInbox) {
      void this.loadSelectedInbox({ reason: "initial" });
    }
  }

  dispose(): void {
    this.clearPollTimer();
    this.abortListRequest();
    this.abortDetailRequest();
    this.visibilityUnsubscribe?.();
    this.visibilityUnsubscribe = null;
  }

  async generateInbox(): Promise<void> {
    if (this.state.generateStatus === "pending") {
      return;
    }

    this.setState({
      generateStatus: "pending",
      createError: null,
      sessionNotice: null,
      removalNotice: null,
    });

    try {
      const created = await this.dependencies.api.createInbox();
      const record = this.toRecentInboxRecord(created);
      const snapshot = this.dependencies.storage.saveInbox(record, { select: true });
      this.detailCache.clear();
      this.abortDetailRequest();
      this.abortListRequest();
      this.clearPollTimer();
      this.backoffIndex = 0;
      this.setState({
        generateStatus: "idle",
        recentInboxes: snapshot.inboxes,
        selectedInboxId: record.id,
        selectedInbox: record,
        messages: [],
        messageListStatus: "loading",
        messageListError: null,
        selectedMessageReference: null,
        selectedMessageDetail: null,
        messageDetailStatus: "idle",
        messageDetailError: null,
      });
      await this.loadSelectedInbox({ reason: "generated" });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      let clientError = this.asClientError(error);
      if (clientError.kind === "providerUnavailable") {
        clientError = refineProviderError(clientError, await this.safeHealthStatus());
      }

      this.setState({
        generateStatus: "idle",
        createError: clientError,
      });
    }
  }

  async selectInbox(id: string): Promise<void> {
    if (id === this.state.selectedInboxId) {
      const snapshot = this.dependencies.storage.selectInbox(id);
      this.applySnapshot(snapshot);
      return;
    }

    const snapshot = this.dependencies.storage.selectInbox(id);
    const selectedInbox = snapshot.inboxes.find((record) => record.id === id) ?? null;
    this.clearPollTimer();
    this.abortListRequest();
    this.abortDetailRequest();
    this.detailCache.clear();
    this.backoffIndex = 0;
    this.setState({
      recentInboxes: snapshot.inboxes,
      selectedInboxId: snapshot.selectedInboxId,
      selectedInbox,
      sessionNotice: null,
      messageListStatus: selectedInbox ? "loading" : "idle",
      messageListError: null,
      messages: [],
      selectedMessageReference: null,
      selectedMessageDetail: null,
      messageDetailStatus: "idle",
      messageDetailError: null,
      polling: {
        active: false,
        hidden: this.dependencies.visibility.isHidden(),
        nextDelayMs: null,
      },
    });

    if (selectedInbox) {
      await this.loadSelectedInbox({ reason: "switch" });
    }
  }

  async refreshMessages(): Promise<void> {
    if (!this.state.selectedInbox) {
      return;
    }

    if (this.listRequestInboxId === this.state.selectedInbox.id) {
      this.setState({
        messageListError: new InboxApiClientError(
          "refreshInProgress",
          "Another inbox refresh is already in progress.",
        ),
      });
      return;
    }

    await this.loadSelectedInbox({ reason: "manual" });
  }

  async selectMessage(reference: string | null): Promise<void> {
    this.abortDetailRequest();
    this.setState({
      selectedMessageReference: reference,
      messageDetailError: null,
      selectedMessageDetail: reference ? (this.detailCache.get(reference) ?? null) : null,
      messageDetailStatus: reference
        ? this.detailCache.has(reference)
          ? "loaded"
          : "loading"
        : "idle",
    });

    if (!reference || this.detailCache.has(reference)) {
      return;
    }

    await this.loadSelectedMessageDetail(reference);
  }

  async forgetSelectedInbox(): Promise<void> {
    const selectedInbox = this.state.selectedInbox;
    if (!selectedInbox || this.state.removalStatus === "pending") {
      return;
    }

    this.clearPollTimer();
    this.abortListRequest();
    this.abortDetailRequest();
    this.detailCache.clear();
    this.setState({
      removalStatus: "pending",
      removalNotice: null,
    });

    let removalNotice: string | null = null;
    try {
      await this.dependencies.api.deleteInbox(selectedInbox.capabilityToken);
      removalNotice = "Inbox deleted from the server and removed from this browser.";
    } catch (error) {
      const clientError = this.asClientError(error);
      if (isSessionTerminal(clientError)) {
        removalNotice = "Expired or missing inbox was forgotten locally.";
      } else {
        removalNotice =
          "Inbox was forgotten locally. Server deletion could not be confirmed from this browser.";
      }
    }

    const snapshot = this.dependencies.storage.removeInbox(selectedInbox.id);
    this.applySnapshot(snapshot);
    this.setState({
      removalStatus: "idle",
      removalNotice,
      messages: [],
      messageListStatus: "idle",
      messageListError: null,
      selectedMessageReference: null,
      selectedMessageDetail: null,
      messageDetailStatus: "idle",
      messageDetailError: null,
    });

    if (this.state.selectedInbox) {
      await this.loadSelectedInbox({ reason: "restored" });
    }
  }

  private async loadSelectedInbox(options: {
    reason: "initial" | "generated" | "switch" | "manual" | "restored";
  }) {
    const selectedInbox = this.state.selectedInbox;
    if (!selectedInbox) {
      return;
    }

    this.abortListRequest();
    this.clearPollTimer();

    const abortController = new AbortController();
    this.listAbortController = abortController;
    this.listRequestInboxId = selectedInbox.id;
    this.setState({
      messageListStatus:
        options.reason === "manual"
          ? "refreshing"
          : this.state.messages.length > 0
            ? "refreshing"
            : "loading",
      messageListError: null,
      polling: {
        active: true,
        hidden: this.dependencies.visibility.isHidden(),
        nextDelayMs: null,
      },
    });

    try {
      const listed = await this.dependencies.api.listMessages(selectedInbox.capabilityToken, {
        signal: abortController.signal,
      });
      if (abortController.signal.aborted || this.state.selectedInbox?.id !== selectedInbox.id) {
        return;
      }
      this.backoffIndex = 0;
      const snapshot = this.dependencies.storage.selectInbox(selectedInbox.id, {
        expiresAt: listed.inbox.expiresAt,
      });
      const selectedMessageReference = this.resolveSelectedMessageReference(listed);
      const messages = listed.messages.map((message) => ({
        ...message,
        preview: messagePreviewFor(message, this.detailCache.get(message.reference)),
      }));
      this.applySnapshot(snapshot);
      this.setState({
        messageListStatus: "idle",
        messageListError: null,
        messages,
        selectedMessageReference,
        selectedMessageDetail: selectedMessageReference
          ? (this.detailCache.get(selectedMessageReference) ?? null)
          : null,
        messageDetailStatus: selectedMessageReference
          ? this.detailCache.has(selectedMessageReference)
            ? "loaded"
            : "loading"
          : "idle",
        messageDetailError: null,
        sessionNotice: this.state.storageRecovered
          ? "Malformed or expired browser storage was recovered safely."
          : null,
      });

      if (selectedMessageReference && !this.detailCache.has(selectedMessageReference)) {
        void this.loadSelectedMessageDetail(selectedMessageReference);
      }

      this.schedulePoll(POLL_INTERVAL_MS);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      let clientError = this.asClientError(error);
      if (clientError.kind === "providerUnavailable") {
        clientError = refineProviderError(clientError, await this.safeHealthStatus());
      }

      if (isSessionTerminal(clientError)) {
        this.handleTerminalSessionError(selectedInbox.id, clientError);
        return;
      }

      this.setState({
        messageListStatus: "error",
        messageListError: clientError,
      });

      if (isTransientListError(clientError)) {
        this.schedulePoll(this.resolveRetryDelay(clientError));
      }
    } finally {
      if (this.listAbortController === abortController) {
        this.listAbortController = null;
      }
      if (this.listRequestInboxId === selectedInbox.id) {
        this.listRequestInboxId = null;
      }
    }
  }

  private async loadSelectedMessageDetail(reference: string): Promise<void> {
    const selectedInbox = this.state.selectedInbox;
    if (!selectedInbox) {
      return;
    }

    this.abortDetailRequest();
    const abortController = new AbortController();
    this.detailAbortController = abortController;
    this.setState({
      messageDetailStatus: "loading",
      messageDetailError: null,
    });

    try {
      const detail = await this.dependencies.api.getMessageDetail(
        selectedInbox.capabilityToken,
        reference,
        {
          signal: abortController.signal,
        },
      );
      if (abortController.signal.aborted || this.state.selectedInbox?.id !== selectedInbox.id) {
        return;
      }
      this.detailCache.set(reference, detail.message);
      this.setState({
        selectedMessageDetail:
          this.state.selectedMessageReference === reference
            ? detail.message
            : this.state.selectedMessageDetail,
        messageDetailStatus:
          this.state.selectedMessageReference === reference
            ? "loaded"
            : this.state.messageDetailStatus,
        messageDetailError: null,
        messages: this.state.messages.map((message) =>
          message.reference === reference
            ? { ...message, preview: messagePreviewFor(message, detail.message) }
            : message,
        ),
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      let clientError = this.asClientError(error);
      if (clientError.kind === "providerUnavailable") {
        clientError = refineProviderError(clientError, await this.safeHealthStatus());
      }

      if (isSessionTerminal(clientError)) {
        this.handleTerminalSessionError(selectedInbox.id, clientError);
        return;
      }

      this.setState({
        messageDetailStatus: "error",
        messageDetailError: clientError,
        selectedMessageDetail: null,
      });
    } finally {
      if (this.detailAbortController === abortController) {
        this.detailAbortController = null;
      }
    }
  }

  private handleTerminalSessionError(inboxId: string, error: InboxApiClientError) {
    const snapshot = this.dependencies.storage.removeInbox(inboxId);
    this.applySnapshot(snapshot);
    this.clearPollTimer();
    this.abortDetailRequest();
    this.setState({
      messageListStatus: "idle",
      messageListError: null,
      messages: [],
      selectedMessageReference: null,
      selectedMessageDetail: null,
      messageDetailStatus: "idle",
      messageDetailError: null,
      sessionNotice:
        error.kind === "sessionExpired"
          ? "This inbox expired and was removed from recent inboxes."
          : "This inbox was no longer available and was removed from recent inboxes.",
    });

    if (this.state.selectedInbox) {
      void this.loadSelectedInbox({ reason: "restored" });
    }
  }

  private resolveSelectedMessageReference(listed: ListMessagesResult): string | null {
    const current = this.state.selectedMessageReference;
    if (current && listed.messages.some((message) => message.reference === current)) {
      return current;
    }

    if (current) {
      return null;
    }

    return listed.messages[0]?.reference ?? null;
  }

  private toRecentInboxRecord(created: CreateInboxResult): RecentInboxRecord {
    return {
      id: createRecentInboxId(created.inbox.address, created.inbox.createdAt, "emailnator"),
      providerId: "emailnator",
      address: created.inbox.address,
      capabilityToken: created.capabilityToken,
      createdAt: created.inbox.createdAt,
      expiresAt: created.inbox.expiresAt,
      lastOpenedAt: new Date(this.dependencies.scheduler.now()).toISOString(),
    };
  }

  private resolveRetryDelay(error: InboxApiClientError): number {
    if (error.retryAfterSeconds) {
      return error.retryAfterSeconds * 1_000;
    }

    const delay =
      TRANSIENT_BACKOFF_MS[Math.min(this.backoffIndex, TRANSIENT_BACKOFF_MS.length - 1)];
    this.backoffIndex = Math.min(this.backoffIndex + 1, TRANSIENT_BACKOFF_MS.length - 1);
    return delay;
  }

  private schedulePoll(delayMs: number): void {
    const selectedInbox = this.state.selectedInbox;
    if (!selectedInbox) {
      return;
    }

    this.clearPollTimer();
    const hidden = this.dependencies.visibility.isHidden();
    const boundedDelay = hidden ? Math.max(delayMs, HIDDEN_POLL_INTERVAL_MS) : delayMs;
    this.setState({
      polling: {
        active: true,
        hidden,
        nextDelayMs: boundedDelay,
      },
    });

    this.pollHandle = this.dependencies.scheduler.setTimeout(() => {
      this.pollHandle = null;
      if (!this.state.selectedInbox || this.state.selectedInbox.id !== selectedInbox.id) {
        return;
      }
      if (this.listRequestInboxId === selectedInbox.id) {
        this.schedulePoll(
          this.resolveRetryDelay(
            new InboxApiClientError("refreshInProgress", "Refresh already running."),
          ),
        );
        return;
      }
      void this.loadSelectedInbox({ reason: "manual" });
    }, boundedDelay);
  }

  private handleVisibilityChange(): void {
    if (!this.state.selectedInbox) {
      return;
    }

    if (this.dependencies.visibility.isHidden()) {
      if (this.state.polling.active) {
        this.schedulePoll(HIDDEN_POLL_INTERVAL_MS);
      }
      return;
    }

    if (this.listRequestInboxId === this.state.selectedInbox.id) {
      return;
    }

    this.schedulePoll(POLL_RESUME_DELAY_MS);
  }

  private clearPollTimer(): void {
    if (this.pollHandle !== null) {
      this.dependencies.scheduler.clearTimeout(this.pollHandle);
      this.pollHandle = null;
    }
    this.setState({
      polling: {
        active: false,
        hidden: this.dependencies.visibility.isHidden(),
        nextDelayMs: null,
      },
    });
  }

  private abortListRequest(): void {
    this.listAbortController?.abort();
    this.listAbortController = null;
    this.listRequestInboxId = null;
  }

  private abortDetailRequest(): void {
    this.detailAbortController?.abort();
    this.detailAbortController = null;
  }

  private applySnapshot(snapshot: {
    inboxes: RecentInboxRecord[];
    selectedInboxId: string | null;
  }) {
    this.setState({
      recentInboxes: snapshot.inboxes,
      selectedInboxId: snapshot.selectedInboxId,
      selectedInbox:
        snapshot.inboxes.find((record) => record.id === snapshot.selectedInboxId) ?? null,
    });
  }

  private async safeHealthStatus(): Promise<"ok" | "degraded" | null> {
    try {
      return await this.dependencies.api.getHealthStatus();
    } catch {
      return null;
    }
  }

  private asClientError(error: unknown): InboxApiClientError {
    return error instanceof InboxApiClientError
      ? error
      : new InboxApiClientError("internal", "An unexpected client error occurred.", {
          cause: error,
        });
  }

  private setState(patch: Partial<InboxControllerState>): void {
    this.state = {
      ...this.state,
      ...patch,
    };
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createBrowserInboxController(): InboxController {
  return new InboxController({
    api: createBrowserInboxApiClient(),
    storage: createRecentInboxesStorage(),
    scheduler: createBrowserScheduler(),
    visibility: createBrowserVisibilitySource(),
  });
}
