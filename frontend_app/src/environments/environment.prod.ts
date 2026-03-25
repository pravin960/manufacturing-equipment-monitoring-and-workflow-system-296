export const environment = {
  production: true,
  /**
   * REST + Socket.IO base URL for the backend API.
   *
   * Production default:
   * - Browser: use same-origin (works when frontend is reverse-proxied to backend)
   * - SSR/prerender: fall back to env var or localhost
   *
   * If your backend is hosted separately from the frontend, set:
   * - NG_APP_API_BASE: e.g. "https://your-backend.example.com"
   */
  apiBaseUrl:
    (globalThis as any)?.location?.origin ||
    (globalThis as any)?.process?.env?.['NG_APP_API_BASE'] ||
    'http://localhost:3001',

  /**
   * Backward compatible alias used by older services.
   * Prefer `apiBaseUrl` going forward.
   */
  backendUrl: (globalThis as any)?.process?.env?.['NG_APP_BACKEND_URL'] || 'http://localhost:3001',
};
