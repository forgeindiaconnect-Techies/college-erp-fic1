import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Calendar, Filter, UserCheck, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getStudents, createAttendance, getAllAttendance } from '../../api/index';
import './HodAttendance.css';

// Try to grab logged in HOD session
const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'Prof. Rajan Iyer', dept: 'Electrical Engg.', deptCode: 'EE', role: 'HOD'
    };
  } catch (e) {
    return { name: 'Prof. Rajan Iyer', dept: 'Electrical Engg.', deptCode: 'EE', role: 'HOD' };
  }
};

const MOCK_STUDENTS_FALLBACK = [];

const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

const HodAttendance = () => {
  const hodSession = getHodSession();
  const HOD_DEPT = hodSession.dept;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [semFilter, setSemFilter] = useState('All');
  
  /* Attendance marking states */
  const [selectedSem, setSelectedSem] = useState('Sem 4');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [markingDate, setMarkingDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSheet, setAttendanceSheet] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    fetchStudentsAndAttendance();
  }, []);

  const fetchStudentsAndAttendance = async () => {
    try {
      const [studRes, attRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] }))
      ]);

      const backendStudents = studRes.data || [];
      const backendAtt = attRes.data || [];
      setAllAttendance(backendAtt);

      const processed = backendStudents.map(s => {
        const studentRecords = backendAtt.filter(r => r.studentId === s.id || r.studentId === s._id || r.studentName === s.name);
        let attVal = 0;
        if (studentRecords.length > 0) {
          const presentCount = studentRecords.filter(r => r.status === 'Present').length;
          attVal = Math.round((presentCount / studentRecords.length) * 100);
        }
        return {
          ...s,
          attendance: attVal
        };
      });

      setStudents(processed);
      setLoading(false);
    } catch (err) {
      console.warn('Backend load failed:', err.message);
      setLoading(false);
    }
  };

  // Dynamic weekly data calculation
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = daysOfWeek.map((dayName, idx) => {
    const records = allAttendance.filter(r => {
      const d = new Date(r.attendanceDate || r.date);
      return d.getDay() === (idx + 1);
    });
    if (records.length === 0) return { day: dayName, present: 0, absent: 0 };
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.length - present;
    return { day: dayName, present, absent };
  });

  // Sync attendance sheet when selected semester changes or students list loaded
  useEffect(() => {
    if (students.length > 0) {
      const classStudents = students.filter(s => s.sem === selectedSem);
      setAttendanceSheet(classStudents.map(s => ({
        id: s.id,
        name: s.name,
        present: true
      })));
    }
  }, [students, selectedSem]);

  const departmentStudents = students;
  const filtered = departmentStudents.filter(s => semFilter === 'All' || s.sem === semFilter);
  const lowAttendance = filtered.filter(s => s.attendance < 75);
  const avgAttendance = filtered.length ? (filtered.reduce((sum, s) => sum + s.attendance, 0) / filtered.length).toFixed(1) : 0;

  const getColor = (p) => p >= 90 ? 'var(--success)' : p >= 75 ? 'var(--warning)' : 'var(--danger)';
  const getStatus = (p) => p >= 90 ? 'Good' : p >= 75 ? 'Low' : 'Critical';
  const getStatusClass = (p) => p >= 90 ? 'status-active' : p >= 75 ? 'status-low' : 'status-inactive';

  const toggleAttendance = (id) => {
    setAttendanceSheet(sheet => sheet.map(row => 
      row.id === id ? { ...row, present: !row.present } : row
    ));
  };

  const submitAttendance = async (e) => {
    e.preventDefault();
    if (!selectedSubject) {
      alert('Please enter a subject name');
      return;
    }

    try {
      // Build bulk attendance records for the API
      const records = attendanceSheet.map(row => ({
        studentId: row.id,
        studentName: row.name,
        department: HOD_DEPT,
        date: markingDate,
        subject: selectedSubject,
        semester: selectedSem,
        status: row.present ? 'Present' : 'Absent'
      }));
      await createAttendance(records);
      setSuccessMsg(`Attendance logged for ${selectedSem} - ${selectedSubject}!`);
    } catch (err) {
      console.warn('Attendance API save failed, updating locally:', err.message);
      // Fallback: update students attendance percentage locally
      const updatedStudents = students.map(s => {
        const sheetRow = attendanceSheet.find(row => row.id === s.id);
        if (sheetRow) {
          const currentPct = s.attendance;
          const newPct = sheetRow.present
            ? Math.min(100, Math.round(currentPct * 0.98 + 2.0))
            : Math.max(0, Math.round(currentPct * 0.98));
          return { ...s, attendance: newPct };
        }
        return s;
      });
      setStudents(updatedStudents);
      setSuccessMsg(`Attendance logged for ${selectedSem} - ${selectedSubject}! (local)`);
    }

    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="attendance-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Attendance Portal</h1>
          <p className="text-muted"><Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />{dateStr}</p>
        </div>
        <div className="filter-select-wrapper">
          <Filter size={16} className="text-muted" />
          <select className="filter-select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
            <option value="All">All Semesters</option>
            {SEMESTERS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sm-summary-row four-col">
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Avg Attendance ({HOD_DEPT})</span>
          <span className="sm-summary-value gradient-text">{avgAttendance}%</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Dept Students</span>
          <span className="sm-summary-value">{departmentStudents.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Low Attendance Alert</span>
          <span className="sm-summary-value text-danger">{lowAttendance.length} students</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Regular Attendance Rates</span>
          <span className="sm-summary-value text-success">{filtered.filter(s => s.attendance >= 90).length} Good</span>
        </div>
      </div>

      {/* Alert Banner */}
      {lowAttendance.length > 0 && (
        <div className="alert-banner">
          <AlertTriangle size={20} />
          <span><strong>{lowAttendance.length} students</strong> have attendance below 75% in your department. Immediate review needed.</span>
          <div className="alert-names">
            {lowAttendance.map(s => <span key={s.id} className="alert-name-tag">{s.name} ({s.attendance}%)</span>)}
          </div>
        </div>
      )}

      <div className="attendance-grid">
        {/* Weekly Chart */}
        <div className="glass-card chart-section col-span-2">
          <h3>Weekly Attendance Trend (%)</h3>
          <div style={{ height: '230px', marginTop: '1.25rem' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)' }} />
                <Bar dataKey="present" name="Present %" radius={[4, 4, 0, 0]} fill="var(--primary)">
                  {weeklyData.map((entry, index) => (
                    <Cell key={index} fill={entry.present >= 90 ? '#10b981' : entry.present >= 80 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interactive Mark Attendance */}
        <div className="glass-card chart-section mark-attendance-panel">
          <h3><UserCheck size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Mark Daily Attendance</h3>
          
          {successMsg && (
            <div className="success-banner" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          <form onSubmit={submitAttendance} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-row-compact">
              <div className="form-group-compact">
                <label>Semester</label>
                <select value={selectedSem} onChange={e => setSelectedSem(e.target.value)}>
                  {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group-compact">
                <label>Date</label>
                <input type="date" value={markingDate} onChange={e => setMarkingDate(e.target.value)} />
              </div>
            </div>

            <div className="form-group-compact">
              <label>Subject *</label>
              <input type="text" required placeholder="e.g. Circuits, Power Systems" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} />
            </div>

            <label className="att-sheet-label">Student Sheet ({selectedSem})</label>
            <div className="marking-sheet-list">
              {attendanceSheet.length === 0 ? (
                <p className="no-marking-data">No students registered in {selectedSem}.</p>
              ) : (
                attendanceSheet.map(row => (
                  <div key={row.id} className="marking-row">
                    <span className="marking-name">{row.name}</span>
                    <button
                      type="button"
                      className={`marking-toggle-btn ${row.present ? 'present' : 'absent'}`}
                      onClick={() => toggleAttendance(row.id)}
                    >
                      {row.present ? 'Present' : 'Absent'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <button type="submit" className="btn-primary w-full shadow-glow" disabled={attendanceSheet.length === 0} style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
              Submit Daily Attendance
            </button>
          </form>
        </div>

        {/* Main Table */}
        <div className="glass-card col-span-3">
          <div className="table-header-row">
            <h3>Department Attendance Records</h3>
            <div className="legend-row">
              <span className="legend-item"><span className="dot bg-success"></span>≥ 90% Good</span>
              <span className="legend-item"><span className="dot bg-warning"></span>75–89% Low</span>
              <span className="legend-item"><span className="dot bg-danger"></span>&lt;75% Critical</span>
            </div>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Register No</th><th>Student Name</th>
                  <th>Semester</th><th>Attendance %</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>)}</tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="no-data">No student attendance logs found.</td></tr>
                ) : filtered.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td><span className="roll-no">{r.id}</span></td>
                    <td className="font-semibold">{r.name}</td>
                    <td><span className="badge-outline">{r.sem}</span></td>
                    <td>
                      <div className="att-bar-cell">
                        <span style={{ color: getColor(r.attendance), fontWeight: 600, minWidth: '42px' }}>{r.attendance}%</span>
                        <div className="att-bar-bg">
                          <div className="att-bar-fill" style={{ width: `${r.attendance}%`, background: getColor(r.attendance) }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(r.attendance)}`}>{getStatus(r.attendance)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HodAttendance;
