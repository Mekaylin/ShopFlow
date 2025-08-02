/**
 * Modern color system with semantic naming and consistent palette
 * Inspired by contemporary design systems like Shadcn/UI and Vercel
 */

// Brand colors
const primary = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',  // Main brand color
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
  950: '#082f49',
};

const neutral = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
};

const success = {
  50: '#f0fdf4',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
};

const warning = {
  50: '#fffbeb',
  500: '#f59e0b',
  600: '#d97706',
};

const danger = {
  50: '#fef2f2',
  500: '#ef4444',
  600: '#dc2626',
  700: '#b91c1c',
};

export const Colors = {
  light: {
    // Text
    text: neutral[900],
    textSecondary: neutral[600],
    textMuted: neutral[500],
    
    // Backgrounds
    background: '#ffffff',
    backgroundSecondary: neutral[50],
    backgroundMuted: neutral[100],
    
    // Primary brand
    primary: primary[500],
    primaryForeground: '#ffffff',
    primaryHover: primary[600],
    
    // Surface colors
    surface: '#ffffff',
    surfaceSecondary: neutral[50],
    
    // Borders
    border: neutral[200],
    borderSecondary: neutral[300],
    
    // Interactive elements
    tint: primary[500],
    icon: neutral[600],
    tabIconDefault: neutral[400],
    tabIconSelected: primary[500],
    
    // Status colors
    success: success[500],
    warning: warning[500],
    danger: danger[500],
    
    // Shadows
    shadow: 'rgba(0, 0, 0, 0.08)',
    shadowMedium: 'rgba(0, 0, 0, 0.12)',
  },
  dark: {
    // Text
    text: neutral[50],
    textSecondary: neutral[400],
    textMuted: neutral[500],
    
    // Backgrounds
    background: neutral[950],
    backgroundSecondary: neutral[900],
    backgroundMuted: neutral[800],
    
    // Primary brand
    primary: primary[400],
    primaryForeground: neutral[950],
    primaryHover: primary[300],
    
    // Surface colors
    surface: neutral[900],
    surfaceSecondary: neutral[800],
    
    // Borders
    border: neutral[800],
    borderSecondary: neutral[700],
    
    // Interactive elements
    tint: primary[400],
    icon: neutral[400],
    tabIconDefault: neutral[500],
    tabIconSelected: primary[400],
    
    // Status colors
    success: success[600],
    warning: warning[600],
    danger: danger[600],
    
    // Shadows
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.4)',
  },
};
