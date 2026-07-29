/**
 * Returns the backend base URL (no /api suffix) for socket.io connections.
 * Works in both local dev and production (Vercel -> Render).
 *
 * NOTE: HTTP API calls use relative '/api' (proxied by Vercel → Render).
 *       Socket.io must connect DIRECTLY to Render since WebSocket upgrades
 *       cannot be proxied through Vercel rewrites.
 */
export const getBackendURL = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    // Direct connection to Render for WebSocket (socket.io)
    return 'https://college-erp-software.onrender.com';
  }
  return 'http://localhost:5000';
};

/**
 * Returns the full API base URL including /api suffix.
 * On Vercel: uses relative '/api' (proxied through Vercel to Render).
 * On localhost: uses http://localhost:5000/api.
 */
export const getAPIURL = () => {
  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return '/api';
  }
  return 'http://localhost:5000/api';
};
