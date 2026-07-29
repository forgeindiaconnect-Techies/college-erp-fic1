import React, { useState, useEffect } from 'react';
import { FileText, Search, Printer, Download, RefreshCw } from 'lucide-react';
import { getAllFees } from '../../api/index';

const printReceipt = (rec) => {
  const win = window.open('', '_blank', 'width=700,height=600');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt — ${rec.receiptNo}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: #fff; color: #111; }
        .header { text-align: center; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 24px; }
        .header h1 { margin: 0; color: #f59e0b; font-size: 26px; }
        .header p { margin: 4px 0; color: #555; font-size: 13px; }
        .badge { display: inline-block; background: #f59e0b; color: white; padding: 6px 18px; border-radius: 20px; font-size: 13px; font-weight: 700; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e0e0e0; font-size: 14px; }
        .row .label { color: #666; }
        .row .value { font-weight: 600; color: #111; }
        .amount { font-size: 28px; font-weight: 800; color: #10b981; text-align: center; margin: 24px 0; }
        .footer { text-align: center; margin-top: 36px; font-size: 11px; color: #999; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 College ERP System</h1>
        <p>Finance & Accounts Department</p>
        <p>Official Fee Payment Receipt</p>
        <div class="badge">RECEIPT NO: ${rec.receiptNo || 'N/A'}</div>
      </div>
      <div class="row"><span class="label">Student ID</span><span class="value">${rec.studentId}</span></div>
      <div class="row"><span class="label">Student Name</span><span class="value">${rec.studentName || rec.studentId}</span></div>
      <div class="row"><span class="label">Department</span><span class="value">${rec.department || 'N/A'}</span></div>
      <div class="row"><span class="label">Semester</span><span class="value">${rec.semester || 'N/A'}</span></div>
      <div class="row"><span class="label">Fee Type</span><span class="value">${rec.feeType || 'Tuition Fee'}</span></div>
      <div class="row"><span class="label">Payment Mode</span><span class="value">${rec.paymentMode || 'Online'}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="value">${rec.paymentDate ? new Date(rec.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</span></div>
      <div class="row"><span class="label">Status</span><span class="value" style="color:${rec.status==='Paid'?'#10b981':'#f59e0b'}">${rec.status}</span></div>
      <div class="amount">₹${(rec.paidAmount || rec.totalFees || 0).toLocaleString()}</div>
      <div class="footer">
        <p>This is a computer-generated receipt. No signature required.</p>
        <p>Generated on ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
    </div>
  );
};

export default Receipts;
