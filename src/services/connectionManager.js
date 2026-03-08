/**
 * Connection Manager
 */

import { supabase } from './supabase';
import { mapbox } from './mapbox';
import { ENV, isDevelopment, validateEnv } from '../config/env';

class ConnectionManager {
  constructor() {
    this.listeners = [];
    this.lastHealth = { timestamp: null, overall: 'unknown', services: {} };
  }

  async runHealthCheck() {
    const results = { timestamp: new Date().toISOString(), services: {}, overall: 'healthy' };

    try {
      const supabaseHealth = await supabase.healthCheck();
      results.services.supabase = supabaseHealth;
      if (supabaseHealth.status !== 'healthy') results.overall = 'degraded';
    } catch (error) {
      results.services.supabase = { status: 'error', error: error.message };
      results.overall = 'degraded';
    }

    results.services.mapbox = { status: mapbox.isAvailable() ? 'healthy' : 'unconfigured' };
    this.lastHealth = results;
    this.listeners.forEach(listener => listener(results));
    return results;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  logDebugInfo() {
    if (!isDevelopment()) return;
    const { errors, warnings } = validateEnv();
    console.log('\n========================================');
    console.log('🛡️  StepSafe Debug Info');
    console.log('========================================');
    console.log(`Version: ${ENV.APP_VERSION}`);
    console.log(`Environment: ${ENV.NODE_ENV}`);
    console.log(`Supabase URL: ${ENV.SUPABASE_URL ? '✓' : '✗'}`);
    console.log(`Supabase Key: ${ENV.SUPABASE_ANON_KEY ? '✓' : '✗'}`);
    console.log(`Mapbox Token: ${ENV.MAPBOX_ACCESS_TOKEN ? '✓' : '✗'}`);
    if (errors.length) console.log('Errors:', errors);
    if (warnings.length) console.log('Warnings:', warnings);
    console.log('========================================\n');
  }
}

export const connectionManager = new ConnectionManager();
export default connectionManager;