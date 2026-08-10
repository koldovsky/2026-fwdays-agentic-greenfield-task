import crypto from 'crypto';

export class DecryptionFailedError extends Error {
  constructor(message = 'Decryption failed') {
    super(message);
    this.name = 'DecryptionFailedError';
    Object.setPrototypeOf(this, DecryptionFailedError.prototype);
  }
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_HEX = process.env.ENCRYPTION_KEY;

if (!KEY_HEX) {
  throw new Error('ENCRYPTION_KEY environment variable is not defined');
}

if (KEY_HEX.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
}

let encryptionKeyBuffer: Buffer;
try {
  encryptionKeyBuffer = Buffer.from(KEY_HEX, 'hex');
} catch {
  throw new Error('ENCRYPTION_KEY must be a valid hex string');
}

if (encryptionKeyBuffer.length !== 32) {
  throw new Error(`ENCRYPTION_KEY must decode to exactly 32 bytes (got ${encryptionKeyBuffer.length} bytes)`);
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns the combined format: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKeyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption operation error:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts a combined format string iv_hex:auth_tag_hex:ciphertext_hex using AES-256-GCM.
 * Throws DecryptionFailedError on verification or decryption failure.
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    
    if (authTag.length !== 16) {
      throw new Error('Invalid authentication tag length');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKeyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    // Log the security event locally
    console.error('[SECURITY WARNING] Decryption check failed or integrity error occurred.');
    // Throw custom secure exception without leaking cryptographic details
    throw new DecryptionFailedError();
  }
}
