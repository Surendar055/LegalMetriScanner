/**
 * LegalMetriScan — API & Backend Service Configuration
 *
 * In local development:
 *   Defaults to empty string so Vite's local proxy (/api and /socket.io) routes seamlessly to localhost:4000.
 *
 * In production (Render):
 *   Set VITE_BACKEND_URL (or VITE_API_URL) in Render's environment variables to your deployed backend service
 *   (e.g., https://legalmetriscan-backend.onrender.com).
 */

export const BACKEND_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL
    : '') || ''
).replace(/\/+$/, '');

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!BACKEND_URL) return cleanPath;
  return `${BACKEND_URL}${cleanPath}`;
}

export default {
  BACKEND_URL,
  getApiUrl,
};
