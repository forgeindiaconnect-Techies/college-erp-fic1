import React, { useState, useEffect } from 'react';
import { Users, Award, TrendingUp, Calendar, Eye, MessageSquare, FileText, X, CheckCircle, AlertCircle, Search, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { getStaff, getDepartments, createNotification } from '../../api/index';
import '../../pages/Dashboard.css';

const hods = [];

const radarKeys = ['Attendance', 'Pass Rate', 'Publications', 'Faculty Mgmt', 'Student Engagement'];

export default function PrincipalHodManagement() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [meeting, setMeeting] = useState({ date: '', time: '', agenda: '' });
  const [toast, setToast] = useState('');
  const [hodList, setHodList] = useState(hods);

  const perfData = hodList.map(h => ({ dept: h.code, 'Pass %': h.passRate, 'Attendance %': h.attendance }));

  useEffect(() => {
    const fetchPrincipalHods = async () => {
      try {
        const [res, deptRes] = await Promise.all([getStaff(), getDepartments()]);
        const allHods = (res.data || []).filter(s => s.designation === 'HOD');
        const dbDepartments = deptRes.data || [];
        
        const getCode = (deptName) => {
          const matched = dbDepartments.find(d => d.name === deptName);
          if (matched && matched.code) return matched.code;
          
          const mapping = {
            'Computer Science Engineering': 'CSE', 'Information Technology': 'IT',
            'Electronics & Communication Engineering': 'ECE', 'Electrical & Electronics Engineering': 'EEE',
            'Mechanical Engineering': 'MECH', 'Civil Engineering': 'CIVIL',
            'Artificial Intelligence & Data Science': 'AIDS', 'Artificial Intelligence & Machine Learning': 'AIML',
            'Cyber Security': 'CYBER', 'Biomedical Engineering': 'BME',
            'Aeronautical Engineering': 'AERO', 'Automobile Engineering': 'AUTO',
            'Robotics Engineering': 'ROBOTICS', 'Chemical Engineering': 'CHEM', 'Biotechnology Engineering': 'BIOTECH'
          };
          return mapping[deptName] || deptName.substring(0, 4).toUpperCase();
        };

        const formatted = allHods.map((h, i) => {
          const resolvedDept = h.dept || h.department || 'N/A';
          return {
            id: h.id || h._id || i + 1,
            name: h.name,
            dept: resolvedDept,
            code: h.code || h.deptCode || getCode(resolvedDept),
            email: h.email || 'hod@college.edu',
            experience: h.experience || '10 yrs',
            attendance: h.attendance ?? 0,
            passRate: h.passRate || h.performance || 0,
            faculty: h.faculty ?? 0,
            students: h.students || 100,
            status: h.status || 'Active',
            rating: h.rating ?? 0,
            subjects: h.subjects || ['Core Curriculum'],
            publications: h.publications ?? 0
          };
        });
        setHodList(formatted);
      } catch (err) {
        console.warn('API getStaff offline. Loading executive static roster.', err);
        setHodList([]);
      }
    };
    
    fetchPrincipalHods();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      await createNotification({
        receiverId: selected.id,
        email: selected.email,
        targetName: selected.name,
        targetRoles: [], // Send only to this specific HOD
        title: 'Meeting Scheduled by Principal',
        message: `A meeting has been scheduled for you on ${meeting.date} at ${meeting.time}. Agenda: ${meeting.agenda}`,
        type: 'Warning'
      });
      showToast(`Meeting scheduled with ${selected.name}`);
      setMeeting({ date: '', time: '', agenda: '' });
      setModal(null);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      showToast(`Failed to schedule meeting with ${selected.name}`);
    }
  };

  const filtered = hodList.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || h.dept.toLowerCase().includes(search.toLowerCase()));

  const radarData = selected ? radarKeys.map(k => ({
    subject: k,
    value: k === 'Attendance' ? selected.attendance : k === 'Pass Rate' ? selected.passRate : k === 'Publications' ? Math.min(100, selected.publications * 6) : k === 'Faculty Mgmt' ? 88 : 85
  })) : [];

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)', padding: '1rem 1.5rem', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 99999, borderLeft: '4px solid var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
          ✅ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award style={{ color: '#3730A5' }} size={28} /> HOD Management
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor department heads, performance metrics, and schedule reviews.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total HODs', value: hodList.length, icon: <Users size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'Active departments' },
          { label: 'Active HODs', value: hodList.filter(h => h.status === 'Active').length, icon: <CheckCircle size={18} />, bgTint: '#E1F5EE', iconColor: '#047857', sub: 'Currently present', subColor: '#047857' },
          { label: 'Avg Attendance', value: hodList.length ? `${(hodList.reduce((a,b) => a + b.attendance, 0) / hodList.length).toFixed(1)}%` : '0%', icon: <TrendingUp size={18} />, bgTint: '#E1F5EE', iconColor: '#047857', sub: 'This semester', subColor: '#047857' },
          { label: 'Avg Pass Rate', value: hodList.length ? `${(hodList.reduce((a,b) => a + b.passRate, 0) / hodList.length).toFixed(1)}%` : '0%', icon: <Star size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'All departments' },
          { label: 'Pending Reviews', value: 0, icon: <AlertCircle size={18} />, bgTint: '#FAEEDA', iconColor: '#B45309', sub: 'Action needed', subColor: '#B45309' },
        ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ padding: '1.25rem', background: '#FFFFFF', border: '1px solid #E3E5EC', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.bgTint, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{s.label}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.1' }}>{s.value}</span>
              <span style={{ fontSize: '0.75rem', color: s.subColor || 'var(--text-muted)', fontWeight: s.subColor ? 600 : 400 }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '1.5rem' }}>
        {/* Table */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>Department Heads</h3>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HOD..." style={{ padding: '0.45rem 0.8rem 0.45rem 2rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.82rem', width: 180 }} />
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>HOD Name</th><th>Department</th><th>Experience</th><th>Attendance %</th><th>Pass Rate</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(h)}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{h.name}</div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.email}</span>
                    </td>
                    <td><span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '2px 8px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700 }}>{h.code}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{h.experience}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                          <div style={{ width: `${h.attendance}%`, height: '100%', background: h.attendance >= 95 ? '#10b981' : h.attendance >= 85 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: h.attendance >= 95 ? '#10b981' : '#f59e0b' }}>{h.attendance}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: h.passRate >= 90 ? '#10b981' : h.passRate >= 80 ? '#f59e0b' : '#ef4444', fontSize: '0.85rem' }}>{h.passRate}%</td>
                    <td>
                      <span style={{ background: h.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: h.status === 'Active' ? '#10b981' : '#f59e0b', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{h.status}</span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setSelected(h); setModal('view'); }} style={{ padding: '4px 8px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>View</button>
                        <button onClick={() => { setSelected(h); setModal('meeting'); }} style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Meet</button>
                        <button onClick={() => { setSelected(h); setModal('report'); }} style={{ padding: '4px 8px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Report</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
          {selected ? (
            <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>{selected.name.charAt(0)}</div>
                  <h3 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>{selected.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selected.dept}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                {[['Experience', selected.experience], ['Faculty', selected.faculty], ['Students', selected.students], ['Publications', selected.publications], ['Rating', `⭐ ${selected.rating}`], ['Pass Rate', `${selected.passRate}%`]].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Award size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem' }}>Click any HOD row to view their profile & radar chart.</p>
            </div>
          )}

          {/* Dept Performance Chart */}
          <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>Department Performance</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={perfData} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis domain={[75, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Pass %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Attendance %" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {modal === 'view' && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: 16, width: 520, background: 'var(--bg-secondary)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>📋 HOD Profile — {selected.name}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Department', selected.dept], ['Email', selected.email], ['Experience', selected.experience], ['Faculty Count', selected.faculty], ['Total Students', selected.students], ['Publications', selected.publications], ['Attendance', `${selected.attendance}%`], ['Pass Rate', `${selected.passRate}%`], ['Rating', `⭐ ${selected.rating}/5`], ['Status', selected.status]].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>SUBJECTS HANDLED</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selected.subjects.map(s => <span key={s} style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>{s}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { showToast(`Message sent to ${selected.name}`); setModal(null); }} style={{ padding: '0.6rem 1.2rem', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>💬 Message</button>
              <button onClick={() => setModal(null)} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: 8 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {modal === 'meeting' && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: 16, width: 460, background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text-main)' }}>📅 Schedule Meeting — {selected.name}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Date</label>
                  <input type="date" required value={meeting.date} onChange={e => setMeeting(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Time</label>
                  <input type="time" required value={meeting.time} onChange={e => setMeeting(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Agenda</label>
                <textarea required rows={3} value={meeting.agenda} onChange={e => setMeeting(p => ({ ...p, agenda: e.target.value }))} placeholder="Meeting agenda..." style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.4rem', borderRadius: 8 }}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Performance Report Modal */}
      {modal === 'report' && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: 16, width: 520, background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text-main)' }}>📊 Performance Report — {selected.code}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: '1.2rem' }}>
              {[['Pass Rate', `${selected.passRate}%`, '#10b981'], ['Attendance', `${selected.attendance}%`, '#6366f1'], ['Rating', `${selected.rating}/5`, '#f59e0b'], ['Faculty', selected.faculty, '#6366F1'], ['Students', selected.students, '#3b82f6'], ['Publications', selected.publications, '#ef4444']].map(([k, v, c]) => (
                <div key={k} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 10, borderTop: `3px solid ${c}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>SEMESTER PERFORMANCE TREND</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[{ sem: 'S1', pass: 82 }, { sem: 'S2', pass: 85 }, { sem: 'S3', pass: 84 }, { sem: 'S4', pass: 87 }, { sem: 'S5', pass: selected.passRate }]} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sem" tick={{ fontSize: 10 }} />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="pass" fill="#6366f1" radius={[4, 4, 0, 0]} name="Pass %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { showToast(`Report downloaded for ${selected.name}`); setModal(null); }} style={{ padding: '0.6rem 1.2rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>⬇ Download</button>
              <button onClick={() => setModal(null)} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: 8 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
