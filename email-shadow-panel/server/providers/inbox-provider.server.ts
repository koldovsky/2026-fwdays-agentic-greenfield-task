export interface ProviderInboxMessageSummary {
  providerMessageId: string;
  from: string;
  subject: string;
  time: string;
}

export interface ProviderInboxMessageDetail {
  contentType: string;
  bodyLength: number;
  htmlBody?: string | null;
  textBody?: string | null;
  text: string;
  textPreview: string;
  markerFound: boolean;
}

export interface CreateInboxResult<TProviderState> {
  address: string;
  providerState: TProviderState;
}

export interface ListInboxMessagesResult<TProviderState> {
  messages: ProviderInboxMessageSummary[];
  providerState: TProviderState;
}

export interface GetInboxMessageDetailResult<TProviderState> {
  detail: ProviderInboxMessageDetail;
  providerState: TProviderState;
}

export interface InboxProvider<TProviderState> {
  readonly providerId: string;

  createInbox(input?: { signal?: AbortSignal }): Promise<CreateInboxResult<TProviderState>>;

  listMessages(input: {
    providerState: TProviderState;
    signal?: AbortSignal;
  }): Promise<ListInboxMessagesResult<TProviderState>>;

  getMessageDetail(input: {
    providerState: TProviderState;
    providerMessageId: string;
    signal?: AbortSignal;
  }): Promise<GetInboxMessageDetailResult<TProviderState>>;
}
