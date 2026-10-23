import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Shadows, Spacing, Radius, Typography } from '../../constants/designSystem';

export type ScreenHeaderProps = {
  // If true, shows the Back arrow and the screen title
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  subtitle?: string;

  // Home mode metadata
  collegeName?: string;
  collegeSubtitle?: string;
  userName?: string;
  roleBadge?: string;
  avatarText?: string;
  userSubtitle?: string;
  notificationsCount?: number;

  // Actions
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
  onNotificationsPress?: () => void;
  rightAction?: React.ReactNode;
};

export default function ScreenHeader({
  showBack = false,
  onBack,
  title,
  subtitle,
  collegeName = 'Arignar Anna College',
  collegeSubtitle = 'of Arts and Science',
  userName = 'User',
  roleBadge = 'MEMBER',
  avatarText,
  userSubtitle,
  notificationsCount = 0,
  onProfilePress,
  onLogoutPress,
  onNotificationsPress,
  rightAction,
}: ScreenHeaderProps) {
  const initials = avatarText || userName.substring(0, 2).toUpperCase() || 'U';

  const handleLogout = () => {
    if (onLogoutPress) {
      Alert.alert(
        'Confirm Sign Out',
        'Are you sure you want to log out of your College ERP account?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: onLogoutPress,
          },
        ]
      );
    }
  };

  if (showBack) {
    return (
      <View style={styles.headerContainerInner}>
        <View style={styles.headerInnerRow}>
          {/* Back Button with comfortable 44px touch target */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back to previous screen"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonArrow}>←</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {/* Screen Title & Subtitle */}
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle} numberOfLines={1}>
              {title || 'Screen'}
            </Text>
            {subtitle ? (
              <Text style={styles.screenSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {/* Right Action (Profile or Logout) */}
          <View style={styles.rightActionContainer}>
            {rightAction ? (
              rightAction
            ) : onProfilePress ? (
              <TouchableOpacity
                style={styles.avatarPillBtn}
                onPress={onProfilePress}
                activeOpacity={0.7}
                accessibilityLabel="Open user profile"
              >
                <View style={styles.avatarCircleSmall}>
                  <Text style={styles.avatarTextSmall}>{initials}</Text>
                </View>
              </TouchableOpacity>
            ) : onLogoutPress ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityLabel="Sign out"
              >
                <Text style={styles.headerLogoutEmoji}>🚪</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // Home Dashboard Header (Clean Institutional Branding + Action Bell & Avatar)
  return (
    <View style={styles.headerContainerHome}>
      <View style={styles.headerHomeRow}>
        {/* Institutional Crest Branding */}
        <View style={styles.collegeBrandRow}>
          <View style={styles.collegeIconBadge}>
            <Text style={styles.collegeIconText}>🎓</Text>
          </View>
          <View style={styles.collegeTitleCol}>
            <Text style={styles.collegeNameMain} numberOfLines={1}>
              {collegeName}
            </Text>
            <Text style={styles.collegeNameSub} numberOfLines={1}>
              {collegeSubtitle}
            </Text>
          </View>
        </View>

        {/* Right Action Icons (Notifications Bell & Profile Avatar & Logout) */}
        <View style={styles.homeActionIcons}>
          {onNotificationsPress ? (
            <TouchableOpacity
              style={styles.homeIconCircle}
              onPress={onNotificationsPress}
              activeOpacity={0.7}
              accessibilityLabel="View Notifications"
            >
              <Text style={styles.homeIconEmoji}>🔔</Text>
              {notificationsCount > 0 ? (
                <View style={styles.bellBadgeDot} />
              ) : null}
            </TouchableOpacity>
          ) : null}

          {onProfilePress ? (
            <TouchableOpacity
              style={styles.avatarPillBtn}
              onPress={onProfilePress}
              activeOpacity={0.7}
              accessibilityLabel="Open user profile"
            >
              <View style={styles.avatarCircleSmall}>
                <Text style={styles.avatarTextSmall}>{initials}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {onLogoutPress ? (
            <TouchableOpacity
              style={[styles.homeIconCircle, styles.logoutIconCircle]}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityLabel="Sign Out"
            >
              <Text style={styles.homeIconEmoji}>🚪</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Inner screen header (with Back arrow)
  headerContainerInner: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    ...Shadows.sm,
  },
  headerInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
    marginRight: Spacing.sm,
  },
  backButtonArrow: {
    fontSize: 18,
    fontWeight: Typography.weights.heavy,
    color: Colors.primaryAccent,
    marginRight: 4,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: Typography.sizes.titleMedium,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoutEmoji: {
    fontSize: 16,
  },

  // Home dashboard header
  headerContainerHome: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    ...Shadows.sm,
  },
  headerHomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collegeBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  collegeIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  collegeIconText: {
    fontSize: 20,
  },
  collegeTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  collegeNameMain: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.2,
  },
  collegeNameSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  homeActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatarPillBtn: {
    padding: 2,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  logoutIconCircle: {
    backgroundColor: '#FEE2E2',
  },
  homeIconEmoji: {
    fontSize: 16,
  },
});
