// Navigation debugging utilities
import { Platform } from 'react-native';

export const logNavigation = (from: string, to: string, method: string = 'unknown') => {
  const timestamp = new Date().toISOString();
  console.log(`[Navigation] ${timestamp} - ${from} -> ${to} (${method}) [Platform: ${Platform.OS}]`);
  
  // For web platforms, also log to browser console if available
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    console.info(`🧭 Navigation: ${from} → ${to} (${method})`);
  }
};

export const logNavigationError = (from: string, to: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[Navigation Error] ${timestamp} - Failed to navigate from ${from} to ${to}:`, error);
  
  // For web platforms, also log to browser console if available
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    console.error(`❌ Navigation Failed: ${from} → ${to}`, error);
  }
};

export const logPageReload = (page: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[Page Reload] ${timestamp} - ${page} reloaded [Platform: ${Platform.OS}]`);
  
  // For web platforms, also log to browser console if available
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    console.info(`🔄 Page Reload: ${page}`);
  }
};

export const getCurrentRoute = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return 'unknown';
};

export const getNavigationContext = () => {
  const route = getCurrentRoute();
  const userAgent = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';
  const isMobileWeb = Platform.OS === 'web' && /Mobi|Android/i.test(userAgent);
  const isDesktopWeb = Platform.OS === 'web' && !/Mobi|Android/i.test(userAgent);
  
  return {
    platform: Platform.OS,
    route,
    userAgent,
    isMobileWeb,
    isDesktopWeb,
    timestamp: new Date().toISOString()
  };
};
