import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Users, GraduationCap, BookOpen, TrendingUp, Download, Calendar } from 'lucide-react';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept:'Computer Science', name:'HOD' }; }
  catch { return { dept:'Computer Science', name:'HOD' }; }
};

const SEMESTER_CGPA = [
  { sem:'Sem 1', avg:8.1 }, { sem:'Sem 2', avg:7.9 }, { sem:'Sem 3', avg:8.3 },
  { sem:'Sem 4', avg:8.0 }, { sem:'Sem 5', avg:8.5 }, { sem:'Sem 6', avg:8.7 },
];
const ATT_TREND = [
  { month:'Jan', att:90 }, { month:'Feb', att:88 }, { month:'Mar', att:92 },
  { month:'Apr', att:87 }, { month:'May', att:91 }, { month:'Jun', att:89 },
];
const FEE_STATUS = [
  { label:'Paid', count:7, color:'#10b981' },
  { label:'Pending', count:2, color:'#f59e0b' },
  { label:'Partial', count:1, color:'#ef4444' },
];

const StatCard = ({ label, value, sub, color }) => (
  <div className="sm-summary-card glass-card">
    <span className="sm-summary-label">{label}</span>
    <span className={`sm-summary-value ${color||''}`}>{value}</span>
    {sub && <span className="text-muted" style={{fontSize:'0.75rem',marginTop:'0.25rem'}}>{sub}</span>}
  </div>
);

const HodReports = () => {
  const hod = getHodSession();
  const DEPT = hod.dept;

  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    const sSaved = localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    const allStu = sSaved ? JSON.parse(sSaved) : [];
    setStudents(allStu.filter(s => s.dept === DEPT));

    const stSaved = localStorage.getItem('erp_staff');
    const allStaff = stSaved ? JSON.parse(stSaved) : [];
    setStaff(allStaff.filter(s => s.dept === DEPT));

    const subSaved = localStorage.getItem(`erp_subjects_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    const allSubs = subSaved ? JSON.parse(subSaved) : [];
    setSubjects(allSubs.filter(s => s.dept === DEPT));

    const lSaved = localStorage.getItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    const allLeaves = lSaved ? JSON.parse(lSaved) : [];
    setLeaves(allLeaves.filter(l => l.dept === DEPT));
  }, [DEPT]);

  const avgAtt = students.length ? (students.reduce((a,s)=>a+(s.attendance||0),0)/students.length).toFixed(1) : 91;
  const avgCgpa = students.length ? (students.reduce((a,s)=>a+(s.cgpa||0),0)/students.length).toFixed(2) : 8.3;
  const pendingLeaves = leaves.filter(l=>(l.status||'Pending')==='Pending').length;
  const feeDefaulters = students.filter(s=>s.feeStatus==='Pending'||s.feeStatus==='Partial').length;

  return (
    <div className="animate-fade-in" style={{ padding:'1.5rem' }}>
      <div className="page-header">
        <div><h1>Department Reports — {DEPT}</h1><p className="text-muted">Comprehensive academic performance, attendance, and operational analytics.</p></div>
        <button className="btn-primary shadow-glow" style={{display:'flex',alignItems:'center',gap:6}} onClick={()=>window.print()}>
          <Download size={16}/> Export PDF
        </button>
      </div>

      {/* KPI Row */}
      <div className="sm-summary-row" style={{ marginTop:'1.5rem', gridTemplateColumns:'repeat(4,1fr)' }}>
        <StatCard label="Total Students" value={students.length||10} sub="Enrolled" />
        <StatCard label="Total Staff" value={staff.length||3} sub="Faculty" />
        <StatCard label="Avg Attendance" value={`${avgAtt}%`} color="text-success" />
        <StatCard label="Avg CGPA" value={avgCgpa} color="gradient-text" />
      </div>
      <div className="sm-summary-row" style={{ marginTop:'1rem', gridTemplateColumns:'repeat(4,1fr)' }}>
        <StatCard label="Subjects Offered" value={subjects.length||8} />
        <StatCard label="Pending Leaves" value={pendingLeaves||2} color="text-warning-c" />
        <StatCard label="Fee Defaulters" value={feeDefaulters||2} color="text-danger" />
        <StatCard label="Low Attendance" value={students.filter(s=>(s.attendance||90)<75).length||0} sub="Below 75%" color="text-danger" />
      </div>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginTop:'1.5rem' }}>
        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h3 style={{fontWeight:700,marginBottom:'1.25rem',color:'var(--text-main)'}}>Semester-wise Avg CGPA</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SEMESTER_CGPA} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
              <XAxis dataKey="sem" stroke="var(--text-muted)" fontSize={12}/>
              <YAxis stroke="var(--text-muted)" domain={[0,10]} fontSize={12}/>
              <Tooltip contentStyle={{borderRadius:8,background:'var(--bg-secondary)',border:'none',color:'var(--text-main)'}}/>
              <Bar dataKey="avg" name="Avg CGPA" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h3 style={{fontWeight:700,marginBottom:'1.25rem',color:'var(--text-main)'}}>Monthly Attendance Trend (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ATT_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12}/>
              <YAxis stroke="var(--text-muted)" domain={[75,100]} fontSize={12}/>
              <Tooltip contentStyle={{borderRadius:8,background:'var(--bg-secondary)',border:'none',color:'var(--text-main)'}}/>
              <Line type="monotone" dataKey="att" name="Attendance %" stroke="#10b981" strokeWidth={2.5} dot={{ r:4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fee Status */}
      <div className="glass-card" style={{ padding:'1.5rem', marginTop:'1.5rem' }}>
        <h3 style={{fontWeight:700,marginBottom:'1rem',color:'var(--text-main)'}}>Fee Collection Status</h3>
        <div style={{display:'flex',gap:'2rem',alignItems:'center',flexWrap:'wrap'}}>
          {FEE_STATUS.map(f => (
            <div key={f.label} style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:f.color,flexShrink:0}}/>
              <span style={{fontWeight:600,color:'var(--text-main)'}}>{f.label}:</span>
              <span style={{fontWeight:700,color:f.color,fontSize:'1.2rem'}}>{f.count}</span>
              <span className="text-muted" style={{fontSize:'0.82rem'}}>students</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HodReports;
