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
  'Sick Leave',
  'Emergency Duty Leave',
  'Annual Leave',
  'Compensatory Off'
];

export default function WatchmanLeaveScreen({ user, onBack }: Props) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedType, setSelectedType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [showForm, setShowForm] = useState(false);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet<LeaveRecord[]>('leaves');
      const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      setLeaves(list);
    } catch (err: any) {
      console.warn('Failed to load leaves on mobile:', err?.message);
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
      const payload = {
        staffName: user.name || 'Security Officer',
        staffId: user.referenceId || user.userId || 'WMN-001',
        role: 'Watchman',
        department: 'Campus Security & Safety',
        dept: 'Campus Security & Safety',
        type: selectedType,
        leaveType: selectedType,
        subType: selectedType,
        startDate,
        endDate,
        reason: reason.trim(),
        description: reason.trim(),
        priority
      };

      await apiPost('leaves', payload);
      Alert.alert(
        'Leave Submitted',
        'Your leave request has been submitted and forwarded directly to Central Admin for approval.'
      );
      setReason('');
      setShowForm(false);
      fetchLeaves();
    } catch (err: any) {
      Alert.alert(
        'Submission Failed',
        err?.response?.data?.message || err?.message || 'Could not submit leave request. Please try again.'
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
          <Text style={styles.backButtonText}>← Back to Duty</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Leave Management</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      >
        {/* Metric Summary Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: '#3B82F6' }]}>
            <Text style={styles.kpiLabel}>Total</Text>
            <Text style={styles.kpiValue}>{leaves.length}</Text>
            <Text style={styles.kpiSub}>All requests</Text>
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
            <Text style={styles.formTitle}>Submit Leave Request</Text>
            <Text style={styles.formSubtitle}>
              Request duty absence from Central Administration
            </Text>

            {/* Leave Type Selector */}
            <Text style={styles.inputLabel}>Select Leave Category:</Text>
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
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>End Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Urgency Priority */}
            <Text style={styles.inputLabel}>Priority Level:</Text>
            <View style={styles.priorityRow}>
              {(['Low', 'Medium', 'High'] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, isSelected && styles.priorityBtnActive]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.priorityBtnText, isSelected && styles.priorityBtnTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reason */}
            <Text style={styles.inputLabel}>Reason / Gate Handover Details:</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="State reason for absence and substitute security guard arrangements..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleApplyLeave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>✓ Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Leave Requests History Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Leave Requests</Text>
          <TouchableOpacity onPress={fetchLeaves} activeOpacity={0.7}>
            <Text style={styles.refreshLink}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loaderText}>Loading leave applications...</Text>
          </View>
        ) : leaves.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
            <Text style={styles.emptyTitle}>No Leave Applications</Text>
            <Text style={styles.emptySub}>
              Tap "+ Apply" above to request leave from Central Admin.
            </Text>
          </View>
        ) : (
          leaves.map((l) => {
            const status = l.status || 'Pending';
            const isApproved = status === 'Approved';
            const isRejected = status === 'Rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <View key={l.id || l._id} style={styles.leaveCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardType}>{l.type || l.leaveType || 'Casual Leave'}</Text>
                    <Text style={styles.cardDates}>
                      📅 {l.startDate} to {l.endDate} {l.daysCount ? `(${l.daysCount} days)` : ''}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  {isApproved ? (
                    <View style={[styles.badge, styles.badgeApproved]}>
                      <Text style={[styles.badgeText, styles.badgeTextApproved]}>✓ Approved</Text>
                    </View>
                  ) : isRejected ? (
                    <View style={[styles.badge, styles.badgeRejected]}>
                      <Text style={[styles.badgeText, styles.badgeTextRejected]}>✕ Rejected</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, styles.badgePending]}>
                      <Text style={[styles.badgeText, styles.badgeTextPending]}>⏳ Pending Admin</Text>
                    </View>
                  )}
                </View>

                {/* Reason description */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>{l.reason || l.description || 'No explanation provided.'}</Text>
                  {isRejected && l.rejectionReason && (
                    <Text style={styles.rejectionText}>Reason: {l.rejectionReason}</Text>
                  )}
                  {isApproved && l.approvedBy && (
                    <Text style={styles.approvedText}>Approved by: {l.approvedBy}</Text>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>Submitted: {l.createdAt || l.startDate}</Text>
                  <Text style={styles.footerText}>Priority: {l.priority || 'Medium'}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
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
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  newBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
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
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#64748B',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
  },
  typeScroll: {
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  typePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  typePillTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  priorityBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  priorityBtnTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  loaderBox: {
    padding: 30,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  leaveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardType: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDates: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeApproved: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeTextApproved: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeTextRejected: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeTextPending: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reasonBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  rejectionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 4,
  },
  approvedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  footerText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
