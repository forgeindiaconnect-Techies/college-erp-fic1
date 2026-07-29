import React, { useState, useEffect } from 'react';
import { CalendarCheck, AlertCircle, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { getStudents } from '../../api/index';
import '../../pages/Dashboard.css';

const deptAttendance = [
  { dept: 'CSE', present: 90, absent: 10, avg: 90 },
  { dept: 'ECE', dept2: 'Electronics', present: 83, absent: 17, avg: 83 },
  { dept: 'EEE', present: 93, absent: 7, avg: 93 },
  { dept: 'MECH', present: 68, absent: 32, avg: 68 },
  { dept: 'BCA', present: 94, absent: 6, avg: 94 },
  { dept: 'MBA', present: 96, absent: 4, avg: 96 },
];

const monthlyData = [
  { month: 'Jan', CSE: 88, ECE: 82, EEE: 90, MECH: 72, overall: 85 },
  { month: 'Feb', CSE: 90, ECE: 80, EEE: 91, MECH: 70, overall: 86 },
  { month: 'Mar', CSE: 89, ECE: 83, EEE: 92, MECH: 68, overall: 87 },
  { month: 'Apr', CSE: 91, ECE: 84, EEE: 93, MECH: 69, overall: 88 },
  { month: 'May', CSE: 90, ECE: 83, EEE: 93, MECH: 68, overall: 87 },
];

const statusPie = [
  { name: 'Excellent (≥90%)', value: 5, color: '#10b981' },
  { name: 'Average (75-89%)', value: 3, color: '#f59e0b' },
  { name: 'Low (<75%)', value: 2, color: '#ef4444' },
];

const lowAttStudents = [
  { name: 'Robert Johnson', dept: 'MECH', attendance: 68, sem: 'Sem 2', alert: 'Critical' },
  { name: 'Neha Gupta', dept: 'ECE', attendance: 75, sem: 'Sem 6', alert: 'Warning' },
  { name: 'David Lee', dept: 'CSE', attendance: 88, sem: 'Sem 3', alert: 'Monitor' },
];

const weekData = [
  { day: 'Mon', present: 92, absent: 8 },
  { day: 'Tue', present: 88, absent: 12 },
  { day: 'Wed', present: 91, absent: 9 },
  { day: 'Thu', present: 85, absent: 15 },
  { day: 'Fri', present: 79, absent: 21 },
];

export default function PrincipalAttendanceAnalytics() {
  const [view, setView] = useState('overview');
  const [alertList, setAlertList] = useState(lowAttStudents);

  useEffect(() => {
    getStudents()
      .then(res => res.data)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Normalize and filter for low attendance students (< 80%)
          const lowAtt = data
            .filter(s => s.attendance < 80)
            .map(s => ({
              name: s.name,
              dept: s.department || 'CSE',
              attendance: s.attendance || 70,
              sem: s.semester || 'Sem 4',
              alert: s.attendance < 70 ? 'Critical' : 'Warning'
            }));
          if (lowAtt.length > 0) {
            setAlertList(lowAtt);
          }
        }
      })
      .catch(err => {
        console.warn('API /api/students offline. Loading security alert logs.', err);
      });
  }, []);

  const overall = Math.round(deptAttendance.reduce((a, d) => a + d.avg, 0) / deptAttendance.length);

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarCheck style={{ color: '#3730A5' }} size={28} /> Attendance Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time attendance monitoring, low attendance alerts, and trend analysis.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Overall Attendance', value: `${overall}%`, icon: <CheckCircle size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'All departments' },
          { label: 'Present Today', value: '87%', icon: <Users size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Estimated' },
          { label: 'Absent Today', value: '13%', icon: <AlertCircle size={18} />, color: 'var(--danger)', bg: '#FCEBEB', sub: 'Estimated' },
          { label: 'Low Attendance', value: alertList.length, icon: <AlertCircle size={18} />, color: 'var(--warning)', bg: '#FAEEDA', sub: 'Below 80%' },
          { label: 'Dept with Highest', value: 'MBA', icon: <TrendingUp size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: '96% attendance' },
          { label: 'Dept with Lowest', value: 'MECH', icon: <AlertCircle size={18} />, color: 'var(--danger)', bg: '#FCEBEB', sub: '68% attendance' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-details">
              <h3>{s.label}</h3>
              <p className="stat-value">{s.value}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Selector */}
      <div className="glass-card" style={{ padding: '0.4rem', borderRadius: 12, display: 'inline-flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {[['overview', '📊 Overview'], ['monthly', '📈 Monthly Trend'], ['alerts', '🚨 Low Att. Alerts']].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{ padding: '0.55rem 1.1rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, background: view === key ? '#3730A5' : 'transparent', color: view === key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {view === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 260px', gap: '1.2rem' }} className="animate-fade-in">
          {/* Dept Bar Chart */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Department Attendance Comparison</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptAttendance} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="present" fill="#10b981" name="Present %" radius={[5, 5, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" name="Absent %" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly trend */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>This Week's Daily Attendance</h4>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#gradPresent)" name="Present %" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1rem' }}>Attendance Distribution</h4>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {statusPie.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.75rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)', flex: 1 }}>{s.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', background: 'var(--bg-secondary)', borderRadius: 10, padding: '0.8rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL CAMPUS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: overall >= 85 ? '#10b981' : '#f59e0b' }}>{overall}%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average Attendance</div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend Tab */}
      {view === 'monthly' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Monthly Attendance by Department</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="CSE" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ECE" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="EEE" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="MECH" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Overall Campus Monthly Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[80, 95]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="overall" stroke="#6366f1" fill="url(#gradOverall)" name="Overall %" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Low Attendance Alerts Tab */}
      {view === 'alerts' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>⚠️ Low Attendance Alert — Action Required</h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Student Name</th><th>Department</th><th>Semester</th><th>Attendance %</th><th>Alert Level</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {alertList.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.dept}</td>
                      <td style={{ fontSize: '0.82rem' }}>{s.sem}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 80, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                            <div style={{ width: `${s.attendance}%`, height: '100%', background: s.attendance < 75 ? '#ef4444' : s.attendance < 85 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 800, color: s.attendance < 75 ? '#ef4444' : '#f59e0b' }}>{s.attendance}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ background: s.alert === 'Critical' ? 'rgba(239,68,68,0.12)' : s.alert === 'Warning' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)', color: s.alert === 'Critical' ? '#ef4444' : s.alert === 'Warning' ? '#f59e0b' : '#6366f1', padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{s.alert}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Notify Parent</button>
                          <button style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Counselor</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.2rem', background: 'rgba(239,68,68,0.06)', borderRadius: 10, padding: '1rem', borderLeft: '3px solid #ef4444', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              ⚠️ <strong style={{ color: 'var(--text-main)' }}>Policy:</strong> Students below 75% attendance are debarred from semester examinations. Immediate HOD and parent notification is mandatory.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
