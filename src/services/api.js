import axios from 'axios';
import { BACKEND_URL, RAG_URL } from '../config/env';
import { getAuthToken } from '../utils/authSession';

export const REQUEST_TIMEOUT_MS = 15000;
// Use for uploads, question generation, and transcription, which can be slow
export const LONG_REQUEST_TIMEOUT_MS = 120000;

let onUnauthorized = null;
// The app registers its logout handling here later (Redux or router). No store import needed.
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

function describeError(err) {
  const status = err.response?.status ?? null;
  let code = 'NETWORK_ERROR';
  if (err.code === 'ECONNABORTED') code = 'TIMEOUT';
  else if (err.response) code = err.response.data?.code ?? 'HTTP_ERROR';
  return { status, code, message: err.response?.data?.message ?? err.message };
}

function createClient(baseURL) {
  const client = axios.create({ baseURL, timeout: REQUEST_TIMEOUT_MS });

  client.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      err.normalized = describeError(err); // added, original error shape is untouched
      const skip = err.config?.skipUnauthorizedHandler === true;
      if (err.response?.status === 401 && !skip && onUnauthorized) {
        onUnauthorized(err);
      }
      return Promise.reject(err);
    }
  );

  return client;
}

export const api = createClient(BACKEND_URL);
export const ragApi = RAG_URL ? createClient(RAG_URL) : null;
export default api;
