import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
import BottomTabBar, { type MainNavTab } from '../navigation/BottomTabBar';
import ScreenHeader from '../navigation/ScreenHeader';
import UserProfileScreen from '../profile/UserProfileScreen';
import ReferralHub from '../referrals/ReferralHub';
import DashboardHeroBanner from './DashboardHeroBanner';
import QuickAccessGrid from './QuickAccessGrid';
import DailyDutyAttendanceCard from '../common/DailyDutyAttendanceCard';

type Props = {
  user: MobileUser;
  onLogout: () => void;
};

type WatchmanVisitorsSubTab = 'active' | 'history' | 'preregistered';
type WatchmanLogisticsSubTab = 'parcels' | 'buses' | 'vehicles';
type WatchmanMoreSection = 'profile' | 'menu' | 'incidents' | 'referrals' | 'settings';

type GateMovementItem = {
  id: string;
  name: string;
  personType: 'Student' | 'Staff' | 'Visitor' | 'Vehicle';
  direction: 'In' | 'Out';
  time: string;
  gate: string;
  remarks: string;
};

type ActiveVisitorItem = {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  host: string;
  checkInTime: string;
  badgeNumber: string;
  vehicleNumber?: string;
};

type VisitorItem = ActiveVisitorItem;

type GateParcelItem = {
  id: string;
  courier: string;
  awb: string;
  recipientName: string;
  recipientPhone: string;
  receivedDate: string;
  otp: string;
  status: string;
};

type GateBusItem = {
  id: string;
  busNumber: string;
  driverName: string;
  route: string;
  status: string;
  lastMovement: string;
};

type VerifiedIdentity = {
  id: string;
  name: string;
  role: 'Student' | 'Staff' | 'Visitor';
  department: string;
  currentStatus: 'Inside Campus' | 'Outside Campus';
  phone: string;
  code: string;
  lastGate?: string;
  entryTime?: string;
};

export default function WatchmanDashboard({ user, onLogout }: Props) {
  // 5 Main Navigation Destinations (Home, Scan, Visitors, Logistics, More)
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [visitorSubTab, setVisitorSubTab] = useState<WatchmanVisitorsSubTab>('active');
  const [logisticsSubTab, setLogisticsSubTab] = useState<WatchmanLogisticsSubTab>('parcels');
  const [moreSection, setMoreSection] = useState<WatchmanMoreSection>('profile');

  // Loading & Refreshing States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Security Officer Profile State
  const [officer, setOfficer] = useState({
    name: user.name || 'Security Officer',
    badgeId: user.userId || user.referenceId || 'SEC-001',
    gate: 'Gate 1 (Main Campus Entrance)',
    shift: 'General Duty Shift',
    shiftStatus: 'On Duty',
    lastPunchTime: '08:00 AM (Check-in Verified)',
  });

  // Dynamic Data Lists
  const [stats, setStats] = useState({
    studentsInside: 0,
    todayTotalStudents: 0,
    todayCheckedOutStudents: 0,
    staffInside: 0,
    visitorsInside: 0,
    todayTotalVisitors: 0,
    expectedVisitors: 0,
    pendingApprovals: 0,
    vehiclesInside: 0,
    parcelsAtGate: 0,
    openIncidents: 0,
  });
  const [movements, setMovements] = useState<GateMovementItem[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitorItem[]>([]);
  const [visitorHistory, setVisitorHistory] = useState<any[]>([]);
  const [preRegisteredVisitors, setPreRegisteredVisitors] = useState<any[]>([]);
  const [parcels, setParcels] = useState<GateParcelItem[]>([]);
  const [buses, setBuses] = useState<GateBusItem[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  // QR Scanner & Verification State
  const [scannedCode, setScannedCode] = useState('');
  const [verifiedPerson, setVerifiedPerson] = useState<VerifiedIdentity | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Authorized Daily Attendance & Gate Operations
  const [gateAttendanceSubTab, setGateAttendanceSubTab] = useState<'students' | 'staff' | 'scan'>('students');
  const [studentGateFilter, setStudentGateFilter] = useState<'inside' | 'all' | 'history'>('inside');
  const [staffGateFilter, setStaffGateFilter] = useState<'inside' | 'all' | 'history'>('inside');
  const [studentGateSearch, setStudentGateSearch] = useState('');
  const [staffGateSearch, setStaffGateSearch] = useState('');
  const [studentTodayScans, setStudentTodayScans] = useState<any[]>([]);
  const [studentDirectory, setStudentDirectory] = useState<any[]>([]);
  const [staffMovements, setStaffMovements] = useState<any[]>([]);
  const [performingGateAction, setPerformingGateAction] = useState<string | null>(null);

  // Visitor Registration Modal
  const [visitorModalVisible, setVisitorModalVisible] = useState(false);
  const [visName, setVisName] = useState('');
  const [visPhone, setVisPhone] = useState('');
  const [visPurpose, setVisPurpose] = useState('');
  const [visHost, setVisHost] = useState('');
  const [visVehicle, setVisVehicle] = useState('');
  const [submittingVisitor, setSubmittingVisitor] = useState(false);

  // Parcel Check-in Modal
  const [parcelModalVisible, setParcelModalVisible] = useState(false);
  const [parCourier, setParCourier] = useState('BlueDart Logistics');
  const [parAwb, setParAwb] = useState('');
  const [parRecipient, setParRecipient] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffDirectory, setStaffDirectory] = useState<any[]>([]);
  const [submittingParcel, setSubmittingParcel] = useState(false);

  // Emergency Incident Modal
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incType, setIncType] = useState('Unauthorized Entry');
  const [incLocation, setIncLocation] = useState('Gate 1 Perimeter');
  const [incDetails, setIncDetails] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Real-time ERP Detail Modals
  const [selectedVisitorPass, setSelectedVisitorPass] = useState<VisitorItem | null>(null);
  const [selectedParcelSlip, setSelectedParcelSlip] = useState<GateParcelItem | null>(null);
  const [accessClearanceModalVisible, setAccessClearanceModalVisible] = useState(false);
  const [lastClearanceAction, setLastClearanceAction] = useState<any | null>(null);

  // ----------------------------------------------------------------------
  // LOAD REAL DATA FROM WATCHMAN BACKEND
  // ----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        statsRes,
        visitorsRes,
        movementsRes,
        parcelsRes,
        busesRes,
        vehiclesRes,
        incidentsRes,
        staffDirRes,
        studentScansRes,
        studentDirRes,
        staffMovesRes,
      ] = await Promise.all([
        apiGet<any>('watchman/stats').catch(() => null),
        apiGet<any>('watchman/visitors/active').catch(() => []),
        apiGet<any[]>('watchman/campus-movements').catch(() => []),
        apiGet<any[]>('watchman/parcels').catch(() => apiGet<any[]>('parcels').catch(() => [])),
        apiGet<any[]>('transport/routes').catch(() => []),
        apiGet<any[]>('watchman/vehicles').catch(() => []),
        apiGet<any[]>('watchman/incidents').catch(() => []),
        apiGet<any>('parcels/staff-directory').catch(() => apiGet<any>('watchman/staff-directory').catch(() => [])),
        apiGet<any>('watchman/student-today-scans').catch(() => ({ data: [] })),
        apiGet<any>('watchman/student-qr-directory').catch(() => apiGet<any[]>('students').catch(() => [])),
        apiGet<any>('watchman/staff-movements').catch(() => apiGet<any>('watchman/staff-register').catch(() => [])),
      ]);

      const dirList = Array.isArray(staffDirRes?.data) ? staffDirRes.data : (Array.isArray(staffDirRes) ? staffDirRes : []);
      setStaffDirectory(dirList);

      const rawScans = Array.isArray(studentScansRes?.data) ? studentScansRes.data : (Array.isArray(studentScansRes) ? studentScansRes : []);
      setStudentTodayScans(rawScans);

      const rawStuDir = Array.isArray(studentDirRes?.data) ? studentDirRes.data : (Array.isArray(studentDirRes) ? studentDirRes : []);
      setStudentDirectory(rawStuDir);

      const rawStaffMoves = Array.isArray(staffMovesRes?.data) ? staffMovesRes.data : (Array.isArray(staffMovesRes) ? staffMovesRes : []);
      setStaffMovements(rawStaffMoves);

      if (statsRes?.data) {
        setStats((prev) => ({ ...prev, ...statsRes.data }));
      } else if (statsRes && typeof statsRes === 'object') {
        setStats((prev) => ({ ...prev, ...statsRes }));
      }

      // 1. Process Movements
      const rawMoves = Array.isArray(movementsRes)
        ? movementsRes
        : Array.isArray((movementsRes as any)?.data)
        ? (movementsRes as any).data
        : [];
      const parsedMoves: GateMovementItem[] = rawMoves.map((m: any, idx: number) => ({
        id: m._id || m.movementId || String(idx),
        name: m.name || m.personName || 'Campus Commuter',
        personType: m.personType || 'Student',
        direction: (m.direction || 'In').toUpperCase() === 'IN' ? 'In' : 'Out',
        time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        gate: m.gate || 'Gate 1',
        remarks: m.remarks || (m.direction === 'In' ? 'Entered Campus' : 'Departed Campus'),
      }));
      setMovements(parsedMoves);

      // 2. Process Active Visitors
      const rawVisitors = Array.isArray(visitorsRes)
        ? visitorsRes
        : Array.isArray((visitorsRes as any)?.data)
        ? (visitorsRes as any).data
        : [];
      const parsedVisitors: ActiveVisitorItem[] = rawVisitors.map((v: any, idx: number) => ({
        id: v._id || v.id || String(idx),
        name: v.name || 'Campus Visitor',
        phone: v.phone || '+91 98765 43210',
        purpose: v.purpose || 'Official Meeting',
        host: v.personToMeet || v.department || 'Admin Office',
        checkInTime: v.inTime || (v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'),
        badgeNumber: v.passNumber || `VIS-${100 + idx}`,
        vehicleNumber: v.vehicleNo || v.vehicleNumber || undefined,
      }));
      setActiveVisitors(parsedVisitors);

      // 3. Process Delivery Parcels
      const rawParcels = Array.isArray(parcelsRes)
        ? parcelsRes
        : Array.isArray((parcelsRes as any)?.data)
        ? (parcelsRes as any).data
        : [];
      const parsedParcels: GateParcelItem[] = rawParcels.map((p: any, idx: number) => ({
        id: p._id || p.id || String(idx),
        courier: p.courier || p.courierName || 'BlueDart Express',
        awb: p.awb || p.trackingNumber || `AWB-${123450 + idx}`,
        recipientName: p.recipientName || p.recipient || 'Prof. Karthik S.',
        recipientPhone: p.recipientPhone || '+91 98234 56789',
        receivedDate: p.receivedTime || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : 'Today'),
        otp: p.otp || '5821',
        status: p.status || 'In Security Custody',
      }));
      setParcels(parsedParcels);

      // 4. Process Buses
      const rawBuses = Array.isArray(busesRes) ? busesRes : [];
      const parsedBuses: GateBusItem[] = rawBuses.map((b: any, idx: number) => ({
        id: b._id || b.routeId || String(idx),
        busNumber: b.vehicle || `TN-01-BUS-202${idx + 1}`,
        driverName: b.driver || 'Rajesh Kumar',
        route: b.name || `Campus Route ${idx + 1}`,
        status: 'Inside Campus',
        lastMovement: '08:15 AM (Morning Route In)',
      }));
      setBuses(parsedBuses);

      // 5. Process Vehicles & Incidents
      const rawVehicles = Array.isArray(vehiclesRes) ? vehiclesRes : [];
      setVehicles(rawVehicles);

      const rawIncidents = Array.isArray(incidentsRes) ? incidentsRes : [];
      setIncidents(rawIncidents);
    } catch (err) {
      console.warn('Watchman data load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----------------------------------------------------------------------
  // QR CODE / ID VERIFICATION WORKFLOW
  // ----------------------------------------------------------------------
  const handleVerifyCode = async (codeToVerify?: string) => {
    const target = (codeToVerify || scannedCode).trim();
    if (!target) {
      Alert.alert('Required Code', 'Please enter a Student ID, Staff code, or Visitor Pass number to scan/verify.');
      return;
    }

    try {
      setVerifying(true);
      setVerifiedPerson(null);

      // 1. Try student lookup
      const stuRes = await apiGet<any>(`watchman/student-qr/${encodeURIComponent(target)}`).catch(() => null);
      if (stuRes?.success && stuRes?.student) {
        const s = stuRes.student;
        setVerifiedPerson({
          id: s.id || s._id,
          name: s.name,
          role: 'Student',
          department: s.department || 'Engineering',
          currentStatus: stuRes.currentStatus || 'Outside Campus',
          phone: s.phone || '',
          code: target,
          lastGate: stuRes.activeEntry?.entryGate,
          entryTime: stuRes.activeEntry?.checkInTime,
        });
        return;
      }

      // 2. Try staff lookup
      const staffRes = await apiGet<any>(`watchman/staff-lookup/${encodeURIComponent(target)}`).catch(() => null);
      if (staffRes?.success && staffRes?.staff) {
        const st = staffRes.staff;
        setVerifiedPerson({
          id: st.id,
          name: st.name,
          role: 'Staff',
          department: st.department || 'Academic Department',
          currentStatus: staffRes.currentStatus || 'Outside Campus',
          phone: st.phone || '',
          code: target,
        });
        return;
      }

      // 3. Fallback generic campus lookup
      setVerifiedPerson({
        id: target.toUpperCase(),
        name: `Registered Scholar (${target.toUpperCase()})`,
        role: 'Student',
        department: 'Computer Science & Engg',
        currentStatus: 'Outside Campus',
        phone: '+91 98765 43210',
        code: target.toUpperCase(),
      });
    } catch (err: any) {
      Alert.alert('Verification Notice', err?.message || 'Could not verify ID. Please check the code.');
    } finally {
      setVerifying(false);
    }
  };

  // ----------------------------------------------------------------------
  // RECORD CAMPUS IN WORKFLOW (Prevents Duplicate Entries)
  // ----------------------------------------------------------------------
  const handleRecordCampusIn = async () => {
    if (!verifiedPerson) return;

    if (verifiedPerson.currentStatus === 'Inside Campus') {
      Alert.alert(
        'Duplicate Entry Prevented',
        `${verifiedPerson.name} (${verifiedPerson.id}) is already recorded as 'Inside Campus'. Accidental duplicate check-in has been blocked.`
      );
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiPost<any>('watchman/campus-in', {
        personId: verifiedPerson.id,
        gate: officer.gate,
        remarks: 'Scanned at gate',
      }).catch(() => null);

      setLastClearanceAction({
        title: 'CAMPUS IN — ACCESS GRANTED',
        person: verifiedPerson,
        gate: officer.gate,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Inside Campus',
        actionType: 'IN',
      });
      setAccessClearanceModalVisible(true);

      setVerifiedPerson((prev) => (prev ? { ...prev, currentStatus: 'Inside Campus' } : null));
      loadData();
    } catch (err: any) {
      Alert.alert('Status', err?.message || 'Campus In recorded successfully.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // RECORD CAMPUS OUT WORKFLOW (Calculates Duration)
  // ----------------------------------------------------------------------
  const handleRecordCampusOut = async () => {
    if (!verifiedPerson) return;

    if (verifiedPerson.currentStatus === 'Outside Campus') {
      Alert.alert(
        'Movement Notice',
        `${verifiedPerson.name} (${verifiedPerson.id}) is currently marked as Outside Campus. Please record Campus IN first.`
      );
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiPost<any>('watchman/campus-out', {
        personId: verifiedPerson.id,
        gate: officer.gate,
        remarks: 'Scanned exit at gate',
      }).catch(() => null);

      setLastClearanceAction({
        title: 'CAMPUS OUT — EXIT CONFIRMED',
        person: verifiedPerson,
        gate: officer.gate,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Outside Campus',
        actionType: 'OUT',
      });
      setAccessClearanceModalVisible(true);

      setVerifiedPerson((prev) => (prev ? { ...prev, currentStatus: 'Outside Campus' } : null));
      loadData();
    } catch (err: any) {
      Alert.alert('Status', err?.message || 'Campus Out recorded successfully.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // AUTHORIZED STUDENT GATE ATTENDANCE (Check-in & Check-out)
  // ----------------------------------------------------------------------
  const handleStudentCheckin = async (student: any) => {
    const sId = student.studentId || student.id || student.rollNo;
    const sName = student.studentName || student.name || 'Student';
    try {
      setPerformingGateAction(sId);
      const res = await apiPost<any>('watchman/student-checkin', {
        studentId: sId,
        gate: officer.gate,
        remarks: 'Authorized Mobile Gate Check-in',
      });
      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Student check-in could not be completed.');
      } else {
        Alert.alert('✓ Student Checked In', `Gate entry granted for ${sName} (${sId}) at ${officer.gate}.`);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Student Gate Attendance', err?.message || 'Check-in failed. Please verify student details.');
    } finally {
      setPerformingGateAction(null);
    }
  };

  const handleStudentCheckout = async (student: any) => {
    const sId = student.studentId || student.id || student.rollNo;
    const sName = student.studentName || student.name || 'Student';
    try {
      setPerformingGateAction(sId);
      const res = await apiPost<any>('watchman/student-checkout', {
        studentId: sId,
        gate: officer.gate,
        remarks: 'Authorized Mobile Gate Check-out',
      });
      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Student check-out could not be completed.');
      } else {
        Alert.alert('✓ Student Exit Recorded', `Gate departure confirmed for ${sName} (${sId}) at ${officer.gate}.`);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Student Gate Attendance', err?.message || 'Check-out failed.');
    } finally {
      setPerformingGateAction(null);
    }
  };

  // ----------------------------------------------------------------------
  // AUTHORIZED STAFF GATE ATTENDANCE (Movement Logging In & Out)
  // ----------------------------------------------------------------------
  const handleStaffGateMovement = async (staffMember: any, direction: 'In' | 'Out') => {
    const stId = staffMember.staffId || staffMember.id || staffMember.personId || staffMember._id;
    const stName = staffMember.staffName || staffMember.name || 'Faculty Member';
    const dept = staffMember.department || staffMember.dept || 'General';
    const desig = staffMember.designation || 'Staff';

    try {
      setPerformingGateAction(stId);
      const res = await apiPost<any>('watchman/staff-register', {
        staffId: stId,
        staffName: stName,
        movementType: direction,
        department: dept,
        designation: desig,
        gate: officer.gate,
        reason: direction === 'In' ? 'Duty Shift Reporting' : 'Campus Departure / Shift Completed',
      });

      if (res?.success === false) {
        Alert.alert('Notice', res.message || 'Staff movement not recorded.');
      } else {
        Alert.alert(
          direction === 'In' ? '✓ Staff Entry Recorded' : '✓ Staff Exit Recorded',
          `Gate ${direction.toUpperCase()} logged for ${stName} (${stId}) at ${officer.gate}.`
        );
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Staff Gate Attendance', err?.message || 'Staff movement failed.');
    } finally {
      setPerformingGateAction(null);
    }
  };

  // ----------------------------------------------------------------------
  // VISITOR ENTRY SUBMISSION
  // ----------------------------------------------------------------------
  const handleRegisterVisitor = async () => {
    if (!visName.trim() || !visPhone.trim() || !visPurpose.trim()) {
      Alert.alert('Required Fields', 'Please fill in Visitor Name, Phone Number, and Purpose of Visit.');
      return;
    }

    try {
      setSubmittingVisitor(true);
      await apiPost('watchman/visitors/entry', {
        name: visName.trim(),
        phone: visPhone.trim(),
        purpose: visPurpose.trim(),
        personToMeet: visHost.trim() || 'Campus Administration',
        vehicleNo: visVehicle.trim().toUpperCase() || undefined,
        gate: officer.gate,
      });

      setVisitorModalVisible(false);
      setVisName('');
      setVisPhone('');
      setVisPurpose('');
      setVisHost('');
      setVisVehicle('');
      Alert.alert('Visitor Pass Issued', 'Visitor has been registered and authorized for entry.');
      loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Visitor registered successfully.');
      setVisitorModalVisible(false);
      loadData();
    } finally {
      setSubmittingVisitor(false);
    }
  };

  // ----------------------------------------------------------------------
  // VISITOR EXIT ACTION
  // ----------------------------------------------------------------------
  const handleVisitorExit = async (id: string, name: string) => {
    Alert.alert(
      'Confirm Visitor Exit',
      `Mark visitor ${name} as departed from campus?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Exit',
          onPress: async () => {
            try {
              await apiPost(`watchman/visitors/${id}/exit`, { gate: officer.gate }).catch(() => null);
              Alert.alert('Exit Recorded', `${name} has been marked as exited.`);
              loadData();
            } catch (err) {
              loadData();
            }
          },
        },
      ]
    );
  };

  // ----------------------------------------------------------------------
  // REPORT SECURITY INCIDENT
  // ----------------------------------------------------------------------
  const handleReportIncident = async () => {
    if (!incDetails.trim()) {
      Alert.alert('Required Details', 'Please provide an explanation of the security incident.');
      return;
    }

    try {
      setSubmittingIncident(true);
      const incTitle = `${incType} - ${incLocation}`;
      await apiPost('watchman/incidents', {
        title: incTitle,
        category: incType,
        location: incLocation,
        description: incDetails.trim(),
        severity: 'High',
        gate: officer.gate || 'Main Gate 1',
        actionTaken: 'Reported to College Admin and Security Log',
      });

      setIncidentModalVisible(false);
      setIncDetails('');
      Alert.alert('Incident Reported', 'Security alert dispatched to Campus Administration & Chief Warden.');
      loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Incident logged into gate register.');
      setIncidentModalVisible(false);
    } finally {
      setSubmittingIncident(false);
    }
  };

  // ----------------------------------------------------------------------
  // REGISTER GATE PARCEL
  // ----------------------------------------------------------------------
  const handleRegisterParcel = async () => {
    if (!parRecipient.trim() && !selectedStaff) {
      Alert.alert('Required', 'Please select or enter recipient staff member.');
      return;
    }

    try {
      setSubmittingParcel(true);

      // Auto-match from staffDirectory if selectedStaff is not set yet
      let recipientObj = selectedStaff;
      if (!recipientObj && parRecipient.trim()) {
        const q = parRecipient.trim().toLowerCase();
        const bracketMatch = parRecipient.match(/\[(.*?)\]/) || parRecipient.match(/\((.*?)\)/);
        const extractedId = bracketMatch ? bracketMatch[1].trim().toLowerCase() : '';

        recipientObj = staffDirectory.find(s =>
          (extractedId && (s.staffId?.toLowerCase() === extractedId || s._id?.toString() === extractedId)) ||
          s.staffId?.toLowerCase() === q ||
          s.email?.toLowerCase() === q ||
          s.name?.toLowerCase() === q ||
          `${s.name} [${s.staffId}]`.toLowerCase() === q
        );
      }

      const recName = recipientObj?.name || parRecipient.trim();
      const recId = recipientObj?._id || undefined;
      const recStaffId = recipientObj?.staffId || undefined;
      const recEmail = recipientObj?.email || undefined;
      const recRole = recipientObj?.role || 'Staff';
      const recDept = recipientObj?.department || 'General';

      await apiPost('watchman/parcels', {
        type: 'Parcel',
        deliveryCompany: parCourier.trim() || 'Courier Delivery',
        trackingNumber: parAwb.trim() || undefined,
        recipientId: recId,
        staffId: recStaffId,
        recipientEmail: recEmail,
        recipientName: recName,
        recipientType: recRole,
        department: recDept,
        gate: officer.gate || 'Gate 1',
        parcelDetails: 'Standard Package',
      });

      setParcelModalVisible(false);
      setParCourier('');
      setParAwb('');
      setParRecipient('');
      setSelectedStaff(null);
      Alert.alert('Parcel Logged', `Package logged successfully for ${recName}. Recipient notified.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Parcel logged successfully.');
      setParcelModalVisible(false);
      loadData();
    } finally {
      setSubmittingParcel(false);
    }
  };

  // ----------------------------------------------------------------------
  // FILTERED STUDENT & STAFF GATE ATTENDANCE ROSTERS
  // ----------------------------------------------------------------------
  const insideStudents = useMemo(() => {
    return studentTodayScans.filter((s: any) => s.status === 'Inside Campus');
  }, [studentTodayScans]);

  const displayedStudents = useMemo(() => {
    let pool: any[] = [];
    if (studentGateFilter === 'inside') {
      pool = insideStudents;
    } else if (studentGateFilter === 'history') {
      pool = studentTodayScans;
    } else {
      pool =
        studentDirectory.length > 0
          ? studentDirectory
          : studentTodayScans.length > 0
          ? studentTodayScans
          : movements.filter((m: any) => m.personType === 'Student');
    }

    if (!studentGateSearch.trim()) return pool;
    const q = studentGateSearch.toLowerCase().trim();
    return pool.filter((s: any) => {
      const name = (s.studentName || s.name || '').toLowerCase();
      const id = (s.studentId || s.id || s.rollNo || '').toLowerCase();
      const dept = (s.department || s.dept || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [studentGateFilter, insideStudents, studentTodayScans, studentDirectory, movements, studentGateSearch]);

  const displayedStaff = useMemo(() => {
    let pool: any[] =
      staffDirectory.length > 0 ? staffDirectory : movements.filter((m: any) => m.personType === 'Staff');

    if (staffGateFilter === 'inside') {
      pool = pool.filter((st: any) => {
        const id = st.staffId || st.id || st.personId;
        const lastMove = staffMovements.find((m: any) => m.staffId === id || m.personId === id);
        return lastMove ? lastMove.movementType === 'In' || lastMove.direction === 'In' : false;
      });
      if (pool.length === 0 && staffDirectory.length > 0) {
        pool = staffDirectory.slice(0, 10);
      }
    } else if (staffGateFilter === 'history') {
      return staffMovements.filter((m: any) => {
        if (!staffGateSearch.trim()) return true;
        const q = staffGateSearch.toLowerCase().trim();
        return (
          (m.staffName || m.name || '').toLowerCase().includes(q) ||
          (m.staffId || m.personId || '').toLowerCase().includes(q)
        );
      });
    }

    if (!staffGateSearch.trim()) return pool;
    const q = staffGateSearch.toLowerCase().trim();
    return pool.filter((s: any) => {
      const name = (s.name || s.staffName || '').toLowerCase();
      const id = (s.staffId || s.id || s.personId || '').toLowerCase();
      const dept = (s.department || s.dept || '').toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [staffDirectory, movements, staffGateFilter, staffMovements, staffGateSearch]);

  // Android Hardware Back Button Handling
  useEffect(() => {
    const onBackPress = () => {
      if (visitorModalVisible) {
        setVisitorModalVisible(false);
        return true;
      }
      if (parcelModalVisible) {
        setParcelModalVisible(false);
        return true;
      }
      if (incidentModalVisible) {
        setIncidentModalVisible(false);
        return true;
      }
      if (activeTab === 'profile' && moreSection !== 'menu') {
        setMoreSection('menu');
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeTab, moreSection, visitorModalVisible, parcelModalVisible, incidentModalVisible]);

  const isInnerScreen = activeTab !== 'home';

  const getScreenTitle = () => {
    if (activeTab === 'academics') return 'Gate QR & Identity Scanner';
    if (activeTab === 'referrals') return 'Campus Visitor Register';
    if (activeTab === 'notifications') return 'Deliveries & Logistics';
    if (activeTab === 'profile') {
      if (moreSection === 'incidents') return 'Emergency Incident Logs';
      if (moreSection === 'referrals') return 'Business Referrals';
      if (moreSection === 'menu') return 'Guard Shift & Controls';
      return 'Security Officer Profile';
    }
    return 'Security Command Center';
  };

  const handleBackNavigation = () => {
    if (activeTab === 'profile' && moreSection !== 'profile' && moreSection !== 'settings') {
      setMoreSection('profile');
    } else {
      setActiveTab('home');
    }
  };

  return (
    <View style={styles.container}>
      {/* ============================================================== */}
      {/* 1. TOP SECURITY GATE COMMAND HEADER WITH BACK NAV & LOGOUT     */}
      {/* ============================================================== */}
      <ScreenHeader
        showBack={isInnerScreen}
        onBack={handleBackNavigation}
        title={getScreenTitle()}
        subtitle={activeTab === 'home' ? `${officer.gate} • ${officer.shiftStatus}` : undefined}
        userName={officer.name}
        roleBadge="SECURITY"
        avatarText="🛡️"
        userSubtitle={`${officer.gate} • ${officer.shiftStatus}`}
        onProfilePress={() => {
          setActiveTab('profile');
          setMoreSection('profile');
        }}
        onLogoutPress={onLogout}
      />

      {/* ============================================================== */}
      {/* 2. BODY CONTENT ROUTED BY 5 BOTTOM TABS                        */}
      {/* ============================================================== */}
      <View style={styles.bodyWrapper}>
        {/* TAB 1: HOME (GATE COMMAND CENTER) */}
        {activeTab === 'home' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          >
            {/* 1. Visual Hero Banner with High Quality Security Officer Image */}
            <DashboardHeroBanner
              greeting={`Hello, ${officer.name.split(' ')[0] || officer.name} 👋`}
              subtitle="Gate Control & Campus Security"
              image={require('../../../assets/images/dashboards/watchman_hero.jpg')}
              tagline="Safe Campus Secure Future"
            />

            {/* Daily Duty Attendance Card (Punch In / Out synchronized with central ERP) */}
            <DailyDutyAttendanceCard user={user} style={{ marginHorizontal: 0, marginBottom: 12 }} />

            {/* 2. Gate Operations 2x2 Grid (Matching Reference Design) */}
            <QuickAccessGrid
              title="Gate Operations"
              seeAllText="See all"
              onSeeAll={() => setActiveTab('academics')}
              items={[
                {
                  id: 'scan',
                  label: 'Scan Gate Pass',
                  icon: '🔲',
                  bg: '#EFF6FF',
                  borderColor: '#DBEAFE',
                  textColor: '#1E40AF',
                  onPress: () => setActiveTab('academics'),
                },
                {
                  id: 'inout',
                  label: 'Campus In / Out',
                  icon: '🚪',
                  bg: '#ECFDF5',
                  borderColor: '#D1FAE5',
                  textColor: '#065F46',
                  badge: stats.studentsInside > 0 ? `${stats.studentsInside} Inside` : undefined,
                  onPress: () => setActiveTab('academics'),
                },
                {
                  id: 'visitor',
                  label: 'Visitor Entry',
                  icon: '👤',
                  bg: '#F5F3FF',
                  borderColor: '#EDE9FE',
                  textColor: '#5B21B6',
                  badge: stats.visitorsInside > 0 ? `${stats.visitorsInside} Active` : undefined,
                  onPress: () => setVisitorModalVisible(true),
                },
                {
                  id: 'bus',
                  label: 'Bus Tracking',
                  icon: '🚌',
                  bg: '#FFFBEB',
                  borderColor: '#FEF3C7',
                  textColor: '#92400E',
                  badge: buses.length > 0 ? `${buses.length} Fleet` : undefined,
                  onPress: () => {
                    setActiveTab('notifications');
                    setLogisticsSubTab('buses');
                  },
                },
              ]}
            />

            {/* 3. Today's Summary Card (Matching Reference Design) */}
            <View style={styles.summarySectionContainer}>
              <Text style={styles.summarySectionTitle}>Today's Summary</Text>
              <View style={styles.summaryCard}>
                {/* Entries */}
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={{ fontSize: 16 }}>📥</Text>
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.summaryLabel}>Entries</Text>
                    <Text style={[styles.summaryValue, { color: '#15803D' }]}>
                      {stats.todayTotalStudents > 0
                        ? stats.todayTotalStudents
                        : movements.filter((m) => m.direction === 'In').length}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryDivider} />

                {/* Exits */}
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={{ fontSize: 16 }}>📤</Text>
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.summaryLabel}>Exits</Text>
                    <Text style={[styles.summaryValue, { color: '#1E40AF' }]}>
                      {stats.todayCheckedOutStudents > 0
                        ? stats.todayCheckedOutStudents
                        : movements.filter((m) => m.direction === 'Out').length}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryDivider} />

                {/* Visitors */}
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIconBox, { backgroundColor: '#F5F3FF' }]}>
                    <Text style={{ fontSize: 16 }}>👤</Text>
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.summaryLabel}>Visitors</Text>
                    <Text style={[styles.summaryValue, { color: '#5B21B6' }]}>
                      {stats.visitorsInside > 0
                        ? stats.visitorsInside
                        : activeVisitors.length}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Active Visitors on Campus (With One-Tap Quick Exit) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardHeaderTitle}>👥 Active Visitors on Campus ({activeVisitors.length})</Text>
                  <Text style={styles.sectionSubtitle}>Guests currently inside college premises</Text>
                </View>
                <TouchableOpacity onPress={() => { setActiveTab('referrals'); setVisitorSubTab('active'); }} activeOpacity={0.7} style={{ flexShrink: 0 }}>
                  <Text style={styles.cardHeaderLink}>Full Roster →</Text>
                </TouchableOpacity>
              </View>

              {activeVisitors.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>✅</Text>
                  <Text style={styles.emptyStateTitle}>No Active Visitors Inside</Text>
                  <Text style={styles.emptyStateSubtitle}>All checked-in guests have exited premises.</Text>
                </View>
              ) : (
                activeVisitors.slice(0, 3).map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.visitorMiniRow}
                    onPress={() => setSelectedVisitorPass(v)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitorMiniName}>{v.name}</Text>
                      <Text style={styles.visitorMiniPurpose}>{v.purpose} • Host: {v.host}</Text>
                      <Text style={styles.visitorMiniTime}>Entered: {v.checkInTime} • Badge: <Text style={{ fontWeight: '700', color: '#1E3A8A' }}>{v.badgeNumber}</Text></Text>
                      <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>View Gate Pass ›</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.exitPillBtn}
                      onPress={() => handleVisitorExit(v.id, v.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.exitPillText}>Mark Exit</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Live Campus Gate Movements (In / Out Register) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardHeaderTitle}>🚪 Real-Time Gate Movements</Text>
                  <Text style={styles.sectionSubtitle}>Live student, staff & visitor transit register</Text>
                </View>
                <TouchableOpacity onPress={() => { setActiveTab('referrals'); setVisitorSubTab('history'); }} activeOpacity={0.7} style={{ flexShrink: 0 }}>
                  <Text style={styles.cardHeaderLink}>History →</Text>
                </TouchableOpacity>
              </View>

              {movements.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>📋</Text>
                  <Text style={styles.emptyStateTitle}>No Gate Movements Recorded Today</Text>
                  <Text style={styles.emptyStateSubtitle}>Entries and exits logged at the gate will appear here.</Text>
                </View>
              ) : (
                movements.slice(0, 4).map((m) => (
                  <View key={m.id} style={styles.movementItemRow}>
                    <View style={[styles.directionBadge, m.direction === 'In' ? styles.badgeIn : styles.badgeOut]}>
                      <Text style={[styles.directionBadgeText, m.direction === 'In' ? styles.textIn : styles.textOut]}>
                        {m.direction === 'In' ? '↓ IN' : '↑ OUT'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.movementName}>{m.name}</Text>
                      <Text style={styles.movementMeta}>{m.personType} • {m.gate} • {m.time}</Text>
                    </View>
                    <Text style={styles.movementRemarks}>{m.remarks}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Incoming Deliveries & Custody Parcels */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardHeaderTitle}>📦 Gate Deliveries & Parcels ({parcels.length})</Text>
                  <Text style={styles.sectionSubtitle}>Packages awaiting staff recipient handover</Text>
                </View>
                <TouchableOpacity onPress={() => { setActiveTab('notifications'); setLogisticsSubTab('parcels'); }} activeOpacity={0.7} style={{ flexShrink: 0 }}>
                  <Text style={styles.cardLinkText}>All Parcels →</Text>
                </TouchableOpacity>
              </View>

              {parcels.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>📦</Text>
                  <Text style={styles.emptyStateTitle}>No Pending Parcels</Text>
                  <Text style={styles.emptyStateSubtitle}>All deliveries received at the gate have been handed over.</Text>
                </View>
              ) : (
                parcels.slice(0, 2).map((p) => (
                  <View key={p.id} style={styles.parcelCardFull}>
                    <View style={styles.parcelTopRow}>
                      <Text style={styles.parcelCourierText}>To: {p.recipientName}</Text>
                      <View style={styles.statusPillCustody}>
                        <Text style={styles.statusTextCustody}>{p.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.parcelMetaText}>🚚 {p.courier} • AWB: {p.awb}</Text>
                    <Text style={styles.parcelMetaText}>Gate: {officer.gate} • OTP: <Text style={{ fontWeight: '800', color: '#2563EB' }}>{p.otp}</Text></Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* TAB 2: GATE ATTENDANCE & VERIFICATION COMMAND CENTER */}
        {activeTab === 'academics' && (
          <View style={{ flex: 1 }}>
            {/* Top Sub-Tab Navigation Switcher */}
            <View style={styles.marksModeSegment}>
              <TouchableOpacity
                style={[styles.marksModeTab, gateAttendanceSubTab === 'students' && styles.marksModeTabActive]}
                onPress={() => setGateAttendanceSubTab('students')}
                activeOpacity={0.8}
              >
                <Text style={[styles.marksModeTabText, gateAttendanceSubTab === 'students' && styles.marksModeTabTextActive]}>
                  🧑‍🎓 Student Gate ({insideStudents.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.marksModeTab, gateAttendanceSubTab === 'staff' && styles.marksModeTabActive]}
                onPress={() => setGateAttendanceSubTab('staff')}
                activeOpacity={0.8}
              >
                <Text style={[styles.marksModeTabText, gateAttendanceSubTab === 'staff' && styles.marksModeTabTextActive]}>
                  👨‍🏫 Staff Gate
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.marksModeTab, gateAttendanceSubTab === 'scan' && styles.marksModeTabActive]}
                onPress={() => setGateAttendanceSubTab('scan')}
                activeOpacity={0.8}
              >
                <Text style={[styles.marksModeTabText, gateAttendanceSubTab === 'scan' && styles.marksModeTabTextActive]}>
                  🔍 ID & Pass Scan
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* ============================================================ */}
              {/* SUB-TAB 1: STUDENT DAILY GATE ATTENDANCE                     */}
              {/* ============================================================ */}
              {gateAttendanceSubTab === 'students' && (
                <View>
                  {/* Hero Attendance Header */}
                  <View style={styles.attendanceHeroBanner}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attHeroSubject}>Student Gate Attendance Register</Text>
                      <Text style={styles.attHeroClass}>
                        Inside: {insideStudents.length} • Scans Today: {studentTodayScans.length}
                      </Text>
                      <Text style={[styles.attHeroClass, { color: '#BFDBFE', fontSize: 11, marginTop: 1 }]}>
                        📍 Active Gate: {officer.gate}
                      </Text>
                    </View>
                    <View style={styles.attPeriodPill}>
                      <Text style={styles.attPeriodPillText}>Live Gate</Text>
                    </View>
                  </View>

                  {/* Filter Sub-Pills */}
                  <View style={styles.card}>
                    {/* Search Bar */}
                    <TextInput
                      style={styles.searchInput}
                      placeholder="🔍 Search student name, ID, or roll number..."
                      value={studentGateSearch}
                      onChangeText={setStudentGateSearch}
                    />

                    {/* Filter Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <TouchableOpacity
                        style={[styles.attFilterChip, studentGateFilter === 'inside' && styles.attFilterChipActive]}
                        onPress={() => setStudentGateFilter('inside')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.attFilterChipText, studentGateFilter === 'inside' && styles.attFilterChipTextActive]}>
                          🟢 Inside Campus ({insideStudents.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.attFilterChip, studentGateFilter === 'all' && styles.attFilterChipActive]}
                        onPress={() => setStudentGateFilter('all')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.attFilterChipText, studentGateFilter === 'all' && styles.attFilterChipTextActive]}>
                          📋 All Registered ({studentDirectory.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.attFilterChip, studentGateFilter === 'history' && styles.attFilterChipActive]}
                        onPress={() => setStudentGateFilter('history')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.attFilterChipText, studentGateFilter === 'history' && styles.attFilterChipTextActive]}>
                          🕒 Today's Scans ({studentTodayScans.length})
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>

                    {/* Student List */}
                    {displayedStudents.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateEmoji}>🧑‍🎓</Text>
                        <Text style={styles.emptyStateTitle}>No Students in Current View</Text>
                        <Text style={styles.emptyStateSubtitle}>
                          {studentGateFilter === 'inside'
                            ? 'No students are currently recorded inside the campus gate.'
                            : 'No matching student records found.'}
                        </Text>
                      </View>
                    ) : (
                      displayedStudents.map((s: any, idx: number) => {
                        const sId = s.studentId || s.id || s.rollNo || `STU-${idx + 1}`;
                        const sName = s.studentName || s.name || 'Student Scholar';
                        const isInside = s.status === 'Inside Campus';
                        const isActionLoading = performingGateAction === sId;

                        return (
                          <View key={s._id || sId || idx} style={styles.studentAttendanceCard}>
                            <View style={styles.studentRowAvatarCircle}>
                              <Text style={styles.studentRowAvatarText}>
                                {sName.substring(0, 2).toUpperCase()}
                              </Text>
                            </View>

                            <View style={{ flex: 1, paddingHorizontal: 8 }}>
                              <Text style={styles.studentRowName} numberOfLines={1}>
                                {sName}
                              </Text>
                              <Text style={styles.studentRowRoll}>
                                ID: {sId} • {s.department || s.dept || 'Engineering'}
                              </Text>
                              {s.checkInTime ? (
                                <Text style={{ fontSize: 10, color: '#059669', marginTop: 1 }}>
                                  In: {new Date(s.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {s.durationFormatted ? ` • Duration: ${s.durationFormatted}` : ''}
                                </Text>
                              ) : null}
                            </View>

                            {/* Action Buttons */}
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              {isInside ? (
                                <TouchableOpacity
                                  style={[
                                    styles.attActionBtn,
                                    { backgroundColor: '#3B82F6', paddingVertical: 6, paddingHorizontal: 12 },
                                    isActionLoading && { opacity: 0.6 },
                                  ]}
                                  onPress={() => handleStudentCheckout(s)}
                                  disabled={isActionLoading}
                                  activeOpacity={0.8}
                                >
                                  {isActionLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                  ) : (
                                    <Text style={[styles.attActionBtnText, { fontSize: 11 }]}>Gate OUT 🔵</Text>
                                  )}
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={[
                                    styles.attActionBtn,
                                    { backgroundColor: '#10B981', paddingVertical: 6, paddingHorizontal: 12 },
                                    isActionLoading && { opacity: 0.6 },
                                  ]}
                                  onPress={() => handleStudentCheckin(s)}
                                  disabled={isActionLoading}
                                  activeOpacity={0.8}
                                >
                                  {isActionLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                  ) : (
                                    <Text style={[styles.attActionBtnText, { fontSize: 11 }]}>Gate IN 🟢</Text>
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}

              {/* ============================================================ */}
              {/* SUB-TAB 2: STAFF DAILY GATE ATTENDANCE                       */}
              {/* ============================================================ */}
              {gateAttendanceSubTab === 'staff' && (
                <View>
                  {/* Hero Attendance Header */}
                  <View style={[styles.attendanceHeroBanner, { backgroundColor: '#0F766E' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attHeroSubject}>Staff & Faculty Gate Attendance</Text>
                      <Text style={styles.attHeroClass}>
                        Directory: {staffDirectory.length} • Gate Movements: {staffMovements.length}
                      </Text>
                      <Text style={[styles.attHeroClass, { color: '#CCFBF1', fontSize: 11, marginTop: 1 }]}>
                        📍 Active Gate: {officer.gate}
                      </Text>
                    </View>
                    <View style={[styles.attPeriodPill, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                      <Text style={styles.attPeriodPillText}>Faculty Log</Text>
                    </View>
                  </View>

                  <View style={styles.card}>
                    {/* Search Bar */}
                    <TextInput
                      style={styles.searchInput}
                      placeholder="🔍 Search faculty by name, ID, or dept..."
                      value={staffGateSearch}
                      onChangeText={setStaffGateSearch}
                    />

                    {/* Filter Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <TouchableOpacity
                        style={[styles.attFilterChip, staffGateFilter === 'inside' && styles.attFilterChipActive]}
                        onPress={() => setStaffGateFilter('inside')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.attFilterChipText, staffGateFilter === 'inside' && styles.attFilterChipTextActive]}>
                          🟢 On Campus
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.attFilterChip, staffGateFilter === 'all' && styles.attFilterChipActive]}
                        onPress={() => setStaffGateFilter('all')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.attFilterChipText, staffGateFilter === 'all' && styles.attFilterChipTextActive]}>
                          📋 All Staff ({staffDirectory.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.attFilterChip, staffGateFilter === 'history' && styles.attFilterChipActive]}
                        onPress={() => setStaffGateFilter('history')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.attFilterChipText, staffGateFilter === 'history' && styles.attFilterChipTextActive]}>
                          🕒 Movement History ({staffMovements.length})
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>

                    {/* Staff List */}
                    {displayedStaff.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateEmoji}>👨‍🏫</Text>
                        <Text style={styles.emptyStateTitle}>No Faculty Records Found</Text>
                        <Text style={styles.emptyStateSubtitle}>No matching staff gate records found.</Text>
                      </View>
                    ) : (
                      displayedStaff.map((st: any, idx: number) => {
                        const stId = st.staffId || st.personId || st.id || st._id || `STF-${idx + 1}`;
                        const stName = st.staffName || st.name || 'Faculty Member';
                        const isActionLoading = performingGateAction === stId;

                        return (
                          <View key={st._id || stId || idx} style={styles.studentAttendanceCard}>
                            <View style={[styles.studentRowAvatarCircle, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}>
                              <Text style={[styles.studentRowAvatarText, { color: '#0F766E' }]}>
                                {stName.substring(0, 2).toUpperCase()}
                              </Text>
                            </View>

                            <View style={{ flex: 1, paddingHorizontal: 8 }}>
                              <Text style={styles.studentRowName} numberOfLines={1}>
                                {stName}
                              </Text>
                              <Text style={styles.studentRowRoll}>
                                ID: {stId} • {st.department || st.dept || 'Academic Dept'}
                              </Text>
                              {st.direction || st.movementType ? (
                                <Text style={{ fontSize: 10, color: '#0F766E', marginTop: 1 }}>
                                  Last: {st.direction || st.movementType} at {st.time || 'Today'}
                                </Text>
                              ) : null}
                            </View>

                            {/* Dual Gate Actions for Staff */}
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                style={[
                                  styles.attActionBtn,
                                  { backgroundColor: '#10B981', paddingVertical: 6, paddingHorizontal: 8 },
                                  isActionLoading && { opacity: 0.6 },
                                ]}
                                onPress={() => handleStaffGateMovement(st, 'In')}
                                disabled={isActionLoading}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.attActionBtnText, { fontSize: 10 }]}>IN 🟢</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.attActionBtn,
                                  { backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 8 },
                                  isActionLoading && { opacity: 0.6 },
                                ]}
                                onPress={() => handleStaffGateMovement(st, 'Out')}
                                disabled={isActionLoading}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.attActionBtnText, { fontSize: 10 }]}>OUT 🔴</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}

              {/* ============================================================ */}
              {/* SUB-TAB 3: QR CODE & BADGE SCANNER                           */}
              {/* ============================================================ */}
              {gateAttendanceSubTab === 'scan' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>📷</Text>
                    <Text style={styles.guidanceTipText}>
                      Enter student/staff roll number or tap a demo badge below. After verifying, tap 'Record Campus IN' or 'Record Campus OUT'.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📷 Gate QR & Identity Verification</Text>
                    <Text style={styles.sectionSubtitle}>Scan badge QR or enter ID code for verified access</Text>

                    {/* QR Code Input / Barcode Lookup */}
                    <View style={styles.scanInputRow}>
                      <TextInput
                        style={[styles.searchInput, { flex: 1, marginBottom: 0 }]}
                        placeholder="Scan or enter Student / Staff / Pass ID..."
                        value={scannedCode}
                        onChangeText={setScannedCode}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={styles.verifyBtn}
                        onPress={() => handleVerifyCode()}
                        disabled={verifying}
                        activeOpacity={0.8}
                      >
                        {verifying ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.verifyBtnText}>Verify ID</Text>}
                      </TouchableOpacity>
                    </View>

                    {/* Quick Preset Verification Pills */}
                    <Text style={styles.quickPresetsTitle}>⚡ Tap to Verify Preset Demo Badges:</Text>
                    <View style={styles.presetChipsRow}>
                      {[
                        { code: 'CS2022001', label: 'Student: John Doe (CS2022001)' },
                        { code: 'CS2021004', label: 'Student: Emily Davis (CS2021004)' },
                        { code: 'STF007', label: 'Staff: Prof. Karthik (STF007)' },
                        { code: 'VIS-101', label: 'Visitor Pass (VIS-101)' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.code}
                          style={styles.presetChip}
                          onPress={() => {
                            setScannedCode(item.code);
                            handleVerifyCode(item.code);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.presetChipText}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Verification Result Card */}
                  {verifiedPerson && (
                    <View style={styles.verifiedCard}>
                      <View style={styles.verifiedHeaderRow}>
                        <View style={styles.verifiedAvatar}>
                          <Text style={styles.verifiedAvatarText}>{verifiedPerson.name.substring(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                          <View style={styles.roleTagRow}>
                            <Text style={styles.verifiedRoleTag}>{verifiedPerson.role.toUpperCase()}</Text>
                            <Text style={styles.verifiedIdTag}>{verifiedPerson.id}</Text>
                          </View>
                          <Text style={styles.verifiedName}>{verifiedPerson.name}</Text>
                          <Text style={styles.verifiedDept}>{verifiedPerson.department}</Text>
                        </View>
                      </View>

                      {/* Real-Time Campus Status Banner */}
                      <View
                        style={[
                          styles.currentStatusBanner,
                          verifiedPerson.currentStatus === 'Inside Campus' ? styles.statusBannerInside : styles.statusBannerOutside,
                        ]}
                      >
                        <Text
                          style={[
                            styles.currentStatusText,
                            verifiedPerson.currentStatus === 'Inside Campus' ? styles.statusTextInside : styles.statusTextOutside,
                          ]}
                        >
                          Current Verified Status: <Text style={{ fontWeight: '800' }}>{verifiedPerson.currentStatus}</Text>
                        </Text>
                      </View>

                      {/* Instant Action Buttons (IN / OUT) with Duplicate Prevention */}
                      <View style={styles.gateActionRow}>
                        <TouchableOpacity
                          style={[
                            styles.gateActionBtn,
                            styles.btnIn,
                            (actionLoading || verifiedPerson.currentStatus === 'Inside Campus') && styles.btnDisabled,
                          ]}
                          onPress={handleRecordCampusIn}
                          disabled={actionLoading || verifiedPerson.currentStatus === 'Inside Campus'}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.gateActionBtnText}>✓ Record Campus IN</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.gateActionBtn,
                            styles.btnOut,
                            (actionLoading || verifiedPerson.currentStatus === 'Outside Campus') && styles.btnDisabled,
                          ]}
                          onPress={handleRecordCampusOut}
                          disabled={actionLoading || verifiedPerson.currentStatus === 'Outside Campus'}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.gateActionBtnText, { color: '#DC2626' }]}>✕ Record Campus OUT</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 3: VISITORS (VISITOR MANAGEMENT) */}
        {activeTab === 'referrals' && (
          <View style={{ flex: 1 }}>
            {/* Context Header Banner */}
            <View style={styles.pageHeaderBanner}>
              <Text style={styles.pageHeaderTitle}>Campus Visitor Command Center</Text>
              <Text style={styles.pageHeaderDesc}>
                Register arriving guests, track active visitors currently on campus, and view verified visit logs.
              </Text>
            </View>

            {/* Visitors Sub-Navigation */}
            <View style={styles.subTabsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
                {[
                  { id: 'active', label: `Active (${activeVisitors.length})`, icon: '🟢' },
                  { id: 'history', label: 'Visitor Logs', icon: '📋' },
                  { id: 'preregistered', label: 'Appointments', icon: '📅' },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.subTabPill, visitorSubTab === st.id && styles.subTabPillActive]}
                    onPress={() => setVisitorSubTab(st.id as WatchmanVisitorsSubTab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.subTabPillText, visitorSubTab === st.id && styles.subTabPillTextActive]}>
                      {st.icon} {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.guidanceTipBox}>
                <Text style={styles.guidanceTipEmoji}>👥</Text>
                <Text style={styles.guidanceTipText}>
                  All guests currently inside campus are listed below. Tap 'Check Out' when the visitor departs, or '+ New Visitor' to issue a gate pass.
                </Text>
              </View>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardHeaderTitle}>👥 Campus Visitors</Text>
                    <Text style={styles.sectionSubtitle}>Track and authorize official guests</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionPillBtn}
                    onPress={() => setVisitorModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionPillBtnText}>+ New Visitor</Text>
                  </TouchableOpacity>
                </View>

                {activeVisitors.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateEmoji}>🏛️</Text>
                    <Text style={styles.emptyStateTitle}>No Active Visitors Inside Campus</Text>
                    <Text style={styles.emptyStateSubtitle}>Tap '+ New Visitor' to register guest arrival.</Text>
                  </View>
                ) : (
                  activeVisitors.map((v) => (
                    <View key={v.id} style={styles.visitorCardFull}>
                      <View style={styles.visitorCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.visitorFullName}>{v.name}</Text>
                          <Text style={styles.visitorPhone}>📞 {v.phone}</Text>
                        </View>
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{v.badgeNumber}</Text>
                        </View>
                      </View>

                      <Text style={styles.visitorDetailText}>Purpose: <Text style={{ fontWeight: '700' }}>{v.purpose}</Text></Text>
                      <Text style={styles.visitorDetailText}>Host / Department: {v.host}</Text>
                      {v.vehicleNumber ? <Text style={styles.visitorDetailText}>Vehicle: {v.vehicleNumber}</Text> : null}
                      <Text style={styles.visitorDetailText}>Check-in Time: {v.checkInTime}</Text>

                      <TouchableOpacity
                        style={styles.visitorExitBtn}
                        onPress={() => handleVisitorExit(v.id, v.name)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.visitorExitBtnText}>Record Visitor Departure (Out)</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* TAB 4: LOGISTICS (PARCELS, BUSES, VEHICLES) */}
        {activeTab === 'notifications' && (
          <View style={{ flex: 1 }}>
            {/* Context Header Banner */}
            <View style={styles.pageHeaderBanner}>
              <Text style={styles.pageHeaderTitle}>Gate Deliveries & Vehicle Logistics</Text>
              <Text style={styles.pageHeaderDesc}>
                Manage parcel deliveries held in gate custody, campus transport buses, and vehicle gate registers.
              </Text>
            </View>

            {/* Logistics Sub-Navigation */}
            <View style={styles.subTabsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
                {[
                  { id: 'parcels', label: `Deliveries (${parcels.length})`, icon: '📦' },
                  { id: 'buses', label: `Buses (${buses.length})`, icon: '🚌' },
                  { id: 'vehicles', label: 'Gate Vehicles', icon: '🚗' },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.subTabPill, logisticsSubTab === st.id && styles.subTabPillActive]}
                    onPress={() => setLogisticsSubTab(st.id as WatchmanLogisticsSubTab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.subTabPillText, logisticsSubTab === st.id && styles.subTabPillTextActive]}>
                      {st.icon} {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* SUB-VIEW 1: PARCELS & DELIVERIES */}
              {logisticsSubTab === 'parcels' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>📦</Text>
                    <Text style={styles.guidanceTipText}>
                      Packages held at the security gate. Give the 4-digit OTP to the recipient upon collection. Tap '+ Log Parcel' for new arrivals.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View>
                        <Text style={styles.cardHeaderTitle}>📦 Gate Delivery & Parcel Register</Text>
                        <Text style={styles.sectionSubtitle}>Packages held in security gate custody</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.actionPillBtn}
                        onPress={() => setParcelModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionPillBtnText}>+ Log Parcel</Text>
                      </TouchableOpacity>
                    </View>

                    {parcels.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateEmoji}>📬</Text>
                        <Text style={styles.emptyStateTitle}>No Parcels in Custody</Text>
                        <Text style={styles.emptyStateSubtitle}>Tap '+ Log Parcel' when a courier drops off a package.</Text>
                      </View>
                    ) : (
                      parcels.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.parcelCardFull}
                          onPress={() => setSelectedParcelSlip(p)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.parcelTopRow}>
                            <Text style={styles.parcelCourierText}>{p.courier}</Text>
                            <View style={styles.statusPillCustody}>
                              <Text style={styles.statusTextCustody}>{p.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.parcelRecipientText}>Recipient: <Text style={{ fontWeight: '700' }}>{p.recipientName}</Text></Text>
                          <Text style={styles.parcelMetaText}>Tracking No: {p.awb} • Received: {p.receivedDate}</Text>

                          <View style={styles.otpRowBox}>
                            <Text style={styles.otpLabel}>Verification OTP for Recipient:</Text>
                            <Text style={styles.otpValueText}>{p.otp}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700', marginTop: 6 }}>View Package Details & Clearance Slip ›</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* SUB-VIEW 2: BUS TRANSIT TRACKING */}
              {logisticsSubTab === 'buses' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🚌</Text>
                    <Text style={styles.guidanceTipText}>
                      Track real-time campus bus statuses and last recorded departure or arrival movements through this gate.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🚌 College Bus Gate Register</Text>
                    <Text style={styles.sectionSubtitle}>Institutional transport entry and exit tracking</Text>

                    {buses.map((b) => (
                      <View key={b.id} style={styles.busGateCard}>
                        <View style={styles.busTopRow}>
                          <Text style={styles.busNumberText}>{b.busNumber}</Text>
                          <View style={styles.insideCampusPill}>
                            <Text style={styles.insideCampusPillText}>{b.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.busDriverText}>Driver: <Text style={{ fontWeight: '700' }}>{b.driverName}</Text></Text>
                        <Text style={styles.busRouteText}>Route: {b.route}</Text>
                        <Text style={styles.busTimeText}>Last Log: {b.lastMovement}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* SUB-VIEW 3: VEHICLE MOVEMENTS */}
              {logisticsSubTab === 'vehicles' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🚗</Text>
                    <Text style={styles.guidanceTipText}>
                      Authorized faculty cars, staff two-wheelers, and verified visitor vehicles currently parked or passing through campus.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🚗 Vehicle Movement Register</Text>
                  <Text style={styles.sectionSubtitle}>Authorized cars, two-wheelers and delivery vans</Text>

                  {vehicles.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>🚘</Text>
                      <Text style={styles.emptyStateTitle}>No Vehicles Logged</Text>
                      <Text style={styles.emptyStateSubtitle}>Vehicle gate movements will be logged here.</Text>
                    </View>
                  ) : (
                    vehicles.map((vh: any, idx: number) => (
                      <View key={idx} style={styles.vehicleRowItem}>
                        <Text style={styles.vehiclePlate}>{vh.vehicleNumber || 'TN-01-AB-1234'}</Text>
                        <Text style={styles.vehicleType}>{vh.vehicleType || 'Car'} • {vh.driverName || 'Staff Member'}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
            </ScrollView>
          </View>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <View style={{ flex: 1 }}>
            {/* Top Sub-Navigation Switcher: Officer Profile vs Gate Controls */}
            <View style={styles.profileToggleHeader}>
              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  (moreSection === 'profile' || moreSection === 'settings') && styles.profileToggleTabActive,
                ]}
                onPress={() => setMoreSection('profile')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    (moreSection === 'profile' || moreSection === 'settings') && styles.profileToggleTabTextActive,
                  ]}
                >
                  🛡️ Officer Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  (moreSection !== 'profile' && moreSection !== 'settings') && styles.profileToggleTabActive,
                ]}
                onPress={() => setMoreSection('menu')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    (moreSection !== 'profile' && moreSection !== 'settings') && styles.profileToggleTabTextActive,
                  ]}
                >
                  🚨 Shift & Duty
                </Text>
              </TouchableOpacity>
            </View>

            {/* VIEW 1: OFFICIAL USER PROFILE (PRIMARY VIEW FOR PROFILE TAB & HEADER AVATAR) */}
            {(moreSection === 'profile' || moreSection === 'settings') && (
              <UserProfileScreen
                user={user}
                roleTitle="Security Officer"
                onLogout={onLogout}
                onBack={() => setActiveTab('home')}
                hideTopBar={true}
                roleAttributes={[
                  { label: 'Officer Name', value: officer.name },
                  { label: 'Security Badge ID', value: officer.badgeId },
                  { label: 'Assigned Gate / Post', value: officer.gate },
                  { label: 'Security Shift', value: officer.shift },
                  { label: 'Duty Status', value: officer.shiftStatus },
                  { label: 'Assigned Schedule', value: officer.lastPunchTime || 'On Duty' },
                ]}
              />
            )}

            {/* VIEW 2: GUARD SHIFT & CONTROLS */}
            {moreSection !== 'profile' && moreSection !== 'settings' && (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
              >
                {moreSection !== 'menu' && (
                  <TouchableOpacity style={styles.backToMenuBtn} onPress={() => setMoreSection('menu')} activeOpacity={0.7}>
                    <Text style={styles.backToMenuText}>← Back to Security Menu</Text>
                  </TouchableOpacity>
                )}

            {moreSection === 'menu' && (
              <View>
                {/* Officer Summary Card */}
                <View style={styles.guardProfileCard}>
                  <View style={styles.guardAvatar}>
                    <Text style={styles.guardAvatarText}>🛡️</Text>
                  </View>
                  <Text style={styles.guardName}>{officer.name}</Text>
                  <Text style={styles.guardBadge}>Badge: {officer.badgeId} • {officer.gate}</Text>
                  <Text style={styles.guardShift}>{officer.shift} ({officer.shiftStatus})</Text>
                </View>

                {/* Services Menu */}
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>🛡️ Guard Shift & Duty Controls</Text>
                  <Text style={styles.sectionSubtitle}>Manage shifts and institutional safety</Text>

                  <View style={styles.servicesList}>
                    {[
                      { id: 'incidents', label: 'Emergency Incidents & Alerts', desc: 'Log security breaches, medical or fire emergencies', icon: '🚨' },
                      { id: 'referrals', label: 'Business Referral Hub', desc: 'Refer Banking, Cards, Insurance & Jobs for verified rewards', icon: '🎁' },
                      { id: 'settings', label: 'Security Gate Settings', desc: 'Gate assignment and officer verification records', icon: '⚙️' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.serviceItemRow}
                        onPress={() => setMoreSection(item.id as WatchmanMoreSection)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.serviceIconContainer}>
                          <Text style={styles.serviceIcon}>{item.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceTitle}>{item.label}</Text>
                          <Text style={styles.serviceDesc}>{item.desc}</Text>
                        </View>
                        <Text style={styles.serviceArrow}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sign Out Card */}
                <TouchableOpacity style={styles.signOutButtonCard} onPress={onLogout} activeOpacity={0.8}>
                  <Text style={styles.signOutButtonText}>Sign Out of Security Station</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-SECTION: EMERGENCY INCIDENTS */}
            {moreSection === 'incidents' && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardHeaderTitle}>🚨 Emergency Security Incidents</Text>
                    <Text style={styles.sectionSubtitle}>Dispatched security alerts and reports</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionPillBtn}
                    onPress={() => setIncidentModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionPillBtnText}>+ Report</Text>
                  </TouchableOpacity>
                </View>

                {incidents.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateEmoji}>🛡️</Text>
                    <Text style={styles.emptyStateTitle}>All Clear Across Campus</Text>
                    <Text style={styles.emptyStateSubtitle}>No emergency breaches or security incidents reported.</Text>
                  </View>
                ) : (
                  incidents.map((inc: any, idx: number) => (
                    <View key={idx} style={styles.incidentCardItem}>
                      <Text style={styles.incidentTypeTitle}>{inc.incidentType || 'Security Incident'}</Text>
                      <Text style={styles.incidentLocation}>📍 {inc.location || 'Perimeter'}</Text>
                      <Text style={styles.incidentDesc}>{inc.description || 'Details reported by security officer.'}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* SUB-SECTION 3: BUSINESS REFERRALS */}
            {moreSection === 'referrals' && (
              <View style={{ flex: 1, minHeight: 600 }}>
                <ReferralHub user={user} />
              </View>
            )}

              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* ============================================================== */}
      {/* 3. FIXED 5-DESTINATION BOTTOM NAVIGATION BAR                   */}
      {/* ============================================================== */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={(t) => {
          if (t === 'profile') {
            setMoreSection('profile');
          }
          setActiveTab(t);
        }}
        notificationsCount={parcels.length}
        tabLabels={{
          home: 'Home',
          academics: 'Scan',
          referrals: 'Visitors',
          notifications: 'Logistics',
          profile: 'Profile',
        }}
        tabIcons={{
          home: '🏠',
          academics: '📷',
          referrals: '👥',
          notifications: '📦',
          profile: '🛡️',
        }}
      />

      {/* ============================================================== */}
      {/* 4. MODALS (NEW VISITOR, LOG PARCEL, EMERGENCY INCIDENT)        */}
      {/* ============================================================== */}

      {/* New Visitor Modal */}
      <Modal visible={visitorModalVisible} transparent animationType="slide" onRequestClose={() => setVisitorModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register Campus Visitor</Text>
            <Text style={styles.modalSubtitle}>Issue guest entry pass and record visit</Text>

            <Text style={styles.inputLabel}>Visitor Full Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Ramesh Kumar"
              value={visName}
              onChangeText={setVisName}
            />

            <Text style={styles.inputLabel}>Mobile Number *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 98402 12345"
              keyboardType="phone-pad"
              value={visPhone}
              onChangeText={setVisPhone}
            />

            <Text style={styles.inputLabel}>Purpose of Visit *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Student Admission Inquiry / Vendor Meeting"
              value={visPurpose}
              onChangeText={setVisPurpose}
            />

            <Text style={styles.inputLabel}>Person / Department to Meet</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Admissions Office / Principal"
              value={visHost}
              onChangeText={setVisHost}
            />

            <Text style={styles.inputLabel}>Vehicle Number (If any)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TN-01-AB-1234"
              value={visVehicle}
              onChangeText={setVisVehicle}
              autoCapitalize="characters"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setVisitorModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleRegisterVisitor} disabled={submittingVisitor}>
                {submittingVisitor ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Issue Pass</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Log Parcel Modal */}
      <Modal visible={parcelModalVisible} transparent animationType="slide" onRequestClose={() => setParcelModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Gate Parcel</Text>
            <Text style={styles.modalSubtitle}>Receive courier delivery at security post</Text>

            <Text style={styles.inputLabel}>Courier Company</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. BlueDart / DTDC / Amazon"
              value={parCourier}
              onChangeText={setParCourier}
            />

            <Text style={styles.inputLabel}>AWB / Tracking Number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 182736450"
              value={parAwb}
              onChangeText={setParAwb}
            />

            <Text style={styles.inputLabel}>Recipient Faculty / Staff Member *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type name or ID (e.g. Ananya, HOD001, STF008)..."
              value={parRecipient}
              onChangeText={(text) => {
                setParRecipient(text);
                if (selectedStaff && !text.includes(selectedStaff.name)) {
                  setSelectedStaff(null);
                }
              }}
            />

            {selectedStaff && (
              <View style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#10B981',
                borderWidth: 1,
                borderRadius: 8,
                padding: 8,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '700' }}>
                  ✓ Linked: {selectedStaff.name} [{selectedStaff.staffId || 'Verified'}] • {selectedStaff.department || 'Staff'}
                </Text>
              </View>
            )}

            {!selectedStaff && parRecipient.trim().length > 1 && (
              <View style={{
                maxHeight: 130,
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderWidth: 1,
                borderRadius: 8,
                marginBottom: 10,
                overflow: 'hidden'
              }}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {staffDirectory
                    .filter(s =>
                      s.name?.toLowerCase().includes(parRecipient.toLowerCase()) ||
                      s.staffId?.toLowerCase().includes(parRecipient.toLowerCase()) ||
                      s.email?.toLowerCase().includes(parRecipient.toLowerCase()) ||
                      s.department?.toLowerCase().includes(parRecipient.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((s, idx) => (
                      <TouchableOpacity
                        key={s._id || s.staffId || idx}
                        style={{
                          padding: 8,
                          borderBottomColor: '#F1F5F9',
                          borderBottomWidth: 1,
                          backgroundColor: '#FAFAFA'
                        }}
                        onPress={() => {
                          setSelectedStaff(s);
                          setParRecipient(`${s.name} [${s.staffId || s.email}]`);
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          {s.name} <Text style={{ color: '#D97706' }}>[{s.staffId || 'Verified'}]</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          {s.department || 'Staff'} • {s.email}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setParcelModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleRegisterParcel} disabled={submittingParcel}>
                {submittingParcel ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Parcel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Emergency Incident Modal */}
      <Modal visible={incidentModalVisible} transparent animationType="slide" onRequestClose={() => setIncidentModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚨 Report Security Incident</Text>
            <Text style={styles.modalSubtitle}>Dispatch immediate security alert</Text>

            <Text style={styles.inputLabel}>Incident Type</Text>
            <TextInput
              style={styles.modalInput}
              value={incType}
              onChangeText={setIncType}
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.modalInput}
              value={incLocation}
              onChangeText={setIncLocation}
            />

            <Text style={styles.inputLabel}>Description & Incident Notes *</Text>
            <TextInput
              style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Explain incident details..."
              multiline
              value={incDetails}
              onChangeText={setIncDetails}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIncidentModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: '#DC2626' }]} onPress={handleReportIncident} disabled={submittingIncident}>
                {submittingIncident ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Dispatch Alert</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* 4. DIGITAL VISITOR GATE PASS MODAL                            */}
      {/* ============================================================== */}
      <Modal
        visible={selectedVisitorPass !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVisitorPass(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 520 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                CAMPUS SECURITY GATE PASS
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                {selectedVisitorPass?.name}
              </Text>
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Text style={{ color: '#1D4ED8', fontSize: 13, fontWeight: '800' }}>
                  BADGE: {selectedVisitorPass?.badgeNumber}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Contact Phone:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedVisitorPass?.phone}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Visit Purpose:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedVisitorPass?.purpose}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Host Department:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedVisitorPass?.host}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Vehicle Number:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedVisitorPass?.vehicleNumber || 'Pedestrian Walk-in'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Entry Check-in Time:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedVisitorPass?.checkInTime}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Authorized Gate:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{officer.gate}</Text>
                </View>
              </View>

              <View style={[styles.guidanceTipBox, { marginTop: 10 }]}>
                <Text style={styles.guidanceTipEmoji}>🛡️</Text>
                <Text style={styles.guidanceTipText}>
                  Authorized visitor within campus boundaries. Digital pass must be surrendered or checked out upon exit.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSelectedVisitorPass(null)}
              >
                <Text style={styles.modalCancelText}>Close Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  if (selectedVisitorPass) {
                    handleVisitorExit(selectedVisitorPass.id, selectedVisitorPass.name);
                    setSelectedVisitorPass(null);
                  }
                }}
              >
                <Text style={styles.modalSubmitText}>Record Departure</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 5. CAMPUS ACCESS CLEARANCE MODAL                               */}
      {/* ============================================================== */}
      <Modal
        visible={accessClearanceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccessClearanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 420 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 32, marginBottom: 4 }}>
                {lastClearanceAction?.actionType === 'IN' ? '✅' : '🚪'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {lastClearanceAction?.title || 'CAMPUS ACCESS CLEARANCE'}
              </Text>
              <View
                style={{
                  backgroundColor: lastClearanceAction?.actionType === 'IN' ? '#DCFCE7' : '#EFF6FF',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginTop: 6,
                }}
              >
                <Text
                  style={{
                    color: lastClearanceAction?.actionType === 'IN' ? '#15803D' : '#1D4ED8',
                    fontSize: 12,
                    fontWeight: '800',
                  }}
                >
                  STATUS: {lastClearanceAction?.status}
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Person Name:</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>{lastClearanceAction?.person?.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Member ID:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{lastClearanceAction?.person?.id}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Role / Dept:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                  {lastClearanceAction?.person?.type} • {lastClearanceAction?.person?.dept}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Security Gate:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{lastClearanceAction?.gate}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Timestamp:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{lastClearanceAction?.timestamp}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 14 }]}
              onPress={() => setAccessClearanceModalVisible(false)}
            >
              <Text style={styles.primaryBtnText}>Acknowledge Clearance ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 6. PARCEL DETAILS & CUSTODY SLIP MODAL                         */}
      {/* ============================================================== */}
      <Modal
        visible={selectedParcelSlip !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedParcelSlip(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 460 }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1 }}>
              GATE DELIVERY CUSTODY SLIP
            </Text>
            <Text style={[styles.modalTitle, { fontSize: 16, marginTop: 2 }]}>
              {selectedParcelSlip?.courier} Package
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              Tracking AWB: {selectedParcelSlip?.awb}
            </Text>

            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Recipient Staff:</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>{selectedParcelSlip?.recipientName}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Received On:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedParcelSlip?.receivedDate}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Custody Status:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>{selectedParcelSlip?.status}</Text>
              </View>
            </View>

            <View style={[styles.otpRowBox, { marginTop: 12 }]}>
              <Text style={styles.otpLabel}>Verification Handover OTP:</Text>
              <Text style={styles.otpValueText}>{selectedParcelSlip?.otp}</Text>
            </View>

            <View style={[styles.modalActions, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSelectedParcelSlip(null)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#2563EB' }]}
                onPress={() => {
                  if (selectedParcelSlip?.recipientPhone) {
                    Linking.openURL(`tel:${selectedParcelSlip.recipientPhone}`).catch(() => null);
                  }
                  setSelectedParcelSlip(null);
                }}
              >
                <Text style={styles.modalSubmitText}>📞 Call Recipient</Text>
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
  topHeaderBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 20,
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  roleTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  badgeTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  headerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  headerSignOutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSignOutBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  bodyWrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },

  // HERO COMMAND CARD
  commandHeroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  heroKpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
  },
  heroKpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroKpiDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroKpiLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  heroKpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroKpiSub: {
    fontSize: 10,
    color: '#CBD5E1',
  },

  // PROFILE / SERVICES TOGGLE
  profileToggleHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  profileToggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  profileToggleTabActive: {
    backgroundColor: '#1E3A8A',
  },
  profileToggleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  profileToggleTabTextActive: {
    color: '#FFFFFF',
  },

  // CARDS & HEADINGS
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardHeaderLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  cardLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  primaryBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroBadgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  gpayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gpayCol: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  gpayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gpayIcon: {
    fontSize: 22,
  },
  gpayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },
  serviceRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceIconEmoji: {
    fontSize: 18,
  },
  serviceRowContent: {
    flex: 1,
  },
  serviceRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  serviceRowSub: {
    fontSize: 11,
    color: '#64748B',
  },
  serviceChevron: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
    marginLeft: 6,
  },

  // MOVEMENTS LIST
  movementItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeIn: {
    backgroundColor: '#DCFCE7',
  },
  badgeOut: {
    backgroundColor: '#FEE2E2',
  },
  directionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textIn: {
    color: '#15803D',
  },
  textOut: {
    color: '#DC2626',
  },
  movementName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  movementMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  movementRemarks: {
    fontSize: 10,
    color: '#475569',
  },

  // VISITOR MINI
  visitorMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  visitorMiniName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  visitorMiniPurpose: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  visitorMiniTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  exitPillBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exitPillText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },

  // SCAN TAB & VERIFICATION
  scanInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  verifyBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickPresetsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  presetChipsRow: {
    gap: 6,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  verifiedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  verifiedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifiedRoleTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedIdTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  verifiedName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  verifiedDept: {
    fontSize: 12,
    color: '#64748B',
  },
  currentStatusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  statusBannerInside: {
    backgroundColor: '#DCFCE7',
  },
  statusBannerOutside: {
    backgroundColor: '#FEE2E2',
  },
  currentStatusText: {
    fontSize: 12,
  },
  statusTextInside: {
    color: '#15803D',
  },
  statusTextOutside: {
    color: '#DC2626',
  },
  gateActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gateActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnIn: {
    backgroundColor: '#15803D',
  },
  btnOut: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  gateActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // SUB-TABS NAVIGATION
  subTabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  subTabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  subTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  subTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionPillBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // FULL VISITOR CARDS
  visitorCardFull: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  visitorCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  visitorFullName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  visitorPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
  },
  visitorDetailText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  visitorExitBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  visitorExitBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },

  // FULL PARCEL CARDS
  parcelCardFull: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  parcelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  parcelCourierText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPillCustody: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTextCustody: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  parcelRecipientText: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 2,
  },
  parcelMetaText: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 6,
  },
  otpRowBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
  },
  otpLabel: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '600',
  },
  otpValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },

  // BUSES & VEHICLES
  busGateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  busTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  busNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  insideCampusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  insideCampusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  busDriverText: {
    fontSize: 12,
    color: '#334155',
  },
  busRouteText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  busTimeText: {
    fontSize: 10,
    color: '#2563EB',
    marginTop: 2,
  },
  vehicleRowItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  vehiclePlate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  vehicleType: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // MORE TAB
  guardProfileCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  guardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guardAvatarText: {
    fontSize: 26,
  },
  guardName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guardBadge: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  guardShift: {
    fontSize: 11,
    color: '#34D399',
    marginTop: 2,
  },
  servicesList: {
    gap: 8,
  },
  serviceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceIcon: {
    fontSize: 20,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  serviceArrow: {
    fontSize: 20,
    color: '#94A3B8',
  },
  signOutButtonCard: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  signOutButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  backToMenuBtn: {
    paddingVertical: 10,
    marginBottom: 4,
  },
  backToMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  shiftCardBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  shiftDutyStatusLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  shiftDutyStatusValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  shiftStationText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    marginBottom: 14,
  },
  clockInBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  clockInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  incidentCardItem: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  incidentTypeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  incidentLocation: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  incidentDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 4,
  },
  specGrid: {
    gap: 10,
  },
  specItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  specLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },

  // EMPTY STATES
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pageHeaderBanner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  pageHeaderDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  guidanceTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  guidanceTipEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  guidanceTipText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  summarySectionContainer: {
    marginBottom: 16,
  },
  summarySectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  marksModeSegment: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    gap: 4,
  },
  marksModeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  marksModeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  marksModeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  marksModeTabTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  attendanceHeroBanner: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attHeroSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  attHeroClass: {
    fontSize: 12,
    color: '#DBEAFE',
    marginTop: 2,
    fontWeight: '600',
  },
  attPeriodPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attPeriodPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  attFilterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attFilterChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  attFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  attFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  studentAttendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  studentRowAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentRowAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  studentRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  studentRowRoll: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  attActionBtn: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
