export interface ParsedComment {
  author?: string
  body: string
}

export interface ParsedAttachment {
  name: string
  url: string
}

/** Attachment present in the DOM but omitted from `attachments` because its URL could not be resolved. */
export interface AttachmentParseIssue {
  name: string
  reason: string
}

export type DescriptionBlock =
  | { kind: 'heading'; level: number; html: string }
  | { kind: 'paragraph'; html: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; code: string; language?: string }

export interface ParsedTicket {
  key: string
  title: string
  type?: string
  status?: string
  resolution?: string
  priority?: string
  components: string[]
  labels: string[]
  description: DescriptionBlock[]
  assignee?: string
  reporter?: string
  created?: string
  updated?: string
  comments: ParsedComment[]
  attachments: ParsedAttachment[]
  attachmentSkips?: AttachmentParseIssue[]
}

export type ParseResult = { ok: true; ticket: ParsedTicket } | { ok: false; reason: string }
