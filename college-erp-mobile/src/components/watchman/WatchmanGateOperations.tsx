import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import WatchmanRegisterPersonModal, { PersonType } from './WatchmanRegisterPersonModal';

type Props = {
  user: MobileUser;
  assignedGate?: string;
  onNavigateHome?: () => void;
};

type GateSubTab = 'student' | 'staff' | 'hod' | 'qr_scanner';
type FilterStatus = 'inside' | 'all' | 'history';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)',
];

export default function WatchmanGateOperations({ user, assignedGate = 'Gate 1 (Main Entrance)' }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<GateSubTab>('student');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [performingActionId, setPerformingActionId] = useState<string | null>(null);

  // Register Person & Generate Gate Pass Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerInitialType, setRegisterInitialType] = useState<PersonType>('Student');

  // Student Register State
  const [studentFilter, setStudentFilter] = useState<FilterStatus>('inside');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDirectory, setStudentDirectory] = useState<any[]>([]);
  const [studentScans, setStudentScans] = useState<any[]>([]);
  const [studentMovements, setStudentMovements] = useState<any[]>([]);

  // Student QR Scanner State
  const [studentScanCode, setStudentScanCode] = useState('');
  const [scannedStudent, setScannedStudent] = useState<any | null>(null);
  const [scanningLoading, setScanningLoading] = useState(false);
  const [qrActionLoading, setQrActionLoading] = useState(false);

  // Student Movement Modal
  const [studentMovementModal, setStudentMovementModal] = useState(false);
  const [modalStudentId, setModalStudentId] = useState('');
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalMovementType, setModalMovementType] = useState('Outpass');
  const [modalReason, setModalReason] = useState('');
  const [modalParentContact, setModalParentContact] = useState('');
  const [submittingStudentMove, setSubmittingStudentMove] = useState(false);

  // Staff Register State
  const [staffFilter, setStaffFilter] = useState<FilterStatus>('inside');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDirectory, setStaffDirectory] = useState<any[]>([]);
  const [staffMovements, setStaffMovements] = useState<any[]>([]);

  // HOD Register State
  const [hodFilter, setHodFilter] = useState<'inside' | 'all'>('inside');
  const [hodSearch, setHodSearch] = useState('');
  const [campusPeople, setCampusPeople] = useState<any[]>([]);

  // Staff Movement Modal
  const [staffMovementModal, setStaffMovementModal] = useState(false);
  const [modalStaffId, setModalStaffId] = useState('');
  const [modalStaffName, setModalStaffName] = useState('');
  const [modalStaffDept, setModalStaffDept] = useState('');
  const [modalStaffDirection, setModalStaffDirection] = useState<'In' | 'Out'>('In');
  const [modalStaffReason, setModalStaffReason] = useState('Duty Shift');
  const [modalStaffVehicle, setModalStaffVehicle] = useState('');
  const [submittingStaffMove, setSubmittingStaffMove] = useState(false);

  // ----------------------------------------------------------------------
  // LOAD REAL DATA FROM BACKEND
  // ----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stuDirRes, stuScansRes, stuMovesRes, staffDirRes, staffMovesRes, campusPeopleRes] = await Promise.allSettled([
        apiGet<any>('watchman/student-qr-directory'),
        apiGet<any>('watchman/student-today-scans'),
        apiGet<any>('watchman/student-register'),
        apiGet<any>('watchman/staff-directory'),
        apiGet<any>('watchman/staff-register'),
        apiGet<any>('watchman/campus-people'),
      ]);

      if (stuDirRes.status === 'fulfilled') {
        const raw = Array.isArray(stuDirRes.value?.data) ? stuDirRes.value.data : Array.isArray(stuDirRes.value) ? stuDirRes.value : [];
        setStudentDirectory(raw);
      }
      if (stuScansRes.status === 'fulfilled') {
        const raw = Array.isArray(stuScansRes.value?.data) ? stuScansRes.value.data : Array.isArray(stuScansRes.value) ? stuScansRes.value : [];
        setStudentScans(raw);
      }
      if (stuMovesRes.status === 'fulfilled') {
        const raw = Array.isArray(stuMovesRes.value?.data) ? stuMovesRes.value.data : Array.isArray(stuMovesRes.value) ? stuMovesRes.value : [];
        setStudentMovements(raw);
      }
      if (staffDirRes.status === 'fulfilled') {
        const raw = Array.isArray(staffDirRes.value?.data) ? staffDirRes.value.data : Array.isArray(staffDirRes.value) ? staffDirRes.value : [];
        setStaffDirectory(raw);
      }
      if (staffMovesRes.status === 'fulfilled') {
        const raw = Array.isArray(staffMovesRes.value?.data) ? staffMovesRes.value.data : Array.isArray(staffMovesRes.value) ? staffMovesRes.value : [];
        setStaffMovements(raw);
      }
      if (campusPeopleRes.status === 'fulfilled') {
        const raw = Array.isArray(campusPeopleRes.value?.data) ? campusPeopleRes.value.data : Array.isArray(campusPeopleRes.value) ? campusPeopleRes.value : [];
        setCampusPeople(raw);
      }
    } catch (err) {
      console.warn('WatchmanGateOperations fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----------------------------------------------------------------------
  // UNIVERSAL GATE ACTION (Student, Staff, HOD, Visitor)
  // ----------------------------------------------------------------------
  const handleUniversalCheckinOut = async (person: any, direction: 'In' | 'Out') => {
    const pId = person.personId || person.id || person.staffId || person.studentId || person.passNumber;
    const pName = person.name || person.staffName || person.visitorName || pId;
    try {
      setPerformingActionId(pId);
      const endpoint = direction === 'In' ? 'watchman/campus-in' : 'watchman/campus-out';
      const res = await apiPost<any>(endpoint, {
        personId: pId,
        gate: assignedGate,
        remarks: `Gate Operations ${direction} verification`,
      });
      if (res?.success === false) {
        Alert.alert('Notice', res.message || `Could not complete ${direction}.`);
      } else {
        Alert.alert(`✓ ${direction} Recorded`, `${pName} (${pId}) recorded as ${direction === 'In' ? 'INSIDE' : 'OUTSIDE'} campus.`);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || `Could not record ${direction}.`);
    } finally {
      setPerformingActionId(null);
    }
  };

  // ----------------------------------------------------------------------
  // STUDENT GATE ATTENDANCE (Quick Check-in / Check-out)
  // ----------------------------------------------------------------------
  const handleStudentCheckin = async (student: any) => {
    const sId = student.studentId || student.id || student.rollNo;
    const sName = student.studentName || student.name || 'Student';
    try {
      setPerformingActionId(sId);
      const res = await apiPost<any>('watchman/student-checkin', {
        studentId: sId,
        gate: assignedGate,
        remarks: 'Mobile Gate Attendance Check-in',
      });
      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Student check-in could not be completed.');
      } else {
        Alert.alert('✓ Student Checked In', `${sName} (${sId}) recorded as INSIDE campus.`);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Check-in Failed', err?.message || 'Could not verify student.');
    } finally {
      setPerformingActionId(null);
    }
  };

  const handleStudentCheckout = async (student: any) => {
    const sId = student.studentId || student.id || student.rollNo;
    const sName = student.studentName || student.name || 'Student';
    try {
      setPerformingActionId(sId);
      const res = await apiPost<any>('watchman/student-checkout', {
        studentId: sId,
        gate: assignedGate,
        remarks: 'Mobile Gate Attendance Check-out',
      });
      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Student check-out could not be completed.');
      } else {
        Alert.alert('✓ Student Checked Out', `${sName} (${sId}) recorded as OUTSIDE campus.`);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Check-out Failed', err?.message || 'Could not record departure.');
    } finally {
      setPerformingActionId(null);
    }
  };

  // ----------------------------------------------------------------------
  // GATE OPERATIONS QR SCANNER LOOKUP (Students, Staff, HODs ONLY)
  // ----------------------------------------------------------------------
  const handleLookupStudentQr = async (codeToVerify?: string) => {
    const code = (codeToVerify || studentScanCode).trim();
    if (!code) {
      Alert.alert('Input Required', 'Please enter a Student ID, Roll Number, or Staff/HOD Gate Pass code to scan.');
      return;
    }
    try {
      setScanningLoading(true);
      setScannedStudent(null);

      // 0. Pre-check: Reject visitor codes starting with PASS-
      if (code.toUpperCase().startsWith('PASS-')) {
        Alert.alert(
          '⚠️ Visitor Pass Detected',
          'This is a Visitor QR pass. Gate Operations QR Scanner only accepts Students, Staff, and HODs.\n\nPlease scan this code under Visitor Management.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 1. Query backend Campus Person lookup with module=gate_operations
      try {
        const campusRes = await apiGet<any>(`watchman/campus-people/lookup/${encodeURIComponent(code)}?module=gate_operations`);
        if (campusRes?.isVisitorPass || campusRes?.person?.personType === 'Visitor') {
          Alert.alert(
            '⚠️ Visitor Pass Detected',
            `Visitor pass detected (${campusRes?.person?.name || campusRes?.name || code}).\n\nGate Operations is exclusively for Students, Staff, and HODs. Please use the Visitor QR Scanner in Visitor Management.`,
            [{ text: 'OK' }]
          );
          return;
        }

        if (campusRes?.success && campusRes?.person) {
          const cp = campusRes.person;
          if (cp.personType === 'Visitor') {
            Alert.alert(
              '⚠️ Visitor Pass Detected',
              `Visitor pass detected (${cp.name || code}).\n\nGate Operations is exclusively for Students, Staff, and HODs. Please use the Visitor QR Scanner in Visitor Management.`,
              [{ text: 'OK' }]
            );
            return;
          }

          setScannedStudent({
            ...cp,
            studentId: cp.personId,
            rollNo: cp.personId,
            name: cp.name,
            department: cp.department || 'General',
            year: cp.semester ? `Semester ${cp.semester}` : cp.designation || cp.personType,
            personType: cp.personType || 'Staff', // 'Student' | 'Staff' | 'HOD'
            assignedGate: cp.assignedGate || assignedGate,
            currentStatus: cp.currentStatus || 'Outside Campus',
            qrCodeUrl: cp.qrCodeUrl,
            phone: cp.phone,
            vehicleNumber: cp.vehicleNumber,
            isCampusPerson: true,
          });
          return;
        }
      } catch (cpErr: any) {
        if (cpErr?.isVisitorPass || cpErr?.message?.includes('Visitor pass detected') || cpErr?.message?.includes('Visitor Pass')) {
          Alert.alert(
            '⚠️ Visitor Pass Detected',
            cpErr.message || 'This is a Visitor QR pass. Please scan it under Visitor Management.',
            [{ text: 'OK' }]
          );
          return;
        }
        // Fallback to student-qr route below
      }

      // 2. Query Student QR route
      try {
        const res = await apiGet<any>(`watchman/student-qr/${encodeURIComponent(code)}`);
        if (res?.isVisitorPass) {
          Alert.alert(
            '⚠️ Visitor Pass Detected',
            res.message || 'This is a Visitor pass. Please use Visitor Management.',
            [{ text: 'OK' }]
          );
          return;
        }
        if (res?.success && res?.student) {
          setScannedStudent({
            ...res.student,
            personType: 'Student',
            assignedGate: assignedGate,
            currentStatus: res.currentStatus || 'Outside Campus',
            activeEntry: res.activeEntry,
          });
          return;
        }
      } catch (stuErr: any) {
        if (stuErr?.isVisitorPass || stuErr?.message?.includes('Visitor pass')) {
          Alert.alert(
            '⚠️ Visitor Pass Detected',
            stuErr.message || 'This is a Visitor pass. Please use Visitor Management.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // 3. Fallback Staff / HOD directory search
      const staffMatch = staffDirectory.find(
        (s) =>
          (s.employeeId || s.staffId || s.id || '').toLowerCase() === code.toLowerCase() ||
          (s.name || s.staffName || '').toLowerCase().includes(code.toLowerCase())
      );
      if (staffMatch) {
        const isHod = /hod|head/i.test(staffMatch.designation || '') || /hod/i.test(staffMatch.role || '');
        setScannedStudent({
          ...staffMatch,
          personId: staffMatch.employeeId || staffMatch.staffId || staffMatch.id,
          name: staffMatch.name || staffMatch.staffName,
          personType: isHod ? 'HOD' : 'Staff',
          department: staffMatch.department || staffMatch.dept || 'General',
          designation: staffMatch.designation || (isHod ? 'Head of Department' : 'Faculty'),
          assignedGate: assignedGate,
          currentStatus: staffMatch.currentStatus || 'Outside Campus',
        });
        return;
      }

      // 4. Fallback student directory search
      const match = studentDirectory.find(
        (s) =>
          (s.rollNo || s.studentId || s.id || '').toLowerCase() === code.toLowerCase() ||
          (s.name || '').toLowerCase().includes(code.toLowerCase())
      );
      if (match) {
        setScannedStudent({
          ...match,
          personType: 'Student',
          assignedGate: assignedGate,
          currentStatus: 'Outside Campus',
        });
        return;
      }

      Alert.alert('Person Not Found', `No registered Student, Staff, or HOD found matching code "${code}".`);
    } catch (err: any) {
      Alert.alert('Lookup Notice', err?.message || 'Failed to lookup QR code.');
    } finally {
      setScanningLoading(false);
    }
  };

  const handleScannedStudentAction = async (direction: 'in' | 'out') => {
    if (!scannedStudent) return;
    const sId = scannedStudent.personId || scannedStudent.studentId || scannedStudent.id || scannedStudent.rollNo;
    try {
      setQrActionLoading(true);
      if (direction === 'in') {
        try {
          await apiPost('watchman/campus-in', {
            personId: sId,
            gate: assignedGate,
            remarks: 'QR Scanner Verified Gate Check-in',
            vehicleNumber: scannedStudent.vehicleNumber || '',
          });
        } catch (campusInErr: any) {
          // Fallback to student-checkin if not in campus-people
          await apiPost('watchman/student-checkin', {
            studentId: sId,
            gate: assignedGate,
            remarks: 'QR Scanner Verified Gate Check-in',
          });
        }
        setScannedStudent((prev: any) => ({ ...prev, currentStatus: 'Inside Campus' }));
        Alert.alert('✓ Gate Access Granted', `${scannedStudent.name || sId} marked as INSIDE campus.`);
      } else {
        try {
          await apiPost('watchman/campus-out', {
            personId: sId,
            gate: assignedGate,
            remarks: 'QR Scanner Verified Gate Check-out',
          });
        } catch (campusOutErr: any) {
          // Fallback to student-checkout if not in campus-people
          await apiPost('watchman/student-checkout', {
            studentId: sId,
            gate: assignedGate,
            remarks: 'QR Scanner Verified Gate Check-out',
          });
        }
        setScannedStudent((prev: any) => ({ ...prev, currentStatus: 'Outside Campus' }));
        Alert.alert('✓ Exit Verified', `${scannedStudent.name || sId} marked as OUTSIDE campus.`);
      }
      loadData();
    } catch (err: any) {
      Alert.alert('Action Error', err?.message || 'Failed to update movement.');
    } finally {
      setQrActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // SUBMIT FORMAL STUDENT MOVEMENT
  // ----------------------------------------------------------------------
  const handleSubmitStudentMovement = async () => {
    if (!modalStudentId.trim()) {
      Alert.alert('Required', 'Please enter Student ID or Roll Number.');
      return;
    }
    try {
      setSubmittingStudentMove(true);
      await apiPost('watchman/student-register', {
        studentId: modalStudentId.trim().toUpperCase(),
        studentName: modalStudentName.trim() || undefined,
        movementType: modalMovementType,
        reason: modalReason.trim() || modalMovementType,
        gate: assignedGate,
        parentContact: modalParentContact.trim() || undefined,
      });
      setStudentMovementModal(false);
      setModalStudentId('');
      setModalStudentName('');
      setModalReason('');
      setModalParentContact('');
      Alert.alert('Success', 'Student movement registered successfully.');
      loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Movement saved.');
      setStudentMovementModal(false);
      loadData();
    } finally {
      setSubmittingStudentMove(false);
    }
  };

  // ----------------------------------------------------------------------
  // STAFF GATE ATTENDANCE & RECORDING
  // ----------------------------------------------------------------------
  const handleQuickStaffMovement = async (staffMember: any, direction: 'In' | 'Out') => {
    const stId = staffMember.staffId || staffMember.id || staffMember.personId || staffMember._id;
    const stName = staffMember.staffName || staffMember.name || 'Faculty Member';
    const dept = staffMember.department || staffMember.dept || 'General';
    const desig = staffMember.designation || 'Staff';

    try {
      setPerformingActionId(stId);
      const res = await apiPost<any>('watchman/staff-register', {
        staffId: stId,
        staffName: stName,
        movementType: direction,
        department: dept,
        designation: desig,
        gate: assignedGate,
        reason: direction === 'In' ? 'Duty Shift Reporting' : 'Campus Departure / Shift End',
      });
      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Staff movement not recorded.');
      } else {
        Alert.alert(
          direction === 'In' ? '✓ Staff Entry Recorded' : '✓ Staff Exit Recorded',
          `Gate ${direction.toUpperCase()} logged for ${stName} (${stId}).`
        );
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Staff movement update failed.');
    } finally {
      setPerformingActionId(null);
    }
  };

  const handleSubmitStaffMovement = async () => {
    if (!modalStaffId.trim() || !modalStaffName.trim()) {
      Alert.alert('Required', 'Please enter Staff ID and Staff Full Name.');
      return;
    }
    try {
      setSubmittingStaffMove(true);
      await apiPost('watchman/staff-register', {
        staffId: modalStaffId.trim().toUpperCase(),
        staffName: modalStaffName.trim(),
        department: modalStaffDept.trim() || 'Academic Faculty',
        movementType: modalStaffDirection,
        reason: modalStaffReason,
        vehicleNumber: modalStaffVehicle.trim().toUpperCase() || undefined,
        gate: assignedGate,
      });
      setStaffMovementModal(false);
      setModalStaffId('');
      setModalStaffName('');
      setModalStaffDept('');
      setModalStaffVehicle('');
      Alert.alert('Success', `Staff ${modalStaffDirection.toUpperCase()} movement saved.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Staff movement recorded.');
      setStaffMovementModal(false);
      loadData();
    } finally {
      setSubmittingStaffMove(false);
    }
  };

  // ----------------------------------------------------------------------
  // FILTERED STUDENT & STAFF LISTS
  // ----------------------------------------------------------------------
  const displayedStudents = useMemo(() => {
    let pool: any[] = [];
    if (studentFilter === 'inside') {
      pool = studentScans.filter((s) => s.status === 'Inside Campus' || s.currentStatus === 'Inside Campus');
      if (pool.length === 0 && studentDirectory.length > 0) {
        // Fallback to active registered students
        pool = studentDirectory.slice(0, 15);
      }
    } else if (studentFilter === 'history') {
      pool = studentMovements.length > 0 ? studentMovements : studentScans;
    } else {
      pool = studentDirectory.length > 0 ? studentDirectory : studentScans;
    }

    if (!studentSearch.trim()) return pool;
    const q = studentSearch.toLowerCase().trim();
    return pool.filter((s) => {
      const name = (s.studentName || s.name || '').toLowerCase();
      const id = (s.studentId || s.id || s.rollNo || '').toLowerCase();
      const dept = (s.department || s.dept || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [studentFilter, studentScans, studentDirectory, studentMovements, studentSearch]);

  const displayedStaff = useMemo(() => {
    let pool: any[] = staffDirectory;
    if (staffFilter === 'inside') {
      // Find staff who have last movement as 'In'
      const inIds = new Set(
        staffMovements
          .filter((m) => (m.movementType || m.direction || '').toUpperCase() === 'IN')
          .map((m) => m.staffId || m.id)
      );
      if (inIds.size > 0) {
        pool = staffDirectory.filter((st) => inIds.has(st.staffId || st.id));
      } else {
        pool = staffDirectory.slice(0, 15);
      }
    } else if (staffFilter === 'history') {
      pool = staffMovements;
    }

    if (!staffSearch.trim()) return pool;
    const q = staffSearch.toLowerCase().trim();
    return pool.filter((st) => {
      const name = (st.name || st.staffName || '').toLowerCase();
      const id = (st.staffId || st.id || '').toLowerCase();
      const dept = (st.department || st.dept || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [staffDirectory, staffMovements, staffFilter, staffSearch]);

  const displayedHODs = useMemo(() => {
    const hodMap = new Map<string, any>();
    campusPeople
      .filter((p) => (p.personType || '').toUpperCase() === 'HOD')
      .forEach((p) => hodMap.set(p.personId || p._id, p));

    staffDirectory
      .filter((s) => {
        const des = (s.designation || '').toLowerCase();
        const role = (s.role || '').toLowerCase();
        return des.includes('hod') || des.includes('head') || role.includes('hod');
      })
      .forEach((s) => {
        const key = s.staffId || s.id || s.employeeId || s._id;
        if (!hodMap.has(key)) {
          hodMap.set(key, {
            ...s,
            personId: key,
            name: s.name || s.staffName,
            designation: s.designation || 'Head of Department',
            department: s.department || s.dept || 'Academic Dept',
            currentStatus: s.currentStatus || 'Outside Campus',
          });
        }
      });

    let pool = Array.from(hodMap.values());
    if (pool.length === 0) {
      pool = staffDirectory.slice(0, 8).map((st) => ({
        ...st,
        personId: st.staffId || st.id || st.employeeId,
        name: st.name || st.staffName,
        designation: st.designation || 'Head of Department',
        department: st.department || st.dept || 'Engineering',
        currentStatus: st.currentStatus || 'Outside Campus',
      }));
    }

    if (hodFilter === 'inside') {
      const insidePool = pool.filter((h) => (h.currentStatus || '').toLowerCase().includes('inside'));
      if (insidePool.length > 0) pool = insidePool;
    }

    if (!hodSearch.trim()) return pool;
    const q = hodSearch.toLowerCase().trim();
    return pool.filter((h) => {
      const name = (h.name || h.staffName || '').toLowerCase();
      const id = (h.personId || '').toLowerCase();
      const dept = (h.department || h.dept || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [campusPeople, staffDirectory, hodFilter, hodSearch]);

  return (
    <View style={styles.container}>
      {/* 4-WAY TOP NAVIGATION BAR: Student, Staff, HOD, Gate QR Scanner */}
      <View style={styles.navBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navBarScroll}
          contentContainerStyle={styles.navBar}
        >
          <TouchableOpacity
            style={[styles.navBtn, activeSubTab === 'student' && styles.navBtnActive]}
            onPress={() => setActiveSubTab('student')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, activeSubTab === 'student' && styles.navBtnTextActive]}>
              🎓 Student
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, activeSubTab === 'staff' && styles.navBtnActive]}
            onPress={() => setActiveSubTab('staff')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, activeSubTab === 'staff' && styles.navBtnTextActive]}>
              👔 Staff
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, activeSubTab === 'hod' && styles.navBtnActive]}
            onPress={() => setActiveSubTab('hod')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, activeSubTab === 'hod' && styles.navBtnTextActive]}>
              🏢 HOD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, activeSubTab === 'qr_scanner' && styles.navBtnActive]}
            onPress={() => setActiveSubTab('qr_scanner')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, activeSubTab === 'qr_scanner' && styles.navBtnTextActive]}>
              📷 Gate QR Scanner
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* ============================================================== */}
        {/* SUB-MODULE 1: STUDENT MOVEMENT REGISTER                        */}
        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* SUB-MODULE 1: STUDENT MOVEMENT REGISTER                        */}
        {/* ============================================================== */}
        {activeSubTab === 'student' && (
          <View>
            {/* Header with Quick Actions */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.sectionTitle}>🎓 Student Movement Register</Text>
                <Text style={styles.sectionSub}>Manage verified student entries, outpasses & sick bay</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    setRegisterInitialType('Student');
                    setRegisterModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnPrimaryText}>+ Register & Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => setStudentMovementModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnPrimaryText}>+ Movement</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {[
                { id: 'inside', label: 'Inside Campus' },
                { id: 'all', label: 'All Students' },
                { id: 'history', label: 'Movement Logs' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, studentFilter === f.id && styles.filterPillActive]}
                  onPress={() => setStudentFilter(f.id as FilterStatus)}
                >
                  <Text style={[styles.filterPillText, studentFilter === f.id && styles.filterPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Bar */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search student name, roll number, department..."
              value={studentSearch}
              onChangeText={setStudentSearch}
              clearButtonMode="while-editing"
            />

            {/* Student Cards List */}
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : displayedStudents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🎓</Text>
                <Text style={styles.emptyTitle}>No Student Records Found</Text>
                <Text style={styles.emptySub}>No students matching your current filter.</Text>
              </View>
            ) : (
              displayedStudents.map((stu, idx) => {
                const sId = stu.studentId || stu.rollNo || stu.id || `STU-${idx + 1}`;
                const sName = stu.studentName || stu.name || 'Student';
                const isActionLoading = performingActionId === sId;
                const isInside = (stu.status || stu.currentStatus) === 'Inside Campus';

                return (
                  <View key={stu._id || sId || idx} style={styles.rosterCard}>
                    <View style={styles.rosterAvatar}>
                      <Text style={styles.rosterAvatarText}>{sName.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={styles.rosterName} numberOfLines={1}>
                        {sName}
                      </Text>
                      <Text style={styles.rosterDetail}>
                        Roll: {sId} • {stu.department || 'Engineering'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                        <View style={[styles.statusTag, isInside ? styles.statusTagIn : styles.statusTagOut]}>
                          <Text style={[styles.statusTagText, isInside ? styles.statusTagTextIn : styles.statusTagTextOut]}>
                            {isInside ? '● Inside' : '○ Outside'}
                          </Text>
                        </View>
                        {stu.movementType && (
                          <Text style={styles.movementReasonText}>({stu.movementType})</Text>
                        )}
                      </View>
                    </View>

                    {/* Dual Action Gate In/Out Buttons */}
                    <View style={styles.rosterActions}>
                      <TouchableOpacity
                        style={[styles.gateBtn, styles.gateBtnIn, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleStudentCheckin(stu)}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.gateBtnTextIn}>IN 🟢</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.gateBtn, styles.gateBtnOut, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleStudentCheckout(stu)}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.gateBtnTextOut}>OUT 🔴</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-MODULE 2: STAFF GATE OPERATIONS                            */}
        {/* ============================================================== */}
        {activeSubTab === 'staff' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.sectionTitle}>👔 Staff Entry Register</Text>
                <Text style={styles.sectionSub}>Log faculty movements, duty shift reporting & gate departure</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    setRegisterInitialType('Staff');
                    setRegisterModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnPrimaryText}>+ Register & Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => setStaffMovementModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnPrimaryText}>+ Log Staff</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {[
                { id: 'inside', label: 'On Campus' },
                { id: 'all', label: 'All Faculty' },
                { id: 'history', label: 'Duty Logs' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, staffFilter === f.id && styles.filterPillActive]}
                  onPress={() => setStaffFilter(f.id as FilterStatus)}
                >
                  <Text style={[styles.filterPillText, staffFilter === f.id && styles.filterPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search faculty name, employee ID, department..."
              value={staffSearch}
              onChangeText={setStaffSearch}
              clearButtonMode="while-editing"
            />

            {/* Staff List */}
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : displayedStaff.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>👔</Text>
                <Text style={styles.emptyTitle}>No Staff Members Found</Text>
                <Text style={styles.emptySub}>No faculty records matching your filter.</Text>
              </View>
            ) : (
              displayedStaff.map((st, idx) => {
                const stId = st.staffId || st.id || `STF-${idx + 1}`;
                const stName = st.staffName || st.name || 'Faculty Member';
                const isActionLoading = performingActionId === stId;

                return (
                  <View key={st._id || stId || idx} style={styles.rosterCard}>
                    <View style={[styles.rosterAvatar, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}>
                      <Text style={[styles.rosterAvatarText, { color: '#0F766E' }]}>
                        {stName.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={styles.rosterName} numberOfLines={1}>
                        {stName}
                      </Text>
                      <Text style={styles.rosterDetail}>
                        ID: {stId} • {st.department || 'Academic Dept'}
                      </Text>
                      {st.designation && (
                        <Text style={styles.staffDesigText}>{st.designation}</Text>
                      )}
                    </View>

                    {/* Dual Action Buttons for Staff */}
                    <View style={styles.rosterActions}>
                      <TouchableOpacity
                        style={[styles.gateBtn, styles.gateBtnIn, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleQuickStaffMovement(st, 'In')}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.gateBtnTextIn}>IN 🟢</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.gateBtn, styles.gateBtnOut, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleQuickStaffMovement(st, 'Out')}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.gateBtnTextOut}>OUT 🔴</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-MODULE 3: HOD GATE OPERATIONS                              */}
        {/* ============================================================== */}
        {activeSubTab === 'hod' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.sectionTitle}>🏢 HOD Gate Register</Text>
                <Text style={styles.sectionSub}>Department heads, campus presence & VIP gate access</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  setRegisterInitialType('HOD');
                  setRegisterModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Register & Pass</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {[
                { id: 'inside', label: 'On Campus' },
                { id: 'all', label: 'All HODs' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, hodFilter === f.id && styles.filterPillActive]}
                  onPress={() => setHodFilter(f.id as any)}
                >
                  <Text style={[styles.filterPillText, hodFilter === f.id && styles.filterPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search HOD name, ID, department..."
              value={hodSearch}
              onChangeText={setHodSearch}
              clearButtonMode="while-editing"
            />

            {/* HOD List */}
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : displayedHODs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🏢</Text>
                <Text style={styles.emptyTitle}>No HOD Records Found</Text>
                <Text style={styles.emptySub}>Tap "+ Register & Pass" to register a Department Head.</Text>
              </View>
            ) : (
              displayedHODs.map((hod, idx) => {
                const hodId = hod.personId || hod.staffId || hod.employeeId || hod.id || `HOD-${idx + 1}`;
                const hodName = hod.name || hod.staffName || 'Department Head';
                const isActionLoading = performingActionId === hodId;
                const isInside = (hod.currentStatus || '').toLowerCase().includes('inside');

                return (
                  <View key={hod._id || hodId || idx} style={styles.rosterCard}>
                    <View style={[styles.rosterAvatar, { backgroundColor: '#FDF4FF', borderColor: '#F0ABFC' }]}>
                      <Text style={[styles.rosterAvatarText, { color: '#9333EA' }]}>
                        {hodName.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={styles.rosterName} numberOfLines={1}>
                        {hodName}
                      </Text>
                      <Text style={styles.rosterDetail}>
                        ID: {hodId} • {hod.department || 'Academic Department'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                        <View style={[styles.statusTag, isInside ? styles.statusTagIn : styles.statusTagOut]}>
                          <Text style={[styles.statusTagText, isInside ? styles.statusTagTextIn : styles.statusTagTextOut]}>
                            {isInside ? '● Inside' : '○ Outside'}
                          </Text>
                        </View>
                        <Text style={[styles.staffDesigText, { color: '#9333EA' }]}>HOD</Text>
                      </View>
                    </View>

                    {/* Dual Action Buttons for HOD */}
                    <View style={styles.rosterActions}>
                      <TouchableOpacity
                        style={[styles.gateBtn, styles.gateBtnIn, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleUniversalCheckinOut(hod, 'In')}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.gateBtnTextIn}>IN 🟢</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.gateBtn, styles.gateBtnOut, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleUniversalCheckinOut(hod, 'Out')}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.gateBtnTextOut}>OUT 🔴</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-MODULE 4: GATE OPERATIONS QR SCANNER                       */}
        {/* ============================================================== */}
        {activeSubTab === 'qr_scanner' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>📷 Gate Operations QR Scanner</Text>
                <Text style={styles.sectionSub}>Scan or enter Student, Staff, or HOD Gate Passes only</Text>
              </View>
            </View>

            {/* Scan / Lookup Input Card */}
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Scan or Type Person ID / Gate Pass Code</Text>
              <View style={styles.scanInputRow}>
                <TextInput
                  style={[styles.searchInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="e.g. 21CS045, STU-..., STF-..., HOD-..."
                  value={studentScanCode}
                  onChangeText={setStudentScanCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => handleLookupStudentQr()}
                  disabled={scanningLoading}
                  activeOpacity={0.8}
                >
                  {scanningLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify Pass</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Sample Presets */}
              <View style={styles.presetRow}>
                <Text style={styles.presetLabel}>Quick Presets:</Text>
                {[
                  { label: 'Student', code: '21CS045' },
                  { label: 'Staff', code: 'STF-101' },
                  { label: 'HOD', code: 'HOD-CS-01' }
                ].map((p) => (
                  <TouchableOpacity
                    key={p.code}
                    style={styles.presetPill}
                    onPress={() => {
                      setStudentScanCode(p.code);
                      handleLookupStudentQr(p.code);
                    }}
                  >
                    <Text style={styles.presetPillText}>{p.label}: {p.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Verified Person Gate Pass Result */}
            {scannedStudent && (
              <View style={styles.verifiedCard}>
                <View style={styles.verifiedHeader}>
                  <View style={[styles.verifiedAvatar, scannedStudent.personType === 'HOD' ? { backgroundColor: '#F3E8FF' } : scannedStudent.personType === 'Staff' ? { backgroundColor: '#F0FDFA' } : { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[styles.verifiedAvatarText, scannedStudent.personType === 'HOD' ? { color: '#7E22CE' } : scannedStudent.personType === 'Staff' ? { color: '#0F766E' } : { color: '#1D4ED8' }]}>
                      {(scannedStudent.name || 'CP').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.verifiedName}>{scannedStudent.name || 'Verified Member'}</Text>
                    <Text style={styles.verifiedRoll}>
                      ID: {scannedStudent.personId || scannedStudent.rollNo || scannedStudent.studentId || scannedStudent.id}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={[styles.typeBadge, scannedStudent.personType === 'HOD' ? styles.typeBadgePurple : scannedStudent.personType === 'Staff' ? styles.typeBadgeTeal : styles.typeBadgeBlue]}>
                        <Text style={[styles.typeBadgeText, scannedStudent.personType === 'HOD' ? styles.typeTextPurple : scannedStudent.personType === 'Staff' ? styles.typeTextTeal : styles.typeTextBlue]}>
                          {scannedStudent.personType === 'HOD' ? '🏢 HOD' : scannedStudent.personType === 'Staff' ? '👔 Faculty / Staff' : '🎓 Student'}
                        </Text>
                      </View>
                      <Text style={styles.verifiedDept} numberOfLines={1}>
                        • {scannedStudent.department || 'General'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Gate Details Info Table */}
                <View style={styles.gateDetailsTable}>
                  <View style={styles.gateDetailRow}>
                    <Text style={styles.gateDetailLabel}>Assigned Gate:</Text>
                    <Text style={styles.gateDetailVal}>{scannedStudent.assignedGate || assignedGate}</Text>
                  </View>
                  {scannedStudent.phone ? (
                    <View style={styles.gateDetailRow}>
                      <Text style={styles.gateDetailLabel}>Contact:</Text>
                      <Text style={styles.gateDetailVal}>{scannedStudent.phone}</Text>
                    </View>
                  ) : null}
                  {scannedStudent.vehicleNumber ? (
                    <View style={styles.gateDetailRow}>
                      <Text style={styles.gateDetailLabel}>Vehicle:</Text>
                      <Text style={styles.gateDetailVal}>{scannedStudent.vehicleNumber}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.statusBox}>
                  <Text style={styles.statusBoxLabel}>Campus In/Out Status:</Text>
                  <Text
                    style={[
                      styles.statusBoxVal,
                      (scannedStudent.currentStatus || '').toLowerCase().includes('inside') ? styles.statusValIn : styles.statusValOut,
                    ]}
                  >
                    {(scannedStudent.currentStatus || '').toLowerCase().includes('inside') ? '● INSIDE CAMPUS' : '○ OUTSIDE CAMPUS'}
                  </Text>
                </View>

                {/* Instant Gate Movement Actions */}
                <View style={styles.dualActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionGateBtn,
                      styles.btnInBg,
                      (qrActionLoading || (scannedStudent.currentStatus || '').toLowerCase().includes('inside')) && styles.btnDisabled,
                    ]}
                    onPress={() => handleScannedStudentAction('in')}
                    disabled={qrActionLoading || (scannedStudent.currentStatus || '').toLowerCase().includes('inside')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionGateBtnText}>✓ Record Campus IN</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionGateBtn,
                      styles.btnOutBg,
                      (qrActionLoading || !(scannedStudent.currentStatus || '').toLowerCase().includes('inside')) && styles.btnDisabled,
                    ]}
                    onPress={() => handleScannedStudentAction('out')}
                    disabled={qrActionLoading || !(scannedStudent.currentStatus || '').toLowerCase().includes('inside')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.actionGateBtnText, { color: '#DC2626' }]}>✕ Record Campus OUT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: FORMAL STUDENT MOVEMENT REGISTER                     */}
      {/* ============================================================== */}
      <Modal
        visible={studentMovementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStudentMovementModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register Student Movement</Text>
            <Text style={styles.modalSub}>Record outpass, sick bay departure, or lunch gate pass</Text>

            <Text style={styles.inputLabel}>Student ID / Roll No *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 21CS045"
              value={modalStudentId}
              onChangeText={setModalStudentId}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Student Name (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Priya Sharma"
              value={modalStudentName}
              onChangeText={setModalStudentName}
            />

            <Text style={styles.inputLabel}>Movement Type *</Text>
            <View style={styles.typeSelectorRow}>
              {['Outpass', 'Sick Bay', 'Lunch Break', 'Day Scholar'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, modalMovementType === t && styles.typePillActive]}
                  onPress={() => setModalMovementType(t)}
                >
                  <Text style={[styles.typePillText, modalMovementType === t && styles.typePillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reason / Permission Notes</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Warden approved medical outpass"
              value={modalReason}
              onChangeText={setModalReason}
            />

            <Text style={styles.inputLabel}>Parent / Guardian Contact</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. +91 98765 43210"
              keyboardType="phone-pad"
              value={modalParentContact}
              onChangeText={setModalParentContact}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setStudentMovementModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={handleSubmitStudentMovement}
                disabled={submittingStudentMove}
              >
                {submittingStudentMove ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Movement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: FORMAL STAFF GATE MOVEMENT                           */}
      {/* ============================================================== */}
      <Modal
        visible={staffMovementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStaffMovementModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Staff Gate Movement</Text>
            <Text style={styles.modalSub}>Record faculty duty shift arrival or departure</Text>

            <Text style={styles.inputLabel}>Staff Member ID *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. STF008"
              value={modalStaffId}
              onChangeText={setModalStaffId}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Staff Full Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Prof. R. Swaminathan"
              value={modalStaffName}
              onChangeText={setModalStaffName}
            />

            <Text style={styles.inputLabel}>Department</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Computer Science"
              value={modalStaffDept}
              onChangeText={setModalStaffDept}
            />

            <Text style={styles.inputLabel}>Movement Direction *</Text>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typePill, modalStaffDirection === 'In' && styles.typePillActive]}
                onPress={() => setModalStaffDirection('In')}
              >
                <Text style={[styles.typePillText, modalStaffDirection === 'In' && styles.typePillTextActive]}>
                  🟢 Campus Entry (IN)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typePill, modalStaffDirection === 'Out' && styles.typePillActive]}
                onPress={() => setModalStaffDirection('Out')}
              >
                <Text style={[styles.typePillText, modalStaffDirection === 'Out' && styles.typePillTextActive]}>
                  🔴 Campus Exit (OUT)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Vehicle Number (If any)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TN-07-CB-5678"
              value={modalStaffVehicle}
              onChangeText={setModalStaffVehicle}
              autoCapitalize="characters"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setStaffMovementModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={handleSubmitStaffMovement}
                disabled={submittingStaffMove}
              >
                {submittingStaffMove ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Movement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Student, Staff, and HOD Gate Registration Modal */}
      <WatchmanRegisterPersonModal
        visible={registerModalOpen}
        user={user}
        defaultGate={assignedGate}
        initialPersonType={registerInitialType}
        allowedPersonTypes={['Student', 'Staff', 'HOD']}
        onClose={() => setRegisterModalOpen(false)}
        onRegistrationSuccess={(_person) => {
          loadData();
        }}
        onNavigateScanner={(code) => {
          setRegisterModalOpen(false);
          setActiveSubTab('qr_scanner');
          if (code) {
            setStudentScanCode(code);
            setTimeout(() => {
              handleLookupStudentQr(code);
            }, 300);
          }
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
  navBarScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexGrow: 0,
  },
  navBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtnActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  navBtnTextActive: {
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
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
  rosterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  rosterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  rosterName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  rosterDetail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  staffDesigText: {
    fontSize: 10,
    color: '#0D9488',
    fontWeight: '600',
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagIn: {
    backgroundColor: '#DCFCE7',
  },
  statusTagOut: {
    backgroundColor: '#FEE2E2',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTagTextIn: {
    color: '#15803D',
  },
  statusTagTextOut: {
    color: '#B91C1C',
  },
  movementReasonText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  rosterActions: {
    flexDirection: 'column',
    gap: 4,
  },
  gateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  gateBtnIn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  gateBtnOut: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  gateBtnTextIn: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  gateBtnTextOut: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  scanInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
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
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  navBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  typeBadgeTeal: {
    backgroundColor: '#F0FDFA',
  },
  typeBadgePurple: {
    backgroundColor: '#FAF5FF',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  typeTextBlue: {
    color: '#1D4ED8',
  },
  typeTextTeal: {
    color: '#0F766E',
  },
  typeTextPurple: {
    color: '#7E22CE',
  },
  gateDetailsTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gateDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  gateDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  gateDetailVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  verifiedCard: {
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
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E40AF',
  },
  verifiedName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedRoll: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 1,
  },
  verifiedDept: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBoxLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  statusBoxVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusValIn: {
    color: '#15803D',
  },
  statusValOut: {
    color: '#DC2626',
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionGateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInBg: {
    backgroundColor: '#10B981',
  },
  btnOutBg: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  actionGateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
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
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  typePillTextActive: {
    color: '#1D4ED8',
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
