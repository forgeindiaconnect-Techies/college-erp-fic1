import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, ShieldAlert, CheckCircle, Search, ArrowLeft, Calendar, BookOpen, Clock, User, XCircle, FileText } from 'lucide-react';
import { getAttendanceByStudent, getSubjects } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentAttendance.css';

// Fallbacks
const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Computer Science',
  sem: 'Sem 6',
  email: 'john@college.edu'
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
      if (!studentId || studentId === 'CS2022001') return;

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
        return 'Database Management Systems';
      };

      if (records.length > 0) {
        // Basic Analytics
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

        // Daily Logs
        const logs = records.map(r => ({
          date: new Date(r.attendanceDate || r.date).toLocaleDateString('en-GB').replace(/\//g, '-'),
          subject: resolveSubjectName(r),
          status: r.status?.toLowerCase() || 'present',
          faculty: r.markedBy || 'System'
        }));
        logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceLogs(logs);

        // Subject-Wise Aggregation
        const subjectsMap = {};
        records.forEach(r => {
          const sub = resolveSubjectName(r);
          if (!subjectsMap[sub]) subjectsMap[sub] = { total: 0, present: 0 };
          subjectsMap[sub].total += 1;
          if (r.status?.toLowerCase() === 'present') subjectsMap[sub].present += 1;
        });
        
        const subArray = Object.keys(subjectsMap).map(sub => ({
          subject: sub,
          total: subjectsMap[sub].total,
          present: subjectsMap[sub].present,
          percent: Math.round((subjectsMap[sub].present / subjectsMap[sub].total) * 100)
        }));
        setSubjectWise(subArray.sort((a, b) => b.percent - a.percent));

        // Monthly Aggregation
        const monthsMap = {};
        records.forEach(r => {
          const d = new Date(r.attendanceDate || r.date);
          const monthStr = d.toLocaleString('default', { month: 'long', year: 'numeric' });
          if (!monthsMap[monthStr]) monthsMap[monthStr] = { total: 0, present: 0, sortKey: d.getTime() };
          monthsMap[monthStr].total += 1;
          if (r.status?.toLowerCase() === 'present') monthsMap[monthStr].present += 1;
        });

        const monthArray = Object.keys(monthsMap).map(m => ({
          month: m,
          sortKey: monthsMap[m].sortKey,
          percent: Math.round((monthsMap[m].present / monthsMap[m].total) * 100)
        }));
        setMonthly(monthArray.sort((a, b) => b.sortKey - a.sortKey));
      }
    } catch (err) {
      console.error('Failed to fetch student attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [studentSession]);

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
    if (pct >= 75) return 'high';
    if (pct >= 65) return 'medium';
    return 'low';
  };

  return (
    <div className="student-attendance-page animate-fade-in">
      {/* Header */}
      <div className="attendance-header-s">
        <div>
          <h2><CalendarCheck size={24} color="#6366F1" /> My Attendance Dashboard</h2>
          <p>Track your subject-wise thresholds, monthly progress, and daily logs.</p>
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
            <h3><BookOpen size={18} /> Subject-Wise Attendance</h3>
          </div>
          <div className="table-container-s">
            <table>
              <thead>
                <tr>
                  <th>SUBJECT</th>
                  <th>CLASSES ATTENDED</th>
                  <th>PERCENTAGE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="text-center py-4">Loading subjects...</td></tr>
                ) : subjectWise.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-4">No subject data available.</td></tr>
                ) : (
                  subjectWise.map((sub, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="subject-cell-title font-bold">{sub.subject}</div>
                        <div className="subject-cell-subtitle">Total Classes: {sub.total}</div>
                      </td>
                      <td className="font-semibold">{sub.present} / {sub.total}</td>
                      <td>
                        <div className="font-semibold" style={{ color: sub.percent >= 75 ? '#10b981' : sub.percent >= 65 ? '#f59e0b' : '#ef4444' }}>
                          {sub.percent}%
                        </div>
                        <div className="progress-bar-bg">
                          <div className={`progress-bar-fill ${getProgressClass(sub.percent)}`} style={{ width: `${sub.percent}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="glass-card table-section-card-s">
          <div className="table-header-row-s">
            <h3><Calendar size={18} /> Monthly Progress</h3>
          </div>
          <div className="table-container-s">
            <table>
              <thead>
                <tr>
                  <th>MONTH</th>
                  <th>PERCENTAGE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} className="text-center py-4">Loading monthly breakdown...</td></tr>
                ) : monthly.length === 0 ? (
                  <tr><td colSpan={2} className="text-center py-4">No monthly records.</td></tr>
                ) : (
                  monthly.map((m, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{m.month}</td>
                      <td>
                        <div className="font-semibold" style={{ color: m.percent >= 75 ? '#10b981' : m.percent >= 65 ? '#f59e0b' : '#ef4444' }}>
                          {m.percent}%
                        </div>
                        <div className="progress-bar-bg">
                          <div className={`progress-bar-fill ${getProgressClass(m.percent)}`} style={{ width: `${m.percent}%` }}></div>
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

      {/* Daily Attendance Logs */}
      <div className="glass-card table-section-card-s mt-6">
        <div className="table-header-row-s">
          <h3><Clock size={18} /> Daily Attendance Logs</h3>
        </div>
        <div className="table-container-s">
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>SUBJECT</th>
                <th>FACULTY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-4">Loading daily logs...</td></tr>
              ) : attendanceLogs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4">No daily logs recorded yet.</td></tr>
              ) : (
                attendanceLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="font-semibold">{log.date}</td>
                    <td>{log.subject}</td>
                    <td>{log.faculty}</td>
                    <td>
                      <span className={`status-badge-att ${log.status}`}>
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
