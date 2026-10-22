import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import ReferralHub from '../referrals/ReferralHub';

type Props = {
  user: MobileUser;
  onLogout: () => void;
};

type ParentAcademicsSubTab = 'attendance' | 'marks' | 'timetable' | 'fees' | 'leaves' | 'transport';

type SubjectAttendance = {
  code: string;
  name: string;
  conducted: number;
  attended: number;
  percentage: number;
  status: 'Safe' | 'Warning' | 'Shortage';
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

type PeriodItem = {
  period: number;
  time: string;
  subject: string;
  code: string;
  faculty: string;
  room: string;
};

type FeeReceipt = {
  receiptNo: string;
  date: string;
  category: string;
  amount: number;
  mode: string;
  status: 'Paid' | 'Pending';
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

export default function ParentDashboard({ user, onLogout }: Props) {
  // 5 Main Fixed Bottom Tabs
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [academicsSubTab, setAcademicsSubTab] = useState<ParentAcademicsSubTab>('attendance');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Ward Details
  const [ward, setWard] = useState({
    name: user.parentOf || 'Student Scholar',
    id: user.referenceId || 'N/A',
    dept: user.department || 'Department',
    sem: 'Semester 1',
    section: 'A',
    advisorName: 'Class Advisor',
    advisorPhone: '',
    attendance: 0,
    cgpa: 0,
    rank: 'Scholar',
    totalFees: 0,
    paidFees: 0,
    pendingFees: 0,
    busRoute: 'Self Transport / Day Scholar',
    busNo: 'N/A',
    driverName: 'N/A',
    driverPhone: '',
    stopName: 'N/A',
    pickupTime: '',
    dropTime: '',
  });

  // Dynamic Data Lists
  const [subjectsAttendance, setSubjectsAttendance] = useState<SubjectAttendance[]>([]);
  const [marksList, setMarksList] = useState<MarkItem[]>([]);
  const [activeDay, setActiveDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>('Monday');
  const [timetableMap, setTimetableMap] = useState<Record<string, PeriodItem[]>>({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  });
  const [feeReceipts, setFeeReceipts] = useState<FeeReceipt[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Leave Application Modal
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState('Medical Leave');
  const [newLeaveDates, setNewLeaveDates] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');

  // Pay Fee Modal
  const [payFeeModalVisible, setPayFeeModalVisible] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payPaymentMode, setPayPaymentMode] = useState('Online Gateway');
  const [submittingFee, setSubmittingFee] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const studentId = user.referenceId || user.parentOf || user.studentId || '';

      // 1. Fetch Real Student Profile
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
            (user.parentOf && s.name && s.name.toLowerCase().includes(user.parentOf.toLowerCase()))
          ) || allStudents[0];
        }
      }

      const resolvedStudentId = studentRes?.id || studentRes?.rollNo || studentId;
      const dept = studentRes?.dept || studentRes?.department || user.department || 'General';
      const sem = studentRes?.sem || studentRes?.semester || 'Semester 1';
      const sec = studentRes?.section || 'A';

      // 2. Fetch live data across modules concurrently
      const [
        advisorRes,
        attendanceRes,
        marksRes,
        timetableRes,
        feesRes,
        notifRes,
        transportRes,
        periodsRes,
      ] = await Promise.all([
        apiGet<any>(`class-advisor/class/${encodeURIComponent(dept)}/${encodeURIComponent(sem)}/${encodeURIComponent(sec)}`).catch(() => null),
        resolvedStudentId ? apiGet<any[]>(`attendance/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        resolvedStudentId ? apiGet<any[]>(`marks/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        apiGet<any[]>(`timetable?department=${encodeURIComponent(dept)}&semester=${encodeURIComponent(sem)}&section=${encodeURIComponent(sec)}`).catch(() => []),
        resolvedStudentId ? apiGet<any[]>(`fees/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        apiGet<any>(`notifications`).catch(() => []),
        apiGet<any[]>(`transport/routes`).catch(() => []),
        apiGet<any[]>('period-master').catch(() => apiGet<any[]>('period-masters').catch(() => [])),
      ]);

      // 3. Process Advisor Info
      const advStaff = advisorRes?.staffId || advisorRes;
      const advisorName = advStaff?.name || advisorRes?.name || studentRes?.advisor || 'Class Advisor';
      const advisorPhone = advStaff?.phone || advStaff?.contactNumber || advisorRes?.phone || '+91 98402 11234';

      // 4. Process Attendance
      const rawAtt = Array.isArray(attendanceRes) ? attendanceRes : [];
      let overallAttendancePct = 0;
      const parsedSubjects: SubjectAttendance[] = [];

      if (rawAtt.length > 0) {
        const subjectGroups: Record<string, { conducted: number; attended: number; name: string }> = {};

        rawAtt.forEach((record: any) => {
          const subKey = record.subjectCode || record.subject || record.subjectName || 'General';
          const subName = record.subjectName || record.subject || subKey;
          if (!subjectGroups[subKey]) {
            subjectGroups[subKey] = { conducted: 0, attended: 0, name: subName };
          }
          subjectGroups[subKey].conducted += 1;
          const status = (record.status || '').toLowerCase();
          if (status === 'present' || status === 'p' || status === 'od') {
            subjectGroups[subKey].attended += 1;
          }
        });

        let totalAttended = 0;
        let totalConducted = 0;

        Object.keys(subjectGroups).forEach((code) => {
          const item = subjectGroups[code];
          totalAttended += item.attended;
          totalConducted += item.conducted;
          const percentage = item.conducted > 0 ? Math.round((item.attended / item.conducted) * 100) : 0;
          parsedSubjects.push({
            code: code,
            name: item.name,
            conducted: item.conducted,
            attended: item.attended,
            percentage: percentage,
            status: percentage >= 85 ? 'Safe' : percentage >= 75 ? 'Warning' : 'Shortage',
          });
        });

        overallAttendancePct = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 0;
      } else if (studentRes?.attendance) {
        const parsed = parseInt(String(studentRes.attendance).replace('%', '').trim());
        overallAttendancePct = isNaN(parsed) ? 0 : parsed;
      }
      setSubjectsAttendance(parsedSubjects);

      // 5. Process Marks
      const rawMarks = Array.isArray(marksRes) ? marksRes : [];
      const parsedMarks: MarkItem[] = rawMarks.map((m: any) => {
        const internal = Number(m.internalMarks !== undefined ? m.internalMarks : (m.internal1 || m.ia1 || 0));
        const model = Number(m.semesterMarks !== undefined ? m.semesterMarks : (m.modelExam || m.model || 0));
        const total = Number(m.totalMarks !== undefined ? m.totalMarks : (internal + model));
        return {
          code: m.subjectCode || m.code || (m.subject ? String(m.subject).slice(0, 4).toUpperCase() + '401' : 'COURSE'),
          subject: m.subjectName || m.subject || 'Subject',
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

      // 6. Process Timetable (Weekly Monday-Saturday with Period Masters)
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

      // Fallback for flat timetable entries
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

      // 7. Process Fees
      const rawFees = Array.isArray(feesRes) ? feesRes : [];
      let totalFeeAmt = 0;
      let paidFeeAmt = 0;
      let pendingFeeAmt = 0;
      const parsedReceipts: FeeReceipt[] = [];

      rawFees.forEach((f: any, idx: number) => {
        const normal = Number(f.finalFee || f.totalFees || f.amount || f.totalAmount || f.normalFee || 0);
        const paid = Number(f.paidAmount !== undefined ? f.paidAmount : (f.amountPaid || (f.status === 'Paid' ? normal : 0)));
        const pending = Number(f.pendingAmount !== undefined ? f.pendingAmount : (f.remainingFee !== undefined ? f.remainingFee : Math.max(0, normal - paid)));
        totalFeeAmt += normal;
        paidFeeAmt += paid;
        pendingFeeAmt += pending;

        parsedReceipts.push({
          receiptNo: f.receiptNo || f.receiptNumber || `REC-2026-${idx + 101}`,
          date: f.paymentDate ? new Date(f.paymentDate).toLocaleDateString('en-GB') : (f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-GB') : 'Term Dues'),
          category: f.feeType || f.category || 'Academic Tuition Fee',
          amount: paid > 0 ? paid : normal,
          mode: f.paymentMode || 'Online Gateway',
          status: pending === 0 && normal > 0 ? 'Paid' : (paid > 0 ? 'Paid' : 'Pending'),
        });
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
      setFeeReceipts(parsedReceipts);

      // 8. Process Transport
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

      // 9. Process Notifications
      const notifArray = Array.isArray(notifRes)
        ? notifRes
        : Array.isArray((notifRes as any)?.data)
        ? (notifRes as any).data
        : [];
      const parsedNotifs = notifArray.map((n: any) => ({
        id: n._id || n.id || String(Math.random()),
        tag: n.category || n.type || 'Notice',
        title: n.title || 'College Notice',
        date: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-GB') : 'Recent',
        text: n.message || n.description || n.text || '',
      }));
      setNotifications(parsedNotifs);

      // 10. Update Ward State
      let computedCgpa = Number(studentRes?.cgpa || 0);
      if (computedCgpa === 0 && parsedMarks.length > 0) {
        const validGpas = parsedMarks.filter((m) => m.gpa && m.gpa > 0);
        if (validGpas.length > 0) {
          const sumGpa = validGpas.reduce((acc, m) => acc + (m.gpa || 0), 0);
          computedCgpa = parseFloat((sumGpa / validGpas.length).toFixed(2));
        }
      }

      setWard({
        name: studentRes?.name || user.parentOf || 'Student Scholar',
        id: resolvedStudentId || 'N/A',
        dept: dept,
        sem: sem,
        section: sec,
        advisorName: advisorName,
        advisorPhone: advisorPhone,
        attendance: overallAttendancePct,
        cgpa: computedCgpa,
        rank: studentRes?.rank || 'Student Scholar',
        totalFees: totalFeeAmt,
        paidFees: paidFeeAmt,
        pendingFees: pendingFeeAmt,
        busRoute: hasBus ? (allocatedRoute?.name || studentRes.busRoute) : 'Self Transport / Day Scholar',
        busNo: hasBus ? (allocatedRoute?.vehicle || allocatedRoute?.busNumber || 'Assigned Bus') : 'N/A',
        driverName: hasBus ? (allocatedRoute?.driver || 'Transport In-Charge') : 'N/A',
        driverPhone: hasBus ? (allocatedRoute?.driverPhone || '') : '',
        stopName: studentRes?.pickupPoint || (allocatedRoute?.points?.[0]?.name) || (hasBus ? 'Campus Main Stop' : 'Self Travel'),
        pickupTime: allocatedRoute?.points?.[0]?.time || (hasBus ? '07:45 AM' : 'N/A'),
        dropTime: hasBus ? '05:15 PM' : 'N/A',
      });
    } catch (err) {
      console.warn('Backend parent load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplyLeave = async () => {
    if (!newLeaveDates.trim() || !newLeaveReason.trim()) {
      Alert.alert('Required Fields', 'Please enter dates and reason for the leave.');
      return;
    }
    try {
      setLoading(true);
      await apiPost('staff-support', {
        requestType: 'Leave',
        staffName: ward.name,
        staffId: ward.id,
        department: ward.dept,
        subject: `Parent Leave Request (${newLeaveType})`,
        description: `Ward: ${ward.name} (${ward.id}) | Requested Dates: ${newLeaveDates} | Reason: ${newLeaveReason.trim()}`,
        priority: 'Medium',
      }).catch(() => null);

      const newReq: LeaveRequest = {
        id: `LV-${Date.now().toString().slice(-4)}`,
        type: newLeaveType,
        startDate: newLeaveDates,
        endDate: newLeaveDates,
        days: 1,
        reason: newLeaveReason,
        status: 'Pending',
      };
      setLeaves([newReq, ...leaves]);
      setLeaveModalVisible(false);
      setNewLeaveDates('');
      setNewLeaveReason('');
      Alert.alert('Leave Submitted', 'Leave application has been submitted to the Class Advisor.');
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Leave application submitted.');
      setLeaveModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWardFee = async () => {
    const amountNum = Number(payAmountInput);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    try {
      setSubmittingFee(true);
      const receiptNo = `REC-PAR-${Date.now().toString().slice(-6)}`;
      await apiPost('fees', {
        studentId: ward.id,
        studentName: ward.name,
        department: ward.dept,
        semester: ward.sem,
        amount: amountNum,
        paidAmount: amountNum,
        paymentMode: payPaymentMode,
        receiptNo: receiptNo,
        status: 'Paid',
        feeType: 'Ward Academic Term Fee',
      });

      setWard((prev) => ({
        ...prev,
        paidFees: prev.paidFees + amountNum,
        pendingFees: Math.max(0, prev.pendingFees - amountNum),
      }));

      setFeeReceipts((prev) => [
        {
          receiptNo: receiptNo,
          category: 'Academic Term Fee (Settled by Parent)',
          amount: amountNum,
          date: new Date().toLocaleDateString('en-GB'),
          mode: payPaymentMode,
          status: 'Paid',
        },
        ...prev,
      ]);

      setPayFeeModalVisible(false);
      setPayAmountInput('');
      Alert.alert('Fee Payment Successful 🎉', `Transaction ID: ${receiptNo}\nAmount Paid: ₹${amountNum.toLocaleString('en-IN')}\nPayment credited to ${ward.name}'s college fee account.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Could not process fee payment.');
    } finally {
      setSubmittingFee(false);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  const todayClasses = timetableMap[todayName] || [];

  return (
    <View style={styles.container}>
      {/* ============================================================== */}
      {/* 1. TOP HEADER & LINKED WARD BAR                                */}
      {/* ============================================================== */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{ward.name.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <View style={styles.roleTagRow}>
              <Text style={styles.roleTag}>LINKED WARD</Text>
            </View>
            <Text style={styles.headerNameText} numberOfLines={1}>{ward.name}</Text>
            <Text style={styles.headerSubText}>{ward.dept} • {ward.sem} ({ward.section})</Text>
          </View>
        </View>
      </View>

      {/* Class Advisor Quick Bar */}
      <View style={styles.advisorQuickBar}>
        <Text style={styles.advisorBarText}>
          👨‍🏫 Class Advisor: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{ward.advisorName}</Text>
        </Text>
        {ward.advisorPhone ? (
          <TouchableOpacity
            style={styles.callAdvisorPill}
            onPress={() => Alert.alert('Class Advisor', `Calling advisor at ${ward.advisorPhone}`)}
          >
            <Text style={styles.callAdvisorPillText}>📞 Call</Text>
          </TouchableOpacity>
        ) : null}
      </View>

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
            {/* Ward Hero Status Card (Google Pay / PhonePe Style) */}
            <View style={styles.heroGreetingCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.greetingTitle}>{ward.name}</Text>
                  <Text style={styles.greetingSub}>{ward.dept} • {ward.sem} ({ward.section})</Text>
                </View>
              </View>

              <View style={styles.heroKpiRow}>
                <View style={styles.heroKpiItem}>
                  <Text style={styles.heroKpiLabel}>Attendance</Text>
                  <Text style={[styles.heroKpiValue, { color: ward.attendance >= 75 ? '#34D399' : '#F87171' }]}>
                    {ward.attendance}%
                  </Text>
                  <Text style={styles.heroKpiSub}>
                    {ward.attendance >= 75 ? '✓ Safe' : '⚠️ Shortage'}
                  </Text>
                </View>

                <View style={styles.heroKpiDivider} />

                <View style={styles.heroKpiItem}>
                  <Text style={styles.heroKpiLabel}>Current CGPA</Text>
                  <Text style={[styles.heroKpiValue, { color: '#60A5FA' }]}>{ward.cgpa}</Text>
                  <Text style={styles.heroKpiSub}>Academic</Text>
                </View>

                <View style={styles.heroKpiDivider} />

                <View style={styles.heroKpiItem}>
                  <Text style={styles.heroKpiLabel}>Pending Fees</Text>
                  <Text style={[styles.heroKpiValue, { color: ward.pendingFees > 0 ? '#FCA5A5' : '#34D399' }]}>
                    ₹{ward.pendingFees.toLocaleString()}
                  </Text>
                  <Text style={styles.heroKpiSub}>
                    {ward.pendingFees > 0 ? 'Dues' : 'Cleared'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Shortcuts (Google Pay / PhonePe 4-Column Grid) */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardHeaderTitle}>⚡ Quick Parent Actions</Text>
                <Text style={styles.cardHeaderSub}>Tap to open</Text>
              </View>

              <View style={styles.gpayGrid}>
                {/* 1. Attendance */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => { setActiveTab('academics'); setAcademicsSubTab('attendance'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={styles.gpayIcon}>📊</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Attendance</Text>
                </TouchableOpacity>

                {/* 2. Marks */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => { setActiveTab('academics'); setAcademicsSubTab('marks'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#F5F3FF' }]}>
                    <Text style={styles.gpayIcon}>🎓</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Exam Marks</Text>
                </TouchableOpacity>

                {/* 3. Fee Status */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => { setActiveTab('academics'); setAcademicsSubTab('fees'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#FFF1F2' }]}>
                    <Text style={styles.gpayIcon}>💳</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Fee Status</Text>
                </TouchableOpacity>

                {/* 4. Bus Transit */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => { setActiveTab('academics'); setAcademicsSubTab('transport'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={styles.gpayIcon}>🚌</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Bus Transit</Text>
                </TouchableOpacity>

                {/* 5. Timetable */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => { setActiveTab('academics'); setAcademicsSubTab('timetable'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#FFFBEB' }]}>
                    <Text style={styles.gpayIcon}>⏰</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Timetable</Text>
                </TouchableOpacity>

                {/* 6. Leave Status */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => { setActiveTab('academics'); setAcademicsSubTab('leaves'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#F0FDFA' }]}>
                    <Text style={styles.gpayIcon}>✉️</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Leave Desk</Text>
                </TouchableOpacity>

                {/* 7. Referrals */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => setActiveTab('referrals')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={styles.gpayIcon}>🤝</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Referrals</Text>
                </TouchableOpacity>

                {/* 8. Call Advisor */}
                <TouchableOpacity
                  style={styles.gpayCol}
                  onPress={() => {
                    if (ward.advisorPhone) {
                      Alert.alert('Class Advisor', `Calling ${ward.advisorName} at ${ward.advisorPhone}`);
                    } else {
                      Alert.alert('Class Advisor', `Advisor: ${ward.advisorName}\nDepartment: ${ward.dept}`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gpayCircle, { backgroundColor: '#ECFEFF' }]}>
                    <Text style={styles.gpayIcon}>📞</Text>
                  </View>
                  <Text style={styles.gpayLabel} numberOfLines={2}>Call Advisor</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* WEB SIDEBAR CATEGORY 1: CHILD ACADEMICS */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>📚 Child Academics</Text>
                <Text style={styles.cardHeaderSub}>Same as Web Portal</Text>
              </View>

              <TouchableOpacity
                style={styles.serviceRowItem}
                onPress={() => { setActiveTab('academics'); setAcademicsSubTab('attendance'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={styles.serviceIconEmoji}>📊</Text>
                </View>
                <View style={styles.serviceRowContent}>
                  <Text style={styles.serviceRowTitle}>Child Attendance</Text>
                  <Text style={styles.serviceRowSub}>
                    Overall: {ward.attendance}% • {ward.attendance >= 75 ? 'Safe threshold' : 'Shortage alert'}
                  </Text>
                </View>
                <Text style={styles.serviceChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.serviceRowItem}
                onPress={() => { setActiveTab('academics'); setAcademicsSubTab('marks'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={styles.serviceIconEmoji}>🎓</Text>
                </View>
                <View style={styles.serviceRowContent}>
                  <Text style={styles.serviceRowTitle}>Child Marks & GPA</Text>
                  <Text style={styles.serviceRowSub}>
                    CGPA: {ward.cgpa} • Internal assessments & semester grades
                  </Text>
                </View>
                <Text style={styles.serviceChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.serviceRowItem}
                onPress={() => { setActiveTab('academics'); setAcademicsSubTab('timetable'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Text style={styles.serviceIconEmoji}>⏰</Text>
                </View>
                <View style={styles.serviceRowContent}>
                  <Text style={styles.serviceRowTitle}>Timetable & Exams</Text>
                  <Text style={styles.serviceRowSub}>
                    Daily periods schedule, faculty info, and examination hall dates
                  </Text>
                </View>
                <Text style={styles.serviceChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* WEB SIDEBAR CATEGORY 2: ADMINISTRATION */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>🏢 Administration</Text>
                <Text style={styles.cardHeaderSub}>Same as Web Portal</Text>
              </View>

              <TouchableOpacity
                style={styles.serviceRowItem}
                onPress={() => { setActiveTab('academics'); setAcademicsSubTab('fees'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: '#FFF1F2' }]}>
                  <Text style={styles.serviceIconEmoji}>💳</Text>
                </View>
                <View style={styles.serviceRowContent}>
                  <Text style={styles.serviceRowTitle}>Fee Status & Receipts</Text>
                  <Text style={styles.serviceRowSub}>
                    Paid: ₹{ward.paidFees.toLocaleString()} • Pending Due: ₹{ward.pendingFees.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.serviceChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.serviceRowItem}
                onPress={() => { setActiveTab('academics'); setAcademicsSubTab('leaves'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={styles.serviceIconEmoji}>📄</Text>
                </View>
                <View style={styles.serviceRowContent}>
                  <Text style={styles.serviceRowTitle}>Leave Status & Desk</Text>
                  <Text style={styles.serviceRowSub}>
                    {leaves.length > 0 ? `${leaves.length} Applications filed` : 'Submit and monitor child leaves'}
                  </Text>
                </View>
                <Text style={styles.serviceChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.serviceRowItem}
                onPress={() => { setActiveTab('academics'); setAcademicsSubTab('transport'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={styles.serviceIconEmoji}>🚌</Text>
                </View>
                <View style={styles.serviceRowContent}>
                  <Text style={styles.serviceRowTitle}>Transport & Bus Tracking</Text>
                  <Text style={styles.serviceRowSub}>
                    Bus: {ward.busNo} • {ward.busRoute}
                  </Text>
                </View>
                <Text style={styles.serviceChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.serviceRowItem}
                onPress={() => setActiveTab('notifications')}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.serviceIconEmoji}>🔔</Text>
                </View>
                <View style={styles.serviceRowContent}>
                  <Text style={styles.serviceRowTitle}>Notifications & Circulars</Text>
                  <Text style={styles.serviceRowSub}>
                    {notifications.length} Official announcements and bulletins
                  </Text>
                </View>
                <Text style={styles.serviceChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* WEB SIDEBAR CATEGORY 3: BUSINESS REFERRAL */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>💼 Business Referral & Rewards</Text>
                <TouchableOpacity onPress={() => setActiveTab('referrals')} activeOpacity={0.7}>
                  <Text style={styles.cardHeaderLink}>Open Hub →</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSubtitle}>
                Refer credit cards, insurance, job openings & bank accounts to earn verified rewards.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setActiveTab('referrals')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Explore Referral Categories & Submissions</Text>
              </TouchableOpacity>
            </View>

            {/* Today's Schedule Glance */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>📅 Ward's Classes ({todayName})</Text>
                <TouchableOpacity onPress={() => { setActiveTab('academics'); setAcademicsSubTab('timetable'); }}>
                  <Text style={styles.cardHeaderLink}>Timetable →</Text>
                </TouchableOpacity>
              </View>

              {todayClasses.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Text style={styles.emptyStateText}>
                    {todayName === 'Sunday' || todayName === 'Saturday'
                      ? 'Weekend Holiday - No scheduled lectures today.'
                      : `No classes scheduled for today (${todayName}).`}
                  </Text>
                </View>
              ) : (
                todayClasses.slice(0, 3).map((item, idx) => (
                  <View key={idx} style={styles.timelineRow}>
                    <View style={styles.periodBadge}>
                      <Text style={styles.periodBadgeNum}>P{item.period}</Text>
                      <Text style={styles.periodBadgeTime}>{item.time.split(' - ')[0]}</Text>
                    </View>
                    <View style={styles.periodInfo}>
                      <Text style={styles.periodSubject}>{item.subject}</Text>
                      <Text style={styles.periodMeta}>
                        {item.faculty} • <Text style={{ color: '#2563EB', fontWeight: '700' }}>Room {item.room}</Text>
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Latest College Bulletins */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>🔔 Recent College Notices</Text>
                <TouchableOpacity onPress={() => setActiveTab('notifications')}>
                  <Text style={styles.cardHeaderLink}>View All ({notifications.length}) →</Text>
                </TouchableOpacity>
              </View>

              {notifications.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Text style={styles.emptyStateText}>No recent college notices posted.</Text>
                </View>
              ) : (
                notifications.slice(0, 2).map((n) => (
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
          </ScrollView>
        )}

        {/* TAB 2: ACADEMICS */}
        {activeTab === 'academics' && (
          <View style={{ flex: 1 }}>
            {/* Context Header Banner */}
            <View style={styles.pageHeaderBanner}>
              <Text style={styles.pageHeaderTitle}>Ward Academic Progress</Text>
              <Text style={styles.pageHeaderDesc}>
                Track your ward's daily attendance records, semester marks, and weekly class timetable.
              </Text>
            </View>

            {/* Segment Sub-tabs (Exact options as Web Portal) */}
            <View style={styles.subTabBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabBarScroll}>
                {[
                  { id: 'attendance', label: 'Attendance', icon: '📊' },
                  { id: 'marks', label: 'Marks & GPA', icon: '🎓' },
                  { id: 'timetable', label: 'Timetable', icon: '⏰' },
                  { id: 'fees', label: 'Fee Status', icon: '💳' },
                  { id: 'leaves', label: 'Leave Desk', icon: '📄' },
                  { id: 'transport', label: 'Transport', icon: '🚌' },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.subTabBtn, academicsSubTab === st.id && styles.subTabBtnActive]}
                    onPress={() => setAcademicsSubTab(st.id as ParentAcademicsSubTab)}
                  >
                    <Text style={[styles.subTabBtnText, academicsSubTab === st.id && styles.subTabBtnTextActive]}>
                      {st.icon} {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* ACADEMICS: ATTENDANCE */}
              {academicsSubTab === 'attendance' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      University regulations require a minimum 75% attendance to appear for semester examinations. Green indicates safe attendance, while amber/red indicates an urgent shortage.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📊 Overall Attendance Summary</Text>
                    <View style={styles.attendanceGaugeBox}>
                      <View style={styles.gaugeRow}>
                        <Text style={styles.gaugeLabel}>Aggregate Cumulative</Text>
                        <Text style={styles.gaugeValue}>{ward.attendance}%</Text>
                      </View>
                      <View style={styles.gaugeTrack}>
                        <View
                          style={[
                            styles.gaugeFill,
                            {
                              width: `${Math.min(ward.attendance, 100)}%`,
                              backgroundColor: ward.attendance >= 75 ? '#10B981' : '#EF4444',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.gaugeHint}>
                        Minimum 75% required by University regulation to appear for semester examinations.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>📚 Subject-wise Attendance Breakdown</Text>
                    {subjectsAttendance.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>No subject attendance records recorded for this term yet.</Text>
                      </View>
                    ) : (
                      subjectsAttendance.map((sub, idx) => (
                        <View key={idx} style={styles.subjectItem}>
                          <View style={styles.subjectHeader}>
                            <Text style={styles.subjectCode}>{sub.code}</Text>
                            <View
                              style={[
                                styles.statusPill,
                                {
                                  backgroundColor:
                                    sub.percentage >= 85 ? '#ECFDF5' : sub.percentage >= 75 ? '#FEF3C7' : '#FEF2F2',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  {
                                    color:
                                      sub.percentage >= 85 ? '#059669' : sub.percentage >= 75 ? '#D97706' : '#DC2626',
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
                            <Text style={[styles.subStatsPercent, { color: sub.percentage >= 75 ? '#059669' : '#DC2626' }]}>
                              {sub.percentage}%
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
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>💡</Text>
                    <Text style={styles.guidanceTipText}>
                      Marks comprise Continuous Internal Assessments (scaled out of 50) and Model Examinations (out of 100). Review subject-wise grades to support your ward's preparation.
                    </Text>
                  </View>
                  <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderTitle}>🎓 Semester Marks & GPA</Text>
                    <View style={styles.cgpaBadge}>
                      <Text style={styles.cgpaBadgeText}>CGPA: {ward.cgpa}</Text>
                    </View>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    Continuous Internal Assessment & Model Examination Scores
                  </Text>

                  {marksList.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>Examination results have not been published for this term yet.</Text>
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
                            <Text style={styles.markScoreVal}>{m.total !== undefined ? m.total : (m.internal1 + m.model)}</Text>
                          </View>
                          <View style={styles.markScoreCol}>
                            <Text style={styles.markScoreLabel}>GPA</Text>
                            <Text style={styles.markScoreVal}>{m.gpa || 8.5}</Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* ACADEMICS: TIMETABLE */}
            {academicsSubTab === 'timetable' && (
              <View>
                <View style={styles.guidanceTipBox}>
                  <Text style={styles.guidanceTipEmoji}>💡</Text>
                  <Text style={styles.guidanceTipText}>
                    Select any weekday pill to view the exact lecture periods, course codes, faculty in charge, and assigned classroom numbers for that day.
                  </Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>⏰ Weekly Teaching Schedule</Text>

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

                  <Text style={styles.dayHeading}>{activeDay} Periods</Text>

                  {(timetableMap[activeDay] || []).length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>No class periods scheduled for {activeDay}.</Text>
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
              </View>
            )}

            {/* ACADEMICS: FEE STATUS */}
            {academicsSubTab === 'fees' && (
              <View style={{ gap: 14 }}>
                <View style={styles.guidanceTipBox}>
                  <Text style={styles.guidanceTipEmoji}>💡</Text>
                  <Text style={styles.guidanceTipText}>
                    Fee payments are securely tracked. Review paid tuition receipts, examination dues, and pending amounts.
                  </Text>
                </View>

                {/* Fee Summary Hero */}
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderTitle}>💳 Ward Tuition Fee Statement</Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: ward.pendingFees > 0 ? '#FEF2F2' : '#ECFDF5' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: ward.pendingFees > 0 ? '#DC2626' : '#059669' },
                        ]}
                      >
                        {ward.pendingFees > 0 ? 'Dues Outstanding' : 'All Cleared'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.feeBalanceBox}>
                    <Text style={styles.feeBalanceLabel}>Outstanding Term Balance</Text>
                    <Text style={styles.feeBalanceValue}>₹{ward.pendingFees.toLocaleString()}</Text>
                    <Text style={styles.feeBalanceSub}>
                      Total Annual Fees: ₹{ward.totalFees.toLocaleString()} • Paid to Date: ₹{ward.paidFees.toLocaleString()}
                    </Text>
                  </View>

                  {ward.pendingFees > 0 && (
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={() => {
                        setPayAmountInput(String(ward.pendingFees));
                        setPayFeeModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryBtnText}>Proceed to Pay Outstanding Dues</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Official Receipts & Payment History */}
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>📄 Official Fee Receipts & Payment History</Text>
                  <Text style={styles.sectionSubtitle}>
                    Official vouchers and payment verification for audit and tax purposes.
                  </Text>

                  {feeReceipts.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>No payment transaction records found.</Text>
                    </View>
                  ) : (
                    feeReceipts.map((r, idx) => (
                      <View key={idx} style={styles.feeReceiptItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.receiptCategory}>{r.category}</Text>
                          <Text style={styles.receiptMeta}>
                            Receipt: {r.receiptNo} • Mode: {r.mode} • Date: {r.date}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.receiptAmount}>₹{r.amount.toLocaleString()}</Text>
                          <View
                            style={[
                              styles.statusPill,
                              { backgroundColor: r.status === 'Paid' ? '#ECFDF5' : '#FEF2F2', marginTop: 4 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                { color: r.status === 'Paid' ? '#059669' : '#DC2626' },
                              ]}
                            >
                              {r.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* ACADEMICS: LEAVE STATUS */}
            {academicsSubTab === 'leaves' && (
              <View style={{ gap: 14 }}>
                <View style={styles.guidanceTipBox}>
                  <Text style={styles.guidanceTipEmoji}>💡</Text>
                  <Text style={styles.guidanceTipText}>
                    Parents can file medical and casual leave on behalf of their ward. All submissions are automatically routed to the Class Advisor for sanctioning.
                  </Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderTitle}>📄 Ward Leave Desk</Text>
                    <TouchableOpacity
                      style={styles.applyLeavePill}
                      onPress={() => setLeaveModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.applyLeavePillText}>+ Apply New Leave</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    Record of absences, medical excuses, and official leaves.
                  </Text>

                  {leaves.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>
                        No leave applications on record for this academic term.
                      </Text>
                    </View>
                  ) : (
                    leaves.map((l) => (
                      <View key={l.id} style={styles.leaveHistoryItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={styles.leaveHistoryType}>{l.type}</Text>
                          <View
                            style={[
                              styles.statusPill,
                              {
                                backgroundColor:
                                  l.status === 'Approved' ? '#ECFDF5' : l.status === 'Pending' ? '#FEF3C7' : '#FEF2F2',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                {
                                  color:
                                    l.status === 'Approved' ? '#059669' : l.status === 'Pending' ? '#D97706' : '#DC2626',
                                },
                              ]}
                            >
                              {l.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.leaveHistoryReason}>Dates: {l.startDate} to {l.endDate} ({l.days} days)</Text>
                        <Text style={[styles.leaveHistoryReason, { color: '#64748B' }]}>Reason: {l.reason}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* ACADEMICS: TRANSPORT & BUS */}
            {academicsSubTab === 'transport' && (
              <View style={{ gap: 14 }}>
                <View style={styles.guidanceTipBox}>
                  <Text style={styles.guidanceTipEmoji}>💡</Text>
                  <Text style={styles.guidanceTipText}>
                    Track assigned bus route, pickup ETA, and emergency driver contact number.
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>🚌 Assigned College Transport</Text>
                  {ward.busNo === 'N/A' || ward.busRoute.includes('Self') ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginBottom: 2 }}>
                        🚶 Day Scholar / Self Commuter
                      </Text>
                      <Text style={styles.emptyStateText}>
                        Your ward is registered as a day scholar commuting independently.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.facilitySection}>
                      <Text style={styles.facilityTitle}>Route: {ward.busRoute}</Text>
                      <Text style={styles.facilityMeta}>
                        Bus Registration: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{ward.busNo}</Text> • Boarding Stop: {ward.stopName}
                      </Text>
                      <Text style={[styles.facilityMeta, { color: '#059669', fontWeight: '700', marginTop: 4 }]}>
                        Scheduled Pickup: {ward.pickupTime || '07:45 AM'} • Scheduled Drop: {ward.dropTime || '05:15 PM'}
                      </Text>

                      {ward.driverPhone ? (
                        <TouchableOpacity
                          style={[styles.callDriverBtn, { marginTop: 12 }]}
                          onPress={() => Alert.alert('Bus Driver', `Calling ${ward.driverName} at ${ward.driverPhone}`)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.callDriverBtnText}>📞 Call Driver ({ward.driverName})</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
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
              <Text style={styles.pageHeaderTitle}>Campus Notices & Alerts</Text>
              <Text style={styles.pageHeaderDesc}>
                Official announcements from the college regarding academic schedules, examinations, fee deadlines, and holidays.
              </Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            >
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>🔔 Campus Bulletins & Ward Updates</Text>
                <Text style={styles.sectionSubtitle}>
                  Official updates from the institution concerning academics, holidays, and campus events.
                </Text>

              {notifications.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Text style={styles.emptyStateText}>No campus notices published yet.</Text>
                </View>
              ) : (
                notifications.map((n) => (
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
        <View style={{ flex: 1 }}>
          <View style={styles.pageHeaderBanner}>
            <Text style={styles.pageHeaderTitle}>Ward Records & Services</Text>
            <Text style={styles.pageHeaderDesc}>
              Review parent profile details, fee payment records, transport bus information, and submit leave requests.
            </Text>
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          >
            {/* Parent Identity */}
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>👤 Parent Profile Identity</Text>
              <View style={styles.profileRowItem}>
                <Text style={styles.profileFieldLabel}>Parent Name</Text>
                <Text style={styles.profileFieldValue}>{user.name || 'Parent Scholar'}</Text>
              </View>
              <View style={styles.profileRowItem}>
                <Text style={styles.profileFieldLabel}>Registered Email</Text>
                <Text style={styles.profileFieldValue}>{user.email || 'N/A'}</Text>
              </View>
              <View style={styles.profileRowItem}>
                <Text style={styles.profileFieldLabel}>Linked Ward Scholar</Text>
                <Text style={[styles.profileFieldValue, { color: '#2563EB' }]}>{ward.name} ({ward.id})</Text>
              </View>
              <View style={styles.profileRowItem}>
                <Text style={styles.profileFieldLabel}>Department & Term</Text>
                <Text style={styles.profileFieldValue}>{ward.dept} - {ward.sem}</Text>
              </View>
            </View>

            {/* Fee Statement & Online Payment */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>💳 Ward Tuition Fee Statement</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: ward.pendingFees > 0 ? '#FEF2F2' : '#ECFDF5' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: ward.pendingFees > 0 ? '#DC2626' : '#059669' },
                    ]}
                  >
                    {ward.pendingFees > 0 ? 'Dues Outstanding' : 'All Cleared'}
                  </Text>
                </View>
              </View>

              <View style={styles.feeBalanceBox}>
                <Text style={styles.feeBalanceLabel}>Outstanding Term Balance</Text>
                <Text style={styles.feeBalanceValue}>₹{ward.pendingFees.toLocaleString()}</Text>
                <Text style={styles.feeBalanceSub}>Total Fees: ₹{ward.totalFees.toLocaleString()} • Paid: ₹{ward.paidFees.toLocaleString()}</Text>
              </View>

              {ward.pendingFees > 0 && (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => Alert.alert('Payment Gateway', `Initiating secure online payment of ₹${ward.pendingFees.toLocaleString()}`)}
                >
                  <Text style={styles.primaryBtnText}>Proceed to Pay Dues Online</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Transport Tracking */}
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>🚌 Transport & Bus Tracking</Text>
              {ward.busNo === 'N/A' || ward.busRoute.includes('Self') ? (
                <View style={styles.emptyStateBox}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginBottom: 2 }}>
                    🚶 Day Scholar / Self Transport
                  </Text>
                  <Text style={styles.emptyStateText}>Ward travels via self/day-scholar transit.</Text>
                </View>
              ) : (
                <View style={styles.facilitySection}>
                  <Text style={styles.facilityTitle}>Assigned Route: {ward.busRoute}</Text>
                  <Text style={styles.facilityMeta}>Bus Number: {ward.busNo} • Boarding: {ward.stopName}</Text>
                  <Text style={[styles.facilityMeta, { color: '#059669', fontWeight: '700' }]}>Pickup ETA: {ward.pickupTime}</Text>
                  {ward.driverPhone ? (
                    <TouchableOpacity
                      style={styles.callDriverBtn}
                      onPress={() => Alert.alert('Bus Driver', `Calling ${ward.driverName} at ${ward.driverPhone}`)}
                    >
                      <Text style={styles.callDriverBtnText}>📞 Call Driver ({ward.driverName})</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>

            {/* Ward Leave Application */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>📄 Ward Leave Desk</Text>
                <TouchableOpacity style={styles.applyLeavePill} onPress={() => setLeaveModalVisible(true)}>
                  <Text style={styles.applyLeavePillText}>+ Apply Leave</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.guidanceTipBox}>
                <Text style={styles.guidanceTipEmoji}>💡</Text>
                <Text style={styles.guidanceTipText}>
                  Request absence for medical emergencies, personal events, or family functions. Notifications are automatically forwarded to the Class Advisor.
                </Text>
              </View>

              {leaves.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Text style={styles.emptyStateText}>No leave applications submitted yet for ward.</Text>
                </View>
              ) : (
                leaves.map((l) => (
                  <View key={l.id} style={styles.leaveHistoryItem}>
                    <Text style={styles.leaveHistoryType}>{l.type} ({l.startDate})</Text>
                    <Text style={styles.leaveHistoryReason}>Reason: {l.reason}</Text>
                    <Text style={[styles.statusPillText, { color: l.status === 'Approved' ? '#059669' : '#D97706' }]}>
                      Status: {l.status}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.profileSignOutCard} onPress={onLogout}>
              <Text style={styles.profileSignOutText}>Sign Out of Parent Portal</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
      </View>

      {/* ============================================================== */}
      {/* 3. FIXED BOTTOM TAB BAR NAVIGATION                             */}
      {/* ============================================================== */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        notificationsCount={notifications.length}
      />

      {/* Apply Leave Modal */}
      <Modal visible={leaveModalVisible} transparent animationType="slide" onRequestClose={() => setLeaveModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply Leave for Ward</Text>
            <Text style={styles.modalSubtitle}>Submitting for {ward.name} ({ward.id})</Text>

            <Text style={styles.inputLabel}>Leave Type</Text>
            <View style={styles.typeSelectorRow}>
              {['Medical Leave', 'Casual Leave', 'Family Event'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, newLeaveType === t && styles.typeChipActive]}
                  onPress={() => setNewLeaveType(t)}
                >
                  <Text style={[styles.typeChipText, newLeaveType === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Date(s) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 24 Oct 2026 - 25 Oct 2026"
              value={newLeaveDates}
              onChangeText={setNewLeaveDates}
            />

            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Reason for ward's absence..."
              multiline
              value={newLeaveReason}
              onChangeText={setNewLeaveReason}
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

      {/* Pay Ward Fee Modal */}
      <Modal
        visible={payFeeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayFeeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>💳 Pay Ward College Fees</Text>
            <Text style={styles.modalSubtitle}>
              Student: {ward.name} ({ward.id})
            </Text>

            <Text style={styles.inputLabel}>Payment Amount (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={payAmountInput}
              onChangeText={setPayAmountInput}
            />

            <Text style={styles.inputLabel}>Payment Mode</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['Online Gateway', 'UPI / NetBanking', 'Demand Draft'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    {
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: payPaymentMode === mode ? '#1E3A8A' : '#CBD5E1',
                      backgroundColor: payPaymentMode === mode ? '#EFF6FF' : '#FFFFFF',
                    },
                  ]}
                  onPress={() => setPayPaymentMode(mode)}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: payPaymentMode === mode ? '#1E3A8A' : '#64748B',
                    }}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPayFeeModalVisible(false)}
                disabled={submittingFee}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, submittingFee && { opacity: 0.6 }]}
                onPress={handlePayWardFee}
                disabled={submittingFee}
              >
                {submittingFee ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm & Pay</Text>
                )}
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
    paddingBottom: 8,
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
  advisorQuickBar: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  advisorBarText: {
    fontSize: 12,
    color: '#475569',
  },
  callAdvisorPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  callAdvisorPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  bodyWrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
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
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
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
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  subTabBarInner: {
    flexDirection: 'row',
    gap: 8,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  subTabBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  subTabBtnText: {
    fontSize: 11,
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
  facilityMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  callDriverBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  callDriverBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  subTabBarScroll: {
    paddingHorizontal: 8,
    gap: 8,
    flexDirection: 'row',
  },
  feeReceiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  receiptCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
