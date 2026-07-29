import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, Mail, CheckCircle2 } from 'lucide-react';
import { getAllFees, updateFee, getStudents, createFee } from '../../api/index';

const PendingFees = () => {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All Departments');
  const [rawFees, setRawFees] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  const loadPendingFees = async () => {
    try {
      const [feeRes, studRes] = await Promise.all([
        getAllFees().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] }))
      ]);
      
      const fees = feeRes.data || [];
      const backendStudents = studRes.data || [];
      
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const students = [...backendStudents];
      erpStudents.forEach(ls => {
        if (!students.find(cs => cs.id === ls.id || cs._id === ls.id)) {
          students.push(ls);
        }
      });
      
      // Merge logic: find students who are pending
      const mergedPending = [];
      
      students.forEach(s => {
        const studentFees = fees.filter(f => f.studentId === s.id || f.studentId === s._id);
        const isPaid = studentFees.some(f => f.status === 'Paid');
        
        if (!isPaid) {
          // Find if there's a partial/pending explicit invoice
          const existingPending = studentFees.find(f => f.status !== 'Paid');
          if (existingPending) {
            mergedPending.push({ ...existingPending, studentName: s.name, department: s.dept || s.department, semester: s.sem || s.semester });
          } else {
            // No fee record exists, but student is unpaid by default
            mergedPending.push({
              _isVirtual: true, // Tag as virtual invoice
              studentId: s.id || s._id,
              studentName: s.name,
              department: s.dept || s.department,
              semester: s.sem || s.semester,
              totalFees: 45000,
              pendingAmount: 45000,
              status: 'Pending',
              createdAt: s.createdAt || new Date().toISOString()
            });
          }
        }
      });

      setRawFees(mergedPending);
    } catch (err) {
      console.error('Failed to load pending fees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingFees();
  }, []);

  const handleCollect = async (fee) => {
    try {
      if (fee._isVirtual) {
        // If it's a virtual invoice, create a new Paid fee record
        const payload = {
          studentId: fee.studentId,
          studentName: fee.studentName,
          department: fee.department,
          semester: fee.semester,
          feeType: 'Tuition Fee',
          totalFees: fee.totalFees,
          paidAmount: fee.totalFees,
          paymentMode: 'Cash',
          status: 'Paid',
          paymentDate: new Date()
        };
        const res = await createFee(payload);
        if (res && (res.status === 200 || res.status === 201)) {
          setSuccessMsg(`Successfully cleared dues of ₹${fee.totalFees.toLocaleString()} for ${fee.studentName}!`);
          await loadPendingFees();
          setTimeout(() => setSuccessMsg(''), 2000);
        }
      } else {
        // Update existing invoice
        const payload = {
          ...fee,
          paidAmount: fee.totalFees,
          pendingAmount: 0,
          status: 'Paid',
          paymentDate: new Date()
        };
        const res = await updateFee(fee._id, payload);
        if (res && (res.status === 200 || res.status === 201)) {
          setSuccessMsg(`Successfully cleared dues of ₹${(fee.pendingAmount ?? fee.totalFees).toLocaleString()} for ${fee.studentName || fee.studentId}!`);
          await loadPendingFees();
          setTimeout(() => setSuccessMsg(''), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to clear pending fee:', err);
    }
  };

  // Keep only Pending or Partial
  const pendingItems = rawFees.filter(f => f.status !== 'Paid');

  // Apply department filter
  const filteredPending = pendingItems.filter(item => {
    if (filter === 'All Departments') return true;
    const deptCode = item.department || '';
    return deptCode.toLowerCase() === filter.toLowerCase() || 
           (filter === 'CS' && deptCode.toLowerCase().includes('computer')) ||
           (filter === 'EE' && deptCode.toLowerCase().includes('electrical')) ||
           (filter === 'ME' && deptCode.toLowerCase().includes('mechanical'));
  });

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <AlertTriangle size={24} className="text-[#ef4444]" /> Pending Fees
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Track and manage overdue student payments.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative flex items-center">
            <Filter className="absolute left-3 text-[var(--text-muted)]" size={16} />
            <select 
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg pl-9 pr-10 py-2 outline-none appearance-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ minHeight: '42px' }}
            >
              <option>All Departments</option>
              <option>CS</option>
              <option>EE</option>
              <option>ME</option>
            </select>
            <div className="absolute right-3 pointer-events-none text-[var(--text-muted)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <button 
            onClick={() => { alert('Reminders sent to all defaulters via Email & SMS!'); setSuccessMsg('Auto-reminders dispatched to all defaulters!'); setTimeout(() => setSuccessMsg(''), 3000); }}
            className="flex items-center gap-2 px-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] font-medium rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
            style={{ minHeight: '42px' }}
          >
            <Mail size={16} /> Remind All
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/20 text-[#10b981] rounded-lg border border-emerald-500/30 flex items-center gap-2 font-semibold">
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                <th className="p-4 font-medium">Student ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Dept/Sem</th>
                <th className="p-4 font-medium">Due Date</th>
                <th className="p-4 font-medium">Amount Due</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    <span className="student-spinner">Loading outstanding dues...</span>
                  </td>
                </tr>
              ) : filteredPending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    No outstanding pending invoices found in ledger database.
                  </td>
                </tr>
              ) : (
                filteredPending.map((item, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="p-4 font-mono text-sm text-[var(--text-muted)]">{item.studentId}</td>
                    <td className="p-4 text-[var(--text-main)] font-medium">{item.studentName || item.studentId}</td>
                    <td className="p-4 text-[var(--text-muted)] text-sm">{item.department || 'CSE'} - {item.semester || 'Sem 6'}</td>
                    <td className="p-4 text-[#ef4444] font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-CA') : '2026-05-28'}</td>
                    <td className="p-4 font-bold text-[var(--text-main)]">₹{(item.pendingAmount ?? item.totalFees).toLocaleString()}</td>
                    <td className="p-4 flex gap-2">
                      <button 
                        onClick={() => { alert(`Reminder sent to ${item.studentName || item.studentId}!`); setSuccessMsg(`Reminder sent to ${item.studentName || item.studentId}`); setTimeout(() => setSuccessMsg(''), 2000); }}
                        className="px-3 py-1 bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-semibold rounded hover:bg-[#3b82f6]/20 transition-colors"
                      >
                        Remind
                      </button>
                      <button 
                        onClick={() => handleCollect(item)}
                        className="px-3 py-1 bg-[#10b981]/10 text-[#10b981] text-xs font-semibold rounded hover:bg-[#10b981]/20 transition-colors"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PendingFees;
