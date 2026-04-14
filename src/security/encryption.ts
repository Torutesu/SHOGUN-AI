import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { logger } from "../logger.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/**
 * Field-level encryption for SHOGUN Memory Layer.
 *
 * Encrypts sensitive fields (compiled_truth, timeline, chunk_text)
 * at the application level using AES-256-GCM.
 *
 * Key derivation: scrypt from user passphrase + random salt.
 * All data stays local — encryption adds at-rest protection
 * in case the device is compromised.
 *
 * Format: base64(salt + iv + tag + ciphertext)
 */
export class FieldEncryption {
  private key: Buffer;
  private _enabled: boolean;

  constructor(passphrase?: string) {
    if (passphrase) {
      // Derive key from passphrase with a fixed application salt
      // (the per-message salt is separate and random)
      const appSalt = Buffer.from("shogun-memory-layer-v1", "utf-8");
      this.key = scryptSync(passphrase, appSalt, KEY_LENGTH, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
      });
      this._enabled = true;
      logger.info("Field encryption enabled");
    } else {
      this.key = Buffer.alloc(KEY_LENGTH);
      this._enabled = false;
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Encrypt a plaintext string.
   * Returns base64-encoded ciphertext with embedded salt, IV, and auth tag.
   */
  encrypt(plaintext: string): string {
    if (!this._enabled) return plaintext;

    const salt = randomBytes(SALT_LENGTH);
    const derivedKey = scryptSync(this.key, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf-8"),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Pack: salt + iv + tag + ciphertext
    const packed = Buffer.concat([salt, iv, tag, encrypted]);
    return `enc:${packed.toString("base64")}`;
  }

  /**
   * Decrypt a ciphertext string.
   * Returns the original plaintext.
   */
  decrypt(ciphertext: string): string {
    if (!this._enabled) return ciphertext;

    // Check if actually encrypted
    if (!ciphertext.startsWith("enc:")) return ciphertext;

    const packed = Buffer.from(ciphertext.slice(4), "base64");

    const salt = packed.subarray(0, SALT_LENGTH);
    const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = packed.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = packed.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const derivedKey = scryptSync(this.key, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  }

  /**
   * Check if a string is encrypted.
   */
  isEncrypted(text: string): boolean {
    return text.startsWith("enc:");
  }
}

/**
 * EncryptedPageStore wrapper: transparently encrypts/decrypts
 * compiled_truth and timeline fields.
 */
export class EncryptedFieldWrapper {
  constructor(private encryption: FieldEncryption) {}

  encryptFields(data: {
    compiled_truth: string;
    timeline?: string;
  }): { compiled_truth: string; timeline?: string } {
    if (!this.encryption.enabled) return data;

    return {
      compiled_truth: this.encryption.encrypt(data.compiled_truth),
      timeline: data.timeline
        ? this.encryption.encrypt(data.timeline)
        : undefined,
    };
  }

  decryptFields(data: {
    compiled_truth: string;
    timeline: string;
  }): { compiled_truth: string; timeline: string } {
    if (!this.encryption.enabled) return data;

    return {
      compiled_truth: this.encryption.decrypt(data.compiled_truth),
      timeline: this.encryption.decrypt(data.timeline),
    };
  }
}
