import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { HouseModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { HouseError } from './house-errors';

export const HOUSE_NAME_MAX = 255;
export const HOUSE_NOTE_MAX = 1000;

// Validation lives in the service, no class-validator (BC-PRIN-01, same as
// auth): name/address is one required text line (FR-HOUSE-01), note optional.
function normalizeName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) {
    throw new HouseError('HOUSE_NAME_INVALID', 'Name/address is required');
  }
  if (name.length > HOUSE_NAME_MAX) {
    throw new HouseError(
      'HOUSE_NAME_INVALID',
      `Name/address is longer than ${HOUSE_NAME_MAX} characters`,
    );
  }
  return name;
}

function normalizeNote(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new HouseError('HOUSE_NOTE_INVALID', 'Note must be text');
  }
  const note = value.trim();
  if (note.length > HOUSE_NOTE_MAX) {
    throw new HouseError(
      'HOUSE_NOTE_INVALID',
      `Note is longer than ${HOUSE_NOTE_MAX} characters`,
    );
  }
  return note || null;
}

// Route :id → BigInt; anything non-numeric is simply "not found" — the same
// 404 as a missing or foreign house (FR-ACCESS-01).
function parseHouseId(raw: string): bigint | null {
  if (!/^\d{1,18}$/.test(raw)) return null;
  return BigInt(raw);
}

const notFound = () =>
  new HouseError('HOUSE_NOT_FOUND', 'House does not exist');

const hasTickets = () =>
  new HouseError(
    'HOUSE_HAS_TICKETS',
    'House has tickets and cannot be deleted',
  );

export interface HouseInput {
  name?: unknown;
  note?: unknown;
}

@Injectable()
export class HousesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: bigint): Promise<HouseModel[]> {
    return this.prisma.house.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: bigint, input: HouseInput): Promise<HouseModel> {
    return this.prisma.house.create({
      data: {
        userId,
        name: normalizeName(input?.name),
        note: normalizeNote(input?.note),
      },
    });
  }

  // Owner check idiom (design D2, the precedent for S-04+): every id-scoped
  // query filters by `id AND user_id` in one statement — zero rows means 404,
  // identical for "missing" and "foreign" (FR-ACCESS-01, NFR-SEC-03).
  async get(userId: bigint, rawId: string): Promise<HouseModel> {
    const id = parseHouseId(rawId);
    const house = id
      ? await this.prisma.house.findFirst({ where: { id, userId } })
      : null;
    if (!house) throw notFound();
    return house;
  }

  async update(
    userId: bigint,
    rawId: string,
    input: HouseInput,
  ): Promise<HouseModel> {
    const id = parseHouseId(rawId);
    if (!id) throw notFound();
    const data: { name?: string; note?: string | null } = {};
    if (input && 'name' in input) data.name = normalizeName(input.name);
    if (input && 'note' in input) data.note = normalizeNote(input.note);
    // an effectively empty patch is a no-op: updateMany with empty data
    // reports count 0 and would wrongly 404 the owner (S-04 smoke finding)
    if (Object.keys(data).length === 0) return this.get(userId, rawId);
    // updateMany applies the owner filter atomically; count 0 → 404
    const { count } = await this.prisma.house.updateMany({
      where: { id, userId },
      data,
    });
    if (count === 0) throw notFound();
    return this.get(userId, rawId);
  }

  // FR-HOUSE-02: a house with at least one ticket cannot be deleted. The
  // count check is the deterministic, testable path; the FK onDelete:
  // Restrict is the race backstop — a ticket created between the count and
  // the delete surfaces as P2003 and maps to the same refusal (S-04 D3).
  async remove(userId: bigint, rawId: string): Promise<void> {
    const id = parseHouseId(rawId);
    if (!id) throw notFound();
    const tickets = await this.prisma.ticket.count({
      where: { houseId: id, house: { userId } },
    });
    if (tickets > 0) throw hasTickets();
    try {
      const { count } = await this.prisma.house.deleteMany({
        where: { id, userId },
      });
      if (count === 0) throw notFound();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw hasTickets();
      }
      throw error;
    }
  }
}
