import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckCircle2, AlertCircle, User, X, Printer, UserPlus } from 'lucide-react';
import { getStudents, createFee, createStudent, getAllFees, getStudentFeeStructure, getFeesByStudent } from '../../api/index';

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

  const getDiscountedAmount = (key, baseAmount, scholarship) => {
    if (!scholarship || key !== 'tuitionFee') return baseAmount;
    let discount = 0;
    if (scholarship.amount === '100%') discount = baseAmount;
    else if (scholarship.amount === '75%') discount = baseAmount * 0.75;
    else if (scholarship.amount === '50%') discount = baseAmount * 0.50;
    else if (scholarship.amount === '25%') discount = baseAmount * 0.25;
    return Math.max(0, baseAmount - discount);
  };

  // New Student Modal States
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    aadhar: '',
    dob: '',
    dept: 'Computer Science Engineering',
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
  const [feeType, setFeeType]       = useState('Tuition Fee');
  const [semester, setSemester]     = useState('Sem 6');
  const [amount, setAmount]         = useState(45000);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer (NEFT/RTGS)');
  const [refNo, setRefNo]           = useState('');

  const inputRef = useRef(null);

  const load = async () => {
    try {
      setLoadingStudents(true);
      const [studRes, feeRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllFees().catch(() => ({ data: [] }))
      ]);
      const backendStudents = studRes.data || [];
      const fees = feeRes.data || [];

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
      
      const structure = structRes.data || {
        tuitionFee: 60000,
        examFee: 2500,
        libraryFee: 1000,
        hostelFee: 40000,
        transportFee: 15000
      };
      
      let foundScholarship = null;
      try {
        const savedScholars = localStorage.getItem(`erp_scholarships_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
        if (savedScholars) {
          const scholarsList = JSON.parse(savedScholars);
          foundScholarship = scholarsList.find(sch => sch.studentId === (s.id || s._id) && sch.status === 'Active');
        }
      } catch (e) { console.error('Error parsing scholarships', e); }
      
      setStudentScholarship(foundScholarship);
      setFeeStructure(structure);
      setStudentPayments(feesRes.data || []);
      
      setFeeType('Tuition Fee');
      
      // Calculate pending amount for Tuition Fee
      const effectiveTuition = getDiscountedAmount('tuitionFee', structure.tuitionFee, foundScholarship);
      const paid = (feesRes.data || []).filter(f => f.feeType === 'Tuition Fee').reduce((acc, curr) => acc + curr.paidAmount, 0);
      const pending = effectiveTuition - paid;
      setAmount(pending > 0 ? pending : 0);

      if (s.sem) setSemester(s.sem);
    } catch (err) {
      console.error(err);
    }
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setQuery('');
    setSuggestions([]);
    setStudentScholarship(null);
    inputRef.current?.focus();
  };

  const generateRegNo = (deptName, existingCount) => {
    const codes = {
      'Computer Science': 'CS',
      'Electrical Engg.': 'EE',
      'Mechanical Engg.': 'ME',
      'Civil Engg.': 'CE',
      'Information Tech.': 'IT',
    };
    const code = codes[deptName] || 'ST';
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
        setAmount(45000); // Set default tuition fee amount
        
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
      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        department: selectedStudent.dept || selectedStudent.department || 'Computer Science',
        semester,
        feeType,
        totalFees: feeStructure ? getDiscountedAmount(feeType.replace(' ', '').replace(/^\w/, c => c.toLowerCase()), feeStructure[feeType.replace(' ', '').replace(/^\w/, c => c.toLowerCase())], studentScholarship) : Number(amount),
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
                  ['Department', selectedStudent.dept || selectedStudent.department],
                  ['Current Sem', selectedStudent.sem || 'N/A'],
                  ['CGPA', selectedStudent.cgpa || 'N/A'],
                  ['Fee Status', selectedStudent.feeStatus || 'N/A'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifycontent:'space-between', paddingBottom:'8px', borderBottom:'1px solid var(--border-color)', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{label}</span>
                    <span style={{ fontWeight:600, color: label === 'Fee Status' ? (val === 'Paid' ? '#10b981' : '#f59e0b') : 'var(--text-main)', fontSize:'0.9rem' }}>{val}</span>
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
                const validFees = [
                  { label: 'Tuition Fee', key: 'tuitionFee' },
                  { label: 'Exam Fee', key: 'examFee' },
                  { label: 'Library Fee', key: 'libraryFee' },
                  { label: 'Hostel Fee', key: 'hostelFee' },
                  { label: 'Transport Fee', key: 'transportFee' }
                ].filter(fee => (feeStructure[fee.key] || 0) > 0);

                let grossFee = 0;
                let totalDiscount = 0;
                let totalPaid = 0;
                
                validFees.forEach(fee => {
                  const baseTotal = feeStructure[fee.key] || 0;
                  const netTotal = getDiscountedAmount(fee.key, baseTotal, studentScholarship);
                  const paid = studentPayments.filter(f => f.feeType === fee.label).reduce((acc, curr) => acc + curr.paidAmount, 0);
                  grossFee += baseTotal;
                  totalDiscount += (baseTotal - netTotal);
                  totalPaid += paid;
                });

                const netFee = grossFee - totalDiscount;
                const pendingFee = netFee - totalPaid;

                return (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>Fee Status Table</h4>
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
                            const baseTotal = feeStructure[fee.key] || 0;
                            const total = getDiscountedAmount(fee.key, baseTotal, studentScholarship);
                            const discountAmount = baseTotal - total;
                            const paid = studentPayments.filter(f => f.feeType === fee.label).reduce((acc, curr) => acc + curr.paidAmount, 0);
                            const pending = total - paid;
                            const status = paid >= total && total > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
                            
                            return (
                              <tr key={fee.key} 
                                onClick={() => {
                                  setFeeType(fee.label);
                                  setAmount(pending > 0 ? pending : 0);
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
                      Click a row to load the pending amount into the form.
                    </p>

                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>Total Fee Summary</h4>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Original Gross Fee</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{grossFee.toLocaleString()}</span>
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
                        <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>₹{totalPaid.toLocaleString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Pending Amount</span>
                        <span style={{ fontWeight: 800, color: pendingFee > 0 ? '#f59e0b' : '#10b981' }}>
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
                <select value={feeType} onChange={e => {
                  setFeeType(e.target.value);
                  if (feeStructure) {
                    const key = e.target.value === 'Tuition Fee' ? 'tuitionFee' : 
                                e.target.value === 'Exam Fee' ? 'examFee' : 
                                e.target.value === 'Library Fee' ? 'libraryFee' : 
                                e.target.value === 'Hostel Fee' ? 'hostelFee' : 
                                e.target.value === 'Transport Fee' ? 'transportFee' : '';
                    if (key) {
                      const effectiveTotal = getDiscountedAmount(key, feeStructure[key], studentScholarship);
                      const paid = studentPayments.filter(f => f.feeType === e.target.value).reduce((acc, curr) => acc + curr.paidAmount, 0);
                      const pending = effectiveTotal - paid;
                      setAmount(pending > 0 ? pending : 0);
                    }
                  }
                }}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'0.95rem', outline:'none' }}>
                  {[
                    { label: 'Tuition Fee', key: 'tuitionFee' },
                    { label: 'Exam Fee', key: 'examFee' },
                    { label: 'Library Fee', key: 'libraryFee' },
                    { label: 'Hostel Fee', key: 'hostelFee' },
                    { label: 'Transport Fee', key: 'transportFee' }
                  ].filter(fee => !feeStructure || feeStructure[fee.key] > 0).map(fee => (
                    <option key={fee.key} value={fee.label}>{fee.label}</option>
                  ))}
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
              <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'6px' }}>Amount (₹)</label>
              <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                style={{ width:'100%', padding:'12px 14px', borderRadius:'8px', border:'2px solid #10b981', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'1.1rem', fontWeight:700, outline:'none', boxSizing:'border-box' }} />
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
                        <option value="Computer Science Engineering">Computer Science Engineering</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                        <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                        <option value="Artificial Intelligence & Machine Learning">Artificial Intelligence & Machine Learning</option>
                        <option value="Cyber Security">Cyber Security</option>
                        <option value="Biomedical Engineering">Biomedical Engineering</option>
                        <option value="Aeronautical Engineering">Aeronautical Engineering</option>
                        <option value="Automobile Engineering">Automobile Engineering</option>
                        <option value="Robotics Engineering">Robotics Engineering</option>
                        <option value="Chemical Engineering">Chemical Engineering</option>
                        <option value="Biotechnology Engineering">Biotechnology Engineering</option>
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
