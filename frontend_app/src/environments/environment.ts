export const environment = {
  production: false,
  /**
   * REST + Socket.IO base URL for the backend API.
   *
   * Development default points to localhost backend; override via env var.
   * - NG_APP_API_BASE: e.g. "http://localhost:3001"
   *
   * IMPORTANT:
   * This app also uses SSR/prerender; these values must be safe to read in Node.
   */
  apiBaseUrl: (globalThis as any)?.process?.env?.['NG_APP_API_BASE'] || 'http://localhost:3001',

  /**
   * Backward compatible alias used by older services.
   * Prefer `apiBaseUrl` going forward.
   */
  backendUrl: (globalThis as any)?.process?.env?.['NG_APP_BACKEND_URL'] || 'http://localhost:3001',
};
