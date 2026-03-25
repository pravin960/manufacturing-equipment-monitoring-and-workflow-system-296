export const environment = {
  production: false,
  /**
   * Base URL of the backend (same origin/port serving REST + Socket.IO).
   * Example: 'http://localhost:3001'
   */
  backendUrl: (globalThis as any)?.process?.env?.['NG_APP_BACKEND_URL'] || 'http://localhost:3001',
};
