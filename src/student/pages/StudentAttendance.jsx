import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, ShieldAlert, CheckCircle, Search, ArrowLeft, Calendar, BookOpen, Clock, User, XCircle, FileText } from 'lucide-react';
import { getAttendanceByStudent, getSubjects } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentAttendance.css';

const DEFAULT_STUDENT = {
  id: '',
  name: 'Student',
  dept: '',
  sem: 'Semester 1',
  email: ''
};

const StudentAttendance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);

  // Dynamic states
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [subjectWise, setSubjectWise] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [analytics, setAnalytics] = useState({
    total: 0,
    present: 0,
    absent: 0,
    leave: 0,
    percentage: 0
  });

  const fetchAttendanceData = React.useCallback(async (studentId) => {
    try {
      if (!studentId) return;

      let finalId = studentId;
      if (studentId.length === 24 && /^[0-9a-fA-F]{24}$/.test(studentId)) {
        const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
        const match = erpStudents.find(s => s._id === studentId || s.id === studentId);
        if (match && match.id) {
          finalId = match.id;
        }
      }

      let apiData = [];
      let subjectsMapFromApi = {};
      try {
        const [res, subjRes] = await Promise.all([
          getAttendanceByStudent(finalId),
          getSubjects().catch(() => ({ data: [] }))
        ]);
        if (res && res.data) apiData = res.data;
        if (subjRes && subjRes.data) {
          subjRes.data.forEach(s => {
            if (s._id) subjectsMapFromApi[s._id] = s.subjectName || s.name;
          });
        }
      } catch (apiErr) {
        console.error('API fetch failed, falling back to local storage:', apiErr);
      }

      // Merge with localStorage
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const localAttendance1 = JSON.parse(localStorage.getItem(`erp_attendance_${tenantId}`) || '[]');
      const localAttendance2 = tenantId !== 'mock_college_id' ? JSON.parse(localStorage.getItem(`erp_attendance_mock_college_id`) || '[]') : [];
      const localAttendance = [...localAttendance1, ...localAttendance2];

      const finalName = studentSession?.name ? studentSession.name.toLowerCase() : '';
      const localRecords = localAttendance.filter(r => 
        r.studentId === finalId || 
        r.studentId === studentId || 
        (r.studentName && finalName && r.studentName.toLowerCase() === finalName)
      );
      
      const allRecords = [...apiData, ...localRecords];
      // Deduplicate by _id
      const records = [];
      const seenIds = new Set();
      allRecords.forEach(r => {
        if (!seenIds.has(r._id)) {
          seenIds.add(r._id);
          records.push(r);
        }
      });

      const resolveSubjectName = (r) => {
        if (r.subjectName && !/^[0-9a-fA-F]{24}$/.test(r.subjectName)) return r.subjectName;
        if (r.subject && !/^[0-9a-fA-F]{24}$/.test(r.subject)) return r.subject;
        if (typeof r.subjectId === 'object' && r.subjectId?.subjectName) return r.subjectId.subjectName;
        if (r.subjectId && subjectsMapFromApi[r.subjectId]) return subjectsMapFromApi[r.subjectId];
        return r.subjectCode || 'General Lecture';
      };

      if (records.length > 0) {
        // Basic Analytics
        const totalDays = records.length;
        const presentCount = records.filter(r => r.status?.toLowerCase() === 'present').length;
        if (records.length > 0) {
          const totalDays = records.length;
          const presentCount = records.filter(r => r.status?.toLowerCase() === 'present').length;
          const absentCount = records.filter(r => r.status?.toLowerCase() === 'absent').length;
          const leaveCount = records.filter(r => r.status?.toLowerCase() === 'leave').length;
          const percentage = Math.round((presentCount / totalDays) * 100);

          setAnalytics({
            total: totalDays,
            present: presentCount,
            absent: absentCount,
            leave: leaveCount,
            percentage
          });

          // Daily Logs with rich period and faculty context
          const logs = records.map(r => {
            let facultyName = r.markedBy;
            if (!facultyName || facultyName === 'System') {
              facultyName = r.facultyName || r.staffName || 'Allocated Faculty';
            }

            let periodNameStr = r.periodName;
            if (!periodNameStr && r.periodId) {
              const pid = typeof r.periodId === 'object' ? (r.periodId?.periodName || '') : String(r.periodId);
              if (pid.length < 20) periodNameStr = pid;
            }
            if (!periodNameStr) periodNameStr = 'Period 3';
            const cleanPeriod = periodNameStr.toLowerCase().includes('period') ? periodNameStr : `Period ${periodNameStr}`;
            
            const timeRange = r.timeRange || (typeof r.periodId === 'object' && r.periodId?.startTime ? `${r.periodId.startTime} – ${r.periodId.endTime}` : '11:00 AM – 11:50 AM');
            const roomNo = r.roomNo ? (r.roomNo.toLowerCase().includes('room') ? r.roomNo : `Room ${r.roomNo}`) : 'Room C101';
            const classInfo = `${r.semester || studentSession?.sem || 'Semester 2'} Sec ${r.section || 'A'}`.trim();

            return {
              id: r._id || Math.random(),
              date: new Date(r.attendanceDate || r.date).toLocaleDateString('en-GB').replace(/\//g, '-'),
              rawDate: new Date(r.attendanceDate || r.date),
              subject: resolveSubjectName(r),
              periodName: cleanPeriod,
              timeRange: timeRange,
              classInfo: classInfo,
              roomNo: roomNo,
              status: r.status?.toLowerCase() || 'present',
              faculty: facultyName
            };
          });
          logs.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
          setAttendanceLogs(logs);

          // Subject-Wise Aggregation
          const subjectsMap = {};
          records.forEach(r => {
            const sub = resolveSubjectName(r);
            const code = r.subjectCode || '';
            if (!subjectsMap[sub]) {
              subjectsMap[sub] = { 
                subject: sub, 
                subjectCode: code,
                total: 0, 
                present: 0, 
                absent: 0, 
                leave: 0 
              };
            }
            if (!subjectsMap[sub].subjectCode && code) {
              subjectsMap[sub].subjectCode = code;
            }
            subjectsMap[sub].total += 1;
            const st = r.status?.toLowerCase();
            if (st === 'present') {
              subjectsMap[sub].present += 1;
            } else if (st === 'leave') {
              subjectsMap[sub].leave += 1;
            } else {
              subjectsMap[sub].absent += 1;
            }
          });
          
          const subArray = Object.values(subjectsMap).map(sub => {
            const pct = sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0;
            let status = 'safe';
            let statusLabel = 'Eligible (Safe)';
            let advice = '';

            if (pct >= 75) {
              status = 'safe';
              statusLabel = 'Eligible (≥75%)';
              const margin = Math.floor((sub.present - 0.75 * sub.total) / 0.75);
              advice = margin > 0 
                ? `✓ Can miss up to ${margin} class${margin > 1 ? 'es' : ''} safely.`
                : '✓ On track for exam hall ticket.';
            } else if (pct >= 65) {
              status = 'warning';
              statusLabel = 'Warning (65–74%)';
              const needed = Math.ceil((0.75 * sub.total - sub.present) / 0.25);
              advice = `⚠ Attend next ${needed} class${needed > 1 ? 'es' : ''} to reach 75%.`;
            } else {
              status = 'danger';
              statusLabel = 'Shortage (<65%)';
              const needed = Math.ceil((0.75 * sub.total - sub.present) / 0.25);
              advice = `⛔ Shortage! Need ${needed} class${needed > 1 ? 'es' : ''} for 75%.`;
            }

            return {
              ...sub,
              percent: pct,
              status,
              statusLabel,
              advice
            };
          });
          setSubjectWise(subArray.sort((a, b) => b.percent - a.percent));

          // Monthly Aggregation
          const monthsMap = {};
          records.forEach(r => {
            const d = new Date(r.attendanceDate || r.date);
            const year = d.getFullYear();
            const monthIdx = d.getMonth();
            const monthStr = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            const dateKey = `${year}-${monthIdx + 1}-${d.getDate()}`;
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

            if (!monthsMap[monthStr]) {
              monthsMap[monthStr] = { 
                month: monthStr, 
                year,
                daysInMonth,
                distinctDates: new Set(),
                presentDates: new Set(),
                absentDates: new Set(),
                totalPeriods: 0, 
                presentPeriods: 0, 
                absentPeriods: 0,
                leavePeriods: 0,
                sortKey: d.getTime() 
              };
            }
            monthsMap[monthStr].distinctDates.add(dateKey);
            monthsMap[monthStr].totalPeriods += 1;
            const st = r.status?.toLowerCase();
            if (st === 'present') {
              monthsMap[monthStr].presentDates.add(dateKey);
              monthsMap[monthStr].presentPeriods += 1;
            } else if (st === 'leave') {
              monthsMap[monthStr].leavePeriods += 1;
            } else {
              monthsMap[monthStr].absentDates.add(dateKey);
              monthsMap[monthStr].absentPeriods += 1;
            }
          });

          const monthArray = Object.values(monthsMap).map(m => {
            const workingDaysConducted = m.distinctDates.size;
            const presentDays = m.presentDates.size;
            const absentDays = m.absentDates.size;
            const pct = m.totalPeriods > 0 ? Math.round((m.presentPeriods / m.totalPeriods) * 100) : 0;
            
            let status = 'safe';
            let rating = 'On Track';
            if (pct >= 90) {
              status = 'safe';
              rating = '🌟 Perfect (100%)';
            } else if (pct >= 75) {
              status = 'safe';
              rating = '✅ Good Standing';
            } else if (pct >= 65) {
              status = 'warning';
              rating = '⚠️ Moderate';
            } else {
              status = 'danger';
              rating = '❌ Low Rate';
            }

            return {
              month: m.month,
              daysInMonth: m.daysInMonth,
              workingDaysConducted,
              presentDays,
              absentDays,
              totalPeriods: m.totalPeriods,
              presentPeriods: m.presentPeriods,
              absentPeriods: m.absentPeriods,
              percent: pct,
              status,
              rating,
              sortKey: m.sortKey
            };
          });
          setMonthly(monthArray.sort((a, b) => b.sortKey - a.sortKey));
        } else {
          setAnalytics({ total: 0, present: 0, absent: 0, leave: 0, percentage: 0 });
          setAttendanceLogs([]);
          setSubjectWise([]);
          setMonthly([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [studentSession?.name, studentSession?.sem]);

  useEffect(() => {
    // Session check
    const session = sessionStorage.getItem('student_session');
    if (session) {
      const activeStud = JSON.parse(session);
      setStudentSession(activeStud);
      fetchAttendanceData(activeStud.id);
    } else {
      navigate('/login');
    }
  }, [navigate, fetchAttendanceData]);

  // Real-time sync for attendance
  useRealtimeSync(() => {
    if (studentSession?.id) fetchAttendanceData(studentSession.id);
  }, ['attendance']);

  const getProgressClass = (pct) => {
    if (pct >= 75) return 'safe';
    if (pct >= 65) return 'warning';
    return 'danger';
  };

  return (
    <div className="student-attendance-page animate-fade-in">
      {/* Header */}
      <div className="attendance-header-s">
        <div>
          <h2><CalendarCheck size={24} color="#6366F1" /> My Attendance Dashboard</h2>
          <p>Track your subject-wise thresholds, monthly progress, and daily logs in real-time.</p>
        </div>
        <div className="student-info-pill">
          <User size={16} />
          <span>{studentSession.name} ({studentSession.dept})</span>
        </div>
      </div>

      {/* Warning Alert if Attendance < 75% */}
      {analytics.percentage < 75 && analytics.total > 0 && (
        <div className="glass-card attendance-alert-card">
          <ShieldAlert size={28} className="alert-icon" />
          <div>
            <h4>Attendance Shortage Warning ({analytics.percentage}%)</h4>
            <p>Your current attendance is below the mandatory <strong>75% hall ticket threshold</strong>. Please meet your HOD or Class Advisor immediately.</p>
          </div>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="analytics-grid">
        <div className="glass-card analytics-card primary">
          <span>OVERALL PERCENTAGE</span>
          <h2>{analytics.percentage}%</h2>
        </div>
        <div className="glass-card analytics-card info">
          <span>TOTAL WORKING DAYS</span>
          <h2>{analytics.total}</h2>
        </div>
        <div className="glass-card analytics-card success">
          <span>PRESENT DAYS</span>
          <h2>{analytics.present}</h2>
        </div>
        <div className="glass-card analytics-card danger">
          <span>ABSENT DAYS</span>
          <h2>{analytics.absent}</h2>
        </div>
        <div className="glass-card analytics-card warning">
          <span>APPROVED LEAVES</span>
          <h2>{analytics.leave}</h2>
        </div>
      </div>

      <div className="attendance-tables-grid">
        {/* Subject-Wise Table */}
        <div className="glass-card table-section-card-s">
          <div className="table-header-row-s">
            <div>
              <h3><BookOpen size={18} color="#6366F1" /> Subject-Wise Attendance</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Subject-level lecture counts, percentage, and 75% exam eligibility status.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, color: '#334155' }}>
              {subjectWise.length} Subject{subjectWise.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="table-container-s">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '140px' }}>SUBJECT</th>
                  <th style={{ minWidth: '100px' }}>CLASSES</th>
                  <th style={{ minWidth: '120px' }}>PERCENTAGE</th>
                  <th style={{ minWidth: '150px' }}>EXAM ELIGIBILITY</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-4">Loading subjects...</td></tr>
                ) : subjectWise.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4">No subject data available.</td></tr>
                ) : (
                  subjectWise.map((sub, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="subject-cell-title font-bold">
                          {sub.subject}
                          {sub.subjectCode && <span className="subj-code-tag">{sub.subjectCode}</span>}
                        </div>
                        <div className="subject-cell-subtitle">
                          {sub.total} Total Session{sub.total !== 1 ? 's' : ''} Conducted
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          {sub.present} / {sub.total}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: sub.absent > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                          {sub.absent > 0 ? `${sub.absent} Missed` : '0 Missed'}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold" style={{ color: sub.percent >= 75 ? '#10b981' : sub.percent >= 65 ? '#f59e0b' : '#ef4444', fontWeight: 800, fontSize: '0.95rem' }}>
                          {sub.percent}%
                        </div>
                        <div className="progress-bar-bg">
                          <div className={`progress-bar-fill ${getProgressClass(sub.percent)}`} style={{ width: `${Math.min(sub.percent, 100)}%` }}></div>
                        </div>
                      </td>
                      <td>
                        <span className={`eligibility-pill ${sub.status}`}>
                          {sub.status === 'safe' ? '🟢 ' : sub.status === 'warning' ? '🟡 ' : '🔴 '}
                          {sub.statusLabel}
                        </span>
                        <div className={`advice-subtext ${sub.status}`}>
                          {sub.advice}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Progress Table */}
        <div className="glass-card table-section-card-s">
          <div className="table-header-row-s">
            <div>
              <h3><Calendar size={18} color="#6366F1" /> Monthly Progress</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Monthly classes held vs. attended breakdown.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, color: '#334155' }}>
              {monthly.length} Month{monthly.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="table-container-s">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '120px' }}>MONTH</th>
                  <th style={{ minWidth: '110px' }}>CLASSES HELD</th>
                  <th style={{ minWidth: '110px' }}>ATTENDED</th>
                  <th style={{ minWidth: '130px' }}>PERCENTAGE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-4">Loading monthly breakdown...</td></tr>
                ) : monthly.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4">No monthly records logged yet.</td></tr>
                ) : (
                  monthly.map((m, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="font-semibold" style={{ fontWeight: 800, color: '#0f172a' }}>{m.month}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Active Academic Month</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          {m.totalPeriods} Class{m.totalPeriods !== 1 ? 'es' : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          Total Held
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981' }}>
                          {m.presentPeriods} Present
                        </div>
                        <div style={{ fontSize: '0.72rem', color: m.absentPeriods > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                          {m.absentPeriods > 0 ? `${m.absentPeriods} Absent` : '0 Absent'}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold" style={{ color: m.percent >= 75 ? '#10b981' : m.percent >= 65 ? '#f59e0b' : '#ef4444', fontWeight: 800, fontSize: '0.95rem' }}>
                          {m.percent}%
                        </div>
                        <div className="progress-bar-bg">
                          <div className={`progress-bar-fill ${getProgressClass(m.percent)}`} style={{ width: `${Math.min(m.percent, 100)}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Clear Attendance Explanation & Policy Card */}
      <div className="attendance-guide-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#475569" />
          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
            Understanding Your Attendance & Exam Hall Ticket Eligibility
          </h4>
        </div>
        <div className="guide-grid">
          <div className="guide-item">
            <div className="guide-dot safe"></div>
            <div>
              <h5>≥ 75% - Safe & Eligible</h5>
              <p>Unconditionally eligible to write end-semester university exams. Hall ticket generated automatically.</p>
            </div>
          </div>
          <div className="guide-item">
            <div className="guide-dot warning"></div>
            <div>
              <h5>65% to 74% - Condonation Range</h5>
              <p>Requires medical certificates or condonation fee approval from HOD and Principal to appear for exams.</p>
            </div>
          </div>
          <div className="guide-item">
            <div className="guide-dot danger"></div>
            <div>
              <h5>&lt; 65% - Critical Shortage / Debarred</h5>
              <p>Strictly not permitted to appear for semester exams as per university regulations. Must attend remedial sessions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Attendance Logs */}
      <div className="glass-card table-section-card-s mt-6">
        <div className="table-header-row-s" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={20} color="#6366F1" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Daily Period Attendance Logs</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Detailed record of each attended teaching period, subject, timing, venue, and faculty.</p>
            </div>
          </div>

          <span style={{ fontSize: '0.75rem', background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.25rem 0.75rem', borderRadius: '8px', fontWeight: 700, color: '#334155' }}>
            {attendanceLogs.length} Total Log{attendanceLogs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="table-container-s">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: '105px' }}>DATE</th>
                <th style={{ minWidth: '150px' }}>PERIOD & TIMING</th>
                <th style={{ minWidth: '140px' }}>SUBJECT</th>
                <th style={{ minWidth: '140px' }}>CLASS & VENUE</th>
                <th style={{ minWidth: '130px' }}>FACULTY</th>
                <th style={{ minWidth: '110px', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">Loading daily logs...</td></tr>
              ) : attendanceLogs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4">No daily logs recorded yet.</td></tr>
              ) : (
                attendanceLogs.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td className="font-semibold" style={{ color: '#0f172a' }}>
                      <div style={{ fontWeight: 800 }}>{log.date}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#1d4ed8' }}>{log.periodName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{log.timeRange}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{log.subject}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.78rem' }}>{log.classInfo}</div>
                      <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>📍 {log.roomNo}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#334155' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e0e7ff', color: '#3730A5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                          {log.faculty.charAt(0).toUpperCase()}
                        </span>
                        <span>{log.faculty}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge-att ${log.status}`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: log.status === 'present' ? '#dcfce7' : log.status === 'absent' ? '#fee2e2' : '#fef3c7',
                        color: log.status === 'present' ? '#15803d' : log.status === 'absent' ? '#b91c1c' : '#b45309',
                        border: `1px solid ${log.status === 'present' ? '#bbf7d0' : log.status === 'absent' ? '#fecaca' : '#fde68a'}`
                      }}>
                        {log.status === 'present' ? 'Present ✅' : log.status === 'absent' ? 'Absent ❌' : 'On Leave 📝'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default StudentAttendance;
