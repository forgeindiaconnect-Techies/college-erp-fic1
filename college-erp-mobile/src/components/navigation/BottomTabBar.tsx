import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/designSystem';

export type MainNavTab = 'home' | 'academics' | 'referrals' | 'notifications' | 'profile';

type Props = {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  notificationsCount?: number;
  tabLabels?: Partial<Record<MainNavTab, string>>;
  tabIcons?: Partial<Record<MainNavTab, string>>;
  tabsList?: MainNavTab[];
};

export default function BottomTabBar({
  activeTab,
  onTabChange,
  notificationsCount = 0,
  tabLabels,
  tabIcons,
  tabsList,
}: Props) {
  const insets = useSafeAreaInsets();
  const allTabs: { id: MainNavTab; label: string; icon: string }[] = [
    { id: 'home', label: tabLabels?.home || 'Home', icon: tabIcons?.home || '🏠' },
    { id: 'academics', label: tabLabels?.academics || 'Academics', icon: tabIcons?.academics || '🎓' },
    { id: 'referrals', label: tabLabels?.referrals || 'Referrals', icon: tabIcons?.referrals || '💼' },
    { id: 'notifications', label: tabLabels?.notifications || 'Alerts', icon: tabIcons?.notifications || '🔔' },
    { id: 'profile', label: tabLabels?.profile || 'Profile', icon: tabIcons?.profile || '👤' },
  ];

  const tabs = tabsList
    ? tabsList
        .map((tId) => allTabs.find((t) => t.id === tId))
        .filter((t): t is { id: MainNavTab; label: string; icon: string } => !!t)
    : allTabs;

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.tabBarInner}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                {tab.id === 'notifications' && notificationsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationsCount > 9 ? '9+' : notificationsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    paddingBottom: 4,
  },
  tabBarInner: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 1,
  },
  tabLabelActive: {
    color: Colors.primaryAccent,
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primaryAccent,
    marginTop: 3,
  },
});
