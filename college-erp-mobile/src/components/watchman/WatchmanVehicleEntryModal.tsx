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

const VEHICLE_TYPES = [
  'Two Wheeler',
  'Four Wheeler (Car/SUV)',
  'College Bus',
  'Commercial / Delivery Van',
  'Heavy Vehicle / Truck',
  'Auto Rickshaw',
  'Other',
];

const ENTRY_PURPOSES = [
  'Staff Parking',
  'Visitor Entry',
  'Student Commute',
  'Goods / Delivery',
  'Maintenance / Contractor',
  'VIP / Official Guest',
  'Other',
];

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)',
];

const QUICK_DESTINATIONS = [
  'Campus Parking',
  'Admin Block',
  'Main Academic Block',
  'Hostel Block',
  'Delivery Bay / Canteen',
  'Sports Complex',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignedGate?: string;
  user?: any;
  currentInsideVehicles?: any[];
};

export default function WatchmanVehicleEntryModal({
  visible,
  onClose,
  onSuccess,
  assignedGate = 'Gate 1 (Main Entrance)',
  user,
  currentInsideVehicles = [],
}: Props) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Four Wheeler (Car/SUV)');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [purpose, setPurpose] = useState('Staff Parking');
  const [destination, setDestination] = useState('Campus Parking');
  const [gate, setGate] = useState(assignedGate);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setGate(assignedGate || GATES[0]);
      setErrorMsg('');
    }
  }, [visible, assignedGate]);

  const resetForm = () => {
    setVehicleNumber('');
    setVehicleType('Four Wheeler (Car/SUV)');
    setDriverName('');
    setDriverPhone('');
    setPurpose('Staff Parking');
    setDestination('Campus Parking');
    setNotes('');
    setErrorMsg('');
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleRecordVehicle = async () => {
    setErrorMsg('');
    const cleanNumber = vehicleNumber.trim().toUpperCase();
    const cleanDriver = driverName.trim();

    if (!cleanNumber) {
      setErrorMsg('Vehicle Registration Number is required.');
      Alert.alert('Required Field', 'Please enter the vehicle registration number.');
      return;
    }

    if (!cleanDriver) {
      setErrorMsg('Driver Name is required.');
      Alert.alert('Required Field', 'Please enter the driver name.');
      return;
    }

    // Client-side quick check against currently inside vehicles
    const alreadyInside = currentInsideVehicles.find(
      (v) =>
        (v.vehicleNumber || v.vehicleNo || '').trim().toUpperCase() === cleanNumber &&
        v.status === 'Inside'
    );
    if (alreadyInside) {
      const msg = `Vehicle ${cleanNumber} is already logged inside campus (Gate: ${alreadyInside.gate || 'Gate 1'}, Driver: ${alreadyInside.driverName || 'Unknown'}). Please record exit before registering a new entry.`;
      setErrorMsg(msg);
      Alert.alert('Vehicle Already Inside Campus', msg);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        vehicleNumber: cleanNumber,
        vehicleNo: cleanNumber,
        vehicleType,
        driverName: cleanDriver,
        driver: cleanDriver,
        driverPhone: driverPhone.trim() || undefined,
        phone: driverPhone.trim() || undefined,
        purpose,
        destination: destination.trim() || 'Campus Parking',
        gate,
        notes: notes.trim() || undefined,
      };

      const res = await apiPost<any>('watchman/vehicles/entry', payload);

      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to record vehicle entry.');
      }

      Alert.alert(
        '✓ Vehicle Clearance Recorded',
        `Vehicle ${cleanNumber} (${vehicleType}) has been logged as inside campus through ${gate}.`,
        [{ text: 'OK', onPress: () => {
          resetForm();
          onSuccess();
          onClose();
        }}]
      );
    } catch (err: any) {
      const displayMsg =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        'Failed to record vehicle clearance. Please check network connection and try again.';
      setErrorMsg(displayMsg);
      Alert.alert('Registration Error', displayMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Record Vehicle Campus Entry</Text>
              <Text style={styles.subtitle}>Security Clearance & Gate Access Register</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={submitting} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Vehicle Registration Number */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Vehicle Registration Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.inputHighlight}
                placeholder="e.g. TN 01 AB 1234 / KA 04 ME 5678"
                placeholderTextColor="#94a3b8"
                value={vehicleNumber}
                onChangeText={(text) => {
                  setVehicleNumber(text.toUpperCase());
                  if (errorMsg) setErrorMsg('');
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Vehicle Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Vehicle Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.chipGrid}>
                {VEHICLE_TYPES.map((type) => {
                  const selected = vehicleType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setVehicleType(type)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Driver Name & Phone */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Driver / Rider Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Driver or Owner full name"
                placeholderTextColor="#94a3b8"
                value={driverName}
                onChangeText={(text) => {
                  setDriverName(text);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Driver Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={driverPhone}
                onChangeText={setDriverPhone}
                maxLength={15}
              />
            </View>

            {/* Entry Purpose */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Entry Purpose <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.chipGrid}>
                {ENTRY_PURPOSES.map((p) => {
                  const selected = purpose === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setPurpose(p)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Destination on Campus */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Destination on Campus</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Campus Parking, Admin Block"
                placeholderTextColor="#94a3b8"
                value={destination}
                onChangeText={setDestination}
              />
              <View style={styles.quickChips}>
                {QUICK_DESTINATIONS.map((dest) => (
                  <TouchableOpacity
                    key={dest}
                    style={[styles.miniChip, destination === dest && styles.miniChipActive]}
                    onPress={() => setDestination(dest)}
                  >
                    <Text
                      style={[
                        styles.miniChipText,
                        destination === dest && styles.miniChipTextActive,
                      ]}
                    >
                      {dest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Entry Gate */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Entry Gate Post <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.gateList}>
                {GATES.map((g) => {
                  const selected = gate === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.gateOption, selected && styles.gateOptionActive]}
                      onPress={() => setGate(g)}
                    >
                      <View style={[styles.radioDot, selected && styles.radioDotActive]} />
                      <Text style={[styles.gateText, selected && styles.gateTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Optional Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Gate Notes / Observations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Pass number, materials carrying, or inspection remarks..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleRecordVehicle}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>✓ Record Vehicle Clearance</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputHighlight: {
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    letterSpacing: 1,
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  chipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  quickChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  miniChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  miniChipTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  gateList: {
    gap: 6,
  },
  gateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  gateOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    marginRight: 10,
  },
  radioDotActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  gateText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  gateTextActive: {
    color: '#1e3a8a',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});

