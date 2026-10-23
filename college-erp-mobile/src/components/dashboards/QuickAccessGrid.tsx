import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Typography, Shadows } from '../../constants/designSystem';

export type QuickAccessItem = {
  id: string;
  label: string;
  icon: string;
  bg: string;
  borderColor?: string;
  textColor?: string;
  badge?: string;
  onPress: () => void;
};

export type QuickAccessGridProps = {
  title?: string;
  seeAllText?: string;
  onSeeAll?: () => void;
  items: QuickAccessItem[];
};

export default function QuickAccessGrid({
  title = 'Quick Access',
  seeAllText = 'See all',
  onSeeAll,
  items,
}: QuickAccessGridProps) {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>{seeAllText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 2x2 Grid */}
      <View style={styles.grid}>
        {items.slice(0, 4).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: item.bg,
                borderColor: item.borderColor || 'rgba(0,0,0,0.06)',
              },
            ]}
            onPress={item.onPress}
            activeOpacity={0.75}
            accessibilityLabel={item.label}
            accessibilityRole="button"
          >
            <View style={styles.cardInner}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{item.icon}</Text>
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  item.textColor ? { color: item.textColor } : undefined,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
            {item.badge ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{item.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
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
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    minHeight: 74,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: 'center',
    ...Shadows.sm,
  },
  cardInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  badgePill: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
