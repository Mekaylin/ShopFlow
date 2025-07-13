import { Platform } from 'react-native';

interface ShadowStyle {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

interface BoxShadowStyle {
  boxShadow?: string;
  elevation?: number;
}

/**
 * Creates cross-platform shadow styles
 * On iOS/Android: uses shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * On Web: converts to boxShadow to avoid deprecation warnings
 */
export function createShadowStyle(style: ShadowStyle): ShadowStyle | BoxShadowStyle {
  if (Platform.OS === 'web') {
    const {
      shadowColor = '#000',
      shadowOffset = { width: 0, height: 2 },
      shadowOpacity = 0.1,
      shadowRadius = 4,
      elevation
    } = style;

    // Convert React Native shadow to CSS boxShadow
    const offsetX = shadowOffset.width;
    const offsetY = shadowOffset.height;
    const blur = shadowRadius;
    const alpha = shadowOpacity;
    
    // Convert hex color to rgba if needed
    let shadowColorRgba = shadowColor;
    if (shadowColor.startsWith('#')) {
      const hex = shadowColor.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      shadowColorRgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return {
      boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${shadowColorRgba}`,
      elevation
    };
  }

  // Return original style for native platforms
  return style;
}

/**
 * Common shadow presets for consistent styling
 */
export const shadowPresets = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  card: {
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  }
};
