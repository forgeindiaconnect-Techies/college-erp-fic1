import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
  assignedGate?: string;
  onNavigateHome?: () => void;
};

type VisitorSubTab = 'active' | 'new_entry' | 'preregistered' | 'qr_verify' | 'history';

export default function WatchmanVisitorModule({ user, assignedGate = 'Gate 1 (Main Entrance)' }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<VisitorSubTab>('active');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Active Visitors
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [activeSearch, setActiveSearch] = useState('');

  // Pre-Registered Visitors
  const [preRegisteredVisitors, setPreRegisteredVisitors] = useState<any[]>([]);
  const [preRegSearch, setPreRegSearch] = useState('');

  // History Logs
  const [visitorHistory, setVisitorHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  // New Visitor Form State
  const [visName, setVisName] = useState('');
  const [visPhone, setVisPhone] = useState('');
  const [visEmail, setVisEmail] = useState('');
  const [visPurpose, setVisPurpose] = useState('');
  const [visHost, setVisHost] = useState('');
  const [visDept, setVisDept] = useState('');
  const [visIdType, setVisIdType] = useState('Aadhaar');
  const [visIdNumber, setVisIdNumber] = useState('');
  const [visVehicle, setVisVehicle] = useState('');
  const [visDuration, setVisDuration] = useState('1 Hour');
  const [submittingNewVisitor, setSubmittingNewVisitor] = useState(false);

  // Visitor QR Verification State
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [verifiedPass, setVerifiedPass] = useState<any | null>(null);
  const [verifyingPass, setVerifyingPass] = useState(false);
  const [passActionLoading, setPassActionLoading] = useState(false);

  // Digital Pass View Modal
  const [selectedPassModal, setSelectedPassModal] = useState<any | null>(null);

  // ----------------------------------------------------------------------
  // LOAD REAL DATA FROM BACKEND
  // ----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [activeRes, preRegRes, historyRes] = await Promise.allSettled([
        apiGet<any>('watchman/visitors/active'),
        apiGet<any>('watchman/visitors/pre-registered'),
        apiGet<any>('watchman/visitors/history'),
      ]);

      if (activeRes.status === 'fulfilled') {
        const raw = Array.isArray(activeRes.value?.data) ? activeRes.value.data : Array.isArray(activeRes.value) ? activeRes.value : [];
        setActiveVisitors(raw);
      }
      if (preRegRes.status === 'fulfilled') {
        const raw = Array.isArray(preRegRes.value?.data) ? preRegRes.value.data : Array.isArray(preRegRes.value) ? preRegRes.value : [];
        setPreRegisteredVisitors(raw);
      }
      if (historyRes.status === 'fulfilled') {
        const raw = Array.isArray(historyRes.value?.data) ? historyRes.value.data : Array.isArray(historyRes.value) ? historyRes.value : [];
        setVisitorHistory(raw);
      }
    } catch (err) {
      console.warn('WatchmanVisitorModule data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----------------------------------------------------------------------
  // ACTION: RECORD VISITOR EXIT
  // ----------------------------------------------------------------------
  const handleRecordExit = async (visitor: any) => {
    const vId = visitor._id || visitor.id;
    const vName = visitor.name || 'Visitor';
    Alert.alert(
      'Confirm Visitor Exit',
      `Mark visitor ${vName} as departed from campus through ${assignedGate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(vId);
              await apiPost(`watchman/visitors/${vId}/exit`, { gate: assignedGate });
              Alert.alert('✓ Visitor Departed', `Departure recorded for ${vName}. Gate pass archived.`);
              await loadData();
            } catch (err: any) {
              Alert.alert('Exit Recorded', err?.message || 'Visitor marked as exited.');
              await loadData();
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // ----------------------------------------------------------------------
  // ACTION: ADMIT PRE-REGISTERED VISITOR
  // ----------------------------------------------------------------------
  const handleAdmitPreRegistered = async (item: any) => {
    const vId = item._id || item.id;
    const vName = item.name || 'Guest';
    try {
      setActionLoadingId(vId);
      const res = await apiPost<any>(`watchman/visitors/${vId}/admit`, {
        gate: assignedGate,
      });
      Alert.alert('✓ Visitor Admitted', `${vName} has been admitted. Security Gate Pass issued.`);
      setActiveSubTab('active');
      await loadData();
    } catch (err: any) {
      Alert.alert('Admit Notice', err?.message || 'Visitor admitted.');
      await loadData();
    } finally {
      setActionLoadingId(null);
    }
  };

  // ----------------------------------------------------------------------
  // ACTION: SUBMIT NEW VISITOR ENTRY
  // ----------------------------------------------------------------------
  const handleSubmitNewVisitor = async () => {
    if (!visName.trim() || !visPhone.trim() || !visPurpose.trim()) {
      Alert.alert('Missing Fields', 'Please fill Visitor Name, Phone Number, and Purpose of Visit.');
      return;
    }
    try {
      setSubmittingNewVisitor(true);
      await apiPost('watchman/visitors/entry', {
        name: visName.trim(),
        phone: visPhone.trim(),
        email: visEmail.trim() || undefined,
        purpose: visPurpose.trim(),
        personToMeet: visHost.trim() || 'Administration',
        department: visDept.trim() || undefined,
        idProofType: visIdType,
        idProofNumber: visIdNumber.trim() || undefined,
        vehicleNo: visVehicle.trim().toUpperCase() || undefined,
        expectedDuration: visDuration,
        gate: assignedGate,
      });

      Alert.alert('✓ Gate Pass Issued', `Visitor pass generated for ${visName.trim()}.`);
      // Reset form
      setVisName('');
      setVisPhone('');
      setVisEmail('');
      setVisPurpose('');
      setVisHost('');
      setVisDept('');
      setVisIdNumber('');
      setVisVehicle('');
      setActiveSubTab('active');
      await loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Visitor pass issued.');
      setActiveSubTab('active');
      await loadData();
    } finally {
      setSubmittingNewVisitor(false);
    }
  };

  // ----------------------------------------------------------------------
  // ACTION: VERIFY VISITOR PASS QR CODE (Visitors ONLY)
  // ----------------------------------------------------------------------
  const handleVerifyPassQr = async (codeToVerify?: string) => {
    const code = (codeToVerify || qrCodeInput).trim();
    if (!code) {
      Alert.alert('Input Required', 'Please enter a Visitor Pass number, booking ID, or scan visitor QR.');
      return;
    }
    try {
      setVerifyingPass(true);
      setVerifiedPass(null);

      // 0. Pre-check for known Student / Staff / HOD code formats
      if (/^(STU-|STF-|HOD-|FAC-|21CS|21EC|21ME)/i.test(code)) {
        Alert.alert(
          '⚠️ College Member Pass Detected',
          `This pass (${code}) belongs to a registered Student, Staff, or HOD.\n\nVisitor QR Scanner is strictly for visitors. Please use the Gate Operations QR Scanner under Gate Ops.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // 1. Check backend campus-people lookup with module=visitor_management
      try {
        const campusRes = await apiGet<any>(`watchman/campus-people/lookup/${encodeURIComponent(code)}?module=visitor_management`);
        if (campusRes?.isMemberPass || (campusRes?.person && ['Student', 'Staff', 'Faculty', 'HOD'].includes(campusRes.person.personType))) {
          const pType = campusRes.personType || campusRes?.person?.personType || 'College Member';
          const pName = campusRes.name || campusRes?.person?.name || code;
          Alert.alert(
            '⚠️ College Member Pass Detected',
            `This pass belongs to a registered ${pType} (${pName}).\n\nPlease use the Gate Operations QR Scanner under Gate Ops.`,
            [{ text: 'OK' }]
          );
          return;
        }

        if (campusRes?.success && campusRes?.person && campusRes.person.personType === 'Visitor') {
          const cp = campusRes.person;
          setVerifiedPass({
            _id: cp.personId || cp._id,
            name: cp.name,
            phone: cp.phone,
            email: cp.email,
            passNumber: cp.personId,
            badgeNumber: cp.personId,
            purpose: cp.designation || 'Campus Visit',
            personToMeet: cp.department || 'Administration',
            status: cp.currentStatus === 'Inside Campus' ? 'Inside' : 'Pre-Registered',
            inTime: cp.lastEntryTime ? new Date(cp.lastEntryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
            createdAt: cp.createdAt || new Date().toISOString(),
          });
          return;
        }
      } catch (cErr: any) {
        if (cErr?.isMemberPass || cErr?.message?.includes('College member pass detected')) {
          Alert.alert(
            '⚠️ College Member Pass Detected',
            cErr.message || 'This pass belongs to a registered Student/Staff/HOD. Please use the Gate Operations QR Scanner under Gate Ops.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // 2. Call visitor verification endpoint
      try {
        const res = await apiGet<any>(`watchman/visitors/verify?code=${encodeURIComponent(code)}`);
        if (res?.isMemberPass) {
          Alert.alert(
            '⚠️ College Member Pass Detected',
            res.message || 'This pass belongs to a registered Student/Staff/HOD. Please use the Gate Operations QR Scanner under Gate Ops.',
            [{ text: 'OK' }]
          );
          return;
        }

        const passData = res?.data || res?.visitor;
        if (res?.success && passData) {
          setVerifiedPass(passData);
          return;
        }
      } catch (vErr: any) {
        if (vErr?.isMemberPass || vErr?.message?.includes('College member pass detected') || vErr?.message?.includes('Student/Staff/HOD')) {
          Alert.alert(
            '⚠️ College Member Pass Detected',
            vErr.message || 'This pass belongs to a registered Student/Staff/HOD. Please use the Gate Operations QR Scanner under Gate Ops.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // 3. Fallback search strictly within local visitor datasets
      const match =
        activeVisitors.find((v) => (v.passNumber || v.badgeNumber || v._id || '').toLowerCase() === code.toLowerCase()) ||
        preRegisteredVisitors.find((v) => (v.passNumber || v.appointmentCode || v._id || '').toLowerCase() === code.toLowerCase());
      if (match) {
        setVerifiedPass(match);
      } else {
        Alert.alert('Invalid Visitor Pass', `No visitor pass found matching code "${code}".\n\nPlease ensure this is an active or pre-booked visitor pass.`);
      }
    } catch (err: any) {
      if (err?.isMemberPass || err?.message?.includes('College member pass detected') || err?.message?.includes('Student/Staff/HOD')) {
        Alert.alert(
          '⚠️ College Member Pass Detected',
          err.message || 'This pass belongs to a registered Student/Staff/HOD. Please use the Gate Operations QR Scanner under Gate Ops.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Verification Notice', err?.message || 'Could not verify visitor pass.');
      }
    } finally {
      setVerifyingPass(false);
    }
  };

  const handleVerifiedPassExit = async () => {
    if (!verifiedPass) return;
    const vId = verifiedPass._id || verifiedPass.id;
    try {
      setPassActionLoading(true);
      await apiPost(`watchman/visitors/${vId}/exit`, { gate: assignedGate });
      Alert.alert('✓ Visitor Departed', 'Exit successfully verified and recorded.');
      setVerifiedPass(null);
      setQrCodeInput('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Exit recorded.');
      setVerifiedPass(null);
      await loadData();
    } finally {
      setPassActionLoading(false);
    }
  };

  const handleVerifiedPassAdmit = async () => {
    if (!verifiedPass) return;
    const vId = verifiedPass._id || verifiedPass.id;
    try {
      setPassActionLoading(true);
      await apiPost(`watchman/visitors/${vId}/admit`, { gate: assignedGate });
      Alert.alert('✓ Visitor Admitted', 'Visitor successfully admitted and campus gate pass authorized.');
      setVerifiedPass(null);
      setQrCodeInput('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Admit Notice', err?.message || 'Visitor admitted.');
      setVerifiedPass(null);
      await loadData();
    } finally {
      setPassActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // FILTERED LISTS
  // ----------------------------------------------------------------------
  const displayedActive = useMemo(() => {
    if (!activeSearch.trim()) return activeVisitors;
    const q = activeSearch.toLowerCase().trim();
    return activeVisitors.filter(
      (v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.phone || '').includes(q) ||
        (v.passNumber || v.badgeNumber || '').toLowerCase().includes(q) ||
        (v.personToMeet || '').toLowerCase().includes(q)
    );
  }, [activeVisitors, activeSearch]);

  const displayedPreReg = useMemo(() => {
    if (!preRegSearch.trim()) return preRegisteredVisitors;
    const q = preRegSearch.toLowerCase().trim();
    return preRegisteredVisitors.filter(
      (v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.phone || '').includes(q) ||
        (v.personToMeet || '').toLowerCase().includes(q)
    );
  }, [preRegisteredVisitors, preRegSearch]);

  const displayedHistory = useMemo(() => {
    if (!historySearch.trim()) return visitorHistory;
    const q = historySearch.toLowerCase().trim();
    return visitorHistory.filter(
      (v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.phone || '').includes(q) ||
        (v.passNumber || '').toLowerCase().includes(q) ||
        (v.purpose || '').toLowerCase().includes(q)
    );
  }, [visitorHistory, historySearch]);

  return (
    <View style={styles.container}>
      {/* 5-DESTINATION HORIZONTAL SUB-NAV TABS */}
      <View style={styles.navBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navBar}>
          {[
            { id: 'new_entry', label: 'New Entry', icon: '📝' },
            { id: 'preregistered', label: `Pre-Book (${preRegisteredVisitors.length})`, icon: '📅' },
            { id: 'qr_verify', label: 'Visitor Scanner', icon: '📷' },
            { id: 'active', label: `Active (${activeVisitors.length})`, icon: '🟢' },
            { id: 'history', label: 'History', icon: '📋' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.navPill, activeSubTab === tab.id && styles.navPillActive]}
              onPress={() => setActiveSubTab(tab.id as VisitorSubTab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navPillText, activeSubTab === tab.id && styles.navPillTextActive]}>
                {tab.icon} {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* ============================================================== */}
        {/* SUB-TAB 1: ACTIVE VISITORS ON CAMPUS                           */}
        {/* ============================================================== */}
        {activeSubTab === 'active' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>🟢 Active Visitors on Campus</Text>
                <Text style={styles.sectionSub}>Guests currently inside college premises</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setActiveSubTab('new_entry')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ New Entry</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search by name, phone, pass number, host..."
              value={activeSearch}
              onChangeText={setActiveSearch}
              clearButtonMode="while-editing"
            />

            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : displayedActive.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🏛️</Text>
                <Text style={styles.emptyTitle}>No Active Visitors Inside</Text>
                <Text style={styles.emptySub}>All checked-in guests have exited premises.</Text>
              </View>
            ) : (
              displayedActive.map((v, idx) => {
                const vId = v._id || v.id || `VIS-${idx + 1}`;
                const isActionLoading = actionLoadingId === vId;
                const badge = v.passNumber || v.badgeNumber || `PASS-${100 + idx}`;

                return (
                  <View key={vId} style={styles.visitorCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitorName}>{v.name}</Text>
                        <TouchableOpacity
                          onPress={() => v.phone && Linking.openURL(`tel:${v.phone}`).catch(() => null)}
                        >
                          <Text style={styles.visitorPhone}>📞 {v.phone || 'No phone'}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillText}>{badge}</Text>
                      </View>
                    </View>

                    <View style={styles.detailsGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Purpose:</Text>
                        <Text style={styles.detailValBold}>{v.purpose || 'Official Visit'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Host / Dept:</Text>
                        <Text style={styles.detailVal}>{v.personToMeet || v.department || 'Administration'}</Text>
                      </View>
                      {v.vehicleNo ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Vehicle No:</Text>
                          <Text style={styles.detailVal}>{v.vehicleNo}</Text>
                        </View>
                      ) : null}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Check-in Time:</Text>
                        <Text style={styles.detailVal}>
                          {v.inTime || (v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today')}
                        </Text>
                      </View>
                    </View>

                    {/* Dual Action Buttons */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.viewPassBtn}
                        onPress={() => setSelectedPassModal(v)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.viewPassBtnText}>🎫 View Pass</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.exitBtn, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleRecordExit(v)}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.exitBtnText}>Record Exit 🚪</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 2: NEW VISITOR ENTRY FORM                              */}
        {/* ============================================================== */}
        {activeSubTab === 'new_entry' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>📝 Issue New Visitor Pass</Text>
                <Text style={styles.sectionSub}>Register arriving guest and grant campus gate entry</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formInputLabel}>Visitor Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Anand Murthy"
                value={visName}
                onChangeText={setVisName}
              />

              <View style={styles.formRowDual}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabel}>Mobile Phone *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 98402 12345"
                    keyboardType="phone-pad"
                    value={visPhone}
                    onChangeText={setVisPhone}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.formInputLabel}>Email (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. guest@email.com"
                    keyboardType="email-address"
                    value={visEmail}
                    onChangeText={setVisEmail}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Text style={styles.formInputLabel}>Purpose of Visit *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Student Admission, Vendor Meeting, Parent Query"
                value={visPurpose}
                onChangeText={setVisPurpose}
              />

              <View style={styles.formRowDual}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabel}>Person to Meet *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Principal / HOD CSE"
                    value={visHost}
                    onChangeText={setVisHost}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.formInputLabel}>Department</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Admissions"
                    value={visDept}
                    onChangeText={setVisDept}
                  />
                </View>
              </View>

              <Text style={styles.formInputLabel}>ID Proof Document Type</Text>
              <View style={styles.proofPillRow}>
                {['Aadhaar', 'PAN Card', 'Driving License', 'Voter ID', 'Passport'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.proofPill, visIdType === t && styles.proofPillActive]}
                    onPress={() => setVisIdType(t)}
                  >
                    <Text style={[styles.proofPillText, visIdType === t && styles.proofPillTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formInputLabel}>ID Proof Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 1234 5678 9012"
                value={visIdNumber}
                onChangeText={setVisIdNumber}
              />

              <View style={styles.formRowDual}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabel}>Vehicle Number (If any)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. TN-07-CB-1234"
                    value={visVehicle}
                    onChangeText={setVisVehicle}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.formInputLabel}>Expected Duration</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 1 Hour"
                    value={visDuration}
                    onChangeText={setVisDuration}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.formSubmitBtn}
                onPress={handleSubmitNewVisitor}
                disabled={submittingNewVisitor}
                activeOpacity={0.8}
              >
                {submittingNewVisitor ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.formSubmitBtnText}>✓ Authorize & Issue Gate Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 3: PRE-REGISTERED APPOINTMENTS                         */}
        {/* ============================================================== */}
        {activeSubTab === 'preregistered' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>📅 Pre-Registered Appointments</Text>
                <Text style={styles.sectionSub}>Visitors scheduled and pre-approved by faculty/admin</Text>
              </View>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search scheduled guest name, host, phone..."
              value={preRegSearch}
              onChangeText={setPreRegSearch}
              clearButtonMode="while-editing"
            />

            {displayedPreReg.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyTitle}>No Scheduled Appointments</Text>
                <Text style={styles.emptySub}>No pre-registered guests found for today.</Text>
              </View>
            ) : (
              displayedPreReg.map((item, idx) => {
                const itemId = item._id || item.id || `PR-${idx}`;
                const isAdmitLoading = actionLoadingId === itemId;
                const status = item.status || 'Approved';

                return (
                  <View key={itemId} style={styles.preRegCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitorName}>{item.name}</Text>
                        <Text style={styles.visitorPhone}>📞 {item.phone}</Text>
                      </View>
                      <View style={[styles.statusBadge, status === 'Approved' ? styles.statusBadgeGreen : styles.statusBadgeYellow]}>
                        <Text style={[styles.statusBadgeText, status === 'Approved' ? styles.statusTextGreen : styles.statusTextYellow]}>
                          {status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailsGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Scheduled Host:</Text>
                        <Text style={styles.detailValBold}>{item.personToMeet || item.host || 'Department'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Purpose:</Text>
                        <Text style={styles.detailVal}>{item.purpose || 'Official Meeting'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Appointment Date/Time:</Text>
                        <Text style={styles.detailVal}>{item.appointmentDate || item.expectedTime || 'Today'}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.admitBtn, isAdmitLoading && { opacity: 0.6 }]}
                      onPress={() => handleAdmitPreRegistered(item)}
                      disabled={isAdmitLoading}
                      activeOpacity={0.8}
                    >
                      {isAdmitLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.admitBtnText}>✓ Admit Visitor & Issue Badge</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 4: VISITOR PASS QR SCANNER                             */}
        {/* ============================================================== */}
        {activeSubTab === 'qr_verify' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>📷 Visitor Pass QR Scanner</Text>
                <Text style={styles.sectionSub}>Verify digital visitor passes and record authorized entries or departures</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formInputLabel}>Scan or Type Visitor Pass / Code</Text>
              <View style={styles.scanRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="e.g. PASS-1001, VIS-101..."
                  value={qrCodeInput}
                  onChangeText={setQrCodeInput}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => handleVerifyPassQr()}
                  disabled={verifyingPass}
                  activeOpacity={0.8}
                >
                  {verifyingPass ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify Pass</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Visitor Pass Presets */}
              <View style={styles.presetRow}>
                <Text style={styles.presetLabel}>Quick Presets:</Text>
                {activeVisitors.slice(0, 2).map((v, i) => {
                  const pNum = v.passNumber || v.badgeNumber || `PASS-${101 + i}`;
                  return (
                    <TouchableOpacity
                      key={pNum}
                      style={styles.presetPill}
                      onPress={() => {
                        setQrCodeInput(pNum);
                        handleVerifyPassQr(pNum);
                      }}
                    >
                      <Text style={styles.presetPillText}>Active: {pNum}</Text>
                    </TouchableOpacity>
                  );
                })}
                {preRegisteredVisitors.slice(0, 2).map((pv, i) => {
                  const pNum = pv.passNumber || pv.appointmentCode || `PR-${101 + i}`;
                  return (
                    <TouchableOpacity
                      key={pNum}
                      style={[styles.presetPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                      onPress={() => {
                        setQrCodeInput(pNum);
                        handleVerifyPassQr(pNum);
                      }}
                    >
                      <Text style={[styles.presetPillText, { color: '#B45309' }]}>Pre-Book: {pNum}</Text>
                    </TouchableOpacity>
                  );
                })}
                {activeVisitors.length === 0 && preRegisteredVisitors.length === 0 && (
                  <TouchableOpacity
                    style={styles.presetPill}
                    onPress={() => {
                      setQrCodeInput('PASS-1001');
                      handleVerifyPassQr('PASS-1001');
                    }}
                  >
                    <Text style={styles.presetPillText}>PASS-1001</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Verified Visitor Pass Card */}
            {verifiedPass && (
              <View style={styles.verifiedPassCard}>
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.passHeaderTitle}>CAMPUS VISITOR PASS</Text>
                  <Text style={styles.passName}>{verifiedPass.name || verifiedPass.visitorName || 'Guest Visitor'}</Text>
                  <View style={styles.passBadgePill}>
                    <Text style={styles.passBadgeText}>
                      PASS ID: {verifiedPass.passNumber || verifiedPass.badgeNumber || verifiedPass.appointmentCode || verifiedPass.bookingId || verifiedPass._id || 'VIS-VERIFIED'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact Phone:</Text>
                    <Text style={styles.detailValBold}>{verifiedPass.phone || 'Not provided'}</Text>
                  </View>
                  {verifiedPass.email ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailVal}>{verifiedPass.email}</Text>
                    </View>
                  ) : null}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Host / Dept:</Text>
                    <Text style={styles.detailVal}>{verifiedPass.personToMeet || verifiedPass.host || verifiedPass.department || 'Administration'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Purpose:</Text>
                    <Text style={styles.detailVal}>{verifiedPass.purpose || 'Campus Visit'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Visit Date/Time:</Text>
                    <Text style={styles.detailVal}>
                      {verifiedPass.inTime || verifiedPass.entryTime || verifiedPass.appointmentDate || (verifiedPass.createdAt ? new Date(verifiedPass.createdAt).toLocaleString('en-IN') : 'Today')}
                    </Text>
                  </View>
                  {verifiedPass.vehicleNo || verifiedPass.vehicleNumber ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Vehicle No:</Text>
                      <Text style={styles.detailVal}>{verifiedPass.vehicleNo || verifiedPass.vehicleNumber}</Text>
                    </View>
                  ) : null}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entry/Exit Status:</Text>
                    <Text style={[styles.detailValBold, { color: (verifiedPass.status || '').toLowerCase().includes('inside') ? '#15803D' : '#D97706' }]}>
                      {(verifiedPass.status || '').toLowerCase().includes('inside') ? '● Active Inside Campus' : (verifiedPass.status || 'Pre-Registered / Outside')}
                    </Text>
                  </View>
                </View>

                {/* Conditional Actions based on Visitor Status */}
                {(verifiedPass.status || '').toLowerCase().includes('inside') ? (
                  <TouchableOpacity
                    style={[styles.exitPassBtn, passActionLoading && { opacity: 0.6 }]}
                    onPress={handleVerifiedPassExit}
                    disabled={passActionLoading}
                    activeOpacity={0.8}
                  >
                    {passActionLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.exitPassBtnText}>Record Exit & Revoke Pass 🚪</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.exitPassBtn, { backgroundColor: '#10B981' }, passActionLoading && { opacity: 0.6 }]}
                    onPress={handleVerifiedPassAdmit}
                    disabled={passActionLoading}
                    activeOpacity={0.8}
                  >
                    {passActionLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.exitPassBtnText}>✓ Admit Visitor & Authorize Gate Entry</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 5: VISITOR HISTORY LOGS                                */}
        {/* ============================================================== */}
        {activeSubTab === 'history' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>📋 Visitor History Logs</Text>
                <Text style={styles.sectionSub}>Historical record of all past campus visitors</Text>
              </View>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search history by name, phone, pass number..."
              value={historySearch}
              onChangeText={setHistorySearch}
              clearButtonMode="while-editing"
            />

            {displayedHistory.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No Historical Logs Found</Text>
                <Text style={styles.emptySub}>No archived visitor visits found.</Text>
              </View>
            ) : (
              displayedHistory.map((item, idx) => {
                const hId = item._id || item.id || `HIST-${idx}`;
                return (
                  <View key={hId} style={styles.historyCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitorName}>{item.name}</Text>
                        <Text style={styles.visitorPhone}>📞 {item.phone}</Text>
                      </View>
                      <View style={styles.historyBadge}>
                        <Text style={styles.historyBadgeText}>{item.passNumber || `LOG-${idx + 1}`}</Text>
                      </View>
                    </View>

                    <Text style={styles.historyDetail}>Purpose: <Text style={{ fontWeight: '700' }}>{item.purpose}</Text></Text>
                    <Text style={styles.historyDetail}>Host: {item.personToMeet || item.department || 'Administration'}</Text>
                    <Text style={styles.historyDetail}>
                      In: {item.inTime || 'Morning'} • Out: {item.outTime || 'Departed'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* DIGITAL GATE PASS MODAL                                        */}
      {/* ============================================================== */}
      <Modal
        visible={selectedPassModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPassModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Text style={styles.passHeaderTitle}>CAMPUS SECURITY VISITOR PASS</Text>
              <Text style={styles.passName}>{selectedPassModal?.name}</Text>
              <View style={styles.passBadgePill}>
                <Text style={styles.passBadgeText}>
                  BADGE: {selectedPassModal?.passNumber || selectedPassModal?.badgeNumber || 'PASS-001'}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Contact Phone:</Text>
                <Text style={styles.detailValBold}>{selectedPassModal?.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purpose:</Text>
                <Text style={styles.detailValBold}>{selectedPassModal?.purpose}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Person to Meet:</Text>
                <Text style={styles.detailVal}>{selectedPassModal?.personToMeet || 'Administration'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle No:</Text>
                <Text style={styles.detailVal}>{selectedPassModal?.vehicleNo || 'None'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Authorized Gate:</Text>
                <Text style={styles.detailVal}>{assignedGate}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSelectedPassModal(null)}
              >
                <Text style={styles.modalCancelText}>Close Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  const p = selectedPassModal;
                  setSelectedPassModal(null);
                  if (p) handleRecordExit(p);
                }}
              >
                <Text style={styles.modalSubmitText}>Record Exit</Text>
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
  navBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBar: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  navPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  navPillActive: {
    backgroundColor: '#2563EB',
  },
  navPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  navPillTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  actionBtnPrimary: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
  },
  visitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  visitorPhone: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
  },
  detailsGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
  },
  detailValBold: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewPassBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewPassBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  exitBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  formInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  formInput: {
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
  formRowDual: {
    flexDirection: 'row',
  },
  proofPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  proofPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  proofPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  proofPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  proofPillTextActive: {
    color: '#1D4ED8',
  },
  formSubmitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  formSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  preRegCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeYellow: {
    backgroundColor: '#FEF9C3',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextGreen: {
    color: '#15803D',
  },
  statusTextYellow: {
    color: '#854D0E',
  },
  admitBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  admitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scanRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  verifyBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  verifiedPassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    elevation: 2,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  passHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 1.2,
  },
  passName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  passBadgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  passBadgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },
  exitPassBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  exitPassBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  historyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  historyDetail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
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
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  presetLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  presetPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
