import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Radius, Typography, Shadows } from '../../constants/designSystem';

export type DashboardHeroBannerProps = {
  greeting: string;
  subtitle: string;
  image: ImageSourcePropType;
  tagline: string;
  taglineSub?: string;
  activeDotIndex?: number;
};

export default function DashboardHeroBanner({
  greeting,
  subtitle,
  image,
  tagline,
  taglineSub,
  activeDotIndex = 0,
}: DashboardHeroBannerProps) {
  return (
    <View style={styles.container}>
      {/* 1. Header Greeting Row */}
      <View style={styles.greetingHeader}>
        <Text style={styles.greetingTitle}>{greeting}</Text>
        <Text style={styles.greetingSubtitle}>{subtitle}</Text>
      </View>

      {/* 2. Visual Hero Card */}
      <View style={styles.heroCard}>
        <Image source={image} style={styles.heroImage} resizeMode="cover" />

        {/* Bottom subtle gradient tint */}
        <View style={styles.imageOverlayGradient} />

        {/* 3. Hero Tagline Badge (Bottom-Left) */}
        <View style={styles.taglineBadge}>
          <Text style={styles.taglineText}>{tagline}</Text>
          {taglineSub ? <Text style={styles.taglineSubText}>{taglineSub}</Text> : null}
        </View>

        {/* 4. Carousel Pagination Indicator Dots (Bottom-Center/Right) */}
        <View style={styles.paginationDotsContainer}>
          {[0, 1, 2].map((dot) => {
            const isActive = dot === activeDotIndex;
            return (
              <View
                key={dot}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  greetingHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
  },
  heroCard: {
    width: '100%',
    height: 118,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
  },
  taglineBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    maxWidth: '78%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  taglineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  taglineSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  paginationDotsContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 12,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
