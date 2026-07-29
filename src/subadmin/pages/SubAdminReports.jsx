import React, { useState } from 'react';
import { BarChart2, FileText, Users, TrendingUp, Download, Printer, Table2, AlertTriangle, Trophy, BookOpen, DollarSign, Clock, Filter, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getAttendanceReport, getLowAttendanceReport, getCgpaReport, getFeesReport, getDepartmentsReport } from '../../api/index';
import '../../pages/reports/ReportsManagement.css';

const TABS = ['All Reports','Student Report','Staff Report','Attendance Report','Department Report','Exam Report','Fees Report','Leave Report'];
const DEPARTMENTS = ['All Departments', 'Computer Science', 'Electrical Engg.', 'Mechanical Engg.', 'Civil Engg.', 'Information Tech.'];
const AVATAR_COLORS = ['bg-gradient-blue','bg-gradient-purple','bg-gradient-green','bg-gradient-orange','bg-gradient-pink','bg-gradient-teal'];

const DEPT_PERF = [
  { dept:'CS',  cgpa:8.4, attendance:89, fees:95 },
  { dept:'EE',  cgpa:8.7, attendance:92, fees:98 },
  { dept:'ME',  cgpa:7.6, attendance:81, fees:78 },
  { dept:'CE',  cgpa:7.9, attendance:84, fees:85 },
  { dept:'IT',  cgpa:8.9, attendance:94, fees:97 },
];

const SEM_CGPA = [
  { sem:'Sem 1', avg:7.6 },{ sem:'Sem 2', avg:7.9 },{ sem:'Sem 3', avg:8.1 },
  { sem:'Sem 4', avg:8.3 },{ sem:'Sem 5', avg:8.5 },{ sem:'Sem 6', avg:8.7 },
  { sem:'Sem 7', avg:8.8 },{ sem:'Sem 8', avg:9.0 },
];

const ATT_DATA = [
  { month:'Aug', present:88 },{ month:'Sep', present:91 },{ month:'Oct', present:85 },
  { month:'Nov', present:93 },{ month:'Dec', present:78 },{ month:'Jan', present:90 },
];

const FEES_DATA = [
  { month:'Aug', collected:420000, pending:80000 },
  { month:'Sep', collected:380000, pending:120000 },
  { month:'Oct', collected:290000, pending: 10000 },
  { month:'Nov', collected:510000, pending:90000 },
  { month:'Dec', collected:180000, pending:320000 },
  { month:'Jan', collected:350000, pending:150000 },
];

const TOP_STUDENTS = [
  { id:'EE2022002', name:'Sarah Wilson',   dept:'Electrical Engg.',  sem:'Sem 4', cgpa:9.3, att:'95%' },
  { id:'IT2022001', name:'Priya Sharma',   dept:'Information Tech.', sem:'Sem 5', cgpa:9.1, att:'97%' },
  { id:'CS2021004', name:'Emily Davis',    dept:'Computer Science',  sem:'Sem 6', cgpa:8.9, att:'98%' },
  { id:'CS2021001', name:'John Doe',       dept:'Computer Science',  sem:'Sem 6', cgpa:8.5, att:'92%' },
  { id:'CS2022001', name:'David Lee',      dept:'Computer Science',  sem:'Sem 3', cgpa:8.2, att:'87%' },
];

const LOW_ATT = [
  { id:'ME2023002', name:'Arjun Nair',     dept:'Mechanical Engg.', sem:'Sem 2', att:72 },
  { id:'CE2020001', name:'Michael Brown',  dept:'Civil Engg.',      sem:'Sem 8', att:75 },
  { id:'ME2023001', name:'Robert Johnson', dept:'Mechanical Engg.', sem:'Sem 2', att:78 },
];

const STAFF_PERF = [
  { name:'Dr. Ramesh Kumar',  dept:'CS',  classes:42, rating:4.8 },
  { name:'Prof. Lalitha Nair',dept:'EE',  classes:38, rating:4.6 },
  { name:'Dr. Arun Menon',    dept:'ME',  classes:35, rating:4.2 },
  { name:'Ms. Deepa Pillai',  dept:'IT',  classes:40, rating:4.7 },
];

const fmtCurrency = n => '₹' + Number(n).toLocaleString('en-IN');

const REPORT_CARDS = [
  { id:'attendance', title:'Attendance Report',       icon:<BarChart2 size={20}/>, color:'blue',   desc:'Daily & monthly attendance analytics, department-wise breakdown, and low-attendance alerts.' },
  { id:'student',    title:'Student Report',          icon:<Users     size={20}/>, color:'purple', desc:'Comprehensive student demographics, overall performance, and standing.' },
  { id:'exam',       title:'Exam Report',             icon:<BookOpen  size={20}/>, color:'orange', desc:'Semester-wise GPA trends, department CGPA averages, and top/bottom performer analysis.' },
  { id:'fees',       title:'Fees Report',             icon:<DollarSign size={20}/>, color:'green',  desc:'Monthly collection summary, pending fees breakdown, defaulters list, and fine reports.' },
  { id:'department', title:'Department Report',       icon:<BarChart2 size={20}/>, color:'yellow', desc:'Cross-department comparison of CGPA, attendance rates, and fee collection percentages.' },
  { id:'leave',      title:'Leave Report',            icon:<AlertTriangle size={20}/>, color:'red',    desc:'Summary of staff and student leave requests and approvals.' },
  { id:'staff',      title:'Staff Report',            icon:<Users     size={20}/>, color:'teal',   desc:'Class completion rates, student feedback scores, and workload summary per staff member.' },
];

const downloadTxt = (filename, lines) => {
  const blob = new Blob([lines.join('\n')], { type:'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

const generateReport = (type, format) => {
  const ts = new Date().toLocaleString('en-IN');
  const header = [`========================================`, `  ERP SYSTEM - ${type.toUpperCase()} REPORT`, `  Generated: ${ts}`, `========================================`, ''];
  if (format === 'pdf' || format === 'excel') {
    const ext = format === 'excel' ? '.csv' : '.txt';
    downloadTxt(`${type}_report${ext}`, [...header, `Report Type: ${type}`, `Format: ${format.toUpperCase()}`, '', 'Data exported successfully.', '========================================']);
  } else {
    window.print();
  }
};

const SubAdminReports = () => {
  const [activeTab, setActiveTab] = useState('All Reports');
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [dateFilter, setDateFilter] = useState('');
  
  // Real Data States
  const [attReport, setAttReport] = useState(null);
  const [cgpaReport, setCgpaReport] = useState(null);
  const [feesReport, setFeesReport] = useState(null);
  const [deptReport, setDeptReport] = useState(null);
  const [lowAttReport, setLowAttReport] = useState(null);

  React.useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [att, cgpa, fees, dept, lowAtt] = await Promise.all([
          getAttendanceReport(),
          getCgpaReport(),
          getFeesReport(),
          getDepartmentsReport(),
          getLowAttendanceReport()
        ]);
        
        setAttReport(att.data);
        setCgpaReport(cgpa.data);
        setFeesReport(fees.data);
        setDeptReport(dept.data);
        setLowAttReport(lowAtt.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const showAll = activeTab === 'All Reports';
  const showAtt = showAll || activeTab === 'Attendance Report';
  const showExam = showAll || activeTab === 'Exam Report';
  const showFees = showAll || activeTab === 'Fees Report';
  const showDept = showAll || activeTab === 'Department Report';
  const showStudent = showAll || activeTab === 'Student Report';
  const showLeave = showAll || activeTab === 'Leave Report';
  const showStaff = showAll || activeTab === 'Staff Report';

  const visibleCards = REPORT_CARDS.filter(c => {
    if (showAll) return true;
    return { attendance:'Attendance Report', student:'Student Report', exam:'Exam Report', fees:'Fees Report', department:'Department Report', leave:'Leave Report', staff:'Staff Report' }[c.id] === activeTab;
  });

  return (
    <div className="reports-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Sub Admin Analytics &amp; Reports</h1>
          <p className="text-muted">Generate, view, and export department-wise institutional reports securely.</p>
        </div>
        <div className="header-actions">
          <button className="btn-export" onClick={()=>generateReport('full','excel')}><Table2 size={15}/> Export Excel</button>
          <button className="btn-export primary" onClick={()=>generateReport('full','pdf')}><Download size={15}/> Download PDF</button>
          <button className="btn-export success" onClick={()=>window.print()}><Printer size={15}/> Print</button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="filter-select-wrapper">
          <Filter size={14} className="text-muted" />
          <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ paddingLeft: '2rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-main)', height: '36px' }}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="date-picker-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0 0.5rem', height: '36px' }}>
          <Calendar size={14} className="text-muted" />
          <input 
            type="month" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
          />
        </div>
        
        <button className="btn-primary" style={{ padding: '0 1rem', height: '36px', borderRadius: '6px', fontSize: '0.85rem' }} onClick={() => alert('Report data filtered!')}>
          Generate Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="rpt-summary-row">
        {[
          { label:'Total Students', value: cgpaReport ? cgpaReport.totalStudents : '...', sub:'Across all departments',  cls:'rpt-card-blue',   icon:<Users size={16} style={{color:'#3b82f6'}}/> },
          { label:'Avg Attendance',  value: attReport ? attReport.averageAttendance + '%' : '...', sub:'College-wide average',  cls:'rpt-card-green',  icon:<BarChart2 size={16} style={{color:'#10b981'}}/> },
          { label:'Avg CGPA',        value: cgpaReport ? cgpaReport.averageCgpa : '...', sub:'All departments',       cls:'rpt-card-purple', icon:<TrendingUp size={16} style={{color:'#6366F1'}}/> },
          { label:'Fees Collected',  value: feesReport ? fmtCurrency(feesReport.totalCollected) : '...', sub:'Current semester',  cls:'rpt-card-orange', icon:<DollarSign size={16} style={{color:'#f97316'}}/> },
        ].map((c,i)=>(
          <div key={i} className={`rpt-summary-card glass-card ${c.cls}`}>
            {c.icon}
            <span className="rpt-summary-label">{c.label}</span>
            <span className="rpt-summary-value gradient-text">{c.value}</span>
            <span className="rpt-summary-sub">{c.sub}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="report-tabs">
        {TABS.map(t=>(
          <button key={t} className={`rtab ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Charts */}
      {(showDept || showAll) && (
        <div className="charts-grid">
          {/* Department Performance */}
          <div className="glass-card chart-card">
            <h3><BarChart2 size={15}/> Department Performance</h3>
            <p>CGPA, Attendance &amp; Fees % across departments</p>
            <div style={{height:230}}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={DEPT_PERF} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                  <XAxis dataKey="dept" stroke="var(--text-muted)" fontSize={11} tickLine={false}/>
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false}/>
                  <Tooltip contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)',fontSize:12}}/>
                  <Legend iconSize={9} wrapperStyle={{fontSize:'0.78rem'}}/>
                  <Bar dataKey="cgpa"       name="CGPA (×10)" fill="var(--primary)" radius={[4,4,0,0]}/>
                  <Bar dataKey="attendance" name="Attendance%" fill="#10b981" radius={[4,4,0,0]}/>
                  <Bar dataKey="fees"       name="Fees Paid%" fill="#f59e0b" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Semester-wise CGPA */}
          <div className="glass-card chart-card">
            <h3><TrendingUp size={15}/> Semester-wise Exam Trend</h3>
            <p>Average CGPA progression across semesters</p>
            <div style={{height:230}}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={SEM_CGPA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                  <XAxis dataKey="sem" stroke="var(--text-muted)" fontSize={11} tickLine={false}/>
                  <YAxis domain={[7,10]} stroke="var(--text-muted)" fontSize={11} tickLine={false}/>
                  <Tooltip contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)',fontSize:12}}/>
                  <Line type="monotone" dataKey="avg" name="Avg CGPA" stroke="#6366F1" strokeWidth={2.5} dot={{r:4,fill:'#6366F1',stroke:'white',strokeWidth:2}} activeDot={{r:7}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attendance Analytics */}
          {showAtt && (
            <div className="glass-card chart-card">
              <h3><BarChart2 size={15}/> Attendance Analytics</h3>
              <p>Monthly average attendance percentage</p>
              <div style={{height:230}}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={ATT_DATA}>
                    <defs>
                      <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false}/>
                    <YAxis domain={[70,100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={v=>v+'%'}/>
                    <Tooltip formatter={v=>[v+'%','Attendance']} contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)',fontSize:12}}/>
                    <Area type="monotone" dataKey="present" name="Attendance" stroke="#10b981" strokeWidth={2.5} fill="url(#attGrad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Fees Analytics */}
          {showFees && (
            <div className="glass-card chart-card">
              <h3><DollarSign size={15}/> Fees Analytics</h3>
              <p>Monthly collected vs pending fees</p>
              <div style={{height:230}}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={FEES_DATA} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false}/>
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={v=>[fmtCurrency(v)]} contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)',fontSize:12}}/>
                    <Legend iconSize={9} wrapperStyle={{fontSize:'0.78rem'}}/>
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4,4,0,0]}/>
                    <Bar dataKey="pending"   name="Pending"   fill="#ef4444" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="report-cards-grid">
        {visibleCards.map(rc=>(
          <div key={rc.id} className="report-card glass-card">
            <div className="report-card-top">
              <div className={`report-icon ${rc.color}`}>{rc.icon}</div>
              <Clock size={13} style={{color:'var(--text-muted)',marginTop:2}}/>
            </div>
            <div>
              <p className="report-card-title">{rc.title}</p>
              <p className="report-card-desc">{rc.desc}</p>
            </div>
            <div className="report-card-actions">
              <button className="rca-btn pdf"   onClick={()=>generateReport(rc.id,'pdf')}><Download size={12}/> PDF</button>
              <button className="rca-btn excel" onClick={()=>generateReport(rc.id,'excel')}><Table2 size={12}/> Excel</button>
              <button className="rca-btn print" onClick={()=>window.print()}><Printer size={12}/> Print</button>
            </div>
            <div className="report-card-meta">
              <FileText size={12}/> Last generated: Today
            </div>
          </div>
        ))}
      </div>

      {/* Top Students Table */}
      {showStudent && (
        <div className="glass-card">
          <div className="rpt-table-section">
            <h3><Trophy size={15} style={{color:'var(--warning)'}}/> Top Students Report</h3>
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Rank</th><th>Student Name</th><th>Register No</th>
                  <th>Department</th><th>Semester</th><th>CGPA</th><th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {TOP_STUDENTS.map((s,i)=>(
                  <tr key={s.id}>
                    <td><span className={`rank-${i<3?i+1:'n'}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`avatar-xs ${AVATAR_COLORS[i%AVATAR_COLORS.length]}`}>{s.name[0]}</div>
                        <span className="font-semibold">{s.name}</span>
                      </div>
                    </td>
                    <td><span className="roll-no">{s.id}</span></td>
                    <td style={{fontSize:'0.84rem',color:'var(--text-muted)'}}>{s.dept}</td>
                    <td><span className="badge-outline">{s.sem}</span></td>
                    <td><span className="text-success font-semibold">{s.cgpa}</span></td>
                    <td><span className="text-success font-semibold">{s.att}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Performance Table */}
      {showStaff && (
        <div className="glass-card">
          <div className="rpt-table-section">
            <h3><Users size={15}/> Staff Performance Report</h3>
            <table className="rpt-table">
              <thead>
                <tr><th>#</th><th>Staff Name</th><th>Department</th><th>Classes Taken</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {STAFF_PERF.map((s,i)=>(
                  <tr key={i}>
                    <td style={{color:'var(--text-muted)'}}>{i+1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`avatar-xs ${AVATAR_COLORS[i%AVATAR_COLORS.length]}`}>{s.name[0]}</div>
                        <span className="font-semibold">{s.name}</span>
                      </div>
                    </td>
                    <td style={{fontSize:'0.84rem',color:'var(--text-muted)'}}>{s.dept}</td>
                    <td className="font-semibold">{s.classes}</td>
                    <td><span className="text-success font-semibold">{'★'.repeat(Math.round(s.rating))} {s.rating}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminReports;
