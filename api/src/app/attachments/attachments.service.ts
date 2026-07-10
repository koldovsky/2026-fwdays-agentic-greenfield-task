import { randomUUID } from 'node:crypto';
import { stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AttachmentModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { TicketError } from '../tickets/ticket-errors';
import { parseRouteId } from '../tickets/tickets.service';
import { AttachmentError } from './attachment-errors';
import {
  ATTACHMENT_MAX_PER_TICKET,
  extensionForMime,
  normalizeFileName,
  UploadedImageFile,
  validateUploadedImage,
} from './attachment-validation';
import { ATTACHMENTS_CONFIG, AttachmentsConfig } from './attachments-config';

const ticketNotFound = () =>
  new TicketError('TICKET_NOT_FOUND', 'Ticket does not exist');

// One 404 for "missing", "foreign" and "file absent from disk" (FR-ACCESS-01,
// design D6) — storage details never leak into the response.
const attachmentNotFound = () =>
  new AttachmentError('ATTACHMENT_NOT_FOUND', 'Attachment does not exist');

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ATTACHMENTS_CONFIG) private readonly config: AttachmentsConfig,
  ) {}

  // Ticket-level routes (upload, list) answer TICKET_NOT_FOUND for a foreign
  // or missing ticket — same parity as the feed endpoints (FR-ACCESS-01).
  private async resolveOwnTicketId(
    userId: bigint,
    rawTicketId: string,
  ): Promise<bigint> {
    const id = parseRouteId(rawTicketId);
    const ticket = id
      ? await this.prisma.ticket.findFirst({
          where: { id, userId },
          select: { id: true },
        })
      : null;
    if (!ticket) throw ticketNotFound();
    return ticket.id;
  }

  // Attachment-level routes (binary, delete) collapse every miss — foreign
  // ticket included — into ATTACHMENT_NOT_FOUND: the ownership check rides
  // the relation filter in one query (design D1).
  private async resolveOwnAttachment(
    userId: bigint,
    rawTicketId: string,
    rawAttachmentId: string,
  ): Promise<AttachmentModel> {
    const ticketId = parseRouteId(rawTicketId);
    const attachmentId = parseRouteId(rawAttachmentId);
    const attachment =
      ticketId && attachmentId
        ? await this.prisma.attachment.findFirst({
            where: {
              id: attachmentId,
              ticketId,
              ticket: { userId },
            },
          })
        : null;
    if (!attachment) throw attachmentNotFound();
    return attachment;
  }

  async list(userId: bigint, rawTicketId: string): Promise<AttachmentModel[]> {
    const ticketId = await this.resolveOwnTicketId(userId, rawTicketId);
    return this.prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { id: 'asc' },
    });
  }

  // Upload (FR-ATTACH-01, design D3): validate everything against the
  // in-memory buffer first, write the file, then create the DB row and the
  // feed EVENT in one transaction (FR-FEED-02) — the file is unlinked if the
  // transaction fails, so a stored file without its row can only be leftover
  // noise, never a served orphan.
  async upload(
    userId: bigint,
    rawTicketId: string,
    uploaded: UploadedImageFile | undefined,
  ): Promise<AttachmentModel> {
    const ticketId = await this.resolveOwnTicketId(userId, rawTicketId);
    const file = validateUploadedImage(uploaded);
    const count = await this.prisma.attachment.count({ where: { ticketId } });
    if (count >= ATTACHMENT_MAX_PER_TICKET) {
      throw new AttachmentError(
        'ATTACHMENT_LIMIT_REACHED',
        `A ticket holds at most ${ATTACHMENT_MAX_PER_TICKET} attachments`,
      );
    }
    const fileName = normalizeFileName(file.originalname, file.mimetype);
    const storedName = `${randomUUID()}.${extensionForMime(file.mimetype)}`;
    await writeFile(join(this.config.dir, storedName), file.buffer);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            ticketId,
            fileName,
            storedName,
            mimeType: file.mimetype,
            size: file.size,
          },
        });
        // add → newValue = original file name (design D5)
        await tx.ticketFeedItem.create({
          data: {
            ticketId,
            authorId: userId,
            type: 'EVENT',
            field: 'ATTACHMENT',
            newValue: fileName,
          },
        });
        return attachment;
      });
    } catch (error) {
      await this.unlinkQuietly(storedName, 'failed upload transaction');
      throw error;
    }
  }

  // Binary for streaming (FR-ATTACH-03): metadata plus the absolute path,
  // verified on disk — a DB↔disk mismatch answers the same 404 and is only
  // logged server-side (design D6).
  async getFile(
    userId: bigint,
    rawTicketId: string,
    rawAttachmentId: string,
  ): Promise<{ attachment: AttachmentModel; path: string }> {
    const attachment = await this.resolveOwnAttachment(
      userId,
      rawTicketId,
      rawAttachmentId,
    );
    const path = join(this.config.dir, attachment.storedName);
    try {
      await stat(path);
    } catch {
      this.logger.error(
        `attachment ${attachment.id} has no file on disk (${attachment.storedName})`,
      );
      throw attachmentNotFound();
    }
    return { attachment, path };
  }

  // Delete (FR-ATTACH-02): DB row and feed EVENT go atomically; the disk
  // unlink follows best-effort — once the row is gone the file is
  // unreachable, a leftover is disk noise, not data (design Risks).
  async remove(
    userId: bigint,
    rawTicketId: string,
    rawAttachmentId: string,
  ): Promise<void> {
    const attachment = await this.resolveOwnAttachment(
      userId,
      rawTicketId,
      rawAttachmentId,
    );
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.attachment.deleteMany({
        where: { id: attachment.id, ticketId: attachment.ticketId },
      });
      // count 0 = a concurrent delete won the race — same invisible object
      if (count === 0) throw attachmentNotFound();
      // delete → oldValue = original file name (design D5)
      await tx.ticketFeedItem.create({
        data: {
          ticketId: attachment.ticketId,
          authorId: userId,
          type: 'EVENT',
          field: 'ATTACHMENT',
          oldValue: attachment.fileName,
        },
      });
    });
    await this.unlinkQuietly(attachment.storedName, 'deleted attachment');
  }

  private async unlinkQuietly(
    storedName: string,
    context: string,
  ): Promise<void> {
    try {
      await unlink(join(this.config.dir, storedName));
    } catch (error) {
      this.logger.error(
        `could not unlink ${storedName} (${context}): ${String(error)}`,
      );
    }
  }
}
