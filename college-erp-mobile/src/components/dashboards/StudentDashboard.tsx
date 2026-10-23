import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
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
import HighlightCard from './HighlightCard';

type Props = {
  user: MobileUser;
  onLogout: () => void;
};

type AcademicsSubTab =
  | 'timetable'
  | 'exams'
  | 'attendance'
  | 'marks'
  | 'assignments'
  | 'hostel'
  | 'library'
  | 'placement'
  | 'fees'
  | 'leaves'
  | 'welfare';

type SubjectAttendance = {
  code: string;
  name: string;
  attended: number;
  conducted: number;
  pct: number;
  faculty: string;
  status: 'Safe' | 'Warning' | 'Shortage';
};

type PeriodItem = {
  period: number;
  time: string;
  subject: string;
  code: string;
  faculty: string;
  room: string;
};

type MarkItem = {
  code: string;
  subject: string;
  internal1: number;
  internal2: number;
  model: number;
  total?: number;
  grade: string;
  credits: number;
  gpa?: number;
  status?: string;
};

type AssignmentItem = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'Submitted' | 'Pending' | 'Evaluated';
  score?: string;
};

type LibraryBook = {
  id: string;
  title: string;
  author: string;
  dueDate: string;
  renewalsLeft: number;
  fine: number;
};

type PlacementDrive = {
  company: string;
  role: string;
  package: string;
  driveDate: string;
  status: 'Eligible' | 'Applied' | 'Selected';
};

type ExamItem = {
  id: string;
  subject: string;
  code: string;
  date: string;
  time: string;
  hall: string;
  type: string;
};

type LeaveRequest = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Approved' | 'Pending' | 'Rejected';
};

export default function StudentDashboard({ user, onLogout }: Props) {
  // Main 5 Fixed Bottom Tabs
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [academicsSubTab, setAcademicsSubTab] = useState<AcademicsSubTab>('timetable');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Student Profile Info
  const [profile, setProfile] = useState({
    name: user.name || 'Student Scholar',
    rollNo: user.userId || user.referenceId || 'N/A',
    dept: user.department || 'Academics',
    sem: 'Semester 1',
    section: 'A',
    email: user.email || '',
    phone: '',
    cgpa: 0,
    attendance: 0,
    pendingFees: 0,
    totalFees: 0,
    paidFees: 0,
    activeAssignments: 0,
    busNo: 'N/A',
    route: 'Day Scholar / Self Commuter',
    stopName: 'Campus Main Gate',
    pickupTime: 'N/A',
    dropTime: 'N/A',
    driverName: 'N/A',
    driverPhone: '',
    hostelBlock: 'Kaveri Boys Hostel (Block B)',
    hostelRoom: 'Room 204 (Bed 2)',
    wardenContact: '+91 98402 88990',
    advisorName: 'Class Advisor',
    advisorPhone: '+91 98402 11234',
  });

  const [activeDay, setActiveDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>('Monday');

  // Dynamic Data Lists
  const [attendanceList, setAttendanceList] = useState<SubjectAttendance[]>([]);
  const [marksList, setMarksList] = useState<MarkItem[]>([]);
  const [timetableMap, setTimetableMap] = useState<Record<string, PeriodItem[]>>({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  });
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<any[]>([]);
  const [feeReceipts, setFeeReceipts] = useState<any[]>([]);
  const [examsList, setExamsList] = useState<ExamItem[]>([]);
  const [leavesList, setLeavesList] = useState<LeaveRequest[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [placements, setPlacements] = useState<PlacementDrive[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  // Apply Leave Modal
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaveType, setLeaveType] = useState('Medical Leave');
  const [leaveDates, setLeaveDates] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Submit Assignment Modal
  const [submitAssignmentModalVisible, setSubmitAssignmentModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [submissionFileName, setSubmissionFileName] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Pay Fee Modal
  const [payFeeModalVisible, setPayFeeModalVisible] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payPaymentMode, setPayPaymentMode] = useState('Online Gateway');
  const [submittingFee, setSubmittingFee] = useState(false);

  // Support / Grievance Modal
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [grievanceCategory, setGrievanceCategory] = useState('Academic Issue');
  const [grievanceSubject, setGrievanceSubject] = useState('');
  const [grievanceDescription, setGrievanceDescription] = useState('');
  const [submittingGrievance, setSubmittingGrievance] = useState(false);

  // Real-time ERP Detail Modals
  const [selectedLibraryBook, setSelectedLibraryBook] = useState<LibraryBook | null>(null);
  const [selectedPlacementDrive, setSelectedPlacementDrive] = useState<PlacementDrive | null>(null);
  const [hostelDeskModalVisible, setHostelDeskModalVisible] = useState(false);
  const [feeReceiptModalVisible, setFeeReceiptModalVisible] = useState(false);
  const [latestFeeReceipt, setLatestFeeReceipt] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const studentId = user.referenceId || user.studentId || user.userId || '';

      // 1. Fetch Student Profile
      let studentRes: any = null;
      if (studentId) {
        studentRes = await apiGet<any>(`students/${encodeURIComponent(studentId)}`).catch(() => null);
      }

      if (!studentRes) {
        const allStudents = await apiGet<any[]>(`students`).catch(() => []);
        if (Array.isArray(allStudents) && allStudents.length > 0) {
          studentRes = allStudents.find((s: any) =>
            s.id === studentId ||
            s.rollNo === studentId ||
            s._id === studentId ||
            (user.name && s.name && s.name.toLowerCase() === user.name.toLowerCase())
          ) || allStudents[0];
        }
      }

      const resolvedStudentId = studentRes?.id || studentRes?.rollNo || studentId;
      const dept = studentRes?.dept || studentRes?.department || user.department || 'Academics';
      const sem = studentRes?.sem || studentRes?.semester || 'Semester 1';
      const sec = studentRes?.section || 'A';

      // 2. Fetch Modules Concurrently
      const [
        attendanceRes,
        marksRes,
        timetableRes,
        assignmentsRes,
        feesRes,
        receiptsRes,
        examsRes,
        notifRes,
        transportRes,
        libraryRes,
        placementsRes,
        leavesRes,
        advisorRes,
        periodsRes,
      ] = await Promise.all([
        resolvedStudentId ? apiGet<any[]>(`attendance/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        resolvedStudentId ? apiGet<any[]>(`marks/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        apiGet<any[]>(`timetable?department=${encodeURIComponent(dept)}&semester=${encodeURIComponent(sem)}&section=${encodeURIComponent(sec)}`).catch(() => []),
        apiGet<any[]>(`assignments`).catch(() => []),
        resolvedStudentId ? apiGet<any[]>(`fees/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        resolvedStudentId ? apiGet<any[]>(`fees/receipts/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        apiGet<any[]>(`exams`).catch(() => []),
        apiGet<any>(`notifications`).catch(() => []),
        apiGet<any[]>(`transport/routes`).catch(() => []),
        apiGet<any[]>(`library/transactions/my`).catch(() => []),
        apiGet<any[]>(`placement/jobs`).catch(() => []),
        resolvedStudentId ? apiGet<any[]>(`leaves/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => apiGet<any[]>(`leaves`).catch(() => [])) : [],
        apiGet<any>(`class-advisor/class/${encodeURIComponent(dept)}/${encodeURIComponent(sem)}/${encodeURIComponent(sec)}`).catch(() => null),
        apiGet<any[]>('period-master').catch(() => apiGet<any[]>('period-masters').catch(() => [])),
      ]);

      // 3. Process Attendance
      const rawAtt = Array.isArray(attendanceRes) ? attendanceRes : [];
      let overallAttendancePct = 0;
      const parsedSubjectsAttendance: SubjectAttendance[] = [];

      if (rawAtt.length > 0) {
        const subjectGroups: Record<string, { attended: number; conducted: number; name: string; faculty: string }> = {};

        rawAtt.forEach((record: any) => {
          const subKey = record.subjectCode || record.subject || record.subjectName || 'General Course';
          const subName = record.subjectName || record.subject || subKey;
          const facultyName = record.staffName || record.faculty || 'Faculty In-Charge';
          if (!subjectGroups[subKey]) {
            subjectGroups[subKey] = { attended: 0, conducted: 0, name: subName, faculty: facultyName };
          }
          subjectGroups[subKey].conducted += 1;
          const status = (record.status || '').toLowerCase();
          if (status === 'present' || status === 'p' || status === 'od') {
            subjectGroups[subKey].attended += 1;
          }
        });

        let totalAtt = 0;
        let totalCond = 0;

        Object.keys(subjectGroups).forEach((code) => {
          const item = subjectGroups[code];
          totalAtt += item.attended;
          totalCond += item.conducted;
          const pct = item.conducted > 0 ? Math.round((item.attended / item.conducted) * 100) : 0;
          parsedSubjectsAttendance.push({
            code: code,
            name: item.name,
            attended: item.attended,
            conducted: item.conducted,
            pct: pct,
            faculty: item.faculty,
            status: pct >= 85 ? 'Safe' : pct >= 75 ? 'Warning' : 'Shortage',
          });
        });

        overallAttendancePct = totalCond > 0 ? Math.round((totalAtt / totalCond) * 100) : 0;
      } else if (studentRes?.attendance) {
        const parsed = parseInt(String(studentRes.attendance).replace('%', '').trim());
        overallAttendancePct = isNaN(parsed) ? 0 : parsed;
      }
      setAttendanceList(parsedSubjectsAttendance);

      // 4. Process Marks
      const rawMarks = Array.isArray(marksRes) ? marksRes : [];
      const parsedMarks: MarkItem[] = rawMarks.map((m: any) => {
        const internal = Number(m.internalMarks !== undefined ? m.internalMarks : (m.internal1 || m.ia1 || 0));
        const model = Number(m.semesterMarks !== undefined ? m.semesterMarks : (m.modelExam || m.model || 0));
        const total = Number(m.totalMarks !== undefined ? m.totalMarks : (internal + model));
        return {
          code: m.subjectCode || m.code || (m.subject ? String(m.subject).slice(0, 4).toUpperCase() + '401' : 'SUB'),
          subject: m.subjectName || m.subject || 'Coursework',
          internal1: internal,
          internal2: Number(m.internal2 || m.ia2 || 0),
          model: model,
          total: total,
          grade: m.grade || (total >= 120 ? 'O' : total >= 105 ? 'A+' : total >= 90 ? 'A' : 'B+'),
          credits: Number(m.credits || 3),
          gpa: Number(m.gpa || (total > 0 ? (total / 15).toFixed(1) : 8.5)),
          status: m.arrearStatus || m.resultStatus || 'Clear',
        };
      });
      setMarksList(parsedMarks);

      // 5. Process Timetable (Weekly Monday-Saturday with Period Masters)
      const rawTimetable = Array.isArray(timetableRes) ? timetableRes : [];
      const rawPeriods = Array.isArray(periodsRes) ? periodsRes.filter((p: any) => p.isActive) : [];
      const sortedPeriods = [...rawPeriods].sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));

      const newMap: Record<string, PeriodItem[]> = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
      };

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      daysOfWeek.forEach((dayName) => {
        if (sortedPeriods.length > 0) {
          sortedPeriods.forEach((pm: any, idx: number) => {
            const slot = rawTimetable.find((t: any) => {
              const dayMatches = (t.day || '').toLowerCase() === dayName.toLowerCase();
              const periodMatches =
                t.periodId?._id === pm._id ||
                t.periodId === pm._id ||
                t.periodId?.periodName === pm.periodName ||
                t.period === pm.periodName ||
                String(t.period) === String(idx + 1);
              return dayMatches && periodMatches;
            });

            if (slot) {
              const subjectName = slot.subjectId?.subjectName || slot.subject || 'Coursework';
              const subjectCode = slot.subjectId?.subjectCode || slot.code || '';
              const facultyName = slot.facultyAllocationId?.staffId?.name || slot.staffName || slot.faculty || 'Faculty In-Charge';
              const rawRoom = slot.roomNo || slot.room || 'Classroom 201';
              const roomStr = typeof rawRoom === 'string' ? rawRoom.trim() : (rawRoom.roomNo || '201');

              newMap[dayName].push({
                period: idx + 1,
                time: pm.startTime && pm.endTime ? `${pm.startTime} - ${pm.endTime}` : (idx === 0 ? '08:45 - 09:40' : '09:40 - 10:35'),
                subject: subjectName,
                code: subjectCode,
                faculty: facultyName,
                room: roomStr.toLowerCase().includes('room') ? roomStr : `Room ${roomStr}`,
              });
            }
          });
        }
      });

      // Fallback if rawTimetable uses flat day entries
      daysOfWeek.forEach((dayName) => {
        if (newMap[dayName].length === 0) {
          rawTimetable.forEach((entry: any) => {
            const day = entry.day || entry.dayOfWeek;
            if (day && day.toLowerCase() === dayName.toLowerCase()) {
              const periods = Array.isArray(entry.periods) ? entry.periods : [entry];
              periods.forEach((p: any, idx: number) => {
                const sub = p.subjectId?.subjectName || p.subjectName || p.subject || 'Lecture Period';
                const cod = p.subjectId?.subjectCode || p.subjectCode || p.code || '';
                const fac = p.facultyAllocationId?.staffId?.name || p.facultyName || p.faculty || p.staffName || 'Faculty In-Charge';
                const rm = typeof p.roomNo === 'string' ? p.roomNo : (p.roomNo?.roomNo || p.roomNumber || p.room || 'Room 201');

                newMap[dayName].push({
                  period: p.period || idx + 1,
                  time: p.time || (idx === 0 ? '08:45 - 09:40' : idx === 1 ? '09:40 - 10:35' : idx === 2 ? '10:50 - 11:45' : '11:45 - 12:40'),
                  subject: sub,
                  code: cod,
                  faculty: fac,
                  room: rm.toLowerCase().includes('room') ? rm : `Room ${rm}`,
                });
              });
            }
          });
        }
      });

      setTimetableMap(newMap);

      // 6. Process Fees
      const rawFees = Array.isArray(feesRes) ? feesRes : [];
      let totalFeeAmt = 0;
      let paidFeeAmt = 0;
      let pendingFeeAmt = 0;
      const parsedFeeItems: any[] = [];
      const parsedReceipts: any[] = [];

      rawFees.forEach((f: any, idx: number) => {
        const normal = Number(f.finalFee || f.totalFees || f.amount || f.totalAmount || f.normalFee || 0);
        const paid = Number(f.paidAmount !== undefined ? f.paidAmount : (f.amountPaid || (f.status === 'Paid' ? normal : 0)));
        const pending = Number(f.pendingAmount !== undefined ? f.pendingAmount : (f.remainingFee !== undefined ? f.remainingFee : Math.max(0, normal - paid)));
        totalFeeAmt += normal;
        paidFeeAmt += paid;
        pendingFeeAmt += pending;

        parsedFeeItems.push({
          name: f.feeType || f.category || `Tuition & Academic Term Fee (${f.semester || sem})`,
          amount: normal,
          paid: paid,
          pending: pending,
          status: pending === 0 && normal > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'),
        });

        if (paid > 0 || f.receiptNo) {
          parsedReceipts.push({
            id: f._id || f.receiptNo || String(idx),
            receiptNo: f.receiptNo || `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
            amount: paid > 0 ? paid : normal,
            date: f.paymentDate ? new Date(f.paymentDate).toLocaleDateString('en-GB') : 'Recent',
            mode: f.paymentMode || 'Online Gateway',
            status: 'Paid',
          });
        }
      });

      if (rawFees.length === 0 && studentRes) {
        totalFeeAmt = Number(studentRes.finalFee || studentRes.totalFee || studentRes.totalAmount || 0);
        paidFeeAmt = Number(studentRes.paidAmount || studentRes.amountPaid || 0);
        pendingFeeAmt = Number(
          studentRes.balanceFee !== undefined
            ? studentRes.balanceFee
            : studentRes.remainingFee !== undefined
            ? studentRes.remainingFee
            : studentRes.pendingFees || Math.max(0, totalFeeAmt - paidFeeAmt)
        );
      }
      setFeeBreakdown(parsedFeeItems);
      setFeeReceipts(parsedReceipts);

      // Parse Leaves
      const rawLeaves = Array.isArray(leavesRes) ? leavesRes : [];
      if (rawLeaves.length > 0) {
        const parsedLeaves: LeaveRequest[] = rawLeaves.map((l: any) => ({
          id: l._id || l.id || String(Math.random()),
          type: l.type || l.leaveType || 'Leave Request',
          startDate: l.startDate || l.fromDate ? new Date(l.startDate || l.fromDate).toLocaleDateString('en-GB') : 'Recent',
          endDate: l.endDate || l.toDate ? new Date(l.endDate || l.toDate).toLocaleDateString('en-GB') : 'Recent',
          days: Number(l.days || l.totalDays || 1),
          reason: l.reason || l.description || 'Academic / Personal',
          status: l.status || 'Pending',
        }));
        setLeavesList(parsedLeaves);
      }

      // 7. Process Assignments
      const rawAssignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
      const parsedAssignments: AssignmentItem[] = rawAssignments.map((a: any) => ({
        id: a._id || a.id || String(Math.random()),
        title: a.title || 'Coursework Task',
        subject: a.subject || a.subjectName || 'Academics',
        dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB') : 'Upcoming',
        status: a.status || (a.isSubmitted ? 'Submitted' : 'Pending'),
        score: a.score || a.marksAwarded ? `${a.score || a.marksAwarded} Marks` : undefined,
      }));
      setAssignments(parsedAssignments);

      // 8. Process Exams
      const rawExams = Array.isArray(examsRes) ? examsRes : [];
      const parsedExams: ExamItem[] = rawExams.map((e: any) => ({
        id: e._id || e.id || String(Math.random()),
        subject: e.subjectName || e.subject || 'Examination',
        code: e.subjectCode || e.code || '',
        date: e.date ? new Date(e.date).toLocaleDateString('en-GB') : 'Upcoming',
        time: e.time || '10:00 AM - 01:00 PM',
        hall: e.hall || e.examHall || 'Main Exam Hall',
        type: e.type || e.examType || 'Semester Examination',
      }));
      setExamsList(parsedExams);

      // 9. Process Notifications
      const notifArray = Array.isArray(notifRes)
        ? notifRes
        : Array.isArray((notifRes as any)?.data)
        ? (notifRes as any).data
        : [];
      const parsedNotifs = notifArray.map((n: any) => ({
        id: n._id || n.id || String(Math.random()),
        tag: n.category || n.type || 'Notice',
        title: n.title || 'Campus Notice',
        date: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-GB') : 'Recent',
        text: n.message || n.description || n.text || '',
      }));
      setNotices(parsedNotifs);

      // 10. Process Transport
      const rawTransport = Array.isArray(transportRes) ? transportRes : [];
      let allocatedRoute: any = null;
      let hasBus = false;

      if (studentRes?.busRoute || studentRes?.busNumber || studentRes?.transportOpted) {
        hasBus = true;
        allocatedRoute = rawTransport.find((r: any) =>
          r.routeId === studentRes.busRoute ||
          r.name === studentRes.busRoute ||
          r.busNumber === studentRes.busNumber
        );
      }

      // 11. Process Library
      const rawLib = Array.isArray(libraryRes) ? libraryRes : [];
      const parsedBooks: LibraryBook[] = rawLib.map((b: any) => ({
        id: b.bookId || b._id || 'BK',
        title: b.title || b.bookTitle || 'Library Book',
        author: b.author || 'Author',
        dueDate: b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-GB') : 'Due soon',
        renewalsLeft: Number(b.renewalsLeft ?? 1),
        fine: Number(b.fine || 0),
      }));
      setLibraryBooks(parsedBooks);

      // 12. Process Placements
      const rawJobs = Array.isArray(placementsRes) ? placementsRes : [];
      const parsedJobs: PlacementDrive[] = rawJobs.map((j: any) => ({
        company: j.companyName || j.company || 'Corporate Partner',
        role: j.designation || j.role || 'Graduate Trainee',
        package: j.package || j.salary ? `${j.package || j.salary}` : 'Competitive',
        driveDate: j.driveDate ? new Date(j.driveDate).toLocaleDateString('en-GB') : 'Upcoming',
        status: j.isApplied ? 'Applied' : 'Eligible',
      }));
      setPlacements(parsedJobs);

      // 13. Update Profile State
      setProfile({
        name: studentRes?.name || user.name || 'Student Scholar',
        rollNo: resolvedStudentId || 'N/A',
        dept: dept,
        sem: sem,
        section: sec,
        email: studentRes?.email || user.email || '',
        phone: studentRes?.phone || studentRes?.mobile || '',
        cgpa: Number(studentRes?.cgpa || (parsedMarks.length > 0 ? (parsedMarks.reduce((a, b) => a + (b.gpa || 8.6), 0) / parsedMarks.length).toFixed(2) : 8.6)),
        attendance: overallAttendancePct > 0 ? overallAttendancePct : (studentRes?.attendance ? parseInt(String(studentRes.attendance).replace('%', '')) : 85),
        pendingFees: pendingFeeAmt,
        totalFees: totalFeeAmt,
        paidFees: paidFeeAmt,
        activeAssignments: parsedAssignments.filter((a) => a.status === 'Pending').length,
        busNo: hasBus ? (allocatedRoute?.vehicle || allocatedRoute?.busNumber || 'Assigned Bus') : 'N/A',
        route: hasBus ? (allocatedRoute?.name || studentRes.busRoute) : 'Day Scholar / Self Commuter',
        stopName: studentRes?.pickupPoint || (allocatedRoute?.points?.[0]?.name) || (hasBus ? 'Campus Main Stop' : 'Self Travel'),
        pickupTime: allocatedRoute?.points?.[0]?.time || (hasBus ? '07:45 AM' : 'N/A'),
        dropTime: hasBus ? '05:15 PM' : 'N/A',
        driverName: hasBus ? (allocatedRoute?.driver || 'Transport Desk') : 'N/A',
        driverPhone: hasBus ? (allocatedRoute?.driverPhone || '') : '',
        hostelBlock: studentRes?.hostelBlock || 'Kaveri Campus Block B',
        hostelRoom: studentRes?.hostelRoom || 'Room 204',
        wardenContact: '+91 98402 88990',
        advisorName: advisorRes?.staffName || advisorRes?.name || studentRes?.advisor || 'Class Advisor',
        advisorPhone: advisorRes?.phone || '+91 98402 11234',
      });
    } catch (err) {
      console.warn('Backend student load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplyLeave = async () => {
    if (!leaveDates.trim() || !leaveReason.trim()) {
      Alert.alert('Required Fields', 'Please enter dates and reason for leave.');
      return;
    }
    try {
      setLoading(true);
      await apiPost('staff-support', {
        requestType: 'Leave',
        staffName: profile.name,
        staffId: profile.rollNo,
        department: profile.dept,
        subject: `Student Leave Request (${leaveType})`,
        description: `Requested Dates: ${leaveDates} | Reason: ${leaveReason.trim()}`,
        priority: 'Medium',
      }).catch(() => null);

      const newReq: LeaveRequest = {
        id: `LV-${Date.now().toString().slice(-4)}`,
        type: leaveType,
        startDate: leaveDates,
        endDate: leaveDates,
        days: 1,
        reason: leaveReason,
        status: 'Pending',
      };
      setLeavesList([newReq, ...leavesList]);
      setLeaveModalVisible(false);
      setLeaveDates('');
      setLeaveReason('');
      Alert.alert('Leave Submitted Successfully', 'Your leave request has been submitted to your Class Advisor.');
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Leave request submitted.');
      setLeaveModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;
    if (!submissionFileName.trim()) {
      Alert.alert('File Required', 'Please enter your file name or solution reference (e.g. assignment_solution.pdf).');
      return;
    }
    try {
      setSubmittingAssignment(true);
      await apiPost(`assignments/${selectedAssignment.id}/submit`, {
        studentId: profile.rollNo,
        studentName: profile.name,
        department: profile.dept,
        fileName: submissionFileName.trim(),
      });

      setAssignments((prev) =>
        prev.map((a) => (a.id === selectedAssignment.id ? { ...a, status: 'Submitted' } : a))
      );
      setSubmitAssignmentModalVisible(false);
      setSelectedAssignment(null);
      setSubmissionFileName('');
      Alert.alert('Assignment Submitted 📝', 'Your assignment solution has been uploaded and submitted for faculty evaluation.');
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Assignment submitted.');
      setSubmitAssignmentModalVisible(false);
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handlePayFee = async () => {
    const amountNum = Number(payAmountInput);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    try {
      setSubmittingFee(true);
      const receiptNo = `REC-MOB-${Date.now().toString().slice(-6)}`;
      await apiPost('fees', {
        studentId: profile.rollNo,
        studentName: profile.name,
        department: profile.dept,
        semester: profile.sem,
        amount: amountNum,
        paidAmount: amountNum,
        paymentMode: payPaymentMode,
        receiptNo: receiptNo,
        status: 'Paid',
        feeType: 'Tuition & Academic Term Fee',
      });

      setProfile((prev) => ({
        ...prev,
        paidFees: prev.paidFees + amountNum,
        pendingFees: Math.max(0, prev.pendingFees - amountNum),
      }));

      setFeeReceipts((prev) => [
        {
          id: receiptNo,
          receiptNo: receiptNo,
          amount: amountNum,
          date: new Date().toLocaleDateString('en-GB'),
          mode: payPaymentMode,
          status: 'Paid',
        },
        ...prev,
      ]);

      setPayFeeModalVisible(false);
      setPayAmountInput('');
      setLatestFeeReceipt({
        id: receiptNo,
        receiptNo: receiptNo,
        amount: amountNum,
        date: new Date().toLocaleDateString('en-GB'),
        mode: payPaymentMode,
        status: 'Paid',
        studentName: profile.name,
        rollNo: profile.rollNo,
        dept: profile.dept,
        sem: profile.sem,
      });
      setFeeReceiptModalVisible(true);
      loadData();
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Could not process fee payment.');
    } finally {
      setSubmittingFee(false);
    }
  };

  // Android Hardware Back Button Handling
  useEffect(() => {
    const onBackPress = () => {
      if (leaveModalVisible) {
        setLeaveModalVisible(false);
        return true;
      }
      if (submitAssignmentModalVisible) {
        setSubmitAssignmentModalVisible(false);
        return true;
      }
      if (payFeeModalVisible) {
        setPayFeeModalVisible(false);
        return true;
      }
      if (supportModalVisible) {
        setSupportModalVisible(false);
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
  }, [activeTab, leaveModalVisible, submitAssignmentModalVisible, payFeeModalVisible, supportModalVisible]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  const todayClasses = timetableMap[todayName] || [];

  return (
    <View style={styles.container}>
      {/* ============================================================== */}
      {/* 1. TOP HEADER WITH BACK NAVIGATION & LOGOUT                    */}
      {/* ============================================================== */}
      <ScreenHeader
        showBack={activeTab !== 'home'}
        onBack={() => setActiveTab('home')}
        title={
          activeTab === 'academics'
            ? `Academics: ${academicsSubTab.charAt(0).toUpperCase() + academicsSubTab.slice(1)}`
            : activeTab === 'referrals'
            ? 'Business Referrals'
            : activeTab === 'notifications'
            ? 'Alerts & Notices'
            : activeTab === 'profile'
            ? 'Student Profile'
            : 'Student Dashboard'
        }
        subtitle={
          activeTab === 'home'
            ? `${profile.dept} • ${profile.sem}`
            : activeTab === 'academics'
            ? 'Course Schedule & Academic Records'
            : undefined
        }
        userName={profile.name}
        roleBadge="STUDENT"
        avatarText={profile.name.substring(0, 2).toUpperCase()}
        userSubtitle={`${profile.dept} • ${profile.sem}`}
        onProfilePress={() => setActiveTab('profile')}
        onLogoutPress={onLogout}
      />

      {/* ============================================================== */}
      {/* 2. BODY CONTENT (BASED ON FIXED BOTTOM TAB)                     */}
      {/* ============================================================== */}
      <View style={styles.bodyWrapper}>
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          >
            {/* 1. Visual Hero Banner with High Quality Collegiate Image */}
            <DashboardHeroBanner
              greeting={`Hello, ${profile.name.split(' ')[0]} 👋`}
              subtitle="Keep learning, keep growing!"
              image={require('../../../assets/images/dashboards/student_hero.jpg')}
              tagline="Your Future Starts Here"
            />

            {/* 2. 2x2 Quick Access Feature Cards (Matching Reference Design) */}
            <QuickAccessGrid
              title="Quick Access"
              seeAllText="All Modules →"
              onSeeAll={() => setActiveTab('academics')}
              items={[
                {
                  id: 'academics',
                  label: 'Academics',
                  icon: '🎓',
                  bg: '#EFF6FF',
                  borderColor: '#DBEAFE',
                  textColor: '#1E40AF',
                  onPress: () => {
                    setActiveTab('academics');
                    setAcademicsSubTab('timetable');
                  },
                },
                {
                  id: 'attendance',
                  label: 'Attendance',
                  icon: '📅',
                  bg: '#ECFDF5',
                  borderColor: '#D1FAE5',
                  textColor: '#065F46',
                  badge: `${profile.attendance}%`,
                  onPress: () => {
                    setActiveTab('academics');
                    setAcademicsSubTab('attendance');
                  },
                },
                {
                  id: 'assignments',
                  label: 'Assignments',
                  icon: '📚',
                  bg: '#F5F3FF',
                  borderColor: '#EDE9FE',
                  textColor: '#5B21B6',
                  badge: assignments.filter((a) => a.status === 'Pending').length > 0 ? `${assignments.filter((a) => a.status === 'Pending').length} Due` : undefined,
                  onPress: () => {
                    setActiveTab('academics');
                    setAcademicsSubTab('assignments');
                  },
                },
                {
                  id: 'referrals',
                  label: 'Business Referrals',
                  icon: '💼',
                  bg: '#FFFBEB',
                  borderColor: '#FEF3C7',
                  textColor: '#92400E',
                  onPress: () => setActiveTab('referrals'),
                },
              ]}
            />

            {/* 3. Upcoming Classes Highlight Card (Matching Reference Design) */}
            <HighlightCard
              sectionTitle="Upcoming Classes"
              actionText="View Timetable →"
              onActionPress={() => {
                setActiveTab('academics');
                setAcademicsSubTab('timetable');
              }}
              icon="📅"
              iconBg="#EFF6FF"
              title={todayClasses[0]?.subject || (todayName === 'Sunday' || todayName === 'Saturday' ? 'Weekend Holiday' : 'Course Lectures Today')}
              subtitle={todayClasses[0] ? `${todayClasses[0].time} • Room ${todayClasses[0].room}` : `No more classes scheduled for ${todayName}`}
              badgeText={todayClasses.length > 0 ? `${todayClasses.length} Scheduled` : 'Free'}
              badgeBg={todayClasses.length > 0 ? '#DCFCE7' : '#F1F5F9'}
              badgeTextColor={todayClasses.length > 0 ? '#15803D' : '#64748B'}
              onPress={() => {
                setActiveTab('academics');
                setAcademicsSubTab('timetable');
              }}
            />

            {/* Attendance Standing & 75% Cutoff Progress */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardHeaderTitle}>📊 Attendance Standing</Text>
                  <Text style={styles.sectionSubtitle}>Mandatory 75% university eligibility requirement</Text>
                </View>
                <TouchableOpacity onPress={() => { setActiveTab('academics'); setAcademicsSubTab('attendance'); }} activeOpacity={0.7}>
                  <Text style={styles.cardHeaderLink}>Details →</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: profile.attendance >= 75 ? '#15803D' : '#DC2626' }}>
                    {profile.attendance}%
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {profile.attendance >= 75 ? 'Safe standing (Regular attendance)' : 'Shortage alert! Attend classes to avoid condonation'}
                  </Text>
                  {/* Progress bar */}
                  <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(profile.attendance, 100)}%`, height: '100%', backgroundColor: profile.attendance >= 75 ? '#16A34A' : '#DC2626', borderRadius: 4 }} />
                  </View>
                </View>
                <View style={{ backgroundColor: profile.attendance >= 75 ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: profile.attendance >= 75 ? '#15803D' : '#B91C1C' }}>
                    {profile.attendance >= 75 ? '✓ Safe' : '⚠️ Shortage'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Upcoming Assignments & Academic Deadlines */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardHeaderTitle}>📝 Assignments & Academic Deadlines</Text>
                  <Text style={styles.sectionSubtitle}>Upcoming coursework and project reviews</Text>
                </View>
                <TouchableOpacity onPress={() => { setActiveTab('academics'); setAcademicsSubTab('assignments'); }} activeOpacity={0.7}>
                  <Text style={styles.cardHeaderLink}>View All ({assignments.length}) →</Text>
                </TouchableOpacity>
              </View>

              {assignments.filter((a) => a.status === 'Pending').length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700', marginBottom: 2 }}>
                    ✓ All Caught Up!
                  </Text>
                  <Text style={styles.emptyStateText}>No pending assignments due currently.</Text>
                </View>
              ) : (
                assignments
                  .filter((a) => a.status === 'Pending')
                  .slice(0, 2)
                  .map((a) => (
                    <View key={a.id} style={styles.miniAssignmentCard}>
                      <Text style={styles.miniAssignmentTitle}>{a.title}</Text>
                      <View style={styles.miniAssignmentRow}>
                        <Text style={styles.miniAssignmentSubject}>{a.subject}</Text>
                        <Text style={styles.miniAssignmentDue}>Due: {a.dueDate}</Text>
                      </View>
                    </View>
                  ))
              )}
            </View>

            {/* Important Campus Announcements */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardHeaderTitle}>🔔 Campus Announcements</Text>
                  <Text style={styles.sectionSubtitle}>Circulars from Dean and Academic Office</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('notifications')} activeOpacity={0.7}>
                  <Text style={styles.cardHeaderLink}>All Notices →</Text>
                </TouchableOpacity>
              </View>

              {notices.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Text style={styles.emptyStateText}>No campus notices posted currently.</Text>
                </View>
              ) : (
                notices.slice(0, 2).map((n) => (
                  <View key={n.id} style={styles.noticeMiniCard}>
                    <View style={styles.noticeHeaderRow}>
                      <Text style={styles.noticeTag}>{n.tag}</Text>
                      <Text style={styles.noticeDate}>{n.date}</Text>
                    </View>
                    <Text style={styles.noticeTitle}>{n.title}</Text>
                    <Text style={styles.noticeBody} numberOfLines={2}>{n.text}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Dedicated Business Referral Program (Letters Fully Visible) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.cardHeaderTitle} numberOfLines={1}>💼 Business Referral Program</Text>
                  <Text style={styles.sectionSubtitle} numberOfLines={2}>
                    Earn institutional fee discounts and rewards across 4 commercial categories
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('referrals')} activeOpacity={0.7} style={{ flexShrink: 0 }}>
                  <Text style={styles.cardHeaderLink}>Open Hub →</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginTop: 4 }}>
                {[
                  { id: 'cards', title: 'Credit Cards', desc: 'Pre-approved lifetime-free cards with instant cashback rewards', icon: '💳', bg: '#EFF6FF', badge: 'Up to ₹2,500' },
                  { id: 'insurance', title: 'Insurance Policies', desc: 'Comprehensive health, motor & life insurance policies', icon: '🛡️', bg: '#ECFDF5', badge: 'Up to ₹5,000' },
                  { id: 'jobs', title: 'Job Openings', desc: 'Refer engineering & management candidates for campus recruitment', icon: '💼', bg: '#F5F3FF', badge: 'Placement Bonus' },
                  { id: 'banking', title: 'Bank Accounts', desc: 'Zero-balance digital savings accounts & student premium debit cards', icon: '🏛️', bg: '#FFFBEB', badge: 'Up to ₹750' },
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
                    onPress={() => setActiveTab('referrals')}
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

        {/* TAB 2: ACADEMICS */}
        {activeTab === 'academics' && (
          <View style={{ flex: 1 }}>
            {/* Contextual Page Header Banner */}
            <View style={styles.pageHeaderBanner}>
              <Text style={styles.pageHeaderTitle}>Academic Workspace</Text>
              <Text style={styles.pageHeaderDesc}>
                Review your weekly lecture timetable, subject attendance %, exam marks, and coursework tasks.
              </Text>
            </View>

            {/* Segment Sub-tabs */}
            <View style={styles.subTabBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabBarScroll}>
                {[
                  { id: 'timetable', label: 'Class Timetable', icon: '⏰' },
                  { id: 'exams', label: 'Exam Timetable', icon: '🎯' },
                  { id: 'attendance', label: 'My Attendance', icon: '📊' },
                  { id: 'marks', label: 'Semester Marks', icon: '🎓' },
                  { id: 'assignments', label: 'Assignments', icon: '📚' },
                  { id: 'hostel', label: 'Hostel Allocation', icon: '🏠' },
                  { id: 'library', label: 'Library', icon: '📖' },
                  { id: 'placement', label: 'Placements', icon: '💼' },
                  { id: 'fees', label: 'Fee Status', icon: '💳' },
                  { id: 'leaves', label: 'Leave Requests', icon: '📄' },
                  { id: 'welfare', label: 'Support Center', icon: '🛡️' },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.subTabBtn, academicsSubTab === st.id && styles.subTabBtnActive]}
                    onPress={() => setAcademicsSubTab(st.id as AcademicsSubTab)}
                  >
                    <Text style={[styles.subTabBtnText, academicsSubTab === st.id && styles.subTabBtnTextActive]}>
                      {st.icon} {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* ACADEMICS: TIMETABLE */}
              {academicsSubTab === 'timetable' && (
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>⏰ Weekly Class Timetable</Text>
                  <Text style={styles.sectionSubtitle}>
                    Select any day below to see your periods, subjects, teachers, and classroom numbers.
                  </Text>

                  {/* Day Pills */}
                  <View style={styles.dayPillsRow}>
                    {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const).map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayPill, activeDay === day && styles.dayPillActive]}
                        onPress={() => setActiveDay(day)}
                      >
                        <Text style={[styles.dayPillText, activeDay === day && styles.dayPillTextActive]}>
                          {day.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Showing schedule for <Text style={{ fontWeight: '800' }}>{activeDay}</Text>. Look for the Room number to find your lecture hall.
                    </Text>
                  </View>

                  <Text style={styles.dayHeading}>{activeDay} Teaching Schedule</Text>

                  {(timetableMap[activeDay] || []).length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>No scheduled classes for {activeDay}.</Text>
                    </View>
                  ) : (
                    (timetableMap[activeDay] || []).map((p, idx) => (
                      <View key={idx} style={styles.timelineRow}>
                        <View style={styles.periodBadge}>
                          <Text style={styles.periodBadgeNum}>P{p.period}</Text>
                          <Text style={styles.periodBadgeTime}>{p.time.split(' - ')[0]}</Text>
                        </View>
                        <View style={styles.periodInfo}>
                          <Text style={styles.periodSubject}>{p.subject}</Text>
                          <Text style={styles.periodMeta}>
                            {p.code ? `${p.code} • ` : ''}{p.faculty} • <Text style={{ color: '#2563EB', fontWeight: '700' }}>Room {p.room}</Text>
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* ACADEMICS: ATTENDANCE */}
              {academicsSubTab === 'attendance' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      University rules require at least 75% attendance in each subject to sit for semester examinations.
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📊 Attendance Gauge Summary</Text>
                    <View style={styles.attendanceGaugeBox}>
                      <View style={styles.gaugeRow}>
                        <Text style={styles.gaugeLabel}>Cumulative Attendance</Text>
                        <Text style={styles.gaugeValue}>{profile.attendance}%</Text>
                      </View>
                      <View style={styles.gaugeTrack}>
                        <View
                          style={[
                            styles.gaugeFill,
                            {
                              width: `${Math.min(profile.attendance, 100)}%`,
                              backgroundColor: profile.attendance >= 75 ? '#10B981' : '#EF4444',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.gaugeHint}>
                        {profile.attendance >= 75
                          ? '✓ Safe: You meet the university eligibility threshold.'
                          : '⚠️ Shortage: Attendance below 75%. Meet your class advisor.'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📚 Subject-wise Attendance Breakdown</Text>
                    {attendanceList.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>No subject attendance records found for this term.</Text>
                      </View>
                    ) : (
                      attendanceList.map((sub, idx) => (
                        <View key={idx} style={styles.subjectItem}>
                          <View style={styles.subjectHeader}>
                            <Text style={styles.subjectCode}>{sub.code}</Text>
                            <View
                              style={[
                                styles.statusPill,
                                {
                                  backgroundColor:
                                    sub.pct >= 85 ? '#ECFDF5' : sub.pct >= 75 ? '#FEF3C7' : '#FEF2F2',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  {
                                    color:
                                      sub.pct >= 85 ? '#059669' : sub.pct >= 75 ? '#D97706' : '#DC2626',
                                  },
                                ]}
                              >
                                {sub.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.subjectName}>{sub.name}</Text>
                          <View style={styles.subStatsRow}>
                            <Text style={styles.subStatsText}>Attended: <Text style={{ fontWeight: '700' }}>{sub.attended}/{sub.conducted}</Text> hrs</Text>
                            <Text style={[styles.subStatsPercent, { color: sub.pct >= 75 ? '#059669' : '#DC2626' }]}>
                              {sub.pct}%
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* ACADEMICS: MARKS */}
              {academicsSubTab === 'marks' && (
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderTitle}>🎓 Semester Marks & GPA</Text>
                    <View style={styles.cgpaBadge}>
                      <Text style={styles.cgpaBadgeText}>CGPA: {profile.cgpa}</Text>
                    </View>
                  </View>

                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Internal Assessments are scored out of 50 each, and Model Exams out of 100.
                    </Text>
                  </View>

                  {marksList.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>Examination results have not been published yet.</Text>
                    </View>
                  ) : (
                    marksList.map((m, idx) => (
                      <View key={idx} style={styles.markCardItem}>
                        <View style={styles.markTopRow}>
                          <Text style={styles.markSubjectCode}>{m.code}</Text>
                          <View style={styles.gradeCircle}>
                            <Text style={styles.gradeCircleText}>{m.grade}</Text>
                          </View>
                        </View>
                        <Text style={styles.markSubjectName}>{m.subject}</Text>
                        <View style={styles.markScoresGrid}>
                          <View style={styles.markScoreCol}>
                            <Text style={styles.markScoreLabel}>Internal Marks</Text>
                            <Text style={styles.markScoreVal}>{m.internal1}</Text>
                          </View>
                          <View style={styles.markScoreCol}>
                            <Text style={styles.markScoreLabel}>Semester Exam</Text>
                            <Text style={styles.markScoreVal}>{m.model}</Text>
                          </View>
                          <View style={styles.markScoreCol}>
                            <Text style={styles.markScoreLabel}>Total Score</Text>
                            <Text style={styles.markScoreVal}>{m.total || (m.internal1 + m.model)}</Text>
                          </View>
                          <View style={styles.markScoreCol}>
                            <Text style={styles.markScoreLabel}>GPA</Text>
                            <Text style={[styles.markScoreVal, { color: '#2563EB', fontWeight: '800' }]}>{m.gpa || 8.5}</Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* ACADEMICS: ASSIGNMENTS */}
              {academicsSubTab === 'assignments' && (
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>📚 Coursework & Submissions</Text>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Submit completed homework and lab assignments before the due date to ensure prompt evaluation.
                    </Text>
                  </View>
                  {assignments.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>No assignments currently assigned.</Text>
                    </View>
                  ) : (
                    assignments.map((a) => (
                      <View key={a.id} style={styles.assignmentCard}>
                        <View style={styles.assignmentHeader}>
                          <Text style={styles.assignmentSubject}>{a.subject}</Text>
                          <View
                            style={[
                              styles.statusPill,
                              {
                                backgroundColor:
                                  a.status === 'Submitted' ? '#ECFDF5' : a.status === 'Evaluated' ? '#EFF6FF' : '#FEF3C7',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                {
                                  color:
                                    a.status === 'Submitted' ? '#059669' : a.status === 'Evaluated' ? '#2563EB' : '#D97706',
                                },
                              ]}
                            >
                              {a.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.assignmentTitle}>{a.title}</Text>
                        <View style={styles.assignmentFooter}>
                          <Text style={styles.dueDateText}>Due: {a.dueDate}</Text>
                          {a.score && <Text style={styles.scoreText}>Score: {a.score}</Text>}
                        </View>
                        {a.status === 'Pending' && (
                          <TouchableOpacity
                            style={[styles.applyLeavePill, { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#1E3A8A' }]}
                            onPress={() => {
                              setSelectedAssignment(a);
                              setSubmissionFileName(`${a.subject.replace(/\s+/g, '_')}_solution.pdf`);
                              setSubmitAssignmentModalVisible(true);
                            }}
                          >
                            <Text style={styles.applyLeavePillText}>📤 Submit Solution</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* ACADEMICS: EXAMS */}
              {academicsSubTab === 'exams' && (
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>🎯 Examination Schedule & Hall</Text>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Arrive at your allocated examination hall 15 minutes prior to the start time with your student ID badge.
                    </Text>
                  </View>
                  {examsList.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>No upcoming examination schedule published yet.</Text>
                    </View>
                  ) : (
                    examsList.map((e) => (
                      <View key={e.id} style={styles.assignmentCard}>
                        <View style={styles.assignmentHeader}>
                          <Text style={styles.assignmentSubject}>{e.code || 'EXAM'}</Text>
                          <View style={[styles.statusPill, { backgroundColor: '#EFF6FF' }]}>
                            <Text style={[styles.statusPillText, { color: '#2563EB' }]}>{e.type}</Text>
                          </View>
                        </View>
                        <Text style={styles.assignmentTitle}>{e.subject}</Text>
                        <View style={styles.assignmentFooter}>
                          <Text style={styles.dueDateText}>Date: {e.date}</Text>
                          <Text style={styles.scoreText}>Hall: {e.hall}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* ACADEMICS: HOSTEL */}
              {academicsSubTab === 'hostel' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Hostel premises close at 8:30 PM sharp. For night out-passes or weekend leaves, submit an application 24 hours in advance.
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🏠 Hostel Room Allocation</Text>
                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Allocated Hostel Block</Text>
                      <Text style={styles.profileFieldValue}>{profile.hostelBlock}</Text>
                    </View>
                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Room Number & Bed</Text>
                      <Text style={styles.profileFieldValue}>{profile.hostelRoom}</Text>
                    </View>
                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Resident Warden</Text>
                      <Text style={[styles.profileFieldValue, { color: '#2563EB' }]}>Prof. S. Narayanan</Text>
                    </View>
                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Warden Phone</Text>
                      <Text style={styles.profileFieldValue}>{profile.wardenContact}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={() => setHostelDeskModalVisible(true)}
                    >
                      <Text style={styles.primaryBtnText}>🏢 View Hostel & Warden Services Desk</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🕒 Gate & Mess Timings</Text>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Breakfast</Text>
                      <Text style={styles.specValue}>07:15 AM - 08:30 AM</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Lunch</Text>
                      <Text style={styles.specValue}>12:30 PM - 02:00 PM</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Dinner</Text>
                      <Text style={styles.specValue}>07:30 PM - 09:00 PM</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Evening Gate Curfew</Text>
                      <Text style={[styles.specValue, { color: '#DC2626' }]}>08:30 PM Sharp</Text>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🛠️ Hostel Maintenance & Complaints</Text>
                    <Text style={styles.sectionSubtitle}>
                      Report plumbing, electrical, carpentry, or cleanliness issues directly to the hostel estate supervisor.
                    </Text>
                    <TouchableOpacity
                      style={styles.supportTileBtn}
                      onPress={() => setHostelDeskModalVisible(true)}
                    >
                      <Text style={styles.supportTileBtnText}>+ Log Room Maintenance Ticket</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ACADEMICS: LIBRARY */}
              {academicsSubTab === 'library' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Books can be borrowed for 14 days and renewed once online before the due date. Overdue fine: ₹2/day.
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardHeaderTitle}>📖 Digital Library Pass</Text>
                      <View style={[styles.statusPill, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={[styles.statusPillText, { color: '#059669' }]}>Active Member</Text>
                      </View>
                    </View>
                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Membership Card ID</Text>
                      <Text style={styles.profileFieldValue}>LIB-{profile.rollNo}</Text>
                    </View>
                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Borrowing Quota</Text>
                      <Text style={styles.profileFieldValue}>{libraryBooks.length} / 4 Books</Text>
                    </View>
                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Outstanding Fines</Text>
                      <Text style={[styles.profileFieldValue, { color: '#059669' }]}>₹0 (Zero Dues)</Text>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📚 Borrowed Books in Circulation</Text>
                    {libraryBooks.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>No active library books borrowed currently.</Text>
                      </View>
                    ) : (
                      libraryBooks.map((b) => (
                        <View key={b.id} style={styles.markCardItem}>
                          <View style={styles.markTopRow}>
                            <Text style={styles.markSubjectCode}>{b.id}</Text>
                            <View style={[styles.statusPill, { backgroundColor: '#EFF6FF' }]}>
                              <Text style={[styles.statusPillText, { color: '#2563EB' }]}>Due: {b.dueDate}</Text>
                            </View>
                          </View>
                          <Text style={styles.markSubjectName}>{b.title}</Text>
                          <Text style={styles.sectionSubtitle}>Author: {b.author}</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>Renewals Left: {b.renewalsLeft}</Text>
                            <TouchableOpacity
                              style={styles.applyLeavePill}
                              onPress={() => setSelectedLibraryBook(b)}
                            >
                              <Text style={styles.applyLeavePillText}>Renew Online</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* ACADEMICS: PLACEMENT */}
              {academicsSubTab === 'placement' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Maintain minimum 60% aggregate without standing arrears to remain eligible for top campus recruitment drives.
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardHeaderTitle}>💼 Campus Placement Drives</Text>
                      <View style={[styles.statusPill, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.statusPillText, { color: '#2563EB' }]}>
                          {placements.length} Drives Active
                        </Text>
                      </View>
                    </View>

                    {placements.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>No campus placement drives announced yet.</Text>
                      </View>
                    ) : (
                      placements.map((p, idx) => (
                        <View key={idx} style={styles.markCardItem}>
                          <View style={styles.markTopRow}>
                            <Text style={styles.markSubjectCode}>{p.company}</Text>
                            <View style={[styles.statusPill, { backgroundColor: p.status === 'Applied' ? '#ECFDF5' : '#EFF6FF' }]}>
                              <Text style={[styles.statusPillText, { color: p.status === 'Applied' ? '#059669' : '#2563EB' }]}>
                                {p.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.markSubjectName}>{p.role}</Text>
                          <Text style={[styles.sectionSubtitle, { color: '#059669', fontWeight: '700' }]}>
                            Package: {p.package}
                          </Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>Drive Date: {p.driveDate}</Text>
                            {p.status !== 'Applied' && (
                              <TouchableOpacity
                                style={styles.applyLeavePill}
                                onPress={() => setSelectedPlacementDrive(p)}
                              >
                                <Text style={styles.applyLeavePillText}>Apply for Drive</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📈 Training & Mock Interview Schedule</Text>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Aptitude & Reasoning</Text>
                      <Text style={styles.specValue}>Tuesdays & Thursdays, 4:30 PM</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Coding & System Design</Text>
                      <Text style={styles.specValue}>Saturdays, 10:00 AM</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>HR & Mock Interviews</Text>
                      <Text style={styles.specValue}>By Appointment</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ACADEMICS: FEES */}
              {academicsSubTab === 'fees' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Tuition and semester fees can be paid seamlessly via UPI, Net Banking, or Credit/Debit Card with instant automated receipts.
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardHeaderTitle}>💳 Semester Fee Status</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: profile.pendingFees > 0 ? '#FEF2F2' : '#ECFDF5' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: profile.pendingFees > 0 ? '#DC2626' : '#059669' },
                          ]}
                        >
                          {profile.pendingFees > 0 ? 'Dues Outstanding' : 'All Cleared'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.feeBalanceBox}>
                      <Text style={styles.feeBalanceLabel}>Outstanding Balance</Text>
                      <Text style={styles.feeBalanceValue}>₹{profile.pendingFees.toLocaleString()}</Text>
                      <Text style={styles.feeBalanceSub}>
                        Total Term Fee: ₹{profile.totalFees.toLocaleString()} • Paid: ₹{profile.paidFees.toLocaleString()}
                      </Text>
                    </View>

                    {profile.pendingFees > 0 ? (
                      <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => {
                          setPayAmountInput(String(profile.pendingFees));
                          setPayFeeModalVisible(true);
                        }}
                      >
                        <Text style={styles.primaryBtnText}>Pay Pending Fees Online (₹{profile.pendingFees.toLocaleString()})</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.emptyStateBox, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700' }}>
                          ✓ No Pending Term Fees. Thank you!
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Fee Breakdown */}
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📋 Fee Heads Breakdown</Text>
                    {feeBreakdown.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Standard semester tuition fee applies.</Text>
                      </View>
                    ) : (
                      feeBreakdown.map((f, idx) => (
                        <View key={idx} style={styles.specRow}>
                          <View>
                            <Text style={styles.specLabel}>{f.name}</Text>
                            <Text style={{ fontSize: 10, color: '#64748B' }}>Status: {f.status}</Text>
                          </View>
                          <Text style={styles.specValue}>₹{Number(f.amount || 0).toLocaleString()}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Official Fee Receipts */}
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🧾 Payment Receipts History</Text>
                    {feeReceipts.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>No payment transaction receipts recorded yet.</Text>
                      </View>
                    ) : (
                      feeReceipts.map((r) => (
                        <TouchableOpacity
                          key={r.id}
                          style={styles.leaveHistoryItem}
                          onPress={() => {
                            setLatestFeeReceipt({
                              ...r,
                              studentName: profile.name,
                              rollNo: profile.rollNo,
                              dept: profile.dept,
                              sem: profile.sem,
                            });
                            setFeeReceiptModalVisible(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.leaveHistoryType}>Receipt #{r.receiptNo}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>
                              ₹{r.amount.toLocaleString()}
                            </Text>
                          </View>
                          <Text style={styles.leaveHistoryReason}>Date: {r.date} • Mode: {r.mode}</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={[styles.statusPillText, { color: '#059669' }]}>Status: {r.status}</Text>
                            <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700' }}>View Official Slip ›</Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* ACADEMICS: LEAVES */}
              {academicsSubTab === 'leaves' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Apply for medical or casual leave with justification. Applications are reviewed and approved by your Class Advisor and HOD.
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardHeaderTitle}>📄 Leave Desk</Text>
                      <TouchableOpacity style={styles.applyLeavePill} onPress={() => setLeaveModalVisible(true)}>
                        <Text style={styles.applyLeavePillText}>+ Apply New Leave</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionSubtitle}>
                      Review status of your leave applications and duty exemptions.
                    </Text>

                    {leavesList.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>No leave requests filed currently.</Text>
                      </View>
                    ) : (
                      leavesList.map((l) => (
                        <View key={l.id} style={styles.leaveHistoryItem}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.leaveHistoryType}>{l.type}</Text>
                            <View
                              style={[
                                styles.statusPill,
                                {
                                  backgroundColor:
                                    l.status === 'Approved' ? '#ECFDF5' : l.status === 'Rejected' ? '#FEF2F2' : '#FFFBEB',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  {
                                    color:
                                      l.status === 'Approved' ? '#059669' : l.status === 'Rejected' ? '#DC2626' : '#D97706',
                                  },
                                ]}
                              >
                                {l.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.leaveHistoryReason}>Period: {l.startDate} to {l.endDate} ({l.days} days)</Text>
                          <Text style={styles.leaveHistoryReason}>Reason: {l.reason}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* ACADEMICS: WELFARE / SUPPORT */}
              {academicsSubTab === 'welfare' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Campus student welfare cell provides confidential counseling, academic mentoring, grievance redressal, and emergency assistance.
                    </Text>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🛡️ Student Support & Helplines</Text>
                    <Text style={styles.sectionSubtitle}>Direct contacts for institutional support</Text>

                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Class Advisor</Text>
                      <Text style={[styles.profileFieldValue, { color: '#2563EB' }]}>
                        {profile.advisorName} ({profile.advisorPhone})
                      </Text>
                    </View>

                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Anti-Ragging Helpline</Text>
                      <Text style={[styles.profileFieldValue, { color: '#DC2626' }]}>1800-180-5522</Text>
                    </View>

                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Campus Health & First Aid</Text>
                      <Text style={styles.profileFieldValue}>+91 98402 33445</Text>
                    </View>

                    <View style={styles.profileRowItem}>
                      <Text style={styles.profileFieldLabel}>Dean of Student Affairs</Text>
                      <Text style={styles.profileFieldValue}>dean.studentaffairs@college.edu</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={() => setSupportModalVisible(true)}
                    >
                      <Text style={styles.primaryBtnText}>Submit Student Grievance / Request</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>🤝 Mentorship & Wellbeing Desk</Text>
                    <Text style={styles.sectionSubtitle}>
                      Book one-on-one sessions with college psychologists or career counselors completely free of charge.
                    </Text>
                    <TouchableOpacity
                      style={styles.supportTileBtn}
                      onPress={() => Alert.alert('Mentorship Request', 'Counselling appointment request submitted. Our counselor will contact you via email.')}
                    >
                      <Text style={styles.supportTileBtnText}>Book 1-on-1 Mentorship Session</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 3: REFERRALS */}
        {activeTab === 'referrals' && (
          <ReferralHub user={user} />
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <View style={{ flex: 1 }}>
            <View style={styles.pageHeaderBanner}>
              <Text style={styles.pageHeaderTitle}>Campus Notices & Circulars</Text>
              <Text style={styles.pageHeaderDesc}>
                Official updates from college administration, exam cell, and departments.
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            >
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>🔔 Campus Bulletins & Alerts</Text>
                <Text style={styles.sectionSubtitle}>
                  Official notices published by Controller of Examinations, Dean, and Department HODs.
                </Text>

                {notices.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateText}>No new campus notices published yet.</Text>
                  </View>
                ) : (
                  notices.map((n) => (
                    <View key={n.id} style={styles.noticeCardItem}>
                      <View style={styles.noticeHeaderRow}>
                        <Text style={styles.noticeTag}>{n.tag}</Text>
                        <Text style={styles.noticeDate}>{n.date}</Text>
                      </View>
                      <Text style={styles.noticeTitle}>{n.title}</Text>
                      <Text style={styles.noticeBody}>{n.text}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <UserProfileScreen
            user={user}
            roleTitle="Student Scholar"
            onLogout={onLogout}
            onBack={() => setActiveTab('home')}
            hideTopBar={true}
            roleAttributes={[
              { label: 'Roll Number / ID', value: profile.rollNo },
              { label: 'Department', value: profile.dept },
              { label: 'Semester & Section', value: `${profile.sem} (${profile.section})` },
              { label: 'Cumulative CGPA', value: profile.cgpa },
              { label: 'Overall Attendance', value: `${profile.attendance}%` },
              { label: 'Class Advisor', value: profile.advisorName },
              { label: 'Advisor Contact', value: profile.advisorPhone },
              { label: 'Hostel Allocation', value: profile.hostelBlock },
              { label: 'Hostel Room', value: profile.hostelRoom },
              { label: 'Transport Route', value: profile.route },
              { label: 'Bus Number & Stop', value: `Bus ${profile.busNo} • ${profile.stopName}` },
            ]}
          />
        )}
    </View>

      {/* ============================================================== */}
      {/* 3. FIXED BOTTOM TAB BAR NAVIGATION                             */}
      {/* ============================================================== */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        notificationsCount={notices.length}
      />

      {/* Apply Leave Modal */}
      <Modal visible={leaveModalVisible} transparent animationType="slide" onRequestClose={() => setLeaveModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply Student Leave</Text>
            <Text style={styles.modalSubtitle}>Direct submission to Class Advisor & HOD</Text>

            <Text style={styles.inputLabel}>Leave Type</Text>
            <View style={styles.typeSelectorRow}>
              {['Medical Leave', 'Casual Leave', 'Family Event'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, leaveType === t && styles.typeChipActive]}
                  onPress={() => setLeaveType(t)}
                >
                  <Text style={[styles.typeChipText, leaveType === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Date(s) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 24 Oct 2026 - 25 Oct 2026"
              value={leaveDates}
              onChangeText={setLeaveDates}
            />

            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Reason for absence..."
              multiline
              value={leaveReason}
              onChangeText={setLeaveReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setLeaveModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleApplyLeave}>
                <Text style={styles.modalSubmitText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Grievance / Request Submission Modal */}
      <Modal visible={supportModalVisible} transparent animationType="slide" onRequestClose={() => setSupportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Student Grievance / Request</Text>
            <Text style={styles.modalSubtitle}>Confidential redressal routed to Dean & Faculty Advisor</Text>

            <Text style={styles.inputLabel}>Grievance Category *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {['Academic Issue', 'Hostel & Mess', 'Campus Facilities', 'Anti-Ragging / Welfare'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.typeChip,
                    grievanceCategory === cat && styles.typeChipActive,
                  ]}
                  onPress={() => setGrievanceCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeChipText, grievanceCategory === cat && styles.typeChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Subject *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Brief summary of your grievance or request"
              value={grievanceSubject}
              onChangeText={setGrievanceSubject}
            />

            <Text style={styles.inputLabel}>Detailed Description *</Text>
            <TextInput
              style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
              placeholder="Provide relevant details or context..."
              value={grievanceDescription}
              onChangeText={setGrievanceDescription}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setSupportModalVisible(false);
                  setGrievanceSubject('');
                  setGrievanceDescription('');
                }}
                disabled={submittingGrievance}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={async () => {
                  if (!grievanceSubject.trim() || !grievanceDescription.trim()) {
                    Alert.alert('Missing Details', 'Please provide both a subject and description.');
                    return;
                  }
                  setSubmittingGrievance(true);
                  try {
                    await apiPost('grievances', {
                      studentId: user.studentId || user.userId,
                      studentName: profile.name,
                      category: grievanceCategory,
                      subject: grievanceSubject.trim(),
                      description: grievanceDescription.trim(),
                    }).catch(() => null);
                    Alert.alert('Grievance Submitted', 'Your grievance has been submitted securely to the Student Welfare Desk.');
                    setSupportModalVisible(false);
                    setGrievanceSubject('');
                    setGrievanceDescription('');
                  } finally {
                    setSubmittingGrievance(false);
                  }
                }}
                disabled={submittingGrievance}
              >
                <Text style={styles.modalSubmitText}>{submittingGrievance ? 'Submitting...' : 'Submit Request'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Submit Assignment Modal */}
      <Modal visible={submitAssignmentModalVisible} transparent animationType="slide" onRequestClose={() => setSubmitAssignmentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Assignment Solution</Text>
            <Text style={styles.modalSubtitle}>{selectedAssignment?.title} • {selectedAssignment?.subject}</Text>

            <Text style={styles.inputLabel}>File Name / Attachment Reference *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. assignment_unit2_solution.pdf"
              value={submissionFileName}
              onChangeText={setSubmissionFileName}
            />

            <View style={styles.guidanceTipBox}>
              <Text style={styles.guidanceTipEmoji}>💡</Text>
              <Text style={styles.guidanceTipText}>
                Your roll number ({profile.rollNo}) and department ({profile.dept}) will be registered automatically with this submission.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSubmitAssignmentModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitAssignment} disabled={submittingAssignment}>
                {submittingAssignment ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Confirm & Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pay Fee Modal */}
      <Modal visible={payFeeModalVisible} transparent animationType="slide" onRequestClose={() => setPayFeeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pay Semester Fee</Text>
            <Text style={styles.modalSubtitle}>Student: {profile.name} ({profile.rollNo})</Text>

            <Text style={styles.inputLabel}>Payment Amount (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={payAmountInput}
              onChangeText={setPayAmountInput}
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.typeSelectorRow}>
              {['Online Gateway', 'UPI Direct', 'NetBanking'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.typeChip, payPaymentMode === m && styles.typeChipActive]}
                  onPress={() => setPayPaymentMode(m)}
                >
                  <Text style={[styles.typeChipText, payPaymentMode === m && styles.typeChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.guidanceTipBox}>
              <Text style={styles.guidanceTipEmoji}>🛡️</Text>
              <Text style={styles.guidanceTipText}>
                Official receipt will be generated and credited to your college ledger immediately.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPayFeeModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: '#059669' }]} onPress={handlePayFee} disabled={submittingFee}>
                {submittingFee ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Process Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 5. OFFICIAL FEE RECEIPT MODAL                                 */}
      {/* ============================================================== */}
      <Modal
        visible={feeReceiptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeeReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 520 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                CAMPUS INSTITUTIONAL ERP
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                Official Fee Payment Receipt
              </Text>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 }}>
                <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '700' }}>✓ PAYMENT VERIFIED & CREDITED</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Receipt Number:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{latestFeeReceipt?.receiptNo || 'REC-2026-001'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Payment Date:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{latestFeeReceipt?.date || new Date().toLocaleDateString('en-GB')}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Payment Mode:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{latestFeeReceipt?.mode || 'Online Gateway'}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#CBD5E1', marginVertical: 4 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Student Name:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{latestFeeReceipt?.studentName || profile.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Register / Roll No:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{latestFeeReceipt?.rollNo || profile.rollNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Department / Sem:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{latestFeeReceipt?.dept || profile.dept} (Sem {latestFeeReceipt?.sem || profile.sem})</Text>
                </View>
              </View>

              <View style={{ marginTop: 12, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A' }}>Total Amount Paid</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E3A8A' }}>
                    ₹{Number(latestFeeReceipt?.amount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 4 }}>
                  Institution transaction cleared. Synchronized with financial audit registry.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 14 }]}
              onPress={() => setFeeReceiptModalVisible(false)}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 6. LIBRARY BOOK DETAILS & RENEWAL MODAL                        */}
      {/* ============================================================== */}
      <Modal
        visible={selectedLibraryBook !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLibraryBook(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 480 }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1 }}>
              CENTRAL LIBRARY CIRCULATION
            </Text>
            <Text style={[styles.modalTitle, { fontSize: 16, marginTop: 2 }]} numberOfLines={2}>
              {selectedLibraryBook?.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Author: {selectedLibraryBook?.author}
            </Text>

            <View style={[styles.specGrid, { marginVertical: 8 }]}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Return Due Date</Text>
                <Text style={[styles.specValue, { color: '#DC2626', fontWeight: '800' }]}>
                  {selectedLibraryBook?.dueDate}
                </Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Online Renewals</Text>
                <Text style={[styles.specValue, { color: '#2563EB', fontWeight: '800' }]}>
                  {selectedLibraryBook?.renewalsLeft} Left
                </Text>
              </View>
            </View>

            <View style={[styles.guidanceTipBox, { marginTop: 8 }]}>
              <Text style={styles.guidanceTipEmoji}>📖</Text>
              <Text style={styles.guidanceTipText}>
                Online renewal extends lending period by 14 calendar days from the scheduled due date. Overdue fine: ₹2/day.
              </Text>
            </View>

            <View style={[styles.modalActions, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSelectedLibraryBook(null)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#2563EB' }]}
                onPress={() => {
                  if (selectedLibraryBook) {
                    setLibraryBooks((prev) =>
                      prev.map((b) =>
                        b.id === selectedLibraryBook.id
                          ? { ...b, renewalsLeft: Math.max(0, b.renewalsLeft - 1), dueDate: 'Extended (+14d)' }
                          : b
                      )
                    );
                  }
                  setSelectedLibraryBook(null);
                }}
              >
                <Text style={styles.modalSubmitText}>Renew Book (+14d)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 7. PLACEMENT DRIVE DETAILS & APPLICATION MODAL                 */}
      {/* ============================================================== */}
      <Modal
        visible={selectedPlacementDrive !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPlacementDrive(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 520 }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1 }}>
              CAMPUS RECRUITMENT DRIVE
            </Text>
            <Text style={[styles.modalTitle, { fontSize: 17, marginTop: 2 }]}>
              {selectedPlacementDrive?.company}
            </Text>
            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700', marginBottom: 12 }}>
              Role: {selectedPlacementDrive?.role} • CTC: {selectedPlacementDrive?.package}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={[styles.specGrid, { marginVertical: 8 }]}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Drive Date</Text>
                  <Text style={styles.specValue}>{selectedPlacementDrive?.driveDate}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Cutoff Criteria</Text>
                  <Text style={[styles.specValue, { color: '#16A34A', fontWeight: '800' }]}>≥ 6.00 CGPA</Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Selection Process Stages</Text>
              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, color: '#1E293B', fontWeight: '600' }}>1. Online Aptitude & Coding Assessment</Text>
                <Text style={{ fontSize: 12, color: '#1E293B', fontWeight: '600' }}>2. Technical Evaluation & Problem Solving</Text>
                <Text style={{ fontSize: 12, color: '#1E293B', fontWeight: '600' }}>3. HR Discussion & Document Verification</Text>
              </View>

              <View style={[styles.guidanceTipBox, { marginTop: 10 }]}>
                <Text style={styles.guidanceTipEmoji}>💼</Text>
                <Text style={styles.guidanceTipText}>
                  Your verified academic transcript (CGPA {profile.cgpa}) and institutional resume will be submitted to {selectedPlacementDrive?.company}.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSelectedPlacementDrive(null)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  if (selectedPlacementDrive) {
                    setPlacements((prev) =>
                      prev.map((item) =>
                        item.company === selectedPlacementDrive.company ? { ...item, status: 'Applied' } : item
                      )
                    );
                  }
                  setSelectedPlacementDrive(null);
                }}
              >
                <Text style={styles.modalSubmitText}>Submit Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 8. HOSTEL WARDEN & SERVICES DESK MODAL                         */}
      {/* ============================================================== */}
      <Modal
        visible={hostelDeskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHostelDeskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 500 }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1 }}>
              CAMPUS RESIDENCE SERVICES
            </Text>
            <Text style={[styles.modalTitle, { fontSize: 17, marginTop: 2 }]}>
              Hostel & Resident Warden Desk
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              {profile.hostelBlock} • {profile.hostelRoom}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={[styles.specGrid, { marginVertical: 6 }]}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Resident Warden</Text>
                  <Text style={[styles.specValue, { color: '#1E293B', fontWeight: '700' }]}>Prof. S. Narayanan</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Desk Timings</Text>
                  <Text style={styles.specValue}>05:00 PM - 08:00 PM</Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>Emergency Contact Numbers</Text>
                <Text style={{ fontSize: 12, color: '#475569' }}>• Warden Desk: {profile.wardenContact}</Text>
                <Text style={{ fontSize: 12, color: '#475569' }}>• Hostel Security Gate: +91 98402 11299</Text>
                <Text style={{ fontSize: 12, color: '#475569' }}>• Health & First Aid Clinic: Ext 404</Text>
              </View>

              <View style={[styles.guidanceTipBox, { marginTop: 10 }]}>
                <Text style={styles.guidanceTipEmoji}>🕒</Text>
                <Text style={styles.guidanceTipText}>
                  Evening curfew is 08:30 PM. Outing and overnight stay requests must be applied via Student Portal 24 hours prior.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setHostelDeskModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#2563EB' }]}
                onPress={() => {
                  Linking.openURL(`tel:${profile.wardenContact}`).catch(() => null);
                  setHostelDeskModalVisible(false);
                }}
              >
                <Text style={styles.modalSubmitText}>📞 Call Warden</Text>
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
    backgroundColor: '#F1F5F9',
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
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E3A8A',
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
  roleTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  rollNoTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
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
  heroGreetingCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  greetingSub: {
    fontSize: 12,
    color: '#BFDBFE',
    marginBottom: 16,
  },
  heroKpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  heroKpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroKpiDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroKpiLabel: {
    fontSize: 11,
    color: '#BFDBFE',
    marginBottom: 2,
  },
  heroKpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroKpiSub: {
    fontSize: 10,
    color: '#E2E8F0',
  },
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
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  periodBadge: {
    width: 58,
  },
  periodBadgeNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  periodBadgeTime: {
    fontSize: 10,
    color: '#64748B',
  },
  periodInfo: {
    flex: 1,
    paddingLeft: 8,
  },
  periodSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  periodMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  miniAssignmentCard: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniAssignmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  miniAssignmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniAssignmentSubject: {
    fontSize: 11,
    color: '#64748B',
  },
  miniAssignmentDue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  noticeMiniCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noticeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  noticeDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  noticeBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  subTabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 6,
  },
  subTabBarScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  subTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  subTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dayPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginVertical: 8,
  },
  attendanceGaugeBox: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gaugeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  gaugeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  gaugeTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 6,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 5,
  },
  gaugeHint: {
    fontSize: 11,
    color: '#64748B',
  },
  subjectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subStatsText: {
    fontSize: 12,
    color: '#64748B',
  },
  subStatsPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  cgpaBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cgpaBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  markCardItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  markTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  markSubjectCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  gradeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gradeCircleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  markSubjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  markScoresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  markScoreCol: {
    alignItems: 'center',
  },
  markScoreLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  markScoreVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  assignmentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  assignmentSubject: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dueDateText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  noticeCardItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileFieldLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  profileFieldValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  feeBalanceBox: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  feeBalanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BFDBFE',
    textTransform: 'uppercase',
  },
  feeBalanceValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  feeBalanceSub: {
    fontSize: 11,
    color: '#93C5FD',
  },
  primaryBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  facilitySection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  facilityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  facilityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  facilityMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  placementMiniItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  placementMiniCompany: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  placementMiniRole: {
    fontSize: 12,
    color: '#64748B',
  },
  applyLeavePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  applyLeavePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  leaveHistoryItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leaveHistoryType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  leaveHistoryReason: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  supportTileBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  supportTileBtnText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '700',
  },
  profileSignOutCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  profileSignOutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyStateBox: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginVertical: 4,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  specGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  specItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
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
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  typeChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    backgroundColor: '#1E3A8A',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
