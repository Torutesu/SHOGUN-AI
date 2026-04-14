import { logger } from "../logger.js";

/**
 * OAuth2 token manager with automatic refresh.
 *
 * Handles the common pattern across Slack, GitHub, and Google Calendar:
 * - Store access token + refresh token
 * - Auto-refresh when token expires
 * - Thread-safe refresh (coalesce concurrent refresh attempts)
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number; // Unix timestamp in ms
  scopes?: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class OAuthTokenManager {
  private config: OAuthConfig;
  private refreshPromise: Promise<OAuthTokens> | null = null;

  constructor(config: OAuthConfig) {
    this.config = {
      ...config,
      expiresAt: config.expiresAt ?? Date.now() + 3600_000, // Default 1h
    };
  }

  /**
   * Get a valid access token, refreshing if expired.
   */
  async getAccessToken(): Promise<string> {
    const bufferMs = 60_000; // Refresh 1 min before expiry
    if (this.config.expiresAt && Date.now() > this.config.expiresAt - bufferMs) {
      await this.refresh();
    }
    return this.config.accessToken;
  }

  /**
   * Refresh the access token using the refresh token.
   * Coalesces concurrent calls — only one refresh in flight at a time.
   */
  async refresh(): Promise<OAuthTokens> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async doRefresh(): Promise<OAuthTokens> {
    logger.info("Refreshing OAuth token", { tokenUrl: this.config.tokenUrl });

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });

    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OAuth refresh failed (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? this.config.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    // Update internal state
    this.config.accessToken = tokens.accessToken;
    this.config.refreshToken = tokens.refreshToken;
    this.config.expiresAt = tokens.expiresAt;

    logger.info("OAuth token refreshed", {
      expiresIn: data.expires_in ?? 3600,
    });

    return tokens;
  }

  getTokens(): OAuthTokens {
    return {
      accessToken: this.config.accessToken,
      refreshToken: this.config.refreshToken,
      expiresAt: this.config.expiresAt ?? 0,
    };
  }

  isExpired(): boolean {
    return Date.now() > (this.config.expiresAt ?? 0);
  }
}

/**
 * Google Calendar OAuth config factory.
 */
export function createGoogleOAuth(config: {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
}): OAuthTokenManager {
  return new OAuthTokenManager({
    ...config,
    tokenUrl: "https://oauth2.googleapis.com/token",
  });
}

/**
 * Slack OAuth config factory.
 */
export function createSlackOAuth(config: {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
}): OAuthTokenManager {
  return new OAuthTokenManager({
    ...config,
    tokenUrl: "https://slack.com/api/oauth.v2.access",
  });
}

/**
 * GitHub OAuth config factory (GitHub uses non-expiring tokens,
 * but this handles the refresh flow for GitHub Apps).
 */
export function createGitHubOAuth(config: {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
}): OAuthTokenManager {
  return new OAuthTokenManager({
    ...config,
    tokenUrl: "https://github.com/login/oauth/access_token",
    expiresAt: Date.now() + 8 * 3600_000, // 8h for GitHub App tokens
  });
}
