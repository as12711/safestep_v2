/**
 * SafeStep Cleanup Utilities
 * ==========================
 * Memory leak prevention and resource management utilities.
 * 
 * Common React Native memory leak sources:
 * 1. Uncleared timeouts/intervals
 * 2. Uncancelled subscriptions
 * 3. Event listeners not removed
 * 4. Async operations completing after unmount
 * 5. Large objects held in closures
 */

/**
 * Creates a cancellable promise wrapper
 * Use this for async operations in useEffect
 * 
 * @example
 * useEffect(() => {
 *   const { promise, cancel } = makeCancellable(fetchData());
 *   promise.then(setData).catch(e => {
 *     if (!e.isCancelled) console.error(e);
 *   });
 *   return cancel;
 * }, []);
 */
export const makeCancellable = (promise) => {
  let isCancelled = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then((val) => {
        if (!isCancelled) {
          resolve(val);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      isCancelled = true;
    },
  };
};

/**
 * Creates a mounted ref tracker for safe state updates
 * 
 * @example
 * const isMounted = useMountedRef();
 * 
 * useEffect(() => {
 *   fetchData().then(data => {
 *     if (isMounted.current) setData(data);
 *   });
 * }, []);
 */
export const createMountedRef = () => {
  const ref = { current: true };
  return {
    ref,
    cleanup: () => { ref.current = false; },
  };
};

/**
 * React hook for safe async operations
 * Prevents state updates after unmount
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';

export const useSafeState = (initialState) => {
  const [state, setState] = useState(initialState);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setSafeState = useCallback((newState) => {
    if (isMountedRef.current) {
      setState(newState);
    }
  }, []);

  return [state, setSafeState];
};

/**
 * Hook for managing timeouts with automatic cleanup
 * 
 * @example
 * const { setTimeout: safeSetTimeout, clearAll } = useSafeTimeout();
 * safeSetTimeout(() => doSomething(), 1000);
 * // Automatically cleaned up on unmount
 */
export const useSafeTimeout = () => {
  const timeoutIds = useRef(new Set());

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current.clear();
    };
  }, []);

  const safeSetTimeout = useCallback((callback, delay) => {
    const id = setTimeout(() => {
      timeoutIds.current.delete(id);
      callback();
    }, delay);
    timeoutIds.current.add(id);
    return id;
  }, []);

  const safeClearTimeout = useCallback((id) => {
    clearTimeout(id);
    timeoutIds.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    timeoutIds.current.forEach((id) => clearTimeout(id));
    timeoutIds.current.clear();
  }, []);

  return { setTimeout: safeSetTimeout, clearTimeout: safeClearTimeout, clearAll };
};

/**
 * Hook for managing intervals with automatic cleanup
 */
export const useSafeInterval = () => {
  const intervalIds = useRef(new Set());

  useEffect(() => {
    return () => {
      intervalIds.current.forEach((id) => clearInterval(id));
      intervalIds.current.clear();
    };
  }, []);

  const safeSetInterval = useCallback((callback, delay) => {
    const id = setInterval(callback, delay);
    intervalIds.current.add(id);
    return id;
  }, []);

  const safeClearInterval = useCallback((id) => {
    clearInterval(id);
    intervalIds.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    intervalIds.current.forEach((id) => clearInterval(id));
    intervalIds.current.clear();
  }, []);

  return { setInterval: safeSetInterval, clearInterval: safeClearInterval, clearAll };
};

/**
 * Hook for managing event subscriptions with cleanup
 * 
 * @example
 * const { subscribe, unsubscribeAll } = useSubscriptions();
 * 
 * useEffect(() => {
 *   subscribe(locationService.onLocationUpdate, handleLocation);
 *   subscribe(AppState.addEventListener('change', handleAppState));
 * }, []);
 */
export const useSubscriptions = () => {
  const subscriptions = useRef([]);

  useEffect(() => {
    return () => {
      subscriptions.current.forEach((unsub) => {
        if (typeof unsub === 'function') {
          unsub();
        } else if (unsub && typeof unsub.remove === 'function') {
          unsub.remove();
        }
      });
      subscriptions.current = [];
    };
  }, []);

  const subscribe = useCallback((subscription) => {
    subscriptions.current.push(subscription);
    return subscription;
  }, []);

  const unsubscribe = useCallback((subscription) => {
    const index = subscriptions.current.indexOf(subscription);
    if (index > -1) {
      subscriptions.current.splice(index, 1);
      if (typeof subscription === 'function') {
        subscription();
      } else if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    }
  }, []);

  const unsubscribeAll = useCallback(() => {
    subscriptions.current.forEach((unsub) => {
      if (typeof unsub === 'function') {
        unsub();
      } else if (unsub && typeof unsub.remove === 'function') {
        unsub.remove();
      }
    });
    subscriptions.current = [];
  }, []);

  return { subscribe, unsubscribe, unsubscribeAll };
};

/**
 * Hook for tracking mounted state
 */
export const useMountedRef = () => {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};

/**
 * Hook for async operations with loading state
 * Handles cleanup automatically
 */
export const useAsyncEffect = (asyncCallback, dependencies = []) => {
  const isMounted = useMountedRef();

  useEffect(() => {
    const execute = async () => {
      try {
        await asyncCallback(isMounted);
      } catch (error) {
        if (isMounted.current) {
          console.error('[useAsyncEffect] Error:', error);
        }
      }
    };

    execute();
    // Dependencies handled by caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

/**
 * Debounce function with cleanup support
 */
export const debounce = (func, wait) => {
  let timeoutId = null;

  const debounced = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
};

/**
 * Throttle function with cleanup support
 */
export const throttle = (func, limit) => {
  let inThrottle = false;
  let lastArgs = null;

  const throttled = (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          throttled(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };

  throttled.cancel = () => {
    inThrottle = false;
    lastArgs = null;
  };

  return throttled;
};

/**
 * WeakMap-based cache for objects (auto garbage collected)
 */
export const createWeakCache = () => {
  const cache = new WeakMap();

  return {
    get: (key) => cache.get(key),
    set: (key, value) => cache.set(key, value),
    has: (key) => cache.has(key),
    delete: (key) => cache.delete(key),
  };
};

/**
 * LRU Cache with size limit
 */
export const createLRUCache = (maxSize = 100) => {
  const cache = new Map();

  return {
    get: (key) => {
      if (cache.has(key)) {
        const value = cache.get(key);
        // Move to end (most recently used)
        cache.delete(key);
        cache.set(key, value);
        return value;
      }
      return undefined;
    },
    set: (key, value) => {
      if (cache.has(key)) {
        cache.delete(key);
      } else if (cache.size >= maxSize) {
        // Remove oldest (first) entry
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, value);
    },
    has: (key) => cache.has(key),
    delete: (key) => cache.delete(key),
    clear: () => cache.clear(),
    size: () => cache.size,
  };
};

/**
 * Abort controller wrapper for fetch requests
 * 
 * @example
 * const { fetch: safeFetch, abort } = createAbortableFetch();
 * 
 * safeFetch('/api/data').then(handleData);
 * // Later...
 * abort(); // Cancels the request
 */
export const createAbortableFetch = () => {
  const controller = new AbortController();

  return {
    fetch: (url, options = {}) => 
      fetch(url, { ...options, signal: controller.signal }),
    abort: () => controller.abort(),
    signal: controller.signal,
  };
};

/**
 * Hook for abortable fetch requests
 */
export const useAbortableFetch = () => {
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const fetchWithAbort = useCallback(async (url, options = {}) => {
    // Abort previous request
    controllerRef.current?.abort();

    // Create new controller
    controllerRef.current = new AbortController();

    return fetch(url, {
      ...options,
      signal: controllerRef.current.signal,
    });
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return { fetch: fetchWithAbort, abort };
};

/**
 * Memory usage logging utility
 */
export const logMemoryUsage = (label = 'Memory') => {
  if (__DEV__ && global.performance?.memory) {
    const { usedJSHeapSize, totalJSHeapSize } = global.performance.memory;
    console.log(
      `[${label}] Used: ${(usedJSHeapSize / 1048576).toFixed(2)}MB / ` +
      `Total: ${(totalJSHeapSize / 1048576).toFixed(2)}MB`
    );
  }
};

