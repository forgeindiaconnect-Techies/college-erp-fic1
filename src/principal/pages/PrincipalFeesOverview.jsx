import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Award, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getAllFees } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../../pages/Dashboard.css';

const deptFees = [
  { dept: 'CSE',  collected: 2550000, pending: 100000, total: 2650000, students: 3, paid: 2, partial: 1, scholarship: 1 },
  { dept: 'EEE',  collected: 300000,  pending: 0,       total: 300000,  students: 2, paid: 2, partial: 0, scholarship: 0 },
  { dept: 'ECE',  collected: 120000,  pending: 120000,  total: 240000,  students: 2, paid: 1, partial: 0, scholarship: 0 },
  { dept: 'MECH', collected: 80000,   pending: 80000,   total: 160000,  students: 1, paid: 0, partial: 1, scholarship: 0 },
  { dept: 'BCA',  collected: 140000,  pending: 0,       total: 140000,  students: 1, paid: 1, partial: 0, scholarship: 0 },
  { dept: 'MBA',  collected: 250000,  pending: 0,       total: 250000,  students: 1, paid: 1, partial: 0, scholarship: 0 },
];

const monthlyCollection = [
  { month: 'Jan', amount: 420000 },
  { month: 'Feb', amount: 680000 },
  { month: 'Mar', amount: 510000 },
  { month: 'Apr', amount: 890000 },
  { month: 'May', amount: 940000 },
];

const feeTypePie = [
  { name: 'Tuition Fees', value: 68, color: '#6366f1' },
  { name: 'Hostel Fees', value: 18, color: '#10b981' },
  { name: 'Transport', value: 8, color: '#f59e0b' },
  { name: 'Lab / Other', value: 6, color: '#6366F1' },
];

const studentFees = [
  { name: 'John Doe',       dept: 'CSE',  paid: 1490000, pending: 0,      status: 'Paid',    mode: 'Online' },
  { name: 'Emily Davis',    dept: 'CSE',  paid: 850000,  pending: 0,      status: 'Paid',    mode: 'Online' },
  { name: 'David Lee',      dept: 'CSE',  paid: 50000,   pending: 100000, status: 'Partial', mode: 'Cash' },
  { name: 'Alice Smith',    dept: 'EEE',  paid: 150000,  pending: 0,      status: 'Paid',    mode: 'Online' },
  { name: 'Sarah Wilson',   dept: 'EEE',  paid: 150000,  pending: 0,      status: 'Paid',    mode: 'Online' },
  { name: 'Vikram Seth',    dept: 'ECE',  paid: 120000,  pending: 0,      status: 'Paid',    mode: 'Online' },
  { name: 'Neha Gupta',     dept: 'ECE',  paid: 0,       pending: 120000, status: 'Pending', mode: '—' },
  { name: 'Robert Johnson', dept: 'MECH', paid: 80000,   pending: 80000,  status: 'Partial', mode: 'Online' },
  { name: 'Karan Malhotra', dept: 'BCA',  paid: 140000,  pending: 0,      status: 'Paid',    mode: 'Online' },
  { name: 'Ritu Sen',       dept: 'MBA',  paid: 250000,  pending: 0,      status: 'Paid',    mode: 'Online' },
];

// scholarships are read from localStorage (set by Accounts > Scholarships page)
const loadScholarsFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
  } catch { return []; }
};

const fmt = (v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`;

export default function PrincipalFeesOverview() {
  const [tab, setTab] = useState('overview');
  const [feeList, setFeeList] = useState(studentFees);
  const [scholarships, setScholarships] = useState(loadScholarsFromStorage);

  // Keep scholarships in sync whenever Accounts page updates localStorage
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === `erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) {
        setScholarships(loadScholarsFromStorage());
      }
    };
    window.addEventListener('storage', onStorage);
    // Also poll every 5 seconds in case same-tab update
    const timer = setInterval(() => setScholarships(loadScholarsFromStorage()), 5000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(timer); };
  }, []);

  const fetchFees = useCallback(() => {
    getAllFees()
      .then(res => res.data)
      .then(data => {
          const formatted = data.map(record => {
            const paidAmt = record.paidAmount || 0;
            const pendingAmt = record.pendingAmount || 0;
            const totalAmt = record.totalFees || (paidAmt + pendingAmt);
            let safeStatus = record.status || 'Paid';
            if (paidAmt >= totalAmt && totalAmt > 0) safeStatus = 'Paid';

            return {
              name: record.studentName || 'Student',
              dept: record.dept || record.department || 'CSE',
              paid: paidAmt,
              pending: pendingAmt,
              status: safeStatus,
              mode: record.paymentMode || 'Online'
            };
          });
          setFeeList(formatted);
      })
      .catch(err => {
        console.warn('API /api/fees offline. Loading backup fee ledger.', err);
      });
  }, []);

  // Real-time sync — auto-refresh whenever Accounts updates fees, salaries, expenses
  useRealtimeSync(fetchFees, ['fees', 'salaries', 'expenses']);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const totalCollected = deptFees.reduce((a, d) => a + d.collected, 0);
  const totalPending = deptFees.reduce((a, d) => a + d.pending, 0);
  const totalRevenue = deptFees.reduce((a, d) => a + d.total, 0);
  const collectionRate = Math.round((totalCollected / totalRevenue) * 100);

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarSign style={{ color: '#3730A5' }} size={28} /> Fees Overview
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor fee collection, pending payments, scholarships, and department-wise revenue.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Collected', value: fmt(totalCollected), icon: <CheckCircle size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: 'This academic year' },
          { label: 'Pending Amount', value: fmt(totalPending), icon: <AlertCircle size={18} />, color: 'var(--danger)', bg: '#FCEBEB', sub: `${feeList.filter(s => s.status !== 'Paid').length} students` },
          { label: 'Collection Rate', value: `${collectionRate}%`, icon: <TrendingUp size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: 'of total expected' },
          { label: 'Total Revenue', value: fmt(totalRevenue), icon: <DollarSign size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Expected total' },
          { label: 'Scholarships', value: scholarships.length, icon: <Award size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: `${scholarships.filter(s => s.status === 'Disbursed').length} disbursed` },
          { label: 'Paid Students', value: feeList.filter(s => s.status === 'Paid').length, icon: <Users size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: `of ${feeList.length} total` },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-details">
              <h3>{s.label}</h3>
              <p className="stat-value" style={{ fontSize: '1.2rem' }}>{s.value}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass-card" style={{ padding: '0.4rem', borderRadius: 12, display: 'inline-flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {[['overview', '📊 Overview'], ['collection', '📈 Collection Trend'], ['students', '👥 Student Fees'], ['scholarships', '🎓 Scholarships']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, background: tab === key ? '#3730A5' : 'transparent', color: tab === key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 260px', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Department-wise Revenue</h4>
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={deptFees} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[5, 5, 0, 0]} />
                <Bar dataKey="pending" fill="#ef4444" name="Pending" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Fee Category Breakdown</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={feeTypePie} dataKey="value" cx="50%" cy="50%" outerRadius={85} innerRadius={40} label={({ name, value }) => `${value}%`}>
                  {feeTypePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {feeTypePie.map(f => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: f.color }} />
                  <span style={{ flex: 1, color: 'var(--text-muted)' }}>{f.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{f.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1rem' }}>Quick Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Total Expected', fmt(totalRevenue), '#6366f1'], ['Collected', fmt(totalCollected), '#10b981'], ['Pending', fmt(totalPending), '#ef4444'], ['Collection Rate', `${collectionRate}%`, collectionRate >= 90 ? '#10b981' : '#f59e0b']].map(([k, v, c]) => (
                <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${c}` }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 5 }}>
                <span>Collection Progress</span><span style={{ fontWeight: 700, color: '#10b981' }}>{collectionRate}%</span>
              </div>
              <div style={{ height: 10, background: 'var(--bg-secondary)', borderRadius: 5 }}>
                <div style={{ width: `${collectionRate}%`, height: '100%', background: 'linear-gradient(90deg,#10b981,#6366f1)', borderRadius: 5, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Trend */}
      {tab === 'collection' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Monthly Fee Collection Trend</h4>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyCollection}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981' }} name="Amount Collected" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Student Fees */}
      {tab === 'students' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '1rem' }}>Student-wise Fee Status</h4>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Student Name</th><th>Department</th><th>Amount Paid</th><th>Pending</th><th>Payment Mode</th><th>Status</th></tr>
              </thead>
              <tbody>
                {feeList.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</td>
                    <td><span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '2px 7px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{s.dept}</span></td>
                    <td style={{ fontWeight: 700, color: '#10b981', fontSize: '0.88rem' }}>{fmt(s.paid)}</td>
                    <td style={{ fontWeight: 700, color: s.pending > 0 ? '#ef4444' : 'var(--text-muted)', fontSize: '0.88rem' }}>{s.pending > 0 ? fmt(s.pending) : '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.mode}</td>
                    <td>
                      <span style={{ background: s.status === 'Paid' ? 'rgba(16,185,129,0.12)' : s.status === 'Partial' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: s.status === 'Paid' ? '#10b981' : s.status === 'Partial' ? '#f59e0b' : '#ef4444', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scholarships */}
      {tab === 'scholarships' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '1rem' }}>🎓 Scholarship & Fee Waiver Registry</h4>
          {scholarships.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No scholarships have been granted yet. Go to <strong>Accounts → Scholarships</strong> to grant one.
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Student Name</th><th>Student ID</th><th>Scholarship Type</th><th>Fee Waiver</th><th>Granted Date</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {scholarships.map((s, i) => (
                      <tr key={s.id || i}>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.studentName || s.name}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.studentId}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.type}</td>
                        <td style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>{s.amount}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.date || '—'}</td>
                        <td>
                          <span style={{ background: s.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: s.status === 'Active' ? '#10b981' : '#f59e0b', padding: '3px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{s.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  ['Total Scholarships', scholarships.length, '#f59e0b'],
                  ['Active', scholarships.filter(s => s.status === 'Active').length, '#10b981'],
                  ['Full Waivers (100%)', scholarships.filter(s => s.amount === '100%').length, '#6366f1']
                ].map(([k, v, c]) => (
                  <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', borderTop: `3px solid ${c}` }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c }}>{v}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{k}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
