import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { apiPost, type MobileUser } from '../../services/api';

export type PersonType = 'Student' | 'Staff' | 'HOD' | 'Visitor';

type Props = {
  visible: boolean;
  onClose: () => void;
  user?: MobileUser;
  assignedGate?: string;
  defaultGate?: string;
  initialPersonType?: PersonType;
  allowedPersonTypes?: PersonType[];
  onNavigateScanner?: (code?: string) => void;
  onNavigateVisitors?: () => void;
  onRegistrationSuccess?: (person?: any) => void;
};

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Electrical & Electronics Engineering',
  'Civil Engineering',
  'Electronics & Communication Engineering',
  'Management Studies / MBA',
  'Science & Humanities',
  'Administration & General',
];

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)',
];

const ID_PROOF_TYPES = [
  'College ID Card',
  'Staff Employee ID',
  'Aadhaar Card',
  'Driving License',
  'PAN Card',
  'Voter ID',
  'Passport',
];

export default function WatchmanRegisterPersonModal({
  visible,
  onClose,
  user,
  assignedGate,
  defaultGate,
  initialPersonType,
  allowedPersonTypes,
  onNavigateScanner,
  onNavigateVisitors,
  onRegistrationSuccess,
}: Props) {
  const activeGate = assignedGate || defaultGate || 'Gate 1 (Main Entrance)';
  const defaultInitial = (allowedPersonTypes && !allowedPersonTypes.includes(initialPersonType || 'Student'))
    ? allowedPersonTypes[0]
    : (initialPersonType || 'Student');
  const [personType, setPersonType] = useState<PersonType>(defaultInitial);

  useEffect(() => {
    if (visible) {
      if (initialPersonType) {
        handleTypeChange(initialPersonType);
      }
      setGate(activeGate);
    }
  }, [visible, initialPersonType, activeGate]);

  // Form Fields
  const [name, setName] = useState('');
  const [personId, setPersonId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('General');
  const [designation, setDesignation] = useState('Student');
  const [batch, setBatch] = useState('2026');
  const [semester, setSemester] = useState('1');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [idProofType, setIdProofType] = useState('College ID Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [gate, setGate] = useState(activeGate);
  const [purpose, setPurpose] = useState('');
  const [personToMeet, setPersonToMeet] = useState('');
  const [notes, setNotes] = useState('');

  // Dropdown / Picker toggles for mobile
  const [showProofPicker, setShowProofPicker] = useState(false);
  const [showGatePicker, setShowGatePicker] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [registeredPerson, setRegisteredPerson] = useState<any | null>(null);
  const [showEnlargeQr, setShowEnlargeQr] = useState(false);

  // Handle switching person type with sensible defaults
  const handleTypeChange = (type: PersonType) => {
    setPersonType(type);
    setErrorMsg('');
    if (type === 'Student') {
      setDesignation('Student');
      setIdProofType('College ID Card');
    } else if (type === 'Staff') {
      setDesignation('Assistant Professor');
      setIdProofType('Staff Employee ID');
    } else if (type === 'HOD') {
      setDesignation('Head of Department (HOD)');
      setIdProofType('Staff Employee ID');
    } else {
      setDesignation('Campus Visitor');
      setIdProofType('Aadhaar Card');
    }
  };

  // Reset form to clean state
  const handleReset = () => {
    setName('');
    setPersonId('');
    setPhone('');
    setEmail('');
    setDepartment('General');
    setDesignation(
      personType === 'HOD'
        ? 'Head of Department (HOD)'
        : personType === 'Staff'
        ? 'Assistant Professor'
        : personType === 'Student'
        ? 'Student'
        : 'Campus Visitor'
    );
    setBatch('2026');
    setSemester('1');
    setVehicleNumber('');
    setIdProofType(personType === 'Student' ? 'College ID Card' : personType === 'Visitor' ? 'Aadhaar Card' : 'Staff Employee ID');
    setIdProofNumber('');
    setGate(activeGate);
    setPurpose('');
    setPersonToMeet('');
    setNotes('');
    setErrorMsg('');
    setSuccessMsg('');
    setRegisteredPerson(null);
  };

  // Submit Registration Form
  const handleSubmitRegistration = async () => {
    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Contact Mobile Number is required.');
      return;
    }
    if (phone.trim().replace(/[^0-9]/g, '').length < 7) {
      setErrorMsg('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        name: name.trim(),
        personType,
        personId: personId.trim() || undefined,
        phone: phone.trim(),
        email: email.trim(),
        department,
        designation: designation.trim() || (personType === 'HOD' ? 'Head of Department' : personType === 'Staff' ? 'Faculty' : personType === 'Student' ? 'Student' : 'Visitor'),
        batch,
        semester,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        idProofType,
        idProofNumber: idProofNumber.trim(),
        gate,
        notes:
          personType === 'Visitor'
            ? `Purpose: ${purpose || 'Official Visit'} | Meet: ${personToMeet || 'Department'}`
            : notes.trim(),
      };

      const res = await apiPost<any>('watchman/campus-people', payload);

      if (res?.success) {
        setRegisteredPerson(res.data);
        setSuccessMsg(res.message || `${personType} registered successfully. Gate QR Pass generated!`);
        if (onRegistrationSuccess) {
          onRegistrationSuccess();
        }
      } else {
        setErrorMsg(res?.message || 'Registration failed. Please check inputs and retry.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to register person. Server error.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Campus In (Login) upon Registration
  const handleImmediateCampusIn = async () => {
    if (!registeredPerson) return;
    try {
      setCheckingIn(true);
      setErrorMsg('');
      const res = await apiPost<any>('watchman/campus-in', {
        personId: registeredPerson.personId,
        gate: gate || assignedGate,
        remarks: 'Direct Entry upon Registration',
      });
      if (res?.success) {
        setRegisteredPerson((prev: any) => ({ ...prev, currentStatus: 'Inside Campus' }));
        Alert.alert(
          'Campus Entry Logged 🟢',
          `${registeredPerson.name} (${registeredPerson.personId}) is now marked INSIDE CAMPUS at ${gate || assignedGate}.`
        );
        if (onRegistrationSuccess) onRegistrationSuccess();
      } else {
        setErrorMsg(res?.message || 'Failed to record campus entry.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record entry.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleTestInScanner = () => {
    if (!registeredPerson?.personId) return;
    const code = registeredPerson.personId;
    onClose();
    if (onNavigateScanner) {
      onNavigateScanner(code);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER BAR */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Register Person & Generate Gate Pass</Text>
            <Text style={styles.headerSub}>Statutory checkpost registration with instant QR Pass</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* SUCCESS BANNER */}
          {successMsg ? (
            <View style={styles.successBanner}>
              <Text style={styles.successEmoji}>✓</Text>
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* ERROR BANNER */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* ========================================================== */}
          {/* CASE A: REGISTERED SUCCESS SCREEN WITH QR GATE PASS        */}
          {/* ========================================================== */}
          {registeredPerson ? (
            <View style={styles.passContainer}>
              <View style={styles.officialPassCard}>
                {/* Top Badge & Header */}
                <View style={styles.passCardHeader}>
                  <View style={styles.passBadgeRow}>
                    <View style={styles.passTypePill}>
                      <Text style={styles.passTypePillText}>{registeredPerson.personType} PASS</Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        registeredPerson.currentStatus === 'Inside Campus'
                          ? styles.statusTagInside
                          : styles.statusTagOutside,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          registeredPerson.currentStatus === 'Inside Campus'
                            ? styles.statusTagTextInside
                            : styles.statusTagTextOutside,
                        ]}
                      >
                        {registeredPerson.currentStatus === 'Inside Campus' ? '🟢 Inside Campus' : '⚪ Outside Campus'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.passPersonName}>{registeredPerson.name}</Text>
                  <Text style={styles.passPersonSub}>
                    {registeredPerson.designation || registeredPerson.personType} • {registeredPerson.department}
                  </Text>
                  <View style={styles.passIdBadge}>
                    <Text style={styles.passIdBadgeLabel}>ID / ROLL #</Text>
                    <Text style={styles.passIdBadgeValue}>{registeredPerson.personId}</Text>
                  </View>
                </View>

                {/* Generated QR Code Image */}
                <View style={styles.qrCodeSection}>
                  <Text style={styles.qrInstruction}>OFFICIAL GATE QR PASS</Text>
                  <View style={styles.qrImageFrame}>
                    <Image
                      source={{ uri: registeredPerson.qrCodeUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.qrLinkedText}>
                    Scannable at: <Text style={{ fontWeight: '700', color: '#1E40AF' }}>{gate || assignedGate}</Text>
                  </Text>
                </View>

                {/* Details Grid */}
                <View style={styles.passDetailsGrid}>
                  <View style={styles.passDetailItem}>
                    <Text style={styles.passDetailLabel}>CONTACT PHONE</Text>
                    <Text style={styles.passDetailValue}>📞 {registeredPerson.phone || '—'}</Text>
                  </View>
                  <View style={styles.passDetailItem}>
                    <Text style={styles.passDetailLabel}>VEHICLE REG #</Text>
                    <Text style={styles.passDetailValue}>🚗 {registeredPerson.vehicleNumber || 'Pedestrian'}</Text>
                  </View>
                  <View style={styles.passDetailItem}>
                    <Text style={styles.passDetailLabel}>ID PROOF TYPE</Text>
                    <Text style={styles.passDetailValue}>{registeredPerson.idProofType}</Text>
                  </View>
                  <View style={styles.passDetailItem}>
                    <Text style={styles.passDetailLabel}>DOC NUMBER</Text>
                    <Text style={styles.passDetailValue}>{registeredPerson.idProofNumber || 'Verified'}</Text>
                  </View>
                </View>

                {/* Supported Actions */}
                <View style={styles.passActionCol}>
                  {registeredPerson.currentStatus !== 'Inside Campus' && (
                    <TouchableOpacity
                      style={styles.passAdmitBtn}
                      onPress={handleImmediateCampusIn}
                      disabled={checkingIn}
                      activeOpacity={0.8}
                    >
                      {checkingIn ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.passAdmitBtnText}>Record Campus IN (Login) 📥</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <View style={styles.passSecBtnRow}>
                    <TouchableOpacity
                      style={styles.passSecBtn}
                      onPress={handleTestInScanner}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.passSecBtnText}>📷 Test in Scanner</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.passSecBtn}
                      onPress={() => setShowEnlargeQr(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.passSecBtnText}>🔍 Enlarge QR</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.passNextBtn}
                    onPress={handleReset}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.passNextBtnText}>+ Register Next Person</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* ========================================================== */
            /* CASE B: REGISTRATION FORM                                  */
            /* ========================================================== */
            <View>
              {/* PERSON TYPE SELECTION CARDS */}
              <Text style={styles.sectionHeading}>Select Person Category</Text>
              <View style={styles.typeCardsGrid}>
                {[
                  { type: 'Student', icon: '🎓', label: 'Student', desc: 'Roll Number' },
                  { type: 'Staff', icon: '👔', label: 'Faculty / Staff', desc: 'Employee ID' },
                  { type: 'HOD', icon: '🏢', label: 'HOD', desc: 'Department Head' },
                  { type: 'Visitor', icon: '👤', label: 'Visitor / Guest', desc: 'Visitor Pass' },
                ]
                  .filter((item) => !allowedPersonTypes || allowedPersonTypes.includes(item.type as PersonType))
                  .map((item) => {
                    const isSelected = personType === item.type;
                    return (
                      <TouchableOpacity
                        key={item.type}
                        style={[styles.typeCard, isSelected && styles.typeCardActive]}
                        onPress={() => handleTypeChange(item.type as PersonType)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.typeCardIcon}>{item.icon}</Text>
                        <Text style={[styles.typeCardLabel, isSelected && styles.typeCardLabelActive]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.typeCardDesc, isSelected && styles.typeCardDescActive]}>
                          {item.desc}
                        </Text>
                        {isSelected ? <View style={styles.typeSelectedCheck}><Text style={styles.checkText}>✓</Text></View> : null}
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* VISITOR REDIRECT NOTICE */}
              {personType === 'Visitor' && (
                <View style={styles.visitorNoticeBox}>
                  <Text style={styles.visitorNoticeText}>
                    💡 Tip: Registering a regular daily guest? You can also use the dedicated visitor entry and badge module.
                  </Text>
                  {onNavigateVisitors ? (
                    <TouchableOpacity
                      style={styles.visitorNoticeBtn}
                      onPress={() => {
                        onClose();
                        onNavigateVisitors();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.visitorNoticeBtnText}>Open Visitor Entry →</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {/* FORM FIELDS CARD: PERSONAL DETAILS */}
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Personal & Identification</Text>

                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Full Name <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={
                      personType === 'Student'
                        ? 'e.g. Rahul Sharma'
                        : personType === 'HOD'
                        ? 'e.g. Dr. K. Meenakshi'
                        : 'e.g. S. Natarajan'
                    }
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {/* Roll No / Person ID */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {personType === 'Student'
                      ? 'Roll No / Student ID'
                      : personType === 'HOD' || personType === 'Staff'
                      ? 'Staff / Employee ID'
                      : 'Pass / Reference ID'}{' '}
                    <Text style={styles.optionalNote}>(Leave blank to auto-generate)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={
                      personType === 'Student'
                        ? 'e.g. 21CS045 or STU-2026-001'
                        : personType === 'HOD'
                        ? 'e.g. HOD-CS-01'
                        : 'e.g. STF-8921'
                    }
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={personId}
                    onChangeText={setPersonId}
                  />
                </View>

                {/* Designation for Staff / HOD / Visitor */}
                {personType !== 'Student' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Official Designation</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={
                        personType === 'HOD'
                          ? 'Head of Department'
                          : personType === 'Staff'
                          ? 'e.g. Associate Professor'
                          : 'e.g. Guest Speaker / Contractor'
                      }
                      placeholderTextColor="#94A3B8"
                      value={designation}
                      onChangeText={setDesignation}
                    />
                  </View>
                )}

                {/* Mobile Phone */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Contact Mobile Number <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 9840123456"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={15}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                {/* Email Address */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Email Address <Text style={styles.optionalNote}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. student@college.edu"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Vehicle Number */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Vehicle Registration # <Text style={styles.optionalNote}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. TN 09 BK 4521 (or blank if pedestrian)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                  />
                </View>
              </View>

              {/* FORM CARD 2: GATE & STATUTORY ID PROOF */}
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Checkpost & Identification Proof</Text>

                {/* Gate Location Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Default Gate Location</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => setShowGatePicker(!showGatePicker)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pickerSelectorText}>📍 {gate}</Text>
                    <Text style={styles.pickerArrow}>{showGatePicker ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {showGatePicker && (
                    <View style={styles.dropdownMenu}>
                      {GATES.map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.dropdownItem, gate === g && styles.dropdownItemActive]}
                          onPress={() => {
                            setGate(g);
                            setShowGatePicker(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, gate === g && styles.dropdownItemTextActive]}>
                            {g}
                          </Text>
                          {gate === g ? <Text style={styles.dropdownCheck}>✓</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>


                {/* ID Proof Type */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Identification Proof Type</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => setShowProofPicker(!showProofPicker)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pickerSelectorText}>🪪 {idProofType}</Text>
                    <Text style={styles.pickerArrow}>{showProofPicker ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {showProofPicker && (
                    <View style={styles.dropdownMenu}>
                      {ID_PROOF_TYPES.map((proof) => (
                        <TouchableOpacity
                          key={proof}
                          style={[styles.dropdownItem, idProofType === proof && styles.dropdownItemActive]}
                          onPress={() => {
                            setIdProofType(proof);
                            setShowProofPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              idProofType === proof && styles.dropdownItemTextActive,
                            ]}
                          >
                            {proof}
                          </Text>
                          {idProofType === proof ? <Text style={styles.dropdownCheck}>✓</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* ID Proof Document Number */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    ID Proof Document Number <Text style={styles.optionalNote}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. ID card bar-number or Govt ID digits"
                    placeholderTextColor="#94A3B8"
                    value={idProofNumber}
                    onChangeText={setIdProofNumber}
                  />
                </View>

                {/* Extra fields for Student */}
                {personType === 'Student' && (
                  <View style={styles.rowTwoCols}>
                    <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>Batch Year</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="2026"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={batch}
                        onChangeText={setBatch}
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Semester</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={semester}
                        onChangeText={setSemester}
                      />
                    </View>
                  </View>
                )}

                {/* Extra fields for Visitor */}
                {personType === 'Visitor' && (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Purpose of Visit</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Official Meeting, Admissions, Placement"
                        placeholderTextColor="#94A3B8"
                        value={purpose}
                        onChangeText={setPurpose}
                      />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Person to Meet / Host</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Principal, HOD CS, Accounts Section"
                        placeholderTextColor="#94A3B8"
                        value={personToMeet}
                        onChangeText={setPersonToMeet}
                      />
                    </View>
                  </>
                )}
              </View>

              {/* ACTION BUTTONS (SUBMIT & RESET) */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleReset}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={styles.resetBtnText}>↺ Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitRegistrationBtn, loading && styles.submitRegistrationBtnDisabled]}
                  onPress={handleSubmitRegistration}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitRegistrationBtnText}>
                      Register {personType} & Generate QR Pass ✨
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ENLARGED QR MODAL */}
        {showEnlargeQr && registeredPerson && (
          <Modal transparent animationType="fade" visible={showEnlargeQr} onRequestClose={() => setShowEnlargeQr(false)}>
            <View style={styles.enlargeOverlay}>
              <View style={styles.enlargeCard}>
                <Text style={styles.enlargeTitle}>{registeredPerson.name}</Text>
                <Text style={styles.enlargeSub}>
                  {registeredPerson.personType} • <Text style={{ fontFamily: 'monospace', fontWeight: '800' }}>{registeredPerson.personId}</Text>
                </Text>
                <Image
                  source={{ uri: registeredPerson.qrCodeUrl }}
                  style={styles.enlargeQrImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.enlargeCloseBtn}
                  onPress={() => setShowEnlargeQr(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.enlargeCloseBtnText}>Close Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
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
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  successEmoji: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '900',
    marginRight: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  typeCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  typeCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  typeCardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeCardLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  typeCardLabelActive: {
    color: '#1E40AF',
  },
  typeCardDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  typeCardDescActive: {
    color: '#3B82F6',
  },
  typeSelectedCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  visitorNoticeBox: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  visitorNoticeText: {
    fontSize: 12,
    color: '#6D28D9',
    lineHeight: 17,
  },
  visitorNoticeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  visitorNoticeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontWeight: '900',
  },
  optionalNote: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94A3B8',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  pickerSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerSelectorText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  pickerArrow: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 8,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  dropdownCheck: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  submitRegistrationBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitRegistrationBtnDisabled: {
    opacity: 0.6,
  },
  submitRegistrationBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  /* SUCCESS SCREEN STYLES */
  passContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  officialPassCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    padding: 16,
    shadowColor: '#2563EB',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  passCardHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingBottom: 14,
    marginBottom: 14,
  },
  passBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  passTypePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  passTypePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusTagInside: {
    backgroundColor: '#ECFDF5',
  },
  statusTagOutside: {
    backgroundColor: '#F1F5F9',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTagTextInside: {
    color: '#059669',
  },
  statusTagTextOutside: {
    color: '#64748B',
  },
  passPersonName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  passPersonSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  passIdBadge: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passIdBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  passIdBadgeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 15,
    fontWeight: '900',
    color: '#2563EB',
  },
  qrCodeSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  qrInstruction: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  qrImageFrame: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrLinkedText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
  },
  passDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginVertical: 12,
  },
  passDetailItem: {
    width: '48%',
    marginBottom: 4,
  },
  passDetailLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  passDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  passActionCol: {
    gap: 8,
    marginTop: 6,
  },
  passAdmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passAdmitBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  passSecBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  passSecBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passSecBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  passNextBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  passNextBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  /* ENLARGE QR MODAL */
  enlargeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  enlargeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  enlargeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  enlargeSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  enlargeQrImage: {
    width: 250,
    height: 250,
  },
  enlargeCloseBtn: {
    marginTop: 18,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  enlargeCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
});
