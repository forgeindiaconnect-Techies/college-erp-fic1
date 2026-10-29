import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
import { apiGet, apiPost, apiPut, storage, type MobileUser } from '../../services/api';
import BottomTabBar, { type MainNavTab } from '../navigation/BottomTabBar';
import ScreenHeader from '../navigation/ScreenHeader';
import UserProfileScreen from '../profile/UserProfileScreen';
import ReferralHub from '../referrals/ReferralHub';
import DashboardHeroBanner from './DashboardHeroBanner';
import QuickAccessGrid from './QuickAccessGrid';
import HighlightCard from './HighlightCard';
import DailyDutyAttendanceCard from '../common/DailyDutyAttendanceCard';
import MobileNotificationCenter from '../notifications/MobileNotificationCenter';
import DriverLeaveScreen from '../driver/DriverLeaveScreen';

type Props = {
  user: MobileUser;
  onLogout: () => void;
};

type TransportSubTab = 'operations' | 'route' | 'students' | 'vehicle';
type MoreSection = 'menu' | 'checklist' | 'tasks' | 'payroll' | 'leaves' | 'safety' | 'notices' | 'profile';

type ComplaintTask = {
  _id: string;
  complaintId?: string;
  studentId?: string;
  name?: string;
  complaintType?: string;
  category?: string;
  description: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | string;
  vehicleNumber?: string;
  busNumber?: string;
  routeId?: string;
  assignedTo?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  acknowledgedByDriver?: boolean;
  createdAt?: string;
  reporterName?: string;
  reporterType?: string;
  replies?: Array<{ sender: string; role: string; message: string; timestamp: string }>;
};

type Stop = {
  id: string;
  name: string;
  time: string;
  studentsCount: number;
  completed: boolean;
};

type StudentPassenger = {
  id: string;
  name: string;
  rollNo: string;
  stop: string;
  parentPhone: string;
  boarded: boolean;
  busNumber?: string;
  routeId?: string;
};

type VehicleData = {
  _id?: string;
  vehicleNumber: string;
  registrationNumber?: string;
  type?: string;
  capacity: number;
  driver?: string;
  status?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  fuelType?: string;
  odometer?: string;
};

type MaintenanceItem = {
  _id?: string;
  vehicleNumber?: string;
  vehicleId?: string;
  type?: string;
  description?: string;
  cost?: number;
  date?: string;
  status?: string;
  remarks?: string;
  reportedBy?: string;
};

type SalaryRecord = {
  _id?: string;
  month?: string;
  year?: number;
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  netSalary?: number;
  status?: string;
  paymentDate?: string;
};

type DriverAttendanceRecord = {
  _id?: string;
  date: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
};

type TransportTrip = {
  _id?: string;
  tripId?: string;
  routeId?: string;
  vehicle?: string;
  driver?: string;
  driverId?: string;
  tripType?: 'Morning' | 'Evening';
  startTime?: string;
  endTime?: string;
  status?: 'In Progress' | 'Completed' | 'Scheduled' | string;
  startOdometer?: number;
  endOdometer?: number;
};

export default function DriverDashboard({ user, onLogout }: Props) {
  // Navigation Tabs
  const [activeNavTab, setActiveNavTab] = useState<MainNavTab>('home');
  const [transportSubTab, setTransportSubTab] = useState<TransportSubTab>('operations');
  const [moreSection, setMoreSection] = useState<MoreSection>('profile');

  // Loading & Refreshing
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Driver state
  const [driverProfile, setDriverProfile] = useState({
    name: user.name || 'Institutional Driver',
    driverId: user.referenceId || user.userId || 'DRV-001',
    phone: (user as any).phone || '+91 98402 00000',
    busNo: 'Campus Transit Bus',
    busNumber: 'Campus Transit Bus',
    route: 'Campus Route',
    routeId: 'R-01',
    capacity: 48,
    licenseNo: 'DL-TN-2022-008492',
  });

  const [routes, setRoutes] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [passengers, setPassengers] = useState<StudentPassenger[]>([]);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [myVehicle, setMyVehicle] = useState<VehicleData | null>(null);
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<DriverAttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const handleUnreadNotifsCountChange = useCallback((cnt: number) => {
    setUnreadNotifsCount(prev => (prev === cnt ? prev : cnt));
  }, []);
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState<TransportTrip | null>(null);
  const [tripTypeSelection, setTripTypeSelection] = useState<'Morning' | 'Evening'>('Morning');
  const [showTripStartModal, setShowTripStartModal] = useState(false);
  const [showTripEndModal, setShowTripEndModal] = useState(false);
  const [tripRemarks, setTripRemarks] = useState('');
  const [tripSubmitting, setTripSubmitting] = useState(false);

  // Student filter and search
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStopFilter, setSelectedStopFilter] = useState<string>('All');

  // Daily Inspection Checklist
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    brakes: false,
    tires: false,
    fluids: false,
    extinguisher: false,
    firstAid: false,
    emergencyExit: false,
    mirrors: false,
  });

  // Maintenance & Complaint Tasks (/driver/tasks)
  const [complaintTasks, setComplaintTasks] = useState<ComplaintTask[]>([]);
  const [tasksNotifSubTab, setTasksNotifSubTab] = useState<'tasks' | 'notices'>('tasks');
  const [taskFilter, setTaskFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Resolved'>('All');
  const [taskUpdatingId, setTaskUpdatingId] = useState<string | null>(null);

  // Notifications filter & search (/driver/notifications)
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeFilter, setNoticeFilter] = useState<string>('All');

  // Defect / Maintenance reporting modal (/driver/vehicle & /driver/tasks)
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState('Vehicle Defect');
  const [issuePriority, setIssuePriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Maintenance modal
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintType, setMaintType] = useState('Routine Service');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintSubmitting, setMaintSubmitting] = useState(false);

  // Real-time ERP Detail Modals
  const [selectedPassengerProfile, setSelectedPassengerProfile] = useState<StudentPassenger | null>(null);
  const [inspectionReportModalVisible, setInspectionReportModalVisible] = useState(false);
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<SalaryRecord | null>(null);

  // Student Attendance State (Backend synced & lock protected)
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; isLocked: boolean; boarded: boolean }>>({});
  const [attendanceReport, setAttendanceReport] = useState<any>(null);
  const [attendanceLoadingId, setAttendanceLoadingId] = useState<string | null>(null);
  const [attendanceToast, setAttendanceToast] = useState<string | null>(null);

  // Bulk Attendance & Customization Draft State
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSavingBulk, setIsSavingBulk] = useState<boolean>(false);

  // Attendance Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTargetStudent, setCorrectionTargetStudent] = useState<StudentPassenger | null>(null);
  const [correctionTargetStatus, setCorrectionTargetStatus] = useState<'Present' | 'Absent'>('Present');
  const [correctionReasonText, setCorrectionReasonText] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // Dedicated Student Attendance Report Modal State
  const [showAttendanceReportModal, setShowAttendanceReportModal] = useState(false);

  // Complaint Discussion & Messaging State
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [selectedComplaintForChat, setSelectedComplaintForChat] = useState<ComplaintTask | null>(null);
  const [chatReplies, setChatReplies] = useState<Array<{ sender: string; role: string; message: string; timestamp: string }>>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatSuccessToast, setChatSuccessToast] = useState<string | null>(null);
  const [isRefreshingChat, setIsRefreshingChat] = useState(false);

  // Fetch all transport data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        routesRes,
        studentsRes,
        vehiclesRes,
        notifsRes,
        maintRes,
        attRes,
        tripsRes,
        salRes,
        complaintsRes,
      ] = await Promise.all([
        apiGet<any[]>('transport/routes').catch(() => []),
        apiGet<any[]>('transport/students').catch(async () => {
          return apiGet<any[]>('students').catch(() => []);
        }),
        apiGet<any[]>('transport/vehicles').catch(() => []),
        apiGet<any>('transport/notifications').catch(async () => {
          return apiGet<any>('notifications').catch(() => []);
        }),
        apiGet<any[]>('transport/maintenance').catch(() => []),
        apiGet<any[]>(`transport/attendance?driverId=${user.userId || user.referenceId || ''}`).catch(() => []),
        apiGet<any[]>('transport/trips').catch(() => []),
        apiGet<any[]>(`salary/staff/${user.userId || user.referenceId || user._id || ''}`).catch(async () => {
          return apiGet<any[]>(`salaries/staff/${user.userId || user.referenceId || user._id || ''}`).catch(() => []);
        }),
        apiGet<any[]>('transport/complaints').catch(() => []),
      ]);

      const DEFAULT_ROUTES = [
        {
          _id: 'route_east_01',
          routeId: 'R-01',
          name: 'East',
          vehicle: 'TN 01 AB 1234',
          driver: 'Viji',
          capacity: 50,
          occupied: 0,
          points: ['Stop A', 'Stop B', 'Stop C', 'Stop D', 'College Campus'],
        },
      ];

      const rawRoutes = Array.isArray(routesRes) && routesRes.length > 0 ? routesRes : DEFAULT_ROUTES;
      const allRoutes = Array.from(new Map([...rawRoutes, ...DEFAULT_ROUTES].map((r: any) => [r.routeId || r._id || r.name, r])).values());
      setRoutes(allRoutes);

      // Match Driver's assigned route
      const cleanStr = (str: any) => (str || '').toString().trim().toLowerCase();
      const meName = cleanStr(user.name);
      const meId = cleanStr(user.referenceId || user.userId || (user as any).driverId);

      const matchedRoute =
        allRoutes.find(
          (r: any) =>
            (meName && (cleanStr(r.driver).includes(meName) || meName.includes(cleanStr(r.driver)))) ||
            (meId && (cleanStr(r.driverId) === meId || cleanStr(r.driver).includes(meId)))
        ) || allRoutes[0];

      setActiveRoute(matchedRoute || null);

      if (matchedRoute) {
        const rawPoints = Array.isArray(matchedRoute.points) ? matchedRoute.points : [];
        const parsedStops: Stop[] = rawPoints.map((pt: any, idx: number) => {
          const stopName = typeof pt === 'string' ? pt : pt.name || `Stop ${idx + 1}`;
          const stopTime =
            typeof pt === 'string'
              ? `${7 + Math.floor((idx * 15) / 60)}:${String((idx * 15) % 60).padStart(2, '0')} AM`
              : pt.time || '07:30 AM';
          return {
            id: String(idx + 1),
            name: `${idx + 1}. ${stopName}`,
            time: stopTime,
            studentsCount: 0,
            completed: false,
          };
        });

        // Load persisted boarding states
        let savedBoardingMap: Record<string, boolean> = {};
        try {
          const savedStr = await storage.getItem('driver_student_status');
          if (savedStr) {
            savedBoardingMap = JSON.parse(savedStr);
          }
        } catch (_) {}

        // Parse student passengers
        const rawStudents = Array.isArray(studentsRes) ? studentsRes : [];
        let routeStudents = rawStudents.filter((s: any) => {
          const sRoute = s.routeId || s.busRoute || '';
          const sBus = s.vehicleNumber || s.busNumber || '';
          return (
            sRoute === matchedRoute.routeId ||
            sRoute === matchedRoute.name ||
            sBus === matchedRoute.vehicle ||
            (s.pickupPoint && rawPoints.some((p: any) => (typeof p === 'string' ? p : p.name) === s.pickupPoint))
          );
        });

        if (routeStudents.length === 0 && rawStudents.length > 0) {
          routeStudents = rawStudents.slice(0, 15);
        }

        const parsedPassengers: StudentPassenger[] = routeStudents.map((s: any, idx: number) => {
          const pid = s._id || s.id || String(idx);
          return {
            id: pid,
            name: s.name || s.studentName || 'Student Passenger',
            rollNo: s.studentId || s.rollNo || s.admissionNo || `STU-${idx + 1}`,
            stop: s.pickupPoint || (parsedStops[0]?.name.replace(/^\d+\.\s*/, '')) || 'Campus Gate',
            parentPhone: s.parentPhone || s.emergencyContact || s.driverContact || s.phone || '+91 98402 00000',
            boarded: !!savedBoardingMap[pid],
            busNumber: s.vehicleNumber || matchedRoute.vehicle,
            routeId: matchedRoute.routeId,
          };
        });

        // Compute passenger count per stop
        parsedPassengers.forEach((p) => {
          const match = parsedStops.find((st) => st.name.toLowerCase().includes(p.stop.toLowerCase()));
          if (match) {
            match.studentsCount += 1;
          }
        });

        setStops(parsedStops);
        setPassengers(parsedPassengers);

        setDriverProfile((prev) => ({
          ...prev,
          name: user.name || matchedRoute.driver || prev.name,
          driverId: user.referenceId || user.userId || prev.driverId,
          busNo: matchedRoute.vehicle || 'TN-01-BUS-2024',
          route: matchedRoute.name || 'Campus Route',
          routeId: matchedRoute.routeId || 'R-01',
          capacity: matchedRoute.capacity || 50,
        }));

        // Fetch backend student attendance records & stop breakdown
        try {
          const todayDateStr = new Date().toISOString().split('T')[0];
          const activeRId = matchedRoute.routeId || 'R-01';
          const [attRecs, attRep] = await Promise.all([
            apiGet<any[]>(`transport/student-attendance?date=${todayDateStr}&tripType=Pickup&routeId=${activeRId}`).catch(() => []),
            apiGet<any>(`transport/student-attendance/report?date=${todayDateStr}&tripType=Pickup&routeId=${activeRId}`).catch(() => null),
          ]);

          const map: Record<string, { status: string; isLocked: boolean; boarded: boolean }> = {};
          if (Array.isArray(attRecs)) {
            attRecs.forEach((r: any) => {
              map[r.studentId] = {
                status: r.status,
                isLocked: !!r.isLocked,
                boarded: !!r.boarded,
              };
            });
          }
          setAttendanceMap(map);
          if (attRep) {
            setAttendanceReport(attRep);
          }
        } catch (attErr) {
          console.warn('Failed to fetch backend student attendance:', attErr);
        }
      }

      // Vehicles
      const allVehicles = Array.isArray(vehiclesRes) ? vehiclesRes : [];
      setVehicles(allVehicles);
      const assignedVeh = allVehicles.find(
        (v) =>
          (matchedRoute && (v.vehicleNumber === matchedRoute.vehicle || v.registrationNumber === matchedRoute.vehicle)) ||
          (user.name && v.driver && v.driver.toLowerCase().includes(user.name.toLowerCase()))
      ) || allVehicles[0] || null;
      setMyVehicle(assignedVeh);

      // Maintenance
      const allMaint = Array.isArray(maintRes) ? maintRes : [];
      setMaintenanceList(allMaint);

      // Defect / Route Complaints Filter (Following web rules in DriverTasks.jsx)
      const allComplaints = Array.isArray(complaintsRes) ? complaintsRes : [];
      const myVehicleClean = (assignedVeh?.vehicleNumber || matchedRoute?.vehicle || 'campus transit bus').trim().toLowerCase();
      const myRouteClean = (matchedRoute?.routeId || matchedRoute?.name || '').trim().toLowerCase();
      const myNameClean = (user.name || '').trim().toLowerCase();
      const myIdClean = (user.referenceId || user.userId || '').trim().toLowerCase();

      const filteredComplaints = allComplaints.filter((c: any) => {
        const typeClean = (c.complaintType || c.category || '').toLowerCase();
        const descClean = (c.description || '').toLowerCase();
        
        const reporterIdClean = cleanStr(c.studentId);
        const reporterNameClean = cleanStr(c.name);

        const isReporter = (reporterIdClean && (reporterIdClean === myIdClean || reporterIdClean.includes(myIdClean) || myIdClean.includes(reporterIdClean) || reporterIdClean === 'drv-0001')) ||
                           (reporterNameClean && (reporterNameClean === myNameClean || reporterNameClean.includes(myNameClean) || reporterNameClean === 'viji')) ||
                           c.reporterType === 'Driver';

        if (!isReporter) {
          const sensitiveKeywords = ['driver behavior', 'behavior', 'overspeed', 'speed', 'harassment', 'rash', 'misbehave', 'rude'];
          const isMisconduct = sensitiveKeywords.some((keyword) => typeClean.includes(keyword) || descClean.includes(keyword));
          if (isMisconduct) return false;
        }

        const assignedClean = c.assignedTo ? String(c.assignedTo).trim().toLowerCase() : '';
        const busClean = (c.busNumber || c.vehicleNumber) ? String(c.busNumber || c.vehicleNumber).trim().toLowerCase() : '';
        const routeClean = c.routeId ? String(c.routeId).trim().toLowerCase() : '';

        return (
          isReporter ||
          (assignedClean && (assignedClean === myNameClean || assignedClean === myIdClean || assignedClean === 'driver')) ||
          (myVehicleClean && busClean === myVehicleClean) ||
          (myRouteClean && routeClean === myRouteClean)
        );
      });
      setComplaintTasks(filteredComplaints);

      // Attendance
      const allAtt = Array.isArray(attRes) ? attRes : [];
      setAttendanceLogs(allAtt);

      // Active Trip from backend (synced with web)
      const allTrips = Array.isArray(tripsRes) ? tripsRes : [];
      const currentActive = allTrips.find(
        (t: any) =>
          ['In Progress', 'Started', 'Arrived'].includes(t.status) &&
          (t.driver === user.name || t.driverId === user.userId || t.driverId === user.referenceId || t.driverId === 'DRV-0001' || t.driverId === 'DRV-001' || t.vehicle === matchedRoute?.vehicle || (t.vehicleId && t.vehicleId === matchedRoute?.vehicle))
      );
      if (currentActive) {
        setActiveTrip(currentActive);
      }

      // Payroll
      const salArray = Array.isArray(salRes)
        ? salRes
        : Array.isArray((salRes as any)?.data)
        ? (salRes as any).data
        : [];
      setSalaries(salArray);

      // Notifications (Matching web role filter)
      const rawNotifs = Array.isArray(notifsRes)
        ? notifsRes
        : Array.isArray((notifsRes as any)?.data)
        ? (notifsRes as any).data
        : [];
      const relevantNotifs = rawNotifs.filter((n: any) =>
        !n.targetRole || n.targetRole === 'All' || n.targetRole === 'Driver' || n.targetRole === 'Staff'
      );
      relevantNotifs.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(relevantNotifs);
    } catch (err) {
      console.warn('Driver data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling for live complaint discussion sync when modal is open
  useEffect(() => {
    if (!showDiscussionModal || !selectedComplaintForChat) return;
    const interval = setInterval(() => {
      const cId = selectedComplaintForChat.complaintId || selectedComplaintForChat._id;
      apiGet<any>(`transport/complaints/${cId}`)
        .then((fresh) => {
          if (fresh && Array.isArray(fresh.replies)) {
            setChatReplies(fresh.replies);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [showDiscussionModal, selectedComplaintForChat]);

  // Resolve effective status from draft first, then saved map, default to PENDING
  const getActiveStatus = (studentId: string): string => {
    if (attendanceDraft[studentId]) return attendanceDraft[studentId];
    if (attendanceMap[studentId]) return attendanceMap[studentId].status;
    return 'PENDING';
  };

  // Bulk Action: Mark All Present
  const handleMarkAllPresent = () => {
    if (passengers.length === 0) return;
    const draft: Record<string, 'Present' | 'Absent'> = {};
    passengers.forEach((s) => {
      const sId = s.rollNo || s.id;
      draft[sId] = 'Present';
    });
    setAttendanceDraft(draft);
    setHasUnsavedChanges(true);
    setAttendanceToast(`✓ Marked all ${passengers.length} students as Present (draft). Tap "Save Attendance" to persist.`);
    setTimeout(() => setAttendanceToast(null), 3500);
  };

  // Bulk Action: Mark All Absent
  const handleMarkAllAbsent = () => {
    if (passengers.length === 0) return;
    const draft: Record<string, 'Present' | 'Absent'> = {};
    passengers.forEach((s) => {
      const sId = s.rollNo || s.id;
      draft[sId] = 'Absent';
    });
    setAttendanceDraft(draft);
    setHasUnsavedChanges(true);
    setAttendanceToast(`✕ Marked all ${passengers.length} students as Absent (draft). Tap "Save Attendance" to persist.`);
    setTimeout(() => setAttendanceToast(null), 3500);
  };

  // Bulk Action: Toggle Customize Attendance Mode
  const handleToggleCustomize = () => {
    setIsCustomizing((prev) => {
      const next = !prev;
      if (next && Object.keys(attendanceDraft).length === 0) {
        // Preload draft with existing or default Present so driver can freely adjust individual students
        const initialDraft: Record<string, 'Present' | 'Absent'> = {};
        passengers.forEach((s) => {
          const sId = s.rollNo || s.id;
          initialDraft[sId] = (attendanceMap[sId]?.status as 'Present' | 'Absent') || 'Present';
        });
        setAttendanceDraft(initialDraft);
        setHasUnsavedChanges(true);
      }
      return next;
    });
  };

  // Individual Customization: updates ONLY the selected student's status without altering others
  const handleSetStudentDraft = (student: StudentPassenger, status: 'Present' | 'Absent') => {
    const sId = student.rollNo || student.id;
    setAttendanceDraft((prev) => {
      let base: Record<string, 'Present' | 'Absent'>;
      if (Object.keys(prev).length > 0) {
        base = { ...prev };
      } else {
        base = {};
        passengers.forEach((p) => {
          const pId = p.rollNo || p.id;
          base[pId] = (attendanceMap[pId]?.status as 'Present' | 'Absent') || 'Present';
        });
      }
      base[sId] = status;
      return base;
    });
    setHasUnsavedChanges(true);
  };

  // Bulk Action: Save Attendance to Database
  const handleSaveBulkAttendance = async () => {
    if (passengers.length === 0) {
      Alert.alert('No Students', 'No students registered on this route.');
      return;
    }
    setIsSavingBulk(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const studentsToSave = passengers.map((s) => {
        const sId = s.rollNo || s.id;
        const curStatus = attendanceDraft[sId] || (attendanceMap[sId]?.status as 'Present' | 'Absent') || 'Present';
        return {
          studentId: sId,
          studentName: s.name,
          rollNo: s.rollNo || sId,
          pickupPoint: s.stop,
          status: curStatus,
          boarded: curStatus === 'Present',
        };
      });

      const payload = {
        date: todayStr,
        tripType: 'Pickup',
        routeId: activeRoute?.routeId || 'R-01',
        routeName: activeRoute?.name || 'Assigned Route',
        vehicleNumber: myVehicle?.vehicleNumber || myVehicle?.registrationNumber || 'Bus-01',
        driverId: user?.referenceId || user?.userId || user?._id || 'DRV-CURRENT',
        driverName: user?.name || 'Driver',
        students: studentsToSave,
      };

      const res = await apiPost<any>('transport/student-attendance', payload);
      if (res && (res.success || res.savedCount !== undefined)) {
        const updatedMap: Record<string, { status: string; isLocked: boolean; boarded: boolean }> = { ...attendanceMap };
        studentsToSave.forEach((s) => {
          updatedMap[s.studentId] = {
            status: s.status,
            isLocked: true,
            boarded: s.boarded,
          };
        });
        setAttendanceMap(updatedMap);
        setAttendanceDraft({});
        setHasUnsavedChanges(false);
        setIsCustomizing(false);
        Alert.alert(
          'Attendance Saved',
          `Attendance successfully saved for ${res.savedCount || studentsToSave.length} students.\nPresent: ${res.presentCount ?? studentsToSave.filter((s) => s.status === 'Present').length} | Absent: ${res.absentCount ?? studentsToSave.filter((s) => s.status === 'Absent').length}`
        );

        // Refresh aggregate report
        const rep = await apiGet<any>(`transport/student-attendance/report?date=${todayStr}&tripType=Pickup&routeId=${activeRoute?.routeId || 'R-01'}`).catch(() => null);
        if (rep) setAttendanceReport(rep);
      } else {
        Alert.alert('Save Failed', res?.message || 'Server did not acknowledge attendance saving.');
      }
    } catch (err: any) {
      console.error('Failed to save bulk attendance:', err);
      Alert.alert('Save Error', err?.message || 'Failed to save attendance. Your selections remain intact in draft.');
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Mark Student Attendance: Present or Absent with backend persistence & duplicate locking
  const handleMarkAttendance = async (student: StudentPassenger, status: 'Present' | 'Absent') => {
    const studentId = student.rollNo || student.id;
    if (attendanceMap[studentId]?.isLocked && !attendanceDraft[studentId]) {
      Alert.alert('Record Locked', 'Attendance for this student has already been saved and locked. Use "Correct" to submit an authorized change with reason.');
      return;
    }

    setAttendanceLoadingId(studentId);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        studentId,
        studentName: student.name,
        pickupPoint: student.stop,
        routeId: activeRoute?.routeId || 'R-01',
        tripType: 'Pickup',
        date: todayStr,
        status,
        boarded: status === 'Present',
      };

      const res = await apiPost<any>('transport/student-attendance', payload);
      if (res) {
        setAttendanceMap((prev) => ({
          ...prev,
          [studentId]: {
            status,
            isLocked: true,
            boarded: status === 'Present',
          },
        }));

        setAttendanceToast(`✓ Marked ${student.name} as ${status}. Record saved & locked.`);
        setTimeout(() => setAttendanceToast(null), 3500);

        // Refresh aggregate stop breakdown
        const rep = await apiGet<any>(`transport/student-attendance/report?date=${todayStr}&tripType=Pickup&routeId=${activeRoute?.routeId || 'R-01'}`).catch(() => null);
        if (rep) setAttendanceReport(rep);
      }
    } catch (err: any) {
      console.error('Failed to mark attendance:', err);
      Alert.alert('Attendance Error', err?.message || 'Failed to save attendance record.');
    } finally {
      setAttendanceLoadingId(null);
    }
  };

  // Open correction modal
  const handleOpenCorrection = (student: StudentPassenger) => {
    setCorrectionTargetStudent(student);
    const curStatus = attendanceMap[student.rollNo || student.id]?.status;
    setCorrectionTargetStatus(curStatus === 'Present' ? 'Absent' : 'Present');
    setCorrectionReasonText('');
    setShowCorrectionModal(true);
  };

  // Confirm correction with audit reason
  const handleConfirmCorrection = async () => {
    if (!correctionTargetStudent) return;
    if (!correctionReasonText.trim() || correctionReasonText.trim().length < 3) {
      Alert.alert('Reason Required', 'Please enter a justification reason (at least 3 characters) for the audit trail.');
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const studentId = correctionTargetStudent.rollNo || correctionTargetStudent.id;
      const payload = {
        studentId,
        date: todayStr,
        tripType: 'Pickup',
        routeId: activeRoute?.routeId || 'R-01',
        status: correctionTargetStatus,
        boarded: correctionTargetStatus === 'Present',
        reason: correctionReasonText.trim(),
      };

      const res = await apiPost<any>('transport/student-attendance/correct', payload);
      if (res) {
        setAttendanceMap((prev) => ({
          ...prev,
          [studentId]: {
            status: correctionTargetStatus,
            isLocked: true,
            boarded: correctionTargetStatus === 'Present',
          },
        }));

        setShowCorrectionModal(false);
        setAttendanceToast(`✓ Attendance corrected for ${correctionTargetStudent.name}. Audit history updated.`);
        setTimeout(() => setAttendanceToast(null), 3500);

        const rep = await apiGet<any>(`transport/student-attendance/report?date=${todayStr}&tripType=Pickup&routeId=${activeRoute?.routeId || 'R-01'}`).catch(() => null);
        if (rep) setAttendanceReport(rep);
      }
    } catch (err: any) {
      console.error('Correction failed:', err);
      Alert.alert('Correction Failed', err?.message || 'Server rejected correction.');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Open complaint discussion modal
  const handleOpenDiscussion = async (task: ComplaintTask) => {
    setSelectedComplaintForChat(task);
    setChatReplies(task.replies || []);
    setChatInputText('');
    setChatSuccessToast(null);
    setShowDiscussionModal(true);

    try {
      const cId = task.complaintId || task._id;
      const fresh = await apiGet<any>(`transport/complaints/${cId}`).catch(() => null);
      if (fresh) {
        setSelectedComplaintForChat(fresh);
        if (Array.isArray(fresh.replies)) {
          setChatReplies(fresh.replies);
        }
      }
    } catch (_) {}
  };

  // Refresh discussion messages
  const handleRefreshChat = async () => {
    if (!selectedComplaintForChat) return;
    setIsRefreshingChat(true);
    try {
      const cId = selectedComplaintForChat.complaintId || selectedComplaintForChat._id;
      const fresh = await apiGet<any>(`transport/complaints/${cId}`).catch(() => null);
      if (fresh && Array.isArray(fresh.replies)) {
        setChatReplies(fresh.replies);
        setSelectedComplaintForChat(fresh);
      }
    } catch (_) {} finally {
      setIsRefreshingChat(false);
    }
  };

  // Send message in discussion
  const handleSendChatMessage = async () => {
    if (!chatInputText.trim() || !selectedComplaintForChat) return;
    setIsSendingChat(true);
    try {
      const cId = selectedComplaintForChat.complaintId || selectedComplaintForChat._id;
      const payload = {
        message: chatInputText.trim(),
        sender: user.name || 'Driver',
        role: 'Driver',
      };

      const res = await apiPost<any>(`transport/complaints/${cId}/reply`, payload);
      // Display success message only after backend confirms save
      if (res) {
        setChatSuccessToast('Message sent and recorded in complaint history.');
        setTimeout(() => setChatSuccessToast(null), 4000);
        setChatInputText('');
        if (Array.isArray(res.replies)) {
          setChatReplies(res.replies);
        } else {
          setChatReplies((prev) => [
            ...prev,
            {
              sender: user.name || 'Driver',
              role: 'Driver',
              message: payload.message,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        loadData();
      }
    } catch (err: any) {
      console.error('Failed to post reply:', err);
      Alert.alert('Messaging Error', err?.message || 'Could not send message.');
    } finally {
      setIsSendingChat(false);
    }
  };

  // Passenger boarding toggle with persistent storage and backend sync
  const toggleBoarding = (id: string) => {
    const student = passengers.find(p => p.id === id || p.rollNo === id);
    if (student) {
      const curRec = attendanceMap[student.rollNo || student.id];
      const nextStatus = curRec?.status === 'Present' ? 'Absent' : 'Present';
      handleMarkAttendance(student, nextStatus);
    }
  };

  // Checkpoint stop toggle with persistent backend trip sync
  const toggleStopCompleted = (stopId: string) => {
    setStops((prev) => {
      const next = prev.map((s) => (s.id === stopId ? { ...s, completed: !s.completed } : s));
      const tripIdentifier = activeTrip ? (activeTrip._id || (activeTrip as any).tripId) : null;
      if (tripIdentifier) {
        apiPut(`transport/trips/${tripIdentifier}`, { stops: next }).catch(() => {});
      }
      return next;
    });
  };

  // Safe Phone Calling for Parents
  const handleCallParent = (phone: string, studentName: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      Alert.alert('Phone Number Missing', `No valid phone number found for ${studentName}'s parent.`);
      return;
    }

    Alert.alert(
      'Contact Parent / Guardian',
      `Call parent of ${studentName} at ${cleanPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            Linking.openURL(`tel:${cleanPhone}`).catch(() => {
              Alert.alert('Unable to Place Call', `Dial manually: ${cleanPhone}`);
            });
          },
        },
      ]
    );
  };

  // Start Trip Handler (Persisted to MongoDB)
  const handleConfirmStartTrip = async () => {
    try {
      setTripSubmitting(true);
      const tripId = `TRIP-${Date.now().toString().slice(-6)}`;
      const vehicleVal = myVehicle?.vehicleNumber || driverProfile.busNo || 'TN 01 AB 1234';
      const routeVal = activeRoute?.routeId || driverProfile.routeId || 'R-01';
      const todayStr = new Date().toISOString().split('T')[0];

      const tripPayload = {
        tripId,
        routeId: routeVal,
        vehicleId: vehicleVal,
        vehicle: vehicleVal,
        driver: driverProfile.name,
        driverId: user.userId || user.referenceId || 'DRV-0001',
        tripType: tripTypeSelection,
        date: todayStr,
        startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'In Progress',
        startOdometer: 48500,
        stops: stops.map((s) => ({
          id: s.id,
          name: s.name,
          time: s.time,
          completed: s.completed,
        })),
        studentTracking: passengers.map((p) => ({
          studentId: p.id || p.rollNo,
          pickupPoint: p.stop,
          boarded: p.boarded,
          dropped: false,
        })),
      };

      const res = await apiPost<TransportTrip>('transport/trips', tripPayload);

      setActiveTrip(res);
      setShowTripStartModal(false);
      Alert.alert(
        'Trip Started Successfully 🚦',
        `Active Route: ${driverProfile.route}.\nTrip Type: ${tripTypeSelection} Transit.\nPlease observe campus speed limit (20 km/h).`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert('Trip Start Error', err.message || 'Could not start trip.');
    } finally {
      setTripSubmitting(false);
    }
  };

  // End Trip Handler (Persisted to MongoDB)
  const handleConfirmEndTrip = async () => {
    try {
      setTripSubmitting(true);
      const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const tripIdentifier = activeTrip ? (activeTrip._id || (activeTrip as any).tripId) : null;
      if (tripIdentifier) {
        await apiPut(`transport/trips/${tripIdentifier}`, {
          endTime,
          status: 'Completed',
          remarks: tripRemarks || 'Arrived safely at Campus Gate',
        });
      }

      setActiveTrip(null);
      setShowTripEndModal(false);
      setTripRemarks('');

      // Mark all stops reset or completed
      setStops((prev) => prev.map((s) => ({ ...s, completed: true })));

      Alert.alert(
        'Trip Completed 🏁',
        `Transit trip ended safely at ${endTime}.\nArrival registered in campus logs.`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert('Trip End Error', err.message || 'Could not conclude trip.');
    } finally {
      setTripSubmitting(false);
    }
  };



  // Submit Vehicle Maintenance Task
  const handleReportMaintenance = async () => {
    if (!maintDesc.trim()) {
      Alert.alert('Missing Description', 'Please detail the maintenance requirement or vehicle symptom.');
      return;
    }
    try {
      setMaintSubmitting(true);
      await apiPost('transport/maintenance', {
        vehicleNumber: myVehicle?.vehicleNumber || driverProfile.busNo,
        type: maintType,
        description: maintDesc.trim(),
        date: new Date().toISOString().split('T')[0],
        status: 'Pending Review',
        reportedBy: driverProfile.name,
      });

      setShowMaintModal(false);
      setMaintDesc('');
      Alert.alert('Maintenance Logged', 'Vehicle inspection team notified for workshop review.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log maintenance request.');
    } finally {
      setMaintSubmitting(false);
    }
  };

  // Submit Vehicle Defect Complaint (/driver/vehicle & /driver/tasks)
  const handleCreateComplaint = async () => {
    if (!issueDescription.trim()) {
      Alert.alert('Description Required', 'Please provide details about the vehicle defect or maintenance concern.');
      return;
    }
    try {
      setIssueSubmitting(true);
      await apiPost('transport/complaints', {
        name: user.name || driverProfile.name,
        studentId: user.referenceId || user.userId || driverProfile.driverId,
        reporterType: 'Driver',
        busNumber: myVehicle?.vehicleNumber || driverProfile.busNo,
        routeId: activeRoute?.routeId || driverProfile.routeId,
        complaintType: `${issueType} [${issuePriority}]`,
        description: issueDescription.trim(),
        priority: issuePriority,
        status: 'Pending',
      });
      Alert.alert('Defect Ticket Dispatched 🛠️', 'Vehicle issue has been logged and sent to the transport workshop.');
      setShowIssueModal(false);
      setIssueDescription('');
      loadData();
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit defect ticket.');
    } finally {
      setIssueSubmitting(false);
    }
  };

  // Driver Acknowledge Resolution
  const handleAcknowledgeComplaint = async (taskId: string) => {
    try {
      setTaskUpdatingId(taskId);
      await apiPut(`transport/complaints/${taskId}`, {
        acknowledgedByDriver: true,
        driverAcknowledgeNote: `Acknowledged by Driver ${driverProfile.name}`
      });
      Alert.alert('Resolution Acknowledged ✓', 'Thank you for confirming vehicle inspection.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not acknowledge resolution.');
    } finally {
      setTaskUpdatingId(null);
    }
  };

  // Update Task Status (Maintenance or Complaint)
  const handleUpdateTask = async (taskId: string, isMaintenance: boolean, newStatus: string) => {
    try {
      setTaskUpdatingId(taskId);
      if (isMaintenance) {
        await apiPut(`transport/maintenance/${taskId}`, { status: newStatus });
      } else {
        await apiPut(`transport/complaints/${taskId}`, { status: newStatus });
      }
      Alert.alert('Status Updated', `Task status changed to ${newStatus}.`);
      await loadData();
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.message || err.message || 'Could not update task status.');
    } finally {
      setTaskUpdatingId(null);
    }
  };

  // Filtered student passengers
  const filteredStudents = useMemo(() => {
    return passengers.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        p.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
        p.stop.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesStop = selectedStopFilter === 'All' || p.stop.toLowerCase().includes(selectedStopFilter.toLowerCase());
      return matchesSearch && matchesStop;
    });
  }, [passengers, studentSearch, selectedStopFilter]);

  // Available unique stop names for filter
  const uniqueStops = useMemo(() => {
    const names = Array.from(new Set(passengers.map((p) => p.stop))).filter(Boolean);
    return ['All', ...names];
  }, [passengers]);

  // Android Hardware Back Button Handling
  useEffect(() => {
    const onBackPress = () => {
      if (showIssueModal) {
        setShowIssueModal(false);
        return true;
      }
      if (showTripStartModal) {
        setShowTripStartModal(false);
        return true;
      }
      if (showTripEndModal) {
        setShowTripEndModal(false);
        return true;
      }
      if (showMaintModal) {
        setShowMaintModal(false);
        return true;
      }
      if (activeNavTab === 'profile' && moreSection !== 'menu') {
        setMoreSection('menu');
        return true;
      }
      if (activeNavTab !== 'home') {
        setActiveNavTab('home');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeNavTab, moreSection, showTripStartModal, showTripEndModal, showMaintModal, showIssueModal]);

  const isInnerScreen = activeNavTab !== 'home';

  const getScreenTitle = () => {
    if (activeNavTab === 'academics') return 'Transit Operations & Trip';
    if (activeNavTab === 'referrals') return 'Business Referrals';
    if (activeNavTab === 'notifications') {
      return tasksNotifSubTab === 'tasks' ? 'Operational Tasks & Maintenance' : 'Transport Announcements';
    }
    if (activeNavTab === 'profile') {
      if (moreSection === 'checklist') return 'Pre-Trip Inspection';
      if (moreSection === 'leaves') return 'Driver Leave Portal';
      if (moreSection === 'payroll') return 'Driver Payroll & Slips';
      if (moreSection === 'notices') return 'Transit Notices';
      if (moreSection === 'safety') return 'Driver Safety Guidelines';
      if (moreSection === 'menu') return 'Fleet Services & Operations';
      return 'Driver Profile';
    }
    return 'Driver Fleet Command';
  };

  const handleBackNavigation = () => {
    if (activeNavTab === 'profile' && moreSection !== 'profile') {
      setMoreSection('profile');
    } else {
      setActiveNavTab('home');
    }
  };

  return (
    <View style={styles.container}>
      {/* ================= TOP DRIVER HEADER WITH BACK NAV & LOGOUT ================= */}
      <ScreenHeader
        showBack={isInnerScreen}
        onBack={handleBackNavigation}
        title={getScreenTitle()}
        subtitle={activeNavTab === 'home' ? `Bus ${driverProfile.busNo} • ${activeTrip ? 'On Route' : 'Standby'}` : undefined}
        userName={driverProfile.name}
        roleBadge="DRIVER"
        avatarText={driverProfile.name.substring(0, 2).toUpperCase()}
        userSubtitle={`Bus: ${driverProfile.busNo} • ${driverProfile.route}`}
        notificationsCount={unreadNotifsCount}
        onNotificationsPress={() => setShowNotifModal(true)}
        onProfilePress={() => {
          setActiveNavTab('profile');
          setMoreSection('profile');
        }}
        onLogoutPress={onLogout}
      />

      {/* ================= MAIN CONTENT BODY ================= */}
      <View style={styles.mainContent}>
        {/* TAB 1: HOME DASHBOARD */}
        {activeNavTab === 'home' && (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          >
            {/* 1. Visual Hero Banner with High Quality Campus Transit Driver Image */}
            <DashboardHeroBanner
              greeting={`Hello, ${driverProfile.name.split(' ')[0] || driverProfile.name} 👋`}
              subtitle="Drive Safe • Serve Better"
              image={require('../../../assets/images/dashboards/driver_hero.jpg')}
              tagline="Safe Rides Happy Students"
            />

            {/* Daily Duty Attendance Card (Punch In / Out synchronized with central ERP) */}
            <DailyDutyAttendanceCard user={user} style={{ marginHorizontal: 0, marginBottom: 12 }} />

            {/* 2. Trip Status Highlight Card (Matching Reference Design) */}
            <HighlightCard
              sectionTitle="Trip Status"
              actionText={activeTrip ? "Active" : "Details"}
              onActionPress={() => {
                setActiveNavTab('academics');
                setTransportSubTab('operations');
              }}
              icon="🚌"
              iconBg="#EFF6FF"
              title={driverProfile.route || 'Route 5 - Main Block'}
              subtitle={
                activeTrip
                  ? `Next Stop: ${stops.find((s) => !s.completed)?.name || 'Campus Terminal'}`
                  : `Vehicle: ${driverProfile.busNo} • ${driverProfile.capacity} Seats`
              }
              badgeText={activeTrip ? "In Transit" : "On Time"}
              badgeBg="#DCFCE7"
              badgeTextColor="#15803D"
              onPress={() => {
                setActiveNavTab('academics');
                setTransportSubTab('operations');
              }}
            />

            {/* 3. Quick Access 2x2 Grid (Matching Reference Design) */}
            <QuickAccessGrid
              title="Quick Access"
              seeAllText="All Modules →"
              onSeeAll={() => setActiveNavTab('academics')}
              items={[
                {
                  id: 'trip',
                  label: 'My Trip',
                  icon: '🚌',
                  bg: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  textColor: '#111827',
                  badge: activeTrip ? 'Active' : undefined,
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('operations');
                  },
                },
                {
                  id: 'vehicle',
                  label: 'My Vehicle',
                  icon: '🚐',
                  bg: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  textColor: '#111827',
                  badge: myVehicle?.status || 'Good',
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('vehicle');
                  },
                },
                {
                  id: 'route',
                  label: 'My Route',
                  icon: '📍',
                  bg: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  textColor: '#111827',
                  badge: stops.length > 0 ? `${stops.length} Stops` : undefined,
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('route');
                  },
                },
                {
                  id: 'students',
                  label: 'Student List',
                  icon: '🧑‍🤝‍🧑',
                  bg: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  textColor: '#111827',
                  badge: passengers.length > 0 ? `${passengers.length} Roster` : undefined,
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('students');
                  },
                },
              ]}
            />





            {/* UPCOMING / RECENT STOPS GLANCE */}
            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <Text style={[styles.cardSectionTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>📍 Route Stops Overview</Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveNavTab('academics');
                    setTransportSubTab('route');
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <Text style={styles.cardLinkText}>Full Itinerary →</Text>
                </TouchableOpacity>
              </View>

              {stops.length === 0 ? (
                <View style={styles.emptyCardBox}>
                  <Text style={styles.emptyCardText}>No stops configured for this route.</Text>
                </View>
              ) : (
                stops.slice(0, 4).map((stop) => (
                  <View key={stop.id} style={styles.stopGlanceRow}>
                    <TouchableOpacity
                      style={[
                        styles.stopGlanceCheck,
                        { backgroundColor: stop.completed ? '#10B981' : '#E2E8F0' },
                      ]}
                      onPress={() => toggleStopCompleted(stop.id)}
                    >
                      <Text style={styles.stopGlanceCheckText}>
                        {stop.completed ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.stopGlanceInfo}>
                      <Text style={styles.stopGlanceName}>{stop.name}</Text>
                      <Text style={styles.stopGlanceMeta}>
                        ETA: {stop.time} • {stop.studentsCount} Students Expected
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stopGlanceStatus,
                        { color: stop.completed ? '#10B981' : '#94A3B8' },
                      ]}
                    >
                      {stop.completed ? 'Passed' : 'Pending'}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* OPERATIONAL TASKS & VEHICLE DEFECTS OVERVIEW */}
            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardSectionTitle} numberOfLines={1}>📋 Active Tasks & Vehicle Issues</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                    {complaintTasks.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length + maintenanceList.filter((m) => m.status !== 'Completed').length} Pending Resolution
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setActiveNavTab('notifications');
                    setTasksNotifSubTab('tasks');
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <Text style={styles.cardLinkText}>View All Tasks →</Text>
                </TouchableOpacity>
              </View>

              {complaintTasks.length === 0 && maintenanceList.length === 0 ? (
                <View style={styles.emptyCardBox}>
                  <Text style={styles.emptyCardText}>No active vehicle defects or maintenance tasks.</Text>
                </View>
              ) : (
                <View style={{ gap: 8, marginTop: 4 }}>
                  {[...complaintTasks, ...maintenanceList].slice(0, 3).map((item: any, idx) => {
                    const isComplaint = !!item.complaintType;
                    const title = isComplaint ? (item.complaintType || 'Defect') : (item.type || 'Maintenance');
                    const desc = item.description || 'Assigned vehicle operational task';
                    const status = item.status || 'Pending';
                    const isResolved = status === 'Resolved' || status === 'Completed';

                    return (
                      <View
                        key={item._id || idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#F8FAFC',
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: isComplaint ? '#EFF6FF' : '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <Text style={{ fontSize: 16 }}>{isComplaint ? '🛠️' : '🔧'}</Text>
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>{title}</Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>{desc}</Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: isResolved ? '#DCFCE7' : '#FEF3C7',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: isResolved ? '#15803D' : '#B45309',
                            }}
                          >
                            {status}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* TRANSPORT NOTIFICATIONS & ALERTS */}
            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <Text style={[styles.cardSectionTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>🔔 Transport Announcements</Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveNavTab('notifications');
                    setTasksNotifSubTab('notices');
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <Text style={styles.cardLinkText}>View All ({notifications.length})</Text>
                </TouchableOpacity>
              </View>

              {notifications.length === 0 ? (
                <View style={styles.emptyCardBox}>
                  <Text style={styles.emptyCardText}>No new transport notices posted today.</Text>
                </View>
              ) : (
                notifications.slice(0, 3).map((n, idx) => (
                  <View key={n._id || idx} style={styles.noticeGlanceItem}>
                    <Text style={styles.noticeGlanceTitle}>
                      {n.title || n.subject || 'Campus Transport Update'}
                    </Text>
                    <Text style={styles.noticeGlanceMsg} numberOfLines={2}>
                      {n.message || n.description || n.text || ''}
                    </Text>
                    <Text style={styles.noticeGlanceDate}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Dedicated Driver Referral Rewards (Letters Fully Visible) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.cardSectionTitle} numberOfLines={1}>💼 Driver Referral Rewards</Text>
                  <Text style={styles.sectionSubtitle} numberOfLines={2}>
                    Earn institutional incentives across 4 commercial partner categories
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveNavTab('referrals')} activeOpacity={0.7} style={{ flexShrink: 0 }}>
                  <Text style={styles.cardLinkText}>Open Hub →</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginTop: 4 }}>
                {[
                  { id: 'cards', title: 'Credit Cards', desc: 'Pre-approved fuel cashback & toll benefit cards', icon: '💳', bg: '#EFF6FF', badge: 'Up to ₹2,500' },
                  { id: 'insurance', title: 'Insurance Policies', desc: 'Commercial vehicle, personal accident & family health', icon: '🛡️', bg: '#ECFDF5', badge: 'Up to ₹5,000' },
                  { id: 'jobs', title: 'Job Openings', desc: 'Refer skilled heavy vehicle drivers & mechanics', icon: '💼', bg: '#F5F3FF', badge: 'Hiring Bonus' },
                  { id: 'banking', title: 'Bank Accounts', desc: 'Salary accounts with zero minimum balance & free ATM access', icon: '🏛️', bg: '#FFFBEB', badge: 'Up to ₹750' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: item.bg,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.05)',
                    }}
                    onPress={() => setActiveNavTab('referrals')}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 6 }} numberOfLines={1}>{item.title}</Text>
                        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexShrink: 0 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>{item.badge}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }} numberOfLines={2}>{item.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* TAB 2: MY TRIP (TRANSPORT OPERATIONS) */}
        {activeNavTab === 'academics' && (
          <View style={styles.flexOne}>
            {/* Context Header Banner */}
            <View style={styles.pageHeaderBanner}>
              <Text style={styles.pageHeaderTitle}>Campus Transit Operations</Text>
              <Text style={styles.pageHeaderDesc}>
                Start daily trips, record stop checkpoints, verify student passenger boarding, and check bus specs.
              </Text>
            </View>

            {/* Segmented Sub Tabs */}
            <View style={styles.subTabSegmentRow}>
              {[
                { id: 'operations', label: 'Trip Ops', icon: '🚦' },
                { id: 'route', label: 'My Route', icon: '🗺️' },
                { id: 'students', label: 'Student List', icon: '👨‍🎓' },
                { id: 'vehicle', label: 'My Vehicle', icon: '🚌' },
              ].map((sub) => {
                const isSelected = transportSubTab === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subTabButton, isSelected && styles.subTabButtonActive]}
                    onPress={() => setTransportSubTab(sub.id as TransportSubTab)}
                  >
                    <Text style={styles.subTabIcon}>{sub.icon}</Text>
                    <Text style={[styles.subTabLabel, isSelected && styles.subTabLabelActive]}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
            >
              {/* SUB TAB: OPERATIONS */}
              {transportSubTab === 'operations' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🚦</Text>
                    <Text style={styles.guidanceTipText}>
                      Tap 'Start Morning / Evening Trip' before leaving the depot. Mark stops as 'Passed' as you reach each checkpoint along the itinerary.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>🚦 Live Trip Control Center</Text>
                    <Text style={styles.cardSectionDesc}>
                      Confirm departure and tap each checkpoint stop as you proceed along the itinerary.
                    </Text>

                    <View style={styles.tripStatusDetailsBox}>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Current State:</Text>
                        <Text
                          style={[
                            styles.tripStatusVal,
                            { color: activeTrip ? '#15803D' : '#64748B' },
                          ]}
                        >
                          {activeTrip ? '● EN ROUTE' : 'STANDBY AT DEPOT'}
                        </Text>
                      </View>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Active Route:</Text>
                        <Text style={styles.tripStatusVal}>{driverProfile.route}</Text>
                      </View>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Assigned Bus:</Text>
                        <Text style={styles.tripStatusVal}>{driverProfile.busNo}</Text>
                      </View>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Passengers:</Text>
                        <Text style={styles.tripStatusVal}>
                          {passengers.filter((p) => p.boarded).length} / {passengers.length} Boarded
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.largeTripButton,
                        { backgroundColor: activeTrip ? '#EF4444' : '#10B981' },
                      ]}
                      onPress={() => {
                        if (activeTrip) {
                          setShowTripEndModal(true);
                        } else {
                          setShowTripStartModal(true);
                        }
                      }}
                    >
                      <Text style={styles.largeTripButtonText}>
                        {activeTrip ? '🏁 END TRIP & LOG ARRIVAL' : '🚦 START SCHEDULED TRIP'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Stop Checkpoints */}
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>📍 Checkpoint Progression</Text>
                    <Text style={styles.cardSectionDesc}>
                      Tap checkmark when reaching each stop to keep transport command informed.
                    </Text>

                    {stops.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={styles.emptyCardText}>No stops defined on this route.</Text>
                      </View>
                    ) : (
                      stops.map((stop, idx) => {
                        const cleanStopName = (stop.name || '').replace(/^\d+\.\s*/, '').toLowerCase().trim();
                        const stopRep = attendanceReport?.stopBreakdown?.find((sb: any) =>
                          (sb.stopName || '').toLowerCase().trim() === cleanStopName
                        );
                        const expectedCount = stopRep ? stopRep.expectedStudents : stop.studentsCount;
                        const boardedCount = stopRep ? stopRep.boardedCount : 0;

                        return (
                          <View key={stop.id} style={styles.checkpointCard}>
                            <TouchableOpacity
                              style={[
                                styles.checkpointBox,
                                { backgroundColor: stop.completed ? '#10B981' : '#F1F5F9' },
                              ]}
                              onPress={() => toggleStopCompleted(stop.id)}
                            >
                              <Text
                                style={[
                                  styles.checkpointBoxText,
                                  { color: stop.completed ? '#FFFFFF' : '#94A3B8' },
                                ]}
                              >
                                {stop.completed ? '✓' : String(idx + 1)}
                              </Text>
                            </TouchableOpacity>

                            <View style={styles.checkpointInfo}>
                              <Text style={styles.checkpointName}>{stop.name}</Text>
                              <Text style={styles.checkpointMeta}>
                                ETA: {stop.time} • {boardedCount} / {expectedCount} Boarded
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={[
                                styles.checkpointActionBtn,
                                { backgroundColor: stop.completed ? '#DCFCE7' : '#EFF6FF' },
                              ]}
                              onPress={() => toggleStopCompleted(stop.id)}
                            >
                              <Text
                                style={[
                                  styles.checkpointActionText,
                                  { color: stop.completed ? '#15803D' : '#1D4ED8' },
                                ]}
                              >
                                {stop.completed ? 'Passed' : 'Mark Arrived'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}

              {/* SUB TAB: ROUTE */}
              {transportSubTab === 'route' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🗺️</Text>
                    <Text style={styles.guidanceTipText}>
                      Complete chronological stop sequence for your route. Review scheduled pickup times and assigned student counts.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>🗺️ Complete Route Stops Itinerary</Text>
                    <Text style={styles.cardSectionDesc}>
                      Authorized transit sequence for {driverProfile.route} ({driverProfile.routeId})
                    </Text>

                    {stops.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={styles.emptyCardText}>No route stops registered for this bus.</Text>
                      </View>
                    ) : (
                      stops.map((stop, idx) => {
                        const cleanStopName = (stop.name || '').replace(/^\d+\.\s*/, '').toLowerCase().trim();
                        const stopRep = attendanceReport?.stopBreakdown?.find((sb: any) =>
                          (sb.stopName || '').toLowerCase().trim() === cleanStopName
                        );
                        const expectedCount = stopRep ? stopRep.expectedStudents : stop.studentsCount;
                        const boardedCount = stopRep ? stopRep.boardedCount : 0;

                        return (
                          <View key={stop.id} style={styles.routeTimelineItem}>
                            <View style={styles.timelineLeft}>
                              <View
                                style={[
                                  styles.timelineCircle,
                                  { backgroundColor: stop.completed ? '#10B981' : '#1E3A8A' },
                                ]}
                              >
                                <Text style={styles.timelineCircleText}>{idx + 1}</Text>
                              </View>
                              {idx < stops.length - 1 && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineContent}>
                              <Text style={styles.timelineStopTitle}>{stop.name}</Text>
                              <Text style={styles.timelineStopMeta}>
                                Scheduled Pickup: {stop.time}
                              </Text>
                              <Text style={[styles.timelineStopStudents, { color: boardedCount > 0 ? '#15803D' : '#059669', fontWeight: '800' }]}>
                                👨‍🎓 {boardedCount} / {expectedCount} Boarded
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}

              {/* SUB TAB: STUDENT LIST */}
              {transportSubTab === 'students' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>👨‍🎓</Text>
                    <Text style={styles.guidanceTipText}>
                      Tap 'Board' when each scholar steps onto the bus. Tap 'Call Parent' if a registered student does not appear at their stop.
                    </Text>
                  </View>
                  {/* Notification Toast */}
                  {attendanceToast && (
                    <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857', textAlign: 'center' }}>
                        {attendanceToast}
                      </Text>
                    </View>
                  )}

                  {/* Search, Filter & Report Access */}
                  <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.cardSectionTitle}>👨‍🎓 Student Attendance & Roster</Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#1E3A8A',
                          paddingVertical: 5,
                          paddingHorizontal: 10,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        onPress={() => setShowAttendanceReportModal(true)}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>📊 Attendance Report</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cardSectionDesc}>
                      Mark student Present or Absent. Once saved, records are locked against duplicate submissions.
                    </Text>

                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by student name or roll number..."
                      placeholderTextColor="#94A3B8"
                      value={studentSearch}
                      onChangeText={setStudentSearch}
                    />

                    {/* Stop Filter Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      {uniqueStops.map((stopName) => {
                        const isChipActive = selectedStopFilter === stopName;
                        return (
                          <TouchableOpacity
                            key={stopName}
                            style={[styles.filterChip, isChipActive && styles.filterChipActive]}
                            onPress={() => setSelectedStopFilter(stopName)}
                          >
                            <Text
                              style={[
                                styles.filterChipText,
                                isChipActive && styles.filterChipTextActive,
                              ]}
                            >
                              {stopName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Live KPI Attendance Stats */}
                    {(() => {
                      const presentCount = passengers.filter((s) => getActiveStatus(s.rollNo || s.id) === 'Present').length;
                      const absentCount = passengers.filter((s) => getActiveStatus(s.rollNo || s.id) === 'Absent').length;
                      const pendingCount = Math.max(0, passengers.length - presentCount - absentCount);

                      return (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 8 }}>
                          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{passengers.length}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>TOTAL</Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#059669' }}>{presentCount}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#047857' }}>PRESENT</Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#DC2626' }}>{absentCount}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#B91C1C' }}>ABSENT</Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#D97706' }}>{pendingCount}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#B45309' }}>PENDING</Text>
                          </View>
                        </View>
                      );
                    })()}

                    {/* 4 Bulk Action Buttons */}
                    <View style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#059669',
                            paddingVertical: 8,
                            paddingHorizontal: 6,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={handleMarkAllPresent}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>✓ Mark All Present</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#DC2626',
                            paddingVertical: 8,
                            paddingHorizontal: 6,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={handleMarkAllAbsent}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>✕ Mark All Absent</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: isCustomizing ? '#4338CA' : '#EEF2FF',
                            borderWidth: 1,
                            borderColor: isCustomizing ? '#3730A3' : '#C7D2FE',
                            paddingVertical: 8,
                            paddingHorizontal: 6,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={handleToggleCustomize}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: isCustomizing ? '#FFFFFF' : '#4338CA' }}>
                            {isCustomizing ? '✓ Customizing...' : '⚙️ Customize Attendance'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: isSavingBulk ? '#6B7280' : '#1D4ED8',
                            paddingVertical: 8,
                            paddingHorizontal: 6,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 4,
                          }}
                          onPress={handleSaveBulkAttendance}
                          disabled={isSavingBulk}
                        >
                          {isSavingBulk ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                              💾 Save Attendance {hasUnsavedChanges ? '(*)' : ''}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Customizing Info Banner */}
                    {(isCustomizing || hasUnsavedChanges) && (
                      <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', padding: 8, borderRadius: 6, marginTop: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>
                          ✏️ Customization Active: Tap 'Present' or 'Absent' on any student below to modify their status individually. Other students will remain unchanged. Tap 'Save Attendance' when finished.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Passenger List */}
                  {filteredStudents.length === 0 ? (
                    <View style={[styles.card, styles.emptyCardBox]}>
                      <Text style={styles.emptyCardText}>No matching student passengers found.</Text>
                    </View>
                  ) : (
                    filteredStudents.map((student) => {
                      const studentKey = student.rollNo || student.id;
                      const status = getActiveStatus(studentKey);
                      const isDrafted = attendanceDraft[studentKey] !== undefined;
                      const isLocked = attendanceMap[studentKey]?.isLocked && !isDrafted && !isCustomizing;
                      const isLoadingThis = attendanceLoadingId === studentKey;

                      return (
                        <TouchableOpacity
                          key={student.id}
                          style={styles.passengerCard}
                          onPress={() => setSelectedPassengerProfile(student)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.passengerLeft}>
                            <View style={styles.passengerHeaderRow}>
                              <Text style={styles.passengerName}>{student.name}</Text>
                              <View
                                style={[
                                  styles.boardingStatusPill,
                                  {
                                    backgroundColor:
                                      status === 'Present' ? '#DCFCE7' :
                                      status === 'Absent' ? '#FEE2E2' : '#FEF3C7',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.boardingStatusPillText,
                                    {
                                      color:
                                        status === 'Present' ? '#15803D' :
                                        status === 'Absent' ? '#B91C1C' : '#B45309',
                                    },
                                  ]}
                                >
                                  {status === 'Present' ? '✓ PRESENT' : status === 'Absent' ? '✕ ABSENT' : '⏳ PENDING'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.passengerMeta}>
                              Roll: {student.rollNo} • Pickup: {student.stop}
                            </Text>

                            {/* Large Call Parent Action */}
                            <TouchableOpacity
                              style={styles.callParentButton}
                              onPress={() => handleCallParent(student.parentPhone, student.name)}
                            >
                              <Text style={styles.callParentIcon}>📞</Text>
                              <Text style={styles.callParentLabel}>
                                Call Parent ({student.parentPhone})
                              </Text>
                            </TouchableOpacity>

                            <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700', marginTop: 4 }}>
                              View Passenger Profile ›
                            </Text>
                          </View>

                          {/* Attendance Controls */}
                          {isLocked ? (
                            <View style={{ alignItems: 'flex-end', gap: 6, marginLeft: 8 }}>
                              <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>🔒 Saved</Text>
                              </View>
                              <TouchableOpacity
                                style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: '#BFDBFE' }}
                                onPress={() => handleOpenCorrection(student)}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>✏️ Correct</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'column', gap: 6, marginLeft: 8 }}>
                              <TouchableOpacity
                                style={{
                                  backgroundColor: status === 'Present' ? '#16A34A' : '#F0FDF4',
                                  borderWidth: 1,
                                  borderColor: status === 'Present' ? '#15803D' : '#86EFAC',
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  minWidth: 78,
                                  alignItems: 'center',
                                  opacity: isLoadingThis ? 0.6 : 1,
                                }}
                                onPress={() => handleSetStudentDraft(student, 'Present')}
                                disabled={isLoadingThis}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '800', color: status === 'Present' ? '#FFFFFF' : '#15803D' }}>
                                  ✓ Present
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{
                                  backgroundColor: status === 'Absent' ? '#DC2626' : '#FEF2F2',
                                  borderWidth: 1,
                                  borderColor: status === 'Absent' ? '#B91C1C' : '#FCA5A5',
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  minWidth: 78,
                                  alignItems: 'center',
                                  opacity: isLoadingThis ? 0.6 : 1,
                                }}
                                onPress={() => handleSetStudentDraft(student, 'Absent')}
                                disabled={isLoadingThis}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '800', color: status === 'Absent' ? '#FFFFFF' : '#B91C1C' }}>
                                  ✕ Absent
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {/* SUB TAB: VEHICLE */}
              {transportSubTab === 'vehicle' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🚌</Text>
                    <Text style={styles.guidanceTipText}>
                      Review assigned bus specifications, fitness certificate validity, and log mechanical maintenance issues for workshop inspection.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <View style={styles.cardHeaderFlex}>
                      <Text style={styles.cardSectionTitle}>🚌 Assigned Vehicle Specs</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.smallActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                          onPress={() => setShowIssueModal(true)}
                        >
                          <Text style={[styles.smallActionBtnText, { color: '#1E40AF' }]}>🛠️ Report Defect</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.smallActionBtn}
                          onPress={() => setShowMaintModal(true)}
                        >
                          <Text style={styles.smallActionBtnText}>+ Log Service</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {[
                      { label: 'Vehicle Number', value: myVehicle?.vehicleNumber || driverProfile.busNo },
                      { label: 'Registration Plate', value: myVehicle?.registrationNumber || driverProfile.busNo },
                      { label: 'Seating Capacity', value: `${myVehicle?.capacity || driverProfile.capacity} Passengers` },
                      { label: 'Vehicle Status', value: myVehicle?.status || 'Active & Operational' },
                      { label: 'Fuel Type', value: myVehicle?.fuelType || 'Diesel' },
                      { label: 'Fitness Certificate (FC)', value: myVehicle?.fitnessExpiry ? new Date(myVehicle.fitnessExpiry).toLocaleDateString() : 'Valid / Up to date' },
                      { label: 'Insurance Expiry', value: myVehicle?.insuranceExpiry ? new Date(myVehicle.insuranceExpiry).toLocaleDateString() : 'Active Insured' },
                    ].map((spec, idx) => (
                      <View key={idx} style={styles.specItemRow}>
                        <Text style={styles.specItemLabel}>{spec.label}</Text>
                        <Text style={styles.specItemValue}>{spec.value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Vehicle Defect Tickets (Matching DriverVehicle.jsx on Web) */}
                  <View style={styles.card}>
                    <View style={styles.cardHeaderFlex}>
                      <Text style={styles.cardSectionTitle}>🛠️ My Defect Tickets</Text>
                      <TouchableOpacity onPress={() => setShowIssueModal(true)}>
                        <Text style={styles.cardLinkText}>+ New Defect</Text>
                      </TouchableOpacity>
                    </View>
                    {complaintTasks.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={styles.emptyCardText}>No defect complaints logged for this vehicle.</Text>
                      </View>
                    ) : (
                      complaintTasks.map((c, idx) => (
                        <View key={c._id || idx} style={styles.maintItemCard}>
                          <View style={styles.maintTopRow}>
                            <Text style={styles.maintTypeBadge}>{c.complaintType || 'Vehicle Issue'}</Text>
                            <Text
                              style={[
                                styles.maintStatusBadge,
                                {
                                  color: c.status === 'Resolved' ? '#15803D' : '#D97706',
                                  backgroundColor: c.status === 'Resolved' ? '#DCFCE7' : '#FEF3C7',
                                },
                              ]}
                            >
                              {c.status || 'Pending'}
                            </Text>
                          </View>
                          <Text style={styles.maintDesc}>{c.description}</Text>
                          <Text style={styles.maintDate}>
                            Logged: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Maintenance Log */}
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>🔧 Maintenance & Workshop Log</Text>
                    {maintenanceList.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={styles.emptyCardText}>No maintenance issues logged for this vehicle.</Text>
                      </View>
                    ) : (
                      maintenanceList.map((m, idx) => (
                        <View key={m._id || idx} style={styles.maintItemCard}>
                          <View style={styles.maintTopRow}>
                            <Text style={styles.maintTypeBadge}>{m.type || 'Service'}</Text>
                            <Text
                              style={[
                                styles.maintStatusBadge,
                                {
                                  color: m.status === 'Completed' ? '#15803D' : '#D97706',
                                  backgroundColor: m.status === 'Completed' ? '#DCFCE7' : '#FEF3C7',
                                },
                              ]}
                            >
                              {m.status || 'Under Review'}
                            </Text>
                          </View>
                          <Text style={styles.maintDesc}>{m.description || 'Routine maintenance'}</Text>
                          <Text style={styles.maintDate}>
                            Date: {m.date ? new Date(m.date).toLocaleDateString() : 'Recent'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 3: BUSINESS REFERRALS */}
        {activeNavTab === 'referrals' && (
          <View style={styles.flexOne}>
            <ReferralHub user={user} onBack={() => setActiveNavTab('home')} />
          </View>
        )}

        {/* TAB 4: TASKS & NOTIFICATIONS (/driver/tasks & /driver/notifications) */}
        {activeNavTab === 'notifications' && (
          <View style={styles.flexOne}>
            {/* Top Switcher: My Tasks vs Transport Notices */}
            <View style={styles.profileToggleHeader}>
              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  tasksNotifSubTab === 'tasks' && styles.profileToggleTabActive,
                ]}
                onPress={() => setTasksNotifSubTab('tasks')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    tasksNotifSubTab === 'tasks' && styles.profileToggleTabTextActive,
                  ]}
                >
                  📋 My Tasks ({complaintTasks.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length + maintenanceList.filter((m) => m.status !== 'Completed').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  tasksNotifSubTab === 'notices' && styles.profileToggleTabActive,
                ]}
                onPress={() => setTasksNotifSubTab('notices')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    tasksNotifSubTab === 'notices' && styles.profileToggleTabTextActive,
                  ]}
                >
                  🔔 Notices ({unreadNotifsCount})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
            >
              {tasksNotifSubTab === 'tasks' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>📋</Text>
                    <Text style={styles.guidanceTipText}>
                      Track maintenance tasks and vehicle defects assigned to Bus {driverProfile.busNo}. Update task progress in real time.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Operational Tasks</Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#1E3A8A',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onPress={() => setShowIssueModal(true)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ Report Defect</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Filter Pills */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {(['All', 'Pending', 'In Progress', 'Resolved'] as const).map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: taskFilter === f ? '#1E3A8A' : '#FFFFFF',
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: taskFilter === f ? '#1E3A8A' : '#E2E8F0',
                        }}
                        onPress={() => setTaskFilter(f)}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: taskFilter === f ? '#FFFFFF' : '#64748B',
                          }}
                        >
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Tasks List */}
                  {(() => {
                    const combinedList = [
                      ...complaintTasks.map((c) => ({
                        id: c._id || c.complaintId || '',
                        complaintId: c.complaintId || c._id || '',
                        type: 'Defect / Issue',
                        category: c.complaintType || 'Vehicle Defect',
                        desc: c.description,
                        priority: c.priority || 'Medium',
                        status: c.status || 'Pending',
                        assignedTo: c.assignedTo || 'Unassigned',
                        resolutionNote: c.resolutionNote,
                        resolvedBy: c.resolvedBy,
                        acknowledgedByDriver: c.acknowledgedByDriver,
                        vehicle: c.busNumber || driverProfile.busNo,
                        date: c.createdAt,
                        isMaintenance: false,
                        reporter: c.name || c.reporterType || 'Driver',
                        replies: c.replies || [],
                        rawComplaint: c,
                      })),
                      ...maintenanceList.map((m) => ({
                        id: m._id || '',
                        complaintId: m._id,
                        type: 'Maintenance Service',
                        category: m.type || 'Routine Service',
                        desc: m.description || 'Workshop scheduled maintenance',
                        priority: 'Medium',
                        status: m.status || 'Pending Review',
                        assignedTo: 'Workshop Team',
                        resolutionNote: m.remarks,
                        resolvedBy: m.reportedBy,
                        acknowledgedByDriver: true,
                        vehicle: m.vehicleNumber || driverProfile.busNo,
                        date: m.date,
                        isMaintenance: true,
                        reporter: 'Workshop Team',
                      })),
                    ];

                    const filtered = combinedList.filter((t) => {
                      if (taskFilter === 'All') return true;
                      if (taskFilter === 'Pending') return t.status === 'Pending' || t.status === 'Open' || t.status === 'Pending Review';
                      if (taskFilter === 'In Progress') return t.status === 'In Progress';
                      if (taskFilter === 'Resolved') return t.status === 'Resolved' || t.status === 'Completed' || t.status === 'Closed';
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <View style={styles.emptyCardBox}>
                          <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                          <Text style={styles.emptyCardText}>No operational tasks in this status filter.</Text>
                        </View>
                      );
                    }

                    return filtered.map((task, idx) => {
                      const isPending = task.status === 'Pending' || task.status === 'Open' || task.status === 'Pending Review';
                      const isInProgress = task.status === 'In Progress';
                      const isResolved = task.status === 'Resolved' || task.status === 'Completed' || task.status === 'Closed';
                      const isSafety = /brake|tire|tyre|steering|suspension|engine|safety/i.test(task.category || '') ||
                                       /brake|tire|tyre|steering|suspension|engine|safety/i.test(task.desc || '');

                      return (
                        <View
                          key={task.id || idx}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 14,
                            padding: 14,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                            elevation: 2,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                              <View
                                style={{
                                  backgroundColor: task.isMaintenance ? '#F3E8FF' : '#EFF6FF',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    color: task.isMaintenance ? '#7E22CE' : '#1D4ED8',
                                  }}
                                >
                                  {task.type}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>Bus {task.vehicle}</Text>
                              {task.complaintId && (
                                <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>({task.complaintId})</Text>
                              )}
                            </View>

                            <View
                              style={{
                                backgroundColor: isResolved ? '#DCFCE7' : isInProgress ? '#FEF3C7' : '#FEE2E2',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '800',
                                  color: isResolved ? '#15803D' : isInProgress ? '#B45309' : '#B91C1C',
                                }}
                              >
                                {task.status}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                            {task.category}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17, marginBottom: 6 }}>
                            {task.desc}
                          </Text>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              Assigned: <Text style={{ fontWeight: '700', color: '#1E3A8A' }}>{task.assignedTo || 'Unassigned'}</Text>
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                              Priority: <Text style={{ fontWeight: '700' }}>{task.priority}</Text>
                            </Text>
                          </View>

                          {/* Admin Resolution Notes Box */}
                          {task.resolutionNote && (
                            <View style={{ backgroundColor: '#DCFCE7', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#86EFAC' }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534' }}>🛠️ Workshop Resolution Note:</Text>
                              <Text style={{ fontSize: 11, color: '#14532D', marginTop: 2 }}>{task.resolutionNote}</Text>
                              {task.resolvedBy && (
                                <Text style={{ fontSize: 10, color: '#15803D', marginTop: 3 }}>Cleared by: {task.resolvedBy}</Text>
                              )}
                            </View>
                          )}

                          {/* Safety Notice if in progress */}
                          {!isResolved && isSafety && (
                            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 6, padding: 6, marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>
                                ⚠️ Brakes/Tires safety defect. Under workshop maintenance until certified.
                              </Text>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                              {task.date ? new Date(task.date).toLocaleDateString() : 'Recent'}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {isPending && (
                                <TouchableOpacity
                                  style={{
                                    backgroundColor: '#FEF3C7',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#FDE68A',
                                  }}
                                  onPress={() => handleUpdateTask(task.id || task.complaintId || '', task.isMaintenance, 'In Progress')}
                                  disabled={taskUpdatingId === task.id}
                                >
                                  {taskUpdatingId === task.id ? (
                                    <ActivityIndicator size="small" color="#B45309" />
                                  ) : (
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>Start Task ›</Text>
                                  )}
                                </TouchableOpacity>
                              )}

                              {isInProgress && (
                                isSafety && !task.isMaintenance ? (
                                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>Inspection Active</Text>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={{
                                      backgroundColor: '#DCFCE7',
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 6,
                                      borderWidth: 1,
                                      borderColor: '#BBF7D0',
                                    }}
                                    onPress={() => handleUpdateTask(task.id || task.complaintId || '', task.isMaintenance, task.isMaintenance ? 'Completed' : 'Resolved')}
                                    disabled={taskUpdatingId === task.id}
                                  >
                                    {taskUpdatingId === task.id ? (
                                      <ActivityIndicator size="small" color="#15803D" />
                                    ) : (
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>Mark Resolved ✓</Text>
                                    )}
                                  </TouchableOpacity>
                                )
                              )}

                              {isResolved && !task.isMaintenance && !task.acknowledgedByDriver && (
                                <TouchableOpacity
                                  style={{
                                    backgroundColor: '#16A34A',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                  }}
                                  onPress={() => handleAcknowledgeComplaint(task.id || task.complaintId || '')}
                                  disabled={taskUpdatingId === task.id}
                                >
                                  {taskUpdatingId === task.id ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                  ) : (
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>✓ Acknowledge</Text>
                                  )}
                                </TouchableOpacity>
                              )}

                              {isResolved && (task.isMaintenance || task.acknowledgedByDriver) && (
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>✓ Completed & Cleared</Text>
                              )}

                              {!task.isMaintenance && (
                                <TouchableOpacity
                                  style={{
                                    backgroundColor: '#EFF6FF',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: '#BFDBFE',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                  onPress={() => handleOpenDiscussion((task as any).rawComplaint || task)}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                                    💬 Discussion {((task as any).replies && (task as any).replies.length > 0) ? `(${(task as any).replies.length})` : ''}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    });
                  })()}
                </View>
              )}

              {/* Sub-view: Transit Notices & Advisories */}
              {tasksNotifSubTab === 'notices' && (
                <View style={{ flex: 1, minHeight: 460 }}>
                  <MobileNotificationCenter
                    user={user}
                    onUnreadCountChange={handleUnreadNotifsCountChange}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 4: PROFILE */}
        {activeNavTab === 'profile' && (
          <View style={styles.flexOne}>
            {/* Top Sub-Navigation Switcher: Driver Profile vs Fleet Services */}
            <View style={styles.profileToggleHeader}>
              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  moreSection === 'profile' && styles.profileToggleTabActive,
                ]}
                onPress={() => setMoreSection('profile')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    moreSection === 'profile' && styles.profileToggleTabTextActive,
                  ]}
                >
                  👤 Driver Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  moreSection !== 'profile' && styles.profileToggleTabActive,
                ]}
                onPress={() => setMoreSection('menu')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    moreSection !== 'profile' && styles.profileToggleTabTextActive,
                  ]}
                >
                  🚌 Fleet Services
                </Text>
              </TouchableOpacity>
            </View>

            {/* VIEW 1: OFFICIAL DRIVER PROFILE (PRIMARY VIEW FOR PROFILE TAB & TOP AVATAR) */}
            {moreSection === 'profile' && (
              <UserProfileScreen
                user={user}
                roleTitle="Campus Transit Driver"
                onLogout={onLogout}
                onBack={() => setActiveNavTab('home')}
                hideTopBar={true}
                roleAttributes={[
                  { label: 'Driver Employee ID', value: driverProfile.driverId },
                  { label: 'Assigned Vehicle', value: `${driverProfile.busNo} (${driverProfile.capacity} Seats)` },
                  { label: 'Transit Route', value: `${driverProfile.route} [${driverProfile.routeId}]` },
                  { label: 'Commercial Driving License', value: driverProfile.licenseNo },
                  { label: 'Emergency Contact', value: driverProfile.phone },
                  { label: 'Trip Operational Status', value: activeTrip ? 'En Route (Active Trip)' : 'Standby / Ready' },
                  { label: 'Vehicle Health Status', value: myVehicle?.status || 'Good' },
                ]}
              />
            )}

            {/* VIEW 2: FLEET SERVICES & TOOLS */}
            {moreSection !== 'profile' && moreSection !== 'leaves' && (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
              >
                {/* DRIVER PROFILE CARD */}
                {moreSection === 'menu' && (
                  <View style={styles.profileSummaryCard}>
                    <View style={styles.profileAvatarLarge}>
                      <Text style={styles.profileAvatarLargeText}>
                        {driverProfile.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.profileSummaryInfo}>
                      <Text style={styles.profileSummaryName}>{driverProfile.name}</Text>
                      <Text style={styles.profileSummaryRole}>Institutional Campus Driver</Text>
                      <Text style={styles.profileSummaryMeta}>ID: {driverProfile.driverId}</Text>
                      <Text style={styles.profileSummaryMeta}>Bus: {driverProfile.busNo}</Text>
                      <Text style={styles.profileSummaryMeta}>License: {driverProfile.licenseNo}</Text>
                    </View>
                  </View>
                )}

              {/* NAVIGATION MENU ITEMS */}
              {moreSection === 'menu' && (
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>🛠️ Driver Services & Accounts</Text>

                {[
                  { id: 'profile', title: 'Driver Identity & Profile', sub: 'Verified employee details and route license', icon: '👤' },
                  { id: 'leaves', title: 'Leave Requests & Approvals', sub: 'Submit leave applications and track status', icon: '📅' },
                  { id: 'tasks', title: 'My Operational Tasks', sub: 'Assigned vehicle defects and maintenance work', icon: '📋' },
                  { id: 'checklist', title: 'Daily Pre-Trip Inspection', sub: 'Brakes, tires, first-aid & emergency exit check', icon: '🛡️' },
                  { id: 'payroll', title: 'Salary Slips & Payroll', sub: 'View monthly earnings, allowances and net pay', icon: '💵' },
                  { id: 'notices', title: 'Transport Notices & Advisories', sub: 'Campus transit notifications and road alerts', icon: '🔔' },
                  { id: 'safety', title: 'Driver Safety Guidelines & SOP', sub: 'Institutional safety protocols and speed limits', icon: '🚦' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItemRow}
                    onPress={() => {
                      if (item.id === 'tasks') {
                        setActiveNavTab('notifications');
                        setTasksNotifSubTab('tasks');
                      } else if (item.id === 'notices') {
                        setActiveNavTab('notifications');
                        setTasksNotifSubTab('notices');
                      } else {
                        setMoreSection(item.id as MoreSection);
                      }
                    }}
                  >
                    <View style={styles.menuItemIconBox}>
                      <Text style={styles.menuItemIconText}>{item.icon}</Text>
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <Text style={styles.menuItemSub}>{item.sub}</Text>
                    </View>
                    <Text style={styles.menuItemArrow}>›</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity style={styles.menuSignOutBtn} onPress={onLogout}>
                  <Text style={styles.menuSignOutText}>Sign Out from Driver Portal</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-SECTION: PRE-TRIP CHECKLIST */}
            {moreSection === 'checklist' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>📋 Daily Pre-Trip Safety Inspection</Text>
                <Text style={styles.cardSectionDesc}>
                  Perform inspection while stationary before starting daily student transit.
                </Text>

                {[
                  { key: 'brakes', label: 'Brakes & Steering System operational' },
                  { key: 'tires', label: 'Tire inflation and tread depth verified' },
                  { key: 'fluids', label: 'Engine oil, coolant and brake fluid adequate' },
                  { key: 'extinguisher', label: 'Fire extinguisher pressure in green safety zone' },
                  { key: 'firstAid', label: 'First Aid Kit stocked with emergency supplies' },
                  { key: 'emergencyExit', label: 'Emergency exit windows and door latches unblocked' },
                  { key: 'mirrors', label: 'Side mirrors and passenger rear-view mirror adjusted' },
                ].map((item) => {
                  const isChecked = !!checklist[item.key];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.checklistRow}
                      onPress={() =>
                        setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                    >
                      <View
                        style={[
                          styles.checkboxBox,
                          { backgroundColor: isChecked ? '#10B981' : '#F1F5F9' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.checkboxCheck,
                            { color: isChecked ? '#FFFFFF' : '#94A3B8' },
                          ]}
                        >
                          {isChecked ? '✓' : ''}
                        </Text>
                      </View>
                      <Text style={styles.checklistLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.saveChecklistBtn}
                  onPress={() => {
                    setInspectionReportModalVisible(true);
                  }}
                >
                  <Text style={styles.saveChecklistBtnText}>Confirm Pre-Trip Inspection ✓</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-SECTION: PAYROLL */}
            {moreSection === 'payroll' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>💵 Driver Payslips & Payroll</Text>
                <Text style={styles.cardSectionDesc}>
                  Monthly institutional compensation and earnings statements.
                </Text>

                {salaries.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Text style={styles.emptyCardText}>
                      No electronic salary slips generated yet for driver account {driverProfile.driverId}.
                    </Text>
                  </View>
                ) : (
                  salaries.map((sal, idx) => (
                    <TouchableOpacity
                      key={sal._id || idx}
                      style={styles.payrollCard}
                      onPress={() => setSelectedSalarySlip(sal)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.payrollHeaderRow}>
                        <Text style={styles.payrollMonthTitle}>
                          {sal.month || 'Current Month'} {sal.year || ''}
                        </Text>
                        <View
                          style={[
                            styles.payrollStatusPill,
                            {
                              backgroundColor:
                                sal.status === 'Paid' ? '#DCFCE7' : '#FEF3C7',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.payrollStatusText,
                              {
                                color: sal.status === 'Paid' ? '#15803D' : '#D97706',
                              },
                            ]}
                          >
                            {sal.status || 'Processed'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.payrollBreakdownGrid}>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Basic Pay</Text>
                          <Text style={styles.payrollColVal}>
                            ₹{sal.basicSalary?.toLocaleString() || '18,500'}
                          </Text>
                        </View>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Allowances</Text>
                          <Text style={styles.payrollColVal}>
                            ₹{sal.allowances?.toLocaleString() || '3,200'}
                          </Text>
                        </View>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Deductions</Text>
                          <Text style={[styles.payrollColVal, { color: '#EF4444' }]}>
                            -₹{sal.deductions?.toLocaleString() || '1,100'}
                          </Text>
                        </View>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Net Take-Home</Text>
                          <Text style={[styles.payrollColVal, { color: '#059669', fontWeight: '800' }]}>
                            ₹{sal.netSalary?.toLocaleString() || '20,600'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* SUB-SECTION: NOTICES */}
            {moreSection === 'notices' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>🔔 Transport Notices & Alerts</Text>

                {notifications.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Text style={styles.emptyCardText}>No announcements posted.</Text>
                  </View>
                ) : (
                  notifications.map((n, idx) => (
                    <View key={n._id || idx} style={styles.noticeGlanceItem}>
                      <Text style={styles.noticeGlanceTitle}>
                        {n.title || n.subject || 'Notice'}
                      </Text>
                      <Text style={styles.noticeGlanceMsg}>
                        {n.message || n.description || n.text || ''}
                      </Text>
                      <Text style={styles.noticeGlanceDate}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* SUB-SECTION: SAFETY */}
            {moreSection === 'safety' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>🛡️ Driver Safety Guidelines & SOP</Text>

                {[
                  { rule: 'Campus Speed Limit: Strictly 20 KM/H inside college premises. 40 KM/H on city corridors.' },
                  { rule: 'Stationary Doors: Never open pneumatic doors until the bus is completely stationary and handbrake engaged.' },
                  { rule: 'No Distraction: Mobile phone operation strictly prohibited while moving. Pull over in safe bay before making urgent calls.' },
                  { rule: 'Student Handover: Wait until students have safely crossed onto sidewalk before continuing route.' },
                  { rule: 'Emergency Protocol: In case of vehicle breakdown, activate hazard flashers and notify Transport Control immediately.' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.safetyRuleRow}>
                    <Text style={styles.safetyRuleNumber}>{idx + 1}.</Text>
                    <Text style={styles.safetyRuleText}>{item.rule}</Text>
                  </View>
                ))}
              </View>
            )}

              </ScrollView>
            )}

            {/* VIEW 3: DRIVER LEAVE PORTAL */}
            {moreSection === 'leaves' && (
              <DriverLeaveScreen user={user} onBack={() => setMoreSection('menu')} />
            )}
          </View>
        )}
      </View>

      {/* ================= TRIP START CONFIRMATION MODAL ================= */}
      <Modal visible={showTripStartModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🚦 Confirm Trip Start</Text>
            <Text style={styles.modalSub}>
              Ensure vehicle is stationary and pre-trip inspection is completed.
            </Text>

            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoLabel}>Assigned Route:</Text>
              <Text style={styles.modalInfoVal}>{driverProfile.route} ({driverProfile.routeId})</Text>

              <Text style={styles.modalInfoLabel}>Vehicle:</Text>
              <Text style={styles.modalInfoVal}>{driverProfile.busNo}</Text>

              <Text style={styles.modalInfoLabel}>Select Transit Shift:</Text>
              <View style={styles.shiftPickerRow}>
                {(['Morning', 'Evening'] as const).map((shift) => (
                  <TouchableOpacity
                    key={shift}
                    style={[
                      styles.shiftBtn,
                      tripTypeSelection === shift && styles.shiftBtnActive,
                    ]}
                    onPress={() => setTripTypeSelection(shift)}
                  >
                    <Text
                      style={[
                        styles.shiftBtnText,
                        tripTypeSelection === shift && styles.shiftBtnTextActive,
                      ]}
                    >
                      {shift} Transit
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowTripStartModal(false)}
                disabled={tripSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmStartTrip}
                disabled={tripSubmitting}
              >
                {tripSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Start Trip 🚦</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= TRIP END CONFIRMATION MODAL ================= */}
      <Modal visible={showTripEndModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🏁 Conclude Active Trip</Text>
            <Text style={styles.modalSub}>
              Confirm bus is parked safely at destination and all passengers have disembarked.
            </Text>

            <TextInput
              style={styles.modalTextInput}
              placeholder="Optional remarks (e.g., Safe campus arrival, on-time drop)..."
              placeholderTextColor="#94A3B8"
              value={tripRemarks}
              onChangeText={setTripRemarks}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowTripEndModal(false)}
                disabled={tripSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmEndTrip}
                disabled={tripSubmitting}
              >
                {tripSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>End Trip 🏁</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= LOG MAINTENANCE MODAL ================= */}
      <Modal visible={showMaintModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🔧 Report Vehicle Issue</Text>
            <Text style={styles.modalSub}>
              Log maintenance requirements for Bus {driverProfile.busNo}
            </Text>

            <Text style={styles.modalInfoLabel}>Issue Type:</Text>
            <View style={styles.shiftPickerRow}>
              {['Brakes/Tires', 'Engine/Fluid', 'Electrical', 'Body/Glass'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.shiftBtn, maintType === t && styles.shiftBtnActive]}
                  onPress={() => setMaintType(t)}
                >
                  <Text
                    style={[
                      styles.shiftBtnText,
                      maintType === t && styles.shiftBtnTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.modalTextInput, { height: 80 }]}
              placeholder="Describe vehicle defect, noise, or repair needed..."
              placeholderTextColor="#94A3B8"
              multiline
              value={maintDesc}
              onChangeText={setMaintDesc}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowMaintModal(false)}
                disabled={maintSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleReportMaintenance}
                disabled={maintSubmitting}
              >
                {maintSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 4. STUDENT PASSENGER TRANSIT PROFILE MODAL                     */}
      {/* ============================================================== */}
      <Modal
        visible={selectedPassengerProfile !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPassengerProfile(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 520 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                CAMPUS FLEET TRANSIT DOSSIER
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                {selectedPassengerProfile?.name}
              </Text>
              <View
                style={{
                  backgroundColor: selectedPassengerProfile?.boarded ? '#DCFCE7' : '#EFF6FF',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginTop: 6,
                }}
              >
                <Text
                  style={{
                    color: selectedPassengerProfile?.boarded ? '#15803D' : '#1D4ED8',
                    fontSize: 12,
                    fontWeight: '800',
                  }}
                >
                  {selectedPassengerProfile?.boarded ? '✓ BOARDED ON VEHICLE' : 'WAITING AT STOP'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Student Roll No:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedPassengerProfile?.rollNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Assigned Stop:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedPassengerProfile?.stop}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Assigned Vehicle:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.busNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Emergency Contact:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedPassengerProfile?.parentPhone}</Text>
                </View>
              </View>

              <View style={[styles.guidanceTipBox, { marginTop: 10 }]}>
                <Text style={styles.guidanceTipEmoji}>🚌</Text>
                <Text style={styles.guidanceTipText}>
                  Boarding updates sync with parent tracking notification feed in real-time.
                </Text>
              </View>
            </ScrollView>

            <View style={{ gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: selectedPassengerProfile?.boarded ? '#DC2626' : '#10B981', width: '100%' },
                ]}
                onPress={() => {
                  if (selectedPassengerProfile) {
                    toggleBoarding(selectedPassengerProfile.id);
                    setSelectedPassengerProfile((prev) => prev ? { ...prev, boarded: !prev.boarded } : null);
                  }
                }}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {selectedPassengerProfile?.boarded ? 'Unmark Boarding' : '✓ Mark as Boarded'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedPassengerProfile(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => {
                    if (selectedPassengerProfile?.parentPhone) {
                      Linking.openURL(`tel:${selectedPassengerProfile.parentPhone}`).catch(() => null);
                    }
                  }}
                >
                  <Text style={styles.modalConfirmBtnText}>📞 Call Parent</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 5. PRE-TRIP VEHICLE SAFETY INSPECTION REPORT MODAL             */}
      {/* ============================================================== */}
      <Modal
        visible={inspectionReportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectionReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 520 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                FLEET ROADWORTHINESS CERTIFICATION
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                Pre-Trip Safety Inspection
              </Text>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 }}>
                <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '800' }}>✓ CERTIFIED ROADWORTHY</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Vehicle Registration:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.busNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Inspected By (Driver):</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Certification Time:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{new Date().toLocaleTimeString()} (Today)</Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Inspection Checkpoint Audits</Text>
              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Pneumatic Brakes & Pressure: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Tire Tread & Inflation: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Engine Coolant & Lubricant: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Fire Extinguisher & Safety Equipment: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Emergency Exit Doors & Windows: Clear</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ GPS Telematics & Dash Cam: Active</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { marginTop: 14, width: '100%', backgroundColor: '#059669' }]}
              onPress={() => {
                setInspectionReportModalVisible(false);
                setMoreSection('menu');
              }}
            >
              <Text style={styles.modalConfirmBtnText}>Confirm & Log Inspection ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 6. DRIVER SALARY SLIP VOUCHER MODAL                            */}
      {/* ============================================================== */}
      <Modal
        visible={selectedSalarySlip !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSalarySlip(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 500 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                CAMPUS PAYROLL & HR DISBURSEMENT
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                {selectedSalarySlip?.month || 'Current Month'} {selectedSalarySlip?.year || ''} Payslip
              </Text>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 }}>
                <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '800' }}>
                  ✓ {selectedSalarySlip?.status || 'PAID & TRANSFERRED'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Driver Employee ID:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.driverId}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Designation:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>Campus Senior Fleet Driver</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#CBD5E1', marginVertical: 4 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Basic Salary:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>₹{selectedSalarySlip?.basicSalary?.toLocaleString() || '18,500'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Fleet Allowances:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>₹{selectedSalarySlip?.allowances?.toLocaleString() || '3,200'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Deductions (PF/ESI):</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>-₹{selectedSalarySlip?.deductions?.toLocaleString() || '1,100'}</Text>
                </View>
              </View>

              <View style={{ marginTop: 12, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A' }}>Net Take-Home Pay</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E3A8A' }}>
                    ₹{selectedSalarySlip?.netSalary?.toLocaleString() || '20,600'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { marginTop: 14, width: '100%', backgroundColor: '#1E3A8A' }]}
              onPress={() => setSelectedSalarySlip(null)}
            >
              <Text style={styles.modalConfirmBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= REPORT DEFECT / COMPLAINT MODAL ================= */}
      <Modal
        visible={showIssueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIssueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🛠️ Report Vehicle Defect</Text>
            <Text style={styles.modalSub}>
              Log defect ticket for Bus {driverProfile.busNo} ({driverProfile.route})
            </Text>

            <Text style={styles.modalInfoLabel}>Defect Category:</Text>
            <View style={styles.shiftPickerRow}>
              {['Brakes/Tires', 'Engine/Fluid', 'Electrical', 'AC/Doors'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.shiftBtn, issueType === cat && styles.shiftBtnActive]}
                  onPress={() => setIssueType(cat)}
                >
                  <Text
                    style={[
                      styles.shiftBtnText,
                      issueType === cat && styles.shiftBtnTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalInfoLabel}>Severity Priority:</Text>
            <View style={styles.shiftPickerRow}>
              {(['Low', 'Medium', 'High', 'Critical'] as const).map((pri) => (
                <TouchableOpacity
                  key={pri}
                  style={[
                    styles.shiftBtn,
                    issuePriority === pri && {
                      backgroundColor: pri === 'Critical' || pri === 'High' ? '#DC2626' : '#1E3A8A',
                      borderColor: pri === 'Critical' || pri === 'High' ? '#DC2626' : '#1E3A8A',
                    },
                  ]}
                  onPress={() => setIssuePriority(pri)}
                >
                  <Text
                    style={[
                      styles.shiftBtnText,
                      issuePriority === pri && styles.shiftBtnTextActive,
                    ]}
                  >
                    {pri}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.modalTextInput, { height: 80 }]}
              placeholder="Describe vehicle defect, noise, warning lights, or symptom..."
              placeholderTextColor="#94A3B8"
              multiline
              value={issueDescription}
              onChangeText={setIssueDescription}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowIssueModal(false)}
                disabled={issueSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateComplaint}
                disabled={issueSubmitting}
              >
                {issueSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Dispatch Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= COMPLAINT DISCUSSION & MESSAGING MODAL ================= */}
      <Modal visible={showDiscussionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '88%', padding: 16 }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 10, marginBottom: 10 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  💬 Resolution Discussion
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {selectedComplaintForChat?.complaintId} • {selectedComplaintForChat?.complaintType || selectedComplaintForChat?.category}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#475569' }}>
                    Bus: <Text style={{ fontWeight: '700' }}>{selectedComplaintForChat?.busNumber || selectedComplaintForChat?.vehicleNumber || driverProfile.busNo}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: '#CBD5E1' }}>•</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>
                    Status: <Text style={{ fontWeight: '800', color: selectedComplaintForChat?.status === 'Closed' ? '#64748B' : '#15803D' }}>{selectedComplaintForChat?.status || 'Active'}</Text>
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#F1F5F9', padding: 6, borderRadius: 6 }}
                  onPress={handleRefreshChat}
                  disabled={isRefreshingChat}
                >
                  {isRefreshingChat ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Text style={{ fontSize: 13 }}>🔄</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                  onPress={() => setShowDiscussionModal(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748B' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Closed Complaint Policy Banner */}
            {selectedComplaintForChat?.status === 'Closed' && (
              <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
                  🛡️ Complaint status is <Text style={{ fontWeight: '800' }}>Closed</Text>. Follow-up messages remain active for post-resolution tracking & audit follow-ups.
                </Text>
              </View>
            )}

            {/* Success Toast Banner */}
            {chatSuccessToast && (
              <View style={{ backgroundColor: '#ECFDF5', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857', textAlign: 'center' }}>
                  ✓ {chatSuccessToast}
                </Text>
              </View>
            )}

            {/* Discussion Message Bubbles */}
            <ScrollView style={{ flex: 1, minHeight: 200, marginBottom: 10 }} contentContainerStyle={{ paddingVertical: 4 }}>
              {chatReplies.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24, marginBottom: 6 }}>💬</Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                    No messages in this discussion yet. Post a question or update below.
                  </Text>
                </View>
              ) : (
                chatReplies.map((r, idx) => {
                  const isAdminRole = ['admin', 'staff', 'system admin', 'hod'].includes((r.role || '').toLowerCase());
                  const isDriverRole = (r.role || '').toLowerCase() === 'driver';

                  return (
                    <View
                      key={idx}
                      style={{
                        marginBottom: 10,
                        alignSelf: isDriverRole ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                          {r.sender || 'User'}
                        </Text>
                        <View
                          style={{
                            backgroundColor: isAdminRole ? '#EFF6FF' : isDriverRole ? '#DCFCE7' : '#F1F5F9',
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '800',
                              color: isAdminRole ? '#1D4ED8' : isDriverRole ? '#15803D' : '#64748B',
                            }}
                          >
                            {r.role || 'User'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 9, color: '#94A3B8' }}>
                          {r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor: isDriverRole ? '#1E3A8A' : '#F1F5F9',
                          padding: 10,
                          borderRadius: 10,
                          borderTopRightRadius: isDriverRole ? 2 : 10,
                          borderTopLeftRadius: isDriverRole ? 10 : 2,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: isDriverRole ? '#FFFFFF' : '#0F172A', lineHeight: 18 }}>
                          {r.message}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: '#0F172A',
                }}
                placeholder="Type update or resolution note..."
                placeholderTextColor="#94A3B8"
                value={chatInputText}
                onChangeText={setChatInputText}
                editable={!isSendingChat}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: isSendingChat || !chatInputText.trim() ? '#94A3B8' : '#2563EB',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleSendChatMessage}
                disabled={isSendingChat || !chatInputText.trim()}
              >
                {isSendingChat ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= AUTHORIZED ATTENDANCE CORRECTION MODAL ================= */}
      <Modal visible={showCorrectionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🛡️ Attendance Correction</Text>
            <Text style={styles.modalSub}>
              Authorized correction for {correctionTargetStudent?.name} ({correctionTargetStudent?.rollNo}).
            </Text>

            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoLabel}>Target Attendance Status:</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: correctionTargetStatus === 'Present' ? '#16A34A' : '#F1F5F9',
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setCorrectionTargetStatus('Present')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: correctionTargetStatus === 'Present' ? '#FFFFFF' : '#475569' }}>
                    ✓ Present (Boarded)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: correctionTargetStatus === 'Absent' ? '#DC2626' : '#F1F5F9',
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setCorrectionTargetStatus('Absent')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: correctionTargetStatus === 'Absent' ? '#FFFFFF' : '#475569' }}>
                    ✕ Absent
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalInfoLabel}>Correction Reason (Required for Audit Trail):</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 75 }]}
                placeholder="e.g. Student boarded at Stop A after roll check..."
                placeholderTextColor="#94A3B8"
                multiline
                value={correctionReasonText}
                onChangeText={setCorrectionReasonText}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCorrectionModal(false)}
                disabled={isSubmittingCorrection}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCorrection}
                disabled={isSubmittingCorrection || !correctionReasonText.trim()}
              >
                {isSubmittingCorrection ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Save Correction</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= DEDICATED STUDENT ATTENDANCE REPORT MODAL ================= */}
      <Modal visible={showAttendanceReportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { height: '82%', maxHeight: '90%', padding: 16 }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 10, marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  📊 Student Attendance Report
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Route: {activeRoute?.name || 'East'} ({activeRoute?.routeId || 'R-01'}) • Pickup Trip
                </Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                onPress={() => setShowAttendanceReportModal(false)}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={true}>
              {/* Summary KPI Cards */}
              {(() => {
                const totalStudents = passengers.length;
                const presentCount = passengers.filter((s) => getActiveStatus(s.rollNo || s.id) === 'Present').length;
                const absentCount = passengers.filter((s) => getActiveStatus(s.rollNo || s.id) === 'Absent').length;
                const pendingCount = Math.max(0, totalStudents - (presentCount + absentCount));

                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase' }}>Expected Total</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E3A8A', marginTop: 2 }}>{totalStudents}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#DCFCE7', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803D', textTransform: 'uppercase' }}>Present / Boarded</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#166534', marginTop: 2 }}>{presentCount}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#B91C1C', textTransform: 'uppercase' }}>Marked Absent</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#991B1B', marginTop: 2 }}>{absentCount}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>Pending Check-in</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#92400E', marginTop: 2 }}>{pendingCount}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Stop-wise Boarding Summary */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                📍 Stop-Wise Boarding Breakdown
              </Text>

              {(() => {
                const computedStops = uniqueStops.filter((s) => s !== 'All Stops').map((stopName) => {
                  const stopStudents = passengers.filter((p) => (p.stop || '').toLowerCase() === stopName.toLowerCase());
                  const boarded = stopStudents.filter((p) => getActiveStatus(p.rollNo || p.id) === 'Present').length;
                  const absent = stopStudents.filter((p) => getActiveStatus(p.rollNo || p.id) === 'Absent').length;
                  const pending = Math.max(0, stopStudents.length - boarded - absent);
                  return {
                    stopName,
                    expectedStudents: stopStudents.length,
                    boardedCount: boarded,
                    absentCount: absent,
                    pendingCount: pending,
                  };
                });
                const displayStops = computedStops.length > 0 ? computedStops : (attendanceReport?.stopBreakdown || []);

                return (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                    {displayStops.map((s: any, idx: number) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 8,
                          borderBottomWidth: idx < displayStops.length - 1 ? 1 : 0,
                          borderBottomColor: '#E2E8F0',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                            {idx + 1}. {s.stopName}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                            Absent: {s.absentCount} • Pending: {s.pendingCount}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: s.boardedCount > 0 ? '#15803D' : '#0F172A' }}>
                            {s.boardedCount} / {s.expectedStudents}
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Boarded</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })()}

              {/* Detailed Student Status List */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                👥 Passenger Status Manifest
              </Text>

              {passengers.map((p, idx) => {
                const status = getActiveStatus(p.rollNo || p.id);
                const rec = attendanceMap[p.rollNo || p.id];
                const isLocked = rec ? rec.isLocked : false;

                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        Roll: {p.rollNo} • Stop: {p.stop}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View
                        style={{
                          backgroundColor:
                            status === 'Present' ? '#DCFCE7' :
                            status === 'Absent' ? '#FEE2E2' : '#FEF3C7',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color:
                              status === 'Present' ? '#15803D' :
                              status === 'Absent' ? '#B91C1C' : '#B45309',
                          }}
                        >
                          {status.toUpperCase()}
                        </Text>
                      </View>
                      {isLocked && (
                        <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>🔒 Saved</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= DRIVER BOTTOM NAVIGATION ================= */}
      <BottomTabBar
        activeTab={activeNavTab}
        onTabChange={(t) => {
          if (t === 'profile') {
            setMoreSection('profile');
          }
          setActiveNavTab(t);
        }}
        notificationsCount={complaintTasks.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length + unreadNotifsCount}
        tabsList={['home', 'academics', 'referrals', 'notifications', 'profile']}
        tabLabels={{
          home: 'Home',
          academics: 'Transit',
          referrals: 'Referrals',
          notifications: 'Tasks',
          profile: 'Profile',
        }}
        tabIcons={{
          home: '🏠',
          academics: '🚌',
          referrals: '💼',
          notifications: '📋',
          profile: '👤',
        }}
      />

      {/* Real-Time Campus Notification Modal */}
      <MobileNotificationCenter
        user={user}
        isModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onUnreadCountChange={handleUnreadNotifsCountChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flexOne: {
    flex: 1,
  },
  // PROFILE / SERVICES TOGGLE
  profileToggleHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  profileToggleTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  profileToggleTabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  profileToggleTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  profileToggleTabTextActive: {
    color: '#FFFFFF',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  driverNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  driverSubText: {
    fontSize: 12,
    color: '#6B7280',
  },
  signOutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 30,
  },
  tripHeroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  tripHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripHeroBadge: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  tripHeroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  tripHeroSub: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 2,
  },
  vehicleSpeedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  vehicleSpeedText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  vehicleSpeedVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  activeTripMetaBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeTripMetaText: {
    color: '#BBF7D0',
    fontSize: 12,
    fontWeight: '600',
  },
  largeTripButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  largeTripButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  largeTripButtonSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSectionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
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
  stopGlanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stopGlanceCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stopGlanceCheckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stopGlanceInfo: {
    flex: 1,
  },
  stopGlanceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  stopGlanceMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stopGlanceStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCardBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  noticeGlanceItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noticeGlanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  noticeGlanceMsg: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  noticeGlanceDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  subTabSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: '#F8FAFC',
  },
  subTabButtonActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  subTabIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  subTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabLabelActive: {
    color: '#1D4ED8',
  },
  tripStatusDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tripStatusLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  tripStatusVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  checkpointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkpointBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkpointBoxText: {
    fontSize: 12,
    fontWeight: '800',
  },
  checkpointInfo: {
    flex: 1,
  },
  checkpointName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkpointMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkpointActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  checkpointActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeTimelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStopTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineStopMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timelineStopStudents: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  searchInput: {
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
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  passengerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerLeft: {
    flex: 1,
  },
  passengerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  boardingStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  boardingStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  passengerMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callParentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  callParentIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  callParentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  toggleBoardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  toggleBoardBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  smallActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  specItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specItemLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  specItemValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  maintItemCard: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  maintTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  maintTypeBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  maintStatusBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  maintDesc: {
    fontSize: 12,
    color: '#334155',
  },
  maintDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  profileSummaryCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileAvatarLargeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  profileSummaryInfo: {
    flex: 1,
  },
  profileSummaryName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  profileSummaryRole: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  profileSummaryMeta: {
    color: '#E2E8F0',
    fontSize: 11,
    marginTop: 2,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemIconText: {
    fontSize: 18,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  menuSignOutBtn: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  menuSignOutText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
  backNavRow: {
    marginBottom: 10,
  },
  backNavText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  checkboxCheck: {
    fontSize: 14,
    fontWeight: '900',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  saveChecklistBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveChecklistBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  payrollCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payrollHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  payrollMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  payrollStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payrollStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  payrollBreakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payrollCol: {
    alignItems: 'center',
  },
  payrollColLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  payrollColVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
  },
  attendanceActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  attActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  attActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  attLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  attLogDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attLogTimes: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  attLogBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attLogBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  safetyRuleRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  safetyRuleNumber: {
    width: 24,
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  safetyRuleText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  modalInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  modalInfoVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  shiftPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  shiftBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  shiftBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  shiftBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  shiftBtnTextActive: {
    color: '#FFFFFF',
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
    minWidth: 110,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
});
