import React, { useState, useEffect } from 'react';
import { 
  Briefcase, TrendingUp, Users, CheckCircle, Search, 
  Building, Award, Calendar, FileText
} from 'lucide-react';
import { 
  getStudents, getPlacementJobs, getPlacementApplications, 
  getPlacementSelections, getMyProfile 
} from '../../api/index';
import '../../pages/Dashboard.css';

export default function HodPlacements() {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [myDept, setMyDept] = useState('');
  const [students, setStudents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selections, setSelections] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get HOD's department
      const profileRes = await getMyProfile();
      const department = profileRes.data.department || profileRes.data.dept;
      setMyDept(department);

      // 2. Fetch all real data
      const [studentsRes, jobsRes, appsRes, selRes] = await Promise.all([
        getStudents(),
        getPlacementJobs(),
        getPlacementApplications(),
        getPlacementSelections()
      ]);

      // 3. Filter data for THIS HOD's department
      const deptStudents = studentsRes.data.filter(s => s.dept === department);
      setStudents(deptStudents);
      setJobs(jobsRes.data);

      // Applications could have dept, or we filter by matching student regNo
      const deptStudentRegNos = deptStudents.map(s => s.id || s.regNo);
      
      const deptApps = appsRes.data.filter(app => 
        (app.dept === department) || deptStudentRegNos.includes(app.regNo)
      );
      setApplications(deptApps);

      const deptSelections = selRes.data.filter(sel => 
        deptStudentRegNos.includes(sel.regNo)
      );
      setSelections(deptSelections);

    } catch (err) {
      console.error("Failed to fetch HOD placement data", err);
    } finally {
      setLoading(false);
    }
  };

  // Derived Statistics
  const totalStudents = students.length;
  // Let's assume eligible students are those with CGPA >= 6.5 (you can adjust this logic)
  const eligibleStudents = students.filter(s => (s.cgpa || 0) >= 6.5);
  // Applied students (unique students who have applied)
  const appliedRegNos = [...new Set(applications.map(app => app.regNo))];
  const appliedStudentsCount = appliedRegNos.length;
  const selectedStudentsCount = selections.length;
  const placementPercentage = totalStudents > 0 
    ? Math.round((selectedStudentsCount / totalStudents) * 100) 
    : 0;

  // Calculate Highest & Average Package
  let highestPackage = 0;
  let totalPackage = 0;
  let packageCount = 0;
  selections.forEach(sel => {
    const match = sel.ctc.match(/(\d+(\.\d+)?)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (val > highestPackage) highestPackage = val;
      totalPackage += val;
      packageCount++;
    }
  });
  const avgPackage = packageCount > 0 ? (totalPackage / packageCount).toFixed(2) : 0;

  // Render Tabs
  const renderOverview = () => (
    <div className="animate-fade-in">
      <div className="grid gap-4 mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Students', value: totalStudents, icon: <Users size={16}/>, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Final Year' },
          { label: 'Eligible', value: eligibleStudents.length, icon: <CheckCircle size={16}/>, color: 'var(--success)', bg: '#E1F5EE', sub: 'Criteria met' },
          { label: 'Applied', value: appliedStudentsCount, icon: <FileText size={16}/>, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Participating' },
          { label: 'Selected', value: selectedStudentsCount, icon: <Award size={16}/>, color: 'var(--success)', bg: '#E1F5EE', sub: 'Got offers' },
          { label: 'Placement %', value: `${placementPercentage}%`, icon: <TrendingUp size={16}/>, color: 'var(--success)', bg: '#E1F5EE', sub: 'Dept rate' },
          { label: 'Highest Pkg', value: highestPackage > 0 ? `${highestPackage} LPA` : 'N/A', icon: <TrendingUp size={16}/>, color: 'var(--success)', bg: '#E1F5EE', sub: 'Max Offer' },
          { label: 'Average Pkg', value: avgPackage > 0 ? `${avgPackage} LPA` : 'N/A', icon: <TrendingUp size={16}/>, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Mean Offer' },
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
        <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Eligible Students ({filtered.length})</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Reg No</th><th>Student Name</th><th>CGPA</th><th>Arrears</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-sm">{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ fontWeight: 700, color: '#3730A5' }}>{s.cgpa || 'N/A'}</td>
                  <td>{0 /* Mocking arrears as 0 for eligible */}</td>
                  <td>
                    <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                      Eligible
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No eligible students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAppliedStudents = () => {
    const filtered = applications.filter(a => 
      a.student.toLowerCase().includes(search.toLowerCase()) || 
      a.company.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Applied Students ({filtered.length})</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Student Name</th><th>Company</th><th>Applied Date</th><th>Application Status</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id || a.applicationId}>
                  <td style={{ fontWeight: 600 }}>{a.student}</td>
                  <td style={{ fontWeight: 700, color: '#6366F1' }}>{a.company}</td>
                  <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Recent'}</td>
                  <td>
                    <span style={{ 
                      background: a.status === 'Shortlisted' ? 'rgba(16,185,129,0.12)' : 'rgba(55, 48, 165, 0.12)', 
                      color: a.status === 'Shortlisted' ? '#10b981' : '#3730A5', 
                      padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 
                    }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No applications found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSelections = () => {
    const filtered = selections.filter(s => 
      s.student.toLowerCase().includes(search.toLowerCase()) || 
      s.company.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Selected Students Registry ({filtered.length})</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Reg No</th><th>Student Name</th><th>Company</th><th>Role</th><th>Package (CTC)</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id || s.selectionId}>
                  <td className="font-mono text-sm">{s.regNo}</td>
                  <td style={{ fontWeight: 600 }}>{s.student}</td>
                  <td style={{ fontWeight: 700, color: '#f59e0b' }}>{s.company}</td>
                  <td>{s.role}</td>
                  <td style={{ fontWeight: 800, color: '#10b981' }}>{s.ctc}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No selections found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDrives = () => {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Recruitment Drives Tracking</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Company Name</th><th>Role</th><th>Drive Date</th><th>Applied (Your Dept)</th><th>Selected (Your Dept)</th></tr>
            </thead>
            <tbody>
              {jobs.map(j => {
                const deptApplies = applications.filter(a => a.company === j.company && a.role === j.role).length;
                const deptSelects = selections.filter(s => s.company === j.company && s.role === j.role).length;

                return (
                  <tr key={j._id || j.jobId}>
                    <td style={{ fontWeight: 700, color: '#3730A5' }}>{j.company}</td>
                    <td>{j.role}</td>
                    <td>{j.driveDate ? new Date(j.driveDate).toLocaleDateString() : 'TBA'}</td>
                    <td style={{ fontWeight: 600 }}>{deptApplies}</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{deptSelects}</td>
                  </tr>
                );
              })}
              {jobs.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No upcoming drives.</td></tr>
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Briefcase style={{ color: '#3730A5' }} size={28} /> Department Placements
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Monitoring placement activities for <strong>{myDept}</strong> department.
        </p>
      </div>

      {renderOverview()}

      {/* Tabs */}
      <div className="glass-card" style={{ padding: '0.4rem', borderRadius: 12, display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          ['overview', '📊 Dept Overview'], 
          ['eligible', '✅ Eligible Students'], 
          ['applied', '📝 Applied Students'], 
          ['selected', '🏆 Selected Students'],
          ['drives', '🏢 Recruitment Drives']
        ].map(([key, label]) => (
          <button 
            key={key} 
            onClick={() => setTab(key)} 
            style={{ 
              padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
              background: tab === key ? '#3730A5' : 'transparent', 
              color: tab === key ? 'white' : 'var(--text-muted)', 
              border: 'none', cursor: 'pointer', transition: 'all 0.2s' 
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search Bar for lists */}
      {['eligible', 'applied', 'selected'].includes(tab) && (
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
      {tab === 'overview' && <div className="text-muted italic">Click on tabs above to view detailed lists.</div>}
      {tab === 'eligible' && renderEligibleStudents()}
      {tab === 'applied' && renderAppliedStudents()}
      {tab === 'selected' && renderSelections()}
      {tab === 'drives' && renderDrives()}
    </div>
  );
}
