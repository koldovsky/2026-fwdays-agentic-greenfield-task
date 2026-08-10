import { encrypt, decrypt, DecryptionFailedError } from '../lib/crypto';
import assert from 'assert';

console.log('Running cryptography unit tests...');

try {
  // Test case 1: Encryption & Decryption of valid string
  const plaintext = 'SecretCRM_Password_123!';
  const encrypted = encrypt(plaintext);
  console.log(`✓ Plaintext: "${plaintext}"`);
  console.log(`✓ Encrypted: "${encrypted}"`);

  const decrypted = decrypt(encrypted);
  console.log(`✓ Decrypted: "${decrypted}"`);
  assert.strictEqual(decrypted, plaintext, 'Decrypted value should match original plaintext');
  console.log('✓ Success: Decrypted matches original');

  // Test case 2: Different encryptions of the same text produce different ciphertexts (due to random IV)
  const encrypted2 = encrypt(plaintext);
  assert.notStrictEqual(encrypted, encrypted2, 'Encrypted strings should not be identical due to unique IVs');
  console.log('✓ Success: Unique ciphertexts generated for same plaintext');

  // Test case 3: Tampering with ciphertext causes decryption failure
  const parts = encrypted.split(':');
  const tamperedCiphertext = parts[2].substring(0, parts[2].length - 2) + '00';
  const tamperedEncrypted = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
  
  try {
    decrypt(tamperedEncrypted);
    assert.fail('Decryption should have failed for tampered ciphertext');
  } catch (error) {
    assert(error instanceof DecryptionFailedError, 'Error should be an instance of DecryptionFailedError');
    console.log('✓ Success: Decryption failed for tampered ciphertext with DecryptionFailedError');
  }

  // Test case 4: Tampering with auth tag causes decryption failure
  const tamperedAuthTag = parts[1].substring(0, parts[1].length - 2) + '00';
  const tamperedEncrypted2 = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;
  
  try {
    decrypt(tamperedEncrypted2);
    assert.fail('Decryption should have failed for tampered auth tag');
  } catch (error) {
    assert(error instanceof DecryptionFailedError, 'Error should be an instance of DecryptionFailedError');
    console.log('✓ Success: Decryption failed for tampered auth tag with DecryptionFailedError');
  }

  console.log('\nAll crypto tests passed successfully! 🎉');
} catch (error) {
  console.error('Test execution failed:', error);
  process.exit(1);
}
