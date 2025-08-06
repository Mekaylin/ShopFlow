// EMERGENCY SAFE Navigation debugging utilities - prevents system crashes
import { Platform } from 'react-native';

// Emergency safe logging with circuit breaker to prevent infinite loops
let logCallCount = 0;
const MAX_LOG_CALLS = 100; // Prevent excessive logging that could crash system

export const logNavigation = (from: string, to: string, method: string = 'unknown') => {
  // EMERGENCY: Circuit breaker to prevent infinite logging loops
  if (logCallCount > MAX_LOG_CALLS) {
    return;
  }
  logCallCount++;
  
  try {
    const timestamp = new Date().toISOString();
    console.log(`[Navigation] ${timestamp} - ${from} -> ${to} (${method}) [Platform: ${Platform.OS}]`);
  } catch (error) {
    // Silent fail to prevent logging errors from crashing system
  }
};

export const logNavigationError = (from: string, to: string, error: any) => {
  // EMERGENCY: Circuit breaker to prevent infinite logging loops
  if (logCallCount > MAX_LOG_CALLS) {
    return;
  }
  logCallCount++;
  
  try {
    const timestamp = new Date().toISOString();
    console.error(`[Navigation Error] ${timestamp} - Failed to navigate from ${from} to ${to}:`, error);
  } catch (logError) {
    // Silent fail to prevent logging errors from crashing system
  }
};

export const getCurrentRoute = () => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      return window.location.pathname;
    }
  } catch (error) {
    // Silent fail to prevent route detection from crashing system
  }
  return 'unknown';
};

// Reset circuit breaker every 5 minutes
setInterval(() => {
  logCallCount = 0;
}, 5 * 60 * 1000);
