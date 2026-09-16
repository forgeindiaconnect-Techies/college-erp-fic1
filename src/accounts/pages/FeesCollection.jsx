import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckCircle2, AlertCircle, User, X, Printer, UserPlus } from 'lucide-react';
import { getStudents, createFee, createStudent, getAllFees, getStudentFeeStructure, getFeesByStudent, getDepartments } from '../../api/index';

const printReceipt = (student, receiptNo, feeType, semester, amount, paymentMode) => {
  const win = window.open('', '_blank', 'width=700,height=650');
  win.document.write(`
    <!DOCTYPE html><html><head><title>Receipt ${receiptNo}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; background:#fff; color:#111; }
      .header { text-align:center; border-bottom:3px solid #f59e0b; padding-bottom:20px; margin-bottom:24px; }
      .header h1 { margin:0; color:#f59e0b; font-size:26px; } .header p { margin:4px 0; color:#555; font-size:13px; }
      .badge { display:inline-block; background:#10b981; color:white; padding:6px 18px; border-radius:20px; font-size:13px; font-weight:700; margin:12px 0; }
      .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px dashed #e0e0e0; font-size:14px; }
      .row .label { color:#666; } .row .value { font-weight:600; }
      .amount { font-size:32px; font-weight:800; color:#10b981; text-align:center; margin:24px 0; }
      .footer { text-align:center; margin-top:36px; font-size:11px; color:#999; border-top:1px solid #eee; padding-top:16px; }
    </style></head><body>
    <div class="header"><h1>🎓 College ERP System</h1><p>Finance & Accounts Department</p><p>Official Fee Payment Receipt</p></div>
    <div class="badge">✓ RECEIPT NO: ${receiptNo}</div>
    <div class="row"><span class="label">Student Name</span><span class="value">${student.name}</span></div>
    <div class="row"><span class="label">Student ID</span><span class="value">${student.id}</span></div>
    <div class="row"><span class="label">Department</span><span class="value">${student.dept || student.department || 'N/A'}</span></div>
    <div class="row"><span class="label">Semester</span><span class="value">${semester}</span></div>
    <div class="row"><span class="label">Fee Type</span><span class="value">${feeType}</span></div>
    <div class="row"><span class="label">Payment Mode</span><span class="value">${paymentMode}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</span></div>
    <div class="amount">₹${Number(amount).toLocaleString()}</div>
    <div class="footer"><p>This is a computer-generated receipt. No signature required.</p><p>Generated on ${new Date().toLocaleString()}</p></div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 600);
};

const FeesCollection = () => {
  const [query, setQuery]               = useState('');
  const [allStudents, setAllStudents]   = useState([]);
  const [suggestions, setSuggestions]   = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [successMsg, setSuccessMsg]     = useState('');
  const [errorMsg, setErrorMsg]         = useState('');
  const [lastReceipt, setLastReceipt]   = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  const [studentPayments, setStudentPayments] = useState([]);
  const [studentScholarship, setStudentScholarship] = useState(null);

  const ALL_FEE_DEFINITIONS = [
    { label: 'All Fees (Total Bill)', key: 'allFees' },
    { label: 'Tuition Fee', key: 'tuitionFee' },
    { label: 'Admission Fee', key: 'admissionFee' },
    { label: 'University Fee', key: 'universityFee' },
    { label: 'Marksheet Verification', key: 'marksheetVerification' },
    { label: 'Special Fee', key: 'specialFee' },
    { label: 'English Lab / NSS / ID', key: 'englishLabNssId' },
    { label: 'Computer Lab Fee', key: 'computerLab' },
    { label: 'Stationary Fee', key: 'stationary' },
    { label: 'PTA Fund', key: 'pta' },
    { label: 'Exam Fee', key: 'examFee' },
    { label: 'Library Fee', key: 'libraryFee' },
    { label: 'Hostel Fee', key: 'hostelFee' },
    { label: 'Transport Fee', key: 'transportFee' },
    { label: 'Other Fee', key: 'otherFee' }
  ];

  const getDefaultFeeStructureForDept = (deptName) => {
    const dLower = String(deptName || '').toLowerCase();
    if (dLower.includes('computer') || dLower.includes('cse') || dLower.includes('tech') || dLower.includes('engineering')) {
      return {
        tuitionFee: 35000,
        admissionFee: 5000,
        universityFee: 2500,
        marksheetVerification: 500,
        specialFee: 5000,
        englishLabNssId: 2000,
        computerLab: 4000,
        stationary: 1500,
        pta: 1000,
        otherFee: 1500,
        examFee: 2500,
        libraryFee: 1000
      };
    }
    if (dLower.includes('food') || dLower.includes('nutrition') || dLower.includes('math') || dLower.includes('science')) {
      return {
        tuitionFee: 22000,
        admissionFee: 3500,
        universityFee: 2000,
        marksheetVerification: 500,
        specialFee: 3500,
        englishLabNssId: 1500,
        computerLab: 3000,
        stationary: 1000,
        pta: 1000,
        otherFee: 1000,
        examFee: 2000,
        libraryFee: 1000
      };
    }
    // Arts / History / Language / General
    return {
      tuitionFee: 15000,
      admissionFee: 2500,
      universityFee: 1500,
      marksheetVerification: 500,
      specialFee: 2000,
      englishLabNssId: 1000,
      computerLab: 1000,
      stationary: 1000,
      pta: 500,
      otherFee: 1000,
      examFee: 1500,
      libraryFee: 1000
    };
  };

  const getDiscountedAmount = (key, baseAmount, scholarship) => {
    if (!scholarship || key !== 'tuitionFee') return Number(baseAmount) || 0;
    let discount = 0;
    const numBase = Number(baseAmount) || 0;
    if (scholarship.amount === '100%') discount = numBase;
    else if (scholarship.amount === '75%') discount = numBase * 0.75;
    else if (scholarship.amount === '50%') discount = numBase * 0.50;
    else if (scholarship.amount === '25%') discount = numBase * 0.25;
    return Math.max(0, numBase - discount);
  };

  const getFeeRate = (fType) => {
    if (!feeStructure) return 0;
    if (fType === 'All Fees (Total Bill)') {
      return Number(feeStructure.allFees) || 26000;
    }
    const def = ALL_FEE_DEFINITIONS.find(f => f.label === fType);
    if (!def) return 0;
    return Number(feeStructure[def.key]) || 0;
  };

  const getFeePaid = (fType) => {
    if (fType === 'All Fees (Total Bill)') {
      return studentPayments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
    }
    return studentPayments.filter(f => f.feeType === fType).reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  };

  const getFeePending = (fType) => {
    if (!feeStructure) return 0;
    const rate = getFeeRate(fType);
    const paid = getFeePaid(fType);
    const discounted = fType === 'All Fees (Total Bill)' 
      ? Math.max(0, rate - (studentScholarship ? (studentScholarship.amount === '100%' ? (Number(feeStructure.tuitionFee) || 0) : 0) : 0))
      : getDiscountedAmount(ALL_FEE_DEFINITIONS.find(f => f.label === fType)?.key || '', rate, studentScholarship);
    return Math.max(0, discounted - paid);
  };

  const getSuggestedFeeAmount = (fType) => {
    if (!feeStructure) return 0;
    const pending = getFeePending(fType);
    if (pending > 0) return pending;
    // If pending balance is 0, show the standard fee amount so the user sees the rate
    const rate = getFeeRate(fType);
    const def = ALL_FEE_DEFINITIONS.find(f => f.label === fType);
    return def ? getDiscountedAmount(def.key, rate, studentScholarship) : rate;
  };

  // New Student Modal States
  const [showRegModal, setShowRegModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    aadhar: '',
    dob: '',
    dept: '',
    sem: 'Sem 1',
    cgpa: '',
    attendance: '',
    feeStatus: 'Pending',
    academicYear: '',
    section: '',
    admissionDate: '',
    status: 'ACTIVE',
    hostelRequired: '',
    roomNumber: '',
    hostelFeeAmount: '',
    hostelFeeStatus: '',
    hostelName: '',
    blockWing: '',
    bedNumber: '',
    wardenName: '',
    wardenContact: '',
    transportRequired: '',
    busRoute: '',
    pickupPoint: '',
    transportFeeStatus: '',
    transportFeeAmount: ''
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Payment form
  const [feeType, setFeeType]       = useState('All Fees (Total Bill)');
  const [semester, setSemester]     = useState('Sem 1');
  const [amount, setAmount]         = useState(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer (NEFT/RTGS)');
  const [refNo, setRefNo]           = useState('');

  const inputRef = useRef(null);

  const load = async () => {
    try {
      setLoadingStudents(true);
      const [studRes, feeRes, deptRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllFees().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] }))
      ]);
      const backendStudents = studRes.data || [];
      const fees = feeRes.data || [];
      const loadedDepts = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.departments || [];
      setDepartments(loadedDepts);

      // Combine with localStorage mock students to ensure full visibility
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const combinedStudents = [...backendStudents];
      erpStudents.forEach(ls => {
        if (!combinedStudents.find(cs => cs.id === ls.id || cs._id === ls.id)) {
          combinedStudents.push(ls);
        }
      });

      const updatedStudents = combinedStudents.map(s => {
        const studentFees = fees.filter(f => f.studentId === (s.id || s._id));
        let status = s.feeStatus || 'Pending';
        if (studentFees.length > 0) {
          const isPaid = studentFees.some(f => f.status === 'Paid');
          status = isPaid ? 'Paid' : 'Pending';
        }
        return { ...s, feeStatus: status };
      });
      setAllStudents(updatedStudents);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Load all students once on mount
  useEffect(() => {
    load();
  }, []);

  // Live search — filter as user types
  const handleQueryChange = (val) => {
    setQuery(val);
    setSelectedStudent(null);
    setErrorMsg('');
    if (!val.trim()) { setSuggestions([]); return; }
    const q = val.trim().toLowerCase();
    const matches = allStudents.filter(s =>
      (s.id || s._id || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.dept || s.department || '').toLowerCase().includes(q)
    ).slice(0, 6);
    setSuggestions(matches);
  };

  const selectStudent = async (s) => {
    setSelectedStudent(s);
    setQuery(s.name);
    setSuggestions([]);
    
    try {
      const [structRes, feesRes] = await Promise.all([
        getStudentFeeStructure(s.id || s._id).catch(() => ({ data: null })),
        getFeesByStudent(s.id || s._id).catch(() => ({ data: [] }))
      ]);
      
      const payments = feesRes.data || [];
      const deptDefaults = getDefaultFeeStructureForDept(s.dept || s.department);
      
      // Merge: deptDefaults < s.feeBreakdown < structRes.data
      const sFeeBreakdown = s.feeBreakdown || {};
      const serverStructure = structRes.data || {};

      const mergedStructure = {
        ...deptDefaults,
        ...sFeeBreakdown,
        ...serverStructure
      };

      // Add hostel & transport if student opted in
      if (s.hostelFeeAmount || s.hostel === 'Yes' || s.hostelRequired === 'yes' || s.dormFacility) {
        mergedStructure.hostelFee = Number(s.hostelFeeAmount) || mergedStructure.hostelFee || 40000;
      }
      if (s.transportFeeAmount || s.transport === 'Yes' || s.transportRequired === 'yes' || s.busFacility) {
        mergedStructure.transportFee = Number(s.transportFeeAmount) || mergedStructure.transportFee || 15000;
      }

      // Compute total sum of all itemized keys
      const itemizedKeys = ['tuitionFee', 'admissionFee', 'universityFee', 'marksheetVerification', 'specialFee', 'englishLabNssId', 'computerLab', 'stationary', 'pta', 'examFee', 'libraryFee', 'hostelFee', 'transportFee', 'otherFee'];
      const calculatedTotal = itemizedKeys.reduce((sum, k) => sum + (Number(mergedStructure[k]) || 0), 0);
      mergedStructure.allFees = Number(s.totalFee) || calculatedTotal || 26000;

      let foundScholarship = null;
      try {
        const savedScholars = localStorage.getItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
        if (savedScholars) {
          const scholarsList = JSON.parse(savedScholars);
          foundScholarship = scholarsList.find(sch => sch.studentId === (s.id || s._id) && sch.status === 'Active');
        }
      } catch (e) { console.error('Error parsing scholarships', e); }
      
      setStudentScholarship(foundScholarship);
      setFeeStructure(mergedStructure);
      setStudentPayments(payments);
      
      // Calculate total paid across all fees
      const totalPaidAmount = payments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
      const discountVal = foundScholarship ? (foundScholarship.amount === '100%' ? (Number(mergedStructure.tuitionFee) || 0) : (Number(mergedStructure.tuitionFee) || 0) * (parseFloat(foundScholarship.amount) / 100 || 0)) : 0;
      const netTotalFee = Math.max(0, mergedStructure.allFees - discountVal);
      const netPendingTotal = Math.max(0, netTotalFee - totalPaidAmount);

      setFeeType('All Fees (Total Bill)');
      setAmount(netPendingTotal > 0 ? netPendingTotal : netTotalFee);

      if (s.sem || s.semester) {
        const semVal = s.sem || s.semester;
        setSemester(typeof semVal === 'string' && semVal.startsWith('Sem') ? semVal : `Sem ${semVal}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setQuery('');
    setSuggestions([]);
    setStudentScholarship(null);
    setFeeStructure(null);
    setStudentPayments([]);
    setAmount(0);
    setFeeType('All Fees (Total Bill)');
    inputRef.current?.focus();
  };

  const generateRegNo = (deptName, existingCount) => {
    const deptObj = departments.find(d => 
      (d?.name && d.name.toLowerCase() === (deptName || '').toLowerCase()) ||
      (d?.code && d.code.toLowerCase() === (deptName || '').toLowerCase())
    );
    const code = deptObj?.code || (deptName ? deptName.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() : 'ST');
    const year = new Date().getFullYear();
    return `${code}${year}${String(existingCount + 1).padStart(3, '0')}`;
  };

  const handleQuickRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    
    if (!regForm.name.trim()) { setRegError('Please enter full name.'); return; }
    if (!regForm.email.trim()) { setRegError('Please enter email address.'); return; }
    
    try {
      const regId = generateRegNo(regForm.dept, allStudents.length);
      const newStudentPayload = {
        id: regId,
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        password: regForm.password.trim() || 'password123',
        phone: regForm.phone.trim() || '9999999999',
        dept: regForm.dept,
        sem: regForm.sem,
        idNumber: regForm.aadhar,
        dob: regForm.dob,
        academicYear: regForm.academicYear,
        section: regForm.section,
        batch: regForm.batch,
        admissionDate: regForm.admissionDate,
        cgpa: regForm.cgpa ? parseFloat(regForm.cgpa) : 0,
        attendance: regForm.attendance !== '' ? parseInt(regForm.attendance) : 0,
        status: regForm.status || 'Active',
        feeStatus: regForm.feeStatus || 'Pending',
        hostelRequired: regForm.hostelRequired,
        roomNumber: regForm.roomNumber,
        hostelFeeAmount: regForm.hostelFeeAmount,
        hostelFeeStatus: regForm.hostelFeeStatus,
        hostelName: regForm.hostelName,
        blockWing: regForm.blockWing,
        bedNumber: regForm.bedNumber,
        wardenName: regForm.wardenName,
        wardenContact: regForm.wardenContact,
        transportRequired: regForm.transportRequired,
        busRoute: regForm.busRoute,
        pickupPoint: regForm.pickupPoint,
        transportFeeAmount: regForm.transportFeeAmount,
        transportFeeStatus: regForm.transportFeeStatus
      };
      
      const res = await createStudent(newStudentPayload);
      if (res?.status === 201 || res?.status === 200) {
        setRegSuccess(`Successfully registered! Register ID: ${regId}`);
        // Reload student cache so they can be searched later
        await load();
        
        // Auto-select the newly registered student
        setSelectedStudent(res.data);
        setQuery(res.data.name);
        setSemester(res.data.sem || 'Sem 1');
        setAmount(26000);
        
        setTimeout(() => {
          setShowRegModal(false);
          setRegSuccess('');
          setRegForm({
            name: '', email: '', password: '', phone: '', aadhar: '', dob: '',
            dept: 'Computer Science Engineering', sem: 'Sem 1',
            cgpa: '', attendance: '', feeStatus: 'Pending',
            academicYear: '', section: '', admissionDate: '', status: 'ACTIVE',
            hostelRequired: '', roomNumber: '', hostelFeeAmount: '', hostelFeeStatus: '',
            hostelName: '', blockWing: '', bedNumber: '', wardenName: '', wardenContact: '',
            transportRequired: '', busRoute: '', pickupPoint: '', transportFeeStatus: '', transportFeeAmount: ''
          });
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setRegError('Registration failed. Check server log.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg('Please search and select a student first from the list.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const receiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
      let totalFees = Number(amount);
      if (feeStructure) {
        if (feeType === 'All Fees (Total Bill)') {
          const discountVal = studentScholarship ? (studentScholarship.amount === '100%' ? (Number(feeStructure.tuitionFee) || 0) : (Number(feeStructure.tuitionFee) || 0) * (parseFloat(studentScholarship.amount) / 100 || 0)) : 0;
          totalFees = Math.max(0, (Number(feeStructure.allFees) || Number(amount)) - discountVal);
        } else {
          const def = ALL_FEE_DEFINITIONS.find(f => f.label === feeType);
          const feeKey = def ? def.key : feeType.replace(/\s+/g, '').replace(/^\w/, c => c.toLowerCase());
          const baseTotal = Number(feeStructure[feeKey]) || Number(amount);
          totalFees = getDiscountedAmount(feeKey, baseTotal, studentScholarship);
        }
      }

      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        department: selectedStudent.dept || selectedStudent.department || 'General',
        semester,
        feeType,
        totalFees,
        paidAmount: Number(amount),
        paymentMode,
        receiptNo,
        paymentDate: new Date(),
      };
      const res = await createFee(payload);
      if (res?.status === 201 || res?.status === 200) {
        setLastReceipt({ ...payload, receiptNo });
        setSuccessMsg(`✅ Payment recorded! Receipt No: ${receiptNo}`);
        // Auto-print
        printReceipt(selectedStudent, receiptNo, feeType, semester, amount, paymentMode);
        // Refresh the student list so their feeStatus updates immediately
        await load();
        if (selectedStudent) {
          // Re-fetch to update the table immediately
          selectStudent(selectedStudent);
        }
        setTimeout(() => {
          setSuccessMsg('');
          setLastReceipt(null);
          clearStudent();
          setRefNo('');
        }, 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to record payment. Check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const step1Done = !!selectedStudent;

  return (
    <div className="animate-fade-in p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
          💳 Fees Collection
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Record student fee payments and auto-generate receipts.
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'28px', flexWrap:'wrap' }}>
        {[
          { num: 1, label: 'Search Student', done: step1Done },
          { num: 2, label: 'Fill Payment Details', done: false },
          { num: 3, label: 'Record & Print Receipt', done: !!successMsg },
        ].map((step, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', borderRadius:'999px', background: step.done ? 'rgba(16,185,129,0.12)' : 'var(--bg-secondary)', border: `1px solid ${step.done ? '#10b981' : 'var(--border-color)'}`, color: step.done ? '#10b981' : 'var(--text-muted)', fontSize:'0.85rem', fontWeight:600 }}>
            <span style={{ width:'22px', height:'22px', borderRadius:'50%', background: step.done ? '#10b981' : 'var(--border-color)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, flexShrink:0 }}>
              {step.done ? '✓' : step.num}
            </span>
            {step.label}
          </div>
        ))}
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div style={{ marginBottom:'20px', padding:'16px 20px', background:'rgba(16,185,129,0.12)', border:'1px solid #10b981', borderRadius:'12px', color:'#10b981', fontWeight:600, display:'flex', alignItems:'center', gap:'10px', fontSize:'1rem' }}>
          <CheckCircle2 size={20} /> {successMsg}
          {lastReceipt && (
            <button onClick={() => printReceipt(selectedStudent || {name:'Student',id:'N/A'}, lastReceipt.receiptNo, feeType, semester, amount, paymentMode)}
              style={{ marginLeft:'auto', background:'#10b981', color:'white', border:'none', borderRadius:'8px', padding:'6px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.85rem', fontWeight:600 }}>
              <Printer size={14} /> Reprint
            </button>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div style={{ marginBottom:'20px', padding:'14px 18px', background:'rgba(239,68,68,0.1)', border:'1px solid #ef4444', borderRadius:'12px', color:'#ef4444', fontWeight:600, display:'flex', alignItems:'center', gap:'10px' }}>
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) minmax(0, 2fr)', gap:'20px' }}>

        {/* LEFT — Student Search */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* STEP 1 — Search Box */}
          <div className="glass-card" style={{ padding:'24px', border: step1Done ? '2px solid #10b981' : '2px solid #3b82f6', position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
              <span style={{ background:'#3b82f6', color:'white', width:'24px', height:'24px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', flexShrink:0 }}>1</span>
              <h3 style={{ margin:0, fontWeight:700, color:'var(--text-main)', fontSize:'1rem' }}>Search Student</h3>
            </div>

            {/* Big visible search input */}
            <div style={{ position:'relative', marginBottom:'8px' }}>
              <Search style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} size={18} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder={loadingStudents ? "Loading students..." : "Type name or ID (e.g. john)"}
                disabled={loadingStudents}
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 40px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid #3b82f6',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 0 0 4px rgba(59,130,246,0.12)',
                }}
              />
              {query && (
                <button onClick={clearStudent} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Live Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div style={{ border:'1px solid var(--border-color)', borderRadius:'10px', overflow:'hidden', background:'var(--bg-secondary)', boxShadow:'0 8px 20px rgba(0,0,0,0.12)' }}>
                {suggestions.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    style={{
                      padding:'10px 14px',
                      cursor:'pointer',
                      borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                      display:'flex', alignItems:'center', gap:'10px',
                      transition:'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'rgba(59,130,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <User size={16} style={{ color:'#3b82f6' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight:600, color:'var(--text-main)', fontSize:'0.9rem' }}>{s.name}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{s.id} · {s.dept} · {s.sem}</div>
                    </div>
                    <span style={{ marginLeft:'auto', fontSize:'0.7rem', padding:'2px 8px', borderRadius:'20px', background: s.feeStatus === 'Paid' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: s.feeStatus === 'Paid' ? '#10b981' : '#f59e0b', fontWeight:600 }}>
                      {s.feeStatus || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {query && suggestions.length === 0 && !selectedStudent && !loadingStudents && (
              <div style={{ marginTop:'12px', textAlign:'center' }}>
                <p style={{ color:'#ef4444', fontSize:'0.85rem', margin:'0 0 8px 0', fontWeight:500 }}>No student found matching "{query}"</p>
                <button
                  type="button"
                  onClick={() => {
                    setRegForm(prev => ({ ...prev, name: query }));
                    setShowRegModal(true);
                  }}
                  style={{ display:'flex', alignItems:'center', gap:'6px', margin:'0 auto', padding:'8px 14px', background:'rgba(59,130,246,0.12)', border:'1px solid #3b82f6', color:'#3b82f6', borderRadius:'8px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}
                >
                  <UserPlus size={14} /> Register "{query}" as New Joiner
                </button>
              </div>
            )}

            {!query && !selectedStudent && (
              <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', margin:0 }}>
                  💡 Type any name or ID — results appear instantly
                </p>
                <button
                  type="button"
                  onClick={() => setShowRegModal(true)}
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', color:'var(--text-main)', borderRadius:'8px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', transition:'all 0.2s', width:'fit-content' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <UserPlus size={14} className="text-[#10b981]" /> Register New Student
                </button>
              </div>
            )}
          </div>

          {/* Student Card — shows after selection */}
          {selectedStudent ? (
            <div className="glass-card" style={{ padding:'20px', border:'2px solid #10b981' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
                <span style={{ background:'#10b981', color:'white', width:'24px', height:'24px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', flexShrink:0 }}>✓</span>
                <h3 style={{ margin:0, fontWeight:700, color:'#10b981', fontSize:'1rem' }}>Student Verified</h3>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {[
                  ['Name', selectedStudent.name],
                  ['Student ID', selectedStudent.id],
                  ['Department', selectedStudent.dept || selectedStudent.department || 'N/A'],
                  ['Course', selectedStudent.course || 'N/A'],
                  ['Year & Sem', `${selectedStudent.sem || selectedStudent.semester || 'Sem 1'} (${selectedStudent.academicYear || '2026 - 2027'})`],
                  ['Total Registered Fee', `₹${(Number(feeStructure?.allFees) || Number(selectedStudent.totalFee) || 26000).toLocaleString()}`],
                  ['Amount Paid', `₹${studentPayments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0).toLocaleString()}`],
                  ['Balance Amount', `₹${Math.max(0, (Number(feeStructure?.allFees) || Number(selectedStudent.totalFee) || 26000) - studentPayments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0)).toLocaleString()}`],
                  ['Fee Status', selectedStudent.feeStatus || (Math.max(0, (Number(feeStructure?.allFees) || Number(selectedStudent.totalFee) || 26000) - studentPayments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0)) === 0 ? 'Paid' : 'Pending')],
                ].map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', paddingBottom:'8px', borderBottom:'1px solid var(--border-color)' }}>
                    <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{label}</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: label === 'Balance Amount' ? '#dc2626' : (label === 'Amount Paid' ? '#16a34a' : (label === 'Total Registered Fee' ? '#1e40af' : (label === 'Fee Status' ? (val === 'Paid' ? '#10b981' : '#f59e0b') : 'var(--text-main)'))), 
                      fontSize:'0.9rem' 
                    }}>{val}</span>
                  </div>
                ))}
              </div>
              
              {studentScholarship && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ color: '#6366F1', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🎓 Active Scholarship
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <span>{studentScholarship.type}</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>{studentScholarship.amount} Waiver</span>
                  </div>
                </div>
              )}

              <button onClick={clearStudent} style={{ marginTop:'12px', width:'100%', padding:'8px', background:'none', border:'1px solid var(--border-color)', borderRadius:'8px', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.85rem' }}>
                ✕ Change Student
              </button>

              {feeStructure && (() => {
                const validFees = ALL_FEE_DEFINITIONS.filter(fee => fee.key !== 'allFees' && (Number(feeStructure[fee.key]) || 0) > 0);

                let grossFee = 0;
                let totalDiscount = 0;
                let totalPaid = 0;
                
                validFees.forEach(fee => {
                  const baseTotal = Number(feeStructure[fee.key]) || 0;
                  const netTotal = getDiscountedAmount(fee.key, baseTotal, studentScholarship);
                  const paid = studentPayments.filter(f => f.feeType === fee.label).reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
                  grossFee += baseTotal;
                  totalDiscount += (baseTotal - netTotal);
                  totalPaid += paid;
                });

                const netFee = grossFee - totalDiscount;
                const pendingFee = Math.max(0, netFee - totalPaid);

                return (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>Itemized Fee Status Table</h4>
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                          <tr>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Fee Type</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Gross Fee</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Discount</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Net Fee</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Paid</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validFees.map(fee => {
                            const baseTotal = Number(feeStructure[fee.key]) || 0;
                            const total = getDiscountedAmount(fee.key, baseTotal, studentScholarship);
                            const discountAmount = baseTotal - total;
                            const paid = studentPayments.filter(f => f.feeType === fee.label).reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
                            const pending = Math.max(0, total - paid);
                            const status = paid >= total && total > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
                            
                            return (
                              <tr key={fee.key} 
                                onClick={() => {
                                  setFeeType(fee.label);
                                  const suggested = getSuggestedFeeAmount(fee.label);
                                  setAmount(suggested);
                                }}
                                style={{ 
                                  cursor: 'pointer', 
                                  background: feeType === fee.label ? 'rgba(59,130,246,0.1)' : 'transparent',
                                  borderBottom: '1px solid var(--border-color)' 
                                }}>
                                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-main)' }}>{fee.label}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>₹{baseTotal.toLocaleString()}</td>
                                <td style={{ padding: '8px 10px', color: '#10b981' }}>{discountAmount > 0 ? `-₹${discountAmount.toLocaleString()}` : '—'}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--text-main)', fontWeight: 600 }}>₹{total.toLocaleString()}</td>
                                <td style={{ padding: '8px 10px', color: '#3b82f6', fontWeight: 600 }}>₹{paid.toLocaleString()}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, 
                                    background: status === 'Paid' ? 'rgba(16,185,129,0.1)' : (status === 'Partial' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'),
                                    color: status === 'Paid' ? '#10b981' : (status === 'Partial' ? '#f59e0b' : '#ef4444')
                                  }}>
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', marginBottom: '16px' }}>
                      Click any fee row to pay that specific fee, or choose "All Fees (Total Bill)" to pay the entire balance.
                    </p>

                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>Total Fee Summary</h4>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Original Gross Bill</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{(Number(feeStructure.allFees) || grossFee).toLocaleString()}</span>
                      </div>
                      
                      {totalDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Scholarship Discount</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>-₹{totalDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '10px 0' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Net Payable Fee</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{netFee.toLocaleString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Amount Paid</span>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>₹{totalPaid.toLocaleString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Net Pending Balance</span>
                        <span style={{ fontWeight: 800, color: pendingFee > 0 ? '#dc2626' : '#10b981' }}>
                          {pendingFee > 0 ? `₹${pendingFee.toLocaleString()}` : 'Fully Paid'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="glass-card" style={{ padding:'20px', opacity:0.5 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <span style={{ background:'var(--border-color)', color:'var(--text-muted)', width:'24px', height:'24px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', flexShrink:0 }}>2</span>
                <h3 style={{ margin:0, fontWeight:700, color:'var(--text-muted)', fontSize:'1rem' }}>Student Details</h3>
              </div>
              <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'20px 0' }}>
                👆 Search and click a student above to load their details here
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — Payment Form */}
        <div className="glass-card" style={{ padding:'28px', border: selectedStudent ? '2px solid #10b981' : '1px solid var(--border-color)', opacity: selectedStudent ? 1 : 0.65 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'22px', paddingBottom:'16px', borderBottom:'1px solid var(--border-color)' }}>
            <span style={{ background: selectedStudent ? '#10b981' : 'var(--border-color)', color:'white', width:'24px', height:'24px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', flexShrink:0 }}>
              {selectedStudent ? '✓' : '2'}
            </span>
            <h3 style={{ margin:0, fontWeight:700, color:'var(--text-main)', fontSize:'1.1rem' }}>Payment Details</h3>
            {!selectedStudent && <span style={{ marginLeft:'auto', color:'#f59e0b', fontSize:'0.8rem', fontWeight:600 }}>⚠ Search a student first</span>}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px', marginBottom:'18px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'6px' }}>Fee Type</label>
                <select 
                  value={feeType} 
                  onChange={e => {
                    const selectedVal = e.target.value;
                    setFeeType(selectedVal);
                    if (feeStructure) {
                      const suggested = getSuggestedFeeAmount(selectedVal);
                      setAmount(suggested);
                    }
                  }}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'0.95rem', outline:'none' }}
                >
                  {ALL_FEE_DEFINITIONS
                    .filter(fee => fee.key === 'allFees' || !feeStructure || (Number(feeStructure[fee.key]) || 0) > 0)
                    .map(fee => {
                      const feeRate = getFeeRate(fee.label);
                      return (
                        <option key={fee.key} value={fee.label}>
                          {fee.label} {feeRate > 0 ? `(₹${feeRate.toLocaleString()})` : ''}
                        </option>
                      );
                    })
                  }
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'6px' }}>Semester / Year</label>
                <select value={semester} onChange={e => setSemester(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'0.95rem', outline:'none' }}>
                  {['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:'18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)' }}>Amount (₹)</label>
                {feeStructure && selectedStudent && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Standard Rate: <strong>₹{getFeeRate(feeType).toLocaleString()}</strong>
                  </span>
                )}
              </div>
              <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                style={{ width:'100%', padding:'12px 14px', borderRadius:'8px', border:'2px solid #10b981', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'1.1rem', fontWeight:700, outline:'none', boxSizing:'border-box' }} />
              {feeStructure && selectedStudent && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>
                    Rate: <strong style={{ color: 'var(--text-main)' }}>₹{getFeeRate(feeType).toLocaleString()}</strong>
                  </span>
                  <span>
                    Paid: <strong style={{ color: '#16a34a' }}>₹{getFeePaid(feeType).toLocaleString()}</strong>
                  </span>
                  <span>
                    Pending: <strong style={{ color: getFeePending(feeType) > 0 ? '#dc2626' : '#16a34a' }}>
                      {getFeePending(feeType) > 0 ? `₹${getFeePending(feeType).toLocaleString()}` : '✓ Fully Paid'}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px', marginBottom:'18px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'6px' }}>Payment Method</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'0.95rem', outline:'none' }}>
                  <option>Bank Transfer (NEFT/RTGS)</option>
                  <option>UPI</option>
                  <option>Credit/Debit Card</option>
                  <option>Cash</option>
                  <option>Demand Draft</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'6px' }}>Transaction Ref No.</label>
                <input type="text" value={refNo} onChange={e => setRefNo(e.target.value)}
                  placeholder="Txn ID / DD No (optional)"
                  style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'0.95rem', outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>

            {/* Summary box */}
            {selectedStudent && (
              <div style={{ padding:'16px', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'10px', marginBottom:'20px' }}>
                <div style={{ fontWeight:700, color:'var(--text-main)', marginBottom:'8px', fontSize:'0.9rem' }}>📋 Payment Summary</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', fontSize:'0.85rem', color:'var(--text-muted)' }}>
                  <span>Student:</span><span style={{ fontWeight:600, color:'var(--text-main)' }}>{selectedStudent.name}</span>
                  <span>Type:</span><span style={{ fontWeight:600, color:'var(--text-main)' }}>{feeType} — {semester}</span>
                  <span>Amount:</span><span style={{ fontWeight:800, color:'#10b981', fontSize:'1rem' }}>₹{Number(amount).toLocaleString()}</span>
                  <span>Mode:</span><span style={{ fontWeight:600, color:'var(--text-main)' }}>{paymentMode}</span>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
              <button type="button" onClick={clearStudent}
                style={{ padding:'11px 22px', borderRadius:'9px', border:'1px solid var(--border-color)', background:'none', color:'var(--text-main)', fontWeight:600, cursor:'pointer', fontSize:'0.95rem' }}>
                Cancel
              </button>
              <button type="submit" disabled={!selectedStudent || submitting}
                style={{ padding:'11px 28px', borderRadius:'9px', border:'none', background: selectedStudent ? 'linear-gradient(to right, #10b981, #059669)' : 'var(--border-color)', color: selectedStudent ? 'white' : 'var(--text-muted)', fontWeight:700, cursor: selectedStudent ? 'pointer' : 'not-allowed', fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'8px', transition:'all 0.2s' }}>
                {submitting ? '⏳ Processing...' : <><FileText size={17} /> Record Payment & Print Receipt</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* COMPREHENSIVE ADD NEW STUDENT MODAL */}
      {showRegModal && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}>
          <div className="glass-card" style={{ width:'800px', maxHeight:'90vh', overflowY:'auto', background:'var(--bg-primary)', padding:'0', position:'relative', animation:'fadeIn 0.2s ease-out', borderRadius:'12px', display:'flex', flexDirection:'column' }}>
            
            <div style={{ position:'sticky', top:0, background:'var(--bg-primary)', zIndex:10, padding:'24px 32px', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <h2 style={{ margin:0, fontWeight:700, color:'var(--text-main)', fontSize:'1.4rem' }}>Add New Student</h2>
                <p style={{ margin:'4px 0 0 0', fontSize:'0.9rem', color:'var(--text-muted)' }}>Fill in the details to register a new student.</p>
              </div>
              <button onClick={() => setShowRegModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding:'0 32px 32px 32px' }}>
              {regError && (
                <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid #ef4444', borderRadius:'8px', color:'#ef4444', fontSize:'0.9rem', fontWeight:600, margin:'20px 0 0 0' }}>
                  {regError}
                </div>
              )}
              
              {regSuccess && (
                <div style={{ padding:'12px 16px', background:'rgba(16,185,129,0.12)', border:'1px solid #10b981', borderRadius:'8px', color:'#10b981', fontSize:'0.9rem', fontWeight:600, margin:'20px 0 0 0' }}>
                  {regSuccess}
                </div>
              )}

              <form onSubmit={handleQuickRegister} style={{ display:'flex', flexDirection:'column', gap:'32px', marginTop:'24px' }}>
                
                {/* Personal Information */}
                <div>
                  <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)', borderBottom:'1px solid var(--border-color)', paddingBottom:'12px', marginBottom:'20px' }}>Personal Information</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        <User size={13}/> STUDENT NAME <span style={{color:'#ef4444'}}>*</span>
                      </label>
                      <input type="text" required placeholder="e.g. John Doe" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        # REGISTER NUMBER
                      </label>
                      <input type="text" disabled placeholder="Auto-generated on save"
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'rgba(0,0,0,0.02)', color:'var(--text-muted)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem', cursor:'not-allowed' }} />
                      <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', margin:'6px 0 0 0', fontStyle:'italic' }}>Generated from Department + Year + Sequence</p>
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        ✉ EMAIL ADDRESS <span style={{color:'#ef4444'}}>*</span>
                      </label>
                      <input type="email" required placeholder="student@college.edu" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        🔑 LOGIN PASSWORD <span style={{color:'#ef4444'}}>*</span>
                      </label>
                      <input type="text" required placeholder="e.g. securePass123" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        📞 PHONE NUMBER
                      </label>
                      <input type="text" placeholder="10-digit mobile number" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        AADHAR/ID NUMBER
                      </label>
                      <input type="text" placeholder="ID Number" value={regForm.aadhar} onChange={e => setRegForm({...regForm, aadhar: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        DATE OF BIRTH
                      </label>
                      <input type="date" value={regForm.dob} onChange={e => setRegForm({...regForm, dob: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div>
                  <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)', borderBottom:'1px solid var(--border-color)', paddingBottom:'12px', marginBottom:'20px' }}>Academic Information</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        📖 DEPARTMENT <span style={{color:'#ef4444'}}>*</span>
                      </label>
                      <select required value={regForm.dept} onChange={e => setRegForm({...regForm, dept: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }}>
                        <option value="">— Select Department —</option>
                        {departments.map((d, i) => {
                          const dName = d?.name || d?.departmentName || d;
                          return (
                            <option key={d?.id || d?._id || i} value={dName}>
                              {dName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        SEMESTER
                      </label>
                      <select value={regForm.sem} onChange={e => setRegForm({...regForm, sem: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }}>
                        <option value="">— Select Semester —</option>
                        <option value="Sem 1">Sem 1</option><option value="Sem 2">Sem 2</option>
                        <option value="Sem 3">Sem 3</option><option value="Sem 4">Sem 4</option>
                        <option value="Sem 5">Sem 5</option><option value="Sem 6">Sem 6</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        # CGPA
                      </label>
                      <input type="text" placeholder="0.0 - 10.0" value={regForm.cgpa} onChange={e => setRegForm({...regForm, cgpa: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        % ATTENDANCE %
                      </label>
                      <input type="text" placeholder="0 - 100" value={regForm.attendance} onChange={e => setRegForm({...regForm, attendance: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        $ FEE STATUS
                      </label>
                      <select value={regForm.feeStatus} onChange={e => setRegForm({...regForm, feeStatus: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }}>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        ACADEMIC YEAR
                      </label>
                      <input type="text" placeholder="e.g. 2023-2027" value={regForm.academicYear} onChange={e => setRegForm({...regForm, academicYear: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        SECTION
                      </label>
                      <input type="text" placeholder="e.g. A" value={regForm.section} onChange={e => setRegForm({...regForm, section: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        BATCH
                      </label>
                      <input type="text" disabled placeholder="Auto-generated"
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'rgba(0,0,0,0.02)', color:'var(--text-muted)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem', cursor:'not-allowed' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        ADMISSION DATE
                      </label>
                      <input type="date" value={regForm.admissionDate} onChange={e => setRegForm({...regForm, admissionDate: e.target.value})}
                        style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                    </div>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        ✓ STUDENT STATUS
                      </label>
                      <div style={{ display:'flex', borderRadius:'6px', overflow:'hidden', border:'1px solid var(--border-color)' }}>
                        <div 
                          onClick={() => setRegForm({...regForm, status: 'ACTIVE'})}
                          style={{ flex:1, padding:'12px', textAlign:'center', background: regForm.status === 'ACTIVE' ? 'rgba(79,70,229,0.1)' : 'transparent', color: regForm.status === 'ACTIVE' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: regForm.status === 'ACTIVE' ? 700 : 600, borderRight:'1px solid var(--border-color)', cursor:'pointer', fontSize:'0.9rem' }}>ACTIVE</div>
                        <div 
                          onClick={() => setRegForm({...regForm, status: 'INACTIVE'})}
                          style={{ flex:1, padding:'12px', textAlign:'center', background: regForm.status === 'INACTIVE' ? 'rgba(79,70,229,0.1)' : 'transparent', color: regForm.status === 'INACTIVE' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: regForm.status === 'INACTIVE' ? 700 : 600, cursor:'pointer', fontSize:'0.9rem' }}>INACTIVE</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transport & Hostel */}
                <div>
                  <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)', borderBottom:'1px solid var(--border-color)', paddingBottom:'12px', marginBottom:'20px' }}>Transport & Hostel</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        HOSTEL REQUIRED? <span style={{color:'#ef4444'}}>*</span>
                      </label>
                      <select value={regForm.hostelRequired} onChange={e => setRegForm({...regForm, hostelRequired: e.target.value})} style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }}>
                        <option value="">— Select —</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    {regForm.hostelRequired === 'yes' && (
                      <>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            HOSTEL NAME
                          </label>
                          <input type="text" placeholder="e.g. Boys Hostel A" value={regForm.hostelName} onChange={e => setRegForm({...regForm, hostelName: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            BLOCK / WING
                          </label>
                          <input type="text" placeholder="e.g. North Wing" value={regForm.blockWing} onChange={e => setRegForm({...regForm, blockWing: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            ROOM NUMBER
                          </label>
                          <input type="text" placeholder="Enter Room Number" value={regForm.roomNumber} onChange={e => setRegForm({...regForm, roomNumber: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            BED NUMBER
                          </label>
                          <input type="text" placeholder="e.g. 2" value={regForm.bedNumber} onChange={e => setRegForm({...regForm, bedNumber: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            WARDEN NAME
                          </label>
                          <input type="text" placeholder="e.g. Mr. Kumar" value={regForm.wardenName} onChange={e => setRegForm({...regForm, wardenName: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            WARDEN CONTACT
                          </label>
                          <input type="text" placeholder="Warden Phone" value={regForm.wardenContact} onChange={e => setRegForm({...regForm, wardenContact: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            HOSTEL FEE AMOUNT (₹) <span style={{color:'#ef4444'}}>*</span>
                          </label>
                          <input type="number" placeholder="e.g. 25000" value={regForm.hostelFeeAmount} onChange={e => setRegForm({...regForm, hostelFeeAmount: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            HOSTEL FEE STATUS <span style={{color:'#ef4444'}}>*</span>
                          </label>
                          <select value={regForm.hostelFeeStatus} onChange={e => setRegForm({...regForm, hostelFeeStatus: e.target.value})} style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }}>
                            <option value="">— Select —</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                      </>
                    )}
                    <div>
                      <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        TRANSPORT REQUIRED? <span style={{color:'#ef4444'}}>*</span>
                      </label>
                      <select value={regForm.transportRequired} onChange={e => setRegForm({...regForm, transportRequired: e.target.value})} style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }}>
                        <option value="">— Select —</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    {regForm.transportRequired === 'yes' && (
                      <>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            BUS ROUTE <span style={{color:'#ef4444'}}>*</span>
                          </label>
                          <input type="text" placeholder="e.g. Route 4" value={regForm.busRoute} onChange={e => setRegForm({...regForm, busRoute: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            PICKUP POINT
                          </label>
                          <input type="text" placeholder="e.g. City Center" value={regForm.pickupPoint} onChange={e => setRegForm({...regForm, pickupPoint: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            TRANSPORT FEE AMOUNT (₹) <span style={{color:'#ef4444'}}>*</span>
                          </label>
                          <input type="number" placeholder="e.g. 15000" value={regForm.transportFeeAmount} onChange={e => setRegForm({...regForm, transportFeeAmount: e.target.value})}
                            style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }} />
                        </div>
                        <div>
                          <label style={{ display:'flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                            TRANSPORT FEE STATUS <span style={{color:'#ef4444'}}>*</span>
                          </label>
                          <select value={regForm.transportFeeStatus} onChange={e => setRegForm({...regForm, transportFeeStatus: e.target.value})} style={{ width:'100%', padding:'12px 14px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', fontSize:'0.95rem' }}>
                            <option value="">— Select —</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end', marginTop:'16px', borderTop:'1px solid var(--border-color)', paddingTop:'24px' }}>
                  <button type="button" onClick={() => setShowRegModal(false)}
                    style={{ padding:'12px 24px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-primary)', color:'var(--text-main)', fontWeight:600, cursor:'pointer', fontSize:'0.95rem' }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ padding:'12px 32px', borderRadius:'8px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, cursor:'pointer', fontSize:'0.95rem', boxShadow:'0 4px 12px rgba(79,70,229,0.3)' }}>
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesCollection;
