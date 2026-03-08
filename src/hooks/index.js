/**
 * Hooks Module
 * =============
 * Centralized exports for all custom hooks.
 */

// Animation hooks
export { usePressAnimation } from './usePressAnimation';
export { useEntranceAnimation } from './useEntranceAnimation';
export { useStaggeredAnimation } from './useStaggeredAnimation';

// Navigation hooks (re-export from navigation module)
export {
  useNavigateToMap,
  useOpenReporting,
  useNavigateToDashboard,
  useNavigateToProfile,
  useResetNavigation,
  useGoBack,
  useRouteParams,
  useIsTabFocused,
} from '../navigation/hooks';
