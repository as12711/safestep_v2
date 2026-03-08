/**
 * SafeStep Smart Prompting Service
 * ==================================
 * Intelligent prompting system for:
 * - Report submissions (contextual, non-intrusive)
 * - Subscription upsells (strategic, value-focused)
 * - Feature discovery (progressive disclosure)
 * - Safety tips (relevant, timely)
 *
 * Design Principles:
 * - Never interrupt critical flows (navigation)
 * - Context-aware timing
 * - Respect user preferences
 * - Value-first messaging
 * - Progressive engagement
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PROMPTS_SHOWN: 'ss_prompts_shown',
  PROMPT_COOLDOWNS: 'ss_prompt_cooldowns',
  USER_ENGAGEMENT: 'ss_user_engagement',
  DISMISSED_PROMPTS: 'ss_dismissed_prompts',
};

// Prompt types and configurations
export const PROMPT_TYPES = {
  // Report prompts
  REPORT_AFTER_WALK: 'report_after_walk',
  REPORT_NEAR_INCIDENT: 'report_near_incident',
  REPORT_STREAK: 'report_streak',
  REPORT_FIRST_TIME: 'report_first_time',

  // Feature discovery
  FEATURE_HOME_BEACON: 'feature_home_beacon',
  FEATURE_SAFE_HAVEN: 'feature_safe_haven',
  FEATURE_EMERGENCY_CONTACTS: 'feature_emergency_contacts',

  // Safety tips
  TIP_LATE_NIGHT: 'tip_late_night',
  TIP_NEW_AREA: 'tip_new_area',
  TIP_WEATHER: 'tip_weather',
};

// Prompt configurations
const PROMPT_CONFIG = {
  [PROMPT_TYPES.REPORT_AFTER_WALK]: {
    title: 'Help the community! 🗺️',
    message: 'Noticed anything during your walk? Quick reports help keep routes safe for everyone.',
    cta: 'Add Report',
    secondaryCta: 'Not Now',
    cooldown: 24 * 60 * 60 * 1000, // 24 hours
    maxShows: 5,
    priority: 3,
    conditions: ['walkCompleted', 'notRecentlyPrompted'],
  },

  [PROMPT_TYPES.REPORT_NEAR_INCIDENT]: {
    title: 'Something to report? 📍',
    message: "You're near a spot where others have reported issues. See something different?",
    cta: 'Report Update',
    secondaryCta: 'Skip',
    cooldown: 4 * 60 * 60 * 1000, // 4 hours
    maxShows: 10,
    priority: 4,
    conditions: ['nearReportedArea', 'notNavigating'],
  },

  [PROMPT_TYPES.REPORT_STREAK]: {
    title: "You're on a streak! 🔥",
    message: "You've made {count} reports this week. Keep it up!",
    cta: 'Add Another',
    secondaryCta: 'Later',
    cooldown: 48 * 60 * 60 * 1000, // 48 hours
    maxShows: -1, // Unlimited
    priority: 2,
    conditions: ['hasReportStreak'],
  },

  [PROMPT_TYPES.REPORT_FIRST_TIME]: {
    title: 'Be a SafeStep Scout 🛡️',
    message: 'Your first report makes campus safer for everyone. It only takes 10 seconds!',
    cta: 'Make First Report',
    secondaryCta: 'Maybe Later',
    cooldown: 72 * 60 * 60 * 1000, // 72 hours
    maxShows: 3,
    priority: 5,
    conditions: ['noReportsYet', 'walksCompleted3'],
  },

  [PROMPT_TYPES.FEATURE_HOME_BEACON]: {
    title: 'Let your family know you arrived! 🏠',
    message: 'Set up Home Beacon to automatically notify your contacts when you get home safely.',
    cta: 'Set Up Home Beacon',
    secondaryCta: 'Not Now',
    cooldown: 5 * 24 * 60 * 60 * 1000, // 5 days
    maxShows: 3,
    priority: 3,
    conditions: ['notSetupHomeBeacon', 'walksCompleted3'],
  },

  [PROMPT_TYPES.TIP_LATE_NIGHT]: {
    title: 'Late night tip 💡',
    message:
      'Stay on well-lit paths and let someone know your route. Blue light phones are marked on your map.',
    cta: 'Got it',
    cooldown: 24 * 60 * 60 * 1000, // 24 hours
    maxShows: -1,
    priority: 5,
    conditions: ['isLateNight', 'navigating'],
  },
};

class PromptingService {
  constructor() {
    this.promptsShown = {};
    this.cooldowns = {};
    this.dismissedPrompts = new Set();
    this.userEngagement = {
      walksCompleted: 0,
      reportsSubmitted: 0,
      appOpens: 0,
      lastActive: null,
    };
    this.initialized = false;
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  async initialize() {
    if (this.initialized) return;

    try {
      const [promptsShown, cooldowns, engagement, dismissed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROMPTS_SHOWN),
        AsyncStorage.getItem(STORAGE_KEYS.PROMPT_COOLDOWNS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ENGAGEMENT),
        AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_PROMPTS),
      ]);

      this.promptsShown = promptsShown ? JSON.parse(promptsShown) : {};
      this.cooldowns = cooldowns ? JSON.parse(cooldowns) : {};
      this.userEngagement = engagement ? JSON.parse(engagement) : this.userEngagement;
      this.dismissedPrompts = new Set(dismissed ? JSON.parse(dismissed) : []);

      this.initialized = true;
    } catch (e) {
      console.warn('[PromptingService] Init failed:', e);
      this.initialized = true;
    }
  }

  async persist() {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.PROMPTS_SHOWN, JSON.stringify(this.promptsShown)),
        AsyncStorage.setItem(STORAGE_KEYS.PROMPT_COOLDOWNS, JSON.stringify(this.cooldowns)),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ENGAGEMENT, JSON.stringify(this.userEngagement)),
        AsyncStorage.setItem(
          STORAGE_KEYS.DISMISSED_PROMPTS,
          JSON.stringify([...this.dismissedPrompts])
        ),
      ]);
    } catch (e) {
      console.warn('[PromptingService] Persist failed:', e);
    }
  }

  // ===========================================
  // ENGAGEMENT TRACKING
  // ===========================================

  async trackWalkCompleted() {
    await this.initialize();
    this.userEngagement.walksCompleted = (this.userEngagement.walksCompleted || 0) + 1;
    this.userEngagement.lastActive = Date.now();
    await this.persist();
  }

  async trackReportSubmitted() {
    await this.initialize();
    this.userEngagement.reportsSubmitted = (this.userEngagement.reportsSubmitted || 0) + 1;
    this.userEngagement.lastReportAt = Date.now();
    await this.persist();
  }

  async trackAppOpen() {
    await this.initialize();
    this.userEngagement.appOpens = (this.userEngagement.appOpens || 0) + 1;
    this.userEngagement.lastActive = Date.now();
    await this.persist();
  }

  // ===========================================
  // PROMPT LOGIC
  // ===========================================

  /**
   * Interpolate template strings in prompt messages
   * Replaces placeholders like {count} with actual values
   */
  interpolateMessage(message, promptType, context = {}) {
    if (!message || typeof message !== 'string') return message;

    // Build interpolation values based on prompt type
    const values = {};

    if (promptType === PROMPT_TYPES.REPORT_STREAK) {
      // Get report count - use total reports as approximation for "this week"
      // (since we don't track weekly counts separately)
      values.count = this.userEngagement.reportsSubmitted || 0;
    }

    // Replace all {key} placeholders with their values
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key] !== undefined ? String(values[key]) : match;
    });
  }

  /**
   * Get interpolated prompt config with message placeholders replaced
   */
  getInterpolatedPrompt(promptType, context = {}) {
    const config = PROMPT_CONFIG[promptType];
    if (!config) return null;

    return {
      ...config,
      message: this.interpolateMessage(config.message, promptType, context),
    };
  }

  /**
   * Check if a prompt should be shown based on conditions
   */
  async shouldShowPrompt(promptType, context = {}) {
    await this.initialize();

    const config = PROMPT_CONFIG[promptType];
    if (!config) return false;

    // Check if permanently dismissed
    if (this.dismissedPrompts.has(promptType)) return false;

    // Check max shows
    const showCount = this.promptsShown[promptType] || 0;
    if (config.maxShows > 0 && showCount >= config.maxShows) return false;

    // Check cooldown
    const lastShown = this.cooldowns[promptType];
    if (lastShown && Date.now() - lastShown < config.cooldown) return false;

    // Check conditions
    const conditionsMet = this.checkConditions(config.conditions, context);
    if (!conditionsMet) return false;

    return true;
  }

  /**
   * Check if all conditions are met
   */
  checkConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      switch (condition) {
        case 'walkCompleted':
          return context.walkJustCompleted === true;

        case 'notRecentlyPrompted':
          const lastPrompt = Object.values(this.cooldowns).sort((a, b) => b - a)[0];
          return !lastPrompt || Date.now() - lastPrompt > 60 * 60 * 1000; // 1 hour

        case 'nearReportedArea':
          return context.nearbyReports && context.nearbyReports.length > 0;

        case 'notNavigating':
          return context.navigating !== true;

        case 'navigating':
          return context.navigating === true;

        case 'hasReportStreak':
          const reportsThisWeek = this.userEngagement.reportsSubmitted || 0;
          return reportsThisWeek >= 3;

        case 'noReportsYet':
          return (this.userEngagement.reportsSubmitted || 0) === 0;

        case 'walksCompleted3':
          return (this.userEngagement.walksCompleted || 0) >= 3;

        case 'notSubscribed':
          return context.subscriptionTier === 'free' || !context.subscriptionTier;

        case 'activeUser':
          return (this.userEngagement.walksCompleted || 0) >= 5;

        case 'isLateNight':
          const hour = new Date().getHours();
          return hour >= 21 || hour < 5;

        case 'isEvening':
          const h = new Date().getHours();
          return h >= 18 || h < 6;

        case 'notSetupHomeBeacon':
          return context.homeBeaconSetup !== true;

        default:
          return true;
      }
    });
  }

  /**
   * Get the best prompt to show given the current context
   */
  async getBestPrompt(context = {}) {
    await this.initialize();

    const eligiblePrompts = [];

    for (const promptType of Object.keys(PROMPT_CONFIG)) {
      const shouldShow = await this.shouldShowPrompt(promptType, context);
      if (shouldShow) {
        const interpolatedConfig = this.getInterpolatedPrompt(promptType, context);
        eligiblePrompts.push({
          type: promptType,
          config: interpolatedConfig,
        });
      }
    }

    if (eligiblePrompts.length === 0) return null;

    // Sort by priority (higher = more important)
    eligiblePrompts.sort((a, b) => b.config.priority - a.config.priority);

    return eligiblePrompts[0];
  }

  /**
   * Record that a prompt was shown
   */
  async recordPromptShown(promptType) {
    await this.initialize();

    this.promptsShown[promptType] = (this.promptsShown[promptType] || 0) + 1;
    this.cooldowns[promptType] = Date.now();

    await this.persist();
  }

  /**
   * Dismiss a prompt permanently
   */
  async dismissPrompt(promptType) {
    await this.initialize();
    this.dismissedPrompts.add(promptType);
    await this.persist();
  }

  /**
   * Reset a specific prompt (for testing or re-engagement)
   */
  async resetPrompt(promptType) {
    await this.initialize();
    delete this.promptsShown[promptType];
    delete this.cooldowns[promptType];
    this.dismissedPrompts.delete(promptType);
    await this.persist();
  }

  // ===========================================
  // SPECIFIC PROMPT GETTERS
  // ===========================================

  /**
   * Get report prompt after completing a walk
   */
  async getAfterWalkPrompt(context = {}) {
    const shouldShow = await this.shouldShowPrompt(PROMPT_TYPES.REPORT_AFTER_WALK, {
      ...context,
      walkJustCompleted: true,
    });

    if (!shouldShow) return null;

    const interpolatedConfig = this.getInterpolatedPrompt(PROMPT_TYPES.REPORT_AFTER_WALK, {
      ...context,
      walkJustCompleted: true,
    });

    return {
      type: PROMPT_TYPES.REPORT_AFTER_WALK,
      ...interpolatedConfig,
    };
  }

  /**
   * Get safety tip prompt for late night users
   */
  async getLateNightPrompt(context = {}) {
    const hour = new Date().getHours();
    if (hour < 21 && hour >= 5) return null;

    const shouldShow = await this.shouldShowPrompt(PROMPT_TYPES.TIP_LATE_NIGHT, context);

    if (!shouldShow) return null;

    const interpolatedConfig = this.getInterpolatedPrompt(
      PROMPT_TYPES.TIP_LATE_NIGHT,
      context
    );

    return {
      type: PROMPT_TYPES.TIP_LATE_NIGHT,
      ...interpolatedConfig,
    };
  }

  /**
   * Get first-time reporter encouragement
   */
  async getFirstReportPrompt(context = {}) {
    if ((this.userEngagement.reportsSubmitted || 0) > 0) return null;

    const shouldShow = await this.shouldShowPrompt(PROMPT_TYPES.REPORT_FIRST_TIME, context);

    if (!shouldShow) return null;

    const interpolatedConfig = this.getInterpolatedPrompt(PROMPT_TYPES.REPORT_FIRST_TIME, context);

    return {
      type: PROMPT_TYPES.REPORT_FIRST_TIME,
      ...interpolatedConfig,
    };
  }

  /**
   * Get Home Beacon feature discovery prompt
   */
  async getHomeBeaconPrompt(context = {}) {
    const shouldShow = await this.shouldShowPrompt(PROMPT_TYPES.FEATURE_HOME_BEACON, context);

    if (!shouldShow) return null;

    const interpolatedConfig = this.getInterpolatedPrompt(
      PROMPT_TYPES.FEATURE_HOME_BEACON,
      context
    );

    return {
      type: PROMPT_TYPES.FEATURE_HOME_BEACON,
      ...interpolatedConfig,
    };
  }

  // ===========================================
  // STATISTICS
  // ===========================================

  async getEngagementStats() {
    await this.initialize();
    return {
      ...this.userEngagement,
      promptsShown: { ...this.promptsShown },
      dismissedCount: this.dismissedPrompts.size,
    };
  }
}

// Export singleton instance
export const promptingService = new PromptingService();
export default promptingService;
