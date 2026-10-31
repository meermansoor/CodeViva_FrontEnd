# API & Network Architecture Conventions

## Backend URL & Port Configuration
- All backend host and port addresses are managed via environment files (`.env.development`, `.env.production`).
- To change the backend port or IP, edit `VITE_BACKEND_URL` in `.env.local` (or `.env.development`) and restart the Vite dev server (`npm run dev`).
- `src/config/env.js` is the **only** file allowed to read `import.meta.env`.

## Endpoints, Constants, and Storage
- **REST Endpoints:** Defined in `src/constants/endpoints.js` (relative paths and dynamic builders).
- **Socket Events:** Defined in `src/constants/socketEvents.js` (`SOCKET_EVENTS` and `LIVE_UPDATE_TYPE`).
- **Storage Keys:** Defined in `src/constants/storage.js` (`STORAGE_KEYS`).
- **Auth Session & Storage:** Managed through `src/utils/authSession.js` and `src/utils/storage.js`.

## HTTP Client & Enforcement
- `src/services/api.js` is the **only** file permitted to import `axios`. It automatically injects auth headers via request interceptors.
- Run `npm run lint:literals` to verify that no forbidden hardcoded URLs, hostnames, or direct axios imports exist. This runs automatically prior to every build (`npm run build`).
