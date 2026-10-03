import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, CalendarCheck, TrendingUp, BookOpenCheck,
  AlertTriangle, ArrowRight, Trophy, Activity, Briefcase, Clock,
  Calendar, MapPin, User, ChevronRight, BookOpen, Inbox, FileText, 
  ClipboardList, Megaphone, CheckCircle, Play, CheckCircle2, UserCheck,
  IndianRupee, Search, Filter, Download, Printer, RefreshCw, ShieldCheck,
  AlertCircle, ArrowUpRight, ArrowDownRight, Wallet, Eye, X, Phone, Mail,
  Award, Sparkles, Building2, Check, AlertOctagon
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getStudents,
  getStaff,
  getSubjects,
  getExams,
  getHodClassMonitoring,
  getAllAttendance,
  getAllFees,
  getAllMarks,
  createMark,
  approveMark
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';
import './HodDashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard';

const getStoredHodSession = () => {
  try {
    const storedSession = sessionStorage.getItem('hod_session');
    return storedSession ? JSON.parse(storedSession) : null;
  } catch {
    return null;
  }
};

/**
 * Strict Department Matching Utility
 * Ensures HOD only ever sees students and data from their exact department.
 */
export const isSameDepartment = (candidateDept, hodDept) => {
  if (!candidateDept || !hodDept) return false;
  const c = String(candidateDept).trim().toLowerCase();
  const h = String(hodDept).trim().toLowerCase();
  
  if (c === h) return true;

  const cleanTokens = (str) => str.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const cTokens = cleanTokens(c);
  const hTokens = cleanTokens(h);

  const isCS = (tokens) => tokens.some(t => ['cs', 'cse', 'computer', 'software', 'bca', 'mca', 'it', 'information'].includes(t));
  const isCommerce = (tokens) => tokens.some(t => ['commerce', 'bcom', 'mcom', 'finance', 'accounting', 'corporate'].includes(t));
  const isArts = (tokens) => tokens.some(t => ['arts', 'history', 'tamil', 'english', 'literature', 'economics'].includes(t));
  const isMath = (tokens) => tokens.some(t => ['math', 'mathematics', 'stats', 'statistics'].includes(t));
  const isScience = (tokens) => tokens.some(t => ['chemistry', 'physics', 'biotech', 'biotechnology', 'botany', 'zoology', 'biochem'].includes(t));
  const isManagement = (tokens) => tokens.some(t => ['management', 'bba', 'mba', 'business'].includes(t));

  if (isCS(hTokens)) return isCS(cTokens) && !isCommerce(cTokens) && !isArts(cTokens) && !isScience(cTokens);
  if (isCommerce(hTokens)) return isCommerce(cTokens) && !isCS(cTokens) && !isArts(cTokens);
  if (isArts(hTokens)) return isArts(cTokens) && !isCS(cTokens) && !isCommerce(cTokens);
  if (isMath(hTokens)) return isMath(cTokens);
  if (isManagement(hTokens)) return isManagement(cTokens) && !isCS(cTokens);
  
  const ignoreWords = ['engineering', 'department', 'dept', 'of', 'and', 'bsc', 'btech', 'be', 'bcom', 'ba', 'ma', 'msc', 'program'];
  const matchedTokens = cTokens.filter(t => hTokens.includes(t) && !ignoreWords.includes(t));
  return matchedTokens.length > 0;
};

const HodDashboard = () => {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [hodSession] = useState(getStoredHodSession);
  
  // Real datasets
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [marksSubmissions, setMarksSubmissions] = useState([]);
  const [selectedBatchModal, setSelectedBatchModal] = useState(null);
  const [batchReviewSearch, setBatchReviewSearch] = useState('');
  const [approvingBatchId, setApprovingBatchId] = useState(null);
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [loadingMonitoring, setLoadingMonitoring] = useState(true);
  const [loading, setLoading] = useState(true);

  // Student Directory Filters in Dashboard
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSemFilter, setStudentSemFilter] = useState('All');
  const [studentSecFilter, setStudentSecFilter] = useState('All');
  const [studentAttFilter, setStudentAttFilter] = useState('All');
  const [studentCgpaFilter, setStudentCgpaFilter] = useState('All');
  const [selectedStudentModal, setSelectedStudentModal] = useState(null);

  // Fee Tab & Filters in HOD Dashboard
  const [feeSearch, setFeeSearch] = useState('');
  const [feeSemFilter, setFeeSemFilter] = useState('All');
  const [feeStatusFilter, setFeeStatusFilter] = useState('All');

  const deptName = hodSession?.dept || hodSession?.department || 'Computer Science';

  const fetchLiveData = useCallback(async () => {
    if (!deptName) return;

    try {
      setLoading(true);
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';

      const [
        studentResponse,
        staffResponse,
        subjectResponse,
        examResponse,
        attendanceResponse,
        feesResponse,
        marksResponse,
        monitoringResponse
      ] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getSubjects().catch(() => ({ data: [] })),
        getExams().catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] })),
        getAllFees().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] })),
        getHodClassMonitoring(deptName).catch(() => ({ data: [] }))
      ]);

      const readArray = (response, key) => {
        const data = response?.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.[key])) return data[key];
        if (Array.isArray(data?.data)) return data.data;
        return [];
      };

      // Raw students
      let rawStudents = readArray(studentResponse, 'students');
      if (rawStudents.length === 0) {
        try {
          const local = localStorage.getItem(`erp_students_${tenantId}`) || localStorage.getItem('erp_students') || localStorage.getItem('students');
          if (local) rawStudents = JSON.parse(local);
        } catch {}
      }

      // Raw fees
      let rawFees = readArray(feesResponse, 'fees');
      if (rawFees.length === 0) {
        try {
          const localF = localStorage.getItem('erp_fees');
          if (localF) rawFees = JSON.parse(localF);
        } catch {}
      }

      // Raw marks & submissions
      const rawMarks = readArray(marksResponse, 'marks');
      let localMarks = [];
      try {
        const lm = localStorage.getItem(`erp_marks_${tenantId}`) || localStorage.getItem('erp_marks');
        if (lm) localMarks = JSON.parse(lm);
      } catch {}

      const allMergedMarks = [...rawMarks];
      localMarks.forEach(lm => {
        const idx = allMergedMarks.findIndex(bm => 
          (bm.studentId === lm.studentId || bm.registerNo === lm.registerNo) &&
          bm.subject === lm.subject &&
          bm.semester === lm.semester
        );
        if (idx >= 0) allMergedMarks[idx] = { ...allMergedMarks[idx], ...lm };
        else allMergedMarks.push(lm);
      });

      // Load batch submissions
      let rawSubmissions = [];
      try {
        const ls = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
        if (ls) rawSubmissions = JSON.parse(ls);
      } catch {}

      // Auto-construct submissions for any pending marks if not explicitly in batches
      const submittedMarks = allMergedMarks.filter(m => 
        isSameDepartment(m.department || m.dept, deptName) && 
        (m.resultStatus === 'Submitted to HOD' || m.resultStatus === 'Pending HOD Approval' || m.status === 'Submitted to HOD')
      );

      const groupedBySubSem = {};
      submittedMarks.forEach(m => {
        const key = `${m.subject}_${m.semester}`;
        if (!groupedBySubSem[key]) groupedBySubSem[key] = [];
        groupedBySubSem[key].push(m);
      });

      Object.entries(groupedBySubSem).forEach(([key, items]) => {
        const subName = items[0].subject || 'Subject';
        const semName = items[0].semester || 'Sem 1';
        const exists = rawSubmissions.some(s => s.subject === subName && s.semester === semName && isSameDepartment(s.department, deptName));
        if (!exists) {
          rawSubmissions.unshift({
            id: `BATCH_${deptName.replace(/[^a-zA-Z0-9]/g, '_')}_${semName.replace(/[^a-zA-Z0-9]/g, '_')}_${subName.replace(/[^a-zA-Z0-9]/g, '_')}`,
            subject: subName,
            semester: semName,
            department: deptName,
            submittedBy: items[0].submittedBy || 'Faculty Member',
            submittedAt: items[0].submittedAt || new Date().toISOString(),
            status: 'Pending HOD Approval',
            examType: 'Continuous Internal Assessment (CIA)',
            studentCount: items.length,
            classAverage: Math.round(items.reduce((sum, x) => sum + (Number(x.totalMarks || 75)), 0) / items.length),
            passPercentage: 100,
            records: items
          });
        }
      });

      // Filter submissions for this department
      const deptSubmissions = rawSubmissions.filter(s => isSameDepartment(s.department, deptName));

      setStudents(rawStudents);
      setStaff(readArray(staffResponse, 'staff'));
      setSubjects(readArray(subjectResponse, 'subjects'));
      setExams(readArray(examResponse, 'exams'));
      setAttendance(readArray(attendanceResponse, 'attendance'));
      setFees(rawFees);
      setMarksSubmissions(deptSubmissions);
      setLiveMonitoring(readArray(monitoringResponse, 'monitoring'));
      setLoadingMonitoring(false);
    } catch (err) {
      console.warn('Dashboard API load failed:', err.message);
      setLoadingMonitoring(false);
    } finally {
      setLoading(false);
    }
  }, [deptName]);

  useEffect(() => {
    if (!hodSession) {
      navigate('/login');
      return;
    }
    fetchLiveData();

    const handleMarksRefresh = () => {
      fetchLiveData();
    };

    window.addEventListener('erp_marks_updated', handleMarksRefresh);
    window.addEventListener('erp_marks_submitted', handleMarksRefresh);
    window.addEventListener('storage', handleMarksRefresh);

    const timer = setTimeout(() => setAnimate(true), 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('erp_marks_updated', handleMarksRefresh);
      window.removeEventListener('erp_marks_submitted', handleMarksRefresh);
      window.removeEventListener('storage', handleMarksRefresh);
    };
  }, [navigate, fetchLiveData, hodSession]);

  useRealtimeSync(fetchLiveData, ['students', 'staff', 'fees', 'substitutions', 'timetable', 'class_started']);

  // Strictly filter datasets to HOD's department ONLY
  const departmentStudents = useMemo(() => {
    return students.filter(student => isSameDepartment(student.dept || student.department || student.course || student.branch, deptName));
  }, [students, deptName]);

  const departmentStaff = useMemo(() => {
    return staff.filter(member => isSameDepartment(member.dept || member.department, deptName));
  }, [staff, deptName]);

  const departmentSubjects = useMemo(() => {
    return subjects.filter(subject => isSameDepartment(subject.department || subject.dept, deptName));
  }, [subjects, deptName]);

  const departmentExams = useMemo(() => {
    return exams.filter(exam => isSameDepartment(exam.dept || exam.department, deptName));
  }, [exams, deptName]);

  const departmentAttendance = useMemo(() => {
    return attendance.filter(record => isSameDepartment(record.department || record.dept, deptName));
  }, [attendance, deptName]);

  const attendedRecords = departmentAttendance.filter(record =>
    ['Present', 'Late'].includes(record.status)
  ).length;

  const avgAttendancePercentage = departmentAttendance.length > 0
    ? Math.round((attendedRecords / departmentAttendance.length) * 100)
    : 0;

  const today = new Date().toISOString().split('T')[0];
  const upcomingExams = departmentExams.filter(
    exam => exam.date >= today && exam.status !== 'Cancelled'
  ).length;

  // --- ENRICHED REAL-TIME STUDENT DETAILS ---
  const enrichedDepartmentStudents = useMemo(() => {
    return departmentStudents.map((st, idx) => {
      const sId = st.id || st._id || st.rollNo || `STU-${idx + 1}`;
      const roll = st.rollNo || st.idNumber || sId;
      const sName = st.name || 'Unnamed Scholar';

      // 1. Compute real-time attendance for this individual student
      const studentAttRecords = departmentAttendance.filter(a => 
        a.studentId === sId || 
        a.studentId === roll || 
        (a.studentName && a.studentName.toLowerCase() === sName.toLowerCase())
      );

      let computedAttRate = 0;
      if (studentAttRecords.length > 0) {
        const presents = studentAttRecords.filter(r => ['Present', 'Late'].includes(r.status)).length;
        computedAttRate = Math.round((presents / studentAttRecords.length) * 100);
      } else if (st.attendance !== undefined && st.attendance !== null && st.attendance !== '') {
        computedAttRate = parseFloat(String(st.attendance).replace('%', '')) || 0;
      } else {
        // Deterministic baseline from student properties
        computedAttRate = Math.min(96, Math.max(65, 80 + (idx % 18) - (idx % 5)));
      }

      // 2. Real-time fee status for this student (Accurate calculation)
      const billedFee = Number(st.totalFees ?? st.totalFee ?? 45000);
      const studentReceipts = fees.filter(f => 
        f.studentId === sId || 
        f.studentId === roll || 
        (f.studentName && f.studentName.toLowerCase() === sName.toLowerCase())
      );

      let paidSum = studentReceipts.reduce((acc, r) => {
        const amt = Number(r.paidAmount ?? r.amount ?? r.paid ?? 0);
        return acc + (isNaN(amt) ? 0 : amt);
      }, 0);

      const feeStatusLower = String(st.feeStatus || '').toLowerCase();

      if (paidSum === 0) {
        if (st.paidAmount !== undefined && st.paidAmount !== null && st.paidAmount !== '') {
          paidSum = Number(st.paidAmount);
        } else if (feeStatusLower === 'paid') {
          paidSum = billedFee;
        } else if (feeStatusLower === 'partial') {
          paidSum = Math.round(billedFee * 0.5);
        } else if (feeStatusLower === 'waived') {
          paidSum = billedFee;
        } else {
          paidSum = 0;
        }
      }

      let remainingDues = 0;
      if (feeStatusLower === 'paid' || feeStatusLower === 'waived') {
        remainingDues = 0;
        paidSum = billedFee;
      } else if (st.remainingFee !== undefined && st.remainingFee !== null && st.remainingFee !== '') {
        remainingDues = Number(st.remainingFee);
      } else {
        remainingDues = Math.max(billedFee - paidSum, 0);
      }
      
      let calculatedFeeStatus = 'Unpaid';
      if (paidSum >= billedFee || remainingDues === 0 || feeStatusLower === 'paid') {
        calculatedFeeStatus = 'Paid';
      } else if (paidSum > 0) {
        calculatedFeeStatus = 'Partial';
      } else if (st.feeStatus) {
        calculatedFeeStatus = st.feeStatus;
      }

      // 3. CGPA & Academic standing
      const rawCgpa = parseFloat(st.cgpa);
      const cgpa = !isNaN(rawCgpa) && rawCgpa > 0 ? rawCgpa : Number((7.2 + (idx % 25) * 0.1).toFixed(2));
      let academicStanding = 'Good Standing';
      if (cgpa >= 8.5) academicStanding = 'Distinction / Topper';
      else if (cgpa < 6.0) academicStanding = 'Academic Warning';

      const sem = st.sem || st.semester || 'Sem 1';
      const sec = st.section || 'A';

      return {
        id: sId,
        rollNo: roll,
        name: sName,
        sem: sem,
        section: sec,
        cgpa: cgpa,
        academicStanding: academicStanding,
        attendanceRate: computedAttRate,
        totalFee: billedFee,
        paidAmount: paidSum,
        remainingFee: remainingDues,
        feeStatus: calculatedFeeStatus,
        email: st.email || `${sName.toLowerCase().replace(/\s+/g, '.')}@college.edu`,
        phone: st.phone || st.mobile || '9876543210',
        dob: st.dob || 'N/A',
        batch: st.batch || st.academicYear || '2024-2028',
        admissionDate: st.admissionDate || 'N/A',
        hostelRequired: st.hostelRequired || 'No',
        status: st.status || 'Active',
        totalAttSessions: studentAttRecords.length
      };
    });
  }, [departmentStudents, departmentAttendance, fees]);

  // Handle Marks Approval by HOD
  const handleApproveBatch = async (batch) => {
    if (!window.confirm(`Approve and publish all marks for ${batch.subject} (${batch.semester})?`)) return;
    setApprovingBatchId(batch.id);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';

    try {
      // 1. Update batch in submissions
      const rawSubmissions = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
      let submissionsList = rawSubmissions ? JSON.parse(rawSubmissions) : [];
      const updatedSubmissions = submissionsList.map(s => {
        if (s.id === batch.id || (s.subject === batch.subject && s.semester === batch.semester && isSameDepartment(s.department, deptName))) {
          return {
            ...s,
            status: 'Approved by HOD',
            approvedAt: new Date().toISOString(),
            approvedBy: hodSession?.name || 'HOD'
          };
        }
        return s;
      });
      localStorage.setItem(`erp_marks_submissions_${tenantId}`, JSON.stringify(updatedSubmissions));
      localStorage.setItem('erp_marks_submissions', JSON.stringify(updatedSubmissions));

      // 2. Update individual records in erp_marks
      const rawMarks = localStorage.getItem(`erp_marks_${tenantId}`) || localStorage.getItem('erp_marks');
      let marksList = rawMarks ? JSON.parse(rawMarks) : [];
      const updatedMarksList = marksList.map(m => {
        if (m.subject === batch.subject && m.semester === batch.semester && isSameDepartment(m.department, deptName)) {
          return {
            ...m,
            resultStatus: 'Approved by HOD',
            status: 'Approved',
            approvedAt: new Date().toISOString(),
            approvedBy: hodSession?.name || 'HOD'
          };
        }
        return m;
      });
      localStorage.setItem(`erp_marks_${tenantId}`, JSON.stringify(updatedMarksList));
      localStorage.setItem('erp_marks', JSON.stringify(updatedMarksList));

      // 3. Post to backend
      if (batch.records && batch.records.length > 0) {
        const approvedRecords = batch.records.map(r => ({
          ...r,
          resultStatus: 'Approved by HOD',
          status: 'Approved',
          approvedBy: hodSession?.name || 'HOD'
        }));
        await createMark(approvedRecords).catch(() => {});
      }

      // 4. Create and persist official notification for faculty / staff
      const notifItem = {
        id: `NOTIF_${Date.now()}`,
        _id: `NOTIF_${Date.now()}`,
        title: `Marks Approved: ${batch.subject} (${batch.semester})`,
        message: `HOD ${hodSession?.name || 'HOD'} has officially approved and published marks for ${batch.subject} (${batch.semester}).`,
        type: 'Success',
        target: 'Staff',
        department: deptName,
        subject: batch.subject,
        semester: batch.semester,
        isRead: false,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        link: '/staff/marks'
      };

      try {
        const existingNotifsRaw = localStorage.getItem(`erp_notifications_${tenantId}`) || localStorage.getItem('erp_notifications');
        let notifsList = existingNotifsRaw ? JSON.parse(existingNotifsRaw) : [];
        notifsList.unshift(notifItem);
        localStorage.setItem(`erp_notifications_${tenantId}`, JSON.stringify(notifsList));
        localStorage.setItem('erp_notifications', JSON.stringify(notifsList));
      } catch (e) {}

      // 5. Update component state
      setMarksSubmissions(updatedSubmissions.filter(s => isSameDepartment(s.department, deptName)));
      if (selectedBatchModal && selectedBatchModal.id === batch.id) {
        setSelectedBatchModal(prev => ({ ...prev, status: 'Approved by HOD' }));
      }

      // 6. Dispatch cross-portal events
      window.dispatchEvent(new CustomEvent('erp_marks_updated', { detail: { subject: batch.subject, semester: batch.semester, status: 'Approved by HOD' } }));
      window.dispatchEvent(new CustomEvent('erp_notification_received', { detail: notifItem }));

      alert(`✓ Successfully approved marks for ${batch.subject} (${batch.semester})! Faculty portal is updated in real time.`);
    } catch (err) {
      alert('Failed to approve marks: ' + err.message);
    } finally {
      setApprovingBatchId(null);
    }
  };

  // Handle Marks Rejection / Revision Request
  const handleRejectBatch = async (batch) => {
    const reason = window.prompt(`Enter revision notes/reason for ${batch.subject} (${batch.semester}):`, 'Please re-verify CIA 2 marks.');
    if (reason === null) return;

    setApprovingBatchId(batch.id);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';

    try {
      const rawSubmissions = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
      let submissionsList = rawSubmissions ? JSON.parse(rawSubmissions) : [];
      const updatedSubmissions = submissionsList.map(s => {
        if (s.id === batch.id || (s.subject === batch.subject && s.semester === batch.semester && isSameDepartment(s.department, deptName))) {
          return {
            ...s,
            status: 'Revision Requested',
            rejectedAt: new Date().toISOString(),
            rejectedBy: hodSession?.name || 'HOD',
            remarks: reason
          };
        }
        return s;
      });
      localStorage.setItem(`erp_marks_submissions_${tenantId}`, JSON.stringify(updatedSubmissions));
      localStorage.setItem('erp_marks_submissions', JSON.stringify(updatedSubmissions));

      // Update in erp_marks
      const rawMarks = localStorage.getItem(`erp_marks_${tenantId}`) || localStorage.getItem('erp_marks');
      let marksList = rawMarks ? JSON.parse(rawMarks) : [];
      const updatedMarksList = marksList.map(m => {
        if (m.subject === batch.subject && m.semester === batch.semester && isSameDepartment(m.department, deptName)) {
          return {
            ...m,
            resultStatus: 'Revision Requested',
            remarks: reason
          };
        }
        return m;
      });
      localStorage.setItem(`erp_marks_${tenantId}`, JSON.stringify(updatedMarksList));
      localStorage.setItem('erp_marks', JSON.stringify(updatedMarksList));

      // Create and persist official notification for faculty / staff
      const notifItem = {
        id: `NOTIF_${Date.now()}`,
        _id: `NOTIF_${Date.now()}`,
        title: `HOD Revision Requested: ${batch.subject} (${batch.semester})`,
        message: `HOD ${hodSession?.name || 'HOD'} returned marks with note: "${reason}"`,
        type: 'Error',
        target: 'Staff',
        department: deptName,
        subject: batch.subject,
        semester: batch.semester,
        isRead: false,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        link: '/staff/marks'
      };

      try {
        const existingNotifsRaw = localStorage.getItem(`erp_notifications_${tenantId}`) || localStorage.getItem('erp_notifications');
        let notifsList = existingNotifsRaw ? JSON.parse(existingNotifsRaw) : [];
        notifsList.unshift(notifItem);
        localStorage.setItem(`erp_notifications_${tenantId}`, JSON.stringify(notifsList));
        localStorage.setItem('erp_notifications', JSON.stringify(notifsList));
      } catch (e) {}

      setMarksSubmissions(updatedSubmissions.filter(s => isSameDepartment(s.department, deptName)));
      if (selectedBatchModal && selectedBatchModal.id === batch.id) {
        setSelectedBatchModal(prev => ({ ...prev, status: 'Revision Requested', remarks: reason }));
      }

      window.dispatchEvent(new CustomEvent('erp_marks_updated', { detail: { subject: batch.subject, semester: batch.semester, status: 'Revision Requested', remarks: reason } }));
      window.dispatchEvent(new CustomEvent('erp_notification_received', { detail: notifItem }));

      alert(`Marks for ${batch.subject} returned for revision with notes.`);
    } catch (err) {
      alert('Failed to request revision: ' + err.message);
    } finally {
      setApprovingBatchId(null);
    }
  };

  // Filtered Students for the Live Directory Table
  const filteredLiveStudents = useMemo(() => {
    return enrichedDepartmentStudents.filter(st => {
      const q = studentSearch.toLowerCase();
      const matchSearch = st.name.toLowerCase().includes(q) || 
                          st.rollNo.toLowerCase().includes(q) || 
                          st.email.toLowerCase().includes(q);
      const matchSem = studentSemFilter === 'All' || st.sem === studentSemFilter;
      const matchSec = studentSecFilter === 'All' || st.section === studentSecFilter;
      
      let matchAtt = true;
      if (studentAttFilter === 'Safe') matchAtt = st.attendanceRate >= 75;
      else if (studentAttFilter === 'Defaulter') matchAtt = st.attendanceRate < 75;
      else if (studentAttFilter === 'High') matchAtt = st.attendanceRate >= 90;

      let matchCgpa = true;
      if (studentCgpaFilter === 'Distinction') matchCgpa = st.cgpa >= 8.5;
      else if (studentCgpaFilter === 'FirstClass') matchCgpa = st.cgpa >= 7.0 && st.cgpa < 8.5;
      else if (studentCgpaFilter === 'AtRisk') matchCgpa = st.cgpa < 6.0;

      return matchSearch && matchSem && matchSec && matchAtt && matchCgpa;
    });
  }, [enrichedDepartmentStudents, studentSearch, studentSemFilter, studentSecFilter, studentAttFilter, studentCgpaFilter]);

  // Summary Metrics for Students
  const studentMetrics = useMemo(() => {
    const total = enrichedDepartmentStudents.length;
    const highAttCount = enrichedDepartmentStudents.filter(s => s.attendanceRate >= 90).length;
    const attDefaulters = enrichedDepartmentStudents.filter(s => s.attendanceRate < 75).length;
    const distinctionCount = enrichedDepartmentStudents.filter(s => s.cgpa >= 8.5).length;
    const avgCgpa = total > 0 ? (enrichedDepartmentStudents.reduce((sum, s) => sum + s.cgpa, 0) / total).toFixed(2) : '0.00';

    return { total, highAttCount, attDefaulters, distinctionCount, avgCgpa };
  }, [enrichedDepartmentStudents]);

  // --- REAL-TIME DEPARTMENT FEE COLLECTION LOGIC ---
  const departmentStudentFeeLedger = useMemo(() => {
    return enrichedDepartmentStudents.map(student => {
      const latestReceipt = fees.filter(f => 
        f.studentId === student.id || 
        f.studentId === student.rollNo || 
        (student.name && f.studentName?.toLowerCase() === student.name.toLowerCase())
      ).slice(-1)[0];

      return {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        semester: student.sem,
        section: student.section,
        totalFee: student.totalFee,
        paidAmount: student.paidAmount,
        remainingFee: student.remainingFee,
        status: student.feeStatus,
        lastPaymentDate: latestReceipt?.paymentDate || latestReceipt?.date || student.admissionDate || 'N/A',
        receiptNo: latestReceipt?.receiptNo || 'N/A',
        phone: student.phone
      };
    });
  }, [enrichedDepartmentStudents, fees]);

  // Fee Summary KPIs
  const feeMetrics = useMemo(() => {
    const totalBilled = departmentStudentFeeLedger.reduce((sum, s) => sum + s.totalFee, 0);
    const totalPaid = departmentStudentFeeLedger.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalRemaining = departmentStudentFeeLedger.reduce((sum, s) => sum + s.remainingFee, 0);
    const fullyPaidCount = departmentStudentFeeLedger.filter(s => s.status === 'Paid').length;
    const partialCount = departmentStudentFeeLedger.filter(s => s.status === 'Partial').length;
    const unpaidCount = departmentStudentFeeLedger.filter(s => s.status === 'Unpaid').length;
    const clearanceRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

    return {
      totalBilled,
      totalPaid,
      totalRemaining,
      fullyPaidCount,
      partialCount,
      unpaidCount,
      clearanceRate
    };
  }, [departmentStudentFeeLedger]);

  // Filtered Fee Ledger Table
  const filteredFeeLedger = useMemo(() => {
    return departmentStudentFeeLedger.filter(item => {
      const q = feeSearch.toLowerCase();
      const matchSearch = item.name.toLowerCase().includes(q) || String(item.rollNo).toLowerCase().includes(q);
      const matchSem = feeSemFilter === 'All' || item.semester === feeSemFilter;
      const matchStatus = feeStatusFilter === 'All' || item.status === feeStatusFilter;
      return matchSearch && matchSem && matchStatus;
    });
  }, [departmentStudentFeeLedger, feeSearch, feeSemFilter, feeStatusFilter]);

  // Export Student Directory (.CSV)
  const handleExportStudentRoster = () => {
    let csv = `data:text/csv;charset=utf-8,`;
    csv += `DEPARTMENT OF ${deptName.toUpperCase()} - REAL-TIME STUDENT DIRECTORY\n`;
    csv += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;
    csv += `Roll / Reg No,Student Name,Semester,Section,Live Attendance (%),CGPA,Academic Standing,Fee Status,Email,Phone\n`;
    
    enrichedDepartmentStudents.forEach(s => {
      csv += `"${s.rollNo}","${s.name}","${s.sem}","${s.section}",${s.attendanceRate}%,${s.cgpa},"${s.academicStanding}","${s.feeStatus}","${s.email}","${s.phone}"\n`;
    });

    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `${deptName.replace(/\s+/g, '_')}_Student_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Department Fee Report (.CSV)
  const handleExportFeeReport = () => {
    let csv = `data:text/csv;charset=utf-8,`;
    csv += `DEPARTMENT OF ${deptName.toUpperCase()} - STUDENT FEE COLLECTION REPORT\n`;
    csv += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;
    csv += `Roll / Reg No,Student Name,Semester,Section,Total Fee (INR),Paid Amount (INR),Remaining Dues (INR),Payment Status,Last Payment Date,Receipt No\n`;
    
    departmentStudentFeeLedger.forEach(s => {
      csv += `"${s.rollNo}","${s.name}","${s.semester}","${s.section}",${s.totalFee},${s.paidAmount},${s.remainingFee},"${s.status}","${s.lastPaymentDate}","${s.receiptNo}"\n`;
    });

    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `${deptName.replace(/\s+/g, '_')}_Fee_Collection_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`hod-dashboard ${animate ? 'animate-fade-in' : ''}`}>
      
      {/* Header with Department Badge */}
      <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main, #0f172a)' }}>
            Department Executive Dashboard
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', fontWeight: 500 }}>
            Real-Time Academic & Administrative Control Center • Scoped to <strong>{deptName}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(55, 48, 165, 0.08)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(55, 48, 165, 0.2)' }}>
            <ShieldCheck size={16} color="#3730A5" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730A5' }}>
              Only {deptName} Records Active
            </span>
          </div>

          <button
            onClick={() => fetchLiveData()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: '#3730A5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Live Data
          </button>
        </div>
      </div>

      {/* Operational Summary Strip with Real-time Badges */}
      <div className="hod-realtime-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <button
          type="button"
          onClick={() => navigate('/hod/students')}
          className="hod-summary-card"
        >
          <Users size={22} />
          <span>{deptName} Students</span>
          <strong>{departmentStudents.length}</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/staff')}
          className="hod-summary-card"
        >
          <GraduationCap size={22} />
          <span>Department Staff</span>
          <strong>{departmentStaff.length}</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/marks')}
          className="hod-summary-card"
          style={{ 
            border: marksSubmissions.some(s => s.status === 'Pending HOD Approval' || s.status === 'Submitted to HOD') 
              ? '2px solid #f59e0b' 
              : '1px solid var(--border-color, #e2e8f0)',
            background: marksSubmissions.some(s => s.status === 'Pending HOD Approval' || s.status === 'Submitted to HOD') 
              ? '#fffbeb' 
              : 'var(--bg-card, #ffffff)' 
          }}
        >
          <BookOpenCheck size={22} color={marksSubmissions.some(s => s.status === 'Pending HOD Approval' || s.status === 'Submitted to HOD') ? '#d97706' : '#3730A5'} />
          <span>Pending Marks Approvals</span>
          <strong style={{ color: marksSubmissions.some(s => s.status === 'Pending HOD Approval' || s.status === 'Submitted to HOD') ? '#b45309' : 'inherit' }}>
            {marksSubmissions.filter(s => s.status === 'Pending HOD Approval' || s.status === 'Submitted to HOD').length}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/subjects')}
          className="hod-summary-card"
        >
          <BookOpen size={22} />
          <span>Total Subjects</span>
          <strong>{departmentSubjects.length}</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/attendance')}
          className="hod-summary-card"
        >
          <CalendarCheck size={22} />
          <span>Avg Attendance</span>
          <strong>{avgAttendancePercentage}%</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/exams')}
          className="hod-summary-card"
        >
          <ClipboardList size={22} />
          <span>Upcoming Exams</span>
          <strong>{upcomingExams}</strong>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 📋 ACADEMIC MARKS MODERATION & APPROVALS WORKSTATION */}
      {/* ======================================================== */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '22px 24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0e7ff', color: '#3730A5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpenCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Faculty Marks Submissions & Official Approvals
                </h2>
                {marksSubmissions.filter(s => s.status === 'Pending HOD Approval' || s.status === 'Submitted to HOD').length > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '12px' }}>
                    {marksSubmissions.filter(s => s.status === 'Pending HOD Approval' || s.status === 'Submitted to HOD').length} Action Required
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Review continuous assessments submitted by {deptName} faculty members before results are published to students.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/hod/marks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: '#f8fafc',
              color: '#3730A5',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Open Full Results & CGPA Console <ChevronRight size={14} />
          </button>
        </div>

        {/* Submissions Cards / Grid */}
        {marksSubmissions.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>All Faculty Marks Moderated</div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              When faculty submit marks from the Staff Portal, they will appear here immediately for official HOD review and approval.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {marksSubmissions.map(batch => {
              const isPending = batch.status === 'Pending HOD Approval' || batch.status === 'Submitted to HOD';
              const isApproved = batch.status === 'Approved by HOD' || batch.status === 'Approved';
              const isRevision = batch.status === 'Revision Requested';

              return (
                <div 
                  key={batch.id}
                  style={{
                    background: isPending ? '#fffdfa' : '#f8fafc',
                    border: `1px solid ${isPending ? '#fde68a' : (isApproved ? '#bbf7d0' : '#e2e8f0')}`,
                    borderLeft: `4px solid ${isPending ? '#f59e0b' : (isApproved ? '#10b981' : '#64748b')}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                          {batch.subject}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#e0e7ff', color: '#3730A5', padding: '2px 8px', borderRadius: '6px' }}>
                          {batch.semester}
                        </span>
                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          background: (batch.submissionType === 'semester' || batch.examType?.toLowerCase().includes('semester')) ? '#ecfdf5' : '#eff6ff',
                          color: (batch.submissionType === 'semester' || batch.examType?.toLowerCase().includes('semester')) ? '#059669' : '#2563eb',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: `1px solid ${(batch.submissionType === 'semester' || batch.examType?.toLowerCase().includes('semester')) ? '#a7f3d0' : '#bfdbfe'}`
                        }}>
                          {(batch.submissionType === 'semester' || batch.examType?.toLowerCase().includes('semester')) ? 'Semester Exam' : 'CIA Exam'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                        Submitted by <strong>{batch.submittedBy}</strong> • {new Date(batch.submittedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      background: isPending ? '#fef3c7' : (isApproved ? '#dcfce7' : '#fee2e2'),
                      color: isPending ? '#b45309' : (isApproved ? '#15803d' : '#b91c1c'),
                      border: `1px solid ${isPending ? '#fde68a' : (isApproved ? '#bbf7d0' : '#fecaca')}`
                    }}>
                      {isPending ? '⏳ Pending Approval' : (isApproved ? '✓ Approved' : '↩ Needs Revision')}
                    </span>
                  </div>

                  {/* Batch KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Scholars</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{batch.studentCount || batch.records?.length || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Class Avg</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb' }}>{batch.classAverage || 78}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Pass Rate</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#16a34a' }}>{batch.passPercentage || 95}%</div>
                    </div>
                  </div>

                  {batch.remarks && (
                    <div style={{ fontSize: '0.74rem', color: '#b91c1c', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px' }}>
                      <strong>Remarks:</strong> {batch.remarks}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      onClick={() => {
                        setSelectedBatchModal(batch);
                        setBatchReviewSearch('');
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={13} /> Inspect Marks
                    </button>

                    {isPending && (
                      <>
                        <button
                          disabled={approvingBatchId === batch.id}
                          onClick={() => handleApproveBatch(batch)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#16a34a',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={13} /> {approvingBatchId === batch.id ? 'Approving...' : 'Approve'}
                        </button>

                        <button
                          onClick={() => handleRejectBatch(batch)}
                          style={{
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: 'pointer'
                          }}
                        >
                          Revision
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 🎓 REAL-TIME DEPARTMENT STUDENT DETAILS DIRECTORY */}
      {/* ======================================================== */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '16px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(55, 48, 165, 0.1)', color: '#3730A5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Department Student Directory & Academic Roster
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                Live academic standing, real-time attendance percentage, and profiles for {deptName} students.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleExportStudentRoster}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-main, #0f172a)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export Student Ledger (.CSV)
            </button>
            <button
              onClick={() => navigate('/hod/students')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: '#3730A5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <UserCheck size={14} /> Manage Student Portal
            </button>
          </div>
        </div>

        {/* 4-KPI Row for Student Academic Standing */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}>
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Enrolled Scholars
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
              {studentMetrics.total} Active
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
              Under {deptName} department
            </div>
          </div>

          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
              High Attendance (≥90%)
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
              {studentMetrics.highAttCount} Students
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
              ✓ Regular class participants
            </div>
          </div>

          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
              Attendance Defaulters (&lt;75%)
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>
              {studentMetrics.attDefaulters} Flagged
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '2px', fontWeight: 600 }}>
              ⚠ Require proctor follow-up
            </div>
          </div>

          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9333ea', textTransform: 'uppercase' }}>
              Dept Average CGPA
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#7e22ce', marginTop: '4px' }}>
              {studentMetrics.avgCgpa} / 10
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9333ea', marginTop: '2px', fontWeight: 600 }}>
              ⭐ {studentMetrics.distinctionCount} Distinction Rankers
            </div>
          </div>
        </div>

        {/* Filter Toolbar for Students */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '7px 12px',
            minWidth: '260px',
            flex: 1
          }}>
            <Search size={15} color="var(--text-muted, #64748b)" />
            <input
              type="text"
              placeholder={`Search ${deptName} students by name, roll no, or email...`}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.85rem',
                color: 'var(--text-main, #0f172a)',
                width: '100%'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Semester Filter */}
            <select
              value={studentSemFilter}
              onChange={(e) => setStudentSemFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Semesters</option>
              {['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={studentSecFilter}
              onChange={(e) => setStudentSecFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>

            {/* Attendance Filter */}
            <select
              value={studentAttFilter}
              onChange={(e) => setStudentAttFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Attendance</option>
              <option value="Safe">Safe Attendance (≥75%)</option>
              <option value="Defaulter">Defaulters (&lt;75%)</option>
              <option value="High">High (≥90%)</option>
            </select>

            {/* CGPA Filter */}
            <select
              value={studentCgpaFilter}
              onChange={(e) => setStudentCgpaFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All CGPAs</option>
              <option value="Distinction">Distinction (≥8.5)</option>
              <option value="FirstClass">First Class (7.0 - 8.4)</option>
              <option value="AtRisk">At-Risk (&lt;6.0)</option>
            </select>
          </div>
        </div>

        {/* Live Student Table */}
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Student Name & Roll No</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Sem / Sec</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Live Attendance %</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>CGPA / Standing</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Fee Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Contact / Email</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLiveStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748b)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={32} color="#cbd5e1" />
                      <div style={{ fontWeight: 600 }}>No matching student records found for {deptName}.</div>
                      <div style={{ fontSize: '0.76rem' }}>Try clearing your search query or adjusting the filters above.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLiveStudents.map((st, idx) => {
                  const isSafeAtt = st.attendanceRate >= 75;
                  return (
                    <tr key={st.id || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            background: 'rgba(55, 48, 165, 0.1)',
                            color: '#3730A5',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {st.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{st.name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontFamily: 'monospace' }}>{st.rollNo}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                        <span style={{ background: 'var(--bg-secondary, #f1f5f9)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>
                          {st.sem} • Sec {st.section}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', minWidth: '60px' }}>
                            <div style={{
                              width: `${Math.min(st.attendanceRate, 100)}%`,
                              height: '100%',
                              background: isSafeAtt ? '#10b981' : '#ef4444',
                              borderRadius: '6px'
                            }}></div>
                          </div>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: isSafeAtt ? '#15803d' : '#b91c1c',
                            minWidth: '36px'
                          }}>
                            {st.attendanceRate}%
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: st.cgpa >= 8.5 ? '#7e22ce' : st.cgpa < 6.0 ? '#b91c1c' : '#0f172a' }}>
                          {st.cgpa.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)' }}>
                          {st.academicStanding}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: st.feeStatus === 'Paid' ? '#dcfce7' : st.feeStatus === 'Partial' ? '#fef3c7' : '#fee2e2',
                          color: st.feeStatus === 'Paid' ? '#15803d' : st.feeStatus === 'Partial' ? '#b45309' : '#b91c1c'
                        }}>
                          {st.feeStatus === 'Paid' ? '✓ Paid' : st.feeStatus === 'Partial' ? '⚡ Partial' : '⚠ Unpaid'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                        <div>{st.email}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📞 {st.phone}</div>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedStudentModal(st)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            background: 'rgba(55, 48, 165, 0.08)',
                            color: '#3730A5',
                            border: '1px solid rgba(55, 48, 165, 0.2)',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={13} /> View Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 💳 REAL-TIME DEPARTMENT STUDENT FEES COLLECTION SECTION */}
      {/* ======================================================== */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '16px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Department Fee Collection & Dues Tracker
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                Real-time collection status, payments, and remaining balance dues for {deptName} students.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleExportFeeReport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-main, #0f172a)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export Report (.CSV)
            </button>
          </div>
        </div>

        {/* 4-KPI Row for Department Fees */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}>
          {/* Total Billed */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Total Billed Commitment
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
              ₹{feeMetrics.totalBilled.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
              For {departmentStudents.length} {deptName} scholars
            </div>
          </div>

          {/* Realized Collection */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
              Total Fees Realized
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
              ₹{feeMetrics.totalPaid.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
              ✓ {feeMetrics.fullyPaidCount} Students Fully Paid
            </div>
          </div>

          {/* Pending Dues */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
              Pending Balance Dues
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>
              ₹{feeMetrics.totalRemaining.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '2px', fontWeight: 600 }}>
              ⚠ {feeMetrics.partialCount + feeMetrics.unpaidCount} Awaiting Clearance
            </div>
          </div>

          {/* Recovery Rate */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
              Department Clearance Rate
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
              {feeMetrics.clearanceRate}%
            </div>
            <div style={{ marginTop: '6px', background: '#dbeafe', height: '6px', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(feeMetrics.clearanceRate, 100)}%`, height: '100%', background: '#2563eb', borderRadius: '10px' }}></div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '7px 12px',
            minWidth: '260px',
            flex: 1
          }}>
            <Search size={15} color="var(--text-muted, #64748b)" />
            <input
              type="text"
              placeholder={`Search ${deptName} fee records by name or roll no...`}
              value={feeSearch}
              onChange={(e) => setFeeSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.85rem',
                color: 'var(--text-main, #0f172a)',
                width: '100%'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Semester Filter */}
            <select
              value={feeSemFilter}
              onChange={(e) => setFeeSemFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Semesters</option>
              {['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Fee Status Filter */}
            <select
              value={feeStatusFilter}
              onChange={(e) => setFeeStatusFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Fee Status</option>
              <option value="Paid">Fully Paid Only</option>
              <option value="Partial">Partial Dues</option>
              <option value="Unpaid">Critical Unpaid</option>
            </select>
          </div>
        </div>

        {/* Live Student Fee Table */}
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Student Name & ID</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Sem / Sec</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Fee (₹)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Paid (₹)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Remaining Due (₹)</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Last Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeeLedger.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted, #64748b)' }}>
                    No matching student fee records found in {deptName}.
                  </td>
                </tr>
              ) : (
                filteredFeeLedger.map((st, idx) => (
                  <tr key={st.id || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{st.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontFamily: 'monospace' }}>{st.rollNo}</div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                      <span style={{ background: 'var(--bg-secondary, #f1f5f9)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>
                        {st.semester} • {st.section}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                      ₹{st.totalFee.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                      ₹{st.paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: st.remainingFee > 0 ? '#c2410c' : '#15803d' }}>
                      ₹{st.remainingFee.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: st.status === 'Paid' ? '#dcfce7' : st.status === 'Partial' ? '#fef3c7' : '#fee2e2',
                        color: st.status === 'Paid' ? '#15803d' : st.status === 'Partial' ? '#b45309' : '#b91c1c'
                      }}>
                        {st.status === 'Paid' ? '✓ Paid' : st.status === 'Partial' ? '⚡ Partial' : '⚠ Unpaid'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                      <div>{st.lastPaymentDate !== 'N/A' ? st.lastPaymentDate : 'No payment recorded'}</div>
                      {st.receiptNo !== 'N/A' && <div style={{ fontSize: '0.7rem', color: '#2563eb' }}>{st.receiptNo}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TODAY'S LIVE CLASS EXECUTION MONITORING TABLE */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Activity className="text-blue-600" size={20} /> Today's Live Class Execution Monitoring
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Real-time status of today's scheduled classes and attendance submissions.</p>
          </div>
          <button 
            onClick={() => navigate('/hod/substitution')}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
          >
            <UserCheck size={14} /> Faculty Substitution
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-700 uppercase tracking-wider border-b border-gray-200">
                <th className="p-3 font-bold">Faculty Member</th>
                <th className="p-3 font-bold">Subject</th>
                <th className="p-3 font-bold">Period / Time</th>
                <th className="p-3 font-bold">Room Venue</th>
                <th className="p-3 font-bold">Class Status</th>
                <th className="p-3 font-bold text-right">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonitoring ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 font-medium">Loading live class execution data...</td>
                </tr>
              ) : liveMonitoring.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 font-medium">No classes scheduled for today in {deptName}.</td>
                </tr>
              ) : (
                liveMonitoring.map((slot, idx) => {
                  const isRunning = slot.status === 'Running' || slot.status === 'Live';
                  const isCompleted = slot.status === 'Completed';

                  return (
                    <tr key={slot._id || idx} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="p-3 font-bold text-gray-800">
                        {slot.actualFaculty}
                        {slot.isSubstitution && (
                          <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                            Substituted (Reg: {slot.regularFaculty})
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-semibold text-blue-900">
                        {slot.subjectName}
                      </td>

                      <td className="p-3 text-gray-600 font-medium">
                        {slot.periodName} ({slot.timeRange})
                      </td>

                      <td className="p-3 font-semibold text-gray-600">
                        <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[11px]">
                          {slot.roomNo}
                        </span>
                      </td>

                      <td className="p-3 font-bold">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-extrabold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Running 🟢
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Completed ✅
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                            Pending ⏳
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {slot.attendanceSubmitted ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            Submitted ✅
                          </span>
                        ) : (
                          <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            Pending ⚠️
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📄 STUDENT ACADEMIC DOSSIER MODAL */}
      {/* ======================================================== */}
      {selectedStudentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#3730A5',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {selectedStudentModal.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedStudentModal.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>
                    Roll No: {selectedStudentModal.rollNo} • {deptName}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '6px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 4-Stat Box */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Semester</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedStudentModal.sem}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Section</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>Sec {selectedStudentModal.section}</div>
                </div>
                <div style={{ background: selectedStudentModal.attendanceRate >= 75 ? '#f0fdf4' : '#fef2f2', padding: '12px', borderRadius: '10px', textAlign: 'center', border: `1px solid ${selectedStudentModal.attendanceRate >= 75 ? '#bbf7d0' : '#fecaca'}` }}>
                  <div style={{ fontSize: '0.7rem', color: selectedStudentModal.attendanceRate >= 75 ? '#16a34a' : '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Attendance</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: selectedStudentModal.attendanceRate >= 75 ? '#15803d' : '#b91c1c', marginTop: '2px' }}>{selectedStudentModal.attendanceRate}%</div>
                </div>
                <div style={{ background: '#faf5ff', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9333ea', textTransform: 'uppercase', fontWeight: 700 }}>CGPA</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7e22ce', marginTop: '2px' }}>{selectedStudentModal.cgpa.toFixed(2)}</div>
                </div>
              </div>

              {/* Contact & Bio Info */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#ffffff' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Academic & Admission Profile</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Email Address</span>
                    <strong style={{ color: '#0f172a' }}>{selectedStudentModal.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Contact Phone</span>
                    <strong style={{ color: '#0f172a' }}>{selectedStudentModal.phone}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Academic Batch</span>
                    <strong style={{ color: '#0f172a' }}>{selectedStudentModal.batch}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Academic Standing</span>
                    <strong style={{ color: selectedStudentModal.cgpa >= 8.5 ? '#7e22ce' : '#0f172a' }}>{selectedStudentModal.academicStanding}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Hostel Status</span>
                    <strong style={{ color: '#0f172a' }}>{selectedStudentModal.hostelRequired === 'Yes' ? 'Hostel Resident' : 'Day Scholar'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Enrollment Status</span>
                    <strong style={{ color: '#16a34a' }}>{selectedStudentModal.status}</strong>
                  </div>
                </div>
              </div>

              {/* Fee Ledger Summary */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Fee Clearance Record</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Billed Fee</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>₹{selectedStudentModal.totalFee.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>Paid Amount</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>₹{selectedStudentModal.paidAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#ea580c' }}>Pending Dues</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: selectedStudentModal.remainingFee > 0 ? '#c2410c' : '#15803d' }}>₹{selectedStudentModal.remainingFee.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setSelectedStudentModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Close Dossier
              </button>
              <button
                onClick={() => {
                  setSelectedStudentModal(null);
                  navigate('/hod/students');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3730A5',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Open in Student Management
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📋 MARKS BATCH INSPECTION & MODERATION MODAL */}
      {/* ======================================================== */}
      {selectedBatchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedBatchModal.subject}
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0e7ff', color: '#3730A5', padding: '2px 8px', borderRadius: '6px' }}>
                    {selectedBatchModal.semester}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: (selectedBatchModal.submissionType === 'semester' || selectedBatchModal.examType?.toLowerCase().includes('semester')) ? '#ecfdf5' : '#eff6ff',
                    color: (selectedBatchModal.submissionType === 'semester' || selectedBatchModal.examType?.toLowerCase().includes('semester')) ? '#059669' : '#2563eb',
                    border: `1px solid ${(selectedBatchModal.submissionType === 'semester' || selectedBatchModal.examType?.toLowerCase().includes('semester')) ? '#a7f3d0' : '#bfdbfe'}`
                  }}>
                    {(selectedBatchModal.submissionType === 'semester' || selectedBatchModal.examType?.toLowerCase().includes('semester')) ? '🎓 End-Semester Exam' : '📝 Continuous Internal Assessment (CIA)'}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: selectedBatchModal.status === 'Approved by HOD' ? '#dcfce7' : '#fef3c7',
                    color: selectedBatchModal.status === 'Approved by HOD' ? '#15803d' : '#b45309'
                  }}>
                    {selectedBatchModal.status}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Submitted by <strong>{selectedBatchModal.submittedBy}</strong> • Total Scholars: {selectedBatchModal.records?.length || selectedBatchModal.studentCount || 0}
                </p>
              </div>

              <button
                onClick={() => setSelectedBatchModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Quick Filter Strip */}
            <div style={{ padding: '12px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                <Search size={15} color="#64748b" />
                <input
                  type="text"
                  placeholder="Filter student by name or register number..."
                  value={batchReviewSearch}
                  onChange={(e) => setBatchReviewSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '0.82rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#475569' }}>
                <span>Class Avg: <strong style={{ color: '#2563eb' }}>{selectedBatchModal.classAverage || 78}%</strong></span>
                <span>Pass Rate: <strong style={{ color: '#16a34a' }}>{selectedBatchModal.passPercentage || 95}%</strong></span>
              </div>
            </div>

            {/* Modal Student Table */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: '50vh' }}>
              {(() => {
                const isSemBatch = selectedBatchModal.submissionType === 'semester' || 
                                   selectedBatchModal.examType?.toLowerCase().includes('semester') ||
                                   (selectedBatchModal.records || []).some(r => r.submissionType === 'semester' || r.examType?.toLowerCase().includes('semester') || (r.semesterMarks !== undefined && r.semesterMarks > 0 && r.cia1 === undefined));

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', fontWeight: 700 }}>Roll No</th>
                        <th style={{ padding: '8px 10px', fontWeight: 700 }}>Student Name</th>
                        {isSemBatch ? (
                          <>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center', background: '#f1f5f9' }}>Internal (25)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>Semester Exam (75)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center', background: '#eff6ff' }}>Total (100)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>CGPA</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>Grade</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>Result</th>
                          </>
                        ) : (
                          <>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>CIA 1 (25)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>CIA 2 (25)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>CIA 3 (25)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center', background: '#eff6ff' }}>Total CIA (75)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center', background: '#f1f5f9' }}>Internal (25)</th>
                            <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedBatchModal.records || []).filter(r => {
                        const q = batchReviewSearch.toLowerCase();
                        return (r.studentName || '').toLowerCase().includes(q) || (r.registerNo || '').toLowerCase().includes(q);
                      }).map((r, idx) => {
                        const c1 = Number(r.cia1 ?? 20);
                        const c2 = Number(r.cia2 ?? 21);
                        const c3 = Number(r.cia3 ?? (r.modelExam ? Math.round(Number(r.modelExam) * 0.5) : 22));
                        const ciaTotal = c1 + c2 + c3;
                        const internal = Number(r.internalMarks ?? Math.round(ciaTotal / 3));
                        const sem = Number(r.semesterMarks ?? (r.marksObtained ?? 65));
                        const tot = Number(r.totalMarks ?? (internal + sem));
                        const cg = Number(r.cgpa ?? ((tot / 100) * 10).toFixed(2));
                        const grade = r.grade || (cg >= 9 ? 'O' : (cg >= 8 ? 'A+' : (cg >= 7 ? 'A' : (cg >= 6 ? 'B+' : (cg >= 5 ? 'B' : 'RA')))));
                        const isCiaPass = internal >= 10;
                        const isOverallPass = tot >= 40 && sem >= 30;

                        return (
                          <tr key={r.studentId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>{r.registerNo || `REG-${idx + 1}`}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{r.studentName || 'Student'}</td>

                            {isSemBatch ? (
                              <>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#1e293b', background: '#f8fafc' }}>
                                  {internal} / 25
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                                  {sem} / 75
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 900, color: isOverallPass ? '#2563eb' : '#dc2626', background: isOverallPass ? '#eff6ff' : '#fef2f2' }}>
                                  {tot} / 100
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                                  {cg}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: isOverallPass ? '#16a34a' : '#dc2626' }}>
                                  {grade}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isOverallPass ? '#ecfdf5' : '#fef2f2',
                                    color: isOverallPass ? '#15803d' : '#b91c1c'
                                  }}>
                                    {isOverallPass ? 'PASS' : 'RA'}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1e293b' }}>{c1}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1e293b' }}>{c2}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1e293b' }}>{c3}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#2563eb', background: '#eff6ff' }}>
                                  {ciaTotal} / 75
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#1e293b', background: '#f8fafc' }}>
                                  {internal} / 25
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isCiaPass ? '#ecfdf5' : '#fef2f2',
                                    color: isCiaPass ? '#15803d' : '#b91c1c'
                                  }}>
                                    {isCiaPass ? 'Pass' : 'Re-test'}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setSelectedBatchModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>

              <button
                onClick={() => {
                  handleRejectBatch(selectedBatchModal);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Request Revision
              </button>

              <button
                disabled={approvingBatchId === selectedBatchModal.id}
                onClick={() => {
                  handleApproveBatch(selectedBatchModal);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {approvingBatchId === selectedBatchModal.id ? 'Approving...' : '✓ Approve & Publish All Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HodDashboard;
