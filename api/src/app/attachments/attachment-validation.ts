import { AttachmentError } from './attachment-errors';

// FR-ATTACH-01 limits; types per Р-13 (JPEG/PNG/WebP only, HEIC rejected).
export const ATTACHMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_PER_TICKET = 10;
export const ATTACHMENT_FILE_NAME_MAX = 255;

// The subset of Express.Multer.File the module consumes (memory storage) —
// a local shape instead of a @types/multer dependency (BC-PRIN-01).
export interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Magic-byte signatures of the three accepted formats. Checking the payload
// as well as the declared Content-Type stops content-type spoofing — a
// renamed PDF is rejected even with a forged header (design D4, NFR-SEC-03).
function matchesMagicBytes(mime: string, buffer: Buffer): boolean {
  switch (mime) {
    case 'image/jpeg':
      return startsWith(buffer, 0, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(
        buffer,
        0,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      );
    case 'image/webp':
      // RIFF container: "RIFF" at 0, "WEBP" at 8
      return (
        startsWith(buffer, 0, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(buffer, 8, [0x57, 0x45, 0x42, 0x50])
      );
    default:
      return false;
  }
}

function startsWith(buffer: Buffer, offset: number, bytes: number[]): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

export function extensionForMime(mime: string): string {
  return EXTENSION_BY_MIME[mime];
}

// Validates the upload per FR-ATTACH-01 (design D4) and returns the display
// file name. Multer's fileSize limit already aborts oversize requests; the
// size re-check here keeps the rule enforced even if the interceptor config
// drifts.
export function validateUploadedImage(
  file: UploadedImageFile | undefined,
): UploadedImageFile {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new AttachmentError(
      'ATTACHMENT_FILE_REQUIRED',
      'Multipart field "file" is required',
    );
  }
  if (
    !EXTENSION_BY_MIME[file.mimetype] ||
    !matchesMagicBytes(file.mimetype, file.buffer)
  ) {
    throw new AttachmentError(
      'ATTACHMENT_TYPE_INVALID',
      'Only JPEG, PNG or WebP images are accepted',
    );
  }
  if (file.size > ATTACHMENT_MAX_FILE_SIZE) {
    throw new AttachmentError(
      'ATTACHMENT_TOO_LARGE',
      `File is larger than ${ATTACHMENT_MAX_FILE_SIZE} bytes`,
    );
  }
  return file;
}

// Display name: strip any path (defense against crafted filenames), trim,
// cap at the column length; an empty result falls back to a generic name.
// The on-disk name is never derived from it (design D2/D3).
export function normalizeFileName(raw: string, mime: string): string {
  const base = raw.split(/[/\\]/).pop() ?? '';
  const trimmed = base.trim().slice(0, ATTACHMENT_FILE_NAME_MAX);
  return trimmed || `photo.${extensionForMime(mime)}`;
}
