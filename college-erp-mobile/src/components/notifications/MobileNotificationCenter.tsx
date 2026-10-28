import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import {
  getMobileNotifications,
  markMobileNotificationRead,
  markAllMobileNotificationsRead,
  NotificationItem,
  MobileUser,
} from '../../services/api';

interface MobileNotificationCenterProps {
  user?: MobileUser | null;
  isModal?: boolean;
  visible?: boolean;
  onClose?: () => void;
  onUnreadCountChange?: (count: number) => void;
  onNavigateToScreen?: (target: string, payload?: any) => void;
}

type CategoryFilter = 'All' | 'Unread' | 'academic' | 'fees' | 'transport' | 'security' | 'announcement';

export default function MobileNotificationCenter({
  user,
  isModal = false,
  visible = true,
  onClose,
  onUnreadCountChange,
  onNavigateToScreen,
}: MobileNotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  const lastReportedCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (lastReportedCountRef.current !== unreadCount) {
      lastReportedCountRef.current = unreadCount;
      onUnreadCountChangeRef.current?.(unreadCount);
    }
  }, [unreadCount]);

  const fetchNotifs = useCallback(async (isPull = false) => {
    if (!isPull) setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getMobileNotifications();
      const list = res.notifications || [];
      const unread = typeof res.unreadCount === 'number' ? res.unreadCount : list.filter(n => !n.isRead).length;

      setNotifications(list);
      setUnreadCount(unread);
    } catch (err: any) {
      console.warn('[MobileNotificationCenter] Fetch error:', err.message);
      setErrorMsg('Unable to connect to notification server. Please pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();

    // Auto-refresh notifications every 15 seconds for real-time in-app delivery
    const timer = setInterval(() => {
      fetchNotifs(true);
    }, 15000);

    return () => clearInterval(timer);
  }, [fetchNotifs]);

  const handleMarkAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => ((n._id || n.id) === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await markMobileNotificationRead(id);
    } catch (e: any) {
      console.warn('Error marking notification as read:', e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await markAllMobileNotificationsRead();
    } catch (e: any) {
      console.warn('Error marking all as read:', e.message);
    }
  };

  // Format relative timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Get category badge attributes
  const getCategoryMeta = (cat?: string, type?: string) => {
    const c = (cat || '').toLowerCase();
    const t = (type || '').toLowerCase();

    if (c.includes('fee') || c.includes('payment') || c.includes('account')) {
      return { icon: '💳', label: 'Finance', bg: '#ECFDF5', border: '#A7F3D0', text: '#059669' };
    }
    if (c.includes('academic') || c.includes('exam') || c.includes('result') || c.includes('mark') || c.includes('timetable')) {
      return { icon: '🎓', label: 'Academic', bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' };
    }
    if (c.includes('transport') || c.includes('bus') || c.includes('trip') || c.includes('driver')) {
      return { icon: '🚌', label: 'Transport', bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
    }
    if (c.includes('security') || c.includes('visitor') || c.includes('gate') || c.includes('parcel')) {
      return { icon: '🛡️', label: 'Security', bg: '#FAF5FF', border: '#E9D5FF', text: '#7C3AED' };
    }
    if (c.includes('library') || c.includes('book')) {
      return { icon: '📚', label: 'Library', bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
    }
    if (t === 'warning' || t === 'error') {
      return { icon: '⚠️', label: 'Alert', bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
    }
    return { icon: '📢', label: 'Circular', bg: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'Unread') return !n.isRead;
    if (activeFilter === 'All') return true;
    const cat = (n.category || '').toLowerCase();
    return cat.includes(activeFilter.toLowerCase());
  });

  const content = (
    <View style={[styles.container, isModal ? styles.modalContainer : null]}>
      {/* 1. Header Toolbar */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Alerts & Notices</Text>
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllBtnText}>Mark all read</Text>
            </TouchableOpacity>
          )}

          {isModal && onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Filter Category Chips */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { id: 'All', label: 'All Alerts' },
            { id: 'Unread', label: `Unread (${unreadCount})` },
            { id: 'academic', label: '🎓 Academics' },
            { id: 'fees', label: '💳 Fee & Dues' },
            { id: 'transport', label: '🚌 Transport' },
            { id: 'security', label: '🛡️ Security' },
            { id: 'announcement', label: '📢 Notices' },
          ].map(chip => {
            const isActive = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(chip.id as CategoryFilter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Notification List or States */}
      {loading && notifications.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateSubtitle}>Loading college notifications...</Text>
        </View>
      ) : errorMsg && notifications.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.stateEmoji}>📡</Text>
          <Text style={styles.stateTitle}>Connection Error</Text>
          <Text style={styles.stateSubtitle}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchNotifs(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerBox}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifs(true);
              }}
            />
          }
        >
          <Text style={styles.stateEmoji}>🔔</Text>
          <Text style={styles.stateTitle}>All Caught Up</Text>
          <Text style={styles.stateSubtitle}>
            {activeFilter === 'Unread'
              ? 'You have read all your campus notifications!'
              : 'No notifications found in this category.'}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifs(true);
              }}
            />
          }
        >
          {filteredNotifications.map((item, index) => {
            const id = item._id || item.id || `notif-${index}`;
            const meta = getCategoryMeta(item.category, item.type);
            const isUnread = !item.isRead;
            const isUrgent = item.priority === 'Urgent' || item.priority === 'High' || item.type === 'Error';

            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.card,
                  isUnread && styles.cardUnread,
                  isUrgent && styles.cardUrgent,
                ]}
                onPress={() => {
                  if (isUnread) handleMarkAsRead(id);
                  if (item.link && onNavigateToScreen) {
                    onNavigateToScreen(item.link);
                  }
                }}
                activeOpacity={0.75}
              >
                {/* Unread Left Border Glow Accent */}
                {isUnread && <View style={styles.unreadBar} />}

                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeCluster}>
                    <View
                      style={[
                        styles.catBadge,
                        { backgroundColor: meta.bg, borderColor: meta.border },
                      ]}
                    >
                      <Text style={styles.catEmoji}>{meta.icon}</Text>
                      <Text style={[styles.catLabel, { color: meta.text }]}>
                        {meta.label}
                      </Text>
                    </View>

                    {isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>⚡ URGENT</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.timestampRow}>
                    <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}>
                  {item.title}
                </Text>

                {/* Message Body */}
                <Text style={styles.cardMessage} numberOfLines={4}>
                  {item.message}
                </Text>

                {/* Bottom Action Footer */}
                <View style={styles.cardFooter}>
                  {isUnread ? (
                    <TouchableOpacity
                      style={styles.markReadSmallBtn}
                      onPress={() => handleMarkAsRead(id)}
                    >
                      <Text style={styles.markReadSmallText}>✓ Mark as read</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.readNoticeText}>✓ Read</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  if (isModal) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.modalBackdrop}>{content}</View>
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalContainer: {
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardUnread: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.08,
  },
  cardUrgent: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#2563EB',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  catEmoji: {
    fontSize: 12,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgentText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardTitleUnread: {
    color: '#0F172A',
    fontWeight: '800',
  },
  cardMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  markReadSmallBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  markReadSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  readNoticeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    minHeight: 300,
  },
  stateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  stateSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
