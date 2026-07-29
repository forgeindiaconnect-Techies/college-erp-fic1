import React, { useState, useEffect } from 'react';
import { Award, Plus, Search, User, Percent, Calendar, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { getStudents } from '../../api/index';

const DEFAULT_SCHOLARS = [
  { id: 'SCH-101', studentId: 'STU-1001', studentName: 'Alice Smith', type: 'Merit Scholarship', amount: '50%', date: '2026-05-15', status: 'Active' },
  { id: 'SCH-102', studentId: 'STU-1004', studentName: 'David Lee', type: 'Sports Quota', amount: '25%', date: '2026-05-18', status: 'Active' },
  { id: 'SCH-103', studentId: 'STU-1007', studentName: 'George White', type: 'EWS Financial Aid', amount: '100%', date: '2026-05-20', status: 'Active' },
];

const TYPES = ['Merit Scholarship', 'Sports Quota', 'EWS Financial Aid', 'Dean’s List Award', 'Alumni Grant'];

const Scholarships = () => {
  const [scholars, setScholars] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Student search state
  const [studentSearch, setStudentSearch] = useState('');
  const [allStudents, setAllStudents] = useState([]);       // cached from DB
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState([]);        // live dropdown

  const [form, setForm] = useState({
    type: 'Merit Scholarship',
    amount: '50%',
    status: 'Active'
  });

  useEffect(() => {
    const saved = localStorage.getItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (saved) {
      setScholars(JSON.parse(saved));
    } else {
      setScholars(DEFAULT_SCHOLARS);
      localStorage.setItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(DEFAULT_SCHOLARS));
    }
  }, []);

  // Preload all students from DB when modal opens
  useEffect(() => {
    if (!isModalOpen) return;
    if (allStudents.length > 0) return; // already loaded
    setLoadingStudents(true);
    const token = sessionStorage.getItem('accounts_token') ||
                  sessionStorage.getItem('principal_token') ||
                  sessionStorage.getItem('admin_token') ||
                  sessionStorage.getItem('token');
    getStudents()
      .then(res => {
        const data = res.data || [];
        const list = Array.isArray(data) ? data : [];
        setAllStudents(list);
      })
      .catch(() => {
        // fallback: try via axios (which has the interceptor)
        getStudents()
          .then(res => setAllStudents(res?.data || []))
          .catch(() => setAllStudents([]));
      })
      .finally(() => setLoadingStudents(false));
  }, [isModalOpen]);

  const saveList = (newList) => {
    setScholars(newList);
    localStorage.setItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(newList));
  };

  // Live search as user types
  const handleStudentSearchChange = (value) => {
    setStudentSearch(value);
    setFoundStudent(null);
    setSearchError('');
    if (!value.trim()) { setSuggestions([]); return; }
    const q = value.trim().toLowerCase();
    const matched = allStudents.filter(s =>
      (s.name  && s.name.toLowerCase().includes(q)) ||
      (s.id    && s.id.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.registerNo && s.registerNo.toLowerCase().includes(q)) ||
      (s.idNumber   && s.idNumber.toLowerCase().includes(q))
    ).slice(0, 6); // show max 6 suggestions
    setSuggestions(matched);
  };

  const selectSuggestion = (s) => {
    setFoundStudent(s);
    setStudentSearch(s.name);
    setSuggestions([]);
    setSearchError('');
  };

  const lookupStudent = (e) => {
    e?.preventDefault();
    if (!studentSearch.trim()) return;
    const q = studentSearch.trim().toLowerCase();
    const match = allStudents.find(s =>
      (s.id    && s.id.toLowerCase() === q) ||
      (s.name  && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase() === q) ||
      (s.registerNo && s.registerNo.toLowerCase().includes(q)) ||
      (s.idNumber   && s.idNumber.toLowerCase().includes(q))
    );
    if (match) {
      setFoundStudent(match);
      setSuggestions([]);
      setSearchError('');
    } else {
      setFoundStudent(null);
      setSuggestions([]);
      setSearchError(allStudents.length === 0 ? 'Could not load students from database. Check connection.' : 'No student found with that name / ID / email.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!foundStudent) {
      setSearchError('Please lookup and verify a student first.');
      return;
    }
    const newScholar = {
      id: `SCH-${Math.floor(100 + Math.random() * 900)}`,
      studentId: foundStudent.id,
      studentName: foundStudent.name,
      type: form.type,
      amount: form.amount,
      date: new Date().toISOString().split('T')[0],
      status: form.status
    };
    saveList([newScholar, ...scholars]);
    setIsModalOpen(false);
    setFoundStudent(null);
    setStudentSearch('');
    setSuggestions([]);
    setSearchError('');
    setForm({ type: 'Merit Scholarship', amount: '50%', status: 'Active' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Revoke this scholarship?')) {
      saveList(scholars.filter(s => s.id !== id));
    }
  };

  const filteredScholars = scholars.filter(s => {
    const matchSearch = s.studentName.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All Types' || s.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Award size={24} className="text-[#6366F1]" /> Scholarships & Financial Aid
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Manage student financial aid distributions and grants.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: 'var(--primary)' }}
          className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg hover:shadow-lg transition-all"
        >
          <Plus size={18} /> Grant Scholarship
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-[#6366F1] flex flex-col justify-center">
          <span className="text-[var(--text-muted)] text-sm font-medium">Total Active Scholars</span>
          <h2 className="text-3xl font-bold text-[var(--text-main)] mt-1">{scholars.length}</h2>
        </div>
        <div className="glass-card p-6 border-l-4 border-[#10b981] flex flex-col justify-center">
          <span className="text-[var(--text-muted)] text-sm font-medium">Fully Waived (100%)</span>
          <h2 className="text-3xl font-bold text-[var(--text-main)] mt-1">{scholars.filter(s=>s.amount==='100%').length}</h2>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-4 justify-between items-center bg-[var(--bg-secondary)]">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              placeholder="Search scholar name or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border border-[var(--border-color)] text-[var(--text-main)] rounded-lg pl-10 pr-4 py-2 outline-none focus:border-[#6366F1]"
            />
          </div>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#6366F1]"
          >
            <option>All Types</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                <th className="p-4 font-medium">Award ID</th>
                <th className="p-4 font-medium">Student Details</th>
                <th className="p-4 font-medium">Grant Type</th>
                <th className="p-4 font-medium">Waiver Amount</th>
                <th className="p-4 font-medium">Granted Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScholars.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">No scholarships match the criteria.</td></tr>
              ) : filteredScholars.map(s => (
                <tr key={s.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="p-4 font-mono text-sm text-[var(--text-muted)]">{s.id}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[var(--text-main)] font-medium">
                      <User size={14} className="text-[#6366F1]" /> {s.studentName}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 ml-5">{s.studentId}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs font-semibold text-[var(--text-muted)]">
                      <Award size={12}/> {s.type}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-[#10b981]">
                    <div className="flex items-center gap-1"><Percent size={14} /> {s.amount}</div>
                  </td>
                  <td className="p-4 text-[var(--text-main)] text-sm">
                    <div className="flex items-center gap-1"><Calendar size={14} className="text-[var(--text-muted)]"/> {s.date}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#10b981]/10 text-[#10b981] rounded text-xs font-semibold">
                      <CheckCircle2 size={12}/> {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(s.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                      title="Revoke Scholarship"
                    >
                      <Trash2 size={16} />
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
              <h3 className="font-bold text-[var(--text-main)] text-lg">Grant Scholarship</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">✕</button>
            </div>
            
            <div className="p-5 space-y-5">
              {/* Student Lookup Section */}
              <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-lg">
                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                  Student Verification
                  {loadingStudents && <span style={{ color: '#6366F1', fontSize: '0.75rem', marginLeft: 8 }}>⏳ Loading students...</span>}
                  {!loadingStudents && allStudents.length > 0 && <span style={{ color: '#10b981', fontSize: '0.75rem', marginLeft: 8 }}>✓ {allStudents.length} students loaded</span>}
                </label>
                <form onSubmit={lookupStudent} className="flex gap-2 mb-2" style={{ position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={loadingStudents ? "Loading students..." : "Type name, ID, email or register no..."}
                      value={studentSearch}
                      onChange={e => handleStudentSearchChange(e.target.value)}
                      disabled={loadingStudents}
                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 8, padding: '7px 12px', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                    {/* Live suggestion dropdown */}
                    {suggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', marginTop: 4, overflow: 'hidden' }}>
                        {suggestions.map((s, i) => (
                          <div
                            key={s.id || i}
                            onClick={() => selectSuggestion(s)}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              ID: {s.id} &nbsp;|&nbsp; {s.dept || s.department || 'N/A'} &nbsp;|&nbsp; {s.sem || 'N/A'} &nbsp;|&nbsp; {s.email || ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" style={{ padding: '7px 14px', background: '#6366F1', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Find</button>
                </form>
                {searchError && <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4 }}>{searchError}</p>}
                {foundStudent && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(99, 102, 241,0.1)', border: '1px solid rgba(99, 102, 241,0.3)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 size={14} style={{ color: '#6366F1', flexShrink: 0 }} />
                      <strong>Verified: {foundStudent.name}</strong>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', paddingLeft: 20 }}>
                      ID: {foundStudent.id} &nbsp;·&nbsp; {foundStudent.dept || foundStudent.department || 'N/A'} &nbsp;·&nbsp; {foundStudent.sem || 'N/A'} &nbsp;·&nbsp; {foundStudent.email || ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Section */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Grant Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 8, padding: '8px 12px', outline: 'none', fontSize: '0.9rem' }}>
                    {TYPES.map(t => <option key={t} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Fee Waiver</label>
                    <select value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 8, padding: '8px 12px', outline: 'none', fontSize: '0.9rem' }}>
                      <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>100%</option>
                      <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>75%</option>
                      <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>50%</option>
                      <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>25%</option>
                      <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Initial Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 8, padding: '8px 12px', outline: 'none', fontSize: '0.9rem' }}>
                      <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Active</option>
                      <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Pending Approval</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-[var(--text-main)] font-medium hover:bg-[var(--bg-primary)] transition-colors">Cancel</button>
                  <button type="submit" disabled={!foundStudent} className={`px-4 py-2 rounded-lg font-medium transition-colors ${foundStudent ? 'bg-[#6366F1] text-white hover:bg-purple-600' : 'bg-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed'}`}>Issue Grant</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scholarships;
