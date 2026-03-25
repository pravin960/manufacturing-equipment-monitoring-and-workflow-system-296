import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Centralized REST API utilities:
 * - base URL resolution (authoritative API_BASE)
 * - url joining
 * - error -> user-friendly message mapping
 *
 * Authoritative requirements (user_input_ref):
 * - Use an absolute API base (no relative "/alerts").
 * - In production, derive from the current origin and rewrite:
 *     kavia.app -> backend.kavia.app
 * - Apply across REST and Socket.IO
 * - Add console logging for API base
 * - Ensure UI shows "Could not load alerts" on failure (handled at component level)
 */

// PUBLIC_INTERFACE
export function getApiBaseUrl(): string {
  /**
   * Returns the absolute backend API base URL.
   *
   * Priority:
   * 1) Browser runtime: derive from window.location.origin with:
   *    - preview/dev port mapping: :3000 -> :3001
   *    - production domain mapping: kavia.app -> backend.kavia.app
   * 2) Env configuration (SSR/prerender safe): environment.apiBaseUrl / environment.backendUrl
   *
   * Always trims trailing slashes for predictable `${base}/path` joining.
   */
  const browserOrigin = (globalThis as any)?.location?.origin as string | undefined;

  const derivedFromBrowser = (() => {
    if (!browserOrigin) return undefined;

    // Use URL parsing for robust port rewriting without string edge cases.
    // Example: https://host:3000 -> https://host:3001
    try {
      const url = new (globalThis as any).URL(browserOrigin);

      // Preview requirement: when frontend runs on 3000, backend is on 3001.
      if (url.port === '3000') {
        url.port = '3001';
      }

      // Production requirement: rewrite domain (frontend) -> (backend)
      // Keep behavior consistent even if served behind different subdomains.
      url.hostname = url.hostname.replace('kavia.app', 'backend.kavia.app');

      return url.origin;
    } catch {
      // Fallback to previous string-based behavior if URL parsing fails.
      const portMapped = browserOrigin.replace(':3000', ':3001');
      return portMapped.includes('kavia.app')
        ? portMapped.replace('kavia.app', 'backend.kavia.app')
        : portMapped;
    }
  })();

  // SSR/prerender safe fallback (no window available): use configured environment values.
  const envFallback = (environment as any).apiBaseUrl || (environment as any).backendUrl || '';

  const raw = derivedFromBrowser || envFallback || '';
  const normalized = String(raw).replace(/\/+$/, '');

  // Required logging (kept lightweight but explicit).
  // Note: This can run multiple times; acceptable for troubleshooting routing.
  console.log('API BASE:', normalized);

  return normalized;
}

// PUBLIC_INTERFACE
export function apiUrl(path: string): string {
  /**
   * Create an absolute API URL for a given path.
   * Accepts '/alerts' or 'alerts' and normalizes to `${API_BASE}/alerts`.
   */
  const base = getApiBaseUrl();
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
  return `${base}${normalizedPath}`;
}

// PUBLIC_INTERFACE
export function toUserFriendlyApiError(err: unknown, context?: string): string {
  /**
   * Convert an HttpClient/network error to a concise message suitable for UI.
   * Also logs the original error for debugging/troubleshooting.
   */
  const prefix = context ? `${context}: ` : '';

  // Always log the raw error for developers/ops
  console.error('[api] request failed', { context, err });

  if (err instanceof HttpErrorResponse) {
    // Status 0 is typical for CORS/connection/network errors in browsers
    if (err.status === 0) {
      return `${prefix}Unable to reach the server. Please check your network connection and try again.`;
    }

    if (err.status >= 500) {
      return `${prefix}Server error. Please try again shortly.`;
    }

    if (err.status === 404) {
      return `${prefix}Requested resource was not found.`;
    }

    if (err.status === 401 || err.status === 403) {
      return `${prefix}You are not authorized to perform this action.`;
    }

    // 4xx fallthrough
    return `${prefix}Request failed (${err.status}). Please try again.`;
  }

  return `${prefix}Something went wrong. Please try again.`;
}
