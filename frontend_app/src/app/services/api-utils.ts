import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Centralized REST API utilities:
 * - base URL resolution (env-driven)
 * - url joining
 * - error -> user-friendly message mapping
 */

// PUBLIC_INTERFACE
export function getApiBaseUrl(): string {
  /**
   * Returns the configured API base URL from the environment.
   * Ensures no trailing slash so `${base}/path` is predictable.
   */
  const raw = (environment as any).apiBaseUrl || (environment as any).backendUrl || '';
  return String(raw).replace(/\/+$/, '');
}

// PUBLIC_INTERFACE
export function apiUrl(path: string): string {
  /**
   * Create an absolute API URL for a given path.
   * Accepts '/alerts' or 'alerts' and normalizes to `${base}/alerts`.
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
