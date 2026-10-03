import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, GraduationCap, BookOpen, TrendingUp, Download, Calendar, 
  Printer, CheckCircle2, AlertCircle, IndianRupee, ShieldCheck, Award, 
  FileBarChart, RefreshCw, Search, Layers, UserCheck, Clock
} from 'lucide-react';
import { getStudents, getStaff, getSubjects, getAllAttendance, getAllFees } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept:'Computer Science', name:'HOD' }; }
  catch { return { dept:'Computer Science', name:'HOD' }; }
};

const isSameDepartment = (candidateDept, hodDept) => {
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

  return cTokens.some(t => hTokens.includes(t) && !['engineering', 'department', 'dept', 'of'].includes(t));
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const HodReports = () => {
  const hod = getHodSession();
  const DEPT = hod.dept || hod.department || 'Computer Science';

  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [fees, setFees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'students', 'fees', 'faculty'
  const [search, setSearch] = useState('');

  const fetchData = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const [stuRes, staffRes, subRes, attRes, feesRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getSubjects({ dept: DEPT }).catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] })),
        getAllFees().catch(() => ({ data: [] }))
      ]);

      // 1. Students
      let rawStudents = Array.isArray(stuRes.data) ? stuRes.data : (stuRes.data?.students || []);
      if (rawStudents.length === 0) {
        try {
          const local = localStorage.getItem(`erp_students_${tenantId}`) || localStorage.getItem('erp_students') || localStorage.getItem('students');
          if (local) rawStudents = JSON.parse(local);
        } catch {}
      }
      const deptStudents = rawStudents.filter(s => isSameDepartment(s.dept || s.department || s.course || s.branch, DEPT));
      setStudents(deptStudents);

      // 2. Staff
      const rawStaff = Array.isArray(staffRes.data) ? staffRes.data : [];
      setStaff(rawStaff.filter(s => isSameDepartment(s.dept || s.department, DEPT)));

      // 3. Subjects
      const rawSubs = Array.isArray(subRes.data) ? subRes.data : [];
      setSubjects(rawSubs);

      // 4. Attendance
      const rawAtt = Array.isArray(attRes.data) ? attRes.data : [];
      setAttendance(rawAtt.filter(a => isSameDepartment(a.department || a.dept, DEPT)));

      // 5. Fees
      let rawFees = Array.isArray(feesRes.data) ? feesRes.data : [];
      if (rawFees.length === 0) {
        try {
          const localF = localStorage.getItem('erp_fees');
          if (localF) rawFees = JSON.parse(localF);
        } catch {}
      }
      setFees(rawFees);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load HOD reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [DEPT]);

  useRealtimeSync(() => fetchData(false), ['students', 'staff', 'fees', 'attendance', 'subjects']);

  // --- Real Derived Metrics ---
  const totalStudents = students.length;
  const totalStaff = staff.length;
  const totalSubjects = subjects.length;

  const avgAttendance = useMemo(() => {
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => {
      const val = parseFloat(String(s.attendance || 0).replace(/[^0-9.]/g, '')) || 0;
      return acc + val;
    }, 0);
    return Math.round(sum / students.length);
  }, [students]);

  const avgCgpa = useMemo(() => {
    if (students.length === 0) return '0.00';
    const sum = students.reduce((acc, s) => acc + (Number(s.cgpa) || 0), 0);
    return (sum / students.length).toFixed(2);
  }, [students]);

  // Real Department Fee Metrics (Accurate calculation)
  const feeMetrics = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    students.forEach(st => {
      const sId = st.id || st._id || st.rollNo;
      const studentReceipts = fees.filter(f => f.studentId === sId || (st.name && f.studentName?.toLowerCase() === st.name.toLowerCase()));
      const billed = Number(st.totalFees ?? st.totalFee ?? 45000);
      
      let paid = studentReceipts.reduce((sum, r) => sum + (Number(r.paidAmount ?? r.amount ?? r.paid ?? 0) || 0), 0);
      const feeStatusLower = String(st.feeStatus || '').toLowerCase();

      if (paid === 0) {
        if (st.paidAmount !== undefined && st.paidAmount !== null && st.paidAmount !== '') {
          paid = Number(st.paidAmount);
        } else if (feeStatusLower === 'paid' || feeStatusLower === 'waived') {
          paid = billed;
        } else if (feeStatusLower === 'partial') {
          paid = Math.round(billed * 0.5);
        } else {
          paid = 0;
        }
      }

      let rem = 0;
      if (feeStatusLower === 'paid' || feeStatusLower === 'waived') {
        rem = 0;
        paid = billed;
      } else if (st.remainingFee !== undefined && st.remainingFee !== null && st.remainingFee !== '') {
        rem = Number(st.remainingFee);
      } else {
        rem = Math.max(billed - paid, 0);
      }

      totalBilled += billed;
      totalPaid += paid;
      totalPending += rem;

      if (paid >= billed || rem === 0 || feeStatusLower === 'paid') paidCount++;
      else if (paid > 0) partialCount++;
      else unpaidCount++;
    });

    const recoveryRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

    return {
      totalBilled,
      totalPaid,
      totalPending,
      paidCount,
      partialCount,
      unpaidCount,
      recoveryRate
    };
  }, [students, fees]);

  // Real Semester CGPA breakdown from actual students
  const semesterCgpaData = useMemo(() => {
    const semMap = {};
    for (let i = 1; i <= 8; i++) {
      semMap[`Sem ${i}`] = { sem: `Sem ${i}`, count: 0, sum: 0 };
    }

    students.forEach(s => {
      const rawSem = s.sem || s.semester || 'Sem 1';
      const cleanSem = rawSem.startsWith('Sem') ? rawSem : `Sem ${rawSem.replace(/[^0-9]/g, '') || 1}`;
      if (semMap[cleanSem]) {
        semMap[cleanSem].count += 1;
        semMap[cleanSem].sum += (Number(s.cgpa) || 0);
      }
    });

    return Object.values(semMap)
      .filter(item => item.count > 0)
      .map(item => ({
        sem: item.sem,
        avg: Number((item.sum / item.count).toFixed(2)),
        students: item.count
      }));
  }, [students]);

  // Real Monthly Attendance Trend from actual attendance logs
  const monthlyAttendanceData = useMemo(() => {
    const monthMap = {};
    MONTH_NAMES.forEach(m => { monthMap[m] = { month: m, total: 0, present: 0 }; });

    attendance.forEach(a => {
      const d = new Date(a.date || a.createdAt);
      if (!isNaN(d.getTime())) {
        const mName = MONTH_NAMES[d.getMonth()];
        monthMap[mName].total += 1;
        if (['Present', 'Late'].includes(a.status)) {
          monthMap[mName].present += 1;
        }
      }
    });

    const recorded = Object.values(monthMap).filter(item => item.total > 0);
    if (recorded.length > 0) {
      return recorded.map(item => ({
        month: item.month,
        att: Math.round((item.present / item.total) * 100)
      }));
    }

    // If live attendance records are for current month
    const currentMonth = MONTH_NAMES[new Date().getMonth()];
    return [
      { month: currentMonth, att: avgAttendance }
    ];
  }, [attendance, avgAttendance]);

  // Fee Status Donut Data
  const feeStatusDonut = useMemo(() => {
    return [
      { name: 'Fully Cleared', value: feeMetrics.paidCount, color: '#16a34a' },
      { name: 'Partial Dues', value: feeMetrics.partialCount, color: '#f59e0b' },
      { name: 'Critical Unpaid', value: feeMetrics.unpaidCount, color: '#e11d48' }
    ].filter(item => item.value > 0);
  }, [feeMetrics]);

  // Filtered Student List for tab view
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s => 
      (s.name || '').toLowerCase().includes(q) || 
      String(s.rollNo || s.id || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  // Print Official PDF Audit Report
  const handlePrintAudit = () => {
    const win = window.open('', '_blank', 'width=950,height=850');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Department Real-time Audit Report — ${DEPT}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; }
          .sub { font-size: 11px; color: #475569; margin: 4px 0 0 0; }
          .badge { display: inline-block; background: #0f172a; color: #fff; padding: 3px 10px; font-size: 10px; font-weight: 700; border-radius: 4px; margin-top: 8px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
          .kpi-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; }
          .kpi-box strong { display: block; font-size: 9px; color: #64748b; text-transform: uppercase; }
          .kpi-box span { font-size: 16px; font-weight: 800; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #475569; }
          td { border: 1px solid #e2e8f0; padding: 6px 10px; }
          .sig-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 50px; text-align: center; font-size: 11px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Marudhar Kesari Jain College for Women</h1>
          <p class="sub">Department of ${DEPT} — Real-Time Academic, Attendance & Financial Performance Audit</p>
          <div class="badge">Official Department Audit Report</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box"><strong>Enrolled Scholars</strong><span>${totalStudents}</span></div>
          <div class="kpi-box"><strong>Faculty Members</strong><span>${totalStaff}</span></div>
          <div class="kpi-box"><strong>Average Attendance</strong><span>${avgAttendance}%</span></div>
          <div class="kpi-box"><strong>Department CGPA</strong><span>${avgCgpa}</span></div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box"><strong>Total Billed Fee</strong><span>₹${feeMetrics.totalBilled.toLocaleString('en-IN')}</span></div>
          <div class="kpi-box"><strong>Fee Realized</strong><span style="color: #16a34a;">₹${feeMetrics.totalPaid.toLocaleString('en-IN')}</span></div>
          <div class="kpi-box"><strong>Pending Dues</strong><span style="color: #e11d48;">₹${feeMetrics.totalPending.toLocaleString('en-IN')}</span></div>
          <div class="kpi-box"><strong>Recovery Rate</strong><span>${feeMetrics.recoveryRate}%</span></div>
        </div>

        <h3>Enrolled Scholars Roster & Academic Standing</h3>
        <table>
          <thead>
            <tr><th>Roll No</th><th>Student Name</th><th>Semester</th><th>CGPA</th><th>Attendance</th><th>Fee Status</th></tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td>${s.rollNo || s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.sem || s.semester || 'Sem 1'}</td>
                <td>${s.cgpa || '0.00'}</td>
                <td>${s.attendance || '0%'}</td>
                <td>${s.feeStatus || (feeMetrics.unpaidCount > 0 ? 'Pending' : 'Paid')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="sig-row">
          <div><br><br>Head of Department (HOD)</div>
          <div><br><br>Academic Dean</div>
          <div><br><br>Principal / Authorized Signatory</div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `DEPARTMENT OF ${DEPT.toUpperCase()} - ACADEMIC & FINANCIAL AUDIT REPORT\n`;
    csv += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;
    csv += `Total Students,${totalStudents}\n`;
    csv += `Total Faculty,${totalStaff}\n`;
    csv += `Average Attendance,${avgAttendance}%\n`;
    csv += `Department CGPA Index,${avgCgpa}\n`;
    csv += `Total Billed Fee (INR),${feeMetrics.totalBilled}\n`;
    csv += `Total Realized Fee (INR),${feeMetrics.totalPaid}\n`;
    csv += `Pending Dues (INR),${feeMetrics.totalPending}\n`;
    csv += `Fee Recovery Rate,${feeMetrics.recoveryRate}%\n\n`;

    csv += '--- STUDENT ROSTER ---\n';
    csv += 'Roll No,Student Name,Semester,Section,CGPA,Attendance,Fee Status,Phone\n';
    students.forEach(s => {
      csv += `"${s.rollNo || s.id}","${s.name}","${s.sem || 'Sem 1'}","${s.section || 'A'}",${s.cgpa || 0},"${s.attendance || '0%'}","${s.feeStatus || 'Paid'}","${s.phone || 'N/A'}"\n`;
    });

    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${DEPT.replace(/\s+/g, '_')}_Department_Audit_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Top Header & Audit Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileBarChart size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Real-time Department Audit & Intelligence — {DEPT}
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Consolidated real-time metrics across academics, attendance, faculty workload, and fee recovery.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={() => fetchData(false)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
          <button 
            type="button" 
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button 
            type="button" 
            onClick={handlePrintAudit}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
          >
            <Printer size={15} /> Print Audit (PDF)
          </button>
        </div>
      </div>

      {/* 4-Card Executive KPI Metrics Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        
        {/* KPI 1 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bfdbfe', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Enrolled Students</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {totalStudents}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Verified {DEPT} scholars
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Department Staff</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {totalStaff}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            Teaching Faculty Assigned
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #ddd6fe', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Avg Attendance</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            {avgAttendance}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
            Real-time Class Attendance
          </div>
        </div>

        {/* KPI 4 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Department CGPA</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(217,119,6,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            {avgCgpa}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px', fontWeight: 600 }}>
            Academic Performance Index
          </div>
        </div>
      </div>

      {/* 4-Card Executive KPI Metrics Row 2 (Fee Recovery) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Total Billed Commitment</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
            ₹{feeMetrics.totalBilled.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)' }}>Student fee invoices</div>
        </div>

        <div style={{ background: '#f0fdf4', padding: '14px 18px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Realized Revenue</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
            ₹{feeMetrics.totalPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>{feeMetrics.paidCount} Students Fully Paid</div>
        </div>

        <div style={{ background: '#fff7ed', padding: '14px 18px', borderRadius: '12px', border: '1px solid #fed7aa' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>Pending Balance Dues</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>
            ₹{feeMetrics.totalPending.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#ea580c', fontWeight: 600 }}>{feeMetrics.partialCount + feeMetrics.unpaidCount} Defaulters / In Progress</div>
        </div>

        <div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Department Recovery Rate</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
            {feeMetrics.recoveryRate}%
          </div>
          <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600 }}>Collection Efficiency</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color, #e2e8f0)', paddingBottom: '2px' }}>
        {[
          { key: 'overview', label: '📊 Executive Analytics & Trends' },
          { key: 'students', label: '🎓 Student Academic & Attendance Audit' },
          { key: 'fees', label: '💳 Department Fee Clearance Matrix' },
          { key: 'faculty', label: '👨‍🏫 Faculty Workload & Course Audit' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: activeTab === t.key ? '#2563eb' : 'var(--text-muted, #64748b)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === t.key ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s ease'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: Real Charts --- */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          
          {/* Semester-wise CGPA */}
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', padding: '24px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Semester-wise Academic CGPA
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Real-time score averages calculated from registered students
            </p>

            <div style={{ height: '240px', width: '100%' }}>
              {semesterCgpaData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #64748b)' }}>No semester CGPA data recorded.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={semesterCgpaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="sem" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" domain={[0, 10]} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      formatter={(v) => [`${v} CGPA`, 'Average']}
                      contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }} 
                    />
                    <Bar dataKey="avg" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Attendance Trend */}
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', padding: '24px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Attendance Performance Trend (%)
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Real percentage rates from submitted attendance logs
            </p>

            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip 
                    formatter={(v) => [`${v}%`, 'Attendance Rate']}
                    contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }} 
                  />
                  <Line type="monotone" dataKey="att" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: Student Academic & Attendance Table --- */}
      {activeTab === 'students' && (
        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '6px 12px', width: '320px' }}>
              <Search size={15} color="var(--text-muted, #64748b)" />
              <input 
                type="text" 
                placeholder="Search by student name or roll no..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.84rem', width: '100%' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Showing {filteredStudents.length} of {students.length} students
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Roll / Reg No</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Sem / Sec</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>CGPA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Attendance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{s.name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-muted, #64748b)' }}>{s.rollNo || s.id}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{s.sem || s.semester || 'Sem 1'} • {s.section || 'A'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>{s.cgpa || '0.00'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#15803d' }}>{s.attendance || '0%'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted, #64748b)' }}>{s.phone || s.email || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: Fee Clearance Matrix Table --- */}
      {activeTab === 'fees' && (
        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Student Name & ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Sem</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Fee (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Paid (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Remaining Due (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, idx) => {
                  const sId = st.id || st._id || st.rollNo;
                  const receipts = fees.filter(f => f.studentId === sId || (st.name && f.studentName?.toLowerCase() === st.name.toLowerCase()));
                  const billed = Number(st.totalFees ?? st.totalFee ?? 45000);
                  let paid = receipts.reduce((sum, r) => sum + (Number(r.paidAmount ?? r.amount ?? r.paid ?? 0) || 0), 0);
                  if (paid === 0 && st.paidAmount) paid = Number(st.paidAmount);
                  const rem = Number(st.remainingFee ?? Math.max(billed - paid, 0));
                  const isPaid = paid >= billed || rem === 0;

                  return (
                    <tr key={sId || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{st.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontFamily: 'monospace' }}>{st.rollNo || sId}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{st.sem || st.semester || 'Sem 1'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted, #64748b)' }}>₹{billed.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>₹{paid.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: rem > 0 ? '#c2410c' : '#15803d' }}>₹{rem.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: isPaid ? '#dcfce7' : paid > 0 ? '#fef3c7' : '#fee2e2',
                          color: isPaid ? '#15803d' : paid > 0 ? '#b45309' : '#b91c1c'
                        }}>
                          {isPaid ? '✓ Paid' : paid > 0 ? '⚡ Partial' : '⚠ Unpaid'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: Faculty & Course Workload --- */}
      {activeTab === 'faculty' && (
        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Faculty Member</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Designation</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Department</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Contact</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((f, idx) => (
                  <tr key={f._id || f.id || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{f.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted, #64748b)' }}>{f.designation || 'Faculty'}</td>
                    <td style={{ padding: '12px 16px' }}>{f.dept || f.department || DEPT}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted, #64748b)' }}>{f.email || f.phone || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.74rem' }}>
                        ✓ Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default HodReports;
