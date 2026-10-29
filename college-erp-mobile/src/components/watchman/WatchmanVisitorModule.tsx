import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { apiGet, apiPost, getCurrentBaseUrl, type MobileUser } from '../../services/api';

type Props = {
  user: MobileUser;
  assignedGate?: string;
  onNavigateHome?: () => void;
};

// 3 Distinct Tabs as requested: Visitors, Pre-Visitors, and dedicated Visitor Scanner
export type VisitorSection = 'visitors' | 'pre_visitors' | 'scanner';
type DirectoryFilter = 'all' | 'inside' | 'exited' | 'awaiting';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)',
];

const PURPOSES = [
  'Admissions Enquiry',
  'Parent Meeting / Ward Visit',
  'Official Campus Meeting / Vendor',
  'Guest Lecture / Speaker',
  'Placement Interview / Recruiter',
  'Maintenance / Facility Service',
  'Document Submission / Attestation',
  'Hostel Resident Visit',
  'Other',
];

const ID_TYPES = [
  'Aadhaar Card',
  'Driving License',
  'Voter ID',
  'PAN Card',
  'College ID',
  'Passport',
  'Other Govt ID',
];

export default function WatchmanVisitorModule({
  user,
  assignedGate = 'Gate 1 (Main Entrance)',
}: Props) {
  // Sub-tabs: 'visitors', 'pre_visitors', 'scanner'
  const [activeSection, setActiveSection] = useState<VisitorSection>('visitors');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [performingId, setPerformingId] = useState<string | null>(null);

  // Visitors data from backend
  const [allVisitors, setAllVisitors] = useState<any[]>([]);

  // Filters & Search per tab
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorFilter, setVisitorFilter] = useState<DirectoryFilter>('all');

  const [preSearch, setPreSearch] = useState('');
  const [preFilter, setPreFilter] = useState<DirectoryFilter>('all');

  // Register New Visitor Form Modal / Expand state
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPurpose, setFormPurpose] = useState('Admissions Enquiry');
  const [formPersonToMeet, setFormPersonToMeet] = useState('');
  const [formDepartment, setFormDepartment] = useState('General');
  const [formVehicle, setFormVehicle] = useState('');
  const [formIdType, setFormIdType] = useState('Aadhaar Card');
  const [formIdNumber, setFormIdNumber] = useState('');
  const [formImmediateIn, setFormImmediateIn] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Pre-Register Guest Form Modal state
  const [showPreRegisterForm, setShowPreRegisterForm] = useState(false);
  const [preName, setPreName] = useState('');
  const [prePhone, setPrePhone] = useState('');
  const [prePurpose, setPrePurpose] = useState('Official Campus Meeting / Vendor');
  const [preHost, setPreHost] = useState('');
  const [preDept, setPreDept] = useState('General');
  const [preDate, setPreDate] = useState(new Date().toISOString().slice(0, 10));
  const [preTime, setPreTime] = useState('10:00 AM');
  const [preSubmitting, setPreSubmitting] = useState(false);

  // Generated Digital QR Pass Modal
  const [generatedPass, setGeneratedPass] = useState<any | null>(null);

  // Dedicated Visitor Scanner state
  const [scanPassCode, setScanPassCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedVisitor, setScannedVisitor] = useState<any | null>(null);
  const [scanActionLoading, setScanActionLoading] = useState(false);

  // ----------------------------------------------------------------------
  // LOAD REAL VISITORS FROM BACKEND
  // ----------------------------------------------------------------------
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      const [visitorsRes, preRes] = await Promise.allSettled([
        apiGet<any>('watchman/visitors'),
        apiGet<any>('watchman/visitors/pre-registered'),
      ]);

      const map = new Map<string, any>();

      // 1. Regular Visitors
      if (visitorsRes.status === 'fulfilled' && visitorsRes.value) {
        const list = Array.isArray(visitorsRes.value.data)
          ? visitorsRes.value.data
          : Array.isArray(visitorsRes.value)
          ? visitorsRes.value
          : [];
        list.forEach((v: any) => {
          const key = (v.passNumber || v.visitorId || v._id || '').toUpperCase();
          if (key) map.set(key, v);
        });
      }

      // 2. Pre-Registered Visitors
      if (preRes.status === 'fulfilled' && preRes.value) {
        const preList = Array.isArray(preRes.value.data)
          ? preRes.value.data
          : Array.isArray(preRes.value)
          ? preRes.value
          : [];
        preList.forEach((pv: any) => {
          const key = (pv.passNumber || pv.visitorId || pv._id || '').toUpperCase();
          if (key) {
            map.set(key, { ...pv, isPreRegistered: true });
          }
        });
      }

      setAllVisitors(Array.from(map.values()));
    } catch (err) {
      console.warn('WatchmanVisitorModule load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  // ----------------------------------------------------------------------
  // SPLIT WALK-IN VISITORS VS PRE-REGISTERED VISITORS
  // ----------------------------------------------------------------------
  const regularVisitorsList = useMemo(() => {
    return allVisitors.filter((v) => !v.isPreRegistered);
  }, [allVisitors]);

  const preRegisteredVisitorsList = useMemo(() => {
    return allVisitors.filter((v) => !!v.isPreRegistered);
  }, [allVisitors]);

  // Filtered Regular Visitors
  const displayedVisitors = useMemo(() => {
    let pool = regularVisitorsList;
    if (visitorFilter === 'inside') {
      pool = pool.filter((v) => (v.status || '').toLowerCase().includes('inside'));
    } else if (visitorFilter === 'exited') {
      pool = pool.filter((v) => (v.status || '').toLowerCase().includes('exited') || (v.status || '').toLowerCase().includes('departed'));
    }
    if (!visitorSearch.trim()) return pool;
    const q = visitorSearch.toLowerCase().trim();
    return pool.filter((v) => {
      const name = (v.name || '').toLowerCase();
      const pass = (v.passNumber || v.visitorId || '').toLowerCase();
      const host = (v.personToMeet || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();
      const dept = (v.department || '').toLowerCase();
      return name.includes(q) || pass.includes(q) || host.includes(q) || phone.includes(q) || dept.includes(q);
    });
  }, [regularVisitorsList, visitorFilter, visitorSearch]);

  // Filtered Pre-Registered Visitors
  const displayedPreVisitors = useMemo(() => {
    let pool = preRegisteredVisitorsList;
    if (preFilter === 'awaiting') {
      pool = pool.filter((v) => !(v.status || '').toLowerCase().includes('inside') && !(v.status || '').toLowerCase().includes('exited'));
    } else if (preFilter === 'inside') {
      pool = pool.filter((v) => (v.status || '').toLowerCase().includes('inside'));
    } else if (preFilter === 'exited') {
      pool = pool.filter((v) => (v.status || '').toLowerCase().includes('exited') || (v.status || '').toLowerCase().includes('departed'));
    }
    if (!preSearch.trim()) return pool;
    const q = preSearch.toLowerCase().trim();
    return pool.filter((v) => {
      const name = (v.name || '').toLowerCase();
      const pass = (v.passNumber || v.visitorId || '').toLowerCase();
      const host = (v.personToMeet || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();
      return name.includes(q) || pass.includes(q) || host.includes(q) || phone.includes(q);
    });
  }, [preRegisteredVisitorsList, preFilter, preSearch]);

  // Metric counts
  const regularInsideCount = regularVisitorsList.filter((v) => (v.status || '').toLowerCase().includes('inside')).length;
  const regularExitedCount = regularVisitorsList.filter((v) => (v.status || '').toLowerCase().includes('exited')).length;

  const preAwaitingCount = preRegisteredVisitorsList.filter((v) => !(v.status || '').toLowerCase().includes('inside') && !(v.status || '').toLowerCase().includes('exited')).length;
  const preInsideCount = preRegisteredVisitorsList.filter((v) => (v.status || '').toLowerCase().includes('inside')).length;

  // ----------------------------------------------------------------------
  // VISITOR ACTIONS: CAMPUS IN & CAMPUS OUT
  // ----------------------------------------------------------------------
  const handleVisitorIn = async (visitor: any) => {
    const vId = visitor.visitorId || visitor.passNumber || visitor._id;
    const isInside = (visitor.status || '').toLowerCase().includes('inside');

    if (isInside) {
      Alert.alert(
        '⚠️ Already Inside Campus',
        `${visitor.name} (${visitor.passNumber}) is already marked as INSIDE campus.`
      );
      return;
    }

    try {
      setPerformingId(vId);
      setScanActionLoading(true);

      const targetId = visitor._id || visitor.visitorId || visitor.passNumber;
      const res = await apiPost<any>(`watchman/visitors/${encodeURIComponent(targetId)}/in`, {
        gate: assignedGate,
      });

      if (res?.success !== false) {
        Alert.alert(
          '✓ Visitor Admitted',
          `${visitor.name} (${visitor.passNumber}) has been admitted INSIDE campus through ${assignedGate}.`
        );
        if (scannedVisitor && (scannedVisitor.passNumber === visitor.passNumber || scannedVisitor._id === visitor._id)) {
          setScannedVisitor((prev: any) => ({ ...prev, status: 'Inside Campus' }));
        }
      } else {
        Alert.alert('Notice', res.message || 'Could not admit visitor.');
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Action Notice', err?.message || `Updated entry for ${visitor.name}.`);
      await loadData();
    } finally {
      setPerformingId(null);
      setScanActionLoading(false);
    }
  };

  const handleVisitorOut = async (visitor: any) => {
    const vId = visitor.visitorId || visitor.passNumber || visitor._id;
    const isInside = (visitor.status || '').toLowerCase().includes('inside');

    if (!isInside) {
      Alert.alert(
        '⚠️ Visitor Not Inside',
        `${visitor.name} (${visitor.passNumber}) is not currently marked as inside campus.`
      );
      return;
    }

    try {
      setPerformingId(vId);
      setScanActionLoading(true);

      const targetId = visitor._id || visitor.visitorId || visitor.passNumber;
      const res = await apiPost<any>(`watchman/visitors/${encodeURIComponent(targetId)}/out`, {
        gate: assignedGate,
      });

      if (res?.success !== false) {
        Alert.alert(
          '✓ Visitor Departure Logged',
          `${visitor.name} (${visitor.passNumber}) departure recorded successfully through ${assignedGate}.`
        );
        if (scannedVisitor && (scannedVisitor.passNumber === visitor.passNumber || scannedVisitor._id === visitor._id)) {
          setScannedVisitor((prev: any) => ({ ...prev, status: 'Exited' }));
        }
      } else {
        Alert.alert('Notice', res.message || 'Could not record exit.');
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Action Notice', err?.message || `Updated departure for ${visitor.name}.`);
      await loadData();
    } finally {
      setPerformingId(null);
      setScanActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // SUBMIT VISITOR REGISTRATION
  // ----------------------------------------------------------------------
  const handleRegisterVisitorSubmit = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Please enter visitor full name.');
      return;
    }
    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!formPersonToMeet.trim()) {
      Alert.alert('Validation Error', 'Please specify host / person to meet.');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        name: formName.trim(),
        phone: cleanPhone,
        purpose: formPurpose,
        personToMeet: formPersonToMeet.trim(),
        department: formDepartment,
        vehicleNumber: formVehicle.trim().toUpperCase(),
        idProofType: formIdType,
        idProofNumber: formIdNumber.trim(),
        gate: assignedGate,
        immediateIn: formImmediateIn,
      };

      const res = await apiPost<any>('watchman/visitors/entry', payload);

      if (res?.success !== false && res?.data) {
        const created = res.data;
        const passNum = created.passNumber || `PASS-${Date.now().toString().slice(-4)}`;
        const webBase = getCurrentBaseUrl().replace('/api', '').replace(':5000', ':5173');
        const verifyPassUrl = created.verifyUrl || `${webBase}/verify-gate-pass?type=visitor&code=${encodeURIComponent(passNum)}`;
        const qrCodeUrl = created.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyPassUrl)}`;

        const passData = {
          ...created,
          passNumber: passNum,
          verifyUrl: verifyPassUrl,
          qrUrl: qrCodeUrl,
        };

        setGeneratedPass(passData);
        setShowRegisterForm(false);

        // Reset form
        setFormName('');
        setFormPhone('');
        setFormPersonToMeet('');
        setFormVehicle('');
        setFormIdNumber('');

        await loadData();
      } else {
        Alert.alert('Registration Failed', res?.message || 'Could not register visitor.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit visitor registration.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // SUBMIT PRE-REGISTRATION APPOINTMENT
  // ----------------------------------------------------------------------
  const handlePreRegisterSubmit = async () => {
    if (!preName.trim()) {
      Alert.alert('Validation Error', 'Please enter guest full name.');
      return;
    }
    const cleanPhone = prePhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!preHost.trim()) {
      Alert.alert('Validation Error', 'Please specify host faculty or department.');
      return;
    }

    try {
      setPreSubmitting(true);
      const payload = {
        name: preName.trim(),
        phone: cleanPhone,
        purpose: prePurpose,
        personToMeet: preHost.trim(),
        department: preDept,
        expectedDate: preDate,
        expectedTime: preTime,
        gate: assignedGate,
      };

      const res = await apiPost<any>('watchman/visitors/pre-register', payload);

      if (res?.success !== false && res?.data) {
        Alert.alert('✓ Guest Scheduled', `Pre-registration pass ${res.data.passNumber} generated.`);
        setShowPreRegisterForm(false);
        setPreName('');
        setPrePhone('');
        setPreHost('');
        await loadData();
      } else {
        Alert.alert('Failed', res?.message || 'Could not schedule guest.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to schedule pre-registered guest.');
    } finally {
      setPreSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // DEDICATED VISITOR QR SCANNER LOOKUP
  // ----------------------------------------------------------------------
  const handleLookupVisitorPass = async (codeOverride?: string) => {
    const raw = (codeOverride || scanPassCode).trim();
    if (!raw) {
      Alert.alert('Input Required', 'Please enter or scan a Visitor Pass (e.g. PASS-8411, VIS-...).');
      return;
    }

    // Cross-guard: Block Student, Staff, HOD IDs from visitor scanner
    const upper = raw.toUpperCase();
    if (upper.startsWith('STU-') || upper.startsWith('STF-') || upper.startsWith('HOD-')) {
      Alert.alert(
        '⚠️ Member Pass Detected',
        'This is a Student, Staff, or HOD member code.\n\nThe Visitor Scanner is strictly for Visitor & Pre-Visitor passes.\n\nPlease scan this code under the "Gate Ops" tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setScanLoading(true);
      setScannedVisitor(null);

      // Verify pass with backend
      const res = await apiGet<any>(`watchman/visitors/verify?code=${encodeURIComponent(raw)}`);

      if (res?.success && (res?.visitor || res?.data)) {
        const vData = res.visitor || res.data;
        setScannedVisitor(vData);
        return;
      }

      // Memory fallback lookup
      const found = allVisitors.find((v) => {
        const p = (v.passNumber || v.visitorId || v._id || '').toUpperCase();
        return p === upper || p.includes(upper);
      });

      if (found) {
        setScannedVisitor(found);
      } else {
        Alert.alert(
          'Visitor Pass Not Found',
          `No visitor record matches pass code "${raw}".\n\nWould you like to register this person as a new visitor?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register Visitor',
              onPress: () => {
                setActiveSection('visitors');
                setShowRegisterForm(true);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Verification Notice', err?.message || 'Could not verify visitor pass.');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ============================================================== */}
      {/* 3 DISTINCT SUB-NAV TABS: VISITORS, PRE-VISITORS, VISITOR SCAN  */}
      {/* ============================================================== */}
      <View style={styles.navBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navBar}>
          {[
            { id: 'visitors', label: `👥 Visitors (${regularVisitorsList.length})` },
            { id: 'pre_visitors', label: `📅 Pre-Visitors (${preRegisteredVisitorsList.length})` },
            { id: 'scanner', label: '📷 Visitor Scanner' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.navBtn, activeSection === tab.id && styles.navBtnActive]}
              onPress={() => setActiveSection(tab.id as VisitorSection)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navBtnText, activeSection === tab.id && styles.navBtnTextActive]}>
                {tab.label}
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
        {/* TAB 1: REGULAR WALK-IN VISITORS                                */}
        {/* ============================================================== */}
        {activeSection === 'visitors' && (
          <View>
            {/* Header + Register Visitor Button */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>👥 Campus Visitors ({regularVisitorsList.length})</Text>
                <Text style={styles.sectionSub}>Tap any visitor to view pass & log entry/exit</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setShowRegisterForm(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Register Visitor</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search visitors by name, pass #, phone, host..."
              placeholderTextColor="#94A3B8"
              value={visitorSearch}
              onChangeText={setVisitorSearch}
              clearButtonMode="while-editing"
            />

            {/* Filter Pills */}
            <View style={styles.filterGroupRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'all', label: `All Visitors (${regularVisitorsList.length})` },
                  { id: 'inside', label: `● Inside Campus (${regularInsideCount})` },
                  { id: 'exited', label: `○ Exited (${regularExitedCount})` },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.filterPill, visitorFilter === f.id && styles.filterPillActive]}
                    onPress={() => setVisitorFilter(f.id as DirectoryFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, visitorFilter === f.id && styles.filterPillTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Visitors List */}
            {displayedVisitors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>👥</Text>
                <Text style={styles.emptyStateTitle}>No Visitors Found</Text>
                <Text style={styles.emptyStateSub}>No visitors match the current search or status filter.</Text>
              </View>
            ) : (
              displayedVisitors.map((v) => {
                const isInside = (v.status || '').toLowerCase().includes('inside');
                const isBusy = performingId === (v.visitorId || v.passNumber || v._id);

                return (
                  <View key={v.visitorId || v.passNumber || v._id} style={styles.visitorCard}>
                    <View style={styles.visitorCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitorName}>{v.name}</Text>
                        <Text style={styles.visitorHost}>
                          Host: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{v.personToMeet || 'College Staff'}</Text>
                          {v.department ? ` (${v.department})` : ''}
                        </Text>
                      </View>
                      <View style={styles.passNumberBadge}>
                        <Text style={styles.passNumberBadgeText}>{v.passNumber || v.visitorId}</Text>
                      </View>
                    </View>

                    <Text style={styles.visitorDetailText}>Purpose: {v.purpose || 'Official'}</Text>
                    {v.phone ? <Text style={styles.visitorDetailText}>Phone: 📞 {v.phone}</Text> : null}

                    <View style={styles.visitorCardFooter}>
                      <View style={[styles.statusPill, isInside ? styles.statusPillInside : styles.statusPillOutside]}>
                        <Text style={[styles.statusPillText, isInside ? styles.statusPillTextInside : styles.statusPillTextOutside]}>
                          {isInside ? '● INSIDE CAMPUS' : (v.status || '○ REGISTERED')}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.viewPassBtn}
                          onPress={() => {
                            const pCode = v.passNumber || v.visitorId;
                            const webBase = getCurrentBaseUrl().replace('/api', '').replace(':5000', ':5173');
                            const verifyPassUrl = v.verifyUrl || `${webBase}/verify-gate-pass?type=visitor&code=${encodeURIComponent(pCode)}`;
                            const qr = v.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyPassUrl)}`;
                            setGeneratedPass({ ...v, verifyUrl: verifyPassUrl, qrUrl: qr });
                          }}
                        >
                          <Text style={styles.viewPassBtnText}>🔍 Pass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.gateActionBtn,
                            isInside ? styles.gateActionBtnLogout : styles.gateActionBtnLogin,
                            isBusy && { opacity: 0.6 },
                          ]}
                          onPress={() => (isInside ? handleVisitorOut(v) : handleVisitorIn(v))}
                          disabled={isBusy}
                          activeOpacity={0.8}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.gateActionBtnText}>
                              {isInside ? '➔ Campus Out' : '➔ Campus In'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PRE-REGISTERED VISITORS                                 */}
        {/* ============================================================== */}
        {activeSection === 'pre_visitors' && (
          <View>

            {/* Header + Pre-Register Button */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>📅 Pre-Registered Guests ({preRegisteredVisitorsList.length})</Text>
                <Text style={styles.sectionSub}>Scheduled visitors, guest lectures & vendor appointments</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setShowPreRegisterForm(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Schedule Guest</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search scheduled guests by name, pass #, host..."
              placeholderTextColor="#94A3B8"
              value={preSearch}
              onChangeText={setPreSearch}
              clearButtonMode="while-editing"
            />

            {/* Filter Pills */}
            <View style={styles.filterGroupRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'all', label: `All Scheduled (${preRegisteredVisitorsList.length})` },
                  { id: 'awaiting', label: `⏳ Awaiting Arrival (${preAwaitingCount})` },
                  { id: 'inside', label: `● Admitted (${preInsideCount})` },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.filterPill, preFilter === f.id && styles.filterPillActive]}
                    onPress={() => setPreFilter(f.id as DirectoryFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, preFilter === f.id && styles.filterPillTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Pre-Registered Visitors List */}
            {displayedPreVisitors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📅</Text>
                <Text style={styles.emptyStateTitle}>No Pre-Registered Guests Found</Text>
                <Text style={styles.emptyStateSub}>No scheduled visitor records match the filter.</Text>
              </View>
            ) : (
              displayedPreVisitors.map((pv) => {
                const isInside = (pv.status || '').toLowerCase().includes('inside');
                const isBusy = performingId === (pv.visitorId || pv.passNumber || pv._id);

                return (
                  <View key={pv.visitorId || pv.passNumber || pv._id} style={styles.visitorCard}>
                    <View style={styles.visitorCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitorName}>{pv.name}</Text>
                        <Text style={styles.visitorHost}>
                          Host: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{pv.personToMeet || 'Department'}</Text>
                          {pv.department ? ` (${pv.department})` : ''}
                        </Text>
                      </View>
                      <View style={[styles.passNumberBadge, { backgroundColor: '#4338CA' }]}>
                        <Text style={styles.passNumberBadgeText}>{pv.passNumber || pv.visitorId}</Text>
                      </View>
                    </View>

                    <Text style={styles.visitorDetailText}>Purpose: {pv.purpose || 'Campus Visit'}</Text>
                    {pv.expectedDate ? (
                      <Text style={styles.visitorDetailText}>
                        Scheduled: 🕒 {pv.expectedDate} {pv.expectedTime || ''}
                      </Text>
                    ) : null}
                    {pv.phone ? <Text style={styles.visitorDetailText}>Phone: 📞 {pv.phone}</Text> : null}

                    <View style={styles.visitorCardFooter}>
                      <View style={[styles.statusPill, isInside ? styles.statusPillInside : { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.statusPillText, isInside ? styles.statusPillTextInside : { color: '#B45309' }]}>
                          {isInside ? '● INSIDE CAMPUS' : '⏳ AWAITING ARRIVAL'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.viewPassBtn}
                          onPress={() => {
                            const pCode = pv.passNumber || pv.visitorId;
                            const webBase = getCurrentBaseUrl().replace('/api', '').replace(':5000', ':5173');
                            const verifyPassUrl = pv.verifyUrl || `${webBase}/verify-gate-pass?type=visitor&code=${encodeURIComponent(pCode)}`;
                            const qr = pv.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyPassUrl)}`;
                            setGeneratedPass({ ...pv, verifyUrl: verifyPassUrl, qrUrl: qr });
                          }}
                        >
                          <Text style={styles.viewPassBtnText}>🔍 Pass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.gateActionBtn,
                            isInside ? styles.gateActionBtnLogout : styles.gateActionBtnLogin,
                            isBusy && { opacity: 0.6 },
                          ]}
                          onPress={() => (isInside ? handleVisitorOut(pv) : handleVisitorIn(pv))}
                          disabled={isBusy}
                          activeOpacity={0.8}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.gateActionBtnText}>
                              {isInside ? '➔ Campus Out' : '➔ Admit (In)'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DEDICATED VISITOR QR SCANNER                            */}
        {/* ============================================================== */}
        {activeSection === 'scanner' && (
          <View style={styles.card}>
            <View style={styles.sectionHeadingBlock}>
              <Text style={styles.sectionTitle}>📷 Dedicated Visitor QR Scanner</Text>
              <Text style={styles.sectionSubtitle}>
                Scan & verify Visitor passes (PASS-xxxx, VIS-xxxx). Rejects Student/Staff/HOD passes.
              </Text>
            </View>

            {/* Viewfinder Frame */}
            <View style={styles.scannerViewport}>
              <View style={styles.viewfinderBox}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <Text style={styles.scanTargetIcon}>📷</Text>
                <Text style={styles.scanTargetText}>Position Visitor QR Pass</Text>
                <Text style={{ fontSize: 11, color: '#FCD34D', marginTop: 4, fontWeight: '600' }}>
                  Visitors & Pre-Visitors Only
                </Text>
              </View>
            </View>

            {/* Manual Pass Code Input */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Or Enter Visitor Pass Number:</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="e.g. PASS-8411, PASS-9264, VIS-..."
                placeholderTextColor="#94A3B8"
                value={scanPassCode}
                onChangeText={setScanPassCode}
                autoCapitalize="characters"
                clearButtonMode="while-editing"
              />
              <TouchableOpacity
                style={styles.verifyBtnPrimary}
                onPress={() => handleLookupVisitorPass()}
                activeOpacity={0.8}
                disabled={scanLoading}
              >
                {scanLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyBtnPrimaryText}>🔍 Verify Pass</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Demo Visitor Pass Shortcuts */}
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>
                Active Visitor Pass Shortcuts:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {allVisitors.slice(0, 6).map((v) => {
                  const pass = v.passNumber || v.visitorId;
                  const isInside = (v.status || '').toLowerCase().includes('inside');
                  return (
                    <TouchableOpacity
                      key={pass}
                      style={[
                        styles.shortcutPill,
                        isInside ? { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' } : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                      ]}
                      onPress={() => {
                        setScanPassCode(pass);
                        handleLookupVisitorPass(pass);
                      }}
                    >
                      <Text style={[styles.shortcutPillText, isInside ? { color: '#166534' } : { color: '#92400E' }]}>
                        {isInside ? '● In: ' : '○ Reg: '}{pass} ({v.name})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Scanned Visitor Dossier Card */}
            {scannedVisitor && (
              <View style={styles.scannedResultCard}>
                <Text style={styles.scannedCardTitle}>✓ Visitor Pass Verified</Text>
                <Text style={styles.scannedName}>{scannedVisitor.name}</Text>
                <Text style={styles.scannedDetails}>
                  Pass: <Text style={{ fontWeight: '700' }}>{scannedVisitor.passNumber || scannedVisitor.visitorId}</Text>
                  {scannedVisitor.isPreRegistered ? ' • Pre-Registered Guest' : ' • Walk-In Visitor'}
                </Text>
                <Text style={styles.scannedDetails}>
                  Host: <Text style={{ fontWeight: '700' }}>{scannedVisitor.personToMeet || 'General'}</Text>
                  {scannedVisitor.department ? ` (${scannedVisitor.department})` : ''}
                </Text>
                <Text style={styles.scannedDetails}>Purpose: {scannedVisitor.purpose || 'Official'}</Text>
                <Text style={styles.scannedDetails}>
                  Status:{' '}
                  <Text style={{ fontWeight: '800', color: (scannedVisitor.status || '').includes('Inside') ? '#10B981' : '#B45309' }}>
                    {scannedVisitor.status || 'Registered'}
                  </Text>
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[
                      styles.gateActionBtn,
                      styles.gateActionBtnLogin,
                      { flex: 1, paddingVertical: 12 },
                      ((scannedVisitor.status || '').toLowerCase().includes('inside') || scanActionLoading) && { opacity: 0.5 },
                    ]}
                    onPress={() => handleVisitorIn(scannedVisitor)}
                    disabled={(scannedVisitor.status || '').toLowerCase().includes('inside') || scanActionLoading}
                  >
                    <Text style={[styles.gateActionBtnText, { fontSize: 13 }]}>➔ Authorize In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gateActionBtn,
                      styles.gateActionBtnLogout,
                      { flex: 1, paddingVertical: 12 },
                      (!(scannedVisitor.status || '').toLowerCase().includes('inside') || scanActionLoading) && { opacity: 0.5 },
                    ]}
                    onPress={() => handleVisitorOut(scannedVisitor)}
                    disabled={!(scannedVisitor.status || '').toLowerCase().includes('inside') || scanActionLoading}
                  >
                    <Text style={[styles.gateActionBtnText, { fontSize: 13 }]}>➔ Authorize Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: REGISTER NEW VISITOR FORM                             */}
      {/* ============================================================== */}
      <Modal visible={showRegisterForm} animationType="slide" transparent={false} onRequestClose={() => setShowRegisterForm(false)}>
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>📝 Register New Visitor</Text>
            <TouchableOpacity onPress={() => setShowRegisterForm(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={styles.fieldLabel}>Visitor Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. R. Ananth Kumar"
              placeholderTextColor="#94A3B8"
              value={formName}
              onChangeText={setFormName}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>10-Digit Mobile Phone *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 98402 12345"
              placeholderTextColor="#94A3B8"
              value={formPhone}
              onChangeText={setFormPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Purpose of Visit *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PURPOSES.slice(0, 5).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.choicePill, formPurpose === p && styles.choicePillActive]}
                  onPress={() => setFormPurpose(p)}
                >
                  <Text style={[styles.choicePillText, formPurpose === p && styles.choicePillTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Person to Meet / Host *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dr. Ramesh / Admissions"
              placeholderTextColor="#94A3B8"
              value={formPersonToMeet}
              onChangeText={setFormPersonToMeet}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Department</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Computer Science, Admissions, Accounts"
              placeholderTextColor="#94A3B8"
              value={formDepartment}
              onChangeText={setFormDepartment}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Vehicle Number (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. TN-09-AB-1234"
              placeholderTextColor="#94A3B8"
              value={formVehicle}
              onChangeText={setFormVehicle}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.actionBtnPrimary, { marginTop: 24, paddingVertical: 14 }]}
              onPress={handleRegisterVisitorSubmit}
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.actionBtnPrimaryText, { fontSize: 14, textAlign: 'center' }]}>
                  ✓ Register & Generate QR Pass
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: PRE-REGISTER GUEST FORM                               */}
      {/* ============================================================== */}
      <Modal visible={showPreRegisterForm} animationType="slide" transparent={false} onRequestClose={() => setShowPreRegisterForm(false)}>
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>📅 Schedule Pre-Registered Guest</Text>
            <TouchableOpacity onPress={() => setShowPreRegisterForm(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={styles.fieldLabel}>Guest Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dr. V. Swaminathan"
              placeholderTextColor="#94A3B8"
              value={preName}
              onChangeText={setPreName}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>10-Digit Mobile Phone *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 98402 12345"
              placeholderTextColor="#94A3B8"
              value={prePhone}
              onChangeText={setPrePhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Host Faculty / Inviter *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Prof. Anandha Kumar (CSE)"
              placeholderTextColor="#94A3B8"
              value={preHost}
              onChangeText={setPreHost}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Expected Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={preDate}
              onChangeText={setPreDate}
            />

            <TouchableOpacity
              style={[styles.actionBtnPrimary, { marginTop: 24, paddingVertical: 14, backgroundColor: '#4338CA' }]}
              onPress={handlePreRegisterSubmit}
              disabled={preSubmitting}
            >
              {preSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.actionBtnPrimaryText, { fontSize: 14, textAlign: 'center' }]}>
                  ✓ Schedule Guest Appointment
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: DIGITAL QR PASS VIEW                                  */}
      {/* ============================================================== */}
      {generatedPass && (
        <Modal visible={!!generatedPass} animationType="fade" transparent={true} onRequestClose={() => setGeneratedPass(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.passModalCard}>
              <View style={styles.passModalHeader}>
                <Text style={styles.passModalTitle}>CAMPUS VISITOR PASS</Text>
                <TouchableOpacity onPress={() => setGeneratedPass(null)}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Image
                  source={{ uri: generatedPass.qrUrl }}
                  style={{ width: 180, height: 180, borderRadius: 8 }}
                  resizeMode="contain"
                />
                <Text style={styles.passCardNumber}>{generatedPass.passNumber || generatedPass.visitorId}</Text>
                <Text style={styles.passCardName}>{generatedPass.name}</Text>
                <Text style={styles.passCardDetail}>Host: {generatedPass.personToMeet} ({generatedPass.department || 'General'})</Text>
                <Text style={styles.passCardDetail}>Purpose: {generatedPass.purpose}</Text>
                <Text style={[styles.passCardDetail, { fontWeight: '800', marginTop: 4, color: (generatedPass.status || '').includes('Inside') ? '#16A34A' : '#D97706' }]}>
                  Status: {(generatedPass.status || '').includes('Inside') ? '● INSIDE CAMPUS' : (generatedPass.status || '○ REGISTERED')}
                </Text>

                {generatedPass.verifyUrl && (
                  <TouchableOpacity
                    style={{
                      marginTop: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      backgroundColor: '#EFF6FF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                    }}
                    onPress={() => {
                      Linking.openURL(generatedPass.verifyUrl).catch(() =>
                        Alert.alert('Pass URL', generatedPass.verifyUrl)
                      );
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '700' }}>
                      🔗 Open Pass Clearance Page
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.gateActionBtn,
                    styles.gateActionBtnLogin,
                    { flex: 1, paddingVertical: 10 },
                    (generatedPass.status || '').includes('Inside') && { opacity: 0.5 },
                  ]}
                  onPress={async () => {
                    await handleVisitorIn(generatedPass);
                    setGeneratedPass((prev: any) => ({ ...prev, status: 'Inside Campus' }));
                  }}
                  disabled={(generatedPass.status || '').includes('Inside')}
                >
                  <Text style={styles.gateActionBtnText}>➔ Campus In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gateActionBtn,
                    styles.gateActionBtnLogout,
                    { flex: 1, paddingVertical: 10 },
                    !(generatedPass.status || '').includes('Inside') && { opacity: 0.5 },
                  ]}
                  onPress={async () => {
                    await handleVisitorOut(generatedPass);
                    setGeneratedPass((prev: any) => ({ ...prev, status: 'Exited' }));
                  }}
                  disabled={!(generatedPass.status || '').includes('Inside')}
                >
                  <Text style={styles.gateActionBtnText}>➔ Campus Out</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionBtnPrimary, { marginTop: 6, paddingVertical: 10, backgroundColor: '#64748B' }]}
                onPress={() => setGeneratedPass(null)}
              >
                <Text style={[styles.actionBtnPrimaryText, { textAlign: 'center' }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
    paddingVertical: 8,
  },
  navBar: {
    paddingHorizontal: 12,
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  navBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  navBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  metricSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionBtnPrimary: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  filterGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  visitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  visitorCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  visitorHost: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  passNumberBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passNumberBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  visitorDetailText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  visitorCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillInside: {
    backgroundColor: '#DCFCE7',
  },
  statusPillOutside: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextInside: {
    color: '#15803D',
  },
  statusPillTextOutside: {
    color: '#64748B',
  },
  viewPassBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  viewPassBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  gateActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateActionBtnLogin: {
    backgroundColor: '#059669',
  },
  gateActionBtnLogout: {
    backgroundColor: '#DC2626',
  },
  gateActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeadingBlock: {
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  scannerViewport: {
    height: 190,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: 210,
    height: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#F59E0B',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanTargetIcon: { fontSize: 30, marginBottom: 4 },
  scanTargetText: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
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
  verifyBtnPrimary: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shortcutPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  shortcutPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scannedResultCard: {
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
  },
  scannedCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  scannedName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scannedDetails: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  choicePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  choicePillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  choicePillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  passModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  passModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  passModalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  passCardNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
    marginTop: 10,
  },
  passCardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  passCardDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
});
