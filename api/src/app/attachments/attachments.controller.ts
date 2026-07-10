import { createReadStream } from 'node:fs';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  Header,
  HttpCode,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AttachmentModel } from '../../generated/prisma/models';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { AttachmentError } from './attachment-errors';
import {
  ATTACHMENT_MAX_FILE_SIZE,
  UploadedImageFile,
} from './attachment-validation';
import { AttachmentsService } from './attachments.service';

// Attachment metadata on the wire (design D1): the original file name only —
// the generated on-disk name never leaves the API (FR-ATTACH-03).
export interface AttachmentDto {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function toAttachmentDto(attachment: AttachmentModel): AttachmentDto {
  return {
    id: Number(attachment.id),
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt.toISOString(),
  };
}

// Multer aborts a bad multipart request before the handler runs and Nest
// surfaces it as a framework exception with the default body shape: 413 for
// an oversize file, 400 for a wrong/extra file field (LIMIT_UNEXPECTED_FILE
// etc.) — remap both to the locale-free { code, message } contract the SPA
// expects (design D4; slice review S-07, low). Scoped to the upload route
// via @UseFilters; service-thrown AttachmentError is a plain HttpException
// subclass, not BadRequestException, so it passes through untouched.
@Catch(PayloadTooLargeException, BadRequestException)
class AttachmentUploadErrorFilter implements ExceptionFilter {
  catch(exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const error =
      exception instanceof PayloadTooLargeException
        ? new AttachmentError(
            'ATTACHMENT_TOO_LARGE',
            `File is larger than ${ATTACHMENT_MAX_FILE_SIZE} bytes`,
          )
        : new AttachmentError(
            'ATTACHMENT_FILE_REQUIRED',
            'Send exactly one file in the "file" multipart field',
          );
    response.status(error.getStatus()).json(error.getResponse());
  }
}

// RFC 5987 value for Content-Disposition filename* — original names may be
// Cyrillic (design D6). encodeURIComponent covers all but a few attr-chars.
function rfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

// No @Public(): the global SessionGuard applies; every service call is
// scoped to req.user.id (FR-ACCESS-01, NFR-SEC-03). All routes keep the
// ticket in the path — ownership is always checked through it (design D1).
@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  // defParamCharset: multer decodes part headers as latin1 by default,
  // mangling Cyrillic original names; utf8 matches what browsers send.
  // Storage is unset on purpose — multer defaults to memory (design D3).
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ATTACHMENT_MAX_FILE_SIZE, files: 1 },
      defParamCharset: 'utf8',
    }),
  )
  @UseFilters(AttachmentUploadErrorFilter)
  async upload(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<AttachmentDto> {
    return toAttachmentDto(
      await this.attachments.upload(req.user.id, ticketId, file),
    );
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
  ): Promise<AttachmentDto[]> {
    const items = await this.attachments.list(req.user.id, ticketId);
    return items.map(toAttachmentDto);
  }

  // Streamed inline binary (FR-ATTACH-03, design D6). Attachments are
  // immutable, so the browser may cache them — but only privately
  // (owner-scoped data).
  @Get(':attachmentId')
  @Header('Cache-Control', 'private, max-age=3600')
  async download(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<StreamableFile> {
    const { attachment, path } = await this.attachments.getFile(
      req.user.id,
      ticketId,
      attachmentId,
    );
    return new StreamableFile(createReadStream(path), {
      type: attachment.mimeType,
      length: attachment.size,
      disposition: `inline; filename*=UTF-8''${rfc5987(attachment.fileName)}`,
    });
  }

  @Delete(':attachmentId')
  @HttpCode(200)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<{ ok: true }> {
    await this.attachments.remove(req.user.id, ticketId, attachmentId);
    return { ok: true };
  }
}
