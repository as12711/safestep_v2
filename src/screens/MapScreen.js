/**
 * MapScreen
 * =========
 * The core SafeStep experience - safety-aware map navigation.
 * This is the main screen users interact with.
 */

import React, { memo, useState, useCallback, useRef, useEffect, useMemo, useReducer } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Switch,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import * as Haptics from 'expo-haptics';

import { theme } from '../theme/designSystem';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useApp } from '../contexts/AppContext';
import { ENV } from '../config/env';
import { supabase } from '../services';

// Components
import SafetyHeader from '../components/map/SafetyHeader';
import BottomNavBar from '../components/navigation/BottomNavBar';
import RouteCard from '../components/map/RouteCard';
import SafetyScoreBadge from '../components/ui/SafetyScoreBadge';
import NavigationPanel from '../components/map/NavigationPanel';
import ArrivalOverlay from '../components/map/ArrivalOverlay';
import TripReviewSheet from '../components/map/TripReviewSheet';

const { colors, layout, spacing, radius, shadows, getSafetyColor } = theme;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom map style for dark mode - Urban Guardian aesthetic
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0F1419' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F1419' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5C6C7A' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1A1F26' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1A1F26' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#232A33' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#232A33' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0A0D10' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
];

// Fixed points for demo
// ORIGIN: Astor Place (4th Ave & Astor Pl) — confirmed real intersection
// DESTINATION: Washington Square Arch (center of WSP)
const ORIGIN = { latitude: 40.7294, longitude: -73.9905 };
const DESTINATION = { latitude: 40.7308, longitude: -73.9973 };

// Coarse pilot area label for analytics. This is the whole pilot region, not a
// precise location: it matches the backend SAFESTEP_AREA ("nyu"). Analytics
// events never carry user coordinates or a location trail (agent-context §2.3).
const PILOT_AREA = 'nyu';


// Backend API
const API_BASE = ENV.ROUTING_API_URL || 'http://localhost:8000';

async function fetchRoutes(originCoords, destCoords) {
  try {
    console.log('[MapScreen] Fetching routes from:', API_BASE);
    // Canonical routing path: the frontend-shaped /route/app endpoint. It
    // returns routes already in the shape the UI consumes (coordinates as
    // {latitude, longitude}, distance in miles, safetyScore 0-100), so no
    // client-side re-scoring or coordinate juggling is needed.
    const res = await fetch(`${API_BASE}/route/app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: originCoords[0], lng: originCoords[1] },
        destination: { lat: destCoords[0], lng: destCoords[1] },
        alternatives: true,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('[MapScreen] Routes fetched:', data.routes?.length ?? 0);

    const apiRoutes = (data.routes || []).map((r, idx) => ({
      id: r.id || `route_${idx}`,
      name: r.name || 'Route',
      safetyScore: r.safetyScore,
      distance: r.distance,          // miles (RouteCard formats)
      duration: r.duration,          // minutes
      viaStreets: r.viaStreets || [],
      crowdLevel: r.crowdLevel || 'moderate',
      hasLighting: r.hasLighting,
      isAccessible: r.isAccessible,
      alerts: r.alerts || [],
      coordinates: r.coordinates,    // already [{latitude, longitude}]
    }));

    if (apiRoutes.length === 0) return null;
    return { routes: apiRoutes };
  } catch (err) {
    console.warn('[SafeStep] Routing API unavailable:', err.message);
    return null;
  }
}

// Filter state management — defined outside component so reducer is never re-created
const FILTER_INITIAL = {
  avoidConstruction: false,
  wellLitOnly: false,
  busyAreas: false,
  avoidPolice: false,
  accessible: false,
  avoidStairs: false,
};

function filtersReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': return { ...state, [action.key]: !state[action.key] };
    case 'CLEAR': return { ...FILTER_INITIAL };
    default: return state;
  }
}

const routeHasTag = (route, tag) => {
  const normalizedTag = String(tag || '').toLowerCase();
  if (!normalizedTag) return false;

  return (route.alerts || []).some(alert => {
    const alertTag = String(alert?.tag || '').toLowerCase();
    const alertIcon = String(alert?.icon || '');

    if (normalizedTag === 'construction') {
      return alertTag === 'construction' || alertIcon === '🚧';
    }

    return alertTag === normalizedTag;
  });
};

const filterSatisfies = (route, key) => {
  switch (key) {
    case 'wellLitOnly':       return route.hasLighting === true;
    case 'accessible':        return route.isAccessible === true;
    case 'avoidStairs':       return route.isAccessible === true;
    case 'avoidConstruction': return !routeHasTag(route, 'construction');
    case 'busyAreas':         return route.crowdLevel === 'busy';
    case 'avoidPolice':       return true; // no police data in demo — always satisfies
    default:                  return false;
  }
};

const PREFERENCE_FILTER_KEYS = new Set(['busyAreas', 'avoidPolice']);

// Demo safety markers along the routes
const DEMO_MARKERS = [
  { id: 'bl-1', type: 'blueLight', coordinate: { latitude: 40.7285, longitude: -73.9900 } },
  { id: 'bl-2', type: 'blueLight', coordinate: { latitude: 40.7300, longitude: -73.9955 } },
  { id: 'sh-1', type: 'safeHaven', coordinate: { latitude: 40.7272, longitude: -73.9870 } },
  { id: 'inc-1', type: 'incident', coordinate: { latitude: 40.7275, longitude: -73.9930 }, severity: 0.6 },
];

const MapScreen = memo(({
  onNavigationStart,
  onProfilePress,
  onSettingsPress,
}) => {
  const mapRef = useRef(null);
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const { location, gpsAccuracy } = useApp();

  // Local state
  const [activeTab, setActiveTab] = useState('home');
  const [searchValue, setSearchValue] = useState('Washington Square Park');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routingStatus, setRoutingStatus] = useState('loading'); // 'loading' | 'ready' | 'offline'
  const [currentSafetyScore, setCurrentSafetyScore] = useState(78);
  const [showFilters, setShowFilters] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [activeFilters, dispatchFilter] = useReducer(filtersReducer, FILTER_INITIAL);
  const [crimeMarkers, setCrimeMarkers] = useState([]);

  // Navigation simulation state
  const [navStep, setNavStep]       = useState(0);
  const [navArrived, setNavArrived] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const navTimerRef                 = useRef(null);
  // Ref so the interval callback always sees the latest route without re-creating the timer
  const navRouteRef                 = useRef(null);
  // Keep a snapshot of the completed route for the review screen (selectedRoute may be null by then)
  const completedRouteRef           = useRef(null);

  // Fetch real routes from the backend. If the routing service is unreachable
  // we surface an explicit offline state — we never fall back to fabricated
  // routes, since presenting demo data as a real safety-informed route would
  // misrepresent the product.
  const loadRoutes = useCallback(() => {
    setRoutingStatus('loading');
    fetchRoutes(
      [ORIGIN.latitude, ORIGIN.longitude],
      [DESTINATION.latitude, DESTINATION.longitude],
    ).then(result => {
      if (result) {
        // Use all routes from API (Safest, Balanced, Fastest, alternatives).
        // /route/app returns no raw incident markers by design (agent-context
        // §2.2: no crime overlays / area "danger" labels). Risk is expressed
        // only through route ranking and per-segment shading.
        setRoutes(result.routes);
        setSelectedRoute(result.routes[0]);
        setRoutingStatus('ready');
        // Pilot analytics (consent-gated in supabase.logEvent). Fires once per
        // completed request, only on the success path. Coarse fields only:
        // the pilot area label and the number of routes returned, no coords.
        supabase.logEvent('route_requested', {
          area: PILOT_AREA,
          route_count: result.routes.length,
        });
      } else {
        setRoutes([]);
        setSelectedRoute(null);
        setRoutingStatus('offline');
      }
    });
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  // AND semantics for strict filters: all active non-preference filters must pass.
  // Preference filters only re-rank matching routes; they do not exclude routes.
  const filteredRoutes = useMemo(() => {
    const activeKeys = Object.keys(activeFilters).filter(k => activeFilters[k]);
    const hardKeys = activeKeys.filter(k => !PREFERENCE_FILTER_KEYS.has(k));
    const preferenceKeys = activeKeys.filter(k => PREFERENCE_FILTER_KEYS.has(k));

    if (activeKeys.length === 0) {
      return [...routes].sort((a, b) => b.safetyScore - a.safetyScore);
    }

    const hardFilteredRoutes = routes.filter(route =>
      hardKeys.every(k => filterSatisfies(route, k))
    );

    if (hardFilteredRoutes.length === 0) {
      return [];
    }

    if (preferenceKeys.length === 0) {
      return [...hardFilteredRoutes].sort((a, b) => b.safetyScore - a.safetyScore);
    }

    return hardFilteredRoutes
      .map(route => ({
        ...route,
        preferenceMatchCount: preferenceKeys.filter(k => filterSatisfies(route, k)).length,
      }))
      .sort((a, b) =>
        b.preferenceMatchCount !== a.preferenceMatchCount
          ? b.preferenceMatchCount - a.preferenceMatchCount
          : b.safetyScore - a.safetyScore
      );
  }, [activeFilters, routes]);

  // Sync selectedRoute when filters change — use a ref to avoid stale closure
  const selectedRouteRef = useRef(selectedRoute);
  useEffect(() => { selectedRouteRef.current = selectedRoute; }, [selectedRoute]);
  useEffect(() => {
    if (filteredRoutes.length === 0) return;
    const stillValid = filteredRoutes.some(r => r.id === selectedRouteRef.current?.id);
    if (!stillValid) setSelectedRoute(filteredRoutes[0]);
  }, [filteredRoutes]);

  // Effective selection: always a route that exists in the current filtered list
  const effectiveSelected = filteredRoutes.find(r => r.id === selectedRoute?.id) ?? filteredRoutes[0] ?? null;

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  // Animation values — start at 1 since routes are shown on load
  const routeSheetAnim = useRef(new Animated.Value(1)).current;

  // Region centered between origin and destination
  const [region, setRegion] = useState({
    latitude: (ORIGIN.latitude + DESTINATION.latitude) / 2,
    longitude: (ORIGIN.longitude + DESTINATION.longitude) / 2,
    latitudeDelta: 0.022,
    longitudeDelta: 0.022,
  });

  // Auto-zoom to fit the routes on mount, accounting for panel covering bottom half
  useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [ORIGIN, DESTINATION],
        { edgePadding: { top: 160, right: 50, bottom: 420, left: 50 }, animated: true }
      );
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Navigation simulation: advance one waypoint every 2.5 s, fire haptics + re-center map
  useEffect(() => {
    if (!isNavigating) {
      clearInterval(navTimerRef.current);
      setNavStep(0);
      setNavArrived(false);
      return;
    }

    navRouteRef.current = effectiveSelected;
    let step = 0;

    navTimerRef.current = setInterval(() => {
      const route = navRouteRef.current;
      const coords = route?.coordinates ?? [];
      const instrLen = route?.instructions?.length ?? 0;
      const totalSteps = Math.max(instrLen > 0 ? instrLen - 1 : 0, coords.length - 1, 1);
      step += 1;

      if (step >= totalSteps) {
        clearInterval(navTimerRef.current);
        setNavStep(totalSteps);
        setNavArrived(true);
        // Pilot analytics: navigation completed (arrival). Fires once, since the
        // interval is cleared here. Coarse: route id only, no coords/trail.
        supabase.logEvent('navigation_completed', { route_id: route?.id });
        // Celebratory haptic burst
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 450);
      } else {
        setNavStep(step);

        // Turn haptic vs straight haptic
        const dir = route?.instructions?.[step]?.dir;
        if (dir === 'left' || dir === 'right') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Re-center map on new simulated position
        const coord = coords[Math.min(step, coords.length - 1)];
        if (coord) {
          mapRef.current?.animateToRegion({
            latitude:      coord.latitude,
            longitude:     coord.longitude,
            latitudeDelta:  0.006,
            longitudeDelta: 0.006,
          }, 900);
        }
      }
    }, 2500);

    return () => clearInterval(navTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating]);

  // Handle tab press
  const handleTabPress = useCallback((tabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabId);

    if (tabId === 'profile') {
      onProfilePress?.();
    }
  }, [onProfilePress]);

  // Handle navigate button press (center nav button in tab bar)
  const handleNavigatePress = useCallback(() => {
    if (isNavigating) {
      handleEndNavigation();
    } else {
      setShowRoutes(true);
      Animated.spring(routeSheetAnim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    }
  }, [isNavigating]);

  // Handle route selection — just updates selected route, callers control sheet state
  const handleRouteSelect = useCallback((route) => {
    setSelectedRoute(route);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Start navigation: close sheet, zoom in to street level at origin
  const handleStartNavigation = useCallback(() => {
    if (!effectiveSelected) return;
    navRouteRef.current = effectiveSelected;
    completedRouteRef.current = effectiveSelected;
    setIsNavigating(true);
    setShowRoutes(false);
    setNavStep(0);
    setNavArrived(false);
    setShowReview(false);
    onNavigationStart?.(effectiveSelected);
    // Pilot analytics: "route taken" (navigation started). Coarse fields only:
    // the route id and its safety score, never origin/destination coords.
    supabase.logEvent('navigation_started', {
      route_id: effectiveSelected.id,
      safety_score: effectiveSelected.safetyScore,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      mapRef.current?.animateToRegion({
        latitude:      ORIGIN.latitude,
        longitude:     ORIGIN.longitude,
        latitudeDelta:  0.006,
        longitudeDelta: 0.006,
      }, 800);
    }, 300);
  }, [effectiveSelected, onNavigationStart]);

  // Mid-route "End" button: cancel navigation and return to route overview
  const handleEndNavigation = useCallback(() => {
    setIsNavigating(false);
    setShowRoutes(true);
    setNavStep(0);
    setNavArrived(false);
    setShowReview(false);
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [ORIGIN, DESTINATION],
        { edgePadding: { top: 160, right: 50, bottom: 420, left: 50 }, animated: true }
      );
    }, 300);
  }, []);

  // Arrival "Done": transition to trip review
  const handleArrivalDone = useCallback(() => {
    setNavArrived(false);
    setShowReview(true);
  }, []);

  // Full reset after review: back to a clean default map, no panels, no route
  const handleFullReset = useCallback(() => {
    setIsNavigating(false);
    setNavArrived(false);
    setNavStep(0);
    setShowReview(false);
    setShowRoutes(false);
    setSelectedRoute(null);
    setSearchValue('');
    setTimeout(() => {
      mapRef.current?.animateToRegion({
        latitude:      40.7301,
        longitude:     -73.9939,
        latitudeDelta:  0.028,
        longitudeDelta: 0.028,
      }, 700);
    }, 200);
  }, []);

  // Handle report
  const handleReport = useCallback((reportType) => {
    console.log('Report:', reportType);
    // TODO: Integrate with report service
  }, []);

  // Render safety markers
  const renderMarker = useCallback((marker) => {
    const markerConfig = {
      blueLight: { icon: '🔵', color: colors.feature.blueLight },
      safeHaven: { icon: '🟣', color: colors.feature.safeHaven },
      incident: { icon: '⚠️', color: colors.safety.alert },
    };

    const config = markerConfig[marker.type] || markerConfig.incident;

    return (
      <Marker
        key={marker.id}
        coordinate={marker.coordinate}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={[styles.markerContainer, { shadowColor: config.color }]}>
          <View style={[styles.markerInner, { backgroundColor: `${config.color}30` }]}>
            <Text style={styles.markerIconText}>{config.icon}</Text>
          </View>
        </View>
      </Marker>
    );
  }, []);

  // Render route polyline + score badge. All routes pre-mounted to avoid remount delay.
  // During navigation, the selected route is split into completed (gray) + remaining (colored).
  const renderRoute = useCallback((route, isSelected, isVisible, onPress) => {
    const safetyColor = getSafetyColor(route.safetyScore);
    const coords = route.coordinates;
    const mid = coords[Math.floor(coords.length / 2)];
    const badgeCoord = { latitude: mid.latitude + 0.0004, longitude: mid.longitude };

    // During active navigation on the selected route, split polyline at navStep
    if (isNavigating && isSelected && coords.length > 1) {
      const clampedStep = Math.min(navStep, coords.length - 1);
      const completedCoords = coords.slice(0, clampedStep + 1);
      const remainingCoords = coords.slice(clampedStep);
      return (
        <React.Fragment key={route.id}>
          {completedCoords.length >= 2 && (
            <Polyline
              key={route.id + '-done'}
              coordinates={completedCoords}
              strokeWidth={5}
              strokeColor="rgba(120,120,120,0.4)"
              lineCap="round"
              lineJoin="round"
            />
          )}
          {remainingCoords.length >= 2 && (
            <Polyline
              key={route.id + '-remaining'}
              coordinates={remainingCoords}
              strokeWidth={8}
              strokeColor={safetyColor}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={route.id}>
        <Polyline
          key={route.id + '-line'}
          coordinates={coords}
          strokeWidth={isVisible ? (isSelected ? 8 : 3) : 0}
          strokeColor={isVisible ? (isSelected ? safetyColor : 'rgba(150,150,150,0.35)') : 'transparent'}
          lineDashPattern={isVisible && !isSelected ? [8, 6] : null}
          lineCap="round"
          lineJoin="round"
          tappable={isVisible}
          onPress={isVisible ? onPress : undefined}
        />
        {/* Badge hidden during navigation */}
        {!isNavigating && (
          <Marker
            key={route.id + '-badge'}
            coordinate={badgeCoord}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            onPress={isVisible ? onPress : undefined}
          >
            <View style={{ opacity: isVisible ? 1 : 0 }}>
              <View style={[
                styles.routeScoreBadge,
                isSelected
                  ? { backgroundColor: safetyColor }
                  : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: safetyColor },
              ]}>
                <Text style={[
                  styles.routeScoreBadgeText,
                  !isSelected && { color: safetyColor },
                ]}>{route.safetyScore}</Text>
              </View>
            </View>
          </Marker>
        )}
      </React.Fragment>
    );
  }, [isNavigating, navStep]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* Safety markers */}
        {DEMO_MARKERS.map(renderMarker)}

        {/* Crime incident markers from backend */}
        {crimeMarkers.map((m, i) => (
          <Circle
            key={`crime-${i}`}
            center={{ latitude: m.lat, longitude: m.lon }}
            radius={30}
            fillColor="rgba(255,60,60,0.25)"
            strokeColor="rgba(255,60,60,0.6)"
            strokeWidth={1}
          />
        ))}

        {/* During navigation: only the active route (split completed/remaining).
            During selection: selected route + up to 4 alternatives (5 total on map). */}
        {isNavigating
          ? effectiveSelected && renderRoute(effectiveSelected, true, true, null)
          : showRoutes && (() => {
              // Show selected route + first 4 alternatives (5 total visible)
              const MAX_VISIBLE_ROUTES = 5;
              const selectedRoute = effectiveSelected;
              const alternatives = filteredRoutes.slice(0, MAX_VISIBLE_ROUTES).filter(r => r.id !== selectedRoute?.id);
              const routesToShow = selectedRoute ? [selectedRoute, ...alternatives.slice(0, MAX_VISIBLE_ROUTES - 1)] : alternatives.slice(0, MAX_VISIBLE_ROUTES);
              
              return filteredRoutes.map((route) => {
                const isSelected = effectiveSelected?.id === route.id;
                const isVisible = routesToShow.some(r => r.id === route.id);
                return renderRoute(route, isSelected, isVisible, () => handleRouteSelect(route));
              });
            })()
        }

        {/* Origin pin */}
        <Marker coordinate={ORIGIN} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.originPin}>
            <Text style={styles.originPinText}>📍</Text>
          </View>
        </Marker>

        {/* Destination pin */}
        <Marker coordinate={DESTINATION} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.destPin}>
            <Text style={styles.destPinText}>🏁</Text>
            <Text style={styles.destPinLabel}>WSP</Text>
          </View>
        </Marker>

        {/* User location accuracy circle */}
        {location && (
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={gpsAccuracy || 20}
            fillColor={colors.safety.safeGlow}
            strokeColor={colors.safety.safe}
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* Safety header */}
      <SafetyHeader
        safetyScore={currentSafetyScore}
        userName={user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? null}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchFocus={() => setShowRoutes(true)}
        onMenuPress={onSettingsPress}
        onSafetyPress={() => {}}
      />

      {/* Route selection sheet */}
      {showRoutes && (
        <Animated.View
          style={[
            styles.routeSheet,
            {
              transform: [{
                translateY: routeSheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.routeSheetHandleTap}
            onPress={() => setSheetCollapsed(c => !c)}
            activeOpacity={0.7}
          >
            <View style={styles.routeSheetHandle} />
          </TouchableOpacity>

          {!sheetCollapsed && (
            <>
              {/* TODO(P1-4 copy audit): this report count is placeholder copy. */}
              {routingStatus === 'ready' && (
                <View style={styles.alertBanner}>
                  <Text style={styles.alertBannerText}>
                    🔔 8 reports near WSP tonight. Safety-informed route highlighted.
                  </Text>
                </View>
              )}

              <View style={styles.routeSheetHeader}>
                <View style={styles.routeSheetTitle}>
                  <Text style={styles.routeSheetIcon}>📍</Text>
                  <View style={styles.routeSheetDestination}>
                    <Text style={styles.routeSheetLabel}>Destination</Text>
                    <Text style={styles.routeSheetName}>Washington Square Park</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
                    onPress={() => { setShowFilters(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={styles.filterButtonIcon}>⚙️</Text>
                    <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
                      Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {routingStatus === 'offline' ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>⚠️</Text>
                  <Text style={styles.emptyStateTitle}>Routing unavailable</Text>
                  <Text style={styles.emptyStateText}>We couldn't reach the routing service. Check your connection and try again.</Text>
                  <TouchableOpacity
                    style={styles.emptyStateReset}
                    onPress={loadRoutes}
                  >
                    <Text style={styles.emptyStateResetText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : routingStatus === 'loading' ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>🧭</Text>
                  <Text style={styles.emptyStateTitle}>Finding routes…</Text>
                  <Text style={styles.emptyStateText}>Loading safety-informed route suggestions.</Text>
                </View>
              ) : filteredRoutes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>🕵️</Text>
                  <Text style={styles.emptyStateTitle}>Too safe for these streets?</Text>
                  <Text style={styles.emptyStateText}>No routes match your filters. Try relaxing a few. Even superheroes take the long way sometimes.</Text>
                  <TouchableOpacity
                    style={styles.emptyStateReset}
                    onPress={() => dispatchFilter({ type: 'CLEAR' })}
                  >
                    <Text style={styles.emptyStateResetText}>Reset filters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  style={styles.routesList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {filteredRoutes.map((route, index) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      isSelected={effectiveSelected?.id === route.id}
                      isRecommended={index === 0}
                      onSelect={handleRouteSelect}
                      style={styles.routeCard}
                    />
                  ))}
                </ScrollView>
              )}

              {effectiveSelected && filteredRoutes.length > 0 && (
                <View style={styles.startButtonContainer}>
                  <Animated.View style={styles.startButton}>
                    <View
                      style={styles.startButtonInner}
                      onTouchEnd={handleStartNavigation}
                    >
                      <View style={styles.startButtonContent}>
                        <Text style={styles.startButtonIcon}>🚶</Text>
                        <Text style={styles.startButtonText}>Start Walking</Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              )}
            </>
          )}
        </Animated.View>
      )}

      {/* Filter sheet */}
      {showFilters && (
        <View style={styles.filterOverlay}>
          <Pressable style={styles.filterBackdrop} onPress={() => setShowFilters(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Route Filters</Text>
              <View style={styles.filterSheetHeaderActions}>
                <TouchableOpacity onPress={() => dispatchFilter({ type: 'CLEAR' })}>
                  <Text style={styles.filterClearText}>Clear all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterCloseButton} onPress={() => setShowFilters(false)}>
                  <Text style={styles.filterCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionLabel}>SAFETY</Text>
              {[
                { key: 'wellLitOnly', icon: '💡', label: 'Well-Lit Routes Only', desc: 'Prioritize streets with working streetlights', trackOn: colors.safety.safe },
                { key: 'busyAreas', icon: '👥', label: 'Prefer Busy Areas', desc: 'Routes with higher foot traffic', trackOn: colors.safety.safe },
                { key: 'avoidConstruction', icon: '🚧', label: 'Avoid Construction', desc: 'Skip routes with active scaffolding or closures', trackOn: colors.safety.safe },
                { key: 'avoidPolice', icon: '🚔', label: 'Avoid Police Presence', desc: 'De-prioritize routes near police activity', trackOn: colors.safety.safe },
              ].map(({ key, icon, label, desc, trackOn }) => (
                <TouchableOpacity
                  key={key}
                  style={styles.filterRow}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); dispatchFilter({ type: 'TOGGLE', key }); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterRowIcon}>{icon}</Text>
                  <View style={styles.filterRowText}>
                    <Text style={styles.filterRowLabel}>{label}</Text>
                    <Text style={styles.filterRowDesc}>{desc}</Text>
                  </View>
                  <View pointerEvents="none">
                    <Switch
                      value={activeFilters[key]}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.ui.border, true: trackOn }}
                      thumbColor={activeFilters[key] ? '#fff' : colors.text.tertiary}
                    />
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={[styles.filterSectionLabel, { marginTop: 16 }]}>ACCESSIBILITY</Text>
              {[
                { key: 'accessible', icon: '♿', label: 'Accessible Routes', desc: 'Avoid stairs and steep inclines', trackOn: colors.community.primary },
                { key: 'avoidStairs', icon: '🪜', label: 'Avoid Stairs', desc: 'Flat terrain and ramp-accessible paths only', trackOn: colors.community.primary },
              ].map(({ key, icon, label, desc, trackOn }) => (
                <TouchableOpacity
                  key={key}
                  style={styles.filterRow}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); dispatchFilter({ type: 'TOGGLE', key }); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterRowIcon}>{icon}</Text>
                  <View style={styles.filterRowText}>
                    <Text style={styles.filterRowLabel}>{label}</Text>
                    <Text style={styles.filterRowDesc}>{desc}</Text>
                  </View>
                  <View pointerEvents="none">
                    <Switch
                      value={activeFilters[key]}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.ui.border, true: trackOn }}
                      thumbColor={activeFilters[key] ? '#fff' : colors.text.tertiary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => {
                setShowFilters(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Text style={styles.filterApplyText}>
                Apply{activeFilterCount > 0 ? ` ${activeFilterCount} Filter${activeFilterCount > 1 ? 's' : ''}` : ' Filters'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Navigation HUD — shown while walking */}
      {isNavigating && !navArrived && (
        <NavigationPanel
          route={effectiveSelected}
          navStep={navStep}
          onEnd={handleEndNavigation}
        />
      )}

      {/* Arrival celebration overlay */}
      {navArrived && (
        <ArrivalOverlay
          route={completedRouteRef.current}
          onDone={handleArrivalDone}
        />
      )}

      {/* Trip review sheet */}
      {showReview && (
        <TripReviewSheet
          route={completedRouteRef.current}
          onSubmit={handleFullReset}
        />
      )}

      {/* Report button — top-right of map, below SafetyHeader chips */}
      {!isNavigating && !navArrived && !showReview && (
        <TouchableOpacity
          style={styles.reportFab}
          onPress={() => handleReport('general')}
          activeOpacity={0.75}
        >
          <Text style={styles.reportFabIcon}>⚠️</Text>
          <Text style={styles.reportFabText}>Report</Text>
        </TouchableOpacity>
      )}

      {/* Bottom navigation */}
      <BottomNavBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        onNavigatePress={handleNavigatePress}
        isNavigating={isNavigating}
        alertCount={3}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Origin / destination pins
  originPin: {
    alignItems: 'center',
  },
  originPinText: {
    fontSize: 28,
  },
  destPin: {
    alignItems: 'center',
    backgroundColor: colors.safety.safe,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  destPinText: {
    fontSize: 20,
  },
  destPinLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },

  // Marker styles
  markerContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },

  markerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  markerIcon: {
    fontSize: 20,
  },

  markerIconText: {
    fontSize: 18,
  },

  // Route sheet
  routeSheet: {
    position: 'absolute',
    bottom: 48 + layout.safeArea.bottom,
    left: 0,
    right: 0,
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },

  routeSheetHandleTap: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  routeSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ui.border,
    alignSelf: 'center',
    marginBottom: 4,
  },

  routeSheetCollapseHint: {
    ...theme.typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },

  alertBanner: {
    backgroundColor: '#F5A62320',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F5A62360',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },

  alertBannerText: {
    ...theme.typography.labelMedium,
    color: '#F5A623',
  },

  routeSheetHeader: {
    marginBottom: spacing.lg,
  },

  routeSheetTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 4,
  },
  filterButtonActive: {
    borderColor: colors.safety.safe,
    backgroundColor: colors.safety.safeMuted,
  },
  filterButtonIcon: { fontSize: 14 },
  filterButtonText: {
    ...theme.typography.labelSmall,
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.safety.safe,
    fontWeight: '600',
  },

  // Filter sheet
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  filterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  filterSheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ui.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  filterSheetTitle: {
    ...theme.typography.headlineSmall,
    color: colors.text.primary,
  },
  filterClearText: {
    ...theme.typography.labelMedium,
    color: colors.community.primary,
  },
  filterSheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCloseText: {
    ...theme.typography.labelMedium,
    color: colors.text.secondary,
  },
  filterSectionLabel: {
    ...theme.typography.labelSmall,
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
    gap: spacing.md,
  },
  filterRowIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  filterRowText: { flex: 1 },
  filterRowLabel: {
    ...theme.typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  filterRowDesc: {
    ...theme.typography.labelSmall,
    color: colors.text.tertiary,
  },
  filterApplyButton: {
    backgroundColor: colors.safety.safe,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  filterApplyText: {
    ...theme.typography.titleSmall,
    color: '#000',
    fontWeight: '700',
  },

  routeSheetIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },

  routeSheetDestination: {
    flex: 1,
  },

  routeSheetLabel: {
    ...theme.typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: 2,
  },

  routeSheetName: {
    ...theme.typography.headlineSmall,
    color: colors.text.primary,
  },

  routesList: {
    height: 190,
  },

  routeCard: {
    marginBottom: spacing.sm,
  },

  startButtonContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  startButton: {
    backgroundColor: colors.safety.safe,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },

  startButtonInner: {
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  startButtonIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },

  startButtonText: {
    ...theme.typography.titleSmall,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyStateTitle: {
    ...theme.typography.titleSmall,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyStateText: {
    ...theme.typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyStateReset: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyStateResetText: {
    ...theme.typography.labelMedium,
    color: colors.community.primary,
    fontWeight: '600',
  },

  routeScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },

  routeScoreBadgeFaded: {
    opacity: 0.6,
  },

  routeScoreBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Floating report button — top-right, below SafetyHeader chips
  reportFab: {
    position: 'absolute',
    top: layout.safeArea.top + 164,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.ui.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    zIndex: 10,
    ...shadows.sm,
  },

  reportFabIcon: {
    fontSize: 13,
    marginRight: 5,
  },

  reportFabText: {
    ...theme.typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});

MapScreen.displayName = 'MapScreen';

export default MapScreen;
