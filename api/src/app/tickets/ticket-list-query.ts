import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../generated/prisma/enums';
import { TicketError } from './ticket-errors';
import { ACTIVE_STATUSES } from './ticket-overdue';

// Parsed GET /tickets query (S-06 design D1): every field validated here so
// the service works with typed values only. Malformed input is a loud 400
// (TICKET_QUERY_INVALID, design D7) — never silently ignored.
export interface TicketListQuery {
  statuses?: TicketStatus[];
  houseId?: bigint;
  category?: TicketCategory;
  priority?: TicketPriority;
  search?: string;
  sort: 'createdAt' | 'dueDate';
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export const TICKET_LIST_PAGE_SIZE = 20;
const TICKET_LIST_PAGE_SIZE_MAX = 100;
const TICKET_LIST_SEARCH_MAX = 255;

// The status filter accepts concrete statuses or the ACTIVE preset, which
// expands server-side (design D2) — the client owns no §5.1 activity rule.
const ACTIVE_STATUS_PRESET = 'ACTIVE';

const invalid = (message: string) =>
  new TicketError('TICKET_QUERY_INVALID', message);

// Express query values are strings, arrays (repeated params) or nested
// objects; only a single plain string is a well-formed param here. An empty
// string means "filter not set" (a cleared select) and reads as absent.
function optionalParam(raw: unknown, name: string): string | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (typeof raw !== 'string') {
    throw invalid(`${name} must be a single value`);
  }
  return raw;
}

function parseStatuses(raw: unknown): TicketStatus[] | undefined {
  const value = optionalParam(raw, 'status');
  if (value === undefined) return undefined;
  if (value === ACTIVE_STATUS_PRESET) return [...ACTIVE_STATUSES];
  const statuses = Object.values(TicketStatus);
  const parts = value.split(',');
  for (const part of parts) {
    if (!statuses.includes(part as TicketStatus)) {
      throw invalid(`Unknown status filter value: ${part}`);
    }
  }
  return parts as TicketStatus[];
}

function parseEnumParam<T extends string>(
  raw: unknown,
  name: string,
  values: readonly T[],
): T | undefined {
  const value = optionalParam(raw, name);
  if (value === undefined) return undefined;
  if (!values.includes(value as T)) {
    throw invalid(`Unknown ${name} filter value: ${value}`);
  }
  return value as T;
}

function parseHouseId(raw: unknown): bigint | undefined {
  const value = optionalParam(raw, 'houseId');
  if (value === undefined) return undefined;
  if (!/^\d{1,18}$/.test(value)) {
    throw invalid('houseId must be a positive integer');
  }
  return BigInt(value);
}

function parseSearch(raw: unknown): string | undefined {
  const value = optionalParam(raw, 'q');
  if (value === undefined) return undefined;
  const search = value.trim();
  if (search.length > TICKET_LIST_SEARCH_MAX) {
    throw invalid(`q is longer than ${TICKET_LIST_SEARCH_MAX} characters`);
  }
  return search || undefined;
}

function parsePositiveInt(
  raw: unknown,
  name: string,
  fallback: number,
  max: number,
): number {
  const value = optionalParam(raw, name);
  if (value === undefined) return fallback;
  if (!/^\d{1,9}$/.test(value)) {
    throw invalid(`${name} must be a positive integer`);
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > max) {
    throw invalid(`${name} must be between 1 and ${max}`);
  }
  return parsed;
}

export function parseTicketListQuery(
  raw: Record<string, unknown>,
): TicketListQuery {
  const sort =
    parseEnumParam(raw['sort'], 'sort', ['createdAt', 'dueDate'] as const) ??
    'createdAt';
  // newest first by default (FR-LIST-04); an explicit due-date sort defaults
  // to ascending — "what burns soonest" is the natural reading direction
  const order =
    parseEnumParam(raw['order'], 'order', ['asc', 'desc'] as const) ??
    (sort === 'createdAt' ? 'desc' : 'asc');
  return {
    statuses: parseStatuses(raw['status']),
    houseId: parseHouseId(raw['houseId']),
    category: parseEnumParam(
      raw['category'],
      'category',
      Object.values(TicketCategory),
    ),
    priority: parseEnumParam(
      raw['priority'],
      'priority',
      Object.values(TicketPriority),
    ),
    search: parseSearch(raw['q']),
    sort,
    order,
    page: parsePositiveInt(raw['page'], 'page', 1, Number.MAX_SAFE_INTEGER),
    pageSize: parsePositiveInt(
      raw['pageSize'],
      'pageSize',
      TICKET_LIST_PAGE_SIZE,
      TICKET_LIST_PAGE_SIZE_MAX,
    ),
  };
}
