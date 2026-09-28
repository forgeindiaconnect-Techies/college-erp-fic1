import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  IndianRupee, 
  Upload, 
  CheckCircle, 
  Clock, 
  Plus, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Search, 
  Filter, 
  ShieldCheck, 
  Calendar, 
  Zap,
  Users,
  Bus,
  Home,
  Briefcase,
  GraduationCap,
  Building,
  UserPlus
} from 'lucide-react';
import { 
  getSalaries, 
  updateSalary, 
  createSalary, 
  getStaff, 
  getTransportDrivers, 
  getHostelBlocks, 
  getAccountsOfficers,
  getUsers 
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const numberToWords = (num) => {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'Amount Exceeds Range';
    let n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str.trim();
  };

  return inWords(Math.round(num)) + ' Rupees Only';
};

const PAY_PRESETS = {
  HOD: { basic: 78000, hra: 15600, medical: 4000, special: 12000, deductions: 6800 },
  Professor: { basic: 65000, hra: 13000, medical: 3500, special: 8000, deductions: 5200 },
  AssistantProfessor: { basic: 42000, hra: 8400, medical: 2500, special: 3500, deductions: 3200 },
  Driver: { basic: 18000, hra: 2500, medical: 1000, special: 500, deductions: 800 },
  Hostel: { basic: 32000, hra: 5000, medical: 2000, special: 2500, deductions: 2200 },
  Accounts: { basic: 38000, hra: 6500, medical: 2500, special: 3000, deductions: 2800 },
  Staff: { basic: 28000, hra: 4500, medical: 1500, special: 1500, deductions: 1800 }
};

export const getCategoryKey = (staff) => {
  if (!staff) return 'Staff';
  const cat = (staff.category || '').toLowerCase();
  const role = (staff.designation || staff.role || '').toLowerCase();
  const dept = (staff.department || staff.dept || '').toLowerCase();

  if (cat.includes('driver') || role.includes('driver') || dept.includes('transport')) return 'Driver';
  if (cat.includes('hostel') || role.includes('warden') || dept.includes('hostel')) return 'Hostel';
  if (cat.includes('account') || role.includes('account') || role.includes('bursar') || role.includes('cashier') || dept.includes('finance') || dept.includes('account')) return 'Accounts';
  if (cat.includes('hod') || role.includes('hod') || role.includes('head')) return 'HOD';
  return 'Staff';
};

const Salary = () => {
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('June 2026');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [form, setForm] = useState({
    staffId: '',
    staffName: '',
    designation: '',
    department: '',
    billingMonth: 'June 2026',
    basicPay: 42000,
    hra: 8400,
    medicalAllowance: 2500,
    specialAllowance: 3500,
    workingDays: 30,
    presentDays: 30,
    deductions: 3200,
    paymentMode: 'Bank Transfer (NEFT)',
    status: 'Disbursed'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [salRes, staffRes, driverRes, hostelRes, accountsRes, usersRes] = await Promise.all([
        getSalaries().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getTransportDrivers().catch(() => ({ data: [] })),
        getHostelBlocks().catch(() => ({ data: [] })),
        getAccountsOfficers().catch(() => ({ data: [] })),
        getUsers().catch(() => ({ data: [] }))
      ]);

      if (salRes?.data) setSalaries(Array.isArray(salRes.data) ? salRes.data : []);

      const list = [];
      const seenIds = new Set();
      const seenNames = new Set();

      // 1. Original Staff & HODs from DB
      if (staffRes?.data && Array.isArray(staffRes.data)) {
        staffRes.data.forEach(s => {
          const id = s.id || s.staffId || s._id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            if (s.name) seenNames.add(s.name.toLowerCase().trim());
            const isHod = (s.designation || '').toUpperCase().includes('HOD') || (s.role || '').toUpperCase() === 'HOD';
            list.push({
              _id: s._id,
              id,
              staffId: id,
              name: s.name,
              staffName: s.name,
              designation: s.designation || (isHod ? 'Head of Department (HOD)' : 'Faculty Member'),
              department: s.dept || s.department || 'Academic',
              category: isHod ? 'HOD' : 'Staff',
              email: s.email || '',
              phone: s.phone || '',
              joinDate: s.joinDate || s.createdAt
            });
          }
        });
      }

      // 2. Original Transport Drivers from DB
      if (driverRes?.data && Array.isArray(driverRes.data)) {
        driverRes.data.forEach(d => {
          const id = d.driverId || d.employeeId || d._id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            if (d.name) seenNames.add(d.name.toLowerCase().trim());
            list.push({
              _id: d._id,
              id,
              staffId: id,
              name: d.name,
              staffName: d.name,
              designation: d.employmentType ? `${d.employmentType} Driver` : 'Transport Driver',
              department: 'Transport',
              category: 'Driver',
              email: d.email || '',
              phone: d.phone || '',
              license: d.license || '',
              joinDate: d.joiningDate || d.createdAt
            });
          }
        });
      }

      // 3. Original Hostel Wardens & Staff from DB Blocks
      if (hostelRes?.data && Array.isArray(hostelRes.data)) {
        hostelRes.data.forEach((b, idx) => {
          if (b.warden && b.warden.trim()) {
            const id = b.blockId ? `HST-${b.blockId}` : `HST-00${idx + 1}`;
            const wardenKey = b.warden.toLowerCase().trim();
            if (!seenIds.has(id) && !seenNames.has(wardenKey)) {
              seenIds.add(id);
              seenNames.add(wardenKey);
              list.push({
                _id: b._id,
                id,
                staffId: id,
                name: b.warden,
                staffName: b.warden,
                designation: `Hostel Warden (${b.name || 'Block'})`,
                department: 'Hostel Administration',
                category: 'Hostel',
                email: b.wardenContact || '',
                phone: b.wardenContact || '',
                joinDate: b.createdAt
              });
            }
          }
        });
      }

      // 4. Original Accounts Officers from DB
      if (accountsRes?.data && Array.isArray(accountsRes.data)) {
        accountsRes.data.forEach((o, idx) => {
          const id = o.referenceId || `ACC-00${idx + 1}`;
          const nameKey = (o.name || '').toLowerCase().trim();
          if (!seenIds.has(id) && !seenNames.has(nameKey)) {
            seenIds.add(id);
            seenNames.add(nameKey);
            list.push({
              _id: o._id,
              id,
              staffId: id,
              name: o.name,
              staffName: o.name,
              designation: 'Accounts Officer',
              department: 'Finance & Accounts',
              category: 'Accounts',
              email: o.email || '',
              phone: o.phone || '',
              joinDate: o.createdAt
            });
          }
        });
      }

      // 5. Original Users with role 'Hostel' or 'Driver' or 'Accounts'
      if (usersRes?.data && Array.isArray(usersRes.data)) {
        usersRes.data.forEach(u => {
          const role = (u.role || '').toLowerCase();
          const nameKey = (u.name || '').toLowerCase().trim();
          if (role === 'hostel' && !seenNames.has(nameKey)) {
            const id = u.referenceId || `HST-${(u._id || '').slice(-4)}`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              seenNames.add(nameKey);
              list.push({
                _id: u._id,
                id,
                staffId: id,
                name: u.name,
                staffName: u.name,
                designation: u.wardenType || 'Hostel Warden',
                department: 'Hostel Administration',
                category: 'Hostel',
                email: u.email || '',
                phone: u.phone || '',
                joinDate: u.createdAt
              });
            }
          } else if (role === 'driver' && !seenNames.has(nameKey)) {
            const id = u.referenceId || `DRV-${(u._id || '').slice(-4)}`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              seenNames.add(nameKey);
              list.push({
                _id: u._id,
                id,
                staffId: id,
                name: u.name,
                staffName: u.name,
                designation: 'Transport Driver',
                department: 'Transport',
                category: 'Driver',
                email: u.email || '',
                phone: u.phone || '',
                joinDate: u.createdAt
              });
            }
          }
        });
      }

      setStaffList(list);
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization whenever staff, drivers, hostel, accounts or salaries change in ERP
  useRealtimeSync(loadData, ['salaries', 'staff', 'transport', 'hostel', 'accounts', 'users']);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  // Filtered dataset
  const filteredStaff = useMemo(() => {
    return staffList.filter(staff => {
      const name = (staff.name || staff.staffName || '').toLowerCase();
      const id = (staff.id || staff.staffId || '').toLowerCase();
      const dept = (staff.department || staff.dept || '').toLowerCase();
      const cat = getCategoryKey(staff);
      const q = searchQuery.toLowerCase();

      const matchesSearch = name.includes(q) || id.includes(q) || dept.includes(q) || cat.toLowerCase().includes(q);
      const matchesDept = departmentFilter === 'ALL' || (staff.department || staff.dept) === departmentFilter;
      const matchesCat = categoryFilter === 'ALL' || cat === categoryFilter;

      return matchesSearch && matchesDept && matchesCat;
    });
  }, [staffList, searchQuery, departmentFilter, categoryFilter]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    staffList.forEach(s => {
      const d = s.department || s.dept;
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [staffList]);

  // Month-specific computed metrics
  const monthSalaries = useMemo(() => {
    return salaries.filter(s => s.billingMonth === selectedMonth);
  }, [salaries, selectedMonth]);

  const totalPayroll = monthSalaries.reduce((s, r) => s + (r.netSalary || 0), 0);
  const disbursed = monthSalaries.filter(r => r.status === 'Disbursed').reduce((s, r) => s + (r.netSalary || 0), 0);
  const pending = totalPayroll - disbursed;

  const handleDisburse = async (rec) => {
    try {
      await updateSalary(rec._id, { ...rec, status: 'Disbursed', paymentDate: new Date() });
      setSuccessMsg(`✅ Salary successfully disbursed to ${rec.staffName}!`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Failed to update salary status.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const applyPreset = (presetKey) => {
    const p = PAY_PRESETS[presetKey];
    if (p) {
      setForm(prev => ({
        ...prev,
        basicPay: p.basic,
        hra: p.hra,
        medicalAllowance: p.medical,
        specialAllowance: p.special,
        deductions: p.deductions
      }));
    }
  };

  const openGenerateModal = (staff) => {
    setIsCustomMode(false);
    const role = (staff.designation || staff.role || '').toLowerCase();
    const dept = (staff.department || staff.dept || '').toLowerCase();
    let defaultPreset = PAY_PRESETS.Staff;

    if (role.includes('hod') || role.includes('head')) defaultPreset = PAY_PRESETS.HOD;
    else if (role.includes('driver') || dept.includes('transport')) defaultPreset = PAY_PRESETS.Driver;
    else if (role.includes('hostel') || role.includes('warden') || dept.includes('hostel')) defaultPreset = PAY_PRESETS.Hostel;
    else if (role.includes('account') || dept.includes('finance')) defaultPreset = PAY_PRESETS.Accounts;
    else if (role.includes('prof') && !role.includes('assistant')) defaultPreset = PAY_PRESETS.Professor;
    else if (role.includes('assistant') || role.includes('faculty')) defaultPreset = PAY_PRESETS.AssistantProfessor;

    setForm({
      staffId: staff.id || staff.staffId || '',
      staffName: staff.name || staff.staffName || '',
      designation: staff.designation || staff.role || 'Staff Member',
      department: staff.department || staff.dept || 'Academic Faculty',
      billingMonth: selectedMonth,
      basicPay: defaultPreset.basic,
      hra: defaultPreset.hra,
      medicalAllowance: defaultPreset.medical,
      specialAllowance: defaultPreset.special,
      workingDays: 30,
      presentDays: 30,
      deductions: defaultPreset.deductions,
      paymentMode: 'Bank Transfer (NEFT)',
      status: 'Disbursed'
    });
    setShowForm(true);
  };

  const openCustomModal = () => {
    setIsCustomMode(true);
    setForm({
      staffId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      staffName: '',
      designation: 'Transport Driver',
      department: 'Transport',
      billingMonth: selectedMonth,
      basicPay: PAY_PRESETS.Driver.basic,
      hra: PAY_PRESETS.Driver.hra,
      medicalAllowance: PAY_PRESETS.Driver.medical,
      specialAllowance: PAY_PRESETS.Driver.special,
      workingDays: 30,
      presentDays: 30,
      deductions: PAY_PRESETS.Driver.deductions,
      paymentMode: 'Bank Transfer (NEFT)',
      status: 'Disbursed'
    });
    setShowForm(true);
  };

  // Live calculation for modal preview
  const calcBasic = Number(form.basicPay) || 0;
  const calcHra = Number(form.hra) || 0;
  const calcMedical = Number(form.medicalAllowance) || 0;
  const calcSpecial = Number(form.specialAllowance) || 0;
  const calcWorking = Number(form.workingDays) || 30;
  const calcPresent = Number(form.presentDays) || 30;
  const calcLopDays = Math.max(0, calcWorking - calcPresent);
  
  const calcAttendanceDeduction = calcWorking > 0 ? Math.round(calcBasic * (calcLopDays / calcWorking)) : 0;
  const calcTotalEarnings = calcBasic + calcHra + calcMedical + calcSpecial;
  const calcOtherDeductions = Number(form.deductions) || 0;
  const calcTotalDeductions = calcOtherDeductions + calcAttendanceDeduction;
  const calcNetPayable = Math.max(0, calcTotalEarnings - calcTotalDeductions);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.staffName.trim() || !form.staffId.trim()) {
      setErrorMsg('Please enter both Employee Name and Staff ID.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        basicPay: calcBasic,
        hra: calcHra,
        medicalAllowance: calcMedical,
        specialAllowance: calcSpecial,
        workingDays: calcWorking,
        presentDays: calcPresent,
        deductions: calcTotalDeductions,
        netSalary: calcNetPayable,
        paymentDate: form.status === 'Disbursed' ? new Date() : null
      };

      await createSalary(payload);
      setSuccessMsg(`✅ Official payroll voucher generated for ${form.staffName} (${selectedMonth})!`);
      setShowForm(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Create salary error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to add payroll entry.';
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (staff) => {
    const key = getCategoryKey(staff);
    if (key === 'HOD') {
      return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>HOD</span>;
    }
    if (key === 'Driver') {
      return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>DRIVER</span>;
    }
    if (key === 'Hostel') {
      return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#fce7f3', color: '#be185d', border: '1px solid #fbcfe8' }}>HOSTEL</span>;
    }
    if (key === 'Accounts') {
      return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>ACCOUNTS</span>;
    }
    return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>FACULTY / STAFF</span>;
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── 1. Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#eff6ff', padding: '0.15rem 0.5rem', borderRadius: '4px', marginBottom: '0.3rem' }}>
            <ShieldCheck size={13} /> Central Accounts & Finance Division
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
            College Payroll & Disbursement Master
          </h1>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Comprehensive salary ledger covering HODs, Teaching Faculty, Transport Drivers, Hostel Wardens, and Accounts Officers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: '0.5rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
          >
            <option value="June 2026">June 2026 (Active Period)</option>
            <option value="May 2026">May 2026</option>
            <option value="April 2026">April 2026</option>
            <option value="March 2026">March 2026</option>
          </select>

          <button 
            onClick={openCustomModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', borderRadius: '6px', border: '1px solid #166534', background: '#16a34a', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(22,101,52,0.2)' }}
          >
            <UserPlus size={15} /> + Add / Custom Payroll Voucher
          </button>

          <button 
            onClick={loadData} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Toast Alerts ── */}
      {successMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', color: '#166534', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* ── 2. KPI Metrics Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Personnel Across College</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{staffList.length} Personnel</div>
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '0.15rem' }}>HODs, Staff, Drivers, Hostel & Accounts</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Payroll Value ({selectedMonth})</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>₹{Number(totalPayroll).toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>{monthSalaries.length} of {staffList.length} Generated</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Disbursed Amount</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#166534', marginTop: '0.2rem' }}>₹{Number(disbursed).toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>● {monthSalaries.filter(s => s.status === 'Disbursed').length} Transfers Settled</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Disbursement</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: pending > 0 ? '#dc2626' : '#64748b', marginTop: '0.2rem' }}>₹{Number(pending).toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.72rem', color: pending > 0 ? '#dc2626' : '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>{monthSalaries.filter(s => s.status === 'Pending').length} Pending Vouchers</div>
        </div>
      </div>

      {/* ── 3. Role / Personnel Category Filter Strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'All Personnel', icon: <Users size={13} />, count: staffList.length },
          { key: 'HOD', label: 'HODs & Heads', icon: <Building size={13} />, count: staffList.filter(s => getCategoryKey(s) === 'HOD').length },
          { key: 'Staff', label: 'Faculty & Staff', icon: <GraduationCap size={13} />, count: staffList.filter(s => getCategoryKey(s) === 'Staff').length },
          { key: 'Driver', label: 'Transport Drivers', icon: <Bus size={13} />, count: staffList.filter(s => getCategoryKey(s) === 'Driver').length },
          { key: 'Hostel', label: 'Hostel Staff & Wardens', icon: <Home size={13} />, count: staffList.filter(s => getCategoryKey(s) === 'Hostel').length },
          { key: 'Accounts', label: 'Accounts & Finance', icon: <Briefcase size={13} />, count: staffList.filter(s => getCategoryKey(s) === 'Accounts').length }
        ].map(cat => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setCategoryFilter(cat.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: categoryFilter === cat.key ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
              background: categoryFilter === cat.key ? '#2563eb' : '#ffffff',
              color: categoryFilter === cat.key ? '#ffffff' : '#334155',
              transition: 'all 0.15s ease'
            }}
          >
            {cat.icon}
            <span>{cat.label}</span>
            <span style={{
              fontSize: '0.68rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
              background: categoryFilter === cat.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
              color: categoryFilter === cat.key ? '#ffffff' : '#475569'
            }}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── 4. Filters & Search Bar ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by Employee Name, Staff ID, Role, or Dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          <select 
            value={departmentFilter} 
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '0.82rem', outline: 'none' }}
          >
            <option value="ALL">All Departments & Sections</option>
            {departments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Showing <strong>{filteredStaff.length}</strong> of <strong>{staffList.length}</strong> registered personnel
        </span>
      </div>

      {/* ── 5. Master Payroll Ledger Table ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.65rem 1rem', width: '22%' }}>Employee Profile</th>
                <th style={{ padding: '0.65rem 1rem', width: '20%' }}>Designation & Dept</th>
                <th style={{ padding: '0.65rem 1rem', width: '18%' }}>Payroll Cycle</th>
                <th style={{ padding: '0.65rem 1rem', width: '15%' }}>Voucher Status</th>
                <th style={{ padding: '0.65rem 1rem', width: '12%', textAlign: 'right' }}>Net Payable</th>
                <th style={{ padding: '0.65rem 1rem', width: '13%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <div style={{ width: '24px', height: '24px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }}></div>
                    Loading employee payroll ledger...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No personnel found matching the selected filter. Click "+ Add / Custom Payroll Voucher" to create a payroll record.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff, i) => {
                  const staffId = staff.id || staff.staffId;
                  const salaryRecord = salaries.find(s => s.staffId === staffId && s.billingMonth === selectedMonth);

                  return (
                    <tr key={staff._id || i} style={{ borderBottom: '1px solid #f1f5f9', background: salaryRecord ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{staff.name || staff.staffName}</span>
                          {getCategoryBadge(staff)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>ID: {staffId}</div>
                      </td>

                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{staff.designation || staff.role || 'Staff'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{staff.department || staff.dept || 'General Administration'}</div>
                      </td>

                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#1e293b', fontWeight: 700 }}>
                          <Calendar size={13} color="#2563eb" /> {selectedMonth}
                        </div>
                      </td>

                      <td style={{ padding: '0.65rem 1rem' }}>
                        {!salaryRecord ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                            <AlertCircle size={11} /> Uncalculated
                          </span>
                        ) : salaryRecord.status === 'Disbursed' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                            <CheckCircle size={11} /> Disbursed
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                            <Clock size={11} /> Pending Pmt
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {salaryRecord ? `₹${Number(salaryRecord.netSalary || 0).toLocaleString('en-IN')}.00` : '—'}
                      </td>

                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                        {!salaryRecord ? (
                          <button 
                            onClick={() => openGenerateModal(staff)} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.75rem', borderRadius: '5px', background: '#2563eb', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #1d4ed8', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.2)' }}
                          >
                            <Plus size={13} /> Generate Payroll
                          </button>
                        ) : salaryRecord.status === 'Pending' ? (
                          <button 
                            onClick={() => handleDisburse(salaryRecord)} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.75rem', borderRadius: '5px', background: '#16a34a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #15803d', cursor: 'pointer' }}
                          >
                            <Upload size={12} /> Disburse
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {salaryRecord.paymentDate ? new Date(salaryRecord.paymentDate).toLocaleDateString('en-GB') : 'Disbursed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. REAL-TIME ENTERPRISE ERP GENERATE PAYROLL MODAL ── */}
      {showForm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflowY: 'auto'
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '10px',
              maxWidth: '860px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #cbd5e1'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa' }}>
                  <Zap size={13} /> Central HRMS & Payroll Computation Engine
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.15rem 0 0', color: '#ffffff' }}>
                  {isCustomMode ? 'Create & Issue Custom Payroll Voucher' : `Generate Monthly Salary Voucher: ${form.staffName}`}
                </h2>
              </div>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', cursor: 'pointer', borderRadius: '6px', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* Employee Specification Banner / Editable in Custom Mode */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Employee Name</label>
                    {isCustomMode ? (
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. RENU (Driver) / Warden" 
                        value={form.staffName} 
                        onChange={e => setForm({ ...form, staffName: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem 0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                      />
                    ) : (
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{form.staffName}</div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Staff / Employee ID</label>
                    {isCustomMode ? (
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. DRV003 / HST001" 
                        value={form.staffId} 
                        onChange={e => setForm({ ...form, staffId: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem 0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, outline: 'none', fontFamily: 'monospace' }}
                      />
                    ) : (
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>{form.staffId}</div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Role / Designation</label>
                    {isCustomMode ? (
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Senior Driver / Hostel Warden" 
                        value={form.designation} 
                        onChange={e => setForm({ ...form, designation: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem 0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                      />
                    ) : (
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>{form.designation}</div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Department / Branch</label>
                    {isCustomMode ? (
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Transport / Hostel" 
                        value={form.department} 
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem 0.55rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                      />
                    ) : (
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>{form.department}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pay Scale Presets Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', background: '#eff6ff', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8' }}>
                  Quick Pay Grade Preset:
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => applyPreset('HOD')} style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}>
                    HOD / Dean (₹1,02,800)
                  </button>
                  <button type="button" onClick={() => applyPreset('Professor')} style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}>
                    Professor (₹84,300)
                  </button>
                  <button type="button" onClick={() => applyPreset('AssistantProfessor')} style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}>
                    Assistant Prof (₹53,200)
                  </button>
                  <button type="button" onClick={() => applyPreset('Driver')} style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}>
                    Driver / Fleet (₹21,200)
                  </button>
                  <button type="button" onClick={() => applyPreset('Hostel')} style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}>
                    Hostel Warden (₹39,300)
                  </button>
                  <button type="button" onClick={() => applyPreset('Accounts')} style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}>
                    Accounts Officer (₹47,200)
                  </button>
                  <button type="button" onClick={() => applyPreset('Staff')} style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid #93c5fd', background: '#ffffff', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}>
                    Admin Staff (₹33,700)
                  </button>
                </div>
              </div>

              {/* Attendance & Shift Verification Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Working Days</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={form.workingDays} 
                    onChange={e => setForm({ ...form, workingDays: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Duty / Present Days</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={form.workingDays} 
                    value={form.presentDays} 
                    onChange={e => setForm({ ...form, presentDays: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Loss of Pay (LOP)</label>
                  <div style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', background: calcLopDays > 0 ? '#fee2e2' : '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: calcLopDays > 0 ? '#b91c1c' : '#334155' }}>
                    {calcLopDays} Days
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Attendance Rate</label>
                  <div style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#16a34a' }}>
                    {((calcPresent / (calcWorking || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* 2-Column Parameter Ledger (Earnings vs Deductions) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* ── EARNINGS (A) ── */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#0f172a', color: '#ffffff', padding: '0.5rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Gross Earnings (A)</span>
                    <span>₹ Amount</span>
                  </div>

                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: '#ffffff' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>Basic Pay (₹)</label>
                      <input 
                        type="number" 
                        required 
                        value={form.basicPay} 
                        onChange={e => setForm({ ...form, basicPay: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>House Rent Allowance / HRA (₹)</label>
                      <input 
                        type="number" 
                        value={form.hra} 
                        onChange={e => setForm({ ...form, hra: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>Medical Allowance (₹)</label>
                      <input 
                        type="number" 
                        value={form.medicalAllowance} 
                        onChange={e => setForm({ ...form, medicalAllowance: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>Special / Academic / Duty Allowance (₹)</label>
                      <input 
                        type="number" 
                        value={form.specialAllowance} 
                        onChange={e => setForm({ ...form, specialAllowance: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                      <span style={{ color: '#0f172a' }}>Total Gross Earnings (A):</span>
                      <span style={{ color: '#166534' }}>₹{calcTotalEarnings.toLocaleString('en-IN')}.00</span>
                    </div>
                  </div>
                </div>

                {/* ── DEDUCTIONS (B) ── */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#0f172a', color: '#ffffff', padding: '0.5rem 0.85rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Deductions & Statutory (B)</span>
                    <span>₹ Amount</span>
                  </div>

                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: '#ffffff' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>
                        LOP Attendance Deduction (Auto):
                      </label>
                      <div style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: calcAttendanceDeduction > 0 ? '#b91c1c' : '#64748b' }}>
                        ₹{calcAttendanceDeduction.toLocaleString('en-IN')}.00 {calcLopDays > 0 ? `(${calcLopDays} days absent)` : '(0 LOP)'}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>
                        PF, PT, TDS & Statutory Deductions (₹)
                      </label>
                      <input 
                        type="number" 
                        value={form.deductions} 
                        onChange={e => setForm({ ...form, deductions: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>Payment Mode</label>
                      <select 
                        value={form.paymentMode} 
                        onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                      >
                        <option value="Bank Transfer (NEFT)">Bank Transfer (NEFT)</option>
                        <option value="Direct Bank Transfer (RTGS)">Direct Bank Transfer (RTGS)</option>
                        <option value="Cheque / Draft">Cheque / Draft</option>
                        <option value="Central Cash Account">Central Cash Account</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.15rem' }}>Initial Voucher Status</label>
                      <select 
                        value={form.status} 
                        onChange={e => setForm({ ...form, status: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                      >
                        <option value="Disbursed">Disbursed (Authorized & Settled)</option>
                        <option value="Pending">Pending (Draft Review)</option>
                      </select>
                    </div>

                    <div style={{ marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                      <span style={{ color: '#0f172a' }}>Total Deductions (B):</span>
                      <span style={{ color: '#dc2626' }}>₹{calcTotalDeductions.toLocaleString('en-IN')}.00</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Real-time Net Salary Calculation Statement */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #16a34a', borderRadius: '6px', padding: '0.85rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.15rem' }}>
                    Calculated Net Disbursed Salary
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', fontStyle: 'italic' }}>
                    {numberToWords(calcNetPayable)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
                    Formula: Total Earnings (A) ₹{calcTotalEarnings.toLocaleString('en-IN')} − Deductions (B) ₹{calcTotalDeductions.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ textAlign: 'right', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.45rem 1rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>
                    Net Salary Payable
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#166534', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{calcNetPayable.toLocaleString('en-IN')}.00
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  style={{ padding: '0.55rem 1.15rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Discard / Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.35rem', borderRadius: '6px', border: '1px solid #166534', background: '#16a34a', color: '#ffffff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 4px rgba(22,101,52,0.25)' }}
                >
                  <CheckCircle size={15} />
                  {submitting ? 'Generating Voucher...' : 'Confirm & Authorize Payroll Voucher'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Salary;
