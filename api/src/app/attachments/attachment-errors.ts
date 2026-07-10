import { HttpException, HttpStatus } from '@nestjs/common';

// Machine-readable error contract (same as ticket/house errors): the API
// stays locale-free, the SPA maps codes to Ukrainian messages.
// ATTACHMENT_NOT_FOUND covers "missing", "foreign" and "file absent from
// disk" with an identical body — FR-ACCESS-01 forbids distinguishing them,
// and a DB↔disk mismatch must not leak storage details (design D6). The
// upload validation trio is 400 per FR-ATTACH-01/Р-13 (design D4).
export type AttachmentErrorCode =
  | 'ATTACHMENT_FILE_REQUIRED'
  | 'ATTACHMENT_TYPE_INVALID'
  | 'ATTACHMENT_TOO_LARGE'
  | 'ATTACHMENT_LIMIT_REACHED'
  | 'ATTACHMENT_NOT_FOUND';

const STATUS_BY_CODE: Record<AttachmentErrorCode, HttpStatus> = {
  ATTACHMENT_FILE_REQUIRED: HttpStatus.BAD_REQUEST,
  ATTACHMENT_TYPE_INVALID: HttpStatus.BAD_REQUEST,
  ATTACHMENT_TOO_LARGE: HttpStatus.BAD_REQUEST,
  ATTACHMENT_LIMIT_REACHED: HttpStatus.BAD_REQUEST,
  ATTACHMENT_NOT_FOUND: HttpStatus.NOT_FOUND,
};

export class AttachmentError extends HttpException {
  constructor(code: AttachmentErrorCode, message: string) {
    super({ code, message }, STATUS_BY_CODE[code]);
  }
}
