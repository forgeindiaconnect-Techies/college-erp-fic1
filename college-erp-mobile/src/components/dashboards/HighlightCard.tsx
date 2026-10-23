import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Typography, Shadows } from '../../constants/designSystem';

export type HighlightCardProps = {
  sectionTitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  icon: string | React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeBg?: string;
  badgeTextColor?: string;
  onPress?: () => void;
};

export default function HighlightCard({
  sectionTitle,
  actionText,
  onActionPress,
  icon,
  iconBg = '#EFF6FF',
  title,
  subtitle,
  badgeText,
  badgeBg = '#DCFCE7',
  badgeTextColor = '#15803D',
  onPress,
}: HighlightCardProps) {
  return (
    <View style={styles.container}>
      {sectionTitle ? (
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {actionText && onActionPress ? (
            <TouchableOpacity onPress={onActionPress} activeOpacity={0.7}>
              <Text style={styles.actionText}>{actionText}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.card}
        onPress={onPress || onActionPress}
        activeOpacity={0.75}
        disabled={!onPress && !onActionPress}
      >
        <View style={styles.leftRow}>
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            {typeof icon === 'string' ? (
              <Text style={styles.iconEmoji}>{icon}</Text>
            ) : (
              icon
            )}
          </View>
          <View style={styles.textCol}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightRow}>
          {badgeText ? (
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeTextColor }]}>
                {badgeText}
              </Text>
            </View>
          ) : null}
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 20,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
