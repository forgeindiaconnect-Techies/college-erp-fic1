import React, { useState, useEffect } from 'react';
import { 
  Award, Plus, Search, User, Percent, Calendar, CheckCircle2, 
  FileText, Trash2, IndianRupee, Download, Filter, X, Eye, 
  Printer, ShieldCheck, GraduationCap, Users, Sparkles
} from 'lucide-react';
import { getStudents } from '../../api/index';

const DEFAULT_SCHOLARS = [
  { id: 'SCH-101', studentId: 'HAA2026-001', studentName: 'Priya Kumar R', department: 'History and arts', semester: 'Sem 1', type: 'Sports Quota Award', amount: '25%', fixedAmount: 6500, date: '2026-05-15', status: 'Active', grantedBy: 'Director of Physical Education' },
  { id: 'SCH-102', studentId: 'BCA-2026-042', studentName: 'Alice Smith', department: 'Computer Applications', semester: 'Sem 2', type: 'Merit Scholarship', amount: '50%', fixedAmount: 18000, date: '2026-05-18', status: 'Active', grantedBy: 'Academic Council' },
  { id: 'SCH-103', studentId: 'BCOM-2026-015', studentName: 'George White', department: 'Commerce', semester: 'Sem 1', type: 'EWS Financial Aid', amount: '100%', fixedAmount: 42000, date: '2026-05-20', status: 'Active', grantedBy: 'Dean of Student Welfare' },
];

const SCHOLARSHIP_SCHEMES = [
  'Merit Scholarship',
  'Sports Quota Award',
  'EWS Financial Aid',
  'Dean’s List Excellence Award',
  'Alumni Endowment Grant',
  'First Generation Graduate Aid'
];

const Scholarships = () => {
  const [scholars, setScholars] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [waiverFilter, setWaiverFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewCertModal, setViewCertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Student search state
  const [studentSearch, setStudentSearch] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const [form, setForm] = useState({
    type: 'Merit Scholarship',
    amount: '50%',
    status: 'Active',
    note: ''
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

  // Preload students
  useEffect(() => {
    if (!isModalOpen) return;
    if (allStudents.length > 0) return;
    setLoadingStudents(true);
    getStudents()
      .then(res => {
        const data = res?.data || [];
        const list = Array.isArray(data) ? data : (data.students || []);
        setAllStudents(list);
      })
      .catch(() => {
        const local = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
        setAllStudents(local);
      })
      .finally(() => setLoadingStudents(false));
  }, [isModalOpen, allStudents.length]);

  const saveList = (newList) => {
    setScholars(newList);
    localStorage.setItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(newList));
  };

  const handleStudentSearchChange = (value) => {
    setStudentSearch(value);
    setFoundStudent(null);
    setSearchError('');
    if (!value.trim()) { setSuggestions([]); return; }
    const q = value.trim().toLowerCase();
    const matched = allStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    ).slice(0, 6);
    setSuggestions(matched);
  };

  const selectSuggestion = (s) => {
    setFoundStudent(s);
    setStudentSearch(s.name);
    setSuggestions([]);
    setSearchError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!foundStudent) {
      setSearchError('Please search and select a verified student first.');
      return;
    }

    const baseFee = Number(foundStudent.totalFee || foundStudent.normalFee || 45000);
    let pct = 0;
    if (form.amount === '100%') pct = 1.0;
    else if (form.amount === '75%') pct = 0.75;
    else if (form.amount === '50%') pct = 0.50;
    else if (form.amount === '25%') pct = 0.25;
    const computedDiscount = Math.round(baseFee * pct);

    const newScholar = {
      id: `SCH-${Math.floor(100 + Math.random() * 900)}`,
      studentId: foundStudent.id || foundStudent.admissionNumber || 'STU-NEW',
      studentName: foundStudent.name,
      department: foundStudent.dept || foundStudent.department || foundStudent.course?.name || 'Academic Dept',
      semester: foundStudent.sem || foundStudent.semester || 'Sem 1',
      type: form.type,
      amount: form.amount,
      fixedAmount: computedDiscount > 0 ? computedDiscount : 12000,
      date: new Date().toISOString().split('T')[0],
      status: form.status,
      grantedBy: 'Scholarship Review Board'
    };

    const updated = [newScholar, ...scholars];
    saveList(updated);
    setSuccessMsg(`✓ Successfully granted ${newScholar.type} (${newScholar.amount} waiver) to ${newScholar.studentName}!`);
    setIsModalOpen(false);
    setFoundStudent(null);
    setStudentSearch('');
    setSuggestions([]);
    setSearchError('');
    setForm({ type: 'Merit Scholarship', amount: '50%', status: 'Active', note: '' });
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to revoke this scholarship award?')) {
      const updated = scholars.filter(s => s.id !== id);
      saveList(updated);
      setSuccessMsg(`✓ Scholarship award revoked.`);
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  const handleExportCSV = () => {
    if (filteredScholars.length === 0) return;
    const headers = ['Award ID', 'Student ID', 'Student Name', 'Department', 'Semester', 'Scholarship Scheme', 'Waiver %', 'Estimated Concession (₹)', 'Date Granted', 'Status'];
    const rows = filteredScholars.map(s => [
      s.id,
      s.studentId,
      `"${s.studentName}"`,
      `"${s.department || 'N/A'}"`,
      s.semester || 'Sem 1',
      `"${s.type}"`,
      s.amount,
      s.fixedAmount || 0,
      s.date,
      s.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Scholarship_Awards_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredScholars = scholars.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = (s.studentName || '').toLowerCase().includes(q) ||
                        (s.studentId || '').toLowerCase().includes(q) ||
                        (s.id || '').toLowerCase().includes(q) ||
                        (s.department || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'All Types' || s.type === typeFilter;
    let matchWaiver = true;
    if (waiverFilter === '100%') matchWaiver = s.amount === '100%';
    else if (waiverFilter === '50%') matchWaiver = s.amount === '50%';
    else if (waiverFilter === 'Partial') matchWaiver = s.amount !== '100%';
    return matchSearch && matchType && matchWaiver;
  });

  const totalBeneficiaries = scholars.length;
  const fullWaiverCount = scholars.filter(s => s.amount === '100%').length;
  const totalConcessionAmount = scholars.reduce((sum, s) => sum + (Number(s.fixedAmount) || 12000), 0);
  const distinctSchemesCount = new Set(scholars.map(s => s.type)).size;

  return (
    <div className="animate-fade-in p-6" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-main)]" style={{ margin: 0 }}>
                Scholarships & Financial Aid Register
              </h1>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                Manage merit scholarships, sports concessions, institutional fee waivers, and financial aid disbursements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <button 
            type="button"
            onClick={handleExportCSV}
            disabled={filteredScholars.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold rounded-lg hover:bg-[var(--hover-bg)] transition-all shadow-sm text-sm"
          >
            <Download size={16} /> Export Register (Excel)
          </button>
          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:brightness-110 transition-all shadow-md text-sm"
          >
            <Plus size={16} /> + Grant Scholarship
          </button>
        </div>
      </div>

      {/* 4-Card Executive KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        
        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Scholars</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#6366f1', marginTop: '6px' }}>
            {totalBeneficiaries} Students
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Enrolled with approved financial grants
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Aid Value Granted</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
            ₹{totalConcessionAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Cumulative fee concession waivers
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>100% Full Fee Waivers</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', marginTop: '6px' }}>
            {fullWaiverCount} Scholars
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Zero-tuition institutional fellowship
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #ec4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grant Schemes</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(236,72,153,0.12)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ec4899', marginTop: '6px' }}>
            {distinctSchemesCount} Active
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Merit, Sports, EWS & Dean’s Awards
          </div>
        </div>

      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/15 text-[#10b981] rounded-xl border border-emerald-500/30 flex items-center justify-between gap-3 font-semibold shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-400">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border-color)', borderRadius: '14px' }}>
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-3 justify-between items-center bg-[var(--bg-secondary)]">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              placeholder="Search scholar by name, roll no, or Award ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-[#6366F1]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Type Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm">
              <Award size={15} className="text-[var(--text-muted)]" />
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-[var(--text-main)] outline-none text-sm cursor-pointer"
              >
                <option value="All Types" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>All Scholarship Schemes</option>
                {SCHOLARSHIP_SCHEMES.map(t => (
                  <option key={t} value={t} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{t}</option>
                ))}
              </select>
            </div>

            {/* Waiver Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm">
              <Percent size={15} className="text-[var(--text-muted)]" />
              <select 
                value={waiverFilter} 
                onChange={(e) => setWaiverFilter(e.target.value)}
                className="bg-transparent text-[var(--text-main)] outline-none text-sm cursor-pointer font-medium"
              >
                <option value="All" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>All Waivers</option>
                <option value="100%" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>✨ 100% Full Waiver</option>
                <option value="50%" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>50% Half Waiver</option>
                <option value="Partial" style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Partial Concessions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scholarships Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Award ID</th>
                <th className="p-4 font-bold">Scholar Details</th>
                <th className="p-4 font-bold">Department & Term</th>
                <th className="p-4 font-bold">Grant Scheme</th>
                <th className="p-4 font-bold">Waiver Concession</th>
                <th className="p-4 font-bold">Grant Date</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScholars.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GraduationCap size={36} className="text-[#6366f1]" />
                      <div className="font-bold text-base text-[var(--text-main)]">No Scholarship Records Found</div>
                      <div className="text-xs">Adjust search filters or grant a new financial aid award to an enrolled student.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredScholars.map((s, idx) => (
                  <tr key={s.id || idx} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    {/* Award ID */}
                    <td className="p-4 font-mono font-bold text-[#6366f1]">
                      <div className="flex items-center gap-1.5">
                        <Award size={14} />
                        <span>{s.id}</span>
                      </div>
                    </td>

                    {/* Student Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                          {(s.studentName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-main)]">{s.studentName}</div>
                          <div className="text-xs text-[var(--text-muted)] font-mono">
                            ID: <strong className="text-[var(--text-main)]">{s.studentId}</strong>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="p-4">
                      <div className="font-semibold text-[var(--text-main)]">{s.department || 'Academics'}</div>
                      <div className="text-xs text-[var(--text-muted)]">{s.semester || 'Sem 1'}</div>
                    </td>

                    {/* Grant Scheme */}
                    <td className="p-4">
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', display: 'inline-block' }}>
                        🎓 {s.type}
                      </span>
                    </td>

                    {/* Waiver Concession */}
                    <td className="p-4">
                      <div className="font-black text-[#10b981] text-base">
                        {s.amount} Waiver
                      </div>
                      {s.fixedAmount && (
                        <div className="text-xs text-[var(--text-muted)]">
                          ≈ ₹{Number(s.fixedAmount).toLocaleString('en-IN')} off
                        </div>
                      )}
                    </td>

                    {/* Grant Date */}
                    <td className="p-4 text-[var(--text-muted)] text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} /> {s.date || '2026-05-15'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#10b981]/15 text-[#10b981] rounded-full text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewCertModal(s)}
                          className="px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#6366f1] text-[var(--text-main)] hover:text-[#6366f1] text-xs font-bold rounded transition-colors flex items-center gap-1"
                          title="View Official Certificate"
                        >
                          <FileText size={12} /> Certificate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 hover:bg-[var(--bg-primary)] rounded text-[var(--text-muted)] hover:text-[#ef4444] transition-colors"
                          title="Revoke Scholarship"
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
          <span>Showing <strong>{filteredScholars.length}</strong> of <strong>{scholars.length}</strong> scholarship recipients</span>
          <span>Institutional Student Financial Aid Gateway</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: GRANT SCHOLARSHIP MODAL                                          */}
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
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>Grant Student Scholarship</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Authorize institutional financial concession</div>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Student Search */}
              <div style={{ marginBottom: '14px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Search & Select Student *
                </label>
                <input
                  type="text"
                  placeholder={loadingStudents ? "Loading enrolled students..." : "Type student name or ID (e.g. Priya Kumar R)..."}
                  value={studentSearch}
                  onChange={e => handleStudentSearchChange(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: foundStudent ? '2px solid #10b981' : '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />

                {/* Suggestions Dropdown */}
                {suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    {suggestions.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        onClick={() => selectSuggestion(s)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{s.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {s.id || s.admissionNumber} · {s.dept || s.department}</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>Select →</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchError && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>{searchError}</div>
                )}
              </div>

              {/* Verified Student Pill */}
              {foundStudent && (
                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem' }}>✓ {foundStudent.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{foundStudent.id} · {foundStudent.dept || foundStudent.department || 'Academics'} ({foundStudent.sem || 'Sem 1'})</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Course Base Fee</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>₹{Number(foundStudent.totalFee || 45000).toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* Grant Scheme & Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Scholarship Scheme *
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
                  >
                    {SCHOLARSHIP_SCHEMES.map(t => (
                      <option key={t} value={t} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Fee Waiver Concession *
                  </label>
                  <select
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none', fontWeight: 700 }}
                  >
                    <option value="100%">✨ 100% Full Fee Waiver</option>
                    <option value="75%">75% Major Waiver</option>
                    <option value="50%">50% Half Fee Concession</option>
                    <option value="25%">25% Special Concession</option>
                  </select>
                </div>
              </div>

              {/* Live Concession Preview */}
              {foundStudent && (
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '18px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assessed Base Fee:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{Number(foundStudent.totalFee || 45000).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#10b981' }}>
                    <span style={{ fontWeight: 700 }}>Concession Waiver ({form.amount}):</span>
                    <span style={{ fontWeight: 800 }}>−₹{Math.round(Number(foundStudent.totalFee || 45000) * (form.amount === '100%' ? 1 : form.amount === '75%' ? 0.75 : form.amount === '50%' ? 0.5 : 0.25)).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Net Student Payable:</span>
                    <span style={{ fontWeight: 900, color: '#3b82f6', fontSize: '0.95rem' }}>₹{Math.max(0, Math.round(Number(foundStudent.totalFee || 45000) * (1 - (form.amount === '100%' ? 1 : form.amount === '75%' ? 0.75 : form.amount === '50%' ? 0.5 : 0.25)))).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Buttons */}
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
                  disabled={!foundStudent}
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: foundStudent ? 'linear-gradient(to right, #6366f1, #4f46e5)' : 'var(--border-color)', color: foundStudent ? '#ffffff' : 'var(--text-muted)', fontWeight: 800, cursor: foundStudent ? 'pointer' : 'not-allowed', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: foundStudent ? '0 4px 14px rgba(99,102,241,0.3)' : 'none' }}
                >
                  <CheckCircle2 size={16} /> Grant & Issue Award
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: OFFICIAL SCHOLARSHIP CERTIFICATE PREVIEW & PRINT                 */}
      {/* ========================================================================= */}
      {viewCertModal && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
          onClick={() => setViewCertModal(null)}
        >
          <div 
            className="glass-card"
            style={{ width: '100%', maxWidth: '580px', padding: '32px', borderRadius: '16px', background: '#ffffff', color: '#1e293b', boxShadow: '0 25px 50px rgba(0,0,0,0.35)', border: '2px solid #6366f1' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Certificate Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px double #cbd5e1', paddingBottom: '16px', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                MARUDHAR KESARI JAIN COLLEGE
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                VANIYAMBADI, TAMIL NADU · FINANCIAL AID & SCHOLARSHIPS BOARD
              </div>
              <div style={{ display: 'inline-block', marginTop: '10px', padding: '4px 14px', borderRadius: '20px', background: 'rgba(99,102,241,0.12)', color: '#4f46e5', fontSize: '0.8rem', fontWeight: 800 }}>
                🏅 OFFICIAL CERTIFICATE OF SCHOLARSHIP AWARD
              </div>
            </div>

            {/* Certificate Body */}
            <div style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#334155', textAlign: 'center', marginBottom: '20px' }}>
              This is to formally certify that
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '6px 0' }}>
                {viewCertModal.studentName}
              </div>
              Student ID: <strong>{viewCertModal.studentId}</strong> · Department: <strong>{viewCertModal.department || 'Academics'}</strong>
              <div style={{ margin: '12px 0', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                has been conferred the prestigious <strong style={{ color: '#4f46e5' }}>{viewCertModal.type}</strong> with a <strong style={{ color: '#16a34a' }}>{viewCertModal.amount} tuition fee waiver</strong> (≈ ₹{Number(viewCertModal.fixedAmount || 12000).toLocaleString('en-IN')}) for the academic term.
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '0.78rem', color: '#64748b' }}>
              <div>Award ID: <strong>{viewCertModal.id}</strong><br/>Date: <strong>{viewCertModal.date}</strong></div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>Authorized Signatory</div>
                <div>Dean of Student Welfare & Accounts</div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setViewCertModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Scholarships;
