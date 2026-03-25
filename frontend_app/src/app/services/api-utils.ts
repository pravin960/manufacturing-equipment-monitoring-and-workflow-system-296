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
   * 1) Browser runtime: window.location.origin with `kavia.app` -> `backend.kavia.app` rewrite
   * 2) Env configuration (SSR/prerender safe): environment.apiBaseUrl / environment.backendUrl
   *
   * Always trims trailing slashes for predictable `${base}/path` joining.
   */
  const browserOrigin = (globalThis as any)?.location?.origin as string | undefined;

  // Authoritative requirement: compute API_BASE from current origin and rewrite domain.
  const derivedFromBrowser =
    browserOrigin && browserOrigin.includes('kavia.app')
      ? browserOrigin.replace('kavia.app', 'backend.kavia.app')
      : browserOrigin;

  // SSR/prerender safe fallback (no window available): use configured environment values.
  const envFallback = (environment as any).apiBaseUrl || (environment as any).backendUrl || '';

  const raw = derivedFromBrowser || envFallback || '';
  const normalized = String(raw).replace(/\/+$/, '');

  // Required logging (kept lightweight but explicit).
  // Note: This can run multiple times; acceptable for troubleshooting production routing.
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
