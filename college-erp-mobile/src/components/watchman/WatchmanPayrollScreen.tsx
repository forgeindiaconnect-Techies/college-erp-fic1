import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, type MobileUser } from '../../services/api';

type Props = {
  user: MobileUser;
  onBack: () => void;
};

type SalaryRecord = {
  _id?: string;
  staffId: string;
  staffName?: string;
  designation?: string;
  department?: string;
  billingMonth: string;
  basicPay: number;
  hra?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  workingDays?: number;
  presentDays?: number;
  deductions?: number;
  netSalary: number;
  paymentDate?: string;
  paymentMode?: string;
  status: 'Pending' | 'Disbursed';
  collegeId?: string;
};

export default function WatchmanPayrollScreen({ user, onBack }: Props) {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<SalaryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet<SalaryRecord[]>('salaries/my');
      const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      setSalaries(list);
      if (list.length > 0 && !selectedSlip) {
        setSelectedSlip(list[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load watchman payroll on mobile:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSlip]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayroll();
  };

  return (
    <View style={styles.container}>
      {/* Sub-header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Duty</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Security Payroll & Slips</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loaderText}>Loading verified payroll records...</Text>
          </View>
        ) : salaries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>💳</Text>
            <Text style={styles.emptyTitle}>No Payroll Slips Processed</Text>
            <Text style={styles.emptySub}>
              Your monthly compensation slips will appear here once cleared by Central Accounts.
            </Text>
          </View>
        ) : (
          <>
            {/* Pay Month Selector Pills */}
            <Text style={styles.sectionHeading}>Disbursement Cycles:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cycleScroll}>
              {salaries.map((s) => {
                const isSelected = selectedSlip?._id === s._id || selectedSlip?.billingMonth === s.billingMonth;
                const isDisbursed = s.status === 'Disbursed';
                return (
                  <TouchableOpacity
                    key={s._id || s.billingMonth}
                    style={[styles.cyclePill, isSelected && styles.cyclePillActive]}
                    onPress={() => setSelectedSlip(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cyclePillMonth, isSelected && styles.cyclePillMonthActive]}>
                      {s.billingMonth}
                    </Text>
                    <View style={styles.pillStatusRow}>
                      <Text style={[styles.cyclePillAmount, isSelected && styles.cyclePillAmountActive]}>
                        ₹{Number(s.netSalary || 0).toLocaleString()}
                      </Text>
                      <View style={[styles.miniDot, { backgroundColor: isDisbursed ? '#16A34A' : '#D97706' }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected Detailed Payslip Card */}
            {selectedSlip && (
              <View style={styles.slipCard}>
                {/* Header */}
                <View style={styles.slipHeader}>
                  <Text style={styles.instTitle}>CAMPUS ERP INSTITUTION</Text>
                  <Text style={styles.slipDocTitle}>OFFICIAL SALARY DISBURSEMENT STATEMENT</Text>
                  <View style={styles.periodBadge}>
                    <Text style={styles.periodBadgeText}>Pay Period: {selectedSlip.billingMonth}</Text>
                  </View>
                </View>

                {/* Employee Particulars Grid */}
                <View style={styles.particularsGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>EMPLOYEE NAME</Text>
                    <Text style={styles.gridVal}>{selectedSlip.staffName || user.name || 'Ramesh Kumar'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>BADGE / ID</Text>
                    <Text style={styles.gridVal}>{selectedSlip.staffId || user.referenceId || 'WMN-001'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>DESIGNATION</Text>
                    <Text style={styles.gridVal}>{selectedSlip.designation || 'Chief Security Watchman'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>DEPARTMENT</Text>
                    <Text style={styles.gridVal}>{selectedSlip.department || 'Campus Security & Safety'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>WORKING / PRESENT</Text>
                    <Text style={styles.gridVal}>{selectedSlip.workingDays || 30} / {selectedSlip.presentDays || 30} Days</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>PAYMENT MODE</Text>
                    <Text style={[styles.gridVal, { color: '#059669' }]}>{selectedSlip.paymentMode || 'Bank Transfer (NEFT)'}</Text>
                  </View>
                </View>

                {/* Net Salary Highlight Box */}
                <View style={styles.netSalaryBanner}>
                  <View>
                    <Text style={styles.netLabel}>NET DISBURSED AMOUNT</Text>
                    <Text style={styles.netAmount}>₹{Number(selectedSlip.netSalary || 0).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.disbursedTag, selectedSlip.status === 'Disbursed' ? styles.tagGreen : styles.tagAmber]}>
                    <Text style={[styles.disbursedTagText, selectedSlip.status === 'Disbursed' ? styles.tagTextGreen : styles.tagTextAmber]}>
                      {selectedSlip.status === 'Disbursed' ? '✓ Disbursed' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>

                {/* Earnings Breakdown */}
                <Text style={styles.breakdownHeader}>Earnings</Text>
                <View style={styles.breakdownTable}>
                  <View style={styles.tableRow}>
                    <Text style={styles.rowLabel}>Basic Pay</Text>
                    <Text style={styles.rowValue}>₹{Number(selectedSlip.basicPay || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.rowLabel}>House Rent Allowance (HRA)</Text>
                    <Text style={styles.rowValue}>₹{Number(selectedSlip.hra || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.rowLabel}>Medical Allowance</Text>
                    <Text style={styles.rowValue}>₹{Number(selectedSlip.medicalAllowance || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.rowLabel}>Special / Duty Allowance</Text>
                    <Text style={styles.rowValue}>₹{Number(selectedSlip.specialAllowance || 0).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Deductions Breakdown */}
                <Text style={[styles.breakdownHeader, { marginTop: 14, color: '#DC2626' }]}>Deductions</Text>
                <View style={styles.breakdownTable}>
                  <View style={styles.tableRow}>
                    <Text style={styles.rowLabel}>Provident Fund & ESI</Text>
                    <Text style={[styles.rowValue, { color: '#DC2626' }]}>₹{Number(selectedSlip.deductions || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.rowLabel}>Loss of Pay / Absence</Text>
                    <Text style={[styles.rowValue, { color: '#DC2626' }]}>₹0</Text>
                  </View>
                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.rowLabel, { fontWeight: '800' }]}>Total Deductions</Text>
                    <Text style={[styles.rowValue, { fontWeight: '800', color: '#DC2626' }]}>
                      ₹{Number(selectedSlip.deductions || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Footer security note */}
                <View style={styles.slipFooter}>
                  <Text style={styles.securityNote}>
                    🔒 Official verified payroll record from Central HR & Accounts. Confidential.
                  </Text>
                  {selectedSlip.paymentDate && (
                    <Text style={styles.dateNote}>
                      Disbursement Date: {new Date(selectedSlip.paymentDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </>
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
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cycleScroll: {
    marginBottom: 16,
  },
  cyclePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 10,
    minWidth: 120,
  },
  cyclePillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 2,
  },
  cyclePillMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  cyclePillMonthActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  pillStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cyclePillAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  cyclePillAmountActive: {
    color: '#047857',
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  slipHeader: {
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  instTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  slipDocTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  periodBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  particularsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridItem: {
    width: '50%',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  gridVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  netSalaryBanner: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  netLabel: {
    fontSize: 10,
    color: '#D1FAE5',
    fontWeight: '800',
  },
  netAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  disbursedTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagGreen: {
    backgroundColor: '#DCFCE7',
  },
  tagTextGreen: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  tagAmber: {
    backgroundColor: '#FEF3C7',
  },
  tagTextAmber: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  breakdownHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  breakdownTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLabel: {
    fontSize: 12,
    color: '#475569',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  slipFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  securityNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  dateNote: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
});
