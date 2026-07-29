import React from 'react';
import { ShieldAlert, Plus, Clock, CheckCircle } from 'lucide-react';

const ParentLeaves = () => {
  const leaveHistory = [
    { date: '2026-05-18', reason: 'Viral Fever', type: 'Medical Leave', status: 'Approved', document: 'medical_certificate.pdf' },
    { date: '2026-04-02', reason: 'Family Function', type: 'Casual Leave', status: 'Approved', document: null },
    { date: '2026-06-10', reason: 'Sister Wedding', type: 'Casual Leave', status: 'Pending', document: 'invitation.pdf' },
  ];

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <ShieldAlert size={24} className="text-[#ef4444]" /> Leave Management
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Track and submit absence requests for your child.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white rounded-lg hover:shadow-lg transition-all font-medium">
          <Plus size={18} /> Request Leave
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold text-[var(--text-main)]">Leave Request History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                <th className="p-4 font-medium">Date(s)</th>
                <th className="p-4 font-medium">Leave Type</th>
                <th className="p-4 font-medium">Reason</th>
                <th className="p-4 font-medium">Supporting Doc</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaveHistory.map((leave, i) => (
                <tr key={i} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="p-4 text-[var(--text-main)] font-medium">{leave.date}</td>
                  <td className="p-4 text-[var(--text-main)]">{leave.type}</td>
                  <td className="p-4 text-[var(--text-muted)] text-sm">{leave.reason}</td>
                  <td className="p-4">
                    {leave.document ? (
                      <a href="#" className="text-[#3b82f6] hover:underline text-sm">{leave.document}</a>
                    ) : (
                      <span className="text-[var(--text-muted)] text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                      leave.status === 'Approved' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                    }`}>
                      {leave.status === 'Approved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                      {leave.status}
                    </span>
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

export default ParentLeaves;
