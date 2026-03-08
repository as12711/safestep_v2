# SafeStep

Pedestrian safety navigation app for urban environments. Routes users through safer streets using real-time crime data, street lighting, and community reports.

Built with React Native (Expo SDK 54) + Python (FastAPI) backend.

## Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Python 3.11+ (for backend)
- Xcode (iOS) or Android Studio (Android)

### Mobile App

```bash
npm install
cp .env.example .env          # Fill in your API keys
npx expo run:ios               # iOS (requires dev build, not Expo Go)
npx expo run:android           # Android
```

> **Note:** This app uses native modules (`react-native-maps`, `expo-location`, etc.) and requires a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not Expo Go.

### Backend (Routing API)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn routing.api:app --reload --port 8000
```

The backend downloads and caches OpenStreetMap pedestrian network data on first run. It fetches live NYC crime/911 data to calculate safety-weighted routes.

### OSM Data Pipeline

To regenerate the Manhattan walking network data:

```bash
cd backend/map_creation
python osm_map.py              # Outputs nodes_osm.csv and edges_osm.csv
```

## Environment Variables

Copy `.env.example` and fill in values:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `MAPBOX_ACCESS_TOKEN` | Yes | Mapbox public token (for maps) |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | Build only | Mapbox secret download token (set via EAS Secrets) |
| `SENTRY_DSN` | No | Sentry crash reporting DSN |
| `ROUTING_API_URL` | No | Backend URL (defaults to `localhost:8000` in dev) |

**Important:** Never commit API keys to git. Use [EAS Secrets](https://docs.expo.dev/build-reference/variables/) for build-time variables.

## Project Structure

```
├── App.js                          # Entry point (providers + navigator)
├── index.js                        # Expo register
├── app.config.js                   # Expo configuration
├── metro.config.js                 # Metro bundler config
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── map/                    #   Map-specific (RouteCard, SafetyHeader, NavigationPanel, etc.)
│   │   ├── navigation/             #   BottomNavBar
│   │   ├── shared/                 #   PressableScale, PlaceholderScreen
│   │   └── ui/                     #   SafetyScoreBadge
│   ├── config/                     # Environment + Sentry config
│   ├── contexts/                   # React contexts (Auth, Settings, App state)
│   ├── data/                       # Static safety data definitions
│   ├── hooks/                      # Animation hooks
│   ├── navigation/                 # React Navigation setup
│   │   └── stacks/                 #   Tab stack navigators
│   ├── screens/                    # Screen components
│   │   ├── dashboard/              #   Home dashboard + sub-components
│   │   ├── onboarding/             #   Multi-step onboarding flow
│   │   ├── profile/                #   User profile + settings
│   │   └── reporting/              #   Safety report submission
│   ├── services/                   # Business logic + API clients
│   ├── theme/                      # Design system (colors, spacing, typography)
│   └── utils/                      # Cleanup, animation, vibrancy utilities
├── backend/
│   ├── routing/                    # FastAPI routing service
│   │   ├── api.py                  #   REST endpoints
│   │   ├── safe_router.py          #   A* pathfinding with safety weights
│   │   ├── graph_manager.py        #   OSMnx graph construction + caching
│   │   ├── weight_calculator.py    #   Multi-factor cost model
│   │   └── risk_service.py         #   Live NYC Open Data integration
│   ├── map_creation/               # OSM data pipeline
│   │   └── osm_map.py             #   Manhattan network extraction
│   ├── Dockerfile                  # Container build
│   └── requirements.txt            # Python dependencies
├── supabase/                       # Database schema + migrations
└── docker-compose.yml              # Backend orchestration
```

## Architecture

### Navigation Flow

```
Root (NativeStack)
├── OnboardingNavigator (first launch)
│   └── Welcome → HowItWorks → Permissions → Personalization → Community → Ready
└── MainTabNavigator (5 tabs)
    ├── Home     → Dashboard, RouteDetails, ActivityDetails
    ├── Community → Feed, Report, ReportDetails
    ├── Navigate  → MapScreen (core), RoutePreview, ActiveNavigation, Search
    ├── Alerts   → AlertsList, AlertDetails
    └── Profile  → Profile, EditProfile, SavedPlaces, EmergencyContacts, Privacy
```

### Context Providers

- **AuthContext** -- Authentication state, sign in/up/out, session persistence
- **SettingsContext** -- 25+ app preferences persisted to AsyncStorage
- **AppContext** -- Location state, reports, navigation, haptic feedback, toasts

### Backend Routing

The Python backend calculates safety-weighted pedestrian routes:

1. Loads Manhattan's walkable street graph from OpenStreetMap (cached as pickle)
2. Fetches live NYC 911 calls and NYPD complaint data from NYC Open Data API
3. Applies multi-factor edge weights: crime risk, lighting, sidewalk quality, accessibility
4. Runs A*/Dijkstra with edge-penalty diversity to generate 3 distinct route alternatives
5. Returns routes with street-level turn-by-turn segments

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Cannot read property 'regular' of undefined" | Navigation theme fonts missing -- already fixed in this version |
| App crashes on launch with context error | SafeStepProviders wrapper missing -- already fixed in this version |
| "Unrecognized font family" on iOS sim | Run `npx expo run:ios` (not Expo Go) |
| Location permission errors on startup | Check that location services are enabled in simulator/device settings |
| Metro bundler timeout | Delete `node_modules`, run `npm install`, restart Metro with `--reset-cache` |
| Backend won't start | Ensure Python venv is activated and `pip install -r requirements.txt` completed |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run tunnel` | Start with tunnel (for phone testing) |
| `npm run ios` | Build and run on iOS |
| `npm run android` | Build and run on Android |
| `npm run backend` | Start the Python routing API |
