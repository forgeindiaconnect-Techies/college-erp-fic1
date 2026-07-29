import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, FileText, Calendar, TrendingUp, BookOpen, Search, Bell, Briefcase, Award
} from 'lucide-react';
import { 
  getStudents, getPlacementJobs, getPlacementApplications, 
  getPlacementInterviews, getPlacementSelections, getMyProfile,
  updatePlacementApplicationStatus
} from '../../api/index';
import '../../pages/Dashboard.css';

export default function StaffPlacements() {
  const [tab, setTab] = useState('eligible');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };
  
  const [myDept, setMyDept] = useState('');
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selections, setSelections] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Training Data (Mocked for now as per requirements until backend API is ready)
  const [trainingPrograms] = useState([
    { id: 1, type: 'Aptitude Training', date: '2026-06-10', trainer: 'External Vendor' },
    { id: 2, type: 'Coding Training', date: '2026-06-12', trainer: 'Prof. Karthik S.' },
    { id: 3, type: 'Soft Skills', date: '2026-06-15', trainer: 'Dr. Ananya Rao' },
    { id: 4, type: 'Mock Interview', date: '2026-06-18', trainer: 'Alumni Panel' },
    { id: 5, type: 'Resume Building', date: '2026-06-20', trainer: 'Placement Cell' },
  ]);

  const [studentTrainingStatus, setStudentTrainingStatus] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Staff's department
      const profileRes = await getMyProfile();
      const department = profileRes.data.department || profileRes.data.dept;
      setMyDept(department);

      // 2. Fetch all real data
      const [studentsRes, appsRes, selRes, intRes, jobsRes] = await Promise.all([
        getStudents(),
        getPlacementApplications(),
        getPlacementSelections(),
        getPlacementInterviews(),
        getPlacementJobs()
      ]);

      // 3. Filter data for THIS Staff's department
      const deptStudents = studentsRes.data.filter(s => s.dept === department);
      setStudents(deptStudents);

      const deptStudentRegNos = deptStudents.map(s => s.id || s.regNo);
      
      const deptApps = appsRes.data.filter(app => 
        (app.dept === department) || deptStudentRegNos.includes(app.regNo)
      );
      setApplications(deptApps);

      const deptSelections = selRes.data.filter(sel => 
        deptStudentRegNos.includes(sel.regNo)
      );
      setSelections(deptSelections);

      setInterviews(intRes.data); // Interviews are generally company-wide, but staff coordinates them
      setJobs(jobsRes.data);

    } catch (err) {
      console.error("Failed to fetch Staff placement data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingStatusChange = (studentId, trainingId, status) => {
    setStudentTrainingStatus(prev => ({
      ...prev,
      [`${studentId}-${trainingId}`]: status
    }));
  };

  // Derived Statistics
  const totalStudents = students.length;
  const eligibleStudents = students.filter(s => (s.cgpa || 0) >= 6.5);
  const appliedRegNos = [...new Set(applications.map(app => app.regNo))];
  const appliedStudentsCount = appliedRegNos.length;
  const selectedStudentsCount = selections.length;
  const placementPercentage = totalStudents > 0 
    ? Math.round((selectedStudentsCount / totalStudents) * 100) 
    : 0;

  const renderStats = () => (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Students', value: totalStudents, icon: <Users size={16}/>, color: 'var(--primary)', bg: '#EEEDFE', sub: 'In Dept' },
          { label: 'Eligible Students', value: eligibleStudents.length, icon: <CheckCircle size={16}/>, color: 'var(--success)', bg: '#E1F5EE', sub: 'Criteria met' },
          { label: 'Applied Students', value: appliedStudentsCount, icon: <FileText size={16}/>, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Participating' },
          { label: 'Selected Students', value: selectedStudentsCount, icon: <Award size={16}/>, color: 'var(--success)', bg: '#E1F5EE', sub: 'Got offers' },
          { label: 'Placement Rate', value: `${placementPercentage}%`, icon: <TrendingUp size={16}/>, color: 'var(--success)', bg: '#E1F5EE', sub: 'Dept avg' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-details">
              <h3 style={{ fontSize: '0.8rem' }}>{s.label}</h3>
              <p className="stat-value" style={{ fontSize: '1.4rem' }}>{s.value}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEligibleStudents = () => {
    const filtered = eligibleStudents.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ fontWeight: 700 }}>Eligible Students Verification</h4>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Reg No</th><th>Student Name</th><th>CGPA</th><th>Arrears</th><th>Eligibility Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-sm">{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ fontWeight: 700, color: '#3b82f6' }}>{s.cgpa || 'N/A'}</td>
                  <td>{0 /* Mock arrears as 0 */}</td>
                  <td><span style={{ color: '#10b981', fontWeight: 700 }}>Eligible</span></td>
                  <td><button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => showToast(`Record verified for ${s.name}`)}>Verify Record</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>No eligible students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTrainingPrograms = () => {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Placement Training Coordination</h4>
        <p className="text-muted text-sm mb-4">Mark attendance and completion status for departmental placement training.</p>
        
        {trainingPrograms.map(prog => (
          <div key={prog.id} style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <h5 style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{prog.type} - <span style={{ color: 'var(--text-muted)' }}>{new Date(prog.date).toLocaleDateString()}</span></h5>
            <div className="table-container" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr><th>Student Name</th><th>Reg No</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {eligibleStudents.slice(0, 5).map(s => {
                    const status = studentTrainingStatus[`${s.id}-${prog.id}`] || 'Pending';
                    return (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td className="font-mono text-sm">{s.id}</td>
                        <td>
                          <select 
                            value={status} 
                            onChange={(e) => handleTrainingStatusChange(s.id, prog.id, e.target.value)}
                            style={{ 
                              padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem',
                              background: status === 'Completed' ? '#d1fae5' : status === 'Absent' ? '#fee2e2' : '#fef3c7',
                              color: status === 'Completed' ? '#065f46' : status === 'Absent' ? '#991b1b' : '#92400e',
                              border: 'none', outline: 'none', cursor: 'pointer'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Absent">Absent</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      await updatePlacementApplicationStatus(appId, newStatus);
      // Update local state
      setApplications(prev => prev.map(a => a._id === appId || a.applicationId === appId ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const renderApplications = () => {
    const filtered = applications.filter(a => 
      a.student.toLowerCase().includes(search.toLowerCase()) || 
      a.company.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Student Applications Tracking ({filtered.length})</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Student Name</th><th>Company</th><th>Role</th><th>Application Status</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id || a.applicationId}>
                  <td style={{ fontWeight: 600 }}>{a.student}</td>
                  <td style={{ fontWeight: 700, color: '#6366F1' }}>{a.company}</td>
                  <td>{a.role}</td>
                  <td>
                    <select 
                      value={a.status} 
                      onChange={(e) => handleUpdateStatus(a._id || a.applicationId, e.target.value)}
                      style={{ 
                        background: a.status === 'Shortlisted' ? 'rgba(245,158,11,0.12)' : 
                                    a.status === 'Selected' ? 'rgba(16,185,129,0.12)' : 
                                    a.status === 'Rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)', 
                        color: a.status === 'Shortlisted' ? '#f59e0b' : 
                               a.status === 'Selected' ? '#10b981' : 
                               a.status === 'Rejected' ? '#ef4444' : '#3b82f6', 
                        padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, border: 'none', outline: 'none', cursor: 'pointer'
                      }}
                    >
                      <option value="Applied" style={{ color: '#000' }}>Applied</option>
                      <option value="Shortlisted" style={{ color: '#000' }}>Shortlisted</option>
                      <option value="Selected" style={{ color: '#000' }}>Selected</option>
                      <option value="Waitlisted" style={{ color: '#000' }}>Waitlisted</option>
                      <option value="Rejected" style={{ color: '#000' }}>Rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>No applications found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInterviews = () => {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Coordinate Interview Schedules</h4>
        <p className="text-sm text-muted mb-4">Ensure students from your department attend these scheduled drives.</p>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Company</th><th>Round</th><th>Interview Date</th><th>Time</th><th>Venue / Mode</th><th>Action</th></tr>
            </thead>
            <tbody>
              {interviews.map(i => (
                <tr key={i._id || i.interviewId}>
                  <td style={{ fontWeight: 700, color: '#3b82f6' }}>{i.company}</td>
                  <td>{i.round}</td>
                  <td style={{ fontWeight: 600 }}>{i.date ? new Date(i.date).toLocaleDateString() : ''}</td>
                  <td>{i.time}</td>
                  <td>{i.mode === 'Online' ? <span className="text-blue-500 font-bold">Online Link</span> : i.venue}</td>
                  <td><button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => showToast('Students have been notified via portal!')}>Notify Students</button></td>
                </tr>
              ))}
              {interviews.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>No interviews scheduled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading departmental placement data...</div>;

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Briefcase style={{ color: '#3b82f6' }} size={28} /> Placement Coordination Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            <strong>{myDept}</strong> Department Placement Statistics & Tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
           <button className="btn-secondary flex items-center gap-2 text-sm"><Bell size={16}/> Placement Notices</button>
        </div>
      </div>

      {renderStats()}

      {/* Tabs */}
      <div className="glass-card" style={{ padding: '0.4rem', borderRadius: 12, display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          ['eligible', '✅ Eligible Students'], 
          ['training', '📚 Training Programs'], 
          ['applications', '📝 Applications Tracking'], 
          ['interviews', '📅 Interview Schedule']
        ].map(([key, label]) => (
          <button 
            key={key} 
            onClick={() => setTab(key)} 
            style={{ 
              padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
              background: tab === key ? '#3b82f6' : 'transparent', 
              color: tab === key ? 'white' : 'var(--text-muted)', 
              border: 'none', cursor: 'pointer', transition: 'all 0.2s' 
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search Bar for lists */}
      {['eligible', 'applications'].includes(tab) && (
        <div style={{ position: 'relative', marginBottom: '1rem', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search student or company..." 
            style={{ padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.85rem', width: '100%' }} 
          />
        </div>
      )}

      {/* Content */}
      {tab === 'eligible' && renderEligibleStudents()}
      {tab === 'training' && renderTrainingPrograms()}
      {tab === 'applications' && renderApplications()}
      {tab === 'interviews' && renderInterviews()}

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', background: '#10b981', color: 'white',
          padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontWeight: 'bold', zIndex: 9999, animation: 'fadeIn 0.3s ease-out'
        }}>
          <CheckCircle size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
          {toastMsg}
        </div>
      )}
    </div>
  );
}
