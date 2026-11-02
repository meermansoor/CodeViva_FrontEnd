const env = import.meta.env;

const trimSlash = (s) => (s ? s.trim().replace(/[/]+$/, '') : s);

function resolveBackendUrl() {
  const value = env.VITE_BACKEND_URL;
  if (value === undefined) {
    if (env.PROD) throw new Error('VITE_BACKEND_URL is not set for this production build');
    return 'http://localhost:5000'; // development fallback only
  }
  return trimSlash(value); // empty string means same origin
}

export const BACKEND_URL = resolveBackendUrl();
export const SOCKET_URL = BACKEND_URL;
export const RAG_URL = trimSlash(env.VITE_RAG_URL) || null;

export const STUN_URLS = (env.VITE_STUN_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const TURN_CONFIG = env.VITE_TURN_URL
  ? {
      urls: env.VITE_TURN_URL,
      username: env.VITE_TURN_USERNAME || '',
      credential: env.VITE_TURN_CREDENTIAL || '',
    }
  : null;

// Build an absolute URL for files served by the backend (audio, downloads).
export const fileUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!BACKEND_URL) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${cleanPath}`;
};
