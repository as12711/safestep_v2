/**
 * Authentication Context
 * ======================
 * Manages user authentication state across the app.
 * Handles login, logout, signup, and session persistence.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { supabase } from '../services';

// ===========================================
// SECURE STORAGE HELPERS
// ===========================================
const SecureStorage = {
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      // Fallback to AsyncStorage if SecureStore fails (web, etc.)
      await AsyncStorage.setItem(`secure_${key}`, value);
    }
  },
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return await AsyncStorage.getItem(`secure_${key}`);
    }
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      await AsyncStorage.removeItem(`secure_${key}`);
    }
  },
};

// Storage keys
const AUTH_TOKEN_KEY = 'ss_auth_token';
const REFRESH_TOKEN_KEY = 'ss_refresh_token';
const USER_KEY = 'ss_user';

// ===========================================
// AUTH CONTEXT
// ===========================================
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider - Wraps the app to provide auth state
 */
export const AuthProvider = ({ children }) => {
  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  /**
   * Load stored session on mount
   */
  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      setIsLoading(true);
      
      // Try to get stored tokens
      const [accessToken, refreshToken, storedUser] = await Promise.all([
        SecureStorage.getItem(AUTH_TOKEN_KEY),
        SecureStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (accessToken && storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Set the access token for authenticated requests
        if (supabase?.setAccessToken) {
          supabase.setAccessToken(accessToken);
        }
        
        // Try to refresh the session if we have a refresh token
        if (refreshToken && supabase?.refreshSession) {
          const refreshResult = await supabase.refreshSession(refreshToken);
          if (refreshResult?.access_token) {
            await SecureStorage.setItem(AUTH_TOKEN_KEY, refreshResult.access_token);
            if (refreshResult.refresh_token) {
              await SecureStorage.setItem(REFRESH_TOKEN_KEY, refreshResult.refresh_token);
            }
          }
        }
        
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to load session:', e);
      // Clear potentially corrupted data
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = async (authData) => {
    if (!authData) return;
    
    try {
      const { access_token, refresh_token, user: userData } = authData;
      
      if (access_token) {
        await SecureStorage.setItem(AUTH_TOKEN_KEY, access_token);
        if (supabase?.setAccessToken) {
          supabase.setAccessToken(access_token);
        }
      }
      
      if (refresh_token) {
        await SecureStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      
      if (userData) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to save session:', e);
    }
  };

  const clearSession = async () => {
    try {
      await Promise.all([
        SecureStorage.removeItem(AUTH_TOKEN_KEY),
        SecureStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
      
      if (supabase?.setAccessToken) {
        supabase.setAccessToken(null);
      }
      
      setUser(null);
      setIsAuthenticated(false);
    } catch (e) {
      console.warn('[AuthContext] Failed to clear session:', e);
    }
  };

  // ===========================================
  // AUTH ACTIONS
  // ===========================================

  const signIn = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!supabase?.signIn) {
        throw new Error('Authentication service unavailable');
      }

      const result = await supabase.signIn(email, password);
      
      if (result.error) {
        setError(result.error.message);
        return { success: false, error: result.error.message };
      }

      await saveSession(result);
      return { success: true };
    } catch (e) {
      const message = e.message || 'Sign in failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email, password, profileData = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!supabase?.signUp) {
        throw new Error('Authentication service unavailable');
      }

      const result = await supabase.signUp(email, password);
      
      if (result.error) {
        setError(result.error.message);
        return { success: false, error: result.error.message };
      }

      // If signup returns a session, save it
      if (result.access_token) {
        await saveSession(result);
        
        // Create profile if we have profile data
        if (result.user?.id && Object.keys(profileData).length > 0) {
          await supabase.upsertProfile?.(result.user.id, profileData);
        }
      }

      return { success: true, needsConfirmation: !result.access_token };
    } catch (e) {
      const message = e.message || 'Sign up failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Call supabase signOut
      await supabase?.signOut?.();
      
      // Clear local session
      await clearSession();
      
      return { success: true };
    } catch (e) {
      console.warn('[AuthContext] Sign out error:', e);
      // Still clear session locally even if remote fails
      await clearSession();
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===========================================
  // CONTEXT VALUE
  // ===========================================
  const value = useMemo(
    () => ({
      // State
      user,
      isAuthenticated,
      isLoading,
      error,
      
      // Actions
      signIn,
      signUp,
      signOut,
      clearError,
      
      // Session helpers
      refreshSession: loadStoredSession,
    }),
    [user, isAuthenticated, isLoading, error, signIn, signUp, signOut, clearError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
