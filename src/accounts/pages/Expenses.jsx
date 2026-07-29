import React, { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Calendar, Tag, FileText, CheckCircle, Clock } from 'lucide-react';

import { getExpenses, createExpense, updateExpense } from '../../api/index';

const DEFAULT_EXPENSES = [
  { id: 'EXP-001', title: 'Monthly Electricity Bill', category: 'Utilities', amount: 45000, date: '2026-05-01', status: 'Paid' },
  { id: 'EXP-002', title: 'Lab Computers Maintenance', category: 'Maintenance', amount: 120000, date: '2026-05-10', status: 'Paid' },
  { id: 'EXP-003', title: 'Annual Tech Fest Catering', category: 'Events', amount: 75000, date: '2026-05-18', status: 'Pending' },
  { id: 'EXP-004', title: 'Campus Wi-Fi Renewal', category: 'Utilities', amount: 30000, date: '2026-05-20', status: 'Pending' }
];

const CATEGORIES = ['All Categories', 'Utilities', 'Maintenance', 'Events', 'Payroll', 'Miscellaneous'];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    title: '',
    category: 'Utilities',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending'
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const res = await getExpenses();
      if (res.data && res.data.length > 0) {
        setExpenses(res.data);
      } else {
        // Fallback to mock data if DB is empty
        const saved = localStorage.getItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
        if (saved) {
          setExpenses(JSON.parse(saved));
        } else {
          setExpenses(DEFAULT_EXPENSES);
        }
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
      // Fallback
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
      amount: Number(form.amount)
    };
    
    try {
      const res = await createExpense(newExpense);
      if (res.status === 201) {
        setExpenses([res.data, ...expenses]);
      }
    } catch (err) {
      console.error('Failed to create expense:', err);
      // Fallback for mock
      const mockExp = { id: `EXP-${String(expenses.length + 1).padStart(3, '0')}`, ...newExpense };
      const updated = [mockExp, ...expenses];
      setExpenses(updated);
      localStorage.setItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
    }
    
    setIsModalOpen(false);
    setForm({ title: '', category: 'Utilities', amount: '', date: new Date().toISOString().split('T')[0], status: 'Pending' });
  };

  const toggleStatus = async (id) => {
    const target = expenses.find(e => e.id === id);
    if (!target) return;
    const newStatus = target.status === 'Paid' ? 'Pending' : 'Paid';
    
    try {
      // First try to update in DB
      if (target._id) {
        await updateExpense(id, { status: newStatus });
      }
      
      const updated = expenses.map(exp => {
        if (exp.id === id) {
          return { ...exp, status: newStatus };
        }
        return exp;
      });
      setExpenses(updated);
      
      // Update local storage just in case it was a mock item
      if (!target._id) {
        localStorage.setItem(`erp_expenses_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchSearch = exp.title.toLowerCase().includes(search.toLowerCase()) || exp.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All Categories' || exp.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalPaid = expenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0);
  const totalPending = expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <DollarSign size={24} className="text-[#ef4444]" /> Expense Tracking
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Manage and track all institutional operational costs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: 'var(--primary)' }}
          className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg hover:shadow-lg transition-all"
        >
          <Plus size={18} /> Log Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-[#10b981] flex flex-col justify-center">
          <span className="text-[var(--text-muted)] text-sm font-medium">Total Paid Expenses</span>
          <h2 className="text-3xl font-bold text-[var(--text-main)] mt-1">₹{totalPaid.toLocaleString()}</h2>
        </div>
        <div className="glass-card p-6 border-l-4 border-[#f59e0b] flex flex-col justify-center">
          <span className="text-[var(--text-muted)] text-sm font-medium">Pending Approvals / Due</span>
          <h2 className="text-3xl font-bold text-[var(--text-main)] mt-1">₹{totalPending.toLocaleString()}</h2>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-4 justify-between items-center bg-[var(--bg-secondary)]">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              placeholder="Search expenses..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border border-[var(--border-color)] text-[var(--text-main)] rounded-lg pl-10 pr-4 py-2 outline-none focus:border-[#ef4444]"
            />
          </div>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#ef4444]"
          >
            {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Expense Title</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">No expenses found matching criteria.</td></tr>
              ) : filteredExpenses.map(exp => (
                <tr key={exp.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="p-4 font-mono text-sm text-[var(--text-muted)]">{exp.id}</td>
                  <td className="p-4 text-[var(--text-main)] font-medium">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-[#ef4444] opacity-70" /> {exp.title}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs font-semibold text-[var(--text-muted)]">
                      <Tag size={12}/> {exp.category}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--text-main)] text-sm">
                    <div className="flex items-center gap-1"><Calendar size={14} className="text-[var(--text-muted)]"/> {exp.date}</div>
                  </td>
                  <td className="p-4 font-bold text-[var(--text-main)]">₹{exp.amount.toLocaleString()}</td>
                  <td className="p-4">
                    {exp.status === 'Paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#10b981]/10 text-[#10b981] rounded text-xs font-semibold">
                        <CheckCircle size={12}/> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#f59e0b]/10 text-[#f59e0b] rounded text-xs font-semibold">
                        <Clock size={12}/> Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => toggleStatus(exp.id)}
                      className={`text-sm font-medium transition-colors ${exp.status === 'Paid' ? 'text-[#f59e0b] hover:text-amber-600' : 'text-[#10b981] hover:text-emerald-600'}`}
                    >
                      Mark as {exp.status === 'Paid' ? 'Pending' : 'Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]">
              <h3 className="font-bold text-[var(--text-main)] text-lg">Log New Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Expense Title</label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#ef4444]" placeholder="e.g. Printer Ink Replacements"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#ef4444]">
                  {CATEGORIES.slice(1).map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Amount (₹)</label>
                  <input required type="number" min="1" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#ef4444]"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Date</label>
                  <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#ef4444]"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Initial Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#ef4444]">
                  <option>Paid</option>
                  <option>Pending</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-[var(--text-main)] font-medium hover:bg-[var(--bg-primary)] transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#ef4444] text-white rounded-lg font-medium hover:bg-red-600 transition-colors">Log Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
