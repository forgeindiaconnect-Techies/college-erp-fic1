import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  CreditCard, AlertCircle, Banknote,
  ArrowUpRight, ArrowDownRight, Activity, Users,
  PieChart as PieChartIcon, RefreshCw, Building2, Layers
} from 'lucide-react';
import { getAllFees, getSalaries, getExpenses, getStudents, getDepartments, getFeeStructures, getFeePlans } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';
import './AccountsDashboard.css';

const AccountsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accountsSession, setAccountsSession] = useState(null);
  const [fees, setFees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);

  const fetchAll = async () => {
    try {
      const [feesRes, salaryRes, expRes, studRes, deptRes, structRes, planRes] = await Promise.all([
        getAllFees().catch(() => ({ data: [] })),
        getSalaries().catch(() => ({ data: [] })),
        getExpenses().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getFeeStructures().catch(() => ({ data: [] })),
        getFeePlans().catch(() => ({ data: [] }))
      ]);
      setFees(feesRes.data || []);
      setSalaries(salaryRes.data || []);
      setExpenses(expRes.data || []);
      setStudents(Array.isArray(studRes) ? studRes : (studRes.data || []));

      const loadedDepts = Array.isArray(deptRes.data)
        ? deptRes.data
        : (deptRes.data?.departments || deptRes.data?.data || []);
      setDepartments(loadedDepts);

      const loadedStructs = Array.isArray(structRes.data)
        ? structRes.data
        : (structRes.data?.structures || structRes.data?.data || []);

      const loadedPlans = Array.isArray(planRes.data)
        ? planRes.data
        : (planRes.data?.plans || planRes.data?.data || []);

      const convertedPlans = loadedPlans.map(p => ({
        _id: p._id,
        academicYear: p.academicYear,
        department: p.departmentName || p.departmentId,
        course: p.courseName || p.courseId,
        semester: p.semester,
        totalAmount: (Number(p.tuitionFee) || 0) + (Number(p.examFee) || 0) + (Number(p.labFee) || 0) + (Number(p.libraryFee) || 0) + (Number(p.transportFee) || 0) + (Number(p.hostelFee) || 0)
      }));

      setFeeStructures([...convertedPlans, ...loadedStructs]);
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
    }
  };

  useRealtimeSync(fetchAll, ['fees', 'students', 'salaries', 'expenses', 'feePlans', 'feeStructure', 'departments']);

  useEffect(() => {
    const session = sessionStorage.getItem('accounts_session');
    if (!session) { navigate('/accounts/login'); return; }
    setAccountsSession(JSON.parse(session));
    fetchAll().finally(() => setLoading(false));
  }, [navigate]);

  // ── Live Computed Metrics ──────────────────────────────────────────────
  // Build lookup of default fee per department from configured fee structures
  const deptFeeRateMap = useMemo(() => {
    const map = {};
    feeStructures.forEach(s => {
      const dName = s.department || s.departmentName;
      if (dName && !map[dName]) {
        map[dName] = Number(s.totalAmount) || (Array.isArray(s.fees) ? s.fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0) : 45000);
      }
    });
    return map;
  }, [feeStructures]);

  // Student Department Resolver
  const getStudentDept = (studentId, fallbackDept) => {
    if (fallbackDept && fallbackDept !== 'Other' && fallbackDept !== 'Unknown') return fallbackDept;
    const found = students.find(s => s.id === studentId || s._id === studentId);
    return found?.dept || found?.department || fallbackDept || 'General Department';
  };

  // ── Department-wise Synthesis ─────────────────────────────────────────
  const deptStats = useMemo(() => {
    const map = {};

    // 1. Initialize known departments
    departments.forEach(d => {
      const dName = d.name || d.departmentName || d;
      if (typeof dName === 'string' && dName.trim()) {
        map[dName.trim()] = {
          name: dName.trim(),
          studentCount: 0,
          expected: 0,
          collected: 0,
          pending: 0
        };
      }
    });

    // 2. Aggregate each student into their department
    students.forEach(s => {
      const dName = (s.dept || s.department || 'General Department').trim();
      if (!map[dName]) {
        map[dName] = { name: dName, studentCount: 0, expected: 0, collected: 0, pending: 0 };
      }
      map[dName].studentCount++;

      // Fee transactions for this student
      const sFees = fees.filter(f => f.studentId === s.id || f.studentId === s._id);
      const studentPaid = sFees.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

      // Student Expected Fee
      let studentExpected = Number(s.totalFee) || (sFees.length > 0 ? Number(sFees[0].totalFees) : 0);
      if (!studentExpected || studentExpected === 0) {
        studentExpected = deptFeeRateMap[dName] || 45000;
      }

      // If marked paid in student record or payments exceed expected
      if (s.feeStatus === 'Paid' && studentPaid === 0) {
        map[dName].collected += studentExpected;
      } else {
        map[dName].collected += studentPaid;
        map[dName].pending += Math.max(0, studentExpected - studentPaid);
      }
      map[dName].expected += studentExpected;
    });

    // 3. Process any standalone fee records where student is not in student list
    fees.forEach(f => {
      const isAlreadyCounted = students.some(s => s.id === f.studentId || s._id === f.studentId);
      if (!isAlreadyCounted) {
        const dName = (f.department || 'General Department').trim();
        if (!map[dName]) {
          map[dName] = { name: dName, studentCount: 1, expected: 0, collected: 0, pending: 0 };
        }
        const paid = Number(f.paidAmount) || (f.status === 'Paid' ? Number(f.totalFees) : 0);
        const total = Number(f.totalFees) || paid || 45000;
        map[dName].collected += paid;
        map[dName].pending += Math.max(0, total - paid);
        map[dName].expected += total;
      }
    });

    return Object.values(map).filter(d => d.studentCount > 0 || d.collected > 0 || d.pending > 0 || d.expected > 0);
  }, [departments, students, fees, deptFeeRateMap]);

  // Global Totals from real live synthesized department data
  const feesCollected = deptStats.reduce((s, d) => s + d.collected, 0) || fees.filter(f => f.status === 'Paid').reduce((s, f) => s + (f.paidAmount || f.totalFees || 0), 0);
  const feesPending   = deptStats.reduce((s, d) => s + d.pending, 0) || fees.filter(f => f.status !== 'Paid').reduce((s, f) => s + (f.pendingAmount || f.totalFees || 0), 0);
  
  const todayFees = fees.filter(f => {
    if (!f.paymentDate && !f.createdAt) return false;
    const d = new Date(f.paymentDate || f.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).reduce((s, f) => s + (Number(f.paidAmount) || 0), 0);

  const salaryTotal = salaries.reduce((s, r) => s + (r.netSalary || 0), 0);
  const otherExpensesTotal = expenses.filter(e => e.status === 'Paid').reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = salaryTotal + otherExpensesTotal;
  const salaryPaid    = salaries.filter(r => r.status === 'Disbursed').reduce((s, r) => s + (r.netSalary || 0), 0);
  
  // Real defaulters: students who do not have full fees cleared
  const defaulters = students.filter(s => {
    const sFees = fees.filter(f => f.studentId === s.id || f.studentId === s._id);
    const isPaid = s.feeStatus === 'Paid' || sFees.some(f => f.status === 'Paid' && (f.pendingAmount || 0) === 0);
    return !isPaid;
  }).length;

  // ── Chart Data ─────────────────────────────────────────────────────────
  // Monthly collection
  const monthlyMap = {};
  fees.forEach(f => {
    const d = new Date(f.paymentDate || f.createdAt || Date.now());
    const key = d.toLocaleString('en', { month: 'short' });
    monthlyMap[key] = (monthlyMap[key] || 0) + (Number(f.paidAmount) || 0);
  });
  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyCollectionData = monthOrder
    .filter(m => monthlyMap[m] !== undefined)
    .map(m => ({ name: m, collected: monthlyMap[m] }));
  if (monthlyCollectionData.length === 0) {
    const currentMonth = new Date().toLocaleString('en', { month: 'short' });
    monthlyCollectionData.push({ name: currentMonth, collected: feesCollected || 0 });
  }

  // Department-wise pending for BarChart
  const pendingFeesData = deptStats.map(d => ({
    name: d.name.length > 16 ? d.name.slice(0, 14) + '...' : d.name,
    fullName: d.name,
    Pending: d.pending
  }));

  // Department-wise collected for PieChart
  const DEPT_COLORS = ['#3b82f6','#10b981','#f59e0b','#6366F1','#ef4444','#06b6d4','#8b5cf6','#ec4899'];
  const deptFeesData = deptStats
    .filter(d => d.collected > 0)
    .map((d, i) => ({
      name: d.name.length > 16 ? d.name.slice(0, 14) + '...' : d.name,
      fullName: d.name,
      value: d.collected,
      color: DEPT_COLORS[i % DEPT_COLORS.length]
    }));

  // Expense distribution (salary + other expenses)
  const expenseDeptMap = { 'Salaries': salaryTotal };
  expenses.filter(e => e.status === 'Paid').forEach(e => {
    const cat = e.category || 'Other';
    expenseDeptMap[cat] = (expenseDeptMap[cat] || 0) + (e.amount || 0);
  });
  const EXP_COLORS = ['#ef4444','#f97316','#eab308','#6366F1','#06b6d4'];
  const expenseData = Object.entries(expenseDeptMap).map(([name, value], i) => ({
    name, value, color: EXP_COLORS[i % EXP_COLORS.length]
  })).filter(x => x.value > 0);

  // ── Recent Transactions (last 5) ──────────────────────────────────────
  const recentFees = [...fees].sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0)).slice(0, 5);

  if (loading) {
    return (
      <div className="accounts-loading-container">
        <span className="accounts-spinner-large"></span>
      </div>
    );
  }

  return (
    <div className="accounts-dashboard animate-fade-in">
      {/* Welcome Banner */}
      <div className="accounts-welcome-banner" style={{ background: '#3730A5', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff', borderRadius: '12px' }}>
        <div className="banner-left" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: '700', margin: 0, lineHeight: 1.2, color: '#ffffff' }}>Finance & Accounts Dashboard</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.9)', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
            Welcome back, {accountsSession?.name || 'Accounts Admin'}. Real-time department-level fee analytics & collections.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => fetchAll()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', backdropFilter: 'blur(10px)' }}>
            <RefreshCw size={15} /> Refresh Live
          </button>
          <div className="accounts-badge-number">
            <span>FISCAL YEAR: <strong>2026–2027</strong></span>
          </div>
        </div>
      </div>

      {/* Employee Check-In / Check-Out */}
      <div className="mb-6">
        <EmployeeAttendanceCard />
      </div>

      {/* Metrics Row (6 Live Cards) */}
      <div className="accounts-metrics-grid">
        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'var(--color-primary-tint, #EEEDFE)', color: 'var(--color-primary-text-on-tint, #3730A5)' }}><CreditCard size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Total Fees Collected</span>
            <h2 className="metric-value-a">₹{(feesCollected/100000).toFixed(2)} L</h2>
            <div className="metric-sub-a text-success"><ArrowUpRight size={14} /> ₹{feesCollected.toLocaleString()} received</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}><AlertCircle size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Pending Fees Dues</span>
            <h2 className="metric-value-a">₹{(feesPending/100000).toFixed(2)} L</h2>
            <div className="metric-sub-a text-danger"><ArrowDownRight size={14} /> ₹{feesPending.toLocaleString()} outstanding</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'var(--color-primary-tint, #EEEDFE)', color: 'var(--color-primary-text-on-tint, #3730A5)' }}><Activity size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Today's Collection</span>
            <h2 className="metric-value-a">₹{todayFees > 0 ? todayFees.toLocaleString() : '0'}</h2>
            <div className="metric-sub-a text-success"><ArrowUpRight size={14} /> Live transactions</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'var(--color-primary-tint, #EEEDFE)', color: 'var(--color-primary-text-on-tint, #3730A5)' }}><PieChartIcon size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Total Expenses</span>
            <h2 className="metric-value-a">₹{(totalExpenses/100000).toFixed(2)} L</h2>
            <div className="metric-sub-a text-muted">Salary & Operations</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'var(--color-primary-tint, #EEEDFE)', color: 'var(--color-primary-text-on-tint, #3730A5)' }}><Banknote size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Salary Disbursed</span>
            <h2 className="metric-value-a">₹{(salaryPaid/100000).toFixed(2)} L</h2>
            <div className="metric-sub-a text-success">{salaries.filter(s=>s.status==='Disbursed').length} staff paid</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}><Users size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Fee Defaulters</span>
            <h2 className="metric-value-a">{defaulters}</h2>
            <div className="metric-sub-a text-danger">Pending fee students</div>
          </div>
        </div>
      </div>

      {/* ── Department-Wise Live Fee Breakdown Table ── */}
      <div className="glass-card a-transactions-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main, #0f172a)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#3b82f6" />
              Department-Wise Real-Time Fee Breakdown
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0' }}>
              Real-time fee structures entered by Admin & Accounts synchronized across departments.
            </p>
          </div>
          <button
            className="view-all-btn"
            onClick={() => navigate('/accounts/fee-structure')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Layers size={15} /> Manage Fee Structures
          </button>
        </div>

        <div className="a-transactions-table-container">
          <table className="a-transactions-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Enrolled Students</th>
                <th>Total Expected</th>
                <th>Total Collected</th>
                <th>Pending Dues</th>
                <th>Collection Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deptStats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No department fee data available yet.
                  </td>
                </tr>
              ) : (
                deptStats.map((d, idx) => {
                  const rate = d.expected > 0 ? Math.min(100, Math.round((d.collected / d.expected) * 100)) : (d.pending === 0 ? 100 : 0);
                  const isHigh = rate >= 75;
                  const isMed = rate >= 40 && rate < 75;

                  return (
                    <tr key={d.name || idx}>
                      <td style={{ fontWeight: '700', color: '#1e3a5f' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: DEPT_COLORS[idx % DEPT_COLORS.length] }}></span>
                          {d.name}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{d.studentCount}</span> students
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        ₹{d.expected.toLocaleString()}
                      </td>
                      <td style={{ fontWeight: '700', color: '#16a34a' }}>
                        ₹{d.collected.toLocaleString()}
                      </td>
                      <td style={{ fontWeight: '700', color: d.pending > 0 ? '#ef4444' : '#10b981' }}>
                        ₹{d.pending.toLocaleString()}
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--border-color, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${rate}%`,
                                height: '100%',
                                background: isHigh ? '#10b981' : isMed ? '#f59e0b' : '#ef4444',
                                borderRadius: '4px',
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: isHigh ? '#10b981' : isMed ? '#f59e0b' : '#ef4444' }}>
                            {rate}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: isHigh ? 'rgba(16, 185, 129, 0.1)' : isMed ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: isHigh ? '#10b981' : isMed ? '#f59e0b' : '#ef4444'
                        }}>
                          {isHigh ? 'Healthy' : isMed ? 'In Progress' : 'Attention'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="charts-grid-accounts">
        {/* Monthly Fee Collection */}
        <div className="glass-card chart-card-a">
          <h3>Monthly Fee Collection</h3>
          <p className="text-muted text-sm">Real-time payment volume (in ₹)</p>
          <div className="chart-container-a">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyCollectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={v => `₹${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Fees Analytics */}
        <div className="glass-card chart-card-a">
          <h3>Pending Fees by Department</h3>
          <p className="text-muted text-sm">Outstanding dues per department</p>
          <div className="chart-container-a">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pendingFeesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(v, name, item) => [`₹${v.toLocaleString()}`, item.payload.fullName || 'Pending']} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department-wise Fees Pie */}
        <div className="glass-card chart-card-a">
          <h3>Department Revenue Distribution</h3>
          <p className="text-muted text-sm">Collected fees share</p>
          <div className="chart-container-a flex-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={deptFeesData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                  {deptFeesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={(v, name, item) => [`₹${v.toLocaleString()}`, item.payload.fullName || name]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Analytics Pie */}
        <div className="glass-card chart-card-a">
          <h3>Expense Outflow Analytics</h3>
          <p className="text-muted text-sm">Payroll & Operational outflow</p>
          <div className="chart-container-a flex-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={expenseData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={v => `₹${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="glass-card a-transactions-card mt-6">
        <div className="a-transactions-header">
          <h3>Recent Transactions</h3>
          <button className="view-all-btn" onClick={() => navigate('/accounts/payment-history')}>View All</button>
        </div>
        <div className="a-transactions-table-container">
          <table className="a-transactions-table">
            <thead>
              <tr>
                <th>TXN ID</th>
                <th>Student</th>
                <th>Dept / Sem</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentFees.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions in database yet.</td></tr>
              ) : recentFees.map((txn, idx) => {
                const dateStr = txn.paymentDate
                  ? new Date(txn.paymentDate).toLocaleDateString('en-GB')
                  : txn.createdAt ? new Date(txn.createdAt).toLocaleDateString('en-GB') : '—';
                const amount  = txn.paidAmount || txn.totalFees || 0;
                const statusStr = txn.status || 'Pending';
                const deptName = getStudentDept(txn.studentId, txn.department);
                return (
                  <tr key={txn._id || idx}>
                    <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                      {txn.receiptNo || `TXN-${(txn._id || '').slice(-6).toUpperCase() || String(100+idx)}`}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{txn.studentName || txn.studentId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{txn.studentId}</div>
                    </td>
                    <td>{deptName?.split(' ')[0] || 'General'} / {txn.semester || '—'}</td>
                    <td>{dateStr}</td>
                    <td className="font-semibold" style={{ color: '#10b981' }}>₹{amount.toLocaleString()}</td>
                    <td>
                      <span className={`txn-status ${statusStr.toLowerCase()}`}>{statusStr}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountsDashboard;
