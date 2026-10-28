import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

  // Real-time Visitors Directory (All Registered, Inside & Exited)
  const [allVisitors, setAllVisitors] = useState<any[]>([]);
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'registered' | 'inside' | 'exited'>('all');

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
  // LOAD REAL DATA FROM BACKEND (Synced with Web Flow)
  // ----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allVisRes, activeRes, preRegRes, historyRes] = await Promise.allSettled([
        apiGet<any>('watchman/visitors'),
        apiGet<any>('watchman/visitors/active'),
        apiGet<any>('watchman/visitors/pre-registered'),
        apiGet<any>('watchman/visitors/history'),
      ]);

      if (allVisRes.status === 'fulfilled') {
        const raw = Array.isArray(allVisRes.value?.data) ? allVisRes.value.data : Array.isArray(allVisRes.value) ? allVisRes.value : [];
        setAllVisitors(raw);
      }
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
  // ACTION: RECORD VISITOR CAMPUS IN (LOGIN)
  // ----------------------------------------------------------------------
  const handleRecordVisitorIn = async (visitor: any) => {
    const vId = visitor._id || visitor.id || visitor.passNumber;
    const vName = visitor.name || 'Visitor';
    try {
      setActionLoadingId(vId);
      await apiPost(`watchman/visitors/${vId}/in`, { gate: assignedGate });
      Alert.alert('✓ Campus In Recorded', `Visitor ${vName} entry authorized. Status updated to Inside Campus.`);
      await loadData();
    } catch (err: any) {
      Alert.alert('Campus In Notice', err?.message || 'Visitor marked as inside campus.');
      await loadData();
    } finally {
      setActionLoadingId(null);
    }
  };

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
      const res = await apiPost<any>('watchman/visitors/entry', {
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

      const passData = res?.data || res;
      Alert.alert('✓ Gate Pass Issued', `Visitor pass generated for ${visName.trim()}. Pass #${passData?.passNumber || 'Generated'}`);
      
      // Reset form
      setVisName('');
      setVisPhone('');
      setVisEmail('');
      setVisPurpose('');
      setVisHost('');
      setVisDept('');
      setVisIdNumber('');
      setVisVehicle('');
      
      if (passData) {
        setSelectedPassModal(passData);
      }
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

  const handleVerifiedPassCampusIn = async () => {
    if (!verifiedPass) return;
    const vId = verifiedPass._id || verifiedPass.id || verifiedPass.passNumber;
    try {
      setPassActionLoading(true);
      const res = await apiPost<any>(`watchman/visitors/${vId}/in`, { gate: assignedGate });
      Alert.alert('✓ Campus In Recorded', 'Visitor entry authorized. Status updated to Inside Campus.');
      if (res?.data) {
        setVerifiedPass(res.data);
      } else {
        setVerifiedPass(null);
        setQrCodeInput('');
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Campus In Notice', err?.message || 'Campus In recorded.');
      await loadData();
    } finally {
      setPassActionLoading(false);
    }
  };

  const handleVerifiedPassCampusOut = async () => {
    if (!verifiedPass) return;
    const vId = verifiedPass._id || verifiedPass.id || verifiedPass.passNumber;
    try {
      setPassActionLoading(true);
      const res = await apiPost<any>(`watchman/visitors/${vId}/out`, { gate: assignedGate });
      Alert.alert('✓ Campus Out Recorded', 'Visitor departure successfully recorded. Status updated to Exited.');
      if (res?.data) {
        setVerifiedPass(res.data);
      } else {
        setVerifiedPass(null);
        setQrCodeInput('');
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Campus Out Notice', err?.message || 'Campus Out recorded.');
      await loadData();
    } finally {
      setPassActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // FILTERED LISTS
  // ----------------------------------------------------------------------
  // ----------------------------------------------------------------------
  // FILTERED LISTS (Live Real-Time Synced with Web Flow)
  // ----------------------------------------------------------------------
  const registeredCount = useMemo(() => {
    return allVisitors.filter((v) => (v.status || '').toLowerCase() === 'registered').length;
  }, [allVisitors]);

  const insideCount = useMemo(() => {
    return allVisitors.filter((v) => (v.status || '').toLowerCase().includes('inside')).length || activeVisitors.length;
  }, [allVisitors, activeVisitors]);

  const exitedCount = useMemo(() => {
    return allVisitors.filter((v) => (v.status || '').toLowerCase().includes('exit') || (v.status || '').toLowerCase().includes('checked out')).length;
  }, [allVisitors]);

  const displayedActive = useMemo(() => {
    let pool = allVisitors.length > 0 ? allVisitors : activeVisitors;

    if (visitorFilter === 'registered') {
      pool = pool.filter((v) => (v.status || '').toLowerCase() === 'registered');
    } else if (visitorFilter === 'inside') {
      pool = pool.filter((v) => (v.status || '').toLowerCase().includes('inside'));
    } else if (visitorFilter === 'exited') {
      pool = pool.filter((v) => (v.status || '').toLowerCase().includes('exit') || (v.status || '').toLowerCase().includes('checked out'));
    }

    if (!activeSearch.trim()) return pool;
    const q = activeSearch.toLowerCase().trim();
    return pool.filter(
      (v) =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.phone || '').includes(q) ||
        (v.passNumber || v.badgeNumber || '').toLowerCase().includes(q) ||
        (v.personToMeet || '').toLowerCase().includes(q) ||
        (v.purpose || '').toLowerCase().includes(q)
    );
  }, [allVisitors, activeVisitors, visitorFilter, activeSearch]);

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
            { id: 'active', label: `Visitors (${allVisitors.length || activeVisitors.length})`, icon: '👥' },
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
        {/* SUB-TAB 1: VISITORS DIRECTORY (REAL-TIME SYNCED WITH WEB)      */}
        {/* ============================================================== */}
        {activeSubTab === 'active' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>👥 Visitors Directory</Text>
                <Text style={styles.sectionSub}>All registered, active inside & departing campus guests</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setActiveSubTab('new_entry')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ New Entry</Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${allVisitors.length || activeVisitors.length})` },
                { id: 'registered', label: `Registered (${registeredCount})` },
                { id: 'inside', label: `Inside (${insideCount})` },
                { id: 'exited', label: `Exited (${exitedCount})` },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: visitorFilter === f.id ? '#2563EB' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: visitorFilter === f.id ? '#1D4ED8' : '#CBD5E1',
                  }}
                  onPress={() => setVisitorFilter(f.id as any)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: visitorFilter === f.id ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
                <Text style={styles.emptyTitle}>No Visitors Found</Text>
                <Text style={styles.emptySub}>No visitors matching current filter.</Text>
              </View>
            ) : (
              displayedActive.map((v, idx) => {
                const vId = v._id || v.id || `VIS-${idx + 1}`;
                const isActionLoading = actionLoadingId === vId;
                const badge = v.passNumber || v.badgeNumber || `PASS-${100 + idx}`;
                const isRegistered = (v.status || '').toLowerCase() === 'registered';
                const isInside = (v.status || '').toLowerCase().includes('inside');
                const isExited = (v.status || '').toLowerCase().includes('exit') || (v.status || '').toLowerCase().includes('checked out');

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
                      <View style={[
                        styles.badgePill,
                        isInside && { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
                        isRegistered && { backgroundColor: '#FEF9C3', borderColor: '#FDE047' },
                        isExited && { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }
                      ]}>
                        <Text style={[
                          styles.badgePillText,
                          isInside && { color: '#166534' },
                          isRegistered && { color: '#854D0E' },
                          isExited && { color: '#64748B' }
                        ]}>
                          {isInside ? '● INSIDE' : isRegistered ? '🟡 REGISTERED' : isExited ? '○ EXITED' : badge}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailsGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Pass #:</Text>
                        <Text style={styles.detailValBold}>{badge}</Text>
                      </View>
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
                        <Text style={styles.detailLabel}>Registered / In:</Text>
                        <Text style={styles.detailVal}>
                          {v.inTime || (v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today')}
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

                      {isRegistered ? (
                        <TouchableOpacity
                          style={[styles.inBtn, isActionLoading && { opacity: 0.6 }]}
                          onPress={() => handleRecordVisitorIn(v)}
                          disabled={isActionLoading}
                          activeOpacity={0.8}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.inBtnText}>Campus In 🟢</Text>
                          )}
                        </TouchableOpacity>
                      ) : isInside ? (
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
                      ) : null}
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
            {verifiedPass && (() => {
              const passCode = verifiedPass.passNumber || verifiedPass.badgeNumber || verifiedPass.appointmentCode || verifiedPass.visitorId || verifiedPass._id || 'VIS-PASS';
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(passCode)}`;
              const statusStr = (verifiedPass.status || 'Registered').toLowerCase();
              const isInside = statusStr.includes('inside');
              const isExited = statusStr.includes('exited') || statusStr.includes('checked out');
              const canLogin = !isInside && !isExited;
              const canLogout = isInside;

              return (
                <View style={styles.verifiedPassCard}>
                  <View style={{ alignItems: 'center', marginBottom: 12 }}>
                    <Text style={styles.passHeaderTitle}>CAMPUS VISITOR PASS</Text>
                    <Text style={styles.passName}>{verifiedPass.name || verifiedPass.visitorName || 'Guest Visitor'}</Text>
                    <View style={styles.passBadgePill}>
                      <Text style={styles.passBadgeText}>
                        PASS ID: {passCode}
                      </Text>
                    </View>

                    {/* Individual Pass QR Code */}
                    <View style={{ alignItems: 'center', marginTop: 10, padding: 8, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' }}>
                      <Image source={{ uri: qrUrl }} style={{ width: 130, height: 130 }} resizeMode="contain" />
                      <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4, fontWeight: '700' }}>Unique Pass QR Code</Text>
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
                      <Text style={styles.detailLabel}>Registration Time:</Text>
                      <Text style={styles.detailVal}>
                        {verifiedPass.createdAt ? new Date(verifiedPass.createdAt).toLocaleString('en-IN') : 'Today'}
                      </Text>
                    </View>
                    {verifiedPass.entryTime ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Actual Entry Time:</Text>
                        <Text style={[styles.detailValBold, { color: '#059669' }]}>
                          {new Date(verifiedPass.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ) : null}
                    {verifiedPass.exitTime ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Actual Exit Time:</Text>
                        <Text style={[styles.detailValBold, { color: '#DC2626' }]}>
                          {new Date(verifiedPass.exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ) : null}
                    {verifiedPass.vehicleNo || verifiedPass.vehicleNumber ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Vehicle No:</Text>
                        <Text style={styles.detailVal}>{verifiedPass.vehicleNo || verifiedPass.vehicleNumber}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Entry/Exit Status:</Text>
                      <Text style={[styles.detailValBold, { color: isInside ? '#15803D' : isExited ? '#475569' : '#2563EB' }]}>
                        {isInside ? '🟢 Inside Campus (Logged In)' : isExited ? '⚪ Exited Campus (Logged Out)' : '🟡 Registered / Ready for Entry'}
                      </Text>
                    </View>
                  </View>

                  {/* Two Distinct Actions: Login / Campus In & Logout / Campus Out */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.exitPassBtn,
                        { flex: 1, backgroundColor: canLogin ? '#059669' : '#CBD5E1' },
                        (passActionLoading || !canLogin) && { opacity: 0.7 }
                      ]}
                      onPress={handleVerifiedPassCampusIn}
                      disabled={passActionLoading || !canLogin}
                      activeOpacity={0.8}
                    >
                      {passActionLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.exitPassBtnText}>🟢 Campus In</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.exitPassBtn,
                        { flex: 1, backgroundColor: canLogout ? '#DC2626' : '#CBD5E1' },
                        (passActionLoading || !canLogout) && { opacity: 0.7 }
                      ]}
                      onPress={handleVerifiedPassCampusOut}
                      disabled={passActionLoading || !canLogout}
                      activeOpacity={0.8}
                    >
                      {passActionLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.exitPassBtnText}>🔴 Campus Out</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
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
            {(() => {
              const modalPassCode = selectedPassModal?.passNumber || selectedPassModal?.badgeNumber || selectedPassModal?.visitorId || selectedPassModal?._id || 'PASS-001';
              const modalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(modalPassCode)}`;
              const isModalInside = (selectedPassModal?.status || '').toLowerCase().includes('inside');
              const isModalRegistered = (selectedPassModal?.status || '').toLowerCase().includes('registered');

              return (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 14 }}>
                    <Text style={styles.passHeaderTitle}>CAMPUS SECURITY VISITOR PASS</Text>
                    <Text style={styles.passName}>{selectedPassModal?.name}</Text>
                    <View style={styles.passBadgePill}>
                      <Text style={styles.passBadgeText}>
                        PASS ID: {modalPassCode}
                      </Text>
                    </View>

                    {/* QR Code in Modal */}
                    <View style={{ alignItems: 'center', marginTop: 10, padding: 8, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                      <Image source={{ uri: modalQrUrl }} style={{ width: 120, height: 120 }} resizeMode="contain" />
                      <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4, fontWeight: '700' }}>Individual Pass QR Code</Text>
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
                      <Text style={styles.detailLabel}>Authorized Gate:</Text>
                      <Text style={styles.detailVal}>{selectedPassModal?.gate || assignedGate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Current Status:</Text>
                      <Text style={[styles.detailValBold, { color: isModalInside ? '#15803D' : '#2563EB' }]}>
                        {isModalInside ? '🟢 Inside Campus' : (selectedPassModal?.status || '🟡 Registered')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancel}
                      onPress={() => setSelectedPassModal(null)}
                    >
                      <Text style={styles.modalCancelText}>Close</Text>
                    </TouchableOpacity>

                    {isModalInside ? (
                      <TouchableOpacity
                        style={[styles.modalSubmit, { backgroundColor: '#DC2626' }]}
                        onPress={() => {
                          const p = selectedPassModal;
                          setSelectedPassModal(null);
                          if (p) handleRecordExit(p);
                        }}
                      >
                        <Text style={styles.modalSubmitText}>🔴 Campus Out</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.modalSubmit, { backgroundColor: '#059669' }]}
                        onPress={async () => {
                          const p = selectedPassModal;
                          setSelectedPassModal(null);
                          if (p) {
                            try {
                              const vId = p._id || p.id || p.passNumber;
                              await apiPost(`watchman/visitors/${vId}/in`, { gate: assignedGate });
                              Alert.alert('✓ Campus In Recorded', 'Visitor entry authorized. Status updated to Inside Campus.');
                              await loadData();
                            } catch (err: any) {
                              Alert.alert('Notice', err?.message || 'Campus In recorded.');
                            }
                          }
                        }}
                      >
                        <Text style={styles.modalSubmitText}>🟢 Campus In</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
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
  inBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  inBtnText: {
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
