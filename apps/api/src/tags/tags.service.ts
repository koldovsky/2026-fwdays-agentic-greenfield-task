import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Tag as TagRow } from '@prisma/client';
import type { Tag } from '@honeydo/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTagDto } from './dto/create-tag.dto';
import type { UpdateTagDto } from './dto/update-tag.dto';

/** Map a Prisma row to the framework-free `@honeydo/shared` contract. */
function toContract(row: TagRow): Tag {
  return { id: row.id, userId: row.userId, name: row.name, color: row.color };
}

/**
 * Tags service (FR-TAG-01/03). User-scoped CRUD with a case-insensitive unique name per
 * user. Deleting a tag detaches it from entries via the implicit m-to-n relation and
 * never deletes the entries themselves.
 */
@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's tags, alphabetical. */
  async list(userId: string): Promise<Tag[]> {
    const rows = await this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return rows.map(toContract);
  }

  /** Create a tag; reject a name the user already uses (case-insensitive). */
  async create(userId: string, dto: CreateTagDto): Promise<Tag> {
    const name = dto.name.trim();
    await this.assertNameFree(userId, name);
    const row = await this.prisma.tag.create({
      data: { userId, name, color: dto.color ?? null },
    });
    return toContract(row);
  }

  /** Rename and/or recolor a tag (FR-TAG-03). */
  async update(userId: string, id: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOwned(userId, id);
    const name = dto.name?.trim() ?? tag.name;
    if (
      dto.name !== undefined &&
      name.toLowerCase() !== tag.name.toLowerCase()
    ) {
      await this.assertNameFree(userId, name, id);
    }
    const row = await this.prisma.tag.update({
      where: { id },
      data: {
        name,
        color: dto.color === undefined ? tag.color : dto.color,
      },
    });
    return toContract(row);
  }

  /** Delete a tag; the implicit m-to-n detaches it from entries (FR-TAG-03). */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.tag.delete({ where: { id } });
  }

  /** Fetch a tag that belongs to the user, or 404 (BC-SCOPE-01). */
  private async findOwned(userId: string, id: string): Promise<TagRow> {
    const tag = await this.prisma.tag.findFirst({ where: { id, userId } });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  /** Reject a duplicate name (case-insensitive) for this user, optionally excluding one id. */
  private async assertNameFree(
    userId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.prisma.tag.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException('A tag with this name already exists.');
    }
  }
}
