/**
 * Safety Data - Static infrastructure from KML
 * Gen Z Edition 🔥
 * 
 * UI inspired by Citizen App + Waze
 */

// ===========================================
// CUSTOM REPORT CATEGORIES (for File a Custom Report)
// ===========================================
export const CUSTOM_REPORT_CATEGORIES = {
  'app-feedback': {
    id: 'app-feedback',
    label: 'App Feedback',
    emoji: '💬',
    color: '#9b5de5',
    description: 'Bug reports, feature requests, UX issues',
    subcategories: [
      { id: 'bug-report', label: 'Bug Report', emoji: '🐛' },
      { id: 'feature-request', label: 'Feature Request', emoji: '✨' },
      { id: 'map-correction', label: 'Map Correction', emoji: '📍' },
      { id: 'general-feedback', label: 'General Feedback', emoji: '💭' },
    ],
  },
  'concern': {
    id: 'concern',
    label: 'Report a Concern',
    emoji: '⚠️',
    color: '#ff6b6b',
    description: 'For safety concerns, contact proper authorities',
    isRedirect: true,
    redirectMessage: 'For immediate safety concerns, please contact:\n\n• Emergency: 911\n• NYU Campus Safety: 212-998-2222\n• NYPD Non-Emergency: 311\n\nSafeStep is not a crime reporting platform.',
    subcategories: [
      { id: 'emergency-redirect', label: 'Call 911', emoji: '🚨', action: 'tel:911' },
      { id: 'campus-safety', label: 'NYU Campus Safety', emoji: '🛡️', action: 'tel:2129982222' },
      { id: 'nypd-311', label: 'NYPD Non-Emergency', emoji: '📞', action: 'tel:311' },
    ],
  },
  '311-lighting': {
    id: '311-lighting',
    label: '311 Lighting Report',
    emoji: '💡',
    color: '#fee440',
    description: 'Report broken streetlights to NYC 311',
    triggers311: true,
    subcategories: [
      { id: 'broken-streetlight', label: 'Broken Streetlight', emoji: '🔦' },
      { id: 'flickering-light', label: 'Flickering Light', emoji: '⚡' },
      { id: 'dark-block', label: 'Dark Block/Area', emoji: '🌑' },
      { id: 'park-lighting', label: 'Park Lighting Issue', emoji: '🌳' },
    ],
  },
};

// ===========================================
// QUICK REPORT TYPES (Waze-style grid)
// ===========================================
// These are for the quick "What do you see?" grid
// requiresPhoto: false by default - photos are OPTIONAL, not mandated
export const REPORT_TYPES = {
  // 🗺️ SAFETY INFRASTRUCTURE - Help build the map
  'lit': { label: 'Well Lit', emoji: '💡', color: '#ffd93d', category: '+', weight: 8, requiresPhoto: false, isAmbient: true, hint: 'Good lighting here' },
  'dark': { label: 'Poorly Lit', emoji: '🌑', color: '#6c5ce7', category: '-', weight: -5, requiresPhoto: false, isAmbient: true, triggers311: true, hint: 'Low visibility' },
  'quiet': { label: 'Deserted', emoji: '🌙', color: '#a29bfe', category: '-', weight: -3, requiresPhoto: false, isAmbient: true, hint: 'Empty area' },
  'crowd': { label: 'Lively', emoji: '👥', color: '#fd79a8', category: '+', weight: 10, requiresPhoto: false, isAmbient: true, hint: 'Lots of people' },
  
  // 🏪 POINTS OF INTEREST - Helpful spots
  'open-business': { label: 'Open Late', emoji: '🏪', color: '#00b894', category: '+', weight: 8, requiresPhoto: false, hint: 'Store open now' },
  'bathroom': { label: 'Friendly Restroom', emoji: '🚻', color: '#74b9ff', category: '+', weight: 8, requiresPhoto: false, hint: 'Friendly restroom' },
  'accessible': { label: 'Accessible', emoji: '♿', color: '#74b9ff', category: '+', weight: 8, requiresPhoto: false, hint: 'ADA friendly' },
  
  // 🛡️ SECURITY PRESENCE
  'security': { label: 'Security', emoji: '🛡️', color: '#00b894', category: '+', weight: 15, requiresPhoto: false, hint: 'Guard present' },
  'police': { label: 'Police', emoji: '🚔', color: '#00bbf9', category: '+', weight: 12, requiresPhoto: false, hint: 'Officers nearby' },
  
  // ⚠️ OBSTACLES - Path issues
  'closed': { label: 'Blocked', emoji: '🚫', color: '#b2bec3', category: '-', weight: -4, requiresPhoto: false, hint: 'Path closed' },
  'construction': { label: 'Construction', emoji: '🚧', color: '#fdcb6e', category: '-', weight: -5, requiresPhoto: false, hint: 'Work zone' },
  'hazard': { label: 'Hazard', emoji: '⚠️', color: '#ff6b6b', category: '-', weight: -10, requiresPhoto: false, hint: 'Caution area' },
};

export const BLUE_LIGHTS = [
  { id: 'bl-1', lat: 40.7298688, lng: -73.9989403 },
  { id: 'bl-2', lat: 40.7299053, lng: -73.9981734 },
  { id: 'bl-3', lat: 40.7292843, lng: -73.9968641 },
  { id: 'bl-4', lat: 40.7300244, lng: -73.9957788 },
  { id: 'bl-5', lat: 40.7310683, lng: -73.9951735 },
  { id: 'bl-6', lat: 40.728693, lng: -73.9967054 },
  { id: 'bl-7', lat: 40.7289402, lng: -73.9954117 },
  { id: 'bl-8', lat: 40.7296601, lng: -73.9936317 },
  { id: 'bl-9', lat: 40.7285814, lng: -73.9982651 },
  { id: 'bl-10', lat: 40.7281369, lng: -73.9978046 },
  { id: 'bl-11', lat: 40.7277149, lng: -73.9970794 },
  { id: 'bl-12', lat: 40.7269337, lng: -73.9976003 },
  { id: 'bl-13', lat: 40.7280385, lng: -73.9959866 },
  { id: 'bl-14', lat: 40.7279629, lng: -73.9957222 },
  { id: 'bl-15', lat: 40.7264516, lng: -73.9980488 },
  { id: 'bl-16', lat: 40.7263133, lng: -73.9983706 },
  { id: 'bl-17', lat: 40.7278281, lng: -73.9883078 },
  { id: 'bl-18', lat: 40.7333177, lng: -73.9893537 },
];

export const CAMPUS_SAFETY = {
  id: 'campus-safety',
  name: 'NYU Campus Safety',
  lat: 40.7295454,
  lng: -73.9945695,
  phone: '212-998-2222',
};

export const SAFE_HAVENS_24HR = [
  { id: 'sh-1', name: 'Westside Market NYC', lat: 40.7318431, lng: -73.9886546, hours: '24/7' },
  { id: 'sh-2', name: 'Soho Grand Hotel', lat: 40.7219844, lng: -74.0043287, hours: '24/7' },
  { id: 'sh-3', name: 'Morton Williams', lat: 40.7277972, lng: -73.9987857, hours: '24/7' },
  { id: 'sh-4', name: '24/7 Store', lat: 40.7214012, lng: -73.9953814, hours: '24/7' },
  { id: 'sh-5', name: 'SOHO Garden', lat: 40.723114, lng: -73.9954304, hours: '24/7' },
  { id: 'sh-6', name: 'Village Square Market', lat: 40.7376743, lng: -74.0049296, hours: '24/7' },
  { id: 'sh-7', name: 'West Village Finest Deli', lat: 40.7326067, lng: -74.0035892, hours: '24/7' },
  { id: 'sh-8', name: 'Space Market', lat: 40.7308738, lng: -73.9952212, hours: '24/7' },
  { id: 'sh-9', name: 'CVS', lat: 40.7336564, lng: -74.0031647, hours: '24/7' },
  { id: 'sh-10', name: '7 Eleven', lat: 40.7309145, lng: -74.0009307, hours: '24/7' },
  { id: 'sh-11', name: 'Key Food Urban Marketplace', lat: 40.7240032, lng: -73.984763, hours: '24/7' },
];

export const LATE_NIGHT_SPOTS = [
  { id: 'ln-1', name: 'East Village Farm & Grocery', lat: 40.7263721, lng: -73.9895465, hours: 'Until 1:45am' },
  { id: 'ln-2', name: 'Iconic Cafe', lat: 40.7226675, lng: -73.9971804, hours: 'Until 3am' },
];

export const DESTINATIONS = [
  { id: 'dest-1', name: 'Washington Square Park', lat: 40.7308, lng: -73.9973 },
  { id: 'dest-2', name: 'Bobst Library', lat: 40.7295, lng: -73.9970 },
  { id: 'dest-3', name: 'Union Square', lat: 40.7359, lng: -73.9911 },
  { id: 'dest-4', name: 'Rubin Hall', lat: 40.7299, lng: -73.9942 },
  { id: 'dest-5', name: 'Kimmel Center', lat: 40.7298, lng: -73.9988 },
  { id: 'dest-6', name: 'Tisch Hall', lat: 40.7289, lng: -73.9960 },
];

export const DEFAULT_REGION = {
  latitude: 40.7295,
  longitude: -73.9965,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export const COLORS = {
  // Dark mode base - deeper blacks
  bg: '#000000',
  surface: '#0d0d0f',
  surface2: '#1a1a1f',
  surfaceGlass: 'rgba(20, 20, 25, 0.85)',
  border: 'rgba(255,255,255,0.06)',
  
  // Brand palette - Deep Gold primary
  primary: '#D4A012',      // Deep gold - SafeStep branding & action buttons
  primaryDim: 'rgba(212,160,18,0.15)',
  secondary: '#9b5de5',    // Purple
  secondaryDim: 'rgba(155,93,229,0.15)',
  accent: '#f15bb5',       // Hot pink
  accentDim: 'rgba(241,91,181,0.15)',
  
  // Status colors
  safe: '#00f5d4',         // Keep teal for safe routes
  safeDim: 'rgba(0,245,212,0.12)',
  warn: '#fee440',
  warnDim: 'rgba(254,228,64,0.12)',
  danger: '#ff6b6b',
  dangerDim: 'rgba(255,107,107,0.12)',
  
  // Feature colors
  gold: '#ffd93d',
  goldDim: 'rgba(255,217,61,0.15)',
  amber: '#ffbe0b',
  amberDim: 'rgba(255,190,11,0.15)',
  blue: '#00bbf9',
  blueDim: 'rgba(0,187,249,0.15)',
  purple: '#9b5de5',
  purpleDim: 'rgba(155,93,229,0.15)',
  pink: '#f15bb5',
  pinkDim: 'rgba(241,91,181,0.15)',
  
  // Text
  text: '#ffffff',
  text2: '#9ca3af',
  text3: '#6b7280',
  
  // Gradients (as array for LinearGradient)
  gradientPrimary: ['#D4A012', '#B8860B'],
  gradientDanger: ['#ff6b6b', '#f15bb5'],
  gradientPurple: ['#9b5de5', '#f15bb5'],
};