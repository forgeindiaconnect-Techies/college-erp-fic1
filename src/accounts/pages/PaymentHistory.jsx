import React, { useState, useEffect } from 'react';
import { Search, Download, History, CreditCard, Filter, AlertCircle, FileText, RotateCcw, CheckCircle, X } from 'lucide-react';
import { getAllFees, updateFee } from '../../api/index';

const PaymentHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All Methods');

  // Credit Adjustment Modal state
  const [adjustModal, setAdjustModal] = useState(null); // holds the txn being adjusted
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');
  const [credits, setCredits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_credits') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getAllFees();
      if (res?.data) {
        setHistory(res.data.reverse());
      }
    } catch (err) {
      console.error('Error fetching global payment history:', err);
      setErrorMsg('Could not fetch live ledger from backend. Displaying offline cache.');
      const cached = localStorage.getItem('erp_fees');
      if (cached) setHistory(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  // Look up scholarship for a student
  const getScholarship = (studentId, studentName) => {
    try {
      const scholars = JSON.parse(localStorage.getItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      return scholars.find(s =>
        s.studentId === studentId ||
        (studentName && s.studentName?.toLowerCase() === studentName?.toLowerCase())
      ) || null;
    } catch { return null; }
  };

  // Check if credit already issued for this txn
  const hasCreditIssued = (txnId) => credits.some(c => c.txnId === txnId);

  // Calculate refund from scholarship waiver %
  const calcRefund = (paidAmount, waiver) => {
    const pct = parseInt(waiver) || 0;
    return Math.round((paidAmount * pct) / 100);
  };

  const openAdjustModal = (txn) => {
    setAdjustModal(txn);
    setAdjustNote('');
    setAdjustSuccess('');
  };

  const applyCredit = () => {
    const scholarship = getScholarship(adjustModal.studentId, adjustModal.studentName);
    const paidAmt = adjustModal.paidAmount || adjustModal.totalFees || 0;
    const refund = calcRefund(paidAmt, scholarship?.amount || '0');

    const creditRecord = {
      id: `CRD-${Date.now()}`,
      txnId: adjustModal._id || adjustModal.receiptNo,
      studentId: adjustModal.studentId,
      studentName: adjustModal.studentName,
      originalAmount: paidAmt,
      scholarshipType: scholarship?.type || 'Scholarship',
      waiver: scholarship?.amount || '0%',
      refundAmount: refund,
      netPayable: paidAmt - refund,
      note: adjustNote || `Credit issued for ${scholarship?.type || 'scholarship'} discount`,
      date: new Date().toISOString().split('T')[0],
      receiptNo: adjustModal.receiptNo,
      semester: adjustModal.semester,
    };

    const updated = [creditRecord, ...credits];
    setCredits(updated);
    localStorage.setItem('erp_credits', JSON.stringify(updated));
    setAdjustSuccess(`✅ Credit of ₹${refund.toLocaleString()} issued successfully for ${adjustModal.studentName}!`);
  };

  const MODES = ['All Methods', 'Bank Transfer (NEFT/RTGS)', 'Credit/Debit Card', 'Cash', 'Demand Draft'];

  const filteredHistory = history.filter(txn => {
    const s = search.toLowerCase();
    const matchSearch = (txn.studentName || '').toLowerCase().includes(s) ||
                        (txn.studentId || '').toLowerCase().includes(s) ||
                        (txn.receiptNo || '').toLowerCase().includes(s);
    const matchMode = paymentModeFilter === 'All Methods' || txn.paymentMode === paymentModeFilter;
    return matchSearch && matchMode;
  });

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <History size={24} className="text-[#3b82f6]" /> Global Payment Ledger
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Unified view of all incoming student fee transactions.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-[var(--border-color)] text-[var(--text-main)] font-medium rounded-lg hover:bg-[var(--bg-secondary)] transition-colors shadow-sm">
          <Download size={18} /> Export Excel
        </button>
      </div>

      {/* Credit Issued Summary Banner */}
      {credits.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
            {credits.length} credit adjustment{credits.length > 1 ? 's' : ''} issued — Total refunded: ₹{credits.reduce((s, c) => s + c.refundAmount, 0).toLocaleString()}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-amber-500/20 text-[#f59e0b] rounded-lg border border-amber-500/30 flex items-center gap-2 font-semibold">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-4 justify-between items-center bg-[var(--bg-secondary)]">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search Txn ID, Student ID, or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border border-[var(--border-color)] text-[var(--text-main)] rounded-lg pl-10 pr-4 py-2 outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--text-muted)]" />
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="bg-transparent border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-4 py-2 outline-none focus:border-[#3b82f6]"
            >
              {MODES.map(m => <option key={m} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                <th className="p-4 font-medium">Receipt No.</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Student Details</th>
                <th className="p-4 font-medium">Payment Mode</th>
                <th className="p-4 font-medium">Semester/Type</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-center">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">Loading ledger...</td></tr>
              ) : filteredHistory.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">No transactions found matching criteria.</td></tr>
              ) : filteredHistory.map(txn => {
                const scholarship = getScholarship(txn.studentId, txn.studentName);
                const credited = hasCreditIssued(txn._id || txn.receiptNo);
                const paidAmt = txn.paidAmount || txn.totalFees || 0;
                const refund = scholarship ? calcRefund(paidAmt, scholarship.amount) : 0;
                return (
                  <tr key={txn._id || txn.receiptNo} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="p-4 font-mono text-sm text-[var(--text-main)] font-semibold">
                      <div className="flex items-center gap-1.5"><FileText size={14} className="text-[#3b82f6]" /> {txn.receiptNo}</div>
                    </td>
                    <td className="p-4 text-[var(--text-main)] text-sm">
                      {new Date(txn.paymentDate || txn.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-[var(--text-main)]">{txn.studentName}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{txn.studentId} • {txn.department}</div>
                      {scholarship && (
                        <div style={{ marginTop: 4, fontSize: '0.7rem', background: 'rgba(99, 102, 241,0.12)', color: '#6366F1', padding: '2px 7px', borderRadius: 5, display: 'inline-block', fontWeight: 700 }}>
                          🎓 {scholarship.type} ({scholarship.amount} off)
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs font-semibold text-[var(--text-muted)]">
                        <CreditCard size={12} /> {txn.paymentMode}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-main)]">
                      {txn.feeType || 'Tuition Fee'} • {txn.semester}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#10b981]">₹{paidAmt.toLocaleString()}</div>
                      {scholarship && refund > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>
                          Refund: −₹{refund.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {credited ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                          <CheckCircle size={11} /> Credit Issued
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#10b981]/10 text-[#10b981] rounded text-xs font-bold uppercase tracking-wider">
                          Processed
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {scholarship && !credited ? (
                        <button
                          onClick={() => openAdjustModal(txn)}
                          style={{ padding: '5px 12px', background: 'rgba(99, 102, 241,0.12)', color: '#6366F1', border: '1px solid rgba(99, 102, 241,0.3)', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <RotateCcw size={12} /> Adjust
                        </button>
                      ) : credited ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No Scholarship</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Issued Records */}
      {credits.length > 0 && (
        <div className="glass-card mt-6 overflow-hidden">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={16} style={{ color: '#6366F1' }} /> Credit Adjustment Records
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <th className="p-3">Credit ID</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Scholarship</th>
                  <th className="p-3">Original Paid</th>
                  <th className="p-3">Refund (Credit)</th>
                  <th className="p-3">Net Payable</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < credits.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#6366F1', fontWeight: 700 }}>{c.id}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>{c.studentName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.studentId} • {c.semester}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241,0.1)', color: '#6366F1', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                        🎓 {c.scholarshipType} — {c.waiver}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main)' }}>₹{c.originalAmount.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#10b981' }}>−₹{c.refundAmount.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#3b82f6' }}>₹{c.netPayable.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Adjustment Modal */}
      {adjustModal && (() => {
        const scholarship = getScholarship(adjustModal.studentId, adjustModal.studentName);
        const paidAmt = adjustModal.paidAmount || adjustModal.totalFees || 0;
        const refund = scholarship ? calcRefund(paidAmt, scholarship.amount) : 0;
        const net = paidAmt - refund;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: 16 }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RotateCcw size={18} style={{ color: '#6366F1' }} />
                  <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>Credit / Refund Adjustment</h3>
                </div>
                <button onClick={() => setAdjustModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
              </div>

              <div style={{ padding: '20px' }}>
                {adjustSuccess ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: 6 }}>{adjustSuccess}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>Net payable amount: ₹{net.toLocaleString()}</div>
                    <button onClick={() => setAdjustModal(null)} style={{ padding: '8px 24px', background: '#6366F1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Close</button>
                  </div>
                ) : (
                  <>
                    {/* Student Info */}
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{adjustModal.studentName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{adjustModal.studentId} • {adjustModal.department} • {adjustModal.semester}</div>
                    </div>

                    {/* Scholarship Info */}
                    {scholarship ? (
                      <div style={{ background: 'rgba(99, 102, 241,0.08)', border: '1px solid rgba(99, 102, 241,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.78rem', color: '#6366F1', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Scholarship Found</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>🎓 {scholarship.type}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Waiver: {scholarship.amount} • Status: {scholarship.status}</div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>
                        ⚠️ No active scholarship found for this student.
                      </div>
                    )}

                    {/* Calculation Breakdown */}
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '14px', marginBottom: 16, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Adjustment Calculation</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{paidAmt.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Scholarship Discount ({scholarship?.amount || '0%'}):</span>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>−₹{refund.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Credit to Issue:</span>
                        <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>₹{refund.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Student's Net Payable:</span>
                        <span style={{ fontWeight: 700, color: '#3b82f6' }}>₹{net.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Note */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Note (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Merit scholarship adjustment for Sem 1"
                        value={adjustNote}
                        onChange={e => setAdjustNote(e.target.value)}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 8, padding: '8px 12px', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => setAdjustModal(null)} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>Cancel</button>
                      <button
                        onClick={applyCredit}
                        disabled={!scholarship || refund === 0}
                        style={{ padding: '8px 20px', background: scholarship && refund > 0 ? '#6366F1' : 'var(--border-color)', color: scholarship && refund > 0 ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontWeight: 700, cursor: scholarship && refund > 0 ? 'pointer' : 'not-allowed', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <CheckCircle size={15} /> Issue Credit ₹{refund.toLocaleString()}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PaymentHistory;
