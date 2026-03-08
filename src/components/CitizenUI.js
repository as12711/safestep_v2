/**
 * CitizenUI.js - Citizen App + Waze Inspired UI Components
 * 
 * Design References:
 * - Citizen App: Dark mode, incident cards, shield mode, bottom nav
 * - Waze: "What do you see?" icon grid, circular dark backgrounds
 * - 3D Markers: Glossy pins with depth, shadows, glow effects
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  TextInput,
  Linking,
  Platform,
} from 'react-native';

// Import centralized colors
import { COLORS as C } from '../theme/colors';

const { width: SW, height: SH } = Dimensions.get('window');

// Additional colors specific to CitizenUI (extend centralized palette)
const CITIZEN_COLORS = {
  ...C,
  // Citizen-specific additions
  card: C.surface2,
  borderLight: C.borderActive || 'rgba(255,255,255,0.12)',
  teal: C.blueLight || '#64D2FF',
  tealDim: C.blueLightGlow || 'rgba(100,210,255,0.2)',
};


// ===========================================
// BOTTOM TAB BAR - Citizen Style
// ===========================================
export const BottomTabBar = memo(({ 
  activeTab = 'map',
  onTabPress,
  onCenterAction,
  showBadge = false,
  badgeCount = 0,
}) => {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'community', icon: '👥', label: 'Community' },
    { id: 'map', icon: '🗺️', label: 'Map', isCenter: false },
    { id: 'alerts', icon: '🔔', label: 'Alerts', hasBadge: showBadge },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabItem, tab.isCenter && styles.tabItemCenter]}
          onPress={() => onTabPress?.(tab.id)}
          activeOpacity={0.7}
        >
          {tab.isCenter ? (
            <View style={styles.centerTabBtn}>
              <Text style={styles.centerTabIcon}>📍</Text>
            </View>
          ) : (
            <>
              <View style={styles.tabIconWrap}>
                <Text style={[
                  styles.tabIcon,
                  activeTab === tab.id && styles.tabIconActive
                ]}>{tab.icon}</Text>
                {tab.hasBadge && badgeCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive
              ]}>{tab.label}</Text>
            </>
          )}
        </TouchableOpacity>
      ))}
      
      {/* Floating Action Button - "Get Agent" style */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={onCenterAction}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
});


// ===========================================
// WAZE-STYLE REPORT GRID - "What do you see?"
// ===========================================
export const WazeReportGrid = memo(({
  onSelectReport,
  onCustomReport,
  reportTypes = {},
}) => {
  // Convert report types to grid format
  const gridItems = Object.entries(reportTypes).map(([key, val]) => ({
    id: key,
    ...val,
  }));

  return (
    <View style={styles.wazeGrid}>
      <Text style={styles.wazeTitle}>What do you see?</Text>
      <Text style={styles.wazeSubtitle}>Help others navigate safely</Text>
      
      <View style={styles.wazeGridContainer}>
        {gridItems.slice(0, 12).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.wazeGridItem}
            onPress={() => onSelectReport?.(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.wazeGridCircle, { borderColor: item.color || C.primary }]}>
              <Text style={styles.wazeGridEmoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.wazeGridLabel} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Custom Report Button */}
      <TouchableOpacity 
        style={styles.customReportBtnWaze}
        onPress={onCustomReport}
        activeOpacity={0.8}
      >
        <Text style={styles.customReportIcon}>📝</Text>
        <Text style={styles.customReportText}>File a Custom Report</Text>
        <Text style={styles.customReportArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
});


// ===========================================
// CUSTOM REPORT SHEET - Safety Categories
// ===========================================
export const CustomReportSheet = memo(({
  categories,
  onSelectCategory,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  const handleCategoryPress = (category) => {
    if (category.isRedirect) {
      // Show redirect message for concerns
      onSelectCategory?.(category, { isRedirect: true });
    } else {
      setSelectedCategory(category);
    }
  };

  return (
    <View style={styles.customReportSheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>📋 File a Report</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Cards */}
        {Object.values(categories || {}).map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryCard,
              selectedCategory?.id === cat.id && styles.categoryCardActive,
              { borderLeftColor: cat.color }
            ]}
            onPress={() => handleCategoryPress(cat)}
            activeOpacity={0.8}
          >
            <View style={styles.categoryCardContent}>
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categoryDesc}>{cat.description}</Text>
              </View>
            </View>
            {cat.isRedirect ? (
              <Text style={styles.categoryRedirect}>↗</Text>
            ) : cat.triggers311 ? (
              <View style={styles.category311Badge}>
                <Text style={styles.category311Text}>311</Text>
              </View>
            ) : (
              <Text style={styles.categoryArrow}>→</Text>
            )}
          </TouchableOpacity>
        ))}
        
        {/* Safety Footer */}
        <View style={styles.safetyFooter}>
          <Text style={styles.safetyFooterIcon}>💡</Text>
          <Text style={styles.safetyFooterText}>
            Your reports help keep the community safe. Photos are optional but help verify reports faster.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
});


// ===========================================
// CONCERN REDIRECT MODAL
// ===========================================
export const ConcernRedirectModal = memo(({
  visible,
  onClose,
}) => {
  if (!visible) return null;

  const contacts = [
    { label: 'Emergency', number: '911', emoji: '🚨', color: C.danger },
    { label: 'NYU Campus Safety', number: '212-998-2222', emoji: '🛡️', color: C.blue },
    { label: 'NYPD Non-Emergency', number: '311', emoji: '📞', color: C.primary },
  ];

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.concernModal}>
        <Text style={styles.concernEmoji}>⚠️</Text>
        <Text style={styles.concernTitle}>Report a Concern</Text>
        <Text style={styles.concernDesc}>
          For safety concerns, please contact the proper authorities directly. 
          SafeStep is not a crime reporting platform.
        </Text>
        
        {contacts.map((contact) => (
          <TouchableOpacity
            key={contact.number}
            style={[styles.concernContact, { borderLeftColor: contact.color }]}
            onPress={() => Linking.openURL(`tel:${contact.number}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.concernContactEmoji}>{contact.emoji}</Text>
            <View style={styles.concernContactInfo}>
              <Text style={styles.concernContactLabel}>{contact.label}</Text>
              <Text style={styles.concernContactNumber}>{contact.number}</Text>
            </View>
            <Text style={styles.concernContactCall}>📞</Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.concernClose} onPress={onClose}>
          <Text style={styles.concernCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});


// ===========================================
// 3D GLOSSY MARKER
// ===========================================
export const GlossyMarker3D = memo(({
  type = 'default',
  emoji = '📍',
  color = C.primary,
  size = 44,
  onPress,
  isVerified = false,
  pulse = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulse]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Animated.View style={[
        styles.marker3D,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: pulse ? pulseAnim : 1 }],
        }
      ]}>
        {/* Outer glow */}
        <View style={[
          styles.markerGlow,
          { 
            backgroundColor: color,
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
          }
        ]} />
        
        {/* Main circle with gradient effect */}
        <View style={[
          styles.markerOuter,
          { 
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          }
        ]}>
          {/* Inner highlight (glossy effect) */}
          <View style={[
            styles.markerHighlight,
            {
              width: size * 0.7,
              height: size * 0.35,
              borderRadius: size * 0.35,
            }
          ]} />
          
          {/* Emoji */}
          <Text style={[styles.markerEmoji, { fontSize: size * 0.45 }]}>{emoji}</Text>
        </View>
        
        {/* Verified badge */}
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedCheck}>✓</Text>
          </View>
        )}
      </Animated.View>
      
      {/* Shadow/stem */}
      <View style={[styles.markerStem, { backgroundColor: color }]} />
    </TouchableOpacity>
  );
});


// ===========================================
// INCIDENT CARD - Citizen Style
// ===========================================
export const IncidentCard = memo(({
  title,
  location,
  distance,
  timeAgo,
  emoji = '⚠️',
  imageUri,
  viewers = 0,
  comments = 0,
  onPress,
  onShare,
}) => {
  return (
    <TouchableOpacity 
      style={styles.incidentCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View style={styles.incidentHeader}>
        <Text style={styles.incidentTime}>{timeAgo}</Text>
        <Text style={styles.incidentDistance}>{distance}</Text>
      </View>
      
      {/* Title */}
      <Text style={styles.incidentTitle}>{emoji} {title}</Text>
      <Text style={styles.incidentLocation}>{location}</Text>
      
      {/* Image preview if available */}
      {imageUri && (
        <View style={styles.incidentImageWrap}>
          {/* Placeholder - would be <Image> */}
          <View style={styles.incidentImagePlaceholder}>
            <Text style={styles.incidentImageIcon}>🖼️</Text>
          </View>
        </View>
      )}
      
      {/* Footer stats */}
      <View style={styles.incidentFooter}>
        <View style={styles.incidentStat}>
          <Text style={styles.incidentStatIcon}>👁️</Text>
          <Text style={styles.incidentStatText}>{viewers}</Text>
        </View>
        <View style={styles.incidentStat}>
          <Text style={styles.incidentStatIcon}>💬</Text>
          <Text style={styles.incidentStatText}>{comments}</Text>
        </View>
        <TouchableOpacity style={styles.incidentShare} onPress={onShare}>
          <Text style={styles.incidentShareText}>Share</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});


// ===========================================
// SHIELD MODE BANNER - Citizen "Protect Mode"
// ===========================================
export const ShieldModeBanner = memo(({
  isActive,
  onToggle,
  nearbyIncidents = 0,
}) => {
  return (
    <View style={[styles.shieldBanner, isActive && styles.shieldBannerActive]}>
      <View style={styles.shieldInfo}>
        <View style={[styles.shieldIconWrap, isActive && styles.shieldIconWrapActive]}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
        <View>
          <Text style={styles.shieldTitle}>
            {isActive ? 'Shield Mode Active' : 'Shield Mode'}
          </Text>
          <Text style={styles.shieldSubtitle}>
            {isActive 
              ? `Monitoring ${nearbyIncidents} incidents nearby`
              : 'Get alerts about nearby incidents'}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.shieldToggle, isActive && styles.shieldToggleActive]}
        onPress={onToggle}
      >
        <Text style={styles.shieldToggleText}>
          {isActive ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});


// ===========================================
// SEARCH BAR - Citizen Style
// ===========================================
export const CitizenSearchBar = memo(({
  value,
  onChangeText,
  onFocus,
  onClear,
  placeholder = 'Search places...',
  locationName,
}) => {
  return (
    <View style={styles.searchContainer}>
      {/* Location chip */}
      <TouchableOpacity style={styles.locationChip}>
        <Text style={styles.locationChipIcon}>📍</Text>
        <Text style={styles.locationChipText} numberOfLines={1}>
          {locationName || 'Current Location'}
        </Text>
        <Text style={styles.locationChipArrow}>▼</Text>
      </TouchableOpacity>
      
      {/* Search input */}
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor={C.text3}
        />
        {value?.length > 0 && (
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});


// ===========================================
// STYLES
// ===========================================
const styles = StyleSheet.create({
  // Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.glass,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabItemCenter: {
    flex: 1.2,
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: C.text3,
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: C.text,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: C.accent,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  centerTabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  centerTabIcon: {
    fontSize: 22,
  },
  fab: {
    position: 'absolute',
    right: 20,
    top: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },

  // Waze Report Grid
  wazeGrid: {
    padding: 20,
  },
  wazeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
  },
  wazeSubtitle: {
    fontSize: 14,
    color: C.text2,
    marginBottom: 24,
  },
  wazeGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  wazeGridItem: {
    width: (SW - 64) / 3,
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  wazeGridCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.surface3,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  wazeGridEmoji: {
    fontSize: 32,
  },
  wazeGridLabel: {
    fontSize: 12,
    color: C.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  customReportBtnWaze: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  customReportIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  customReportText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    flex: 1,
  },
  customReportArrow: {
    fontSize: 18,
    color: C.primary,
  },

  // Custom Report Sheet
  customReportSheet: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  closeBtn: {
    fontSize: 24,
    color: C.text3,
    padding: 4,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryDim,
  },
  categoryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  categoryDesc: {
    fontSize: 13,
    color: C.text2,
    marginTop: 4,
  },
  categoryArrow: {
    fontSize: 18,
    color: C.text3,
  },
  categoryRedirect: {
    fontSize: 18,
    color: C.danger,
  },
  category311Badge: {
    backgroundColor: C.warnDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  category311Text: {
    fontSize: 12,
    fontWeight: '700',
    color: C.warn,
  },
  safetyFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.safeDim,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.safe,
  },
  safetyFooterIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  safetyFooterText: {
    fontSize: 13,
    color: C.safe,
    flex: 1,
    lineHeight: 20,
  },

  // Concern Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
  },
  concernModal: {
    width: SW - 48,
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  concernEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  concernTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
  },
  concernDesc: {
    fontSize: 14,
    color: C.text2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  concernContact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    width: '100%',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  concernContactEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  concernContactInfo: {
    flex: 1,
  },
  concernContactLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  concernContactNumber: {
    fontSize: 13,
    color: C.text2,
    marginTop: 2,
  },
  concernContactCall: {
    fontSize: 20,
  },
  concernClose: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 12,
  },
  concernCloseText: {
    fontSize: 15,
    color: C.text3,
  },

  // 3D Marker
  marker3D: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  markerGlow: {
    position: 'absolute',
    opacity: 0.25,
  },
  markerOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  markerHighlight: {
    position: 'absolute',
    top: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  markerEmoji: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.safe,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedCheck: {
    fontSize: 10,
    color: '#000',
    fontWeight: '900',
  },
  markerStem: {
    width: 4,
    height: 10,
    alignSelf: 'center',
    marginTop: -2,
    borderRadius: 2,
    opacity: 0.7,
  },

  // Incident Card
  incidentCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  incidentTime: {
    fontSize: 12,
    color: C.accent,
    fontWeight: '600',
  },
  incidentDistance: {
    fontSize: 12,
    color: C.text2,
  },
  incidentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  incidentLocation: {
    fontSize: 14,
    color: C.text2,
  },
  incidentImageWrap: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  incidentImagePlaceholder: {
    height: 120,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentImageIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  incidentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  incidentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  incidentStatIcon: {
    fontSize: 14,
    marginRight: 6,
    opacity: 0.7,
  },
  incidentStatText: {
    fontSize: 13,
    color: C.text2,
  },
  incidentShare: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: C.primaryDim,
    borderRadius: 20,
  },
  incidentShareText: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
  },

  // Shield Mode Banner
  shieldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  shieldBannerActive: {
    backgroundColor: C.tealDim,
    borderColor: C.teal,
  },
  shieldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  shieldIconWrapActive: {
    backgroundColor: C.teal,
  },
  shieldIcon: {
    fontSize: 22,
  },
  shieldTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  shieldSubtitle: {
    fontSize: 12,
    color: C.text2,
    marginTop: 2,
  },
  shieldToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: C.surface3,
    borderRadius: 20,
  },
  shieldToggleActive: {
    backgroundColor: C.teal,
  },
  shieldToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  locationChipIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  locationChipText: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
    maxWidth: 150,
  },
  locationChipArrow: {
    fontSize: 10,
    color: C.text3,
    marginLeft: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingVertical: 14,
  },
  searchClear: {
    fontSize: 16,
    color: C.text3,
    padding: 4,
  },
});

export default {
  BottomTabBar,
  WazeReportGrid,
  CustomReportSheet,
  ConcernRedirectModal,
  GlossyMarker3D,
  IncidentCard,
  ShieldModeBanner,
  CitizenSearchBar,
};
