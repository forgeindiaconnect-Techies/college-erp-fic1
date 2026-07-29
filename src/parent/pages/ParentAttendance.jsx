import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, ShieldAlert, CheckCircle, Search, ArrowLeft, Calendar } from 'lucide-react';
import { getAttendanceByStudent } from '../../api/index';
import '../../student/pages/StudentAttendance.css';

// Fallbacks
const DEFAULT_PARENT_SESSION = {
  id: 'P001',
  name: 'James Doe',
  childName: 'John Doe',
  referenceId: 'CS2022001',
  email: 'parent_john@college.edu'
};

const ParentAttendance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [parentSession, setParentSession] = useState(DEFAULT_PARENT_SESSION);

  // Dynamic state
  const [attendancePercent, setAttendancePercent] = useState(85);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('parent_session');
    let activeSession = DEFAULT_PARENT_SESSION;
    if (session) {
      activeSession = JSON.parse(session);
      setParentSession(activeSession);
    } else {
      navigate('/parent/login');
      return;
    }

    const loadAttendance = async () => {
      try {
        let studentId = activeSession.parentOf || activeSession.referenceId || activeSession.childId;
        if (studentId && studentId.length === 24 && /^[0-9a-fA-F]{24}$/.test(studentId)) {
          const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
          const match = erpStudents.find(s => s._id === studentId || s.id === studentId);
          if (match && match.id) studentId = match.id;
        }
        
        const res = await getAttendanceByStudent(studentId);
        
        if (res?.data && res.data.length > 0) {
          const records = res.data;
          const presentCount = records.filter(r => r.status?.toLowerCase() === 'present').length;
          const totalDays = records.length;
          const percent = Math.round((presentCount / totalDays) * 100);

          setAttendancePercent(percent);

          const logs = records.map(r => ({
            date: new Date(r.date).toLocaleDateString('en-CA'),
            subject: r.subject || 'All Subjects',
            status: r.status?.toLowerCase() || 'present'
          }));
          // Sort descending by date
          logs.sort((a, b) => new Date(b.date) - new Date(a.date));
          setAttendanceLogs(logs);
        } else {
          // Fallback to local percentage if no daily logs exist
          const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
          const localMatch = erpStudents.find(s => s.rollNo === studentId || s.id === studentId);
          if (localMatch && localMatch.attendance) {
            const parsed = parseInt(String(localMatch.attendance).replace('%', '').trim());
            if (!isNaN(parsed)) setAttendancePercent(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to fetch backend child attendance for parent:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [navigate]);

  return (
    <div className="student-attendance-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          
          <div>
            <h1>Child Attendance History</h1>
            <p className="text-muted">Track {parentSession.childName || 'your child'}'s daily roll call sheets and aggregate metrics.</p>
          </div>
        </div>
      </div>

      {/* Aggregate Banner */}
      <div className="glass-card attendance-hero-card">
        <div className="hero-progress-circle-wrapper">
          <div className="hero-progress-text">
            <h2>{attendancePercent}%</h2>
            <span>Attendance</span>
          </div>
        </div>
        <div className="hero-details">
          <h3>Your Child's Attendance Summary</h3>
          <p className="text-muted">You can monitor their registered attendance levels for the current semester here.</p>
          <div className="summary-status-tag-row">
            {attendancePercent >= 75 ? (
              <span className="badge-success-s"><CheckCircle size={14} /> Safe Zone</span>
            ) : (
              <span className="badge-danger-s"><ShieldAlert size={14} /> Shortage Warning (Below 75%)</span>
            )}
            <span className="badge-neutral-s">Required: 75%</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card table-section-card-s">
        <div className="table-header-row-s">
          <h3>Daily Log Sheet</h3>
          <div className="search-box-attendance">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search by subject or date..." disabled style={{ opacity: 0.6 }} />
          </div>
        </div>

        <div className="table-container-s">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Subject Taught</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '20px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">No daily logs found.</td>
                </tr>
              ) : (
                attendanceLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>
                      <div className="date-cell">
                        <Calendar size={13} className="text-muted" />
                        <span>{log.date}</span>
                      </div>
                    </td>
                    <td><span className="font-semibold">{log.subject}</span></td>
                    <td>
                      <span className={`status-badge-cell ${log.status}`}>
                        {log.status === 'present' ? '✓ Present' : '⚠ Absent'}
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

export default ParentAttendance;
