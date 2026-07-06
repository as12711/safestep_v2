# SafeStep Production Checklist

Concise reference for a production build. Two independent version streams and
two env files (mobile root, backend).

## Version sources (do not merge these)

| Component | Where it lives | Notes |
|-----------|----------------|-------|
| Mobile app version | `package.json` `version` | Single source of truth. `app.config.js` derives both `expo.version` and `extra.APP_VERSION` from it via `require('./package.json')`. `src/config/env.js` reads it from `Constants.expoConfig.extra.APP_VERSION`. |
| Backend API contract version | `backend/routing/api.py` `version=` | Tracks the API contract, not the app release. Bumped independently. |

To release a new mobile version, bump `package.json` only. To change the API
contract version, edit `api.py` only.

## Required env vars

Copy the templates, never commit the filled-in files.

### Mobile (`.env.example` at repo root)
- `SUPABASE_URL` (required)
- `SUPABASE_ANON_KEY` (required)
- `MAPBOX_ACCESS_TOKEN` (public `pk.*`, runtime geocoding/directions)
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` (secret `sk.*`, native/EAS build only)
- `SENTRY_DSN` (recommended for production crash reporting)
- `ROUTING_API_URL` (set the production URL; must not be `localhost` in prod)
- `NODE_ENV`, `ENABLE_ANALYTICS`, `ENABLE_GUARDIAN_SUBSCRIPTION`, `DEBUG_MODE` (flags)

The mobile app version is NOT env-configured. It comes from `package.json`.

### Backend (`backend/.env.example`)
- `SAFESTEP_AREA`, `SAFESTEP_CACHE_DIR`
- `CORS_ALLOW_ORIGINS` (empty is correct for the mobile-only pilot)
- `RISK_REFRESH_MINUTES`
- `NYC_OPEN_DATA_APP_TOKEN` (Socrata app token; backend only)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (read-only verified-report pull)

## Copy rule (non-negotiable)

No guarantee language in any user-facing copy. Do not use "safe route",
"guarantee", or "keep you safe". Use "informed routing decisions" and
"alternative route suggestions". No em-dashes or en-dashes in copy.
