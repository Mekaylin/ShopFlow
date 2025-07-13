import { Platform, useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme() {
  // For web/SSR environments, return 'light' as default
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return 'light';
  }
  
  try {
    return useRNColorScheme();
  } catch (error) {
    // Fallback to light theme if useColorScheme fails
    return 'light';
  }
}
