import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  TicketCategory,
  TicketEventField,
  TicketPriority,
  TicketStatus,
} from '../../generated/prisma/enums';
import type {
  HouseModel,
  TicketFeedItemModel,
  TicketModel,
  UserModel,
} from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { TicketError } from './ticket-errors';
import type { TicketListQuery } from './ticket-list-query';

export const TICKET_TITLE_MAX = 255;
export const TICKET_DESCRIPTION_MAX = 10_000;
export const TICKET_REQUESTER_NAME_MAX = 255;
export const TICKET_REQUESTER_PHONE_MAX = 32;
export const TICKET_EXECUTOR_MAX = 255;
export const TICKET_NOTE_MAX = 10_000;

// The card payload joins the house name in (design D2) — no client stitching.
export type TicketWithHouse = TicketModel & { house: HouseModel };

// Feed items carry their author for display (FR-FEED-01).
export type FeedItemWithAuthor = TicketFeedItemModel & { author: UserModel };

// The PRD §5.1 transition table — the single source of truth for
// FR-STATUS-02. The API enforces it here; the SPA only renders the
// `allowedTransitions` the card payload computes from the same const, so
// there is no client-side copy to drift. CLOSED and REJECTED are terminal.
export const ALLOWED_TRANSITIONS: Record<
  TicketStatus,
  readonly TicketStatus[]
> = {
  NEW: [TicketStatus.IN_PROGRESS, TicketStatus.REJECTED],
  IN_PROGRESS: [TicketStatus.DONE, TicketStatus.REJECTED],
  DONE: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  CLOSED: [],
  REJECTED: [],
};

// Validation lives in the service, no class-validator (BC-PRIN-01, same as
// houses). Field rules per FR-TICKET-01 and design D2.
function normalizeTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title) {
    throw new TicketError('TICKET_TITLE_INVALID', 'Title is required');
  }
  if (title.length > TICKET_TITLE_MAX) {
    throw new TicketError(
      'TICKET_TITLE_INVALID',
      `Title is longer than ${TICKET_TITLE_MAX} characters`,
    );
  }
  return title;
}

function optionalText(
  max: number,
  code:
    | 'TICKET_DESCRIPTION_INVALID'
    | 'TICKET_REQUESTER_INVALID'
    | 'TICKET_EXECUTOR_INVALID',
  label: string,
): (value: unknown) => string | null {
  return (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
      throw new TicketError(code, `${label} must be text`);
    }
    const text = value.trim();
    if (text.length > max) {
      throw new TicketError(code, `${label} is longer than ${max} characters`);
    }
    return text || null;
  };
}

function normalizeCategory(value: unknown): TicketCategory {
  if (
    typeof value === 'string' &&
    Object.values(TicketCategory).includes(value as TicketCategory)
  ) {
    return value as TicketCategory;
  }
  throw new TicketError('TICKET_CATEGORY_INVALID', 'Category is required');
}

function normalizePriority(value: unknown): TicketPriority {
  if (
    typeof value === 'string' &&
    Object.values(TicketPriority).includes(value as TicketPriority)
  ) {
    return value as TicketPriority;
  }
  throw new TicketError('TICKET_PRIORITY_INVALID', 'Unknown priority');
}

// Due date travels as a plain YYYY-MM-DD calendar date (design D5): validate
// the shape, then require the parsed date to round-trip — V8 silently rolls
// impossible dates over (Feb 31 → Mar 3), which must be a 400, not a mutation.
function normalizeDueDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    if (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    ) {
      return date;
    }
  }
  throw new TicketError(
    'TICKET_DUE_DATE_INVALID',
    'Due date must be a valid YYYY-MM-DD date',
  );
}

// houseId arrives in the JSON body as a number; a missing or malformed value
// is a 400 shape error, while a well-formed id that isn't the owner's house
// answers 404 (TICKET_HOUSE_NOT_FOUND) — same parity rule as FR-ACCESS-01.
function parseBodyHouseId(value: unknown): bigint {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return BigInt(value);
  }
  throw new TicketError('TICKET_HOUSE_INVALID', 'House is required');
}

// Route :id → BigInt; anything non-numeric is simply "not found" — the same
// 404 as a missing or foreign object (FR-ACCESS-01). Shared with the
// attachments module (S-07), which applies the same rule to its ids.
export function parseRouteId(raw: string): bigint | null {
  if (!/^\d{1,18}$/.test(raw)) return null;
  return BigInt(raw);
}

// A transition target that is not a status at all is a 400 shape error;
// a real status the §5.1 table forbids from the current one is a 409.
function normalizeTargetStatus(value: unknown): TicketStatus {
  if (
    typeof value === 'string' &&
    Object.values(TicketStatus).includes(value as TicketStatus)
  ) {
    return value as TicketStatus;
  }
  throw new TicketError('TICKET_STATUS_INVALID', 'Unknown ticket status');
}

function normalizeNote(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new TicketError('TICKET_NOTE_INVALID', 'Note text is required');
  }
  if (text.length > TICKET_NOTE_MAX) {
    throw new TicketError(
      'TICKET_NOTE_INVALID',
      `Note is longer than ${TICKET_NOTE_MAX} characters`,
    );
  }
  return text;
}

// Event values are locale-free snapshots (design D1): enum keys as-is, due
// dates as YYYY-MM-DD, null for an empty value; the SPA composes Ukrainian.
function dateToWire(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

// Prisma does not escape LIKE wildcards in contains() — a literal % or _
// in the search term would act as a wildcard instead of text (FR-LIST-03
// is a search for literal text; S-06 review finding).
function escapeLikeWildcards(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

const notFound = () =>
  new TicketError('TICKET_NOT_FOUND', 'Ticket does not exist');

const houseNotFound = () =>
  new TicketError('TICKET_HOUSE_NOT_FOUND', 'House does not exist');

function isForeignKeyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}

export interface TicketInput {
  title?: unknown;
  description?: unknown;
  houseId?: unknown;
  category?: unknown;
  priority?: unknown;
  requesterName?: unknown;
  requesterPhone?: unknown;
  executor?: unknown;
  dueDate?: unknown;
  // status is deliberately absent: creation is always NEW and PATCH ignores
  // it — transitions get their own endpoint in S-05 (spec requirement).
}

// One normalizer per writable FR-TICKET-01 field (houseId aside — it needs
// the async owner check). create() runs all of them; update() only those
// whose field is present in the body, so PATCH leaves the rest untouched.
const FIELD_NORMALIZERS = {
  title: normalizeTitle,
  description: optionalText(
    TICKET_DESCRIPTION_MAX,
    'TICKET_DESCRIPTION_INVALID',
    'Description',
  ),
  category: normalizeCategory,
  priority: normalizePriority,
  requesterName: optionalText(
    TICKET_REQUESTER_NAME_MAX,
    'TICKET_REQUESTER_INVALID',
    'Requester name',
  ),
  requesterPhone: optionalText(
    TICKET_REQUESTER_PHONE_MAX,
    'TICKET_REQUESTER_INVALID',
    'Requester phone',
  ),
  executor: optionalText(
    TICKET_EXECUTOR_MAX,
    'TICKET_EXECUTOR_INVALID',
    'Executor',
  ),
  dueDate: normalizeDueDate,
} as const;

type TicketField = keyof typeof FIELD_NORMALIZERS;
type TicketData = Prisma.TicketUpdateManyMutationInput & { houseId?: bigint };

function normalizeFields(body: TicketInput, fields: TicketField[]): TicketData {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    data[field] = FIELD_NORMALIZERS[field](body[field]);
  }
  return data as TicketData;
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // Owner check for the referenced house uses the same one-query idiom as
  // the ticket itself (`id AND user_id`): zero rows → 404 with an identical
  // body for "missing" and "foreign" (FR-ACCESS-01, NFR-SEC-03).
  private async resolveOwnHouseId(
    userId: bigint,
    value: unknown,
  ): Promise<bigint> {
    const houseId = parseBodyHouseId(value);
    const house = await this.prisma.house.findFirst({
      where: { id: houseId, userId },
      select: { id: true },
    });
    if (!house) throw houseNotFound();
    return houseId;
  }

  async create(userId: bigint, input: TicketInput): Promise<TicketWithHouse> {
    const body = input ?? {};
    const houseId = await this.resolveOwnHouseId(userId, body.houseId);
    // every field goes through its normalizer; priority is left to the
    // schema default (NORMAL, PRD §5.3) when absent
    const fields: TicketField[] = [
      'title',
      'category',
      'description',
      'requesterName',
      'requesterPhone',
      'executor',
      'dueDate',
    ];
    if (body.priority !== undefined) fields.push('priority');
    const data = {
      userId,
      houseId,
      ...normalizeFields(body, fields),
    } as Prisma.TicketUncheckedCreateInput;
    try {
      return await this.prisma.ticket.create({
        data,
        include: { house: true },
      });
    } catch (error) {
      // FK backstop: the house vanished between the owner check and the
      // insert — same 404 as a missing house, no 500
      if (isForeignKeyError(error)) throw houseNotFound();
      throw error;
    }
  }

  // Owner-scoped list (FR-LIST-01…04): AND-combined filters, LIKE search
  // (case-insensitive via the MySQL *_ai_ci collation), stable ordering with
  // an id tie-break so pagination never shuffles equal keys (design D4/D5),
  // page slice + total in one transaction. The query arrives pre-validated
  // (parseTicketListQuery) — this method sees typed values only.
  async list(
    userId: bigint,
    query: TicketListQuery,
  ): Promise<{ items: TicketWithHouse[]; total: number }> {
    const where: Prisma.TicketWhereInput = { userId };
    if (query.statuses) where.status = { in: query.statuses };
    if (query.houseId !== undefined) where.houseId = query.houseId;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;
    if (query.search) {
      // FR-LIST-03: «заявник» on a ticket is the name+phone pair, so both
      // columns take part in the substring match
      const contains = escapeLikeWildcards(query.search);
      where.OR = [
        { title: { contains } },
        { description: { contains } },
        { requesterName: { contains } },
        { requesterPhone: { contains } },
        { executor: { contains } },
      ];
    }
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      query.sort === 'dueDate'
        ? { dueDate: { sort: query.order, nulls: 'last' } }
        : { createdAt: query.order },
      { id: 'desc' },
    ];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { house: true },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { items, total };
  }

  async get(userId: bigint, rawId: string): Promise<TicketWithHouse> {
    const id = parseRouteId(rawId);
    const ticket = id
      ? await this.prisma.ticket.findFirst({
          where: { id, userId },
          include: { house: true },
        })
      : null;
    if (!ticket) throw notFound();
    return ticket;
  }

  // PATCH updates only the fields present in the body; `dueDate: null`
  // clears the date (FR-DUE-01); status is not read from the body. Changes
  // of the five FR-TICKET-03 fields (house, category, priority, executor,
  // due date) are recorded as system EVENTs in the same transaction as the
  // UPDATE — a change without its event can never be observed. Untracked
  // fields (title, description, requester) produce no events by requirement.
  async update(
    userId: bigint,
    rawId: string,
    input: TicketInput,
  ): Promise<TicketWithHouse> {
    const id = parseRouteId(rawId);
    if (!id) throw notFound();
    const body = input ?? {};
    // only fields present in the body are normalized and written; status is
    // not in FIELD_NORMALIZERS, so a supplied status never reaches the DB
    const present = (Object.keys(FIELD_NORMALIZERS) as TicketField[]).filter(
      (field) => field in body,
    );
    const data: TicketData = normalizeFields(body, present);
    if ('houseId' in body) {
      // shape check here (400); the ownership check runs inside the
      // transaction where the new house name snapshot is read anyway
      data.houseId = parseBodyHouseId(body.houseId);
    }
    // an effectively empty patch (e.g. only an ignored status) is a no-op:
    // updateMany with empty data reports count 0 and would 404 the owner
    if (Object.keys(data).length === 0) return this.get(userId, rawId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.ticket.findFirst({
          where: { id, userId },
          include: { house: true },
        });
        if (!current) throw notFound();
        const events = await this.diffTrackedFields(tx, userId, current, data);
        const { count } = await tx.ticket.updateMany({
          where: { id, userId },
          data,
        });
        if (count === 0) throw notFound();
        if (events.length > 0) {
          await tx.ticketFeedItem.createMany({ data: events });
        }
        return (await tx.ticket.findFirst({
          where: { id, userId },
          include: { house: true },
        })) as TicketWithHouse;
      });
    } catch (error) {
      if (isForeignKeyError(error)) throw houseNotFound();
      throw error;
    }
  }

  // One EVENT per actually-changed tracked field (FR-TICKET-03); same-value
  // writes are skipped. House events snapshot both *names* (design D1) — the
  // new one is read here, which doubles as the in-transaction owner check.
  private async diffTrackedFields(
    tx: Prisma.TransactionClient,
    userId: bigint,
    current: TicketWithHouse,
    data: TicketData,
  ): Promise<Prisma.TicketFeedItemCreateManyInput[]> {
    // tracked scalar fields share one shape: enum keys / plain text on both
    // sides; dueDate and house need value conversion first
    const changes: Array<[TicketEventField, string | null, string | null]> = [];
    if (data.houseId !== undefined && data.houseId !== current.houseId) {
      const newName = await this.resolveHouseName(tx, userId, data.houseId);
      changes.push(['HOUSE', current.house.name, newName]);
    }
    const scalars = [
      ['CATEGORY', 'category'],
      ['PRIORITY', 'priority'],
      ['EXECUTOR', 'executor'],
    ] as const satisfies ReadonlyArray<
      [TicketEventField, keyof TicketModel & keyof TicketData]
    >;
    for (const [field, key] of scalars) {
      const next = data[key] as string | null | undefined;
      if (next !== undefined && next !== current[key]) {
        changes.push([field, current[key], next]);
      }
    }
    if (data.dueDate !== undefined) {
      const oldValue = dateToWire(current.dueDate);
      const newValue = dateToWire(data.dueDate as Date | null);
      if (oldValue !== newValue) changes.push(['DUE_DATE', oldValue, newValue]);
    }
    return changes.map(([field, oldValue, newValue]) => ({
      ticketId: current.id,
      authorId: userId,
      type: 'EVENT',
      field,
      oldValue,
      newValue,
    }));
  }

  private async resolveHouseName(
    tx: Prisma.TransactionClient,
    userId: bigint,
    houseId: bigint,
  ): Promise<string> {
    const house = await tx.house.findFirst({
      where: { id: houseId, userId },
      select: { name: true },
    });
    if (!house) throw houseNotFound();
    return house.name;
  }

  // Status changes go only through here (FR-STATUS-02): the §5.1 table check
  // plus a status-guarded updateMany inside one transaction — a concurrent
  // transition loses with the same 409 instead of blindly overwriting, and
  // the STATUS event lands atomically with the change (FR-STATUS-03).
  async transition(
    userId: bigint,
    rawId: string,
    input: { to?: unknown } | undefined,
  ): Promise<TicketWithHouse> {
    const id = parseRouteId(rawId);
    if (!id) throw notFound();
    const to = normalizeTargetStatus(input?.to);
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id, userId },
        select: { status: true },
      });
      if (!ticket) throw notFound();
      const forbidden = () =>
        new TicketError(
          'TICKET_TRANSITION_FORBIDDEN',
          `Transition from ${ticket.status} to ${to} is not allowed`,
        );
      if (!ALLOWED_TRANSITIONS[ticket.status].includes(to)) throw forbidden();
      const { count } = await tx.ticket.updateMany({
        where: { id, userId, status: ticket.status },
        data: { status: to },
      });
      // count 0 = a concurrent transition moved the status after our read —
      // the stale request is rejected, not applied (spec requirement)
      if (count === 0) throw forbidden();
      await tx.ticketFeedItem.create({
        data: {
          ticketId: id,
          authorId: userId,
          type: 'EVENT',
          field: 'STATUS',
          oldValue: ticket.status,
          newValue: to,
        },
      });
      return (await tx.ticket.findFirst({
        where: { id, userId },
        include: { house: true },
      })) as TicketWithHouse;
    });
  }

  // Full chronological feed (PRD §5.5): ORDER BY id — auto-increment breaks
  // same-timestamp ties. No pagination at POC scale (design D2).
  async getFeed(userId: bigint, rawId: string): Promise<FeedItemWithAuthor[]> {
    const id = parseRouteId(rawId);
    const ticket = id
      ? await this.prisma.ticket.findFirst({
          where: { id, userId },
          select: { id: true },
        })
      : null;
    if (!ticket) throw notFound();
    return this.prisma.ticketFeedItem.findMany({
      where: { ticketId: id as bigint },
      orderBy: { id: 'asc' },
      include: { author: true },
    });
  }

  // Append-only user note (FR-FEED-01); there are no update/delete paths for
  // feed items anywhere in the service by design.
  async addNote(
    userId: bigint,
    rawId: string,
    input: { text?: unknown } | undefined,
  ): Promise<FeedItemWithAuthor> {
    const id = parseRouteId(rawId);
    if (!id) throw notFound();
    const text = normalizeNote(input?.text);
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!ticket) throw notFound();
    return this.prisma.ticketFeedItem.create({
      data: { ticketId: id, authorId: userId, type: 'NOTE', text },
      include: { author: true },
    });
  }
}
