/**
 * Returns the backend base URL (no /api suffix) for socket.io connections.
 * Works in both local dev and production (Vercel -> Render).
 */
export const getBackendURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return 'https://college-erp-software.onrender.com';
  }
  return 'http://localhost:5000';
};

/**
 * Returns the full API base URL including /api suffix.
 */
export const getAPIURL = () => {
  return `${getBackendURL()}/api`;
};
