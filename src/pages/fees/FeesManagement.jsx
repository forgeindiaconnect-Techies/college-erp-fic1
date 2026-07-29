import React, { useState, useEffect } from 'react';
import {
  Search, Filter, DollarSign, TrendingUp, AlertTriangle,
  CheckCircle, X, Download, Eye, Receipt, IndianRupee, Users,
  Settings, UserPlus, FileText, Banknote, ShieldAlert, Award, LayoutGrid, Bell
} from 'lucide-react';
import { getStudents, getAllFees } from '../../api/index';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import './FeesManagement.css';

const DEPARTMENTS = ['All','Computer Science','Electrical Engg.','Mechanical Engg.','Civil Engg.','Information Tech.', 'Computer Science & Engineering', 'Information Technology', 'Biotechnology Engineering', 'Artificial Intelligence & Data Science', 'Cyber Security'];
const SEMESTERS   = ['All','Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const PIE_COLORS  = { Paid:'#10b981', Pending:'#ef4444', Partial:'#f59e0b', Waived:'#6366f1' };
const AVATAR_COLORS = ['bg-gradient-blue','bg-gradient-purple','bg-gradient-green','bg-gradient-orange','bg-gradient-pink','bg-gradient-teal'];
const getInitials = n => n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
const fmtCurrency = n => '₹' + Number(n).toLocaleString('en-IN');

// MOCK DATA for new modules
const MOCK_FEE_STRUCTURES = [
  { id: 'FS001', dept: 'Computer Science', sem: 'Sem 6', tuition: 60000, lab: 10000, library: 5000, total: 75000 },
  { id: 'FS002', dept: 'Electrical Engg.', sem: 'Sem 4', tuition: 55000, lab: 10000, library: 5000, total: 70000 },
  { id: 'FS003', dept: 'Mechanical Engg.', sem: 'Sem 2', tuition: 50000, lab: 10000, library: 5000, total: 65000 },
];

// Scholarships loaded from localStorage (written by Accounts > Scholarships page)
const loadScholarsLS = () => {
  try { return JSON.parse(localStorage.getItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]'); } catch { return []; }
};

const MOCK_FEES = [
  { id:'CS2021001', name:'John Doe',       dept:'Computer Science',  sem:'Sem 6',
    semesterFee:75000, fine:0,    paid:75000, status:'Paid',    dueDate:'2024-03-15',
    payments:[
      { id: 'TXN20240110A', date:'2024-01-10', amount:40000, mode:'Online' },
      { id: 'TXN20240205B', date:'2024-02-05', amount:35000, mode:'Online' },
    ]},
  { id:'EE2022001', name:'Alice Smith',    dept:'Electrical Engg.',  sem:'Sem 4',
    semesterFee:70000, fine:0,    paid:70000, status:'Paid',    dueDate:'2024-03-15',
    payments:[
      { id: 'DD20240108C', date:'2024-01-08', amount:70000, mode:'DD' },
    ]},
  { id:'ME2023001', name:'Robert Johnson', dept:'Mechanical Engg.',  sem:'Sem 2',
    semesterFee:65000, fine:2500, paid:0,     status:'Pending', dueDate:'2024-03-15',
    payments:[]},
  { id:'CS2021004', name:'Emily Davis',    dept:'Computer Science',  sem:'Sem 6',
    semesterFee:75000, fine:0,    paid:75000, status:'Paid',    dueDate:'2024-03-15',
    payments:[
      { id: 'TXN20240112D', date:'2024-01-12', amount:75000, mode:'Online' },
    ]},
  { id:'CE2020001', name:'Michael Brown',  dept:'Civil Engg.',       sem:'Sem 8',
    semesterFee:62000, fine:3000, paid:35000, status:'Partial', dueDate:'2024-03-15',
    payments:[
      { id: 'CASH20240105E', date:'2024-01-05', amount:35000, mode:'Cash' },
    ]},
  { id:'CE2020002', name:'Lakshmi Rao',    dept:'Civil Engg.',       sem:'Sem 8',
    semesterFee:62000, fine:0,    paid:62000, status:'Waived',  dueDate:'2024-03-15',
    payments:[
      { id: 'WAIVER2024I', date:'2024-01-01', amount:62000, mode:'Waiver' },
    ]},
];

const MONTHLY_COLLECTION = [
  { month:'Aug', collected:420000 }, { month:'Sep', collected:380000 },
  { month:'Oct', collected:290000 }, { month:'Nov', collected:510000 },
  { month:'Dec', collected:180000 }, { month:'Jan', collected:350000 },
];

/* ── Receipt generator ── */
const downloadReceipt = (student) => {
  const totalFee = student.semesterFee + student.fine;
  const content = [
    '========================================',
    '         COLLEGE FEE RECEIPT',
    '========================================',
    `Date      : ${new Date().toLocaleDateString('en-IN')}`,
    `Receipt No: RCP-${student.id}-${Date.now().toString().slice(-6)}`,
    '----------------------------------------',
    `Student   : ${student.name}`,
    `Register No: ${student.id}`,
    `Department: ${student.dept}`,
    `Semester  : ${student.sem}`,
    '----------------------------------------',
    `Semester Fee : ${fmtCurrency(student.semesterFee)}`,
    `Fine Amount  : ${fmtCurrency(student.fine)}`,
    `Total Fee    : ${fmtCurrency(totalFee)}`,
    `Paid Amount  : ${fmtCurrency(student.paid)}`,
    `Balance Due  : ${fmtCurrency(Math.max(0, totalFee - student.paid))}`,
    `Status       : ${student.status}`,
    '----------------------------------------',
    'Payment History:',
    ...(student.payments.length
      ? student.payments.map(p => `  ${p.date}  ${p.mode.padEnd(8)}  ${fmtCurrency(p.amount)}  [${p.id}]`)
      : ['  No payments recorded.']),
    '========================================',
    '     Thank you for your payment!',
    '========================================',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Receipt_${student.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const FeesManagement = () => {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  
  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [historyModal, setHistoryModal] = useState(null);
  
  // Fee Structure Form
  const [showFeeModal, setShowFeeModal] = useState(false);

  const [scholarships, setScholarships] = useState(loadScholarsLS);

  // Live-sync scholarships from localStorage (updated by Accounts portal)
  useEffect(() => {
    const onStorage = (e) => { if (e.key === `erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) setScholarships(loadScholarsLS()); };
    window.addEventListener('storage', onStorage);
    const timer = setInterval(() => setScholarships(loadScholarsLS()), 5000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(timer); };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, feesRes] = await Promise.all([ getStudents(), getAllFees() ]);
      const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.data || []);
      const feesList = Array.isArray(feesRes.data) ? feesRes.data : (feesRes.data?.data || []);
      const feeMap = Object.fromEntries(
        (feesList.length > 0 ? feesList : MOCK_FEES).map(f => [f.studentId || f.id, f])
      );
      
      // Combine students from the DB with any students that only exist in the fee records
      const combinedStudents = [...studentList];
      const actualFees = feesList.length > 0 ? feesList : MOCK_FEES;
      actualFees.forEach(f => {
        if (!combinedStudents.find(s => s.id === (f.studentId || f.id))) {
          combinedStudents.push({
            id: f.studentId || f.id,
            name: f.studentName || 'Unknown Student',
            dept: f.department || 'Unknown',
            sem: f.semester || 'Unknown'
          });
        }
      });

      const feeGroups = {};
      actualFees.forEach(f => {
         const sid = f.studentId || f.id;
         if (!feeGroups[sid]) feeGroups[sid] = [];
         feeGroups[sid].push(f);
      });
      
      const savedScholars = JSON.parse(localStorage.getItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');

      const mergedRecords = combinedStudents.map(s => {
        const studentPayments = feeGroups[s.id] || [];
        
        // Calculate dynamic total fees
        let tuitionFee = 60000;
        let examFee = 2500;
        let hostelFee = (s.hostelRequired === 'yes' || s.hostelRequired === true) ? 40000 : 0;
        let transportFee = (s.transportRequired === 'yes' || s.transportRequired === true) ? 15000 : 0;
        
        // In this simple fallback, we use 62500 base + optional
        let grossFee = tuitionFee + examFee + hostelFee + transportFee;
        
        let discount = 0;
        const sch = savedScholars.find(x => x.studentId === s.id && x.status === 'Active');
        if (sch) {
          if (sch.amount === '100%') discount = tuitionFee;
          else if (sch.amount === '75%') discount = tuitionFee * 0.75;
          else if (sch.amount === '50%') discount = tuitionFee * 0.50;
          else if (sch.amount === '25%') discount = tuitionFee * 0.25;
        }
        
        let semesterFee = grossFee - discount;
        
        // Total Paid
        let paid = studentPayments.reduce((acc, curr) => acc + (curr.paidAmount || curr.amount || 0), 0);
        
        let feeStatus = 'Pending';
        if (paid >= semesterFee && semesterFee > 0) feeStatus = 'Paid';
        else if (paid > 0) feeStatus = 'Partial';
        else if (semesterFee === 0) feeStatus = 'Waived';
        
        return {
          id: s.id,
          name: s.name,
          dept: s.dept || s.department || 'Unknown',
          sem: s.sem || s.semester || 'Unknown',
          grossFee: grossFee,
          discount: discount,
          semesterFee: semesterFee,
          fine: 0,
          paid: paid,
          status: feeStatus,
          payments: studentPayments.map(p => ({
            id: p.receiptNo || p._id || p.id || 'N/A',
            date: p.paymentDate || p.date || p.createdAt || new Date().toISOString(),
            amount: p.paidAmount || p.amount || 0,
            mode: p.paymentMode || p.mode || 'Online',
            feeType: p.feeType || 'Tuition Fee'
          }))
        };
      });
      setFees(mergedRecords);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Stats ── */
  const totalCollected = fees.reduce((a,b) => a + b.paid, 0);
  const totalPending   = fees.reduce((a,b) => a + Math.max(0,(b.semesterFee+b.fine)-b.paid), 0);
  const todayCollected = fees.reduce((a,b) => {
    const today = new Date().toISOString().split('T')[0];
    return a + b.payments.filter(p=>p.date===today).reduce((x,y)=>x+y.amount,0);
  }, 0);
  const totalFines = fees.reduce((a,b) => a + (b.fine || 0), 0);
  const defaultersCount = fees.filter(f => f.status === 'Pending').length;

  const pieData = ['Paid','Pending','Partial','Waived'].map(s=>({
    name:s, value: fees.filter(f=>f.status===s).length
  })).filter(d=>d.value>0);

  const getFeeClass = s => ({ Paid:'fee-paid', Pending:'fee-pending', Partial:'fee-partial', Waived:'fee-waived' }[s]||'');
  const getBarColor = s => ({ Paid:'var(--success)', Pending:'var(--danger)', Partial:'var(--warning)', Waived:'var(--primary)' }[s]||'var(--primary)');

  const TABS = ['Dashboard', 'Fee Structure', 'Student Fees', 'Pending & Fines', 'Scholarships', 'Reports'];

  return (
    <div className="fees-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Advanced Fee Management 💰</h1>
          <p className="text-muted">Centralized control for student fees, payments, scholarships, and reports.</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary shadow-glow" onClick={() => alert('Export Report Triggered!')}>
            <Download size={16}/> Export Report
          </button>
        </div>
      </div>

      <div className="fm-tabs-container">
        {TABS.map(tab => (
          <button key={tab} className={`fm-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'Dashboard' && <LayoutGrid size={16} />}
            {tab === 'Fee Structure' && <Settings size={16} />}
            {tab === 'Student Fees' && <Users size={16} />}
            {tab === 'Pending & Fines' && <ShieldAlert size={16} />}
            {tab === 'Scholarships' && <Award size={16} />}
            {tab === 'Reports' && <FileText size={16} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
        <div className="fm-tab-content animate-fade-in">
          <div className="fm-kpi-grid">
            <div className="sm-summary-card glass-card">
              <IndianRupee size={20} className="text-primary"/>
              <span className="sm-summary-label">Total Fees Collected</span>
              <span className="sm-summary-value gradient-text">{fmtCurrency(totalCollected)}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <AlertTriangle size={20} className="text-danger"/>
              <span className="sm-summary-label">Pending Fees</span>
              <span className="sm-summary-value text-danger">{fmtCurrency(totalPending)}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <TrendingUp size={20} className="text-success"/>
              <span className="sm-summary-label">Today's Collection</span>
              <span className="sm-summary-value text-success">{todayCollected > 0 ? fmtCurrency(todayCollected) : '₹0'}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <Award size={20} className="text-purple-500"/>
              <span className="sm-summary-label">Scholarship Students</span>
              <span className="sm-summary-value text-purple-500">{scholarships.length}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <ShieldAlert size={20} className="text-orange-500"/>
              <span className="sm-summary-label">Fine Amount Generated</span>
              <span className="sm-summary-value text-orange-500">{fmtCurrency(totalFines)}</span>
            </div>
          </div>

          <div className="fees-charts-row mt-6">
            <div className="glass-card chart-box">
              <h3><TrendingUp size={15}/> Monthly Fee Collection</h3>
              <div style={{height:280, marginTop:'1rem'}}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MONTHLY_COLLECTION} barSize={40}>
                    <defs>
                      <linearGradient id="feesBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)"/><stop offset="100%" stopColor="#4F46E5"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false}/>
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={v=>[fmtCurrency(v),'Collected']} contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)',boxShadow:'var(--shadow-md)',fontSize:12}} />
                    <Bar dataKey="collected" fill="url(#feesBarGrad)" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card chart-box">
              <h3><Receipt size={15}/> Payment Status Breakdown</h3>
              <div style={{height:280, marginTop:'0.4rem'}}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                      {pieData.map(e=><Cell key={e.name} fill={PIE_COLORS[e.name]}/>)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[v+' students', n]} contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)'}} />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:'0.8rem', paddingTop: '10px'}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Fee Structure' && (
        <div className="fm-tab-content animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2>Current Fee Structures</h2>
            <button className="btn-primary" onClick={() => setShowFeeModal(true)}>+ Create New Plan</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_FEE_STRUCTURES.map(fs => (
              <div key={fs.id} className="glass-card p-4 fs-card hover:border-primary transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{fs.dept}</h3>
                    <span className="badge-outline mt-1">{fs.sem}</span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded dark:bg-gray-800">{fs.id}</span>
                </div>
                <div className="space-y-3 border-t border-b py-4 my-4">
                  <div className="flex justify-between text-sm"><span className="text-muted">Tuition Fee</span><span className="font-medium">{fmtCurrency(fs.tuition)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted">Lab Fee</span><span className="font-medium">{fmtCurrency(fs.lab)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted">Library Fee</span><span className="font-medium">{fmtCurrency(fs.library)}</span></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted font-medium">Total Fees</span>
                  <span className="text-xl font-bold text-primary">{fmtCurrency(fs.total)}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 btn-secondary text-sm">Edit Plan</button>
                  <button className="flex-1 btn-danger-outline text-sm">Deactivate</button>
                </div>
              </div>
            ))}
          </div>

          {showFeeModal && (
            <div className="modal-overlay" onClick={()=>setShowFeeModal(false)}>
              <div className="modal-box glass-card" onClick={e=>e.stopPropagation()}>
                <div className="modal-hd">
                  <h2>Create New Fee Structure</h2>
                  <button className="modal-close-btn" onClick={()=>setShowFeeModal(false)}><X size={20}/></button>
                </div>
                <div className="modal-body space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label>Department</label>
                      <select className="w-full p-2 rounded border bg-transparent"><option>Computer Science</option></select>
                    </div>
                    <div className="form-group">
                      <label>Semester</label>
                      <select className="w-full p-2 rounded border bg-transparent"><option>Sem 1</option></select>
                    </div>
                  </div>
                  <div className="form-group"><label>Tuition Fee (₹)</label><input type="number" className="w-full p-2 rounded border bg-transparent" placeholder="e.g. 50000"/></div>
                  <div className="form-group"><label>Laboratory Fee (₹)</label><input type="number" className="w-full p-2 rounded border bg-transparent" placeholder="e.g. 10000"/></div>
                  <div className="form-group"><label>Library & Sports Fee (₹)</label><input type="number" className="w-full p-2 rounded border bg-transparent" placeholder="e.g. 5000"/></div>
                </div>
                <div className="modal-ft">
                  <button className="btn-ghost" onClick={()=>setShowFeeModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={()=>{alert('Fee Structure Saved!');setShowFeeModal(false)}}>Save Plan</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'Student Fees' || activeTab === 'Reports' || activeTab === 'Pending & Fines') && (
        <div className="fm-tab-content animate-fade-in">
          {activeTab === 'Pending & Fines' && (
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2>Defaulters List & Fine Management</h2>
                <p className="text-muted text-sm mt-1">Showing students with pending dues or active fines.</p>
              </div>
              <button className="btn-primary" onClick={() => alert('Reminders sent to all defaulters via Email & SMS!')}>
                <Bell size={16}/> Send Auto Due Reminders
              </button>
            </div>
          )}

          <div className="glass-card table-wrapper">
            <div className="filters-row">
              <div className="search-box">
                <Search size={16} className="text-muted"/>
                <input type="text" placeholder="Search by name or register no..." value={search} onChange={e=>setSearch(e.target.value)}/>
                {search && <button className="clear-search" onClick={()=>setSearch('')}><X size={14}/></button>}
              </div>
              <div className="filter-group">
                <div className="filter-select-wrapper">
                  <Filter size={13} className="text-muted"/>
                  <select className="filter-select" value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
                    <option value="All">All Departments</option>
                    {DEPARTMENTS.slice(1).map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="filter-select-wrapper">
                  <select className="filter-select" value={semFilter} onChange={e=>setSemFilter(e.target.value)}>
                    <option value="All">All Semesters</option>
                    {SEMESTERS.slice(1).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {activeTab !== 'Pending & Fines' && (
                  <div className="filter-select-wrapper">
                    <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                      <option value="All">All Status</option>
                      <option>Paid</option><option>Pending</option><option>Partial</option><option>Waived</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Info</th>
                    <th>Dept & Sem</th>
                    <th>Gross Fee</th>
                    <th>Discount</th>
                    <th>Net Fee</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr>
                  ) : (
                    fees
                      .filter(f => activeTab === 'Pending & Fines' ? ['Pending', 'Partial'].includes(f.status) : true)
                      .filter(f => 
                        ((f.name || '').toLowerCase().includes((search || '').toLowerCase()) || (f.id || '').toLowerCase().includes((search || '').toLowerCase())) &&
                        (deptFilter === 'All' || (f.dept || '').includes(deptFilter) || (deptFilter.includes('Computer') && (f.dept || '').includes('Computer'))) &&
                        (semFilter === 'All' || f.sem === semFilter || (f.sem || '').includes(semFilter)) &&
                        (statusFilter === 'All' || activeTab === 'Pending & Fines' || f.status === statusFilter)
                      )
                      .map((f, idx) => {
                      const totalFee = f.semesterFee + f.fine;
                      const balance  = Math.max(0, totalFee - f.paid);
                      const paidPct  = totalFee > 0 ? Math.min(100, Math.round((f.paid / totalFee) * 100)) : 0;
                      return (
                        <tr key={f.id} className={f.status === 'Pending' ? 'row-pending' : ''}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-medium">{f.name}</span>
                              <span className="text-xs text-muted">{f.id}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-sm">{f.dept}</span>
                              <span className="badge-outline">{f.sem}</span>
                            </div>
                          </td>
                          <td className="font-medium text-muted">{fmtCurrency(f.grossFee)}</td>
                          <td className="text-success font-medium">{f.discount > 0 ? `-` + fmtCurrency(f.discount) : '—'}</td>
                          <td className="font-bold text-main">{fmtCurrency(f.semesterFee)}</td>
                          <td>
                            <div className="amt-bar-wrap">
                              <span className="text-success font-semibold">{fmtCurrency(f.paid)}</span>
                              <div className="amt-bar-bg">
                                <div className="amt-bar-fill" style={{width:`${paidPct}%`, background:getBarColor(f.status)}}/>
                              </div>
                            </div>
                          </td>
                          <td className={balance > 0 ? 'text-danger font-bold' : 'text-success font-bold'}>
                            {fmtCurrency(balance)}
                          </td>
                          <td><span className={`fee-badge ${getFeeClass(f.status)}`}>{f.status}</span></td>
                          <td>
                            <div className="action-btns">
                              {activeTab === 'Pending & Fines' && balance > 0 ? (
                                <button className="act-btn text-primary bg-primary-light" title="Approve Offline Payment" onClick={() => alert('Offline payment approval modal opened.')}>
                                  <CheckCircle size={14}/>
                                </button>
                              ) : null}
                              <button className="act-btn" title="View Transaction History" onClick={()=>setHistoryModal(f)}>
                                <Eye size={14}/>
                              </button>
                              {activeTab === 'Reports' && (
                                <button className="act-btn download" title="Download Receipt" onClick={()=>downloadReceipt(f)}>
                                  <Download size={14}/>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Scholarships' && (
        <div className="fm-tab-content animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2>Scholarships & Fee Waivers</h2>
              <p className="text-muted text-sm mt-1">Manage active scholarship grants across departments.</p>
            </div>
            <button className="btn-primary" onClick={() => alert('Add Scholarship Modal Opened!')}>+ Add Scholarship</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scholarships.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No scholarships granted yet. Go to <strong>Accounts → Scholarships</strong> to grant one.
              </div>
            ) : scholarships.map((sch, i) => (
              <div key={sch.id || i} className="glass-card p-4 flex justify-between items-center border-l-4 border-[#6366F1]">
                <div>
                  <h3 className="font-bold text-lg mb-1">{sch.studentName || sch.name}</h3>
                  <p className="text-sm text-muted">{sch.studentId || sch.regNo}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="fee-badge" style={{background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1'}}>{sch.type}</span>
                    <span className="fee-badge" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>{sch.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-muted text-sm mb-1">Fee Waiver</p>
                  <p className="text-2xl font-bold text-primary">{sch.amount}</p>
                  <p className="text-xs text-muted mt-1">{sch.date || ''}</p>
                  <button className="text-xs text-danger underline mt-2 bg-transparent cursor-pointer"
                    onClick={() => {
                      const updated = scholarships.filter(s => (s.id || s.studentId) !== (sch.id || sch.studentId));
                      localStorage.setItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
                      setScholarships(updated);
                    }}>Revoke Scholarship</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Payment History Modal ── */}
      {historyModal && (() => {
        const f = historyModal;
        const totalFee = f.semesterFee + f.fine;
        const balance  = Math.max(0, totalFee - f.paid);
        return (
          <div className="modal-overlay" onClick={()=>setHistoryModal(null)}>
            <div className="modal-box glass-card" onClick={e=>e.stopPropagation()}>
              <div className="modal-hd">
                <div>
                  <h2>Fee Details — {f.name}</h2>
                  <p className="text-muted" style={{fontSize:'0.82rem',marginTop:2}}>{f.id} · {f.dept} · {f.sem}</p>
                </div>
                <button className="modal-close-btn" onClick={()=>setHistoryModal(null)}><X size={20}/></button>
              </div>

              <div className="modal-body">
                <div className="student-fee-summary">
                  {[
                    { label:'Gross Fee',      value: fmtCurrency(f.grossFee), color:'var(--text-main)' },
                    { label:'Discount',       value: f.discount > 0 ? `-` + fmtCurrency(f.discount) : '—', color:'var(--success)' },
                    { label:'Net Fee',        value: fmtCurrency(f.semesterFee), color:'var(--text-main)' },
                    { label:'Paid Amount',    value: fmtCurrency(f.paid),        color:'var(--success)'   },
                    { label:'Balance Due',    value: fmtCurrency(balance),       color: balance>0?'var(--danger)':'var(--success)' },
                  ].map((c,i)=>(
                    <div key={i} className="fee-sum-card">
                      <span className="fee-sum-label">{c.label}</span>
                      <span className="fee-sum-value" style={{color:c.color}}>{c.value}</span>
                    </div>
                  ))}
                </div>

                {f.fine > 0 && (
                  <div className="fine-section">
                    <div className="fine-section-title"><AlertTriangle size={14}/> Fine Details</div>
                    <div className="fine-row"><span className="fine-key">Fine Amount</span><span className="fine-val">{fmtCurrency(f.fine)}</span></div>
                    <div className="fine-row"><span className="fine-key">Reason</span><span className="fine-val" style={{color:'var(--text-muted)'}}>Late payment fine</span></div>
                    <div className="fine-row"><span className="fine-key">Total Fee (Incl. Fine)</span><span className="fine-val">{fmtCurrency(totalFee)}</span></div>
                  </div>
                )}

                <div>
                  <p className="payment-history-title mt-4 mb-2 font-semibold">Transaction Ledger</p>
                  {f.payments.length === 0 ? (
                    <div className="no-history text-center p-4 bg-gray-50 rounded dark:bg-gray-800 text-muted">No payment records found.</div>
                  ) : (
                    <div className="payment-history-list space-y-3">
                      {f.payments.map((p, i) => (
                        <div key={i} className="payment-hist-item flex justify-between p-3 border rounded bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                          <div className="flex gap-3">
                            <div className="pay-icon mt-1 text-success"><CheckCircle size={16}/></div>
                            <div className="pay-info">
                              <p className="pay-desc font-medium">{p.mode} Payment</p>
                              <p className="text-xs text-muted">Ref: {p.id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="pay-amount font-bold block">{fmtCurrency(p.amount)}</span>
                            <span className="text-xs text-muted">{new Date(p.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-ft">
                <button className="btn-ghost" onClick={()=>setHistoryModal(null)}>Close</button>
                <button className="btn-download" onClick={()=>downloadReceipt(f)}>
                  <Download size={15}/> Generate Receipt
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FeesManagement;
