import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { type MobileUser } from '../../services/api';
import { Colors, Shadows, Spacing, Radius, Typography } from '../../constants/designSystem';

export type UserProfileProps = {
  user: MobileUser;
  roleTitle: string;
  onLogout: () => void;
  onBack: () => void;
  hideTopBar?: boolean;
  // Specific role attributes
  roleAttributes?: { label: string; value: string | number | undefined }[];
};

export default function UserProfileScreen({
  user,
  roleTitle,
  onLogout,
  onBack,
  hideTopBar = false,
  roleAttributes = [],
}: UserProfileProps) {
  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';

  const handleLogoutPress = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to log out of your College ERP account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Back Navigation (optional if parent provides ScreenHeader) */}
      {!hideTopBar && (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityLabel="Back to Dashboard"
            accessibilityRole="button"
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>User Profile</Text>
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleLogoutPress}
            activeOpacity={0.7}
            accessibilityLabel="Log out"
          >
            <Text style={styles.headerLogoutIcon}>🚪</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* 1. HERO IDENTITY CARD */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.roleBadgeBox}>
            <Text style={styles.roleBadgeText}>{roleTitle.toUpperCase()}</Text>
          </View>
          <Text style={styles.userNameText}>{user.name}</Text>
          <Text style={styles.userEmailText}>{user.email || 'No email registered'}</Text>
          <Text style={styles.collegeNameText}>
            {user.collegeName || user.tenantId || 'FIC Central College ERP'}
          </Text>
        </View>

        {/* 2. ROLE & OPERATIONAL ASSIGNMENTS */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>📋 Institutional Details</Text>
          <Text style={styles.cardSectionSubtitle}>
            Official campus roster assignments and academic records
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Role</Text>
            <Text style={styles.infoValue}>{roleTitle}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID / Reference</Text>
            <Text style={[styles.infoValue, { color: Colors.primaryAccent, fontWeight: '700' }]}>
              {user.referenceId || user.userId || user._id || 'N/A'}
            </Text>
          </View>

          {roleAttributes.map((attr, index) => {
            if (attr.value === undefined || attr.value === null || attr.value === '') return null;
            return (
              <View key={index} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{attr.label}</Text>
                <Text style={styles.infoValue}>{String(attr.value)}</Text>
              </View>
            );
          })}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Campus / Tenant</Text>
            <Text style={styles.infoValue}>{user.tenantId || user.collegeId || 'COL001'}</Text>
          </View>
        </View>

        {/* 3. ACCOUNT & SECURITY STATUS */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>🔒 Account & Security</Text>
          <Text style={styles.cardSectionSubtitle}>
            Authentication status and app configuration
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session Status</Text>
            <View style={styles.statusPillActive}>
              <Text style={styles.statusPillActiveText}>● Authenticated Session</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Security Level</Text>
            <Text style={styles.infoValue}>JWT Token • Encrypted Storage</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Client</Text>
            <Text style={styles.infoValue}>FIC College ERP Mobile (Expo React Native)</Text>
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              ℹ️ To update your official name, department, or institutional contact records, please contact your Campus Administrator or Academic Registrar.
            </Text>
          </View>
        </View>

        {/* 4. CLEAR, UNMISSABLE LOGOUT SECTION */}
        <View style={styles.logoutCard}>
          <Text style={styles.logoutCardTitle}>Account Sign Out</Text>
          <Text style={styles.logoutCardSubtitle}>
            End your current active session on this mobile device. You will need your login credentials to sign back in.
          </Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogoutPress}
            activeOpacity={0.8}
            accessibilityLabel="Sign Out of College ERP"
            accessibilityRole="button"
          >
            <Text style={styles.logoutButtonIcon}>🚪</Text>
            <Text style={styles.logoutButtonText}>Sign Out of College ERP</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
  },
  backArrow: {
    fontSize: 16,
    fontWeight: Typography.weights.heavy,
    color: Colors.primaryAccent,
    marginRight: 4,
  },
  backText: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
  },
  topBarTitle: {
    fontSize: Typography.sizes.titleMedium,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  headerLogoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoutIcon: {
    fontSize: 16,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: Typography.weights.heavy,
    color: Colors.primaryAccent,
  },
  roleBadgeBox: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  userNameText: {
    fontSize: Typography.sizes.titleLarge,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  userEmailText: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  collegeNameText: {
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
    marginTop: 4,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },

  // Card & Info Rows
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  cardSectionTitle: {
    fontSize: (Typography.sizes as any).titleSmall || 14,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  cardSectionSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
    marginTop: 1,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.bold,
    textAlign: 'right',
    flex: 1.2,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusPillActiveText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: '#15803D',
  },
  noticeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noticeText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },

  // Logout Card
  logoutCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: Spacing.xs,
  },
  logoutCardTitle: {
    fontSize: (Typography.sizes as any).titleSmall || 14,
    fontWeight: Typography.weights.heavy,
    color: '#991B1B',
  },
  logoutCardSubtitle: {
    fontSize: Typography.sizes.caption,
    color: '#B91C1C',
    marginTop: 2,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Shadows.sm,
  },
  logoutButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: Typography.weights.heavy,
    color: '#FFFFFF',
  },
});
