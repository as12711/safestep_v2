/**
 * DashboardScreen
 * =================
 * Personal safety dashboard with insights, stats, and saved routes.
 * The "home base" for SafeStep users.
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { theme } from '../../theme/designSystem';
import SafetyOverviewCard from './components/SafetyOverviewCard';
import StatsGrid from './components/StatsGrid';
import ActivityTimeline from './components/ActivityTimeline';
import SavedRoutesSection from './components/SavedRoutesSection';
import CommunityImpact from './components/CommunityImpact';
import SafetyTips from './components/SafetyTips';

const { colors, typography, spacing, radius, shadows, layout } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Demo data
const DEMO_STATS = {
  totalWalks: 47,
  totalDistance: 28.5, // miles
  safeArrivals: 47,
  reportsSubmitted: 12,
  peopleHelped: 156,
  averageSafetyScore: 82,
  streakDays: 14,
};

const DEMO_ACTIVITY = [
  {
    id: '1',
    type: 'walk',
    title: 'Walk to Bobst Library',
    subtitle: '0.4 mi • 8 min',
    safetyScore: 87,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'report',
    title: 'Reported: Well Lit',
    subtitle: 'Washington Square Park',
    icon: '💡',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'walk',
    title: 'Walk to Trader Joe\'s',
    subtitle: '0.6 mi • 12 min',
    safetyScore: 74,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'report',
    title: 'Reported: Construction',
    subtitle: 'Bleecker St',
    icon: '🚧',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
  },
  {
    id: '5',
    type: 'achievement',
    title: 'Community Guardian',
    subtitle: '10 reports submitted',
    icon: '🏆',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
];

const DEMO_SAVED_ROUTES = [
  {
    id: '1',
    name: 'Morning Commute',
    from: 'Home',
    to: 'Work',
    distance: 0.8,
    duration: 15,
    safetyScore: 85,
    isFavorite: true,
  },
  {
    id: '2',
    name: 'Grocery Run',
    from: 'Home',
    to: 'Trader Joe\'s',
    distance: 0.6,
    duration: 12,
    safetyScore: 78,
    isFavorite: false,
  },
  {
    id: '3',
    name: 'Library Study',
    from: 'Home',
    to: 'Bobst Library',
    distance: 0.4,
    duration: 8,
    safetyScore: 91,
    isFavorite: true,
  },
];

const DashboardScreen = memo(({
  onRouteSelect,
  onViewAllRoutes,
  onViewAllActivity,
  onSettingsPress,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(DEMO_STATS);
  const [activity, setActivity] = useState(DEMO_ACTIVITY);
  const [savedRoutes, setSavedRoutes] = useState(DEMO_SAVED_ROUTES);

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setRefreshing(false);
  }, []);

  // Header opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good morning', icon: '☀️' };
    if (hour >= 12 && hour < 17) return { text: 'Good afternoon', icon: '🌤️' };
    if (hour >= 17 && hour < 21) return { text: 'Good evening', icon: '🌆' };
    return { text: 'Stay safe tonight', icon: '🌙' };
  };

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Sticky header background */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyHeaderContent}>
          <Text style={styles.stickyHeaderTitle}>Dashboard</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.safety.safe}
            colors={[colors.safety.safe]}
          />
        }
      >
        {/* Hero section */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.greeting}>
                {greeting.icon} {greeting.text}
              </Text>
              <Text style={styles.heroTitle}>Your Safety Hub</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onSettingsPress}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Safety overview card */}
          <SafetyOverviewCard
            currentScore={stats.averageSafetyScore}
            streakDays={stats.streakDays}
            safeArrivals={stats.safeArrivals}
          />
        </View>

        {/* Stats grid */}
        <View style={styles.section}>
          <SectionHeader title="Your Stats" subtitle="This month" />
          <StatsGrid stats={stats} />
        </View>

        {/* Community impact */}
        <View style={styles.section}>
          <SectionHeader title="Community Impact" subtitle="Your contribution" />
          <CommunityImpact
            reportsSubmitted={stats.reportsSubmitted}
            peopleHelped={stats.peopleHelped}
          />
        </View>

        {/* Saved routes */}
        <View style={styles.section}>
          <SectionHeader
            title="Saved Routes"
            action="View All"
            onAction={onViewAllRoutes}
          />
          <SavedRoutesSection
            routes={savedRoutes}
            onRouteSelect={onRouteSelect}
          />
        </View>

        {/* Recent activity */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent Activity"
            action="View All"
            onAction={onViewAllActivity}
          />
          <ActivityTimeline
            activities={activity}
            limit={4}
          />
        </View>

        {/* Safety tips */}
        <View style={styles.section}>
          <SectionHeader title="Safety Tips" subtitle="Stay aware" />
          <SafetyTips />
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </View>
  );
});

// Section header component
const SectionHeader = memo(({ title, subtitle, action, onAction }) => (
  <View style={styles.sectionHeader}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{action} →</Text>
      </TouchableOpacity>
    )}
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  // Sticky header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },

  stickyHeaderContent: {
    paddingTop: layout.safeArea.top,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },

  stickyHeaderTitle: {
    ...typography.titleLarge,
    color: colors.text.primary,
  },

  // Scroll view
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: layout.safeArea.top,
  },

  // Hero section
  heroSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  greeting: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },

  heroTitle: {
    ...typography.displaySmall,
    color: colors.text.primary,
  },

  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  settingsIcon: {
    fontSize: 20,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.titleLarge,
    color: colors.text.primary,
  },

  sectionSubtitle: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: 2,
  },

  sectionAction: {
    ...typography.labelMedium,
    color: colors.safety.safe,
  },

  bottomPadding: {
    height: layout.bottomNav.height + spacing.xxl,
  },
});

SectionHeader.displayName = 'SectionHeader';
DashboardScreen.displayName = 'DashboardScreen';

export default DashboardScreen;
