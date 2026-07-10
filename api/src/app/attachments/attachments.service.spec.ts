import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { TicketError } from '../tickets/ticket-errors';
import { AttachmentError } from './attachment-errors';
import { file, JPEG_BYTES, PNG_BYTES } from './attachment-validation.spec';
import { AttachmentsService } from './attachments.service';

const OWNER = BigInt(1);
const TICKET = BigInt(42);
const ATTACHMENT = BigInt(9);

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (
      (error as TicketError | AttachmentError).getResponse() as {
        code: string;
      }
    ).code;
  }
}

describe('AttachmentsService', () => {
  const prismaMock = {
    ticket: { findFirst: jest.fn() },
    attachment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    ticketFeedItem: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  let dir: string;
  let service: AttachmentsService;

  const ownTicket = () =>
    prismaMock.ticket.findFirst.mockResolvedValue({ id: TICKET });

  const storedRow = () => ({
    id: ATTACHMENT,
    ticketId: TICKET,
    fileName: 'фото.jpg',
    storedName: 'stored.jpg',
    mimeType: 'image/jpeg',
    size: JPEG_BYTES.length,
    createdAt: new Date(),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) => callback(prismaMock),
    );
    dir = mkdtempSync(join(tmpdir(), 'servicedesk-attachments-'));
    service = new AttachmentsService(prismaMock as unknown as PrismaService, {
      dir,
    });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('upload', () => {
    it('writes the file and creates the row plus the ATTACHMENT feed event atomically (FR-ATTACH-01, FR-FEED-02)', async () => {
      ownTicket();
      prismaMock.attachment.count.mockResolvedValue(0);
      prismaMock.attachment.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          ...storedRow(),
          ...data,
        }),
      );
      const result = await service.upload(
        OWNER,
        '42',
        file({ originalname: 'фото кухні.jpg' }),
      );
      expect(result.fileName).toBe('фото кухні.jpg');
      const created = prismaMock.attachment.create.mock.calls[0][0].data;
      expect(created).toMatchObject({
        ticketId: TICKET,
        fileName: 'фото кухні.jpg',
        mimeType: 'image/jpeg',
        size: JPEG_BYTES.length,
      });
      // the generated on-disk name is a UUID + extension, and the file exists
      expect(created.storedName).toMatch(/^[0-9a-f-]{36}\.jpg$/);
      expect(existsSync(join(dir, created.storedName))).toBe(true);
      expect(prismaMock.ticketFeedItem.create).toHaveBeenCalledWith({
        data: {
          ticketId: TICKET,
          authorId: OWNER,
          type: 'EVENT',
          field: 'ATTACHMENT',
          newValue: 'фото кухні.jpg',
        },
      });
    });

    it('answers TICKET_NOT_FOUND for a foreign or missing ticket before touching anything (FR-ACCESS-01)', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      expect(await codeOf(service.upload(OWNER, '42', file({})))).toBe(
        'TICKET_NOT_FOUND',
      );
      expect(prismaMock.attachment.count).not.toHaveBeenCalled();
      expect(readdirSync(dir)).toHaveLength(0);
    });

    it('rejects the 11th attachment without writing a file (FR-ATTACH-01)', async () => {
      ownTicket();
      prismaMock.attachment.count.mockResolvedValue(10);
      expect(await codeOf(service.upload(OWNER, '42', file({})))).toBe(
        'ATTACHMENT_LIMIT_REACHED',
      );
      expect(readdirSync(dir)).toHaveLength(0);
    });

    it('rejects an invalid type without writing a file (Р-13)', async () => {
      ownTicket();
      expect(
        await codeOf(
          service.upload(OWNER, '42', file({ mimetype: 'image/heic' })),
        ),
      ).toBe('ATTACHMENT_TYPE_INVALID');
      expect(readdirSync(dir)).toHaveLength(0);
    });

    it('unlinks the written file when the transaction fails (design D3)', async () => {
      ownTicket();
      prismaMock.attachment.count.mockResolvedValue(0);
      prismaMock.$transaction.mockRejectedValue(new Error('db down'));
      await expect(service.upload(OWNER, '42', file({}))).rejects.toThrow(
        'db down',
      );
      expect(readdirSync(dir)).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('returns the ticket attachments in id order', async () => {
      ownTicket();
      prismaMock.attachment.findMany.mockResolvedValue([storedRow()]);
      await service.list(OWNER, '42');
      expect(prismaMock.attachment.findMany).toHaveBeenCalledWith({
        where: { ticketId: TICKET },
        orderBy: { id: 'asc' },
      });
    });

    it('answers TICKET_NOT_FOUND for a foreign ticket (FR-ACCESS-01)', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      expect(await codeOf(service.list(OWNER, '42'))).toBe('TICKET_NOT_FOUND');
    });
  });

  describe('getFile', () => {
    it('returns the metadata and on-disk path for the owner (FR-ATTACH-03)', async () => {
      prismaMock.attachment.findFirst.mockResolvedValue(storedRow());
      await writeFile(join(dir, 'stored.jpg'), JPEG_BYTES);
      const { attachment, path } = await service.getFile(OWNER, '42', '9');
      expect(attachment.fileName).toBe('фото.jpg');
      expect(path).toBe(join(dir, 'stored.jpg'));
      // the ownership check rides the relation filter in one query
      expect(prismaMock.attachment.findFirst).toHaveBeenCalledWith({
        where: {
          id: ATTACHMENT,
          ticketId: TICKET,
          ticket: { userId: OWNER },
        },
      });
    });

    it('collapses foreign/missing/malformed ids into ATTACHMENT_NOT_FOUND (FR-ACCESS-01)', async () => {
      prismaMock.attachment.findFirst.mockResolvedValue(null);
      expect(await codeOf(service.getFile(OWNER, '42', '9'))).toBe(
        'ATTACHMENT_NOT_FOUND',
      );
      expect(await codeOf(service.getFile(OWNER, '42', 'abc'))).toBe(
        'ATTACHMENT_NOT_FOUND',
      );
    });

    it('answers the same 404 when the disk file is missing (design D6)', async () => {
      prismaMock.attachment.findFirst.mockResolvedValue(storedRow());
      expect(await codeOf(service.getFile(OWNER, '42', '9'))).toBe(
        'ATTACHMENT_NOT_FOUND',
      );
    });
  });

  describe('remove', () => {
    it('deletes the row, appends the ATTACHMENT event and unlinks the file (FR-ATTACH-02, FR-FEED-02)', async () => {
      prismaMock.attachment.findFirst.mockResolvedValue(storedRow());
      prismaMock.attachment.deleteMany.mockResolvedValue({ count: 1 });
      await writeFile(join(dir, 'stored.jpg'), PNG_BYTES);
      await service.remove(OWNER, '42', '9');
      expect(prismaMock.ticketFeedItem.create).toHaveBeenCalledWith({
        data: {
          ticketId: TICKET,
          authorId: OWNER,
          type: 'EVENT',
          field: 'ATTACHMENT',
          oldValue: 'фото.jpg',
        },
      });
      expect(existsSync(join(dir, 'stored.jpg'))).toBe(false);
    });

    it('answers ATTACHMENT_NOT_FOUND when a concurrent delete already won', async () => {
      prismaMock.attachment.findFirst.mockResolvedValue(storedRow());
      prismaMock.attachment.deleteMany.mockResolvedValue({ count: 0 });
      expect(await codeOf(service.remove(OWNER, '42', '9'))).toBe(
        'ATTACHMENT_NOT_FOUND',
      );
      expect(prismaMock.ticketFeedItem.create).not.toHaveBeenCalled();
    });
  });
});
