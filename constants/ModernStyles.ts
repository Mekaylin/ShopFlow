import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { spacing, borderRadius, typography, shadows, layout } from '../constants/DesignTokens';

/**
 * Modern Component Styles
 * Consistent, reusable styles following design system principles
 */

// Button variants
export const buttonStyles = StyleSheet.create({
  // Base button
  base: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  
  // Primary button
  primary: {
    backgroundColor: Colors.light.primary,
  },
  
  // Secondary button
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  
  // Ghost button
  ghost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Destructive button
  destructive: {
    backgroundColor: Colors.light.danger,
  },
  
  // Button text styles
  primaryText: {
    color: Colors.light.primaryForeground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  
  secondaryText: {
    color: Colors.light.text,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  
  ghostText: {
    color: Colors.light.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  
  destructiveText: {
    color: '#ffffff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
});

// Card styles
export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: Colors.light.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  
  elevated: {
    backgroundColor: Colors.light.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  
  outlined: {
    backgroundColor: Colors.light.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});

// Input styles
export const inputStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  
  input: {
    height: layout.inputHeight,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: Colors.light.surface,
    color: Colors.light.text,
  },
  
  inputFocused: {
    borderColor: Colors.light.primary,
    ...shadows.sm,
  },
  
  inputError: {
    borderColor: Colors.light.danger,
  },
  
  errorText: {
    fontSize: typography.fontSize.xs,
    color: Colors.light.danger,
    marginTop: spacing.xs,
  },
});

// Typography styles
export const textStyles = StyleSheet.create({
  // Headings
  h1: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: Colors.light.text,
    lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
  },
  
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: Colors.light.text,
    lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
  },
  
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
  },
  
  h4: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    lineHeight: typography.fontSize.xl * typography.lineHeight.normal,
  },
  
  // Body text
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    color: Colors.light.text,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  
  bodySecondary: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    color: Colors.light.textSecondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    color: Colors.light.textMuted,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  
  // Special text
  link: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: Colors.light.primary,
    textDecorationLine: 'underline',
  },
});

// Layout styles
export const layoutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  
  content: {
    flex: 1,
    padding: spacing.md,
  },
  
  contentWithHeader: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Spacing utilities
  mb_xs: { marginBottom: spacing.xs },
  mb_sm: { marginBottom: spacing.sm },
  mb_md: { marginBottom: spacing.md },
  mb_lg: { marginBottom: spacing.lg },
  mb_xl: { marginBottom: spacing.xl },
  
  mt_xs: { marginTop: spacing.xs },
  mt_sm: { marginTop: spacing.sm },
  mt_md: { marginTop: spacing.md },
  mt_lg: { marginTop: spacing.lg },
  mt_xl: { marginTop: spacing.xl },
  
  p_xs: { padding: spacing.xs },
  p_sm: { padding: spacing.sm },
  p_md: { padding: spacing.md },
  p_lg: { padding: spacing.lg },
  p_xl: { padding: spacing.xl },
});

// Modal styles
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  
  content: {
    backgroundColor: Colors.light.surface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.xl,
  },
  
  header: {
    marginBottom: spacing.lg,
  },
  
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

// Tab styles
export const tabStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingVertical: spacing.sm,
    height: layout.tabBarHeight,
  },
  
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  
  tabButtonActive: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  
  tabLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: Colors.light.textMuted,
    marginTop: spacing.xs,
  },
  
  tabLabelActive: {
    color: Colors.light.primary,
  },
});
