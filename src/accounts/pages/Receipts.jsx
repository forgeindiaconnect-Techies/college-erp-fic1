import React, { useState, useEffect } from 'react';
import { FileText, Search, Printer, Download, RefreshCw, Eye } from 'lucide-react';
import { getAllFees } from '../../api/index';
import FeeReceipt from '../../components/FeeReceipt';

const printReceipt = (rec) => {
  const normalFee = Number(rec?.normalFee ?? rec?.totalFees ?? rec?.totalFee ?? 0);
  const discountAmount = Number(rec?.discountAmount ?? 0);
  const finalFee = Number(rec?.finalFee ?? rec?.totalFees ?? rec?.totalFee ?? normalFee);
  const quotaName = rec?.quotaName || rec?.quota || "General Quota";
  const totalPaid = Number(rec?.paidAmount ?? rec?.paid ?? 0);
  const remainingFee = Number(rec?.remainingFee ?? Math.max(finalFee - totalPaid, 0));
  const currentPaymentAmount = Number(rec?.paidAmount ?? rec?.amount ?? 0);
  const receiptNo = rec?.receiptNo || rec?.receiptNumber || `REC-${Date.now()}`;
  const payDate = rec?.paymentDate
    ? new Date(rec.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const win = window.open('', '_blank', 'width=800,height=750');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt — ${receiptNo}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 30px; background: #fff; color: #111827; }
        .receipt-container { width: 100%; max-width: 720px; margin: 0 auto; border: 1px solid #d1d5db; border-radius: 10px; padding: 24px; }
        .receipt-header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
        .receipt-header h1 { margin: 0; font-size: 22px; color: #0f172a; }
        .receipt-header p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
        .receipt-metadata, .student-information { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; font-size: 13px; }
        .receipt-metadata div, .student-information div { display: flex; flex-direction: column; gap: 3px; }
        .receipt-metadata strong, .student-information strong { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .receipt-metadata span, .student-information span { font-size: 13px; font-weight: 600; color: #0f172a; }
        .receipt-fee-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        .receipt-fee-table td { border: 1px solid #d1d5db; padding: 10px; color: #1e293b; }
        .receipt-fee-table td:last-child { text-align: right; font-weight: 600; }
        .discount-row { color: #15803d !important; font-weight: 600; }
        .discount-row td { color: #15803d !important; }
        .final-fee-row { background: #f3f4f6; font-size: 14px; font-weight: 700; }
        .current-payment-row { background: #eff6ff; font-weight: 600; }
        .balance-row { background: #fff7ed; font-weight: 700; }
        .receipt-status { display: flex; justify-content: space-between; margin-top: 16px; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f8fafc; font-size: 13px; }
        .receipt-footer { margin-top: 24px; text-align: center; color: #6b7280; font-size: 11px; }
        @media print { body { padding: 0; } .receipt-container { border: none; } }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <h1>Royal College</h1>
          <p>Student Fee Payment Receipt</p>
        </div>
        <div class="receipt-metadata">
          <div><strong>Receipt Number:</strong><span>${receiptNo}</span></div>
          <div><strong>Payment Date:</strong><span>${payDate}</span></div>
        </div>
        <div class="student-information">
          <div><strong>Student Name:</strong><span>${rec.studentName || rec.studentId}</span></div>
          <div><strong>Admission / Student ID:</strong><span>${rec.studentId || 'N/A'}</span></div>
          <div><strong>Department:</strong><span>${rec.department || 'N/A'}</span></div>
          <div><strong>Quota:</strong><span>${quotaName}</span></div>
        </div>
        <table class="receipt-fee-table">
          <tbody>
            <tr><td>Normal Department Fee</td><td>₹${Number(normalFee).toLocaleString('en-IN')}</td></tr>
            <tr><td>Quota / Scholarship</td><td>${quotaName}</td></tr>
            <tr class="discount-row"><td>Quota Discount</td><td>${discountAmount > 0 ? `- ₹${Number(discountAmount).toLocaleString('en-IN')}` : '₹0'}</td></tr>
            <tr class="final-fee-row"><td>Final Payable Fee</td><td>₹${Number(finalFee).toLocaleString('en-IN')}</td></tr>
            <tr class="current-payment-row"><td>Amount Paid in This Transaction</td><td>₹${Number(currentPaymentAmount).toLocaleString('en-IN')}</td></tr>
            <tr><td>Total Paid Amount</td><td>₹${Number(totalPaid || currentPaymentAmount).toLocaleString('en-IN')}</td></tr>
            <tr class="balance-row"><td>Remaining Balance</td><td>₹${Number(remainingFee).toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>
        <div class="receipt-status">
          <strong>Payment Status:</strong>
          <span style="font-weight:700;color:${rec.status==='Paid'?'#10b981':'#f59e0b'}">${rec.status || 'Paid'}</span>
        </div>
        <div class="receipt-footer">
          <p>Thank you for your payment.</p>
          <p>This is a computer-generated receipt.</p>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

const Receipts = () => {
  const [loading, setLoading]     = useState(true);
  const [receipts, setReceipts]   = useState([]);
  const [search, setSearch]       = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAllFees();
        if (res?.data) {
          // Only show records that have been paid (have a receipt number)
          const paid = res.data.filter(r => r.status === 'Paid' || r.receiptNo);
          setReceipts(paid);
        }
      } catch (err) {
        console.error('Failed to load receipts:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.receiptNo || '').toLowerCase().includes(q) ||
      (r.studentName || '').toLowerCase().includes(q) ||
      (r.studentId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <FileText size={24} className="text-[#3b82f6]" /> Transaction Receipts
          </h1>
          <p className="text-[var(--text-muted)] mt-1">View, print, and download live fee payment receipts from database.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search Receipt ID or Student..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg pl-10 pr-4 py-2 outline-none focus:border-[#3b82f6]" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                <th className="p-4 font-medium">Receipt No.</th>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Dept / Sem</th>
                <th className="p-4 font-medium">Fee Type</th>
                <th className="p-4 font-medium">Payment Date</th>
                <th className="p-4 font-medium">Mode</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">Loading receipts from database...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">{search ? 'No matching receipts found.' : 'No paid receipts found in database.'}</td></tr>
              ) : filtered.map((rec, i) => (
                <tr key={rec._id || i} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="p-4 font-mono text-sm font-bold text-[#f59e0b]">{rec.receiptNo || `REC-${String(i+1).padStart(3,'0')}`}</td>
                  <td className="p-4">
                    <div className="font-medium text-[var(--text-main)]">{rec.studentName || rec.studentId}</div>
                    <div className="text-xs text-[var(--text-muted)]">{rec.studentId}</div>
                  </td>
                  <td className="p-4 text-[var(--text-muted)] text-sm">{rec.department} / {rec.semester}</td>
                  <td className="p-4 font-medium text-[#8b5cf6] text-sm bg-purple-500/5 rounded">
                    {rec.feeType || 'Tuition Fee'}
                  </td>
                  <td className="p-4 text-[var(--text-main)]">
                    {rec.paymentDate ? new Date(rec.paymentDate).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="p-4 text-[var(--text-muted)] text-sm">{rec.paymentMode || 'Online'}</td>
                  <td className="p-4 font-bold text-[#10b981]">₹{(rec.paidAmount || rec.totalFees || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      rec.status === 'Paid' ? 'bg-emerald-500/15 text-[#10b981]' :
                      rec.status === 'Partial' ? 'bg-amber-500/15 text-[#f59e0b]' :
                      'bg-rose-500/15 text-[#ef4444]'
                    }`}>{rec.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedReceipt(rec)}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 transition-colors">
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => printReceipt(rec)}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[#3b82f6]/10 text-[#3b82f6] rounded-lg hover:bg-[#3b82f6]/20 transition-colors">
                        <Printer size={13} /> Print
                      </button>
                      <button
                        onClick={() => printReceipt(rec)}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[#6366F1]/10 text-[#6366F1] rounded-lg hover:bg-[#6366F1]/20 transition-colors">
                        <Download size={13} /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 56: Fee Receipt Modal */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(5px)',
          padding: '20px'
        }}>
          <div style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <FeeReceipt
              selectedFeeRecord={selectedReceipt}
              selectedPayment={selectedReceipt}
              onClose={() => setSelectedReceipt(null)}
              institutionName="Royal College"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
