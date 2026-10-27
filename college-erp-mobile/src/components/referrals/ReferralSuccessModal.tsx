import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  referral: any;
  onClose: () => void;
  onViewSubmissions: () => void;
  onNewReferral: () => void;
}

export default function ReferralSuccessModal({
  visible,
  referral,
  onClose,
  onViewSubmissions,
  onNewReferral,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!referral) return null;

  const code = referral.referralCode || 'REF-SUCCESS';
  const category = referral.category || 'Business';
  const applicantName =
    referral.creditCardDetails?.applicantName ||
    referral.insuranceDetails?.applicantName ||
    referral.bankAccountDetails?.applicantName ||
    referral.jobDetails?.candidateName ||
    referral.formData?.applicantName ||
    'Applicant';

  const partnerName =
    referral.creditCardDetails?.bankName ||
    referral.insuranceDetails?.provider ||
    referral.bankAccountDetails?.bankName ||
    referral.jobDetails?.companyName ||
    referral.partnerName ||
    'Authorized Partner';

  const productName =
    referral.creditCardDetails?.cardProduct ||
    referral.insuranceDetails?.selectedOffering ||
    referral.bankAccountDetails?.accountProduct ||
    referral.jobDetails?.jobRole ||
    referral.productName ||
    '';

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Success Icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>

          <Text style={styles.title}>Referral Recorded!</Text>
          <Text style={styles.subtitle}>
            Your {category} referral has been verified and stored in the institutional registry with audit tracking.
          </Text>

          {/* Referral Code Box */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>OFFICIAL REFERRAL REFERENCE ID</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{code}</Text>
              <TouchableOpacity
                style={[styles.copyButton, copied && styles.copyButtonDone]}
                activeOpacity={0.7}
                onPress={handleCopy}
              >
                <Text style={[styles.copyButtonText, copied && styles.copyButtonTextDone]}>
                  {copied ? 'Copied ✓' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Summary Rows */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Applicant</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{applicantName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{category}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Partner & Product</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {partnerName}{productName ? ` • ${productName}` : ''}
              </Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{referral.status || 'Submitted'}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.8}
            onPress={onViewSubmissions}
          >
            <Text style={styles.primaryBtnText}>View in My Submissions →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            onPress={onNewReferral}
          >
            <Text style={styles.secondaryBtnText}>Submit Another Referral</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    borderWidth: 3,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
    color: '#15803D',
    fontWeight: '800',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  codeContainer: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  copyButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonDone: {
    backgroundColor: '#16A34A',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  copyButtonTextDone: {
    color: '#FFFFFF',
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
