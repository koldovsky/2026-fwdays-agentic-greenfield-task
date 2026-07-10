import { AttachmentError } from './attachment-errors';
import {
  ATTACHMENT_FILE_NAME_MAX,
  ATTACHMENT_MAX_FILE_SIZE,
  normalizeFileName,
  UploadedImageFile,
  validateUploadedImage,
} from './attachment-validation';

// Real-format signatures with a few payload bytes behind them.
export const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
export const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
export const WEBP_BYTES = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
  Buffer.from('VP8 '),
]);
const PDF_BYTES = Buffer.from('%PDF-1.7 fake document');
const HEIC_BYTES = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypheic'),
]);

export function file(overrides: Partial<UploadedImageFile>): UploadedImageFile {
  return {
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: JPEG_BYTES.length,
    buffer: JPEG_BYTES,
    ...overrides,
  };
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return ((error as AttachmentError).getResponse() as { code: string }).code;
  }
}

describe('validateUploadedImage', () => {
  it('accepts JPEG, PNG and WebP whose bytes match the declared type (FR-ATTACH-01)', () => {
    const cases: Array<[string, Buffer]> = [
      ['image/jpeg', JPEG_BYTES],
      ['image/png', PNG_BYTES],
      ['image/webp', WEBP_BYTES],
    ];
    for (const [mimetype, buffer] of cases) {
      expect(() =>
        validateUploadedImage(file({ mimetype, buffer, size: buffer.length })),
      ).not.toThrow();
    }
  });

  it('rejects a missing file part', () => {
    expect(codeOf(() => validateUploadedImage(undefined))).toBe(
      'ATTACHMENT_FILE_REQUIRED',
    );
  });

  it('rejects PDF and HEIC declared as themselves (Р-13)', () => {
    for (const [mimetype, buffer] of [
      ['application/pdf', PDF_BYTES],
      ['image/heic', HEIC_BYTES],
    ] as const) {
      expect(
        codeOf(() =>
          validateUploadedImage(
            file({ mimetype, buffer, size: buffer.length }),
          ),
        ),
      ).toBe('ATTACHMENT_TYPE_INVALID');
    }
  });

  it('rejects a spoofed declared type — bytes win over the header (design D4)', () => {
    for (const buffer of [PDF_BYTES, HEIC_BYTES, PNG_BYTES]) {
      expect(
        codeOf(() =>
          validateUploadedImage(
            file({ mimetype: 'image/jpeg', buffer, size: buffer.length }),
          ),
        ),
      ).toBe('ATTACHMENT_TYPE_INVALID');
    }
  });

  it('rejects a truncated signature shorter than its magic bytes', () => {
    expect(
      codeOf(() =>
        validateUploadedImage(file({ buffer: Buffer.from([0xff]), size: 1 })),
      ),
    ).toBe('ATTACHMENT_TYPE_INVALID');
  });

  it('rejects a file over the 10 MB limit (FR-ATTACH-01)', () => {
    expect(
      codeOf(() =>
        validateUploadedImage(file({ size: ATTACHMENT_MAX_FILE_SIZE + 1 })),
      ),
    ).toBe('ATTACHMENT_TOO_LARGE');
  });
});

describe('normalizeFileName', () => {
  it('keeps a plain Cyrillic name', () => {
    expect(normalizeFileName('фото кухні.jpg', 'image/jpeg')).toBe(
      'фото кухні.jpg',
    );
  });

  it('strips path components from crafted names', () => {
    expect(normalizeFileName('../../etc/hosts.png', 'image/png')).toBe(
      'hosts.png',
    );
    expect(normalizeFileName('C:\\Users\\evil.webp', 'image/webp')).toBe(
      'evil.webp',
    );
  });

  it('caps the length at the column size and falls back when empty', () => {
    expect(normalizeFileName('a'.repeat(500), 'image/jpeg')).toHaveLength(
      ATTACHMENT_FILE_NAME_MAX,
    );
    expect(normalizeFileName('   ', 'image/webp')).toBe('photo.webp');
  });
});
