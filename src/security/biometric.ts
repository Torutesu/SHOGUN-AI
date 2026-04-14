import { logger } from "../logger.js";

/**
 * Biometric authentication support using Web Authentication API (WebAuthn/Passkeys).
 *
 * Provides Face ID / Touch ID / Windows Hello authentication.
 * Works in Tauri WebView and modern browsers.
 *
 * FREE — uses platform native biometric hardware:
 * - macOS: Touch ID / Face ID
 * - Windows: Windows Hello (fingerprint / face / PIN)
 * - Linux: FIDO2 tokens
 *
 * Credentials stored locally. No cloud, no third-party service.
 *
 * NOTE: This module uses browser WebAuthn APIs and is designed to run
 * in the Tauri WebView frontend, NOT in the Node.js backend.
 * Import it in ui/ code, not in src/ server code.
 */

export interface BiometricCredential {
  id: string;
  publicKey: string;
  createdAt: string;
  deviceName: string;
}

/**
 * Check if the platform supports biometric authentication.
 * Safe to call in any environment (returns false in Node.js).
 */
export function isBiometricAvailable(): boolean {
  try {
    const g = globalThis as any;
    return typeof g.window !== "undefined" &&
      typeof g.navigator !== "undefined" &&
      "credentials" in g.navigator &&
      typeof g.PublicKeyCredential !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Register a new passkey for biometric login.
 * Triggers the native biometric prompt (Face ID / Touch ID / Windows Hello).
 */
export async function registerBiometric(
  userId: string = "shogun-user"
): Promise<BiometricCredential | null> {
  if (!isBiometricAvailable()) {
    logger.warn("Biometric authentication not available on this platform");
    return null;
  }

  try {
    const challenge = new Uint8Array(32);
    (globalThis as any).crypto.getRandomValues(challenge);

    const nav = (globalThis as any).navigator;
    const credential = await nav.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "SHOGUN Memory",
          id: (globalThis as any).location?.hostname ?? "localhost",
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: "SHOGUN User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "required",
        },
        timeout: 60000,
      },
    });

    if (!credential) return null;

    const response = credential.response;

    return {
      id: credential.id,
      publicKey: bufferToBase64(response.getPublicKey()),
      createdAt: new Date().toISOString(),
      deviceName: getDeviceName(),
    };
  } catch (err) {
    logger.warn(`Biometric registration failed: ${err}`);
    return null;
  }
}

/**
 * Verify biometric login using a stored passkey.
 * Returns true if the user successfully authenticates.
 */
export async function verifyBiometric(
  credentialId: string
): Promise<boolean> {
  if (!isBiometricAvailable()) return false;

  try {
    const challenge = new Uint8Array(32);
    (globalThis as any).crypto.getRandomValues(challenge);

    const nav = (globalThis as any).navigator;
    const assertion = await nav.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: "public-key",
            id: base64ToBuffer(credentialId),
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return assertion !== null;
  } catch (err) {
    logger.warn(`Biometric verification failed: ${err}`);
    return false;
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getDeviceName(): string {
  try {
    const ua = (globalThis as any).navigator?.userAgent ?? "";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Linux")) return "Linux";
  } catch {}
  return "unknown";
}
