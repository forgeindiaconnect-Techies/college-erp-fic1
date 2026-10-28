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
  // Brand Primary & Accent (Monochrome / Jet Black)
  primary: '#111827',         // Deep Jet Black / Near-Black (Headers, Key Highlights)
  primaryAccent: '#000000',   // Pure Black for Primary Buttons & Focus States
  primaryLight: '#F3F4F6',    // Subtle Light Grey for Active Pills & Backgrounds
  primaryBorder: '#E5E7EB',   // Subtle 1px Light Grey Border
  primaryMuted: '#4B5563',    // Dark Slate Grey for Secondary Interactive Elements

  // Neutrals & Surfaces
  background: '#F9FAFB',      // Soft Off-White Clean Background
  surface: '#FFFFFF',         // Pure White Cards & Panels
  surfaceBorder: '#E5E7EB',   // Subtle Card & Row Borders (1px clean)
  borderLight: '#F3F4F6',
  border: '#E5E7EB',
  surfaceHover: '#F9FAFB',

  // Typography Palette
  textPrimary: '#111827',     // Crisp Near-Black for Headings & Titles
  textSecondary: '#374151',   // Neutral Charcoal for Body Content
  textMuted: '#6B7280',       // Neutral Grey for Subtitles, Descriptions, Meta
  textLight: '#9CA3AF',       // Light Neutral Grey for Captions & Timestamps
  textWhite: '#FFFFFF',

  // Semantic Status Tints (Restrained, accessible, professional)
  success: '#059669',
  successBg: '#ECFDF5',
  successText: '#065F46',
  successBorder: '#A7F3D0',

  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningText: '#92400E',
  warningBorder: '#FDE68A',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerText: '#991B1B',
  dangerBorder: '#FECACA',

  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoText: '#1E40AF',
  infoBorder: '#BFDBFE',

  purple: '#6B7280',
  purpleBg: '#F3F4F6',
  purpleText: '#374151',

  amber: '#D97706',
  amberBg: '#FFFBEB',
  amberText: '#92400E',

  cyan: '#4B5563',
  cyanBg: '#F3F4F6',
  cyanText: '#1F2937',
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
    fontWeight: '700' as const,
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
  md: 8,
  lg: 10,
  xl: 12,
  pill: 999,
  full: 999,
};

export const Shadows = StyleSheet.create({
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  banner: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardHeaderLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});
