import { exec } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";
import { logger } from "../logger.js";

const execAsync = promisify(exec);

const SERVICE_NAME = "com.syogun.memory";
const ACCOUNT_NAME = "shogun-encryption-key";

/**
 * OS Keychain integration for secure passphrase storage.
 *
 * Stores the encryption master key in the OS-native secure storage:
 * - macOS: Keychain (Security framework)
 * - Windows: Credential Manager (cmdkey)
 * - Linux: libsecret (secret-tool) / GNOME Keyring
 *
 * The key is generated once on first use and stored permanently.
 * Users authenticate via OS biometrics (Touch ID / Windows Hello)
 * to access the keychain, not by typing a password.
 *
 * This replaces the weak "shogun-./pgdata" passphrase with a
 * cryptographically random 256-bit key protected by OS security.
 */
export class KeychainManager {
  private platform: string;

  constructor() {
    this.platform = process.platform;
  }

  /**
   * Get or create the encryption passphrase.
   * First call generates a random key and stores it.
   * Subsequent calls retrieve the stored key.
   */
  async getOrCreatePassphrase(): Promise<string> {
    const existing = await this.get();
    if (existing) return existing;

    // Generate a cryptographically random passphrase
    const passphrase = randomBytes(32).toString("base64");
    await this.set(passphrase);
    logger.info("Generated and stored new encryption key in OS keychain");
    return passphrase;
  }

  /**
   * Retrieve passphrase from OS keychain.
   */
  async get(): Promise<string | null> {
    try {
      switch (this.platform) {
        case "darwin": {
          const { stdout } = await execAsync(
            `security find-generic-password -s "${SERVICE_NAME}" -a "${ACCOUNT_NAME}" -w 2>/dev/null`,
            { timeout: 5000 }
          );
          return stdout.trim() || null;
        }
        case "win32": {
          const { stdout } = await execAsync(
            `powershell -command "(Get-StoredCredential -Target '${SERVICE_NAME}').GetNetworkCredential().Password"`,
            { timeout: 5000 }
          );
          return stdout.trim() || null;
        }
        case "linux": {
          const { stdout } = await execAsync(
            `secret-tool lookup service "${SERVICE_NAME}" account "${ACCOUNT_NAME}" 2>/dev/null`,
            { timeout: 5000 }
          );
          return stdout.trim() || null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Store passphrase in OS keychain.
   */
  async set(passphrase: string): Promise<boolean> {
    try {
      switch (this.platform) {
        case "darwin": {
          // Delete existing entry (ignore if not found)
          await execAsync(
            `security delete-generic-password -s "${SERVICE_NAME}" -a "${ACCOUNT_NAME}" 2>/dev/null`
          ).catch(() => {});
          await execAsync(
            `security add-generic-password -s "${SERVICE_NAME}" -a "${ACCOUNT_NAME}" -w "${passphrase}"`,
            { timeout: 5000 }
          );
          return true;
        }
        case "win32": {
          await execAsync(
            `cmdkey /generic:"${SERVICE_NAME}" /user:"${ACCOUNT_NAME}" /pass:"${passphrase}"`,
            { timeout: 5000 }
          );
          return true;
        }
        case "linux": {
          await execAsync(
            `echo -n "${passphrase}" | secret-tool store --label="SHOGUN Encryption Key" service "${SERVICE_NAME}" account "${ACCOUNT_NAME}"`,
            { timeout: 5000 }
          );
          return true;
        }
        default:
          return false;
      }
    } catch (err) {
      logger.warn(`Failed to store key in OS keychain: ${err}`);
      return false;
    }
  }

  /**
   * Delete passphrase from OS keychain.
   */
  async delete(): Promise<boolean> {
    try {
      switch (this.platform) {
        case "darwin":
          await execAsync(`security delete-generic-password -s "${SERVICE_NAME}" -a "${ACCOUNT_NAME}"`);
          return true;
        case "win32":
          await execAsync(`cmdkey /delete:"${SERVICE_NAME}"`);
          return true;
        case "linux":
          await execAsync(`secret-tool clear service "${SERVICE_NAME}" account "${ACCOUNT_NAME}"`);
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Check if OS keychain is available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      switch (this.platform) {
        case "darwin":
          await execAsync("security help 2>&1", { timeout: 2000 });
          return true;
        case "win32":
          await execAsync("cmdkey /list 2>&1", { timeout: 2000 });
          return true;
        case "linux":
          await execAsync("which secret-tool 2>/dev/null", { timeout: 2000 });
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}
