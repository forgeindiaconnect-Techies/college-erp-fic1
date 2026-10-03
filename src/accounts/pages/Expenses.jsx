import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, DollarSign, Calendar, Tag, FileText, CheckCircle, 
  Clock, IndianRupee, Download, Filter, X, Trash2, Edit3, Eye, 
  AlertCircle, Building2, Receipt, ArrowUpRight, TrendingDown
} from 'lucide-react';
import { getExpenses, createExpense, updateExpense } from '../../api/index';

const DEFAULT_EXPENSES = [
  { id: 'EXP-001', title: 'Monthly Electricity & Substation Bill', category: 'Utilities', amount: 45000, date: '2026-05-01', status: 'Paid', payee: 'State Electricity Board', paymentMode: 'Bank Transfer' },
  { id: 'EXP-002', title: 'Computer Lab Hardware Maintenance', category: 'Maintenance', amount: 120000, date: '2026-05-10', status: 'Paid', payee: 'TechSol Services Ltd', paymentMode: 'NEFT' },
  { id: 'EXP-003', title: 'Annual Tech Fest Catering & Stalls', category: 'Events', amount: 75000, date: '2026-05-18', status: 'Pending', payee: 'Royal Caterers', paymentMode: 'Cheque' },
  { id: 'EXP-004', title: 'Campus High-Speed Leased Line Renewal', category: 'Utilities', amount: 30000, date: '2026-05-20', status: 'Pending', payee: 'Airtel Enterprise', paymentMode: 'Online' },
  { id: 'EXP-005', title: 'Library Journal Subscriptions & Books', category: 'Academics', amount: 55000, date: '2026-05-22', status: 'Paid', payee: 'Oxford University Press', paymentMode: 'Bank Transfer' }
];

const CATEGORIES = ['All Categories', 'Utilities', 'Maintenance', 'Events', 'Academics', 'Payroll', 'Miscellaneous'];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewVoucher, setViewVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [form, setForm] = useState({
    title: '',
    category: 'Utilities',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    payee: '',
    paymentMode: 'Bank Transfer',
    note: ''
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const res = await getExpenses();
      if (res.data && res.data.length > 0) {
        setExpenses(res.data);
      } else {
        const saved = localStorage.getItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
        if (saved) {
          setExpenses(JSON.parse(saved));
        } else {
          setExpenses(DEFAULT_EXPENSES);
          localStorage.setItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(DEFAULT_EXPENSES));
        }
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
      const saved = localStorage.getItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      setExpenses(saved ? JSON.parse(saved) : DEFAULT_EXPENSES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newExpense = {
      ...form,
      id: `EXP-${String(expenses.length + 1).padStart(3, '0')}`,
      amount: Number(form.amount)
    };
    
    try {
      const res = await createExpense(newExpense);
      if (res?.status === 201 && res?.data) {
        setExpenses([res.data, ...expenses]);
      } else {
        const updated = [newExpense, ...expenses];
        setExpenses(updated);
        localStorage.setItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      }
    } catch (err) {
      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      localStorage.setItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
    }
    
    setSuccessMsg(`✓ Expense voucher ${newExpense.id} for ₹${Number(form.amount).toLocaleString()} created successfully!`);
    setIsModalOpen(false);
    setForm({ title: '', category: 'Utilities', amount: '', date: new Date().toISOString().split('T')[0], status: 'Pending', payee: '', paymentMode: 'Bank Transfer', note: '' });
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const toggleStatus = async (id) => {
    const target = expenses.find(e => (e.id === id || e._id === id));
    if (!target) return;
    const newStatus = target.status === 'Paid' ? 'Pending' : 'Paid';
    
    try {
      if (target._id) {
        await updateExpense(target._id, { status: newStatus }).catch(() => null);
      }
      
      const updated = expenses.map(exp => {
        if (exp.id === id || exp._id === id) {
          return { ...exp, status: newStatus };
        }
        return exp;
      });
      setExpenses(updated);
      localStorage.setItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      setSuccessMsg(`✓ Status updated to "${newStatus}" for voucher ${target.id || id}`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      const updated = expenses.filter(e => e.id !== id && e._id !== id);
      setExpenses(updated);
      localStorage.setItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      setSuccessMsg(`✓ Expense record deleted.`);
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return;
    const headers = ['Voucher ID', 'Expense Title', 'Category', 'Payee / Vendor', 'Payment Mode', 'Date', 'Amount (₹)', 'Status'];
    const rows = filteredExpenses.map(item => [
      item.id || item._id,
      `"${item.title}"`,
      item.category,
      `"${item.payee || 'Vendor'}"`,
      item.paymentMode || 'Cash',
      item.date,
      item.amount,
      item.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expense_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = expenses.filter(exp => {
    const s = search.toLowerCase();
    const matchSearch = (exp.title || '').toLowerCase().includes(s) || 
                        (exp.id || '').toLowerCase().includes(s) ||
                        (exp.payee || '').toLowerCase().includes(s);
    const matchCat = categoryFilter === 'All Categories' || exp.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || exp.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const totalAll = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPaid = expenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPending = expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const pendingCount = expenses.filter(e => e.status === 'Pending').length;

  return (
    <div className="animate-fade-in p-6" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Top Header Banner */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-main)]" style={{ margin: 0 }}>
                Institutional Expense Tracking & Ledger
              </h1>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                Audit, track, approve and manage operational costs, campus utilities, maintenance, and departmental disbursements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <button 
            type="button"
            onClick={handleExportCSV}
            disabled={filteredExpenses.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold rounded-lg hover:bg-[var(--hover-bg)] transition-all shadow-sm text-sm"
          >
            <Download size={16} /> Export Excel / CSV
          </button>
          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:brightness-110 transition-all shadow-md text-sm"
          >
            <Plus size={16} /> + Log Expense Voucher
          </button>
        </div>
      </div>

      {/* 4-Card Executive KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        
        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Budgeted / Incurred</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '6px' }}>
            ₹{totalAll.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {expenses.length} operational vouchers
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Settled & Paid</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0}% settled disbursements
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Approvals / Dues</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', marginTop: '6px' }}>
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {pendingCount} vouchers awaiting clearance
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Heads</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8b5cf6', marginTop: '6px' }}>
            {CATEGORIES.length - 1} Categories
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Utilities, Maintenance, Events & Payroll
          </div>
        </div>

      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/15 text-[#10b981] rounded-xl border border-emerald-500/30 flex items-center justify-between gap-3 font-semibold shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-400">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Expense Table Card */}
      <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border-color)', borderRadius: '14px' }}>
        
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-3 justify-between items-center bg-[var(--bg-secondary)]">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search expenses by Title, Voucher ID, or Vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-[#3b82f6]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm">
              <Tag size={15} className="text-[var(--text-muted)]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-[var(--text-main)] outline-none text-sm cursor-pointer"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm">
              <Filter size={15} className="text-[var(--text-muted)]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[var(--text-main)] outline-none text-sm cursor-pointer font-medium"
              >
                <option value="All" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>All Statuses</option>
                <option value="Paid" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>🟢 Paid Only</option>
                <option value="Pending" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>🟡 Pending Approvals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Voucher ID</th>
                <th className="p-4 font-bold">Expense Title & Description</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Payee / Vendor</th>
                <th className="p-4 font-bold">Billing Date</th>
                <th className="p-4 font-bold">Amount</th>
                <th className="p-4 font-bold text-center">Settlement Status</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">Loading expense records...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt size={36} className="text-[#3b82f6]" />
                      <div className="font-bold text-base text-[var(--text-main)]">No Expense Records Found</div>
                      <div className="text-xs">Adjust search filters or log a new institutional operational expense.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id || exp._id || idx} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    {/* Voucher ID */}
                    <td className="p-4 font-mono font-bold text-[#3b82f6]">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} />
                        <span>{exp.id || `EXP-${idx + 1}`}</span>
                      </div>
                    </td>

                    {/* Expense Title */}
                    <td className="p-4">
                      <div className="font-bold text-[var(--text-main)]">{exp.title}</div>
                      {exp.paymentMode && (
                        <div className="text-xs text-[var(--text-muted)]">Mode: {exp.paymentMode}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                        {exp.category}
                      </span>
                    </td>

                    {/* Payee / Vendor */}
                    <td className="p-4 text-[var(--text-main)] font-medium">
                      {exp.payee || 'Institutional Vendor'}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-[var(--text-muted)] text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} /> {exp.date || '2026-05-01'}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-black text-base text-[var(--text-main)]">
                      ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleStatus(exp.id || exp._id)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                          exp.status === 'Paid' 
                            ? 'bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 border border-[#10b981]/30' 
                            : 'bg-[#f59e0b]/15 text-[#f59e0b] hover:bg-[#f59e0b]/25 border border-[#f59e0b]/30'
                        }`}
                        title="Click to toggle status"
                      >
                        {exp.status === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {exp.status}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewVoucher(exp)}
                          className="p-1.5 hover:bg-[var(--bg-primary)] rounded text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors"
                          title="View Voucher Breakdown"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id || exp._id)}
                          className="p-1.5 hover:bg-[var(--bg-primary)] rounded text-[var(--text-muted)] hover:text-[#ef4444] transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-between items-center text-xs text-[var(--text-muted)] flex-wrap gap-2">
          <span>Showing <strong>{filteredExpenses.length}</strong> of <strong>{expenses.length}</strong> operational expenses</span>
          <span>College Financial Operations Desk · Real-time ledger audit log</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / LOG NEW EXPENSE VOUCHER                                 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="glass-card"
            style={{ width: '100%', maxWidth: '520px', padding: '24px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.35)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>Log Operational Expense</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Create institutional expenditure voucher</div>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Lab Chemical Reagents Purchase"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {CATEGORIES.filter(c => c !== 'All Categories').map(c => (
                      <option key={c} value={c} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 45000"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Payee / Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Electricals Ltd"
                    value={form.payee}
                    onChange={e => setForm({ ...form, payee: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="Bank Transfer">🏦 Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">📜 Cheque</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Online">📱 Online / UPI</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Billing Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Initial Settlement Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="Pending">🟡 Pending Approval</option>
                    <option value="Paid">🟢 Settled & Paid</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(to right, #3b82f6, #1d4ed8)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={16} /> Save & Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VOUCHER DETAILS VIEW MODAL                                       */}
      {/* ========================================================================= */}
      {viewVoucher && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
          onClick={() => setViewVoucher(null)}
        >
          <div 
            className="glass-card"
            style={{ width: '100%', maxWidth: '480px', padding: '24px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.35)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} className="text-[#3b82f6]" />
                <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>
                  Expenditure Voucher: {viewVoucher.id || 'EXP'}
                </h3>
              </div>
              <button onClick={() => setViewVoucher(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Title:</span> <strong style={{ display: 'block', color: 'var(--text-main)' }}>{viewVoucher.title}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <strong style={{ display: 'block', color: 'var(--text-main)' }}>{viewVoucher.category}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Payee / Vendor:</span> <strong style={{ display: 'block', color: 'var(--text-main)' }}>{viewVoucher.payee || 'Institutional'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong style={{ display: 'block', color: 'var(--text-main)' }}>{viewVoucher.date}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Mode:</span> <strong style={{ display: 'block', color: 'var(--text-main)' }}>{viewVoucher.paymentMode || 'Bank'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong style={{ display: 'block', color: viewVoucher.status === 'Paid' ? '#10b981' : '#f59e0b' }}>{viewVoucher.status}</strong></div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>Voucher Total:</span>
              <span style={{ fontWeight: 900, fontSize: '1.3rem', color: '#3b82f6' }}>₹{Number(viewVoucher.amount || 0).toLocaleString('en-IN')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setViewVoucher(null)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Expenses;
