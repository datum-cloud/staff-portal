import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for cookie payloads. The key is derived from the session secret
 * with HKDF and a fixed label, so it is never the raw secret and can be
 * rotated by changing the label. Each cookie name is bound in as associated
 * data, so a value sealed for one cookie won't open as another.
 *
 * No env import: `cypress.config.ts` uses this to build a login cookie.
 */

/** Prefix of a sealed value; lets readers tell it from the old signed-only JSON. */
export const SEALED_PREFIX = 'v1.';

const KEY_LABEL = 'staff-portal:cookie-encryption:v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

const keyCache = new Map<string, Buffer>();

function deriveKey(secret: string): Buffer {
  const cached = keyCache.get(secret);
  if (cached) return cached;
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), KEY_LABEL, 32));
  keyCache.set(secret, key);
  return key;
}

/** Encrypts `plaintext` for the cookie `name`. Returns `v1.<base64url(iv | tag | ciphertext)>`. */
export function sealCookieValue(plaintext: string, secret: string, name: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  cipher.setAAD(Buffer.from(name));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const sealed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  return `${SEALED_PREFIX}${sealed.toString('base64url')}`;
}

/** Decrypts a value from `sealCookieValue`. Returns null when it is malformed or was tampered with. */
export function openCookieValue(value: string, secret: string, name: string): string | null {
  if (!value.startsWith(SEALED_PREFIX)) return null;
  const sealed = Buffer.from(value.slice(SEALED_PREFIX.length), 'base64url');
  if (sealed.length <= IV_BYTES + TAG_BYTES) return null;

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      deriveKey(secret),
      sealed.subarray(0, IV_BYTES)
    );
    decipher.setAAD(Buffer.from(name));
    decipher.setAuthTag(sealed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const plaintext = Buffer.concat([
      decipher.update(sealed.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    return null;
  }
}
