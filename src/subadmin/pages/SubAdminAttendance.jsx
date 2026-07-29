import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle, Calendar, Filter, Search, 
  Check, X, Users, Save, TrendingUp, UserCheck, Download 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area 
} from 'recharts';
import { getStudents, getAllAttendance, createAttendance } from '../../api/index';
import '../../pages/attendance/AttendanceManagement.css';

const DEPARTMENTS = ['All', 'Computer Science', 'Electrical Engg.', 'Mechanical Engg.', 'Civil Engg.', 'Information Tech.'];
const SEMESTERS = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

const MONTHLY_ANALYTICS = [
  { name: 'Nov', CS: 92, EE: 88, ME: 85, CE: 89, IT: 94, average: 90 },
  { name: 'Dec', CS: 90, EE: 89, ME: 84, CE: 88, IT: 92, average: 89 },
  { name: 'Jan', CS: 94, EE: 91, ME: 88, CE: 90, IT: 95, average: 92 },
  { name: 'Feb', CS: 93, EE: 92, ME: 87, CE: 91, IT: 96, average: 93 },
  { name: 'Mar', CS: 91, EE: 89, ME: 85, CE: 87, IT: 93, average: 89 },
  { name: 'Apr', CS: 93, EE: 90, ME: 86, CE: 89, IT: 95, average: 91 },
];

const AVATAR_COLORS = ['#3b82f6', '#6366F1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'];
const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const getTodayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

const SubAdminAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [dailyLogs, setDailyLogs] = useState({});
  const [stats, setStats] = useState({});
  
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [mode, setMode] = useState('view'); // 'view' | 'mark'
  const [markingState, setMarkingState] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const studentsRes = await getStudents();
      const studentList = studentsRes.data;
      setStudents(studentList);

      let dailyLogData = {};
      let statsData = {};
      
      try {
        const attRes = await getAllAttendance();
        const records = attRes.data;
        records.forEach(r => {
          const dateStr = new Date(r.date).toLocaleDateString('en-CA');
          if (!dailyLogData[dateStr]) dailyLogData[dateStr] = {};
          dailyLogData[dateStr][r.studentId] = r.status.toLowerCase();
        });
      } catch (attErr) {
        console.warn('Failed to fetch live attendance', attErr);
      }
      
      setDailyLogs(dailyLogData);

      studentList.forEach(s => {
        const att = s.attendance !== undefined ? Number(s.attendance) : 85;
        statsData[s.id] = { basePresent: Math.round(att), baseAbsent: 100 - Math.round(att) };
      });
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'mark') {
      const existing = dailyLogs[selectedDate] || {};
      const initialMarking = {};
      students.forEach(s => {
        initialMarking[s.id] = existing[s.id] || '';
      });
      setMarkingState(initialMarking);
    }
  }, [selectedDate, mode, dailyLogs, students]);

  const getStudentRecords = () => {
    return students.map(s => {
      const studentStats = stats[s.id] || { basePresent: 85, baseAbsent: 15 };
      let dailyPresent = 0;
      let dailyAbsent = 0;

      Object.keys(dailyLogs).forEach(date => {
        const mark = dailyLogs[date][s.id];
        if (mark === 'present') dailyPresent++;
        else if (mark === 'absent') dailyAbsent++;
      });

      const presentDays = studentStats.basePresent + dailyPresent;
      const absentDays = studentStats.baseAbsent + dailyAbsent;
      const totalDays = presentDays + absentDays;
      const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      return {
        ...s,
        presentDays,
        absentDays,
        percent,
        status: percent >= 90 ? 'Good' : percent >= 75 ? 'Low' : 'Critical'
      };
    });
  };

  const records = getStudentRecords();

  const filteredRecords = records.filter(r => {
    const matchDept = deptFilter === 'All' || r.dept === deptFilter;
    const matchSem = semFilter === 'All' || r.sem === semFilter;
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSem && matchSearch;
  });

  const lowAttendance = filteredRecords.filter(r => r.percent < 75);
  const avgAttendance = filteredRecords.length ? (filteredRecords.reduce((a, b) => a + b.percent, 0) / filteredRecords.length).toFixed(1) : 0;
  const criticalCount = filteredRecords.filter(r => r.percent < 75).length;
  const goodCount = filteredRecords.filter(r => r.percent >= 90).length;
  const normalCount = filteredRecords.filter(r => r.percent >= 75 && r.percent < 90).length;

  const getColor = (p) => p >= 90 ? 'var(--success)' : p >= 75 ? 'var(--warning)' : 'var(--danger)';
  const getStatusClass = (p) => p >= 90 ? 'status-active' : p >= 75 ? 'status-low' : 'status-inactive';

  const handleBulkMark = (status) => {
    const updated = { ...markingState };
    filteredRecords.forEach(r => {
      updated[r.id] = status;
    });
    setMarkingState(updated);
  };

  const handleMarkStudent = (studentId, status) => {
    setMarkingState(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    try {
      const bulkRecords = [];
      Object.keys(markingState).forEach(studentId => {
        const mark = markingState[studentId];
        if (mark) {
          bulkRecords.push({
            studentId,
            date: new Date(selectedDate),
            status: mark.charAt(0).toUpperCase() + mark.slice(1)
          });
        }
      });

      if (bulkRecords.length > 0) {
        await createAttendance(bulkRecords);
      }

      setSaveSuccess(true);
      await fetchData();

      setTimeout(() => {
        setSaveSuccess(false);
        setMode('view');
      }, 1000);
      
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('Failed to save attendance. Please ensure backend is running.');
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Register No,Department,Semester,Present Days,Absent Days,Attendance %,Status\n"
      + filteredRecords.map(r => `${r.name},${r.id},${r.dept},${r.sem},${r.presentDays},${r.absentDays},${r.percent}%,${r.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWeeklyData = () => {
    const today = new Date();
    const data = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let count = 0;
    let offset = 0;
    while (count < 6) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      offset++;
      if (d.getDay() === 0) continue; 
      
      const dateStr = d.toLocaleDateString('en-CA');
      const dayName = days[d.getDay()];
      
      let rate = 90;
      const dayMarks = dailyLogs[dateStr];
      if (dayMarks) {
        let present = 0;
        let total = 0;
        Object.values(dayMarks).forEach(status => {
          if (status === 'present') present++;
          if (status === 'present' || status === 'absent') total++;
        });
        if (total > 0) rate = Math.round((present / total) * 100);
      } else {
        const seedRates = [93, 89, 96, 92, 87, 94];
        rate = seedRates[count % seedRates.length];
      }
      
      data.unshift({ day: dayName, rate });
      count++;
    }
    return data;
  };

  const weeklyData = getWeeklyData();

  return (
    <div className="attendance-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Sub Admin Attendance Analytics</h1>
          <p className="text-muted">Perform daily marking, track percentage counts, and generate advanced analytics.</p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline shadow-glow" onClick={handleExport}>
            <Download size={18} /> Export Report
          </button>
          
          {/* Mode Switcher */}
          <div className="mode-toggle-group">
            <button className={`mode-btn ${mode === 'view' ? 'active' : ''}`} onClick={() => setMode('view')}>
              <Users size={16} /> Directory View
            </button>
            <button className={`mode-btn ${mode === 'mark' ? 'active' : ''}`} onClick={() => setMode('mark')}>
              <UserCheck size={16} /> Mark Attendance
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sm-summary-row four-col">
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Average Attendance</span>
          <span className="sm-summary-value gradient-text">{avgAttendance}%</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Good Standing (≥ 90%)</span>
          <span className="sm-summary-value text-success">{goodCount} students</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Low Standings (75-89%)</span>
          <span className="sm-summary-value text-warning-cgpa">{normalCount} students</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Critical Status (&lt; 75%)</span>
          <span className="sm-summary-value text-danger">{criticalCount} students</span>
        </div>
      </div>

      {/* Alert Banner for Low Attendance */}
      {lowAttendance.length > 0 && (
        <div className="alert-banner">
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <span><strong>Low Attendance Alert:</strong> {lowAttendance.length} students currently fall below the required 75% attendance threshold.</span>
            <div className="alert-names">
              {lowAttendance.map(s => (
                <span key={s.id} className="alert-name-tag">
                  {s.name} ({s.percent}%)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FILTERS PANEL */}
      <div className="glass-card">
        <div className="filters-row" style={{ borderBottom: 'none' }}>
          <div className="search-box">
            <Search size={17} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search student or register no..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-group">
            {/* Department Filter */}
            <div className="filter-select-wrapper">
              <Filter size={14} className="text-muted" />
              <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Semester Filter */}
            <div className="filter-select-wrapper">
              <select className="filter-select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Date Picker (always visible, critical in Mark Mode) */}
            <div className="date-picker-wrapper">
              <Calendar size={14} className="text-muted" />
              <input type="date" className="date-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {mode === 'view' ? (
        /* ──────────────── DIRECTORY / ANALYTICS MODE ──────────────── */
        <div className="attendance-grid">
          
          {/* Attendance Chart (Weekly Trends) */}
          <div className="glass-card chart-section col-span-2">
            <h3><Calendar size={18} className="text-primary" /> Daily Attendance Trend (Mon - Sat)</h3>
            <div style={{ height: '230px', width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" domain={[0, 100]} fontSize={12} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)', fontSize: '12px' }} 
                  />
                  <Bar dataKey="rate" name="Attendance %" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={index} fill={entry.rate >= 90 ? '#10b981' : entry.rate >= 75 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Attendance Card Widget */}
          <div className="glass-card chart-section">
            <h3><AlertTriangle size={18} style={{ color: 'var(--danger)' }} /> Critical Standings (&lt; 75%)</h3>
            <div className="absent-list" style={{ marginTop: '1rem' }}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="absent-item">
                    <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '14px', width: '70%', marginBottom: '6px' }}></div>
                      <div className="skeleton" style={{ height: '10px', width: '40%' }}></div>
                    </div>
                  </div>
                ))
              ) : lowAttendance.length === 0 ? (
                <div className="no-data" style={{ padding: '2rem 1rem', fontSize: '0.88rem' }}>
                  No students in critical standing. Excellent!
                </div>
              ) : (
                lowAttendance.map((s, idx) => (
                  <div key={s.id} className="absent-item">
                    <div className="absent-avatar" style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                      {getInitials(s.name)}
                    </div>
                    <div className="absent-info">
                      <p className="absent-name">{s.name}</p>
                      <p className="absent-dept">{s.dept} · {s.sem}</p>
                    </div>
                    <span className="absent-pct" style={{ color: 'var(--danger)' }}>{s.percent}%</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Monthly Attendance Analytics Line Chart */}
          <div className="glass-card chart-section col-span-3">
            <h3><TrendingUp size={18} className="text-primary" /> Monthly Attendance Analytics (6-Month Trend)</h3>
            <div style={{ height: '240px', width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={MONTHLY_ANALYTICS}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" domain={[80, 100]} fontSize={12} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)', fontSize: '12px' }} 
                  />
                  <Area type="monotone" dataKey="average" stroke="var(--primary)" fillOpacity={1} fill="url(#colorAvg)" strokeWidth={2} name="Average Rate %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Main Records Table */}
          <div className="glass-card col-span-3">
            <div className="table-header-row">
              <h3>Student Attendance Directory</h3>
              <div className="legend-row">
                <span className="legend-item"><span className="dot bg-success"></span>≥ 90% Good</span>
                <span className="legend-item"><span className="dot bg-warning"></span>75–89% Low</span>
                <span className="legend-item"><span className="dot bg-danger"></span>&lt; 75% Critical</span>
              </div>
            </div>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Student Name</th>
                    <th>Register No</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Present Days</th>
                    <th>Absent Days</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px', width: j === 1 ? '160px' : '50px' }}></div></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="no-data">
                        No student records match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.78rem', backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                              {getInitials(r.name)}
                            </div>
                            <span className="font-semibold">{r.name}</span>
                          </div>
                        </td>
                        <td><span className="roll-no">{r.id}</span></td>
                        <td>{r.dept}</td>
                        <td><span className="badge-outline">{r.sem}</span></td>
                        <td className="text-success font-semibold">{r.presentDays}</td>
                        <td className="text-danger font-semibold">{r.absentDays}</td>
                        <td>
                          <div className="att-bar-cell">
                            <span style={{ color: getColor(r.percent), fontWeight: 600, minWidth: '40px' }}>{r.percent}%</span>
                            <div className="att-bar-bg">
                              <div className="att-bar-fill" style={{ width: `${r.percent}%`, background: getColor(r.percent) }}></div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`status-badge ${getStatusClass(r.percent)}`}>{r.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && (
              <div className="table-footer">
                <div>Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> students</div>
                {(deptFilter !== 'All' || semFilter !== 'All' || search) && (
                  <button className="clear-filters-link" onClick={() => { setDeptFilter('All'); setSemFilter('All'); setSearch(''); }}>
                    Reset filters ×
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ──────────────── DAILY ATTENDANCE MARKING MODE ──────────────── */
        <div className="glass-card col-span-3">
          <div className="table-header-row">
            <div>
              <h3>Daily Roll Call</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                Mark students present/absent for <strong>{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </p>
            </div>
            {saveSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>
                <CheckCircle size={18} /> Daily attendance logged successfully!
              </div>
            )}
          </div>

          <div className="bulk-action-panel animate-fade-in">
            <span className="bulk-action-text">
              Bulk actions for <strong>{filteredRecords.length}</strong> filtered students:
            </span>
            <div className="bulk-buttons">
              <button type="button" className="mark-btn btn-present" onClick={() => handleBulkMark('present')}>Mark All Present</button>
              <button type="button" className="mark-btn btn-absent" onClick={() => handleBulkMark('absent')}>Mark All Absent</button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Current %</th>
                  <th style={{ width: '200px', textAlign: 'center' }}>Mark Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">No student records match the active filters.</td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => {
                    const status = markingState[r.id];
                    return (
                      <tr key={r.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.78rem', backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                              {getInitials(r.name)}
                            </div>
                            <span className="font-semibold">{r.name}</span>
                          </div>
                        </td>
                        <td><span className="roll-no">{r.id}</span></td>
                        <td>{r.dept}</td>
                        <td><span className="badge-outline">{r.sem}</span></td>
                        <td><span style={{ color: getColor(r.percent), fontWeight: 700 }}>{r.percent}%</span></td>
                        <td>
                          <div className="marking-btn-group" style={{ justifyContent: 'center' }}>
                            <button type="button" className={`mark-btn btn-present ${status === 'present' ? 'active' : ''}`} onClick={() => handleMarkStudent(r.id, 'present')}>
                              <Check size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Present
                            </button>
                            <button type="button" className={`mark-btn btn-absent ${status === 'absent' ? 'active' : ''}`} onClick={() => handleMarkStudent(r.id, 'absent')}>
                              <X size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="save-section">
            <button 
              type="button" 
              className="btn-save-attendance"
              onClick={handleSaveAttendance}
              disabled={filteredRecords.length === 0}
              style={{ opacity: filteredRecords.length === 0 ? 0.6 : 1, cursor: filteredRecords.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <Save size={16} /> Save Roll Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminAttendance;
