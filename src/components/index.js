/**
 * SafeStep Components
 * 
 * Export all reusable components
 */

// ===========================================
// CORE UI PRIMITIVES
// ===========================================

// GradientButton - Primary action button with gradient
export { default as GradientButton } from './GradientButton';

// Card - Container component with variants
export { default as Card } from './Card';

// Sheet - Bottom sheet components
export { default as Sheet, SheetHeader, SheetOverlay } from './Sheet';

// Input - Form input components
export { default as Input, SearchInput } from './Input';

// Logo - Brand components
export { default as Logo, LogoCompact, LogoIcon } from './Logo';

// GPS Accuracy Banner - Modern GPS status indicator
export { default as GPSAccuracyBanner, GPSStatusPill } from './GPSAccuracyBanner';

// Photo Verification - Report photo capture
export { 
  default as PhotoCapture, 
  PhotoVerificationPrompt,
  PHOTO_REQUIRED_TYPES,
  PHOTO_RECOMMENDED_TYPES,
  getPhotoRequirement,
} from './PhotoVerification';

// Error Boundary - Graceful error handling
export {
  default as ErrorBoundary,
  SimpleErrorFallback,
  withErrorBoundary,
  useErrorHandler,
} from './ErrorBoundary';

// ===========================================
// LOCATION UI COMPONENTS
// ===========================================
// GPS status, markers, navigation bar - Expo Go compatible
export {
  GPSSignalIndicator,
  LocationStatusBanner,
  AccuracyBadge,
  MovementIndicator,
  PulsingUserMarker,
  AnimatedEmojiMarker,
  ActionButton as LocationActionButton,
  NavigationBar,
} from './LocationUI';

// ===========================================
// SAFESTEP UI COMPONENTS
// ===========================================
// Animated markers, action buttons, forms - Expo Go compatible
export {
  AnimatedSafetyMarker,
  ActionButton,
  ReportForm,
  SafetyFooterMessage,
  SafetyToast,
  SearchResultItem,
} from './SafeStepUI';

// ===========================================
// CITIZEN-STYLE UI COMPONENTS
// ===========================================
// Bottom nav, Waze grid, 3D markers - Expo Go compatible
export {
  BottomTabBar,
  WazeReportGrid,
  CustomReportSheet,
  ConcernRedirectModal,
  GlossyMarker3D,
  IncidentCard,
  ShieldModeBanner,
  CitizenSearchBar,
} from './CitizenUI';

// ===========================================
// SHARED COMPONENTS (NEW - Urban Guardian UI)
// ===========================================
export { PlaceholderScreen, PressableScale } from './shared';

// ===========================================
// NAVIGATION COMPONENTS (NEW - Urban Guardian UI)
// ===========================================
export { BottomNavBar } from './navigation';

// ===========================================
// UI COMPONENTS (NEW - Urban Guardian UI)
// ===========================================
export { SafetyScoreBadge } from './ui';


