import fs from "fs";
import path from "path";
import crypto from "crypto";
import { chromium, BrowserContext } from "playwright";

export interface SessionManagerOptions {
  baseDir?: string;
  testDir?: string;
  secret?: string;
}

export interface InteractiveLoginResult {
  success: boolean;
  sessionRef?: string;
  error?: string;
}

export class SessionManager {
  private readonly baseDir: string;
  private readonly encryptionKey: Buffer;
  private testDirCleanable?: string;

  constructor(options?: SessionManagerOptions) {
    if (options?.testDir) {
      this.baseDir = options.testDir;
      this.testDirCleanable = options.testDir;
    } else {
      this.baseDir = options?.baseDir || path.join(process.cwd(), ".sessions");
    }

    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch {}
    }

    // Derive deterministic 32-byte key using SHA-256
    const seed =
      options?.secret ||
      process.env.SESSION_ENCRYPTION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "ai-job-agent-deterministic-secure-session-key";

    this.encryptionKey = crypto.createHash("sha256").update(seed).digest();
  }

  /**
   * Restricts user and portal identifiers to safe alphanumeric strings.
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  /**
   * Resolves the encrypted session file path for a user and portal.
   */
  public getSessionFilePath(userId: string, portalId: string): string {
    const safeUser = this.sanitizeId(userId);
    const safePortal = this.sanitizeId(portalId);
    const userDir = path.join(this.baseDir, safeUser);
    return path.join(userDir, `${safePortal}.json.enc`);
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    const payload = {
      iv: iv.toString("base64"),
      tag: authTag.toString("base64"),
      data: encrypted,
    };
    return JSON.stringify(payload);
  }

  /**
   * Decrypts ciphertext string using AES-256-GCM.
   */
  private decrypt(ciphertextPayload: string): string | null {
    try {
      const payload = JSON.parse(ciphertextPayload);
      const iv = Buffer.from(payload.iv, "base64");
      const authTag = Buffer.from(payload.tag, "base64");
      const decipher = crypto.createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(payload.data, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      console.error("Failed to decrypt session payload:", err);
      return null;
    }
  }

  /**
   * Securely saves Playwright storageState (cookies & localStorage) for a specific user and portal.
   */
  public async saveSessionState(
    userId: string,
    portalId: string,
    storageState: any
  ): Promise<string> {
    const filePath = this.getSessionFilePath(userId, portalId);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const plaintext = JSON.stringify(storageState);
    const encrypted = this.encrypt(plaintext);

    fs.writeFileSync(filePath, encrypted, { encoding: "utf8", mode: 0o600 });
    const sessionRef = `session:${this.sanitizeId(userId)}:${this.sanitizeId(portalId)}`;
    return sessionRef;
  }

  /**
   * Securely loads and decrypts Playwright storageState.
   */
  public async loadSessionState(userId: string, portalId: string): Promise<any | null> {
    const filePath = this.getSessionFilePath(userId, portalId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const ciphertext = fs.readFileSync(filePath, "utf8");
      const decrypted = this.decrypt(ciphertext);
      if (!decrypted) return null;
      return JSON.parse(decrypted);
    } catch (err) {
      console.error(`Error loading session for user=${userId} portal=${portalId}:`, err);
      return null;
    }
  }

  /**
   * Checks whether a valid stored session exists for the user and portal.
   */
  public async hasValidSession(userId: string, portalId: string): Promise<boolean> {
    const state = await this.loadSessionState(userId, portalId);
    if (!state) return false;
    // Must have at least one cookie or storage entry
    const hasCookies = Array.isArray(state.cookies) && state.cookies.length > 0;
    const hasOrigins = Array.isArray(state.origins) && state.origins.length > 0;
    return hasCookies || hasOrigins;
  }

  /**
   * Clears a stored session (e.g. after logout or expiration).
   */
  public async clearSession(userId: string, portalId: string): Promise<void> {
    const filePath = this.getSessionFilePath(userId, portalId);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting session file:", err);
      }
    }
  }

  /**
   * Launches an interactive browser context for the user to complete login,
   * CAPTCHA, MFA, or OTP directly.
   * Detects login completion via verification check, saves session, and closes cleanly.
   */
  public async launchInteractiveLogin(
    userId: string,
    portalId: string,
    loginUrl: string,
    options?: {
      timeoutMs?: number;
      isVerificationDone?: (context: BrowserContext) => Promise<boolean>;
      onProgress?: (msg: string) => void;
    }
  ): Promise<InteractiveLoginResult> {
    const timeoutMs = options?.timeoutMs || 180000; // 3 minutes timeout for human login
    let browser: any = null;
    let context: any = null;

    try {
      options?.onProgress?.("Launching interactive browser for human-in-the-loop login...");

      // Launch headful browser window for user
      browser = await chromium.launch({
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      });

      // Load existing session if any exists for partial continuation
      const existingState = await this.loadSessionState(userId, portalId);
      context = await browser.newContext(
        existingState
          ? {
              storageState: existingState,
              viewport: { width: 1280, height: 720 },
            }
          : {
              viewport: { width: 1280, height: 720 },
            }
      );

      const page = await context.newPage();
      await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});

      options?.onProgress?.("Browser opened. Please complete login and verification.");

      const startTime = Date.now();
      let verified = false;

      while (Date.now() - startTime < timeoutMs) {
        await new Promise((r) => setTimeout(r, 2000));

        // Check if browser was closed by user
        if (!browser.isConnected() || context.pages().length === 0) {
          break;
        }

        if (options?.isVerificationDone) {
          const isDone = await options.isVerificationDone(context).catch(() => false);
          if (isDone) {
            verified = true;
            break;
          }
        } else {
          // Default heuristic: check if URL moved away from login page and cookies exist
          const cookies = await context.cookies();
          const currentUrl = page.url().toLowerCase();
          const isOffLoginPage =
            !currentUrl.includes("/login") &&
            !currentUrl.includes("/signin") &&
            !currentUrl.includes("/auth");

          if (cookies.length >= 2 && isOffLoginPage) {
            verified = true;
            break;
          }
        }
      }

      if (verified) {
        const state = await context.storageState();
        const sessionRef = await this.saveSessionState(userId, portalId, state);
        options?.onProgress?.("Authentication verified and session securely persisted!");
        return { success: true, sessionRef };
      }

      return {
        success: false,
        error: "Interactive login timed out or window was closed before completion.",
      };
    } catch (err: any) {
      console.error("Interactive login error:", err);
      return { success: false, error: err?.message || "Interactive login failed" };
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }

  public cleanupTestDir(): void {
    if (this.testDirCleanable && fs.existsSync(this.testDirCleanable)) {
      try {
        fs.rmSync(this.testDirCleanable, { recursive: true, force: true });
      } catch {}
    }
  }
}

// Global default singleton
export const sessionManager = new SessionManager();
