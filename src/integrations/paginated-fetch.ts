import type { OAuthTokenManager } from "./oauth.js";

/**
 * Paginated fetch utility for external APIs.
 *
 * Handles cursor-based and offset-based pagination with:
 * - Automatic token refresh via OAuthTokenManager
 * - Rate limit detection and backoff
 * - Configurable max pages
 */

export interface PaginatedFetchOptions<T> {
  /** Base URL (without pagination params) */
  url: string;
  /** OAuth token manager for auto-refresh */
  auth?: OAuthTokenManager;
  /** Static auth header (fallback when no OAuth) */
  authHeader?: string;
  /** Maximum items to fetch total */
  maxItems?: number;
  /** Maximum pages to fetch */
  maxPages?: number;
  /** Items per page */
  perPage?: number;
  /** Extract items from response */
  extractItems: (data: unknown) => T[];
  /** Extract next cursor from response (return null if no more pages) */
  extractCursor?: (data: unknown) => string | null;
  /** Additional headers */
  headers?: Record<string, string>;
}

export async function paginatedFetch<T>(options: PaginatedFetchOptions<T>): Promise<T[]> {
  const allItems: T[] = [];
  const maxItems = options.maxItems ?? 1000;
  const maxPages = options.maxPages ?? 20;
  const perPage = options.perPage ?? 100;
  let cursor: string | null = null;
  let page = 0;

  while (page < maxPages && allItems.length < maxItems) {
    // Build URL with pagination
    const url = new URL(options.url);
    url.searchParams.set("per_page", String(perPage));
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    } else if (page > 0) {
      url.searchParams.set("page", String(page + 1));
    }

    // Get auth header
    let authValue = options.authHeader ?? "";
    if (options.auth) {
      const token = await options.auth.getAccessToken();
      authValue = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      headers: {
        ...(authValue ? { Authorization: authValue } : {}),
        Accept: "application/json",
        ...options.headers,
      },
    });

    // Rate limit handling
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
      await sleep(retryAfter * 1000);
      continue; // Retry same page
    }

    if (!res.ok) {
      break; // Stop pagination on error
    }

    const data = await res.json();
    const items = options.extractItems(data);

    if (items.length === 0) break; // No more items

    allItems.push(...items);

    // Check for next page
    if (options.extractCursor) {
      cursor = options.extractCursor(data);
      if (!cursor) break; // No more pages
    } else if (items.length < perPage) {
      break; // Last page
    }

    page++;
  }

  return allItems.slice(0, maxItems);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
