import React, { useState, useEffect } from 'react';
import { 
  Search, Download, History, CreditCard, Filter, AlertCircle, 
  FileText, RotateCcw, CheckCircle, X, IndianRupee, Printer, 
  Calendar, CheckCircle2, Copy, Eye
} from 'lucide-react';
import { getAllFees, updateFee } from '../../api/index';

const PaymentHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All Methods');
  const [dateFilter, setDateFilter] = useState('All Time');

  // Receipt Modal state
  const [receiptModal, setReceiptModal] = useState(null);

  // Credit Adjustment Modal state
  const [adjustModal, setAdjustModal] = useState(null);
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
      id: `CRD-${Date.now().toString().slice(-6)}`,
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
    setAdjustSuccess(`✓ Credit of ₹${refund.toLocaleString()} issued successfully for ${adjustModal.studentName}!`);
  };

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['Receipt No', 'Date', 'Student ID', 'Student Name', 'Department', 'Payment Mode', 'Fee Head', 'Semester', 'Paid Amount (₹)', 'Txn Ref'];
    const rows = filteredHistory.map(txn => [
      txn.receiptNo || 'N/A',
      txn.paymentDate ? new Date(txn.paymentDate).toLocaleDateString('en-GB') : (txn.createdAt ? new Date(txn.createdAt).toLocaleDateString('en-GB') : 'N/A'),
      txn.studentId || 'N/A',
      `"${txn.studentName || 'Student'}"`,
      `"${txn.department || 'N/A'}"`,
      `"${txn.paymentMode || 'Cash'}"`,
      `"${txn.feeType || 'Tuition Fee'}"`,
      txn.semester || 'Sem 1',
      txn.paidAmount || txn.totalFees || 0,
      `"${txn.refNo || txn._id || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fee_Ledger_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReceiptWindow = () => {
    window.print();
  };

  const MODES = ['All Methods', 'Cash', 'UPI', 'Bank Transfer (NEFT/RTGS)', 'Credit/Debit Card', 'Demand Draft'];

  const filteredHistory = history.filter(txn => {
    const s = search.toLowerCase();
    const matchSearch = (txn.studentName || '').toLowerCase().includes(s) ||
                        (txn.studentId || '').toLowerCase().includes(s) ||
                        (txn.receiptNo || '').toLowerCase().includes(s) ||
                        (txn.refNo || '').toLowerCase().includes(s);
    const matchMode = paymentModeFilter === 'All Methods' || 
                      txn.paymentMode === paymentModeFilter || 
                      (paymentModeFilter === 'UPI' && String(txn.paymentMode || '').includes('UPI'));
    
    let matchDate = true;
    if (dateFilter !== 'All Time') {
      const txnTime = new Date(txn.paymentDate || txn.createdAt).getTime();
      const now = Date.now();
      if (dateFilter === 'Today') {
        const todayStart = new Date().setHours(0,0,0,0);
        matchDate = txnTime >= todayStart;
      } else if (dateFilter === 'Last 7 Days') {
        matchDate = (now - txnTime) <= (7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === 'This Month') {
        matchDate = (now - txnTime) <= (30 * 24 * 60 * 60 * 1000);
      }
    }

    return matchSearch && matchMode && matchDate;
  });

  // KPI Calculations
  const totalRevenue = history.reduce((sum, txn) => sum + (Number(txn.paidAmount || txn.totalFees) || 0), 0);
  const digitalTxnsCount = history.filter(txn => txn.paymentMode && txn.paymentMode !== 'Cash').length;
  const digitalSharePct = history.length > 0 ? Math.round((digitalTxnsCount / history.length) * 100) : 0;
  const totalCreditsIssued = credits.reduce((s, c) => s + c.refundAmount, 0);

  return (
    <div className="animate-fade-in p-6" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]" style={{ margin: 0 }}>
              Global Payment Ledger
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">
              Comprehensive real-time audit register of all incoming student fee transactions and official receipts.
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleExportCSV}
          disabled={filteredHistory.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold rounded-lg hover:bg-[var(--hover-bg)] transition-all shadow-sm text-sm"
        >
          <Download size={16} /> Export Excel / CSV
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        
        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Realized Revenue</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Cumulative settled collections
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transactions Count</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3b82f6', marginTop: '6px' }}>
            {history.length} Receipts
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Issued by cashier desk & online portal
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Digital / Online Ratio</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8b5cf6', marginTop: '6px' }}>
            {digitalSharePct}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {digitalTxnsCount} UPI, Bank & Card transactions
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credit Waivers Issued</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#6366f1', marginTop: '6px' }}>
            ₹{totalCreditsIssued.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {credits.length} scholarship adjustment credits
          </div>
        </div>

      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-amber-500/15 text-[#f59e0b] rounded-xl border border-amber-500/30 flex items-center gap-2 font-semibold">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* Main Ledger Card */}
      <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border-color)', borderRadius: '14px' }}>
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-3 justify-between items-center bg-[var(--bg-secondary)]">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search by Receipt No, Student Name, Roll No, Txn ID..."
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
            {/* Payment Mode Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm">
              <Filter size={15} className="text-[var(--text-muted)]" />
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="bg-transparent text-[var(--text-main)] outline-none text-sm cursor-pointer"
              >
                {MODES.map(m => <option key={m} value={m} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{m}</option>)}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm">
              <Calendar size={15} className="text-[var(--text-muted)]" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-[var(--text-main)] outline-none text-sm cursor-pointer"
              >
                {['All Time', 'Today', 'Last 7 Days', 'This Month'].map(d => (
                  <option key={d} value={d} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Receipt No.</th>
                <th className="p-4 font-bold">Date & Time</th>
                <th className="p-4 font-bold">Student Profile</th>
                <th className="p-4 font-bold">Payment Mode</th>
                <th className="p-4 font-bold">Fee Head / Term</th>
                <th className="p-4 font-bold">Settled Amount</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">Loading ledger...</td></tr>
              ) : filteredHistory.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">No transactions found matching criteria.</td></tr>
              ) : (
                filteredHistory.map(txn => {
                  const scholarship = getScholarship(txn.studentId, txn.studentName);
                  const credited = hasCreditIssued(txn._id || txn.receiptNo);
                  const paidAmt = txn.paidAmount || txn.totalFees || 0;
                  const refund = scholarship ? calcRefund(paidAmt, scholarship.amount) : 0;
                  
                  return (
                    <tr key={txn._id || txn.receiptNo} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                      {/* Receipt No */}
                      <td className="p-4 font-mono font-bold text-[#3b82f6]">
                        <div className="flex items-center gap-1.5">
                          <FileText size={15} />
                          <span>{txn.receiptNo || 'REC-N/A'}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-[var(--text-muted)] text-xs">
                        <div className="font-semibold text-[var(--text-main)]">
                          {new Date(txn.paymentDate || txn.createdAt).toLocaleDateString('en-GB')}
                        </div>
                        <div>
                          {new Date(txn.paymentDate || txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Student Details */}
                      <td className="p-4">
                        <div className="font-bold text-[var(--text-main)]">{txn.studentName}</div>
                        <div className="text-xs text-[var(--text-muted)]">{txn.studentId} • {txn.department}</div>
                        {scholarship && (
                          <div style={{ marginTop: '3px', fontSize: '0.68rem', background: 'rgba(99, 102, 241,0.12)', color: '#6366F1', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: 700 }}>
                            🎓 {scholarship.type} ({scholarship.amount} off)
                          </div>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-xs font-semibold text-[var(--text-main)]">
                          <CreditCard size={13} className="text-[#3b82f6]" /> {txn.paymentMode || 'Cash'}
                        </span>
                      </td>

                      {/* Semester / Fee Head */}
                      <td className="p-4">
                        <div className="font-semibold text-[var(--text-main)]">{txn.feeType || 'Tuition Fee'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{txn.semester || 'Sem 1'}</div>
                      </td>

                      {/* Settled Amount */}
                      <td className="p-4">
                        <div className="font-black text-[#10b981] text-base">₹{paidAmt.toLocaleString('en-IN')}</div>
                        {scholarship && refund > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 1, fontWeight: 600 }}>
                            Refund Waiver: −₹{refund.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {credited ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(16,185,129,0.12)', color: '#10b981', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                            <CheckCircle size={12} /> Credit Adjusted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#10b981]/15 text-[#10b981] rounded-md text-xs font-bold uppercase tracking-wider">
                            ✓ Processed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReceiptModal(txn)}
                            className="px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#10b981] text-[var(--text-main)] hover:text-[#10b981] text-xs font-bold rounded transition-colors flex items-center gap-1"
                            title="View / Print Receipt"
                          >
                            <Printer size={12} /> Receipt
                          </button>

                          {scholarship && !credited && (
                            <button
                              type="button"
                              onClick={() => openAdjustModal(txn)}
                              className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold rounded transition-colors flex items-center gap-1"
                              title="Apply scholarship credit"
                            >
                              <RotateCcw size={12} /> Adjust
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

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-between items-center text-xs text-[var(--text-muted)] flex-wrap gap-2">
          <span>Showing <strong>{filteredHistory.length}</strong> of <strong>{history.length}</strong> total transactions</span>
          <span>Official Institutional Fee Audit Log</span>
        </div>
      </div>

      {/* Credit Issued Summary Table (if any) */}
      {credits.length > 0 && (
        <div className="glass-card mt-6 overflow-hidden" style={{ border: '1px solid var(--border-color)', borderRadius: '14px' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <RotateCcw size={16} style={{ color: '#6366F1' }} /> Credit & Refund Adjustment Records ({credits.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
              Total Refunded: ₹{credits.reduce((s, c) => s + c.refundAmount, 0).toLocaleString()}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', background: 'var(--bg-primary)' }}>
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
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.studentName}</div>
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

      {/* ========================================================================= */}
      {/* MODAL 1: OFFICIAL PAYMENT RECEIPT PREVIEW & PRINT                          */}
      {/* ========================================================================= */}
      {receiptModal && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
          onClick={() => setReceiptModal(null)}
        >
          <div 
            className="glass-card"
            style={{ width: '100%', maxWidth: '560px', padding: '28px', borderRadius: '16px', background: '#ffffff', color: '#1e293b', boxShadow: '0 25px 50px rgba(0,0,0,0.35)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with College Brand */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                MARUDHAR KESARI JAIN COLLEGE
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                VANIYAMBADI, TAMIL NADU — 635751 · ACCOUNTS DEPARTMENT
              </div>
              <div style={{ display: 'inline-block', marginTop: '8px', padding: '3px 12px', borderRadius: '20px', background: '#f1f5f9', color: '#0f172a', fontSize: '0.75rem', fontWeight: 800 }}>
                OFFICIAL FEE RECEIPT (ORIGINAL)
              </div>
            </div>

            {/* Receipt Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', marginBottom: '16px', color: '#475569' }}>
              <div>Receipt No: <strong style={{ color: '#0f172a' }}>{receiptModal.receiptNo || 'REC-N/A'}</strong></div>
              <div>Date: <strong style={{ color: '#0f172a' }}>{new Date(receiptModal.paymentDate || receiptModal.createdAt).toLocaleDateString('en-GB')}</strong></div>
              <div>Student ID: <strong style={{ color: '#0f172a' }}>{receiptModal.studentId}</strong></div>
              <div>Student Name: <strong style={{ color: '#0f172a' }}>{receiptModal.studentName}</strong></div>
              <div>Department: <strong style={{ color: '#0f172a' }}>{receiptModal.department}</strong></div>
              <div>Semester / Term: <strong style={{ color: '#0f172a' }}>{receiptModal.semester}</strong></div>
            </div>

            {/* Itemized Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 12px', color: '#64748b' }}>Particulars</th>
                    <th style={{ padding: '8px 12px', color: '#64748b', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{receiptModal.feeType || 'Tuition / Course Fee'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{Number(receiptModal.paidAmount || receiptModal.totalFees || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 900, color: '#0f172a' }}>TOTAL RECEIVED</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#16a34a', fontSize: '1rem' }}>₹{Number(receiptModal.paidAmount || receiptModal.totalFees || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '18px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Mode: <strong>{receiptModal.paymentMode || 'Cash'}</strong></span>
              <span>Status: <strong style={{ color: '#16a34a' }}>VERIFIED & CLEARED</strong></span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintReceiptWindow}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREDIT ADJUSTMENT MODAL                                          */}
      {/* ========================================================================= */}
      {adjustModal && (() => {
        const scholarship = getScholarship(adjustModal.studentId, adjustModal.studentName);
        const paidAmt = adjustModal.paidAmount || adjustModal.totalFees || 0;
        const refund = scholarship ? calcRefund(paidAmt, scholarship.amount) : 0;
        const net = paidAmt - refund;

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: 16 }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RotateCcw size={18} style={{ color: '#6366F1' }} />
                  <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>Credit / Refund Adjustment</h3>
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
