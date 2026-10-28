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
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconEmoji: {
    fontSize: 18,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.1,
  },
  subtitleText: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
