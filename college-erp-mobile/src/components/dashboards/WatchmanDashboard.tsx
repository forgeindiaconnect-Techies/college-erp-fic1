import React, { useState, useEffect, useCallback } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { type MobileUser } from '../../services/api';
import BottomTabBar, { type MainNavTab } from '../navigation/BottomTabBar';
import ScreenHeader from '../navigation/ScreenHeader';
import ReferralHub from '../referrals/ReferralHub';
import WatchmanCommandCenter from '../watchman/WatchmanCommandCenter';
import WatchmanGateOperations from '../watchman/WatchmanGateOperations';
import WatchmanVisitorModule from '../watchman/WatchmanVisitorModule';
import WatchmanLogisticsModule from '../watchman/WatchmanLogisticsModule';
import WatchmanAccountModule from '../watchman/WatchmanAccountModule';
import MobileNotificationCenter from '../notifications/MobileNotificationCenter';

type Props = {
  user: MobileUser;
  onLogout: () => void;
};

export default function WatchmanDashboard({ user, onLogout }: Props) {
  // 5 Main Navigation Destinations (Home, Gate Ops, Visitors, Logistics, Account)
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [assignedGate, setAssignedGate] = useState('Gate 1 (Main Entrance)');
  const [showReferralsHub, setShowReferralsHub] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const handleUnreadNotifsCountChange = useCallback((cnt: number) => {
    setUnreadNotifsCount(prev => (prev === cnt ? prev : cnt));
  }, []);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (showReferralsHub) {
        setShowReferralsHub(false);
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeTab, showReferralsHub]);

  const isInnerScreen = activeTab !== 'home' || showReferralsHub;

  const getScreenTitle = () => {
    if (showReferralsHub) return 'Business Referrals & Rewards';
    if (activeTab === 'academics') return 'Gate Operations';
    if (activeTab === 'referrals') return 'Visitor Management';
    if (activeTab === 'notifications') return 'Logistics & Shift Duty';
    if (activeTab === 'profile') return 'Security Officer Account';
    return 'Security Command Center';
  };

  const getScreenSubtitle = () => {
    if (showReferralsHub) return 'Referral Hub';
    if (activeTab === 'home') return `${assignedGate} • Live Duty Active`;
    if (activeTab === 'academics') return 'Student & Staff Movements';
    if (activeTab === 'referrals') return 'Guest Passes & Authorizations';
    if (activeTab === 'notifications') return 'Buses, Deliveries & Fleet';
    if (activeTab === 'profile') return 'Badge & Station Settings';
    return undefined;
  };

  const handleBackNavigation = () => {
    if (showReferralsHub) {
      setShowReferralsHub(false);
    } else {
      setActiveTab('home');
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP GATE COMMAND SCREEN HEADER */}
      <ScreenHeader
        showBack={isInnerScreen}
        onBack={handleBackNavigation}
        title={getScreenTitle()}
        subtitle={getScreenSubtitle()}
        userName={user.name || 'Security Officer'}
        roleBadge="SECURITY"
        avatarText="🛡️"
        userSubtitle={`${assignedGate} • On Duty`}
        notificationsCount={unreadNotifsCount}
        onNotificationsPress={() => setShowNotifModal(true)}
        onProfilePress={() => {
          setShowReferralsHub(false);
          setActiveTab('profile');
        }}
        onLogoutPress={onLogout}
      />

      {/* 2. BODY CONTENT ROUTED ACCORDING TO USER'S SELECTED DESTINATION */}
      <View style={styles.bodyWrapper}>
        {showReferralsHub ? (
          <ReferralHub user={user} onBack={() => setShowReferralsHub(false)} />
        ) : activeTab === 'home' ? (
          /* MODULE 1: COMMAND CENTER */
          <WatchmanCommandCenter
            user={user}
            assignedGate={assignedGate}
            onNavigateGate={() => setActiveTab('academics')}
            onNavigateVisitors={() => setActiveTab('referrals')}
            onNavigateLogistics={() => setActiveTab('notifications')}
          />
        ) : activeTab === 'academics' ? (
          /* MODULE 2 & 3: STUDENT & STAFF GATE OPERATIONS */
          <WatchmanGateOperations
            user={user}
            assignedGate={assignedGate}
            onNavigateHome={() => setActiveTab('home')}
          />
        ) : activeTab === 'referrals' ? (
          /* MODULE 4: VISITOR MANAGEMENT */
          <WatchmanVisitorModule
            user={user}
            assignedGate={assignedGate}
            onNavigateHome={() => setActiveTab('home')}
          />
        ) : activeTab === 'notifications' ? (
          /* MODULE 5: CAMPUS LOGISTICS & DUTY */
          <WatchmanLogisticsModule
            user={user}
            assignedGate={assignedGate}
            onNavigateHome={() => setActiveTab('home')}
          />
        ) : (
          /* MODULE 6: ACCOUNT / MY PROFILE & LOGOUT */
          <WatchmanAccountModule
            user={user}
            assignedGate={assignedGate}
            onGateChange={setAssignedGate}
            onLogout={onLogout}
            onOpenReferrals={() => setShowReferralsHub(true)}
          />
        )}
      </View>

      {/* 3. 5-DESTINATION TOUCH-FRIENDLY BOTTOM NAVIGATION BAR */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setShowReferralsHub(false);
          setActiveTab(tab);
        }}
        tabLabels={{
          home: 'Command',
          academics: 'Gate Ops',
          referrals: 'Visitors',
          notifications: 'Logistics',
          profile: 'Account',
        }}
        tabIcons={{
          home: '🛡️',
          academics: '🚪',
          referrals: '👥',
          notifications: '🚚',
          profile: '👤',
        }}
        notificationsCount={unreadNotifsCount}
      />

      {/* Real-Time Security & Campus Notifications Modal */}
      <MobileNotificationCenter
        user={user}
        isModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onUnreadCountChange={handleUnreadNotifsCountChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bodyWrapper: {
    flex: 1,
  },
});
