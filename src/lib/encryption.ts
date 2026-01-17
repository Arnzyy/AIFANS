// ===========================================
// FIELD-LEVEL ENCRYPTION USING TWEETNACL
// ===========================================

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

// ===========================================
// KEY MANAGEMENT
// ===========================================

function getEncryptionKey(): Uint8Array {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  // Convert hex string to Uint8Array (32 bytes = 64 hex chars)
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(keyHex.substr(i * 2, 2), 16);
  }

  return key;
}

// ===========================================
// ENCRYPT FIELD
// ===========================================

/**
 * Encrypts any value (string, array, object) using NaCl secretbox
 * Returns base64 encoded string containing nonce + ciphertext
 * Each call generates a new random nonce for semantic security
 */
export function encryptField(value: any): string {
  // Convert value to JSON string
  const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Generate random 24-byte nonce
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  // Get encryption key
  const key = getEncryptionKey();

  // Encrypt using secretbox
  const ciphertext = nacl.secretbox(plaintextBytes, nonce, key);

  if (!ciphertext) {
    throw new Error('Encryption failed');
  }

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);

  // Return as base64
  return encodeBase64(combined);
}

// ===========================================
// DECRYPT FIELD
// ===========================================

/**
 * Decrypts a base64 encoded string back to original value
 * Extracts nonce (first 24 bytes) and ciphertext (rest)
 * Returns original value (parsed from JSON if applicable)
 */
export function decryptField(encryptedB64: string): any {
  // Decode base64
  const combined = decodeBase64(encryptedB64);

  // Extract nonce (first 24 bytes)
  const nonce = combined.slice(0, nacl.secretbox.nonceLength);

  // Extract ciphertext (rest)
  const ciphertext = combined.slice(nacl.secretbox.nonceLength);

  // Get encryption key
  const key = getEncryptionKey();

  // Decrypt using secretbox.open
  const plaintextBytes = nacl.secretbox.open(ciphertext, nonce, key);

  if (!plaintextBytes) {
    throw new Error('Decryption failed - invalid ciphertext or key');
  }

  // Convert bytes back to string
  const plaintext = new TextDecoder().decode(plaintextBytes);

  // Try to parse as JSON, return as-is if it fails
  try {
    return JSON.parse(plaintext);
  } catch {
    // Not JSON, return as plain string
    return plaintext;
  }
}

// ===========================================
// HELPER: CHECK IF VALUE IS ENCRYPTED
// ===========================================

/**
 * Checks if a string looks like an encrypted value
 * (base64 encoded, starts with valid nonce length)
 */
export function isEncrypted(value: string): boolean {
  if (typeof value !== 'string') return false;

  try {
    const decoded = decodeBase64(value);
    // Must be at least nonce (24) + some ciphertext (16 min for auth tag)
    return decoded.length >= 40;
  } catch {
    return false;
  }
}

// ===========================================
// HELPER: ENCRYPT IF NOT ALREADY ENCRYPTED
// ===========================================

export function encryptIfNeeded(value: any): string {
  if (typeof value === 'string' && isEncrypted(value)) {
    return value; // Already encrypted
  }
  return encryptField(value);
}

// ===========================================
// HELPER: DECRYPT IF ENCRYPTED
// ===========================================

export function decryptIfNeeded(value: any): any {
  if (typeof value === 'string' && isEncrypted(value)) {
    try {
      return decryptField(value);
    } catch {
      return value; // Return as-is if decryption fails
    }
  }
  return value;
}