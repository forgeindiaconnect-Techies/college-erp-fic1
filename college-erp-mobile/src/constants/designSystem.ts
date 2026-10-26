/**
 * College ERP Mobile Unified Design System
 * 
 * Provides consistent styling tokens across all 5 user roles:
 * - Student
 * - Parent
 * - Staff / Faculty / HOD
 * - Watchman
 * - Driver
 */

import { Platform, StyleSheet } from 'react-native';

export const Colors = {
  // Brand Primary (Royal Blue)
  primary: '#1E3A8A',         // Deep Royal Blue (Headers, Brand, Key Action Highlights)
  primaryAccent: '#2563EB',   // Vibrant Royal Blue (Primary Buttons, Active Tabs, Highlights)
  primaryLight: '#EFF6FF',    // Soft Ice Blue (Active Pills, Icon Backgrounds)
  primaryBorder: '#BFDBFE',   // Subtle Blue Border
  primaryMuted: '#3B82F6',

  // Neutrals & Surfaces
  background: '#F8FAFC',      // Clean Slate / Very Light Blue-Grey Screen Background
  surface: '#FFFFFF',         // Pure White Cards & Panels
  surfaceBorder: '#E2E8F0',   // Subtle Card & Row Borders
  borderLight: '#E2E8F0',
  border: '#E2E8F0',
  surfaceHover: '#F1F5F9',

  // Typography Palette
  textPrimary: '#0F172A',     // High-contrast Dark Navy / Slate for Headings & Titles
  textSecondary: '#334155',   // Medium-dark Slate for Body Content
  textMuted: '#64748B',       // Neutral Grey for Subtitles, Descriptions, Meta
  textLight: '#94A3B8',       // Light Neutral Grey for Captions & Timestamps
  textWhite: '#FFFFFF',

  // Semantic Status Tints
  success: '#16A34A',
  successBg: '#DCFCE7',
  successText: '#15803D',
  successBorder: '#BBF7D0',

  warning: '#D97706',
  warningBg: '#FEF3C7',
  warningText: '#B45309',
  warningBorder: '#FDE68A',

  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  dangerText: '#B91C1C',
  dangerBorder: '#FECACA',

  info: '#0284C7',
  infoBg: '#E0F2FE',
  infoText: '#0369A1',
  infoBorder: '#BAE6FD',

  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  purpleText: '#6D28D9',

  amber: '#D97706',
  amberBg: '#FFFBEB',
  amberText: '#B45309',

  cyan: '#0891B2',
  cyanBg: '#ECFEFF',
  cyanText: '#0E7490',
} as const;

export const Typography = {
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  sizes: {
    caption: 11,
    body: 13,
    titleSmall: 14,
    titleMedium: 16,
    titleLarge: 20,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const Radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
  full: 999,
};

export const Shadows = StyleSheet.create({
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  banner: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
});

export const SharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 90,
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
    ...Shadows.soft,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardHeaderLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryAccent,
  },
  primaryButton: {
    backgroundColor: Colors.primaryAccent,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
