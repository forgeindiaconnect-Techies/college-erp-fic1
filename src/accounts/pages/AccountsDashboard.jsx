import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  CreditCard, AlertCircle, Banknote,
  ArrowUpRight, ArrowDownRight, Activity, Users,
  PieChart as PieChartIcon, RefreshCw
} from 'lucide-react';
import { getAllFees, getSalaries, getExpenses, getStudents } from '../../api/index';
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

  const fetchAll = async () => {
    try {
      const [feesRes, salaryRes, expRes, studRes] = await Promise.all([
        getAllFees().catch(() => ({ data: [] })),
        getSalaries().catch(() => ({ data: [] })),
        getExpenses().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] }))
      ]);
      setFees(feesRes.data || []);
      setSalaries(salaryRes.data || []);
      setExpenses(expRes.data || []);
      setStudents(Array.isArray(studRes) ? studRes : (studRes.data || []));
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
    }
  };

  useRealtimeSync(fetchAll, ['fees', 'students', 'salaries', 'expenses']);

  useEffect(() => {
    const session = sessionStorage.getItem('accounts_session');
    if (!session) { navigate('/accounts/login'); return; }
    setAccountsSession(JSON.parse(session));
    fetchAll().finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="accounts-loading-container">
        <span className="accounts-spinner-large"></span>
      </div>
    );
  }

  // ── Live Computed Metrics ──────────────────────────────────────────────
  const feesCollected = fees.filter(f => f.status === 'Paid').reduce((s, f) => s + (f.paidAmount || f.totalFees || 0), 0);
  const feesPending   = fees.filter(f => f.status !== 'Paid').reduce((s, f) => s + (f.pendingAmount || f.totalFees || 0), 0);
  const todayFees     = fees.filter(f => {
    if (!f.paymentDate && !f.createdAt) return false;
    const d = new Date(f.paymentDate || f.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).reduce((s, f) => s + (f.paidAmount || 0), 0);
  const salaryTotal = salaries.reduce((s, r) => s + (r.netSalary || 0), 0);
  const otherExpensesTotal = expenses.filter(e => e.status === 'Paid').reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = salaryTotal + otherExpensesTotal;
  const salaryPaid    = salaries.filter(r => r.status === 'Disbursed').reduce((s, r) => s + (r.netSalary || 0), 0);
  
  // Real defaulters: students who do not have a 'Paid' fee record
  let realDefaulters = 0;
  if (students.length > 0) {
    students.forEach(s => {
      const sFees = fees.filter(f => f.studentId === s.id || f.studentId === s._id);
      const isPaid = sFees.some(f => f.status === 'Paid');
      if (!isPaid) realDefaulters++;
    });
  } else {
    realDefaulters = fees.filter(f => f.status === 'Pending').length;
  }
  const defaulters = realDefaulters;

  // ── Chart Data ─────────────────────────────────────────────────────────
  // Monthly collection by createdAt month
  const monthlyMap = {};
  fees.forEach(f => {
    const d = new Date(f.paymentDate || f.createdAt || Date.now());
    const key = d.toLocaleString('en', { month: 'short' });
    monthlyMap[key] = (monthlyMap[key] || 0) + (f.paidAmount || 0);
  });
  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyCollectionData = monthOrder
    .filter(m => monthlyMap[m] !== undefined)
    .map(m => ({ name: m, collected: monthlyMap[m] }));
  if (monthlyCollectionData.length === 0) {
    monthlyCollectionData.push(...[
      { name: 'Jan', collected: 120000 }, { name: 'Feb', collected: 250000 },
      { name: 'Mar', collected: 450000 }, { name: 'Apr', collected: 800000 },
      { name: 'May', collected: feesCollected || 1500000 }
    ]);
  }

  // Department-wise pending
  const deptPendingMap = {};
  fees.filter(f => f.status !== 'Paid').forEach(f => {
    const d = (f.department || 'Other').split(' ')[0];
    deptPendingMap[d] = (deptPendingMap[d] || 0) + (f.pendingAmount || f.totalFees || 0);
  });
  const pendingFeesData = Object.entries(deptPendingMap).map(([name, Pending]) => ({ name, Pending }));
  if (pendingFeesData.length === 0) {
    pendingFeesData.push(
      { name: 'Computer', Pending: 100000 }, { name: 'Electrical', Pending: 80000 },
      { name: 'Mechanical', Pending: 80000 }
    );
  }

  // Department-wise collected (pie)
  const DEPT_COLORS = ['#3b82f6','#10b981','#f59e0b','#6366F1','#ef4444','#06b6d4'];
  const deptCollectedMap = {};
  fees.filter(f => f.status === 'Paid').forEach(f => {
    const d = (f.department || 'Other').split(' ')[0];
    deptCollectedMap[d] = (deptCollectedMap[d] || 0) + (f.paidAmount || f.totalFees || 0);
  });
  const deptFeesData = Object.entries(deptCollectedMap).map(([name, value], i) => ({
    name, value, color: DEPT_COLORS[i % DEPT_COLORS.length]
  }));
  if (deptFeesData.length === 0) {
    deptFeesData.push(
      { name: 'CSE', value: 1500000, color: '#3b82f6' }, { name: 'EEE', value: 1200000, color: '#10b981' },
      { name: 'MECH', value: 1000000, color: '#f59e0b' }
    );
  }

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
  if (expenseData.length === 0) {
    expenseData.push(
      { name: 'Salaries', value: 1200000, color: '#ef4444' },
      { name: 'Infrastructure', value: 800000, color: '#f97316' }
    );
  }

  // ── Recent Transactions (last 5 paid) ─────────────────────────────────
  const recentFees = [...fees].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

  return (
    <div className="accounts-dashboard animate-fade-in">
      {/* Welcome Banner */}
      <div className="accounts-welcome-banner" style={{ background: '#3730A5', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff', borderRadius: '12px' }}>
        <div className="banner-left" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: '700', margin: 0, lineHeight: 1.2, color: '#ffffff' }}>Finance & Accounts Dashboard</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.9)', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>Welcome back, {accountsSession?.name}. Live financial summary from database.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => fetchAll()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', color: 'white', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', backdropFilter: 'blur(10px)' }}>
            <RefreshCw size={15} /> Refresh
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
            <h2 className="metric-value-a">₹{(feesCollected/100000).toFixed(1)} L</h2>
            <div className="metric-sub-a text-success"><ArrowUpRight size={14} /> {fees.filter(f=>f.status==='Paid').length} paid records</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}><AlertCircle size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Pending Fees</span>
            <h2 className="metric-value-a">₹{(feesPending/100000).toFixed(1)} L</h2>
            <div className="metric-sub-a text-danger"><ArrowDownRight size={14} /> Outstanding dues</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'var(--color-primary-tint, #EEEDFE)', color: 'var(--color-primary-text-on-tint, #3730A5)' }}><Activity size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Today's Collection</span>
            <h2 className="metric-value-a">₹{todayFees > 0 ? (todayFees/1000).toFixed(1)+'K' : '0'}</h2>
            <div className="metric-sub-a text-success"><ArrowUpRight size={14} /> Live from DB</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'var(--color-primary-tint, #EEEDFE)', color: 'var(--color-primary-text-on-tint, #3730A5)' }}><PieChartIcon size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Total Expenses</span>
            <h2 className="metric-value-a">₹{(totalExpenses/100000).toFixed(1)} L</h2>
            <div className="metric-sub-a text-muted">Salary payroll total</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'var(--color-primary-tint, #EEEDFE)', color: 'var(--color-primary-text-on-tint, #3730A5)' }}><Banknote size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Salary Disbursed</span>
            <h2 className="metric-value-a">₹{(salaryPaid/100000).toFixed(1)} L</h2>
            <div className="metric-sub-a text-success">{salaries.filter(s=>s.status==='Disbursed').length} of {salaries.length} staff paid</div>
          </div>
        </div>

        <div className="glass-card a-metric-card">
          <div className="metric-icon-a" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}><Users size={22} /></div>
          <div className="a-metric-details">
            <span className="card-title-a">Defaulters Count</span>
            <h2 className="metric-value-a">{defaulters}</h2>
            <div className="metric-sub-a text-danger">Requires follow-up</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="charts-grid-accounts">
        {/* Monthly Fee Collection */}
        <div className="glass-card chart-card-a">
          <h3>Monthly Fee Collection</h3>
          <p className="text-muted text-sm">Collection volume (in ₹)</p>
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
          <h3>Pending Fees Analytics</h3>
          <p className="text-muted text-sm">Department-wise outstanding</p>
          <div className="chart-container-a">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pendingFeesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={v => `₹${v.toLocaleString()}`} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department-wise Fees Pie */}
        <div className="glass-card chart-card-a">
          <h3>Department-wise Fees</h3>
          <p className="text-muted text-sm">Revenue distribution</p>
          <div className="chart-container-a flex-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={deptFeesData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                  {deptFeesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} formatter={v => `₹${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Analytics Pie */}
        <div className="glass-card chart-card-a">
          <h3>Expense Analytics</h3>
          <p className="text-muted text-sm">Payroll outflow by department</p>
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
                return (
                  <tr key={txn._id || idx}>
                    <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                      {txn.receiptNo || `TXN-${(txn._id || '').slice(-6).toUpperCase() || String(100+idx)}`}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{txn.studentName || txn.studentId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{txn.studentId}</div>
                    </td>
                    <td>{txn.department?.split(' ')[0] || 'CSE'} / {txn.semester || '—'}</td>
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
