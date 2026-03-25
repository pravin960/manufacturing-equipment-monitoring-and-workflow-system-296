export const environment = {
  production: true,
  /**
   * Base URL of the backend (same origin/port serving REST + Socket.IO).
   * Set this to your deployed backend URL.
   */
  backendUrl: (globalThis as any)?.process?.env?.['NG_APP_BACKEND_URL'] || 'http://localhost:3001',
};
