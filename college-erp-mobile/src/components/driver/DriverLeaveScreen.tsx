import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, apiPost, type MobileUser } from '../../services/api';

type Props = {
  user: MobileUser;
  onBack: () => void;
};

type LeaveRecord = {
  id: string;
  _id?: string;
  type: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  daysCount?: number;
  reason?: string;
  description?: string;
  status: string;
  createdAt?: string;
  rejectionReason?: string;
  approvedBy?: string;
  priority?: string;
};

const LEAVE_TYPES = [
  'Casual Leave',
  'Medical / Sick Leave',
  'Route Reliever Duty Leave',
  'Annual Leave',
  'Emergency Family Leave',
  'Compensatory Off',
];

export default function DriverLeaveScreen({ user, onBack }: Props) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedType, setSelectedType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [backupDriver, setBackupDriver] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [showForm, setShowForm] = useState(false);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet<LeaveRecord[]>('leaves');
      const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      setLeaves(list);
    } catch (err: any) {
      console.warn('Failed to load driver leaves on mobile:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  const handleApplyLeave = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide an explanation for your leave request.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert('Invalid Date Range', 'Start date cannot be after end date.');
      return;
    }

    try {
      setSubmitting(true);
      const fullReason = backupDriver.trim()
        ? `${reason.trim()} [Reliever/Backup Driver: ${backupDriver.trim()}]`
        : reason.trim();

      const payload = {
        staffName: user.name || 'Campus Transit Driver',
        staffId: user.referenceId || user.userId || 'DRV-001',
        role: 'Driver',
        department: 'Campus Transport & Fleet',
        dept: 'Campus Transport & Fleet',
        type: selectedType,
        leaveType: selectedType,
        subType: selectedType,
        startDate,
        endDate,
        reason: fullReason,
        description: fullReason,
        priority,
      };

      await apiPost('leaves', payload);
      Alert.alert(
        'Leave Submitted',
        'Your leave request has been submitted and forwarded directly to Central Administration for approval.'
      );
      setReason('');
      setBackupDriver('');
      setShowForm(false);
      fetchLeaves();
    } catch (err: any) {
      Alert.alert(
        'Submission Failed',
        err?.response?.data?.message || err?.message || 'Could not submit leave request. Please check if you already have a pending leave request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = leaves.filter(l => (l.status || '').toLowerCase().includes('pending')).length;
  const approvedCount = leaves.filter(l => (l.status || '').toLowerCase() === 'approved').length;

  return (
    <View style={styles.container}>
      {/* Sub-header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Fleet</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Driver Leave Portal</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowForm(!showForm)}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>{showForm ? '✕ Close' : '+ Apply'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
      >
        {/* Metric Summary Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: '#1E3A8A' }]}>
            <Text style={styles.kpiLabel}>Total</Text>
            <Text style={styles.kpiValue}>{leaves.length}</Text>
            <Text style={styles.kpiSub}>Applications</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={[styles.kpiLabel, { color: '#D97706' }]}>Pending</Text>
            <Text style={[styles.kpiValue, { color: '#B45309' }]}>{pendingCount}</Text>
            <Text style={styles.kpiSub}>Awaiting Admin</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#10B981' }]}>
            <Text style={[styles.kpiLabel, { color: '#16A34A' }]}>Approved</Text>
            <Text style={[styles.kpiValue, { color: '#15803D' }]}>{approvedCount}</Text>
            <Text style={styles.kpiSub}>Sanctioned</Text>
          </View>
        </View>

        {/* Collapsible Apply Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>🚌 Apply for Driver Leave</Text>
            <Text style={styles.formSubtitle}>
              Direct transit absence sanction from Central Admin
            </Text>

            {/* Leave Type Selector */}
            <Text style={styles.inputLabel}>Leave Classification:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {LEAVE_TYPES.map((t) => {
                const isSelected = selectedType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, isSelected && styles.typePillActive]}
                    onPress={() => setSelectedType(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typePillText, isSelected && styles.typePillTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Date Inputs */}
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-10-30"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.inputLabel}>End Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-10-31"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Route Reliever / Substitute Driver */}
            <Text style={styles.inputLabel}>Route Substitute Driver (Optional):</Text>
            <TextInput
              style={styles.textInput}
              value={backupDriver}
              onChangeText={setBackupDriver}
              placeholder="e.g. Reliever Murugan (Bus R-02)"
              placeholderTextColor="#94A3B8"
            />

            {/* Priority Picker */}
            <Text style={styles.inputLabel}>Urgency Priority:</Text>
            <View style={styles.priorityRow}>
              {(['Low', 'Medium', 'High'] as const).map((p) => {
                const isSelected = priority === p;
                let activeBg = '#1E3A8A';
                if (p === 'High') activeBg = '#DC2626';
                if (p === 'Medium') activeBg = '#D97706';

                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityBtn,
                      isSelected && { backgroundColor: activeBg, borderColor: activeBg },
                    ]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.priorityBtnText, isSelected && styles.priorityBtnTextActive]}>
                      {p === 'High' ? '🔥 High' : p === 'Medium' ? '⚡ Medium' : '🌱 Low'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reason Input */}
            <Text style={styles.inputLabel}>Reason / Remarks:</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
              placeholder="Detail your leave request reason and any handover notes..."
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleApplyLeave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Leave Application</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Leave Requests History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Leave History & Tracking</Text>
          <Text style={styles.sectionSubtitle}>
            Live synchronization with Central Admin approval decisions
          </Text>

          {loading && leaves.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#1E3A8A" size="large" />
              <Text style={styles.emptyStateText}>Loading leave requests...</Text>
            </View>
          ) : leaves.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyStateTitle}>No Leave Applications</Text>
              <Text style={styles.emptyStateText}>
                You have not filed any leave requests yet. Tap "+ Apply" above to submit one.
              </Text>
            </View>
          ) : (
            leaves.map((l, index) => {
              const statusLower = (l.status || '').toLowerCase();
              const isApproved = statusLower === 'approved';
              const isRejected = statusLower === 'rejected';
              const isPending = !isApproved && !isRejected;

              let badgeBg = '#FEF3C7';
              let badgeColor = '#D97706';
              let badgeText = l.status || 'Pending Admin Approval';

              if (isApproved) {
                badgeBg = '#DCFCE7';
                badgeColor = '#15803D';
              } else if (isRejected) {
                badgeBg = '#FEE2E2';
                badgeColor = '#DC2626';
              }

              return (
                <View key={l.id || l._id || index} style={styles.leaveCard}>
                  <View style={styles.leaveCardHeader}>
                    <View style={styles.leaveTitleBlock}>
                      <Text style={styles.leaveType}>{l.type || l.leaveType || 'General Leave'}</Text>
                      <Text style={styles.leaveSubDate}>
                        Submitted: {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Recent'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                        {badgeText}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.leaveDetailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Duration Period</Text>
                      <Text style={styles.detailValue}>
                        {l.startDate} → {l.endDate}
                      </Text>
                    </View>
                    {l.priority && (
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Priority</Text>
                        <Text style={[styles.detailValue, { fontWeight: '700' }]}>{l.priority}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Explanation:</Text>
                    <Text style={styles.reasonText}>{l.reason || l.description || 'No reason provided.'}</Text>
                  </View>

                  {isRejected && l.rejectionReason && (
                    <View style={styles.rejectionBox}>
                      <Text style={styles.rejectionLabel}>Admin Decision Remark:</Text>
                      <Text style={styles.rejectionText}>{l.rejectionReason}</Text>
                    </View>
                  )}

                  {isApproved && (
                    <View style={styles.approvedBox}>
                      <Text style={styles.approvedText}>
                        ✓ Sanctioned by Central Administration {l.approvedBy ? `(${l.approvedBy})` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  newBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  typeScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  typePillTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateCol: {
    flex: 1,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  priorityBtnTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  historySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  leaveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  leaveTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  leaveType: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  leaveSubDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  leaveDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  reasonBox: {
    marginBottom: 6,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  reasonText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
  rejectionBox: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 6,
  },
  rejectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  rejectionText: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  approvedBox: {
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginTop: 6,
  },
  approvedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  emptyStateText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
