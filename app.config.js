/**
 * SafeStep App Configuration
 * ==========================
 * Expo/EAS build configuration
 */

// Single source of truth for the MOBILE app version: package.json. Both the
// Expo `version` and the runtime `extra.APP_VERSION` derive from it so they
// cannot drift. This is distinct from the backend API contract version in
// backend/routing/api.py.
const { version } = require('./package.json');

export default {
  expo: {
    name: "SafeStep",
    slug: "safestep",
    version,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A0A0F"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.safestep.app",
      infoPlist: {
        // Foreground location - always needed
        NSLocationWhenInUseUsageDescription: "SafeStep needs your location to show nearby safety resources and provide safe walking routes.",
        // Background location - for navigation during screen lock
        NSLocationAlwaysAndWhenInUseUsageDescription: "SafeStep needs background location to continue guiding you safely even when your phone is locked.",
        // Camera for photo verification
        NSCameraUsageDescription: "SafeStep needs camera access to add photos to safety reports for verification.",
        // Photo library
        NSPhotoLibraryUsageDescription: "SafeStep needs photo library access to attach existing photos to safety reports.",
        // Background modes
        UIBackgroundModes: ["location", "fetch"]
      },
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0A0A0F"
      },
      package: "com.safestep.app",
      permissions: [
        // Location permissions
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        // Other permissions
        "CAMERA",
        "VIBRATE",
        // Foreground service for background location
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      // Secure storage
      "expo-secure-store",

      // Location with background permissions
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "SafeStep needs background location to continue guiding you safely even when your phone is locked.",
          locationAlwaysPermission: "SafeStep needs background location for safe navigation during screen lock.",
          locationWhenInUsePermission: "SafeStep needs your location to show nearby safety resources and provide safe walking routes.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],

      // Camera for photo reports
      "expo-camera",
      "expo-image-picker",

      // Mapbox - download token comes from RNMAPBOX_MAPS_DOWNLOAD_TOKEN env var
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN || process.env.MAPBOX_DOWNLOADS_TOKEN
        }
      ],

      // Sentry crash reporting
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG || "safestep",
          project: process.env.SENTRY_PROJECT || "react-native"
        }
      ]
    ],
    extra: {
      // These values are passed to the app at runtime via Constants.expoConfig.extra
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
      SENTRY_DSN: process.env.SENTRY_DSN,
      ROUTING_API_URL: process.env.ROUTING_API_URL,
      // Read at runtime by src/config/env.js via Constants.expoConfig.extra.
      APP_VERSION: version,
      eas: {
        projectId: "919c21fd-780e-49f9-944b-b7493f590959"
      }
    },
    owner: "as12711"
  }
}
