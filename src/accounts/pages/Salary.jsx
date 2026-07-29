import React, { useState, useEffect } from 'react';
import { DollarSign, Upload, CheckCircle, Clock, Plus, X, RefreshCw, AlertCircle } from 'lucide-react';
import { getSalaries, updateSalary, createSalary, getStaffForPayroll } from '../../api/index';

const Salary = () => {
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    staffId: '', staffName: '', designation: '', department: '',
    billingMonth: 'May 2026', basicPay: '', hra: '', medicalAllowance: '', specialAllowance: '',
    workingDays: '30', presentDays: '30', deductions: '', paymentMode: 'Bank Transfer'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [salRes, staffRes] = await Promise.all([
        getSalaries().catch(() => ({ data: [] })),
        getStaffForPayroll().catch(() => ({ data: [] }))
      ]);
      if (salRes?.data) setSalaries(salRes.data);
      if (staffRes?.data) setStaffList(staffRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Computed Metrics
  const totalPayroll = salaries.reduce((s, r) => s + (r.netSalary || 0), 0);
  const disbursed   = salaries.filter(r => r.status === 'Disbursed').reduce((s, r) => s + (r.netSalary || 0), 0);
  const pending     = totalPayroll - disbursed;

  const handleDisburse = async (rec) => {
    try {
      await updateSalary(rec._id, { ...rec, status: 'Disbursed', paymentDate: new Date() });
      setSuccessMsg(`✅ Salary disbursed to ${rec.staffName}!`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setErrorMsg('Failed to update salary record.');
      setTimeout(() => setErrorMsg(''), 2500);
    }
  };

  const openGenerateModal = (staff) => {
    setForm({
      staffId: staff.id || staff.staffId || '',
      staffName: staff.name || staff.staffName || '',
      designation: staff.designation || staff.role || '',
      department: staff.department || staff.dept || '',
      billingMonth: 'May 2026', basicPay: '', hra: '', medicalAllowance: '', specialAllowance: '',
      workingDays: '30', presentDays: '30', deductions: '', paymentMode: 'Bank Transfer'
    });
    setShowForm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        basicPay: Number(form.basicPay) || 0,
        hra: Number(form.hra) || 0,
        medicalAllowance: Number(form.medicalAllowance) || 0,
        specialAllowance: Number(form.specialAllowance) || 0,
        workingDays: Number(form.workingDays) || 30,
        presentDays: Number(form.presentDays) || 30,
        deductions: Number(form.deductions) || 0
      };
      await createSalary(payload);
      setSuccessMsg(`✅ Payroll entry added for ${form.staffName}!`);
      setShowForm(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Create salary error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to add payroll entry.';
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const calculatePreviewNetSalary = () => {
    const basic = Number(form.basicPay) || 0;
    const working = Number(form.workingDays) || 30;
    const present = Number(form.presentDays) || 30;
    const attendanceDeduction = working > 0 ? (basic * ((working - present) / working)) : 0;
    
    const totalEarnings = basic + (Number(form.hra) || 0) + (Number(form.medicalAllowance) || 0) + (Number(form.specialAllowance) || 0);
    const totalDeductions = (Number(form.deductions) || 0) + attendanceDeduction;
    return Math.round(totalEarnings - totalDeductions);
  };

  return (
    <div className="animate-fade-in p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <DollarSign size={24} className="text-[#10b981]" /> Employee Payroll Master List
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Live directory of all system employees and their payroll status.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] font-medium rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {successMsg && !showForm && <div className="mb-4 p-4 bg-emerald-500/20 text-[#10b981] rounded-lg border border-emerald-500/30 font-semibold">{successMsg}</div>}
      {errorMsg && !showForm && <div className="mb-4 p-4 bg-rose-500/20 text-[#ef4444] rounded-lg border border-rose-500/30 font-semibold">{errorMsg}</div>}

      {/* Add Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center px-4">
          <div className="glass-card p-6 w-full max-w-3xl rounded-2xl border border-[var(--border-color)] shadow-2xl relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-5 sticky top-0 bg-[var(--bg-primary)] z-10 p-2 -mx-2 rounded-lg shadow-sm border border-[var(--border-color)]">
              <h2 className="text-xl font-bold text-[var(--text-main)]">Generate Payroll: {form.staffName}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-[var(--hover-bg)] rounded-lg"><X size={20} /></button>
            </div>
            
            {errorMsg && <div className="mb-4 p-3 bg-rose-500/20 text-[#ef4444] rounded-lg border border-rose-500/30 font-semibold text-sm">{errorMsg}</div>}
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Staff ID</label>
                  <input required value={form.staffId} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#10b981] opacity-70" readOnly />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Staff Name</label>
                  <input required value={form.staffName} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#10b981] opacity-70" readOnly />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Designation</label>
                  <input required value={form.designation} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#10b981] opacity-70" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Department</label>
                  <input required value={form.department} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#10b981] opacity-70" readOnly />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Working Days</label>
                  <input type="number" required value={form.workingDays} onChange={e => setForm({...form, workingDays: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#10b981]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Present Days</label>
                  <input type="number" required value={form.presentDays} onChange={e => setForm({...form, presentDays: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#10b981]" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['basicPay','Basic (₹)'], ['hra','HRA (₹)'], ['medicalAllowance','Medical (₹)'], ['specialAllowance','Special (₹)']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{label}</label>
                    <input type="number" required={key==='basicPay'} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#10b981]" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Other Deductions (₹)</label>
                <input type="number" value={form.deductions} onChange={e => setForm({...form, deductions: e.target.value})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-[#ef4444]" />
                <p className="text-xs text-[var(--text-muted)] mt-1">Note: Attendance deductions are calculated automatically based on days present.</p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-center">
                <span className="text-[var(--text-muted)] text-sm">Net Salary Preview: </span>
                <span className="font-bold text-[#10b981] text-lg">₹{calculatePreviewNetSalary().toLocaleString()}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg text-[var(--text-main)] font-medium hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border-color)]">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-[#10b981] text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors">Confirm & Save Payroll</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 flex flex-col gap-2 border-l-4 border-[#6366F1]">
          <span className="text-[var(--text-muted)] text-sm">Total Employees</span>
          <span className="text-3xl font-bold text-[var(--text-main)]">{staffList.length}</span>
          <span className="text-xs text-[var(--text-muted)]">Active staff & HODs in system</span>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2 border-l-4 border-[#3b82f6]">
          <span className="text-[var(--text-muted)] text-sm">Total Payroll Generated (May 2026)</span>
          <span className="text-3xl font-bold text-[var(--text-main)]">₹{totalPayroll.toLocaleString()}</span>
          <span className="text-xs text-[var(--text-muted)]">{salaries.length} of {staffList.length} payrolls completed</span>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2 border-l-4 border-[#10b981]">
          <span className="text-[var(--text-muted)] text-sm">Amount Disbursed</span>
          <span className="text-3xl font-bold text-[#10b981]">₹{disbursed.toLocaleString()}</span>
          <span className="text-xs text-[#10b981]">{salaries.filter(s => s.status === 'Disbursed').length} staff paid</span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Role & Dept</th>
                <th className="p-4 font-medium">Contact & Join Date</th>
                <th className="p-4 font-medium">Payroll Status (May 2026)</th>
                <th className="p-4 font-medium">Net Salary</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">Loading organization data...</td></tr>
              ) : staffList.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">No employees found in the database.</td></tr>
              ) : staffList.map((staff, i) => {
                const staffId = staff.id || staff.staffId;
                const salaryRecord = salaries.find(s => s.staffId === staffId && s.billingMonth === 'May 2026');

                return (
                <tr key={staff._id || i} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-[var(--text-main)]">{staff.name || staff.staffName}</div>
                    <div className="font-mono text-xs text-[var(--text-muted)]">{staffId}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-[var(--text-main)]">{staff.designation || staff.role || 'Staff'}</div>
                    <div className="text-xs text-[var(--text-muted)]">{staff.department || staff.dept}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-[var(--text-main)] text-sm">{staff.email}</div>
                    <div className="text-xs text-[var(--text-muted)]">Joined: {staff.joinDate ? new Date(staff.joinDate).toLocaleDateString() : 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    {!salaryRecord ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500">
                        <AlertCircle size={11} /> Not Generated
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        salaryRecord.status === 'Disbursed' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                      }`}>
                        {salaryRecord.status === 'Disbursed' ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {salaryRecord.status}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-[var(--text-main)]">
                    {salaryRecord ? `₹${(salaryRecord.netSalary || 0).toLocaleString()}` : '-'}
                  </td>
                  <td className="p-4">
                    {!salaryRecord ? (
                      <button onClick={() => openGenerateModal(staff)} className="px-3 py-1.5 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1 shadow-md" style={{ backgroundColor: '#10b981', color: 'white' }}>
                        <Plus size={14} /> Generate Payroll
                      </button>
                    ) : salaryRecord.status === 'Pending' ? (
                      <button onClick={() => handleDisburse(salaryRecord)} className="px-3 py-1 text-xs font-semibold bg-[#3b82f6]/10 text-[#3b82f6] rounded-lg hover:bg-[#3b82f6]/20 transition-colors flex items-center gap-1">
                        <Upload size={12} /> Disburse Payment
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        Paid on {new Date(salaryRecord.paymentDate).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Salary;
