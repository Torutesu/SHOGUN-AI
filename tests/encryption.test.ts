import { describe, it, expect } from "vitest";
import { FieldEncryption, EncryptedFieldWrapper } from "../src/security/encryption.js";

describe("FieldEncryption", () => {
  it("should encrypt and decrypt text correctly", () => {
    const enc = new FieldEncryption("test-passphrase");
    const plaintext = "Select KK founder. Building SHOGUN.";

    const encrypted = enc.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith("enc:")).toBe(true);

    const decrypted = enc.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should handle Japanese text", () => {
    const enc = new FieldEncryption("日本語パスフレーズ");
    const plaintext = "東京のAIスタートアップを経営しています。SHOGUNを開発中。";

    const encrypted = enc.encrypt(plaintext);
    const decrypted = enc.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for same plaintext (random IV)", () => {
    const enc = new FieldEncryption("test-passphrase");
    const plaintext = "Same text";

    const enc1 = enc.encrypt(plaintext);
    const enc2 = enc.encrypt(plaintext);

    expect(enc1).not.toBe(enc2);

    expect(enc.decrypt(enc1)).toBe(plaintext);
    expect(enc.decrypt(enc2)).toBe(plaintext);
  });

  it("should passthrough when disabled (no passphrase)", () => {
    const enc = new FieldEncryption();
    expect(enc.enabled).toBe(false);

    const text = "Not encrypted";
    expect(enc.encrypt(text)).toBe(text);
    expect(enc.decrypt(text)).toBe(text);
  });

  it("should detect encrypted text", () => {
    const enc = new FieldEncryption("passphrase");
    expect(enc.isEncrypted("enc:abc123")).toBe(true);
    expect(enc.isEncrypted("plain text")).toBe(false);
  });

  it("should handle empty string", () => {
    const enc = new FieldEncryption("passphrase");
    const encrypted = enc.encrypt("");
    const decrypted = enc.decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("should handle long text", () => {
    const enc = new FieldEncryption("passphrase");
    const plaintext = "A".repeat(100000);

    const encrypted = enc.encrypt(plaintext);
    const decrypted = enc.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should fail decryption with wrong passphrase", () => {
    const enc1 = new FieldEncryption("correct-passphrase");
    const enc2 = new FieldEncryption("wrong-passphrase");

    const encrypted = enc1.encrypt("secret data");

    expect(() => enc2.decrypt(encrypted)).toThrow();
  });
});

describe("EncryptedFieldWrapper", () => {
  it("should encrypt and decrypt page fields", () => {
    const enc = new FieldEncryption("passphrase");
    const wrapper = new EncryptedFieldWrapper(enc);

    const original = {
      compiled_truth: "This is the truth",
      timeline: "- 2025-01-01: Event",
    };

    const encrypted = wrapper.encryptFields(original);
    expect(encrypted.compiled_truth).not.toBe(original.compiled_truth);
    expect(encrypted.timeline).not.toBe(original.timeline);

    const decrypted = wrapper.decryptFields({
      compiled_truth: encrypted.compiled_truth,
      timeline: encrypted.timeline!,
    });
    expect(decrypted.compiled_truth).toBe(original.compiled_truth);
    expect(decrypted.timeline).toBe(original.timeline);
  });

  it("should passthrough when encryption disabled", () => {
    const enc = new FieldEncryption();
    const wrapper = new EncryptedFieldWrapper(enc);

    const original = {
      compiled_truth: "Plain text",
      timeline: "Timeline",
    };

    const result = wrapper.encryptFields(original);
    expect(result.compiled_truth).toBe(original.compiled_truth);
  });
});
