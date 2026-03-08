/**
 * Navigation Types & Configuration
 * =================================
 * Type definitions and route names for React Navigation.
 */

// Root navigator routes
export const RootRoutes = {
  ONBOARDING: 'Onboarding',
  MAIN: 'Main',
  AUTH: 'Auth',
};

// Main tab routes
export const TabRoutes = {
  HOME: 'HomeTab',
  COMMUNITY: 'CommunityTab',
  NAVIGATE: 'NavigateTab',
  ALERTS: 'AlertsTab',
  PROFILE: 'ProfileTab',
};

// Stack routes within each tab
export const HomeStackRoutes = {
  DASHBOARD: 'Dashboard',
  ROUTE_DETAILS: 'RouteDetails',
  ACTIVITY_DETAILS: 'ActivityDetails',
};

export const CommunityStackRoutes = {
  FEED: 'CommunityFeed',
  REPORT: 'Report',
  REPORT_DETAILS: 'ReportDetails',
};

export const NavigateStackRoutes = {
  MAP: 'Map',
  ROUTE_PREVIEW: 'RoutePreview',
  ACTIVE_NAVIGATION: 'ActiveNavigation',
  SEARCH: 'Search',
};

export const AlertsStackRoutes = {
  ALERTS_LIST: 'AlertsList',
  ALERT_DETAILS: 'AlertDetails',
};

export const ProfileStackRoutes = {
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
  SAVED_PLACES: 'SavedPlaces',
  EMERGENCY_CONTACTS: 'EmergencyContacts',
  PRIVACY_SETTINGS: 'PrivacySettings',
};

export const OnboardingStackRoutes = {
  WELCOME: 'Welcome',
  HOW_IT_WORKS: 'HowItWorks',
  PERMISSIONS: 'Permissions',
  PERSONALIZATION: 'Personalization',
  COMMUNITY: 'Community',
  READY: 'Ready',
};

// Default screen options for consistent styling
export const defaultScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

// Modal screen options
export const modalScreenOptions = {
  headerShown: false,
  presentation: 'modal',
  animation: 'slide_from_bottom',
  gestureEnabled: true,
  gestureDirection: 'vertical',
};

// Full screen modal options
export const fullScreenModalOptions = {
  headerShown: false,
  presentation: 'fullScreenModal',
  animation: 'fade',
};
