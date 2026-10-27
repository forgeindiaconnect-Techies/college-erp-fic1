import React, { useState, useEffect, useMemo } from 'react';
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
import { apiGet, apiPost } from '../../services/api';

const DELIVERY_COMPANIES = [
  'Amazon',
  'Flipkart',
  'Blue Dart',
  'DTDC',
  'India Post / Speed Post',
  'Delhivery',
  'FedEx',
  'Swiggy / Zomato',
  'Other',
];

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Security Checkpost',
];

const QUICK_DESCRIPTIONS = [
  'Standard Parcel Box',
  'Document Envelope / Letter',
  'Books / Educational Material',
  'Electronics / Device',
  'Food / Meal Delivery',
  'Medicine / Urgent Kit',
];

export type StaffRecipient = {
  _id: string;
  userId?: string;
  staffId: string;
  name: string;
  email?: string;
  department?: string;
  phone?: string;
  role?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignedGate?: string;
  user?: any;
  currentParcels?: any[];
};

export default function WatchmanParcelEntryModal({
  visible,
  onClose,
  onSuccess,
  assignedGate = 'Gate 1 (Main Entrance)',
  user,
  currentParcels = [],
}: Props) {
  // Form fields
  const [itemType, setItemType] = useState<'Parcel' | 'Delivery'>('Parcel');
  const [deliveryCompany, setDeliveryCompany] = useState('Amazon');
  const [otherCompany, setOtherCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [packageDescription, setPackageDescription] = useState('Standard Parcel Box');
  const [gate, setGate] = useState(assignedGate);
  const [notes, setNotes] = useState('');

  // Staff Database Directory
  const [staffDirectory, setStaffDirectory] = useState<StaffRecipient[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecipient | null>(null);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [receivedDateTime, setReceivedDateTime] = useState('');

  // Fetch real staff directory from database on open
  useEffect(() => {
    if (visible) {
      setGate(assignedGate || GATES[0]);
      setErrorMsg('');
      setReceivedDateTime(new Date().toLocaleString());
      fetchStaffDirectory();
    }
  }, [visible, assignedGate]);

  const fetchStaffDirectory = async () => {
    try {
      setLoadingStaff(true);
      const res = await apiGet<any>('parcels/staff-directory');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStaffDirectory(list);
    } catch (err: any) {
      console.warn('Failed to load staff directory:', err.message);
    } finally {
      setLoadingStaff(false);
    }
  };

  const filteredStaff = useMemo(() => {
    if (!staffSearchQuery.trim()) return staffDirectory;
    const q = staffSearchQuery.trim().toLowerCase();
    return staffDirectory.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const stfId = (s.staffId || '').toLowerCase();
      const dept = (s.department || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      return name.includes(q) || stfId.includes(q) || dept.includes(q) || email.includes(q);
    });
  }, [staffDirectory, staffSearchQuery]);

  const resetForm = () => {
    setItemType('Parcel');
    setDeliveryCompany('Amazon');
    setOtherCompany('');
    setTrackingNumber('');
    setSenderName('');
    setPackageDescription('Standard Parcel Box');
    setSelectedStaff(null);
    setNotes('');
    setErrorMsg('');
    setStaffSearchQuery('');
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleConfirmItemReceipt = async () => {
    setErrorMsg('');

    if (!selectedStaff) {
      setErrorMsg('Please select a recipient staff member from the database.');
      Alert.alert('Required Field', 'Please select the recipient staff member.');
      return;
    }

    const companyName =
      deliveryCompany === 'Other' ? otherCompany.trim() : deliveryCompany;
    if (!companyName) {
      setErrorMsg('Please enter the delivery or courier company name.');
      Alert.alert('Required Field', 'Please specify the delivery company.');
      return;
    }

    // Duplicate Tracking Check against existing active items
    const cleanTracking = trackingNumber.trim();
    if (cleanTracking) {
      const existing = currentParcels.find((p) => {
        const pTracking = (p.trackingNumber || p.tracking || '').trim().toLowerCase();
        const isActive =
          p.status === 'Received' ||
          p.status === 'Received at Gate' ||
          p.status === 'Pending Collection';
        return pTracking === cleanTracking.toLowerCase() && isActive;
      });

      if (existing) {
        const msg = `A package with Tracking / AWB #${cleanTracking} is already registered at the gate and awaiting collection (ID: ${existing.parcelId || existing._id}, Recipient: ${existing.recipientName}).`;
        setErrorMsg(msg);
        Alert.alert('Duplicate Package Detected', msg);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        type: itemType,
        deliveryCompany: companyName,
        courier: companyName,
        senderName: senderName.trim() || undefined,
        otherCompany: deliveryCompany === 'Other' ? otherCompany.trim() : undefined,
        recipientId: selectedStaff._id || selectedStaff.userId,
        staffId: selectedStaff.staffId,
        recipientName: selectedStaff.name,
        recipientEmail: selectedStaff.email || undefined,
        recipientPhone: selectedStaff.phone || undefined,
        recipientType: selectedStaff.role || 'Staff',
        department: selectedStaff.department || 'General',
        trackingNumber: cleanTracking || undefined,
        awb: cleanTracking || undefined,
        parcelDetails: packageDescription.trim() || `${itemType} package`,
        gate,
        receivedAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      const res = await apiPost<any>('parcels', payload);

      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to record delivery/parcel.');
      }

      Alert.alert(
        `✓ ${itemType} Logged Successfully`,
        `${itemType} for ${selectedStaff.name} (${selectedStaff.department || 'Staff'}) has been registered at ${gate}. Notification has been dispatched to recipient.`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      const displayMsg =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        'Failed to record parcel. Please check your connection and try again.';
      setErrorMsg(displayMsg);
      Alert.alert('Registration Error', displayMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Log Incoming Delivery or Parcel</Text>
                <Text style={styles.subtitle}>
                  Gate Post Intake & Notification to Staff
                </Text>
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
              {/* Type Selection: Parcel vs Delivery */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Intake Type <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    style={[styles.typeBtn, itemType === 'Parcel' && styles.typeBtnActive]}
                    onPress={() => setItemType('Parcel')}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        itemType === 'Parcel' && styles.typeBtnTextActive,
                      ]}
                    >
                      📦 Parcel / Courier
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeBtn, itemType === 'Delivery' && styles.typeBtnActiveDelivery]}
                    onPress={() => setItemType('Delivery')}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        itemType === 'Delivery' && styles.typeBtnTextActive,
                      ]}
                    >
                      🛍️ Food / Quick Delivery
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Recipient Staff Member from Database */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Select Staff Member from Database <Text style={styles.required}>*</Text>
                </Text>

                {selectedStaff ? (
                  <View style={styles.selectedStaffCard}>
                    <View style={styles.selectedStaffInfo}>
                      <Text style={styles.selectedStaffName}>{selectedStaff.name}</Text>
                      <Text style={styles.selectedStaffMeta}>
                        {selectedStaff.staffId} • {selectedStaff.department || 'General'}
                      </Text>
                      {selectedStaff.phone ? (
                        <Text style={styles.selectedStaffContact}>📞 {selectedStaff.phone}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.changeStaffBtn}
                      onPress={() => setStaffModalOpen(true)}
                    >
                      <Text style={styles.changeStaffText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setStaffModalOpen(true)}
                  >
                    <Text style={styles.pickerTriggerText}>
                      🔍 Tap to search & select Staff / Faculty member...
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Delivery Company */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Delivery Company <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.chipGrid}>
                  {DELIVERY_COMPANIES.map((company) => {
                    const selected = deliveryCompany === company;
                    return (
                      <TouchableOpacity
                        key={company}
                        style={[styles.chip, selected && styles.chipActive]}
                        onPress={() => setDeliveryCompany(company)}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {company}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {deliveryCompany === 'Other' && (
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Enter courier / delivery service name"
                    placeholderTextColor="#94a3b8"
                    value={otherCompany}
                    onChangeText={setOtherCompany}
                  />
                )}
              </View>

              {/* Tracking / AWB Number (Optional) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tracking / AWB Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. FMPC123456789 or AW887654"
                  placeholderTextColor="#94a3b8"
                  value={trackingNumber}
                  onChangeText={(text) => {
                    setTrackingNumber(text);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoCapitalize="characters"
                />
              </View>

              {/* Sender Name (Optional) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Sender Name / Merchant (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Pearson Books, Amazon Seller, relative"
                  placeholderTextColor="#94a3b8"
                  value={senderName}
                  onChangeText={setSenderName}
                />
              </View>

              {/* Package Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Package Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Describe package (e.g. Books, Documents, Food)"
                  placeholderTextColor="#94a3b8"
                  value={packageDescription}
                  onChangeText={setPackageDescription}
                />
                <View style={styles.quickChips}>
                  {QUICK_DESCRIPTIONS.map((desc) => (
                    <TouchableOpacity
                      key={desc}
                      style={[
                        styles.miniChip,
                        packageDescription === desc && styles.miniChipActive,
                      ]}
                      onPress={() => setPackageDescription(desc)}
                    >
                      <Text
                        style={[
                          styles.miniChipText,
                          packageDescription === desc && styles.miniChipTextActive,
                        ]}
                      >
                        {desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Campus Gate Post */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Campus Gate Post <Text style={styles.required}>*</Text>
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

              {/* Received Date & Time Display */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Received Date & Time</Text>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText}>🕒 {receivedDateTime || 'Now'}</Text>
                </View>
              </View>

              {/* Optional Gate Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Security Gate Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Shelf location, condition (fragile, perishable), or delivery agent notes..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={2}
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
                onPress={handleConfirmItemReceipt}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>✓ Confirm Item Receipt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Database Staff Selection Modal */}
      <Modal
        visible={staffModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setStaffModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.staffModalCard}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Select Staff Member</Text>
                <Text style={styles.subtitle}>Loaded directly from college database</Text>
              </View>
              <TouchableOpacity
                onPress={() => setStaffModalOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <TextInput
                style={styles.input}
                placeholder="Search by name, ID (e.g. STF-001), or department..."
                placeholderTextColor="#94a3b8"
                value={staffSearchQuery}
                onChangeText={setStaffSearchQuery}
                autoFocus
              />
            </View>

            {loadingStaff ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading staff directory...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 350, paddingHorizontal: 16, paddingTop: 10 }}>
                {filteredStaff.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#64748b', fontSize: 14 }}>
                      No staff members match "{staffSearchQuery}".
                    </Text>
                  </View>
                ) : (
                  filteredStaff.map((staff) => {
                    const isSelected = selectedStaff?._id === staff._id;
                    return (
                      <TouchableOpacity
                        key={staff._id || staff.staffId}
                        style={[styles.staffRow, isSelected && styles.staffRowSelected]}
                        onPress={() => {
                          setSelectedStaff(staff);
                          setStaffModalOpen(false);
                          if (errorMsg) setErrorMsg('');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.staffRowName}>{staff.name}</Text>
                          <Text style={styles.staffRowMeta}>
                            ID: {staff.staffId} • {staff.department || 'General'}
                          </Text>
                          {staff.email ? (
                            <Text style={styles.staffRowEmail}>✉️ {staff.email}</Text>
                          ) : null}
                        </View>
                        {isSelected && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setStaffModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    maxHeight: '92%',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  staffModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 40,
    maxHeight: '85%',
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
  typeToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  typeBtnActiveDelivery: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  typeBtnTextActive: {
    color: '#1e3a8a',
  },
  pickerTrigger: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  pickerTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  selectedStaffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 12,
  },
  selectedStaffInfo: {
    flex: 1,
  },
  selectedStaffName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
  selectedStaffMeta: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
    fontWeight: '600',
  },
  selectedStaffContact: {
    fontSize: 11,
    color: '#16a34a',
    marginTop: 2,
  },
  changeStaffBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  changeStaffText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
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
  textArea: {
    minHeight: 55,
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
  readOnlyBox: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
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
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
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
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  staffRowSelected: {
    backgroundColor: '#eff6ff',
  },
  staffRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  staffRowMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  staffRowEmail: {
    fontSize: 11,
    color: '#2563eb',
    marginTop: 2,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
});

