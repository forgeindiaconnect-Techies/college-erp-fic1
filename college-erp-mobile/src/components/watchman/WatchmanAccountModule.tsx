import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiPost, type MobileUser } from '../../services/api';

type Props = {
  user: MobileUser;
  assignedGate: string;
  onGateChange: (gate: string) => void;
  onLogout: () => void;
  onOpenReferrals?: () => void;
  onNavigateLeaves?: () => void;
  onNavigatePayroll?: () => void;
};

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)',
];

export default function WatchmanAccountModule({
  user,
  assignedGate,
  onGateChange,
  onLogout,
  onOpenReferrals,
  onNavigateLeaves,
  onNavigatePayroll,
}: Props) {
  const [gateModalVisible, setGateModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert('Required', 'Please fill in current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }
    try {
      setSubmittingPassword(true);
      await apiPost('watchman/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Password update request processed.');
      setPasswordModalVisible(false);
    } finally {
      setSubmittingPassword(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Security Officer Sign Out',
      'Are you sure you want to log out of Watchman Gate Command?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Officer Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 32 }}>🛡️</Text>
          </View>
          <Text style={styles.officerName}>{user.name || 'Security Officer'}</Text>
          <Text style={styles.officerRole}>CAMPUS SECURITY PERSONNEL</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badgeTag}>
              <Text style={styles.badgeTagText}>Badge: {user.userId || user.referenceId || 'WMN-001'}</Text>
            </View>
            <View style={[styles.badgeTag, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.badgeTagText, { color: '#15803D' }]}>● Shift Active</Text>
            </View>
          </View>
        </View>

        {/* Gate Duty Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Gate Duty Assignment</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Gate:</Text>
            <Text style={styles.infoVal}>{assignedGate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shift Time:</Text>
            <Text style={styles.infoVal}>General Duty Shift (08:00 - 20:00)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Security Station:</Text>
            <Text style={styles.infoVal}>Command Post Terminal #1</Text>
          </View>

          <TouchableOpacity
            style={styles.switchGateBtn}
            onPress={() => setGateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.switchGateBtnText}>⇄ Switch Assigned Security Gate</Text>
          </TouchableOpacity>
        </View>

        {/* Staff Welfare & HR */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Staff Welfare & HR</Text>
          <TouchableOpacity
            style={[styles.switchGateBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginBottom: 8 }]}
            onPress={onNavigateLeaves}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchGateBtnText, { color: '#1D4ED8' }]}>📅 Apply & View Leave Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchGateBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
            onPress={onNavigatePayroll}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchGateBtnText, { color: '#047857' }]}>💳 My Monthly Payroll & Payslips</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Campus Emergency Helplines</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL('tel:100').catch(() => null)}
          >
            <Text style={styles.contactTitle}>🚨 Campus Security Control Room</Text>
            <Text style={styles.contactSub}>Ext: 100 • 24/7 Priority Emergency</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL('tel:108').catch(() => null)}
          >
            <Text style={styles.contactTitle}>🏥 Campus Health Center & Ambulance</Text>
            <Text style={styles.contactSub}>Ext: 108 • Medical Emergency Unit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL('tel:101').catch(() => null)}
          >
            <Text style={styles.contactTitle}>🚒 Campus Fire Safety Post</Text>
            <Text style={styles.contactSub}>Ext: 101 • Fire Safety Dispatch</Text>
          </TouchableOpacity>
        </View>

        {/* Security & Settings Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account & Credentials</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setPasswordModalVisible(true)}
          >
            <Text style={styles.actionRowText}>🔑 Change Security Password</Text>
            <Text style={styles.actionRowChevron}>→</Text>
          </TouchableOpacity>

          {onOpenReferrals && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={onOpenReferrals}
            >
              <Text style={styles.actionRowText}>💼 Business Referrals & Rewards</Text>
              <Text style={styles.actionRowChevron}>→</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={confirmLogout}
          >
            <Text style={[styles.actionRowText, { color: '#DC2626' }]}>Sign Out of Security Terminal</Text>
            <Text style={[styles.actionRowChevron, { color: '#DC2626' }]}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Switch Gate Modal */}
      <Modal visible={gateModalVisible} transparent animationType="slide" onRequestClose={() => setGateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Assigned Gate</Text>
            <Text style={styles.modalSub}>Switch active security post terminal</Text>

            {GATES.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.gateOption, assignedGate === g && styles.gateOptionActive]}
                onPress={() => {
                  onGateChange(g);
                  setGateModalVisible(false);
                  Alert.alert('Gate Switched', `Duty post updated to ${g}.`);
                }}
              >
                <Text style={[styles.gateOptionText, assignedGate === g && styles.gateOptionTextActive]}>
                  {assignedGate === g ? '✓ ' : ''}{g}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setGateModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} transparent animationType="slide" onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSub}>Update guard account credentials</Text>

            <Text style={styles.inputLabel}>Current Password *</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.inputLabel}>New Password *</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.inputLabel}>Confirm New Password *</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPasswordModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handlePasswordChange} disabled={submittingPassword}>
                <Text style={styles.modalSubmitText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  officerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  officerRole: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  badgeTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  badgeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  switchGateBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  switchGateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  contactRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  actionRowChevron: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  gateOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  gateOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  gateOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  gateOptionTextActive: {
    color: '#1D4ED8',
  },
  modalCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
