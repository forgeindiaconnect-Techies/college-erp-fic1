import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiPatch, type MobileUser } from '../../services/api';
import ModalSelect from './ModalSelect';

interface Props {
  visible: boolean;
  item: any;
  user: MobileUser;
  onClose: () => void;
  onOpenPayout?: (item: any) => void;
  onStatusUpdated?: () => void;
}

const CATEGORY_STATUS_OPTIONS: Record<string, string[]> = {
  'Credit Card': [
    'Submitted',
    'Under Review',
    'Document Verification',
    'Approved',
    'Card Issued',
    'Rejected',
    'Cancelled',
  ],
  'Insurance': [
    'Submitted',
    'Under Review',
    'Medical Evaluation',
    'Approved',
    'Policy Issued',
    'Rejected',
    'Cancelled',
  ],
  'Bank Account': [
    'Submitted',
    'Under Review',
    'KYC Pending',
    'KYC Verified',
    'Account Activated',
    'Rejected',
    'Cancelled',
  ],
  'Job': [
    'Submitted',
    'Under Review',
    'Interview Round 1',
    'Interview Round 2',
    'Selected',
    'Joined',
    'Rejected',
    'Cancelled',
  ],
};

export default function ReferralDetailModal({
  visible,
  item,
  user,
  onClose,
  onOpenPayout,
  onStatusUpdated,
}: Props) {
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [refNumberInput, setRefNumberInput] = useState('');
  const [showAdminControls, setShowAdminControls] = useState(false);

  if (!item) return null;

  const isApprovedIncentive =
    item.incentiveStatus === 'Approved' ||
    (item.incentiveAmount > 0 &&
      ['Approved', 'Account Opened', 'Policy Issued', 'Joined', 'Completed', 'Card Issued', 'Activated'].includes(item.status) &&
      item.incentiveStatus !== 'Paid') ||
    item.status === 'Account Opened' ||
    item.status === 'Policy Issued' ||
    item.status === 'Card Issued' ||
    item.status === 'Joined';

  const isPaidIncentive = item.incentiveStatus === 'Paid';
  const rewardAmount = item.incentiveAmount || 500;

  const isAdminRole = [
    'admin',
    'super admin',
    'sub admin',
    'principal',
    'accounts',
  ].includes((user.role || '').toLowerCase().trim());

  const category = item.category || 'Credit Card';
  const statusOptions = CATEGORY_STATUS_OPTIONS[category] || [
    'Submitted',
    'Under Review',
    'Approved',
    'Rejected',
  ];

  const applicantName =
    item.creditCardDetails?.applicantName ||
    item.insuranceDetails?.applicantName ||
    item.bankAccountDetails?.applicantName ||
    item.jobDetails?.candidateName ||
    item.formData?.applicantName ||
    item.formData?.candidateName ||
    'Applicant';

  const applicantPhone =
    item.creditCardDetails?.applicantPhone ||
    item.insuranceDetails?.applicantPhone ||
    item.bankAccountDetails?.applicantPhone ||
    item.jobDetails?.candidatePhone ||
    item.formData?.applicantPhone ||
    '';

  const applicantEmail =
    item.creditCardDetails?.applicantEmail ||
    item.insuranceDetails?.applicantEmail ||
    item.bankAccountDetails?.applicantEmail ||
    item.jobDetails?.candidateEmail ||
    item.formData?.applicantEmail ||
    '';

  const city =
    item.creditCardDetails?.city ||
    item.insuranceDetails?.applicantCity ||
    item.bankAccountDetails?.city ||
    item.jobDetails?.candidateCity ||
    item.formData?.city ||
    '';

  const partner =
    item.creditCardDetails?.bankName ||
    item.insuranceDetails?.provider ||
    item.bankAccountDetails?.bankName ||
    item.jobDetails?.companyName ||
    item.partnerName ||
    '';

  const product =
    item.creditCardDetails?.cardProduct ||
    item.insuranceDetails?.selectedOffering ||
    item.bankAccountDetails?.accountProduct ||
    item.jobDetails?.jobRole ||
    item.productName ||
    '';

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      Alert.alert('Selection Required', 'Please select a status to update.');
      return;
    }

    try {
      setUpdating(true);
      const body: any = {
        status: selectedStatus,
        remarks: remarks.trim() || undefined,
        reason: (selectedStatus === 'Rejected' || selectedStatus === 'Cancelled') ? (remarks.trim() || 'Criteria not met') : undefined,
      };

      if (category === 'Insurance' && refNumberInput.trim()) {
        body.policyNumber = refNumberInput.trim();
      } else if (category === 'Credit Card' && refNumberInput.trim()) {
        body.applicationNumber = refNumberInput.trim();
      } else if (category === 'Bank Account' && refNumberInput.trim()) {
        body.accountNumberMasked = refNumberInput.trim();
      } else if (category === 'Job' && refNumberInput.trim()) {
        body.jobReferenceId = refNumberInput.trim();
      }

      await apiPatch(`referrals/${item._id}/status`, body);
      Alert.alert('Status Updated', `Referral status has been updated to "${selectedStatus}".`);
      setShowAdminControls(false);
      setRemarks('');
      setRefNumberInput('');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusStyle = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('approved') || s.includes('issued') || s.includes('joined') || s.includes('activated') || s.includes('success')) {
      return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
    }
    if (s.includes('reject') || s.includes('cancel')) {
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
    }
    if (s.includes('review') || s.includes('progress') || s.includes('interview') || s.includes('kyc') || s.includes('evaluat')) {
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
    }
    return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
  };

  const statusStyle = getStatusStyle(item.status);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={styles.categoryBadge}>{category}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {item.status || 'Submitted'}
                  </Text>
                </View>
              </View>
              <Text style={styles.referralCode} numberOfLines={1}>
                {item.referralCode}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Incentive Settlement & Payout Action Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isApprovedIncentive ? '#ECFDF5' : '#F8FAFC',
                  borderColor: isApprovedIncentive ? '#86EFAC' : '#E2E8F0',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={[styles.cardTitle, { color: isApprovedIncentive ? '#065F46' : '#0F172A', marginBottom: 2 }]}>
                    🎁 Incentive Settlement
                  </Text>
                  <Text style={{ fontSize: 11, color: isApprovedIncentive ? '#047857' : '#64748B' }}>
                    Status: <Text style={{ fontWeight: '800' }}>{item.incentiveStatus || (isApprovedIncentive ? 'Approved' : 'Pending')}</Text>
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isPaidIncentive ? '#EFF6FF' : isApprovedIncentive ? '#059669' : '#E2E8F0',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '900',
                      color: isPaidIncentive ? '#1D4ED8' : isApprovedIncentive ? '#FFFFFF' : '#334155',
                    }}
                  >
                    ₹{rewardAmount}
                  </Text>
                </View>
              </View>

              {isApprovedIncentive && !isPaidIncentive && (
                <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#A7F3D0' }}>
                  <Text style={{ fontSize: 12, color: '#047857', marginBottom: 10, lineHeight: 17 }}>
                    ✓ <Text style={{ fontWeight: '800' }}>Incentive Approved:</Text> Eligible for institutional payout disbursement.
                  </Text>
                  <TouchableOpacity
                    style={styles.detailPayBtn}
                    onPress={() => {
                      onClose();
                      if (onOpenPayout) onOpenPayout(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.detailPayBtnText}>💵 Pay Now (₹{rewardAmount})</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isPaidIncentive && (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#CBD5E1' }}>
                  <Text style={{ fontSize: 12, color: '#059669', fontWeight: '700' }}>
                    ✓ Payout Settled & Disbursed to Referrer.
                  </Text>
                  {item.payoutTransactionRef ? (
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Transaction UTR: {item.payoutTransactionRef}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>

            {/* Applicant Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Applicant Information</Text>
              <View style={styles.row}>
                <Text style={styles.key}>Name</Text>
                <Text style={styles.val}>{applicantName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.key}>Phone</Text>
                <Text style={styles.val}>{applicantPhone || 'N/A'}</Text>
              </View>
              {applicantEmail ? (
                <View style={styles.row}>
                  <Text style={styles.key}>Email</Text>
                  <Text style={styles.val}>{applicantEmail}</Text>
                </View>
              ) : null}
              {city ? (
                <View style={styles.row}>
                  <Text style={styles.key}>Location</Text>
                  <Text style={styles.val}>{city}</Text>
                </View>
              ) : null}
            </View>

            {/* Product / Opportunity Details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Product & Partner Details</Text>
              <View style={styles.row}>
                <Text style={styles.key}>Partner</Text>
                <Text style={[styles.val, { color: '#2563EB', fontWeight: '800' }]}>{partner || 'Partner'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.key}>Product / Role</Text>
                <Text style={styles.val}>{product || 'Product Variant'}</Text>
              </View>

              {category === 'Credit Card' && (
                <>
                  {item.creditCardDetails?.employmentType ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Employment</Text>
                      <Text style={styles.val}>{item.creditCardDetails.employmentType}</Text>
                    </View>
                  ) : null}
                  {item.creditCardDetails?.monthlyIncome ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Monthly Income</Text>
                      <Text style={styles.val}>{item.creditCardDetails.monthlyIncome}</Text>
                    </View>
                  ) : null}
                  {item.creditCardDetails?.applicationNumber ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Application #</Text>
                      <Text style={styles.val}>{item.creditCardDetails.applicationNumber}</Text>
                    </View>
                  ) : null}
                </>
              )}

              {category === 'Insurance' && (
                <>
                  {item.insuranceDetails?.insuranceCategory ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Coverage Type</Text>
                      <Text style={styles.val}>{item.insuranceDetails.insuranceCategory} Insurance</Text>
                    </View>
                  ) : null}
                  {item.insuranceDetails?.sumInsuredTier ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Sum Insured Tier</Text>
                      <Text style={styles.val}>{item.insuranceDetails.sumInsuredTier}</Text>
                    </View>
                  ) : null}
                  {item.insuranceDetails?.policyNumber ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Policy #</Text>
                      <Text style={[styles.val, { color: '#15803D' }]}>{item.insuranceDetails.policyNumber}</Text>
                    </View>
                  ) : null}
                </>
              )}

              {category === 'Job' && (
                <>
                  {item.jobDetails?.sector ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Sector</Text>
                      <Text style={styles.val}>{item.jobDetails.sector}</Text>
                    </View>
                  ) : null}
                  {item.jobDetails?.jobReferenceId ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Requisition ID</Text>
                      <Text style={styles.val}>{item.jobDetails.jobReferenceId}</Text>
                    </View>
                  ) : null}
                  {item.jobDetails?.highestQualification ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Qualification</Text>
                      <Text style={styles.val}>{item.jobDetails.highestQualification}</Text>
                    </View>
                  ) : null}
                  {item.jobDetails?.experienceLevel ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Experience</Text>
                      <Text style={styles.val}>{item.jobDetails.experienceLevel}</Text>
                    </View>
                  ) : null}
                </>
              )}

              {category === 'Bank Account' && (
                <>
                  {item.bankAccountDetails?.accountType ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Account Type</Text>
                      <Text style={styles.val}>{item.bankAccountDetails.accountType}</Text>
                    </View>
                  ) : null}
                  {item.bankAccountDetails?.applicantType ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Applicant Type</Text>
                      <Text style={styles.val}>{item.bankAccountDetails.applicantType}</Text>
                    </View>
                  ) : null}
                  {item.bankAccountDetails?.accountNumberMasked ? (
                    <View style={styles.row}>
                      <Text style={styles.key}>Masked Account #</Text>
                      <Text style={[styles.val, { color: '#15803D' }]}>{item.bankAccountDetails.accountNumberMasked}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            {/* Submission Audit Metadata */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Submission Metadata</Text>
              <View style={styles.row}>
                <Text style={styles.key}>Submitted By</Text>
                <Text style={styles.val}>{item.submitterName || 'Self'} ({item.submitterRole || user.role})</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.key}>Submission Date</Text>
                <Text style={styles.val}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'N/A'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.key}>Consent Verified</Text>
                <Text style={[styles.val, { color: '#15803D' }]}>
                  ✓ Confirmed (
                  {item.creditCardDetails?.consentNoticeVersion ||
                    item.insuranceDetails?.consentNoticeVersion ||
                    item.jobDetails?.consentNoticeVersion ||
                    item.bankAccountDetails?.consentNoticeVersion ||
                    'Standard DPDP'}
                  )
                </Text>
              </View>
            </View>

            {/* Status History Audit Trail */}
            {Array.isArray(item.statusHistory) && item.statusHistory.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Status Audit Trail</Text>
                {item.statusHistory.map((h: any, idx: number) => (
                  <View key={idx} style={styles.historyRow}>
                    <View style={styles.historyDot} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.historyStatus}>{h.status}</Text>
                        <Text style={styles.historyDate}>
                          {h.timestamp ? new Date(h.timestamp).toLocaleDateString() : ''}
                        </Text>
                      </View>
                      <Text style={styles.historyBy}>
                        Updated by: {h.updatedBy || 'System'} ({h.role || 'Admin'})
                      </Text>
                      {h.remarks ? <Text style={styles.historyRemarks}>"{h.remarks}"</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Admin Review Action Section (For Authorized Admins) */}
            {isAdminRole && (
              <View style={[styles.card, { borderColor: '#BFDBFE', backgroundColor: '#F0F9FF' }]}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  activeOpacity={0.7}
                  onPress={() => setShowAdminControls(!showAdminControls)}
                >
                  <View>
                    <Text style={[styles.cardTitle, { color: '#1E40AF', marginBottom: 2 }]}>
                      ⚖️ Admin Review & Status Management
                    </Text>
                    <Text style={{ fontSize: 11, color: '#3B82F6' }}>
                      Authorize status transitions, verify milestones, or release rewards
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#1E40AF', fontWeight: '800' }}>
                    {showAdminControls ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {showAdminControls && (
                  <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#DBEAFE', paddingTop: 12 }}>
                    <ModalSelect
                      label="Select New Status"
                      value={selectedStatus || item.status}
                      options={statusOptions}
                      onSelect={setSelectedStatus}
                    />

                    <View style={styles.adminInputGroup}>
                      <Text style={styles.adminInputLabel}>
                        {category === 'Insurance'
                          ? 'Policy Number (Optional)'
                          : category === 'Credit Card'
                          ? 'Bank Application ID (Optional)'
                          : category === 'Bank Account'
                          ? 'Masked Account # (Optional)'
                          : 'Job Reference / Offer ID (Optional)'}
                      </Text>
                      <TextInput
                        style={styles.adminInput}
                        placeholder="Enter official partner tracking number..."
                        placeholderTextColor="#94A3B8"
                        value={refNumberInput}
                        onChangeText={setRefNumberInput}
                      />
                    </View>

                    <View style={styles.adminInputGroup}>
                      <Text style={styles.adminInputLabel}>Admin Remarks / Audit Note</Text>
                      <TextInput
                        style={[styles.adminInput, { minHeight: 60, textAlignVertical: 'top' }]}
                        placeholder="Add reason for approval, rejection, or current status..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        value={remarks}
                        onChangeText={setRemarks}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.adminSubmitBtn, updating && { opacity: 0.7 }]}
                      activeOpacity={0.8}
                      onPress={handleUpdateStatus}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.adminSubmitBtnText}>Commit Status Change ✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  referralCode: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  key: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  val: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 12,
    marginLeft: 6,
    marginBottom: 6,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    position: 'absolute',
    left: -5,
    top: 6,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  historyBy: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  historyRemarks: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    marginTop: 2,
  },
  adminInputGroup: {
    marginBottom: 12,
  },
  adminInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  adminInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  adminSubmitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  adminSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailPayBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  detailPayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
