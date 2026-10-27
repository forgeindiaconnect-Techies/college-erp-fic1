import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiPost } from '../../services/api';

interface Props {
  visible: boolean;
  item: any;
  onClose: () => void;
  onSuccess: (updatedReferral?: any) => void;
}

const PAYMENT_MODES = [
  { id: 'Bank Transfer', label: 'Bank Transfer (NEFT / RTGS)' },
  { id: 'UPI', label: 'UPI Payment' },
  { id: 'IMPS', label: 'IMPS Immediate' },
  { id: 'Cheque', label: 'Cheque' },
  { id: 'Cash', label: 'Cash Voucher' },
];

export default function IncentivePayoutModal({ visible, item, onClose, onSuccess }: Props) {
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [txnRef, setTxnRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setTxnRef(`UTR${Date.now().toString().slice(-8)}`);
      setNotes(`Incentive settlement for ${item.referralCode || 'Referral'} (${item.category || 'General'})`);
      setPaymentMode('Bank Transfer');
    }
  }, [visible, item]);

  if (!item) return null;

  const amount = item.incentiveAmount || 500;
  const submitter = item.submitterName || 'Referrer';
  const category = item.category || 'Referral';
  const code = item.referralCode || 'REF-CODE';

  const handleConfirmPayout = async () => {
    if (!txnRef.trim()) {
      Alert.alert('Required Field', 'Transaction UTR / Reference number is mandatory.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiPost<any>('referrals/incentives/payout', {
        referralId: item._id,
        incentiveIds: item.incentiveRecord ? [item.incentiveRecord] : [],
        paymentMode,
        transactionReference: txnRef.trim(),
        notes: notes.trim(),
      });

      if (res?.success === false) {
        Alert.alert('Payout Notice', res.message || 'Unable to disburse payout.');
      } else {
        Alert.alert(
          '✓ Payout Disbursed',
          res?.message || `Payout of ₹${amount.toLocaleString('en-IN')} has been settled successfully.`
        );
        onSuccess({
          ...item,
          incentiveStatus: 'Paid',
          status: item.status,
          payoutTransactionRef: txnRef.trim(),
          payoutDate: new Date().toISOString(),
        });
        onClose();
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to process payout.';
      Alert.alert('Payout Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTag}>INSTITUTIONAL SETTLEMENT</Text>
              <Text style={styles.title}>Process Incentive Payout</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Payout Summary Box */}
            <View style={styles.summaryCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.summaryLabel}>ELIGIBLE PAYOUT REWARD</Text>
                  <Text style={styles.summarySubmitter} numberOfLines={1}>{submitter}</Text>
                  <Text style={styles.summaryCategory}>{category} • Code: {code}</Text>
                </View>
                <View style={styles.amountPill}>
                  <Text style={styles.amountText}>₹{amount.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>

            {/* Payment Mode Selector */}
            <Text style={styles.inputLabel}>Payment Mode *</Text>
            <View style={styles.modesGrid}>
              {PAYMENT_MODES.map((itemMode) => {
                const isSelected = paymentMode === itemMode.id;
                return (
                  <TouchableOpacity
                    key={itemMode.id}
                    style={[styles.modePill, isSelected && styles.modePillActive]}
                    onPress={() => setPaymentMode(itemMode.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modePillText, isSelected && styles.modePillTextActive]}>
                      {isSelected ? '✓ ' : ''}{itemMode.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Transaction Reference / UTR */}
            <Text style={styles.inputLabel}>Transaction Reference / UTR Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. UTR8912301948 or UPI Ref"
              placeholderTextColor="#94A3B8"
              value={txnRef}
              onChangeText={setTxnRef}
              autoCapitalize="characters"
            />

            {/* Disbursement Notes */}
            <Text style={styles.inputLabel}>Disbursement Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
              placeholder="Audit remarks for institutional accounts ledger..."
              placeholderTextColor="#94A3B8"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                onPress={handleConfirmPayout}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm & Settle ₹{amount.toLocaleString('en-IN')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
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
    color: '#64748B',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.8,
  },
  summarySubmitter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 2,
  },
  summaryCategory: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    fontWeight: '600',
  },
  amountPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modePillTextActive: {
    color: '#1D4ED8',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
