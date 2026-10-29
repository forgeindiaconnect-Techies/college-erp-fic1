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
import { apiGet, apiPost, getCurrentBaseUrl, type MobileUser } from '../../services/api';
import WatchmanRegisterPersonModal, { PersonType } from './WatchmanRegisterPersonModal';

type Props = {
  user: MobileUser;
  assignedGate?: string;
  onNavigateHome?: () => void;
};

// 3 Distinct Tabs for Gate Operations: Student, Staff, and HOD
export type GateSubTab = 'student' | 'staff' | 'hod';
type StatusFilter = 'All' | 'Inside' | 'Outside';

export default function WatchmanGateOperations({
  user,
  assignedGate = 'Gate 1 (Main Entrance)',
}: Props) {
  // Sub-tabs: 'student', 'staff', 'hod'
  const [activeSubTab, setActiveSubTab] = useState<GateSubTab>('student');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [performingActionId, setPerformingActionId] = useState<string | null>(null);

  // Unified Campus Members (Students, Staff, HOD) from Backend
  const [membersList, setMembersList] = useState<any[]>([]);

  // Per-Tab Search and Status Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<StatusFilter>('All');

  const [staffSearch, setStaffSearch] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<StatusFilter>('All');

  const [hodSearch, setHodSearch] = useState('');
  const [hodStatusFilter, setHodStatusFilter] = useState<StatusFilter>('All');

  // SELECTED MEMBER FOR FULL PASS & CLEARANCE MODAL (Matching Web Right-Side Panel)
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [movementRemarks, setMovementRemarks] = useState('');
  const [memberMovements, setMemberMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Register Person Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerInitialType, setRegisterInitialType] = useState<PersonType>('Student');

  // ----------------------------------------------------------------------
  // LOAD REAL DATA (Campus People, Movements, Scans)
  // ----------------------------------------------------------------------
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      const [peopleRes, staffDirRes, stuScansRes] = await Promise.allSettled([
        apiGet<any>('watchman/campus-people'),
        apiGet<any>('watchman/staff-directory'),
        apiGet<any>('watchman/student-today-scans'),
      ]);

      let list: any[] = [];
      if (peopleRes.status === 'fulfilled' && peopleRes.value) {
        const raw = Array.isArray(peopleRes.value.data)
          ? peopleRes.value.data
          : Array.isArray(peopleRes.value)
          ? peopleRes.value
          : [];
        list = raw;
      }

      const map = new Map<string, any>();
      list.forEach((p) => {
        const key = (p.personId || p._id || p.id || '').toUpperCase();
        if (key) map.set(key, p);
      });

      if (staffDirRes.status === 'fulfilled' && Array.isArray(staffDirRes.value)) {
        staffDirRes.value.forEach((s: any) => {
          const key = (s.staffId || s.id || s.employeeId || '').toUpperCase();
          if (key && !map.has(key)) {
            const isHod = /hod|head/i.test(s.designation || '') || /hod/i.test(s.role || '');
            map.set(key, {
              ...s,
              personId: key,
              name: s.name || s.staffName,
              personType: isHod ? 'HOD' : 'Staff',
              department: s.department || s.dept || 'General',
              currentStatus: s.currentStatus || 'Outside Campus',
            });
          }
        });
      }

      if (stuScansRes.status === 'fulfilled' && Array.isArray(stuScansRes.value)) {
        stuScansRes.value.forEach((st: any) => {
          const key = (st.studentId || st.rollNo || st.id || '').toUpperCase();
          if (key && !map.has(key)) {
            map.set(key, {
              ...st,
              personId: key,
              name: st.studentName || st.name,
              personType: 'Student',
              department: st.department || 'General',
              currentStatus: st.currentStatus || 'Outside Campus',
            });
          }
        });
      }

      setMembersList(Array.from(map.values()));
    } catch (err) {
      console.warn('WatchmanGateOperations load error:', err);
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
  // FILTERED LISTS PER TAB
  // ----------------------------------------------------------------------
  const allStudents = useMemo(() => {
    return membersList.filter((m) => (m.personType || '').toUpperCase() === 'STUDENT');
  }, [membersList]);

  const allStaff = useMemo(() => {
    return membersList.filter((m) => (m.personType || '').toUpperCase() === 'STAFF');
  }, [membersList]);

  const allHODs = useMemo(() => {
    return membersList.filter((m) => (m.personType || '').toUpperCase() === 'HOD');
  }, [membersList]);

  // Filtered Students
  const displayedStudents = useMemo(() => {
    let pool = allStudents;
    if (studentStatusFilter === 'Inside') {
      pool = pool.filter((m) => (m.currentStatus || m.status || '').toLowerCase().includes('inside'));
    } else if (studentStatusFilter === 'Outside') {
      pool = pool.filter((m) => !(m.currentStatus || m.status || '').toLowerCase().includes('inside'));
    }
    if (!studentSearch.trim()) return pool;
    const q = studentSearch.toLowerCase().trim();
    return pool.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const id = (m.personId || m.rollNo || '').toLowerCase();
      const dept = (m.department || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q) || phone.includes(q);
    });
  }, [allStudents, studentStatusFilter, studentSearch]);

  // Filtered Staff
  const displayedStaff = useMemo(() => {
    let pool = allStaff;
    if (staffStatusFilter === 'Inside') {
      pool = pool.filter((m) => (m.currentStatus || m.status || '').toLowerCase().includes('inside'));
    } else if (staffStatusFilter === 'Outside') {
      pool = pool.filter((m) => !(m.currentStatus || m.status || '').toLowerCase().includes('inside'));
    }
    if (!staffSearch.trim()) return pool;
    const q = staffSearch.toLowerCase().trim();
    return pool.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const id = (m.personId || m.staffId || '').toLowerCase();
      const dept = (m.department || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q) || phone.includes(q);
    });
  }, [allStaff, staffStatusFilter, staffSearch]);

  // Filtered HODs
  const displayedHODs = useMemo(() => {
    let pool = allHODs;
    if (hodStatusFilter === 'Inside') {
      pool = pool.filter((m) => (m.currentStatus || m.status || '').toLowerCase().includes('inside'));
    } else if (hodStatusFilter === 'Outside') {
      pool = pool.filter((m) => !(m.currentStatus || m.status || '').toLowerCase().includes('inside'));
    }
    if (!hodSearch.trim()) return pool;
    const q = hodSearch.toLowerCase().trim();
    return pool.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const id = (m.personId || m.staffId || m.hodId || '').toLowerCase();
      const dept = (m.department || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q) || phone.includes(q);
    });
  }, [allHODs, hodStatusFilter, hodSearch]);

  const studentInside = allStudents.filter((m) => (m.currentStatus || m.status || '').toLowerCase().includes('inside')).length;
  const studentOutside = allStudents.length - studentInside;

  const staffInside = allStaff.filter((m) => (m.currentStatus || m.status || '').toLowerCase().includes('inside')).length;
  const staffOutside = allStaff.length - staffInside;

  const hodInside = allHODs.filter((m) => (m.currentStatus || m.status || '').toLowerCase().includes('inside')).length;
  const hodOutside = allHODs.length - hodInside;

  // ----------------------------------------------------------------------
  // OPEN DEDICATED MEMBER PASS & CLEARANCE MODAL (When clicking any person)
  // ----------------------------------------------------------------------
  const handleSelectMember = async (person: any) => {
    if (!person) return;
    const pId = person.personId || person.id || person.rollNo || person.staffId;
    setSelectedMember(person);
    setMovementRemarks('');
    setMemberMovements([]);

    try {
      setLoadingMovements(true);
      // Fetch movements for this person
      const res = await apiGet<any>(`watchman/campus-people/lookup/${encodeURIComponent(pId)}?module=gate_operations`);
      if (res?.success && res?.person) {
        setSelectedMember(res.person);
        setMemberMovements(res.movements || []);
      }
    } catch (e) {
      // Keep selectedMember from local state if network fetch fails
    } finally {
      setLoadingMovements(false);
    }
  };

  // ----------------------------------------------------------------------
  // DEDICATED MEMBER GATE IN / OUT HANDLERS
  // ----------------------------------------------------------------------
  const handleMemberCampusIn = async (person: any) => {
    const pId = person.personId || person.id || person.rollNo || person.staffId;
    const pName = person.name || 'Member';
    const isInside = (person.currentStatus || person.status || '').toLowerCase().includes('inside');

    if (isInside) {
      Alert.alert(
        '⚠️ Already Inside Campus',
        `${pName} (${pId}) is already marked as INSIDE campus.`
      );
      return;
    }

    try {
      setPerformingActionId(pId);
      const res = await apiPost<any>('watchman/campus-in', {
        personId: pId,
        gate: assignedGate,
        remarks: movementRemarks.trim() || 'Gate Operations Entry Verification',
      });

      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Could not record entry.');
      } else {
        Alert.alert(
          '✓ Campus In Recorded',
          `${pName} (${pId}) has been successfully logged INSIDE campus through ${assignedGate}.`
        );
        const updated = { ...person, currentStatus: 'Inside Campus', lastEntryTime: new Date() };
        if (selectedMember && (selectedMember.personId === pId || selectedMember.id === pId)) {
          setSelectedMember(updated);
        }
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Action Notice', err?.message || `Updated entry for ${pName}.`);
      await loadData();
    } finally {
      setPerformingActionId(null);
    }
  };

  const handleMemberCampusOut = async (person: any) => {
    const pId = person.personId || person.id || person.rollNo || person.staffId;
    const pName = person.name || 'Member';
    const isInside = (person.currentStatus || person.status || '').toLowerCase().includes('inside');

    if (!isInside) {
      Alert.alert(
        '⚠️ Already Outside Campus',
        `${pName} (${pId}) is currently marked as OUTSIDE campus.`
      );
      return;
    }

    try {
      setPerformingActionId(pId);
      const res = await apiPost<any>('watchman/campus-out', {
        personId: pId,
        gate: assignedGate,
        remarks: movementRemarks.trim() || 'Gate Operations Exit Verification',
      });

      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Could not record departure.');
      } else {
        Alert.alert(
          '✓ Campus Out Recorded',
          `${pName} (${pId}) is now logged OUTSIDE campus through ${assignedGate}.`
        );
        const updated = { ...person, currentStatus: 'Outside Campus', lastExitTime: new Date() };
        if (selectedMember && (selectedMember.personId === pId || selectedMember.id === pId)) {
          setSelectedMember(updated);
        }
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Action Notice', err?.message || `Updated departure for ${pName}.`);
      await loadData();
    } finally {
      setPerformingActionId(null);
    }
  };



  // ----------------------------------------------------------------------
  // REUSABLE MEMBER ROW RENDERER (CLICK OPENS EXACT INDIVIDUAL PASS)
  // ----------------------------------------------------------------------
  const renderMemberRow = (m: any) => {
    const isInside = (m.currentStatus || m.status || '').toLowerCase().includes('inside');
    const isBusy = performingActionId === (m.personId || m.id);
    const pRole = (m.personType || 'MEMBER').toUpperCase();

    const roleBadgeColor =
      pRole === 'HOD' ? '#F59E0B' : pRole === 'STAFF' ? '#06B6D4' : '#6366F1';

    return (
      <TouchableOpacity
        key={m.personId || m.id || m._id}
        style={[styles.memberCard, selectedMember?.personId === m.personId && styles.memberCardSelected]}
        onPress={() => handleSelectMember(m)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={[styles.avatarCircle, { backgroundColor: isInside ? '#DCFCE7' : '#F1F5F9' }]}>
          <Text style={[styles.avatarText, { color: isInside ? '#16A34A' : '#64748B' }]}>
            {(m.name || 'M').charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Member Details */}
        <View style={styles.memberInfoCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.memberName}>{m.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor }]}>
              <Text style={styles.roleBadgeText}>{pRole}</Text>
            </View>
          </View>

          <Text style={styles.memberSubDetails}>
            {m.personId || m.rollNo || m.staffId} • {m.department || 'General'}
            {m.phone ? ` • 📞 ${m.phone}` : ''}
          </Text>

          {/* Status Badge */}
          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusPill, isInside ? styles.statusPillInside : styles.statusPillOutside]}>
              <Text style={[styles.statusPillText, isInside ? styles.statusPillTextInside : styles.statusPillTextOutside]}>
                {isInside ? '● INSIDE' : '○ OUTSIDE'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '700' }}>Tap to view pass ➔</Text>
          </View>
        </View>

        {/* 1-Tap Login / Logout Action Button */}
        <TouchableOpacity
          style={[
            styles.gateActionBtn,
            isInside ? styles.gateActionBtnLogout : styles.gateActionBtnLogin,
            isBusy && { opacity: 0.6 },
          ]}
          onPress={(e) => {
            if (isInside) {
              handleMemberCampusOut(m);
            } else {
              handleMemberCampusIn(m);
            }
          }}
          disabled={isBusy}
          activeOpacity={0.8}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.gateActionBtnText}>
              {isInside ? '➔ Logout' : '➔ Login'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ============================================================== */}
      {/* 3 SEPARATE SUB-NAV TABS: STUDENTS, STAFF, HOD                  */}
      {/* ============================================================== */}
      <View style={styles.navBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navBar}>
          {[
            { id: 'student', label: `🎓 Students (${allStudents.length})` },
            { id: 'staff', label: `👔 Staff (${allStaff.length})` },
            { id: 'hod', label: `🏛️ HOD (${allHODs.length})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.navBtn, activeSubTab === tab.id && styles.navBtnActive]}
              onPress={() => setActiveSubTab(tab.id as GateSubTab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navBtnText, activeSubTab === tab.id && styles.navBtnTextActive]}>
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
        {/* TAB 1: STUDENTS DIRECTORY                                      */}
        {/* ============================================================== */}
        {activeSubTab === 'student' && (
          <View>
            {/* Header & Register Student Button (Metrics cards removed) */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>🎓 Student Movement Register ({allStudents.length})</Text>
                <Text style={styles.sectionSub}>Tap any student to open their pass & security clearance</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  setRegisterInitialType('Student');
                  setRegisterModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Register Student</Text>
              </TouchableOpacity>
            </View>

            {/* Student Search */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search students by name, roll no, department..."
              placeholderTextColor="#94A3B8"
              value={studentSearch}
              onChangeText={setStudentSearch}
              clearButtonMode="while-editing"
            />

            {/* Status Filter Pills */}
            <View style={styles.filterGroupRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'All', label: `All Students (${allStudents.length})` },
                  { id: 'Inside', label: `● Inside (${studentInside})` },
                  { id: 'Outside', label: `○ Outside (${studentOutside})` },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.filterPill, studentStatusFilter === s.id && styles.filterPillActive]}
                    onPress={() => setStudentStatusFilter(s.id as StatusFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, studentStatusFilter === s.id && styles.filterPillTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Student List */}
            {displayedStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🎓</Text>
                <Text style={styles.emptyStateTitle}>No Students Found</Text>
                <Text style={styles.emptyStateSub}>No student records match the active search or filter.</Text>
              </View>
            ) : (
              displayedStudents.map((m) => renderMemberRow(m))
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: STAFF DIRECTORY                                         */}
        {/* ============================================================== */}
        {activeSubTab === 'staff' && (
          <View>
            {/* Header & Register Staff Button (Metrics cards removed) */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>👔 Staff Entry Register ({allStaff.length})</Text>
                <Text style={styles.sectionSub}>Tap any staff member to open their pass & security clearance</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  setRegisterInitialType('Staff');
                  setRegisterModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Register Staff</Text>
              </TouchableOpacity>
            </View>

            {/* Staff Search */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search staff by name, staff ID, department..."
              placeholderTextColor="#94A3B8"
              value={staffSearch}
              onChangeText={setStaffSearch}
              clearButtonMode="while-editing"
            />

            {/* Status Filter Pills */}
            <View style={styles.filterGroupRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'All', label: `All Staff (${allStaff.length})` },
                  { id: 'Inside', label: `● Inside (${staffInside})` },
                  { id: 'Outside', label: `○ Outside (${staffOutside})` },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.filterPill, staffStatusFilter === s.id && styles.filterPillActive]}
                    onPress={() => setStaffStatusFilter(s.id as StatusFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, staffStatusFilter === s.id && styles.filterPillTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Staff List */}
            {displayedStaff.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>👔</Text>
                <Text style={styles.emptyStateTitle}>No Staff Members Found</Text>
                <Text style={styles.emptyStateSub}>No staff records match the current filter.</Text>
              </View>
            ) : (
              displayedStaff.map((m) => renderMemberRow(m))
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: HOD DIRECTORY                                           */}
        {/* ============================================================== */}
        {activeSubTab === 'hod' && (
          <View>
            {/* Header & Register HOD Button (Metrics cards removed) */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>🏛️ HOD Movement Register ({allHODs.length})</Text>
                <Text style={styles.sectionSub}>Tap any HOD to open their pass & security clearance</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  setRegisterInitialType('HOD');
                  setRegisterModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Register HOD</Text>
              </TouchableOpacity>
            </View>

            {/* HOD Search */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search HODs by name, department..."
              placeholderTextColor="#94A3B8"
              value={hodSearch}
              onChangeText={setHodSearch}
              clearButtonMode="while-editing"
            />

            {/* Status Filter Pills */}
            <View style={styles.filterGroupRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'All', label: `All HODs (${allHODs.length})` },
                  { id: 'Inside', label: `● Inside (${hodInside})` },
                  { id: 'Outside', label: `○ Outside (${hodOutside})` },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.filterPill, hodStatusFilter === s.id && styles.filterPillActive]}
                    onPress={() => setHodStatusFilter(s.id as StatusFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, hodStatusFilter === s.id && styles.filterPillTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* HOD List */}
            {displayedHODs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🏛️</Text>
                <Text style={styles.emptyStateTitle}>No HODs Found</Text>
                <Text style={styles.emptyStateSub}>No HOD records match the search filter.</Text>
              </View>
            ) : (
              displayedHODs.map((m) => renderMemberRow(m))
            )}
          </View>
        )}


      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL: INDIVIDUAL MEMBER PASS & SECURITY CLEARANCE (WEB PANEL) */}
      {/* ============================================================== */}
      {selectedMember && (
        <Modal
          visible={!!selectedMember}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedMember(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Security Clearance & Pass</Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  {selectedMember.personType} • {selectedMember.personId}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {/* Status Banner (Matching Web Image 3) */}
              {(() => {
                const isInside = (selectedMember.currentStatus || '').toLowerCase().includes('inside');
                return (
                  <View
                    style={[
                      styles.clearanceStatusBanner,
                      isInside ? styles.statusBannerInside : styles.statusBannerOutside,
                    ]}
                  >
                    <Text style={styles.statusBannerIcon}>{isInside ? '✓' : '🕒'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.statusBannerTitle,
                          { color: isInside ? '#065F46' : '#1E40AF' },
                        ]}
                      >
                        {isInside
                          ? 'MEMBER CURRENTLY LOGGED IN (INSIDE CAMPUS)'
                          : 'MEMBER CURRENTLY LOGGED OUT (OUTSIDE CAMPUS)'}
                      </Text>
                      <Text style={[styles.statusBannerSub, { color: isInside ? '#047857' : '#1E3A8A' }]}>
                        {isInside
                          ? 'Inside campus. Ready for departure checkout.'
                          : 'Outside campus. Ready for security clearance & gate entry.'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Digital QR Pass Code Image */}
              <View style={styles.qrPassContainer}>
                {(() => {
                  const personCode = selectedMember.personId || selectedMember.id;
                  const webBase = getCurrentBaseUrl().replace('/api', '').replace(':5000', ':5173');
                  const rawVerify = selectedMember.verifyUrl || '';
                  const verifyPassUrl = (rawVerify && !rawVerify.includes('localhost') && !rawVerify.includes('127.0.0.1'))
                    ? rawVerify
                    : `${webBase}/verify-gate-pass?code=${encodeURIComponent(personCode)}`;
                  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyPassUrl)}`;

                  return (
                    <>
                      <Image
                        source={{ uri: qrUri }}
                        style={styles.qrPassImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.qrPassCodeText}>{selectedMember.personId}</Text>
                      <Text style={styles.qrPassHint}>Official Digital Security Pass</Text>

                      <TouchableOpacity
                        style={{
                          marginTop: 10,
                          paddingVertical: 7,
                          paddingHorizontal: 14,
                          backgroundColor: '#EFF6FF',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#BFDBFE',
                        }}
                        onPress={() => {
                          Linking.openURL(verifyPassUrl).catch(() =>
                            Alert.alert('Pass Verification URL', verifyPassUrl)
                          );
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '700' }}>
                          🔗 Open Pass Clearance Page
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>

              {/* Identity Header */}
              <View style={styles.clearanceProfileRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clearanceName}>{selectedMember.name}</Text>
                  <Text style={styles.clearanceSub}>
                    {selectedMember.department || 'General'} • {selectedMember.designation || selectedMember.personType}
                  </Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        selectedMember.personType === 'HOD'
                          ? '#F59E0B'
                          : selectedMember.personType === 'Staff'
                          ? '#06B6D4'
                          : '#6366F1',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    },
                  ]}
                >
                  <Text style={[styles.roleBadgeText, { fontSize: 11 }]}>{selectedMember.personType}</Text>
                </View>
              </View>

              {/* Details Info Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>CONTACT PHONE</Text>
                  <Text style={styles.detailValue}>📞 {selectedMember.phone || '—'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>VEHICLE #</Text>
                  <Text style={styles.detailValue}>🚗 {selectedMember.vehicleNumber || 'Pedestrian'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>LAST ENTRY TIME</Text>
                  <Text style={styles.detailValue}>
                    {selectedMember.lastEntryTime
                      ? new Date(selectedMember.lastEntryTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'None recorded'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>LAST EXIT TIME</Text>
                  <Text style={styles.detailValue}>
                    {selectedMember.lastExitTime
                      ? new Date(selectedMember.lastExitTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'None recorded'}
                  </Text>
                </View>
              </View>

              {/* Movement Remarks */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Movement Remarks (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Regular classes, Lab visit, Gate clearance..."
                placeholderTextColor="#94A3B8"
                value={movementRemarks}
                onChangeText={setMovementRemarks}
              />

              {/* TWO LARGE ACTION BUTTONS (Login / Campus In & Logout / Campus Out) */}
              {(() => {
                const isInside = (selectedMember.currentStatus || '').toLowerCase().includes('inside');
                const isBusy = performingActionId === selectedMember.personId;

                return (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
                    <TouchableOpacity
                      style={[
                        styles.gateActionBtn,
                        styles.gateActionBtnLogin,
                        { flex: 1, paddingVertical: 14 },
                        (isInside || isBusy) && { opacity: 0.4 },
                      ]}
                      onPress={() => handleMemberCampusIn(selectedMember)}
                      disabled={isInside || isBusy}
                      activeOpacity={0.8}
                    >
                      {isBusy ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.gateActionBtnText, { fontSize: 14 }]}>➔ Login / Campus In</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.gateActionBtn,
                        styles.gateActionBtnLogout,
                        { flex: 1, paddingVertical: 14 },
                        (!isInside || isBusy) && { opacity: 0.4 },
                      ]}
                      onPress={() => handleMemberCampusOut(selectedMember)}
                      disabled={!isInside || isBusy}
                      activeOpacity={0.8}
                    >
                      {isBusy ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.gateActionBtnText, { fontSize: 14 }]}>➔ Logout / Campus Out</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* Recent Movement History */}
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
                  Recent Movement History ({memberMovements.length})
                </Text>
                {loadingMovements ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : memberMovements.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                    No recorded movements today for this individual.
                  </Text>
                ) : (
                  memberMovements.slice(0, 5).map((mv, idx) => (
                    <View key={mv._id || idx} style={styles.movementItemRow}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: mv.type === 'IN' ? '#16A34A' : '#DC2626' }}>
                        {mv.type === 'IN' ? '➔ ENTRY' : '➔ EXIT'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(mv.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94A3B8' }}>{mv.gate || assignedGate}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Register Person Modal */}
      <WatchmanRegisterPersonModal
        visible={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        user={user}
        assignedGate={assignedGate}
        initialPersonType={registerInitialType}
        onRegistrationSuccess={async () => {
          setRegisterModalOpen(false);
          await loadData();
        }}
      />
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
    paddingHorizontal: 14,
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
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  memberCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  memberInfoCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  memberSubDetails: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  gateActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  gateActionBtnLogin: {
    backgroundColor: '#059669',
  },
  gateActionBtnLogout: {
    backgroundColor: '#DC2626',
  },
  gateActionBtnText: {
    fontSize: 12,
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
    width: 220,
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
    borderColor: '#38BDF8',
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shortcutPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
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
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
  clearanceStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  statusBannerInside: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
  },
  statusBannerOutside: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  statusBannerIcon: {
    fontSize: 22,
    fontWeight: '900',
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  qrPassContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  qrPassImage: {
    width: 170,
    height: 170,
    borderRadius: 8,
  },
  qrPassCodeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  qrPassHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  clearanceProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearanceName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearanceSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  detailsGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: '46%',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  movementItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
});
