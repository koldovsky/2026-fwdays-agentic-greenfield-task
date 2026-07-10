// Enum keys mirror the API/Prisma enums (english on the wire, S-02 D6);
// Ukrainian labels live in ticket-labels.ts only.
export type TicketCategory =
  | 'PLUMBING'
  | 'HEATING'
  | 'ELECTRICITY'
  | 'ELEVATOR'
  | 'ROOF_FACADE'
  | 'COMMON_AREAS'
  | 'GROUNDS'
  | 'ACCESS_SYSTEMS'
  | 'OTHER';

export type TicketPriority = 'EMERGENCY' | 'HIGH' | 'NORMAL';

export type TicketStatus =
  'NEW' | 'IN_PROGRESS' | 'DONE' | 'CLOSED' | 'REJECTED';

// The writable FR-TICKET-01 fields — what create/edit send to the API
export interface TicketInput {
  title: string;
  description: string | null;
  houseId: number;
  category: TicketCategory;
  priority: TicketPriority;
  requesterName: string | null;
  requesterPhone: string | null;
  executor: string | null;
  dueDate: string | null; // YYYY-MM-DD or null to clear (FR-DUE-01)
}

// What the API answers with: the writable fields plus server-owned ones
export interface TicketDto extends TicketInput {
  id: number; // doubles as the human-visible number #N (FR-TICKET-02)
  houseName: string;
  status: TicketStatus;
  // computed server-side from the PRD §5.1 table (FR-STATUS-02): the SPA
  // renders transition buttons from this list and owns no transition rules
  allowedTransitions: TicketStatus[];
  // server-computed §5.4 flag (FR-DUE-02): the SPA only styles it and owns
  // no activity rule — same principle as allowedTransitions
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

// One list row — exactly the FR-LIST-01 columns (S-06 design D1)
export interface TicketListItemDto {
  id: number;
  title: string;
  houseName: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
}

// Page envelope: total lets the list know when «Показати ще» must go away
export interface TicketListPageDto {
  items: TicketListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

// The ACTIVE preset expands server-side (design D2); the SPA treats it as
// an opaque extra option of the status filter.
export type TicketStatusFilter = TicketStatus | 'ACTIVE';

export type TicketListSort = 'createdAt' | 'dueDate';
export type TicketListOrder = 'asc' | 'desc';

// Filter/search/sort state of the list screen — lives in the URL query
// params (design D8); page depth deliberately does not.
export interface TicketListFilters {
  status: TicketStatusFilter | null;
  houseId: number | null;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  q: string;
  sort: TicketListSort;
  order: TicketListOrder;
}

export const DEFAULT_TICKET_LIST_FILTERS: TicketListFilters = {
  status: null,
  houseId: null,
  category: null,
  priority: null,
  q: '',
  sort: 'createdAt',
  order: 'desc',
};

const STATUS_FILTER_VALUES: readonly TicketStatusFilter[] = [
  'ACTIVE',
  'NEW',
  'IN_PROGRESS',
  'DONE',
  'CLOSED',
  'REJECTED',
];
const CATEGORY_VALUES: readonly TicketCategory[] = [
  'PLUMBING',
  'HEATING',
  'ELECTRICITY',
  'ELEVATOR',
  'ROOF_FACADE',
  'COMMON_AREAS',
  'GROUNDS',
  'ACCESS_SYSTEMS',
  'OTHER',
];
const PRIORITY_VALUES: readonly TicketPriority[] = [
  'EMERGENCY',
  'HIGH',
  'NORMAL',
];

function pick<T extends string>(
  value: string | null,
  values: readonly T[],
): T | null {
  return value !== null && values.includes(value as T) ? (value as T) : null;
}

// URL query params → filters (design D8). Unknown values are dropped to the
// default — the selects can only render known ones; a hand-edited URL never
// crashes the screen.
export function ticketListFiltersFromParams(
  params: { get(name: string): string | null } | undefined,
): TicketListFilters {
  if (!params) return DEFAULT_TICKET_LIST_FILTERS;
  const houseIdRaw = params.get('houseId');
  const sort =
    pick(params.get('sort'), ['createdAt', 'dueDate']) ?? 'createdAt';
  const defaultOrder = sort === 'createdAt' ? 'desc' : 'asc';
  return {
    status: pick(params.get('status'), STATUS_FILTER_VALUES),
    houseId: houseIdRaw && /^\d+$/.test(houseIdRaw) ? Number(houseIdRaw) : null,
    category: pick(params.get('category'), CATEGORY_VALUES),
    priority: pick(params.get('priority'), PRIORITY_VALUES),
    q: params.get('q')?.trim() ?? '',
    sort,
    order: pick(params.get('order'), ['asc', 'desc']) ?? defaultOrder,
  };
}

// Filters → URL query params: unset filters and the default sort stay out,
// so the URL mirrors only what the user actually narrowed down.
export function ticketListFiltersToParams(
  filters: TicketListFilters,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.status) params['status'] = filters.status;
  if (filters.houseId) params['houseId'] = String(filters.houseId);
  if (filters.category) params['category'] = filters.category;
  if (filters.priority) params['priority'] = filters.priority;
  if (filters.q) params['q'] = filters.q;
  if (filters.sort !== 'createdAt' || filters.order !== 'desc') {
    params['sort'] = filters.sort;
    params['order'] = filters.order;
  }
  return params;
}

// One feed item (PRD §5.5): a NOTE carries text, an EVENT carries a
// field/oldValue/newValue snapshot in locale-free wire values (enum keys,
// YYYY-MM-DD dates) — ticket-labels.ts composes the Ukrainian sentence.
export type FeedItemType = 'NOTE' | 'EVENT';

// ATTACHMENT events (S-07, FR-FEED-02) carry the original file name:
// add → newValue, delete → oldValue.
export type TicketEventField =
  | 'STATUS'
  | 'HOUSE'
  | 'CATEGORY'
  | 'PRIORITY'
  | 'EXECUTOR'
  | 'DUE_DATE'
  | 'ATTACHMENT';

export interface FeedItemDto {
  id: number;
  type: FeedItemType;
  authorId: number;
  authorName: string | null;
  text: string | null;
  field: TicketEventField | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

// Attachment metadata (S-07 design D1): the original file name only — the
// generated on-disk name never reaches the SPA (FR-ATTACH-03).
export interface AttachmentDto {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// Limits and types mirror the API validation (FR-ATTACH-01, Р-13); the API
// stays the enforcement point — these only give instant feedback.
export const ATTACHMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_PER_TICKET = 10;
export const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp';

// Binaries are served only through the API with the session cookie riding
// along same-origin (FR-ATTACH-03) — plain <img src> works as-is.
export function attachmentUrl(ticketId: number, attachmentId: number): string {
  return `/api/tickets/${ticketId}/attachments/${attachmentId}`;
}

/** Client-side pre-check before the upload starts (S-07 design D7):
 *  Ukrainian message for the snackbar, or null when the file may go. */
export function attachmentPrecheckError(
  file: { type: string; size: number },
  existingCount: number,
): string | null {
  if (existingCount >= ATTACHMENT_MAX_PER_TICKET) {
    return MESSAGES.ATTACHMENT_LIMIT_REACHED;
  }
  if (!ATTACHMENT_ACCEPT.split(',').includes(file.type)) {
    return MESSAGES.ATTACHMENT_TYPE_INVALID;
  }
  if (file.size > ATTACHMENT_MAX_FILE_SIZE) {
    return MESSAGES.ATTACHMENT_TOO_LARGE;
  }
  return null;
}

// Field limits mirror the API validation (tickets.service.ts)
export const TICKET_TITLE_MAX = 255;
export const TICKET_DESCRIPTION_MAX = 10_000;
export const TICKET_REQUESTER_NAME_MAX = 255;
export const TICKET_REQUESTER_PHONE_MAX = 32;
export const TICKET_EXECUTOR_MAX = 255;

// The due date is a calendar date: convert between the datepicker's local
// Date and the YYYY-MM-DD wire format without UTC round-trips (design D5) —
// toISOString() would shift the day for timezones east of UTC.
export function toWireDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromWireDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Mirror of the API error contract (api: ticket-errors.ts).
// The API is locale-free; Ukrainian copy lives here.
type TicketErrorCode =
  | 'TICKET_TITLE_INVALID'
  | 'TICKET_DESCRIPTION_INVALID'
  | 'TICKET_CATEGORY_INVALID'
  | 'TICKET_PRIORITY_INVALID'
  | 'TICKET_REQUESTER_INVALID'
  | 'TICKET_EXECUTOR_INVALID'
  | 'TICKET_DUE_DATE_INVALID'
  | 'TICKET_HOUSE_INVALID'
  | 'TICKET_STATUS_INVALID'
  | 'TICKET_NOTE_INVALID'
  | 'TICKET_QUERY_INVALID'
  | 'TICKET_TRANSITION_FORBIDDEN'
  | 'TICKET_HOUSE_NOT_FOUND'
  | 'TICKET_NOT_FOUND'
  | 'ATTACHMENT_FILE_REQUIRED'
  | 'ATTACHMENT_TYPE_INVALID'
  | 'ATTACHMENT_TOO_LARGE'
  | 'ATTACHMENT_LIMIT_REACHED'
  | 'ATTACHMENT_NOT_FOUND';

const MESSAGES: Record<TicketErrorCode, string> = {
  TICKET_TITLE_INVALID: 'Вкажіть назву заявки',
  TICKET_DESCRIPTION_INVALID: 'Опис задовгий — до 10 000 символів',
  TICKET_CATEGORY_INVALID: 'Оберіть категорію зі списку',
  TICKET_PRIORITY_INVALID: 'Оберіть пріоритет зі списку',
  TICKET_REQUESTER_INVALID: 'Поле заявника задовге',
  TICKET_EXECUTOR_INVALID: 'Поле виконавця задовге',
  TICKET_DUE_DATE_INVALID: 'Невірна дата цільового терміну',
  TICKET_HOUSE_INVALID: 'Оберіть будинок зі списку',
  TICKET_STATUS_INVALID: 'Невідомий статус заявки',
  TICKET_NOTE_INVALID: 'Введіть текст запису',
  TICKET_QUERY_INVALID: 'Невірні параметри списку — скиньте фільтри',
  TICKET_TRANSITION_FORBIDDEN:
    'Цей перехід статусу неможливий — оновіть сторінку',
  TICKET_HOUSE_NOT_FOUND: 'Будинок не знайдено',
  TICKET_NOT_FOUND: 'Заявку не знайдено',
  ATTACHMENT_FILE_REQUIRED: 'Оберіть файл для завантаження',
  ATTACHMENT_TYPE_INVALID: 'Лише фото JPEG, PNG або WebP',
  ATTACHMENT_TOO_LARGE: 'Файл завеликий — до 10 МБ',
  ATTACHMENT_LIMIT_REACHED: 'До заявки можна додати щонайбільше 10 фото',
  ATTACHMENT_NOT_FOUND: 'Фото не знайдено',
};

const FALLBACK_MESSAGE = 'Щось пішло не так. Спробуйте ще раз';

export function ticketErrorMessage(error: unknown): string {
  const code = (error as { error?: { code?: string } })?.error?.code;
  return MESSAGES[code as TicketErrorCode] ?? FALLBACK_MESSAGE;
}
