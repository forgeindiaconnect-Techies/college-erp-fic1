import React, { useState, useEffect } from 'react';
import { Briefcase, TrendingUp, DollarSign, Award, Users, Search, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { getStudents, getPlacementJobs, getPlacementApplications, getPlacementSelections } from '../../api/index';
import '../../pages/Dashboard.css';

export default function PrincipalPlacements() {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  
  const [loading, setLoading] = useState(true);
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
      const [studentsRes, jobsRes, appsRes, selRes] = await Promise.all([
        getStudents(),
        getPlacementJobs(),
        getPlacementApplications(),
        getPlacementSelections()
      ]);
      setStudents(studentsRes.data);
      setJobs(jobsRes.data);
      setApplications(appsRes.data);
      setSelections(selRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const depts = ['All', ...new Set(students.map(s => s.dept).filter(Boolean))];

  // Calculations
  const totalStudents = students.length;
  const appliedRegNos = [...new Set(applications.map(app => app.regNo))];
  const appliedStudentsCount = appliedRegNos.length;
  const selectedStudentsCount = selections.length;
  const placementRate = totalStudents > 0 ? Math.round((selectedStudentsCount / totalStudents) * 100) : 0;

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

  // Department-wise Report
  const deptPlacementData = depts.filter(d => d !== 'All').map(dept => {
    const deptStudents = students.filter(s => s.dept === dept);
    const deptSelections = selections.filter(sel => deptStudents.some(s => s.id === sel.regNo || s.regNo === sel.regNo));
    
    let deptHighest = 0;
    let deptTotalPkg = 0;
    let deptPkgCount = 0;

    deptSelections.forEach(sel => {
      const match = sel.ctc.match(/(\d+(\.\d+)?)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > deptHighest) deptHighest = val;
        deptTotalPkg += val;
        deptPkgCount++;
      }
    });

    return {
      dept,
      total: deptStudents.length,
      placed: deptSelections.length,
      rate: deptStudents.length > 0 ? Math.round((deptSelections.length / deptStudents.length) * 100) : 0,
      avgPkg: deptPkgCount > 0 ? (deptTotalPkg / deptPkgCount).toFixed(2) : 0
    };
  });

  // Dynamic Upcoming Drives
  const upcomingDrives = jobs.map(j => ({
    id: j._id || j.jobId,
    company: j.company,
    date: j.deadline ? new Date(j.deadline).toLocaleDateString() : 'TBD',
    eligibility: `CGPA >= ${j.minCgpa || 0}`,
    type: 'On-Campus',
    status: 'Active'
  }));

  // Dynamic Recruiter Data
  const recruiterStats = {};
  selections.forEach(sel => {
    const comp = sel.company || 'Unknown';
    if (!recruiterStats[comp]) {
      recruiterStats[comp] = { placed: 0, totalPkg: 0, maxPkg: 0, count: 0 };
    }
    recruiterStats[comp].placed += 1;
    const match = sel.ctc ? sel.ctc.match(/(\d+(\.\d+)?)/) : null;
    if (match) {
      const val = parseFloat(match[1]);
      recruiterStats[comp].totalPkg += val;
      if (val > recruiterStats[comp].maxPkg) recruiterStats[comp].maxPkg = val;
      recruiterStats[comp].count += 1;
    }
  });

  const recruiterData = Object.keys(recruiterStats).map((comp, index) => {
    const colors = ['#ea4335', '#00a4ef', '#ff9900', '#1f2937', '#007cc3', '#0033a0', '#3b82f6', '#10b981'];
    return {
      company: comp,
      placed: recruiterStats[comp].placed,
      avgPkg: recruiterStats[comp].count > 0 ? (recruiterStats[comp].totalPkg / recruiterStats[comp].count).toFixed(2) : 0,
      maxPkg: recruiterStats[comp].maxPkg,
      logoBg: colors[index % colors.length]
    };
  }).sort((a, b) => b.placed - a.placed);

  // Dynamic Placement Stats (Yearly Trend)
  // Grouping by year of selection date (or current year as fallback)
  const statsByYear = {};
  selections.forEach(sel => {
    const year = sel.date ? new Date(sel.date).getFullYear().toString() : new Date().getFullYear().toString();
    if (!statsByYear[year]) {
      statsByYear[year] = { year, placed: 0, offers: 0, totalPkg: 0, maxPkg: 0, count: 0 };
    }
    statsByYear[year].placed += 1;
    const match = sel.ctc ? sel.ctc.match(/(\d+(\.\d+)?)/) : null;
    if (match) {
      const val = parseFloat(match[1]);
      statsByYear[year].totalPkg += val;
      if (val > statsByYear[year].maxPkg) statsByYear[year].maxPkg = val;
      statsByYear[year].count += 1;
    }
  });
  
  // Also count applications for "offers/applications" metric by year
  applications.forEach(app => {
    const year = app.createdAt ? new Date(app.createdAt).getFullYear().toString() : new Date().getFullYear().toString();
    if (!statsByYear[year]) {
      statsByYear[year] = { year, placed: 0, offers: 0, totalPkg: 0, maxPkg: 0, count: 0 };
    }
    statsByYear[year].offers += 1;
  });

  const placementStats = Object.values(statsByYear).map(s => ({
    year: s.year,
    placed: s.placed,
    offers: s.offers,
    avgPkg: s.count > 0 ? (s.totalPkg / s.count).toFixed(2) : 0,
    maxPkg: s.maxPkg
  })).sort((a, b) => a.year.localeCompare(b.year));

  const filteredStudents = selections.filter(s =>
    (filterDept === 'All' || students.find(st => st.id === s.regNo || st.regNo === s.regNo)?.dept === filterDept) &&
    (s.student?.toLowerCase().includes(search.toLowerCase()) || s.company?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div style={{ padding: '2rem' }}>Loading institutional placement data...</div>;

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Briefcase style={{ color: '#3730A5' }} size={28} /> Placement Cell Control Center
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time monitoring of campus recruitment campaigns, salary distributions, and drives.</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Overall Placed', value: `${placementRate}%`, icon: <CheckCircle size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: 'Placement Rate' },
          { label: 'Highest Package', value: `${highestPackage} LPA`, icon: <DollarSign size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: 'Institution Max' },
          { label: 'Average Package', value: `${avgPackage} LPA`, icon: <TrendingUp size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Institution Avg' },
          { label: 'Total Applications', value: applications.length, icon: <Award size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Overall applied' },
          { label: 'Students Placed', value: `${selectedStudentsCount} Placed`, icon: <Users size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: `Out of ${totalStudents}` },
          { label: 'Active Drives', value: jobs.length, icon: <Calendar size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Total drives' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-details">
              <h3>{s.label}</h3>
              <p className="stat-value" style={{ fontSize: '1.25rem' }}>{s.value}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation tabs */}
      <div className="glass-card" style={{ padding: '0.4rem', borderRadius: 12, display: 'inline-flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {[['overview', '📊 Placements Overview'], ['companies', '🏢 Top Recruiters'], ['students', '🎓 Placed Students Registry'], ['drives', '📅 Recruitment Drives']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, background: tab === key ? '#3730A5' : 'transparent', color: tab === key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>5-Year Placement Trend (Placed vs Offers)</h4>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={placementStats}>
                <defs>
                  <linearGradient id="colorOffers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPlaced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="offers" name="Total Offers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOffers)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="placed" name="Placed Count" stroke="#10b981" fillOpacity={1} fill="url(#colorPlaced)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Department Placement Rate & Avg Package</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptPlacementData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" domain={[50, 100]} tick={{ fontSize: 9 }} name="Rate %" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} name="LPA" />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="rate" fill="#6366f1" name="Placement Rate %" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgPkg" fill="#f59e0b" name="Avg Package (LPA)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1rem' }}>Quick Metrics Audit</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Placement Target', '95%', '#3b82f6'], ['Current Rate', '92%', '#10b981'], ['Salary Average', '6.8 LPA', '#6366F1'], ['Max Offer package', '45.0 LPA', '#f59e0b']].map(([k, v, c]) => (
                <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${c}` }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recruiters Tab */}
      {tab === 'companies' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Top Placement Partners (Count Placed)</h4>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={recruiterData} layout="vertical" barSize={15} margin={{ left: 15 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="company" type="category" tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip />
                <Bar dataKey="placed" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Students Placed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Partner Compensation Structure</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recruiterData.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.logoBg }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', width: 85 }}>{r.company}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Average: <strong>{r.avgPkg} LPA</strong></span>
                      <span>Max: <strong>{r.maxPkg} LPA</strong></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3 }}>
                      <div style={{ width: `${(r.maxPkg / (highestPackage || 1)) * 100}%`, height: '100%', background: r.logoBg, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Registry Tab */}
      {tab === 'students' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>Placed Students Registry</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '0.4rem 0.7rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company / name..." style={{ padding: '0.4rem 0.7rem 0.4rem 1.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem', width: 200 }} />
              </div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Student Name</th><th>Department</th><th>Company</th><th>Package (LPA)</th><th>Designation</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No student records found matching the query.</td></tr>
                ) : filteredStudents.map((s, i) => {
                  const matchedStudent = students.find(st => st.id === s.regNo || st.regNo === s.regNo);
                  const dept = matchedStudent ? matchedStudent.dept : 'Unknown';
                  
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.student} <br/><span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{s.regNo}</span></td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3b82f6' }}>{dept}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.company}</td>
                      <td style={{ fontWeight: 800, color: '#10b981', fontSize: '0.88rem' }}>{s.ctc}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.role}</td>
                      <td>
                        <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>Verified</span>
                      </td>
                      <td>
                        <button style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>View Certificate</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drives Tab */}
      {tab === 'drives' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '1rem' }}>📅 Upcoming Recruitment Drives</h4>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Drive ID</th><th>Recruiter</th><th>Drive Date</th><th>Eligibility Criteria</th><th>Drive Mode</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {upcomingDrives.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: '#3b82f6', fontSize: '0.82rem' }}>{d.id}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{d.company}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{d.date}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{d.eligibility}</td>
                    <td>
                      <span style={{ background: d.type === 'On-Campus' ? 'rgba(59,130,246,0.1)' : 'rgba(99, 102, 241,0.1)', color: d.type === 'On-Campus' ? '#3b82f6' : '#6366F1', padding: '3px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{d.type}</span>
                    </td>
                    <td>
                      <span style={{ background: d.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: d.status === 'Active' ? '#10b981' : '#ef4444', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{d.status}</span>
                    </td>
                    <td>
                      <button style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Register Students</button>
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
}
