/**
 * LegalMetriScan — API & Backend Service Configuration
 *
 * In local development:
 *   Defaults to empty string so Vite's local proxy (/api and /socket.io) routes seamlessly to localhost:4000 & 4001.
 *
 * In production (Render):
 *   1. Reads VITE_BACKEND_URL or VITE_API_URL or VITE_SOCKET_URL.
 *   2. If running on *.onrender.com, automatically derives the backend URL (e.g. legalmetriscan-backend-java.onrender.com).
 *   3. Supports user override in localStorage ('lms_backend_url') for dynamic field switching.
 */

export function getResolvedBackendUrl() {
  // 1. Manual user override in browser storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('lms_backend_url');
      if (stored && stored.trim().length > 4) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch (e) {}
  }

  // 2. Build-time / Environment variables
  const envBackend = import.meta.env?.VITE_BACKEND_URL;
  const envApi = import.meta.env?.VITE_API_URL;
  const envSocket = import.meta.env?.VITE_SOCKET_URL;
  const envUrl = envBackend || envApi || envSocket;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 4) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Smart Production Auto-Detection on Render
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    // If on render.com and hostname includes 'frontend'
    if (hostname.endsWith('.onrender.com')) {
      if (hostname.includes('frontend')) {
        return `https://${hostname.replace('frontend', 'backend-java')}`;
      }
      // Or if hostname is already a backend service
      if (hostname.includes('backend')) {
        return `https://${hostname}`;
      }
      // Default companion backend naming
      return `https://legalmetriscan-backend-java.onrender.com`;
    }
  }

  // 4. Local Development Fallback: empty string routes through Vite reverse proxy
  return '';
}

export const BACKEND_URL = getResolvedBackendUrl();

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getResolvedBackendUrl();
  if (!baseUrl) return cleanPath;
  return `${baseUrl}${cleanPath}`;
}

export function getSocketUrl() {
  const envSocket = import.meta.env?.VITE_SOCKET_URL;
  if (envSocket && typeof envSocket === 'string' && envSocket.trim().length > 4) {
    return envSocket.trim().replace(/\/+$/, '');
  }
  const baseUrl = getResolvedBackendUrl();
  if (baseUrl) return baseUrl;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:4001';
}

export default {
  BACKEND_URL,
  getResolvedBackendUrl,
  getApiUrl,
  getSocketUrl,
};
