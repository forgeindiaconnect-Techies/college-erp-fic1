import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, CheckCircle2, AlertCircle, User, X, Printer, UserPlus, Edit, Trash2, Users, IndianRupee, Filter, RotateCcw, Calendar, Download, BarChart3, FileSpreadsheet, Layers, History } from 'lucide-react';
import { getStudents, updateStudent, recordAdmissionPayment, updateAdmissionPayment, deleteAdmissionPayment, createFee, updateFee, deleteFee, createStudent, getAllFees, getStudentFeeStructure, getFeesByStudent, getDepartments, getCourses, getFeeCollectionRecords, getPaymentHistory, createPayment } from '../../api/index';
import FeeReceipt from '../../components/FeeReceipt';

// Step 56: Comprehensive Print Receipt with Quota and Discount Breakdown
const printReceipt = (record, receiptNoOrPayment, feeTypeArg, semesterArg, amountArg, paymentModeArg) => {
  const isPaymentObj = typeof receiptNoOrPayment === 'object' && receiptNoOrPayment !== null;
  const payment = isPaymentObj ? receiptNoOrPayment : {};

  const normalFee = Number(record?.normalFee ?? record?.totalFee ?? 0);
  const discountAmount = Number(record?.discountAmount ?? 0);
  const finalFee = Number(record?.finalFee ?? record?.totalFee ?? normalFee);
  const quotaName = record?.quotaName || record?.quota || "General Quota";
  const totalPaid = Number(record?.paidAmount ?? record?.paid ?? record?.amountPaid ?? 0);
  const remainingFee = Number(record?.remainingFee ?? Math.max(finalFee - totalPaid, 0));

  const currentPaymentAmount = Number(
    payment?.amount ??
    payment?.paidAmount ??
    (!isPaymentObj ? amountArg : 0) ??
    record?.paymentAmount ??
    record?.amountPaid ??
    0
  );

  const receiptNo =
    (!isPaymentObj ? receiptNoOrPayment : null) ||
    payment?.receiptNumber ||
    payment?.receiptNo ||
    record?.receiptNumber ||
    record?.receiptNo ||
    `REC-${Date.now()}`;

  const payDate = payment?.paymentDate
    ? new Date(payment.paymentDate).toLocaleDateString('en-IN')
    : (record?.paymentDate ? new Date(record.paymentDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));

  const studentName = record?.studentName || record?.name || 'Student';
  const admissionNumber = record?.admissionNumber || record?.admissionNo || record?.id || 'N/A';
  const departmentName = record?.department?.name || record?.department || record?.courseName || record?.course?.name || record?.course || record?.dept || 'General';
  const paymentMode = (!isPaymentObj ? paymentModeArg : null) || payment?.paymentMethod || payment?.paymentMode || record?.paymentMode || 'Cash';
  const paymentStatus = record?.paymentStatus || (remainingFee === 0 && finalFee > 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending');

  const win = window.open('', '_blank', 'width=800,height=750');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt ${receiptNo}</title>
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
          <div><strong>Student Name:</strong><span>${studentName}</span></div>
          <div><strong>Admission Number:</strong><span>${admissionNumber}</span></div>
          <div><strong>Department:</strong><span>${departmentName}</span></div>
          <div><strong>Quota:</strong><span>${quotaName}</span></div>
        </div>
        <table class="receipt-fee-table">
          <tbody>
            <tr><td>Normal Department Fee</td><td>₹${Number(normalFee).toLocaleString('en-IN')}</td></tr>
            <tr><td>Quota / Scholarship</td><td>${quotaName}</td></tr>
            <tr class="discount-row"><td>Quota Discount</td><td>${discountAmount > 0 ? `- ₹${Number(discountAmount).toLocaleString('en-IN')}` : '₹0'}</td></tr>
            <tr class="final-fee-row"><td>Final Payable Fee</td><td>₹${Number(finalFee).toLocaleString('en-IN')}</td></tr>
            ${currentPaymentAmount > 0 ? `<tr class="current-payment-row"><td>Amount Paid in This Transaction</td><td>₹${Number(currentPaymentAmount).toLocaleString('en-IN')}</td></tr>` : ''}
            <tr><td>Total Paid Amount</td><td>₹${Number(totalPaid).toLocaleString('en-IN')}</td></tr>
            <tr class="balance-row"><td>Remaining Balance</td><td>₹${Number(remainingFee).toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>
        <div class="receipt-status">
          <strong>Payment Status:</strong>
          <span>${paymentStatus}</span>
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
  setTimeout(() => win.print(), 600);
};

// Step 55.4: Currency Formatting Function
const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const FeesCollection = () => {
  const [query, setQuery]               = useState('');
  const [allStudents, setAllStudents]   = useState([]);
  const [admissions, setAdmissions]     = useState([]);
  const [feeStudents, setFeeStudents]   = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
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
  const [editingPayment, setEditingPayment] = useState(null);

  // Step 20 & Step 30: Search and Filter States
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('All');
  const [courseFilter, setCourseFilter]     = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [courses, setCourses]               = useState([]);

  // Step 42.1 & Step 44: Add Pagination State
  const [currentPage, setCurrentPage]       = useState(1);
  const [recordsPerPage]                    = useState(10);

  // Step 21: Fee Payment Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Step 31: Record Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "Cash",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  // Step 33 & 57: Payment History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAdmission, setHistoryAdmission] = useState(null);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Step 34: Edit Payment Modal States
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: "",
    paymentMethod: "Cash",
    paymentDate: "",
  });

  // Step 35.1 & 39.1: Payment Receipt State
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Step 41.1: Student Fee Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFeeStudent, setSelectedFeeStudent] = useState(null);

  // Step 46.1 & Step 46.9: Add Confirmation & Saving Payment States
  const [confirmation, setConfirmation] = useState({
    open: false,
    title: "",
    message: "",
    action: null,
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Step 46.2: Create Open Confirmation Function
  const openConfirmation = ({
    title,
    message,
    action,
  }) => {
    setConfirmation({
      open: true,
      title,
      message,
      action,
    });
  };

  // Step 46.3: Create Close Confirmation Function
  const closeConfirmation = () => {
    setConfirmation({
      open: false,
      title: "",
      message: "",
      action: null,
    });
  };

  // Step 46.4: Create Confirm Action Function
  const handleConfirmAction = async () => {
    if (!confirmation.action) {
      closeConfirmation();
      return;
    }

    try {
      await confirmation.action();
    } catch (err) {
      console.error("Confirmation action error:", err);
    } finally {
      closeConfirmation();
    }
  };



  // Step 37.1: Create Report State
  const [activeTab, setActiveTab]                   = useState('collection'); // 'collection' | 'report'
  const [allPaymentsList, setAllPaymentsList]       = useState([]);
  const [reportFilters, setReportFilters]           = useState({
    startDate: "",
    endDate: "",
    course: "All",
    paymentMethod: "All",
    paymentStatus: "All",
  });
  const [reportSearch, setReportSearch]             = useState('');

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
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo]           = useState('');

  const inputRef = useRef(null);

  // Step 44.1 & Step 45.2: Update Frontend API Request with Error Handling
  const fetchFeeStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const courseParam = selectedCourse || (courseFilter !== 'All' ? courseFilter : "");
      const paymentStatusParam = selectedPaymentStatus || selectedStatus || (statusFilter !== 'All' ? statusFilter : "");

      const params = {
        page: currentPage,
        limit: recordsPerPage,
        search: searchTerm || "",
        course: courseParam,
        paymentStatus: paymentStatusParam,
      };

      const res = await getFeeCollectionRecords(params);
      const data = res?.data || {};

      const records = data.records || [];
      const total = data.totalRecords !== undefined ? data.totalRecords : records.length;

      setFeeStudents(records);
      setAdmissions(records);
      setTotalRecords(total);
    } catch (err) {
      console.error("Fee collection fetch error:", err);
      setError(
        err?.response?.data?.message || err?.message || "Unable to load fee collection records"
      );
      setFeeStudents([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
      setLoadingStudents(false);
    }
  };

  // 30.1 Fetch Admission Records & handle fallback values
  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      setLoadingStudents(true);
      const [studRes, feeRes, deptRes, courseRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllFees().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getCourses().catch(() => ({ data: [] }))
      ]);
      const backendStudents = Array.isArray(studRes.data) ? studRes.data : (studRes.data?.students || []);
      const fees = Array.isArray(feeRes.data) ? feeRes.data : [];
      const loadedDepts = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.departments || [];
      setDepartments(loadedDepts);

      const loadedCourses = Array.isArray(courseRes.data) ? courseRes.data : courseRes.data?.courses || [];
      setCourses(loadedCourses);
      setAllPaymentsList(fees);

      // Combine with localStorage mock students to ensure full visibility
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const combinedStudents = [...backendStudents];
      erpStudents.forEach(ls => {
        if (!combinedStudents.find(cs => cs.id === ls.id || cs._id === ls.id)) {
          combinedStudents.push(ls);
        }
      });

      const updatedAdmissions = combinedStudents.map(admission => {
        const studentFees = fees.filter(f => f.studentId === (admission.id || admission._id));
        const feePaymentsSum = studentFees.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

        // 30.3 Handle Missing Fee Values
        const totalFee = Number(admission.totalFee || admission.totalAmount || 0);
        const paidAmount = Number(admission.paidAmount !== undefined ? admission.paidAmount : (admission.amountPaid !== undefined ? admission.amountPaid : feePaymentsSum));
        const remainingFee = admission.remainingFee ?? (admission.balanceFee !== undefined ? Number(admission.balanceFee) : Math.max(0, totalFee - paidAmount));

        let paymentStatus = admission.paymentStatus;
        if (!paymentStatus) {
          if (remainingFee === 0 && totalFee > 0) {
            paymentStatus = "Paid";
          } else if (paidAmount > 0) {
            paymentStatus = "Partial";
          } else {
            paymentStatus = "Pending";
          }
        }

        return {
          ...admission,
          studentName: admission.studentName || admission.name || [admission.firstName, admission.lastName].filter(Boolean).join(' ') || 'Student',
          admissionNumber: admission.admissionNumber || admission.id || admission.admissionNo || 'N/A',
          course: admission.course || admission.courseName || admission.dept || admission.department || 'General',
          totalFee,
          paidAmount,
          remainingFee,
          paymentStatus,
          feeStatus: paymentStatus
        };
      });

      setAllStudents(updatedAdmissions);

      // Also trigger paginated fee students query
      await fetchFeeStudents();
    } catch (error) {
      console.error('Failed to fetch admissions:', error);
    } finally {
      setLoading(false);
      setLoadingStudents(false);
    }
  };

  const load = fetchAdmissions;

  // Load all admission records on component mount
  useEffect(() => {
    fetchAdmissions();
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

  const clearStudent = () => {
    setSelectedStudent(null);
    setEditingPayment(null);
    setQuery('');
    setSuggestions([]);
    setStudentScholarship(null);
    setFeeStructure(null);
    setStudentPayments([]);
    setAmount(0);
    setFeeType('All Fees (Total Bill)');
    inputRef.current?.focus();
  };

  // Step 31: Open the Payment Modal
  const handleRecordPayment = (admission) => {
    setSelectedAdmission(admission);
    selectStudent(admission);

    setPaymentForm({
      amount: "",
      paymentMethod: "Cash",
      paymentDate: new Date().toISOString().split("T")[0],
    });

    setShowPaymentModal(true);
  };

  // Step 31: Close the Payment Modal
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAdmission(null);
  };

  // Step 33 & 57: Open Payment History
  const handleViewPaymentHistory = async (admission) => {
    setHistoryAdmission(admission);
    setShowHistoryModal(true);
    setIsHistoryLoading(true);

    try {
      const studentId = admission.id || admission._id || admission.admissionNumber;
      
      // Step 57.10: Fetch Payment History from /api/payments/history/:admissionId
      const res = await getPaymentHistory(studentId).catch(() => null);
      
      if (res?.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setHistoryPayments(res.data.data);
        if (res.data.admission) {
          setHistoryAdmission(prev => ({ ...prev, ...res.data.admission }));
        }
        setIsHistoryLoading(false);
        return;
      }

      // Secondary fallback to getFeesByStudent or embedded payment history
      const studentFeesRes = await getFeesByStudent(studentId).catch(() => ({ data: [] }));
      const backendFees = Array.isArray(studentFeesRes.data) ? studentFeesRes.data.map((f, idx) => ({
        _id: f._id || `fee-${idx}`,
        receiptNumber: f.receiptNo || `REC-${idx + 1}`,
        amount: Number(f.paidAmount || f.amount || 0),
        paymentMode: f.paymentMode || f.paymentMethod || "Cash",
        transactionReference: f.transactionRef || f.transactionReference || "-",
        paymentDate: f.paymentDate || f.createdAt || new Date(),
        collectedBy: { name: f.collectedByName || "Accounts Staff" }
      })) : [];

      const embeddedHistory = (admission.paymentHistory || []).map((p, idx) => ({
        _id: p._id || `hist-${idx}`,
        receiptNumber: p.receiptNumber || p.receiptNo || admission.receiptNumber || `REC-HIST-${idx + 1}`,
        amount: Number(p.amount || p.paidAmount || 0),
        paymentMode: p.paymentMethod || p.paymentMode || 'Cash',
        transactionReference: p.transactionReference || p.transactionRef || '-',
        paymentDate: p.paymentDate || admission.createdAt || new Date(),
        collectedBy: { name: p.collectedByName || "Accounts Staff" }
      }));

      // Combine backend recorded fee invoices and embedded payment history
      const combined = [...backendFees];
      embeddedHistory.forEach(eh => {
        if (!combined.some(b => (b.receiptNumber && b.receiptNumber === eh.receiptNumber) || (b.amount === eh.amount && new Date(b.paymentDate).toDateString() === new Date(eh.paymentDate).toDateString()))) {
          combined.push(eh);
        }
      });

      // Fallback: If no payment items exist yet but admission.paidAmount > 0
      if (combined.length === 0 && Number(admission.paidAmount || 0) > 0) {
        combined.push({
          _id: 'initial-fee',
          receiptNumber: admission.receiptNumber || 'REC-INITIAL',
          amount: Number(admission.paidAmount),
          paymentMode: admission.paymentMode || 'Cash',
          transactionReference: admission.transactionRef || '-',
          paymentDate: admission.paymentDate || admission.createdAt || new Date(),
          collectedBy: { name: "Accounts Staff" }
        });
      }

      setHistoryPayments(combined);
    } catch (err) {
      console.error("Failed to fetch payment history:", err);
      setHistoryPayments(admission.paymentHistory || []);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Step 33: Close the History Modal
  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryAdmission(null);
    setHistoryPayments([]);
    setIsHistoryLoading(false);
  };

  // Step 39.2: Create the Receipt Handler
  const handleViewReceipt = (payment) => {
    setSelectedPayment({
      ...payment,
      studentName: historyAdmission?.studentName || historyAdmission?.name || payment.studentName || "Student",
      courseName: historyAdmission?.course?.name || historyAdmission?.course?.courseName || historyAdmission?.course || historyAdmission?.dept || payment.courseName || "General",
      totalFee: Number(historyAdmission?.totalFee || payment.totalFee || 0),
      paidAmount: Number(historyAdmission?.paidAmount || payment.paidAmount || 0),
      remainingFee: Number(
        historyAdmission?.remainingFee !== undefined
          ? historyAdmission.remainingFee
          : Math.max(0, Number(historyAdmission?.totalFee || 0) - Number(historyAdmission?.paidAmount || 0))
      ),
      paymentMethod: payment.paymentMethod || payment.paymentMode || "Cash",
      amount: Number(payment.amount || payment.paidAmount || 0),
      receiptNumber: payment.receiptNumber || payment.receiptNo || "N/A",
      paymentDate: payment.paymentDate || new Date()
    });
    setShowReceiptModal(true);
  };

  const closeReceiptModal = () => {
    setSelectedPayment(null);
    setShowReceiptModal(false);
  };

  // Step 41.2: Create View Details Handler
  const handleViewFeeDetails = (admission) => {
    setSelectedFeeStudent(admission);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedFeeStudent(null);
    setShowDetailsModal(false);
  };

  // Step 34.3: Open the Edit Payment Modal
  const handleEditPayment = (admission, payment) => {
    setHistoryAdmission(admission);
    setSelectedPayment(payment);

    setEditPaymentForm({
      amount: payment.amount || payment.paidAmount || "",
      paymentMethod: payment.paymentMethod || payment.paymentMode || "Cash",
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });

    setShowEditPaymentModal(true);
  };

  // Step 34.5, 34.6 & 34.7: Validate, Recalculate & Send Update Request
  const handleUpdatePayment = async () => {
    const updatedAmount = Number(editPaymentForm.amount);

    if (!updatedAmount || updatedAmount <= 0 || isNaN(updatedAmount)) {
      alert("Enter a valid payment amount");
      return;
    }

    if (!selectedPayment || !historyAdmission) {
      return;
    }

    const admissionId = historyAdmission.id || historyAdmission._id || historyAdmission.admissionNumber;
    const paymentId = selectedPayment._id || selectedPayment.id || selectedPayment.receiptNo;

    try {
      setSubmitting(true);
      await updateAdmissionPayment(admissionId, paymentId, {
        amount: updatedAmount,
        paymentMethod: editPaymentForm.paymentMethod,
        paymentDate: editPaymentForm.paymentDate,
      });

      alert("Payment updated successfully");
      setShowEditPaymentModal(false);
      setSelectedPayment(null);

      await fetchAdmissions();

      // Refresh active history modal data
      if (historyAdmission) {
        await handleViewPaymentHistory(historyAdmission);
      }
    } catch (error) {
      console.error("Update payment error:", error);
      alert("Failed to update payment");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 46: Add Confirmation Before Updating Payment
  const handleUpdatePaymentConfirmation = () => {
    const updatedAmount = Number(editPaymentForm.amount);

    if (!updatedAmount || updatedAmount <= 0 || isNaN(updatedAmount)) {
      alert("Enter a valid payment amount");
      return;
    }

    if (!selectedPayment || !historyAdmission) {
      return;
    }

    openConfirmation({
      title: "Update Payment",
      message: `Are you sure you want to update this payment amount to ₹${updatedAmount.toLocaleString('en-IN')}?`,
      action: handleUpdatePayment,
    });
  };

  // Step 34.8 & Step 46.5: Delete Payment with Confirmation Modal
  const handleDeletePayment = (admission, payment) => {
    const admissionId = admission.id || admission._id || admission.admissionNumber;
    const paymentId = payment._id || payment.id || payment.receiptNo;
    const paymentAmount = Number(payment.amount || payment.paidAmount || 0);

    openConfirmation({
      title: "Delete Payment",
      message: `Are you sure you want to delete this payment of ₹${paymentAmount.toLocaleString('en-IN')}? This action cannot be undone.`,
      action: async () => {
        try {
          setSubmitting(true);
          await deleteAdmissionPayment(admissionId, paymentId);

          alert("Payment deleted successfully");
          await fetchAdmissions();

          // Refresh active history modal data
          if (historyAdmission) {
            await handleViewPaymentHistory(historyAdmission);
          }
        } catch (error) {
          console.error("Delete payment error:", error);
          alert("Failed to delete payment");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  // Step 31 & Step 46.9: Validate and Save Payment with Prevention of Multiple Submissions
  const handleSubmitPayment = async () => {
    if (savingPayment) return;
    if (!selectedAdmission) return;

    const amount = Number(paymentForm.amount);
    const totalFee = Number(selectedAdmission.totalFee || 0);
    const oldPaidAmount = Number(selectedAdmission.paidAmount || 0);
    const remainingFee = Number(
      selectedAdmission.remainingFee !== undefined
        ? selectedAdmission.remainingFee
        : Math.max(0, totalFee - oldPaidAmount)
    );

    // 31.5 Validation
    if (!amount || amount <= 0 || isNaN(amount)) {
      alert("Please enter a valid payment amount");
      return;
    }

    if (amount > remainingFee) {
      alert("Payment cannot exceed the remaining balance");
      return;
    }

    try {
      setSavingPayment(true);
      setSubmitting(true);

      // 31.6 Calculate Updated Fee Values
      const updatedPaidAmount = oldPaidAmount + amount;
      const updatedRemainingFee = Math.max(0, totalFee - updatedPaidAmount);

      let paymentStatus = "Pending";
      if (updatedRemainingFee <= 0) {
        paymentStatus = "Paid";
      } else if (updatedPaidAmount > 0) {
        paymentStatus = "Partial";
      }

      const receiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

      // 31.7 Prepare the Payment Payload
      const studentId = selectedAdmission.id || selectedAdmission._id || selectedAdmission.admissionNumber;
      const studentName = selectedAdmission.studentName || selectedAdmission.name;
      const courseName = selectedAdmission.course?.name || selectedAdmission.course?.courseName || selectedAdmission.course || selectedAdmission.dept || selectedAdmission.department || 'General';

      const paymentData = {
        studentId: studentId,
        studentName: studentName,
        department: courseName,
        semester: selectedAdmission.semester || selectedAdmission.sem || 'Sem 1',
        feeType: 'Tuition Fee / Course Fee',
        totalFees: totalFee,
        paidAmount: amount,
        amount: amount,
        paymentMode: paymentForm.paymentMethod,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate) : new Date(),
        receiptNo: receiptNo,
        admissionId: selectedAdmission._id || selectedAdmission.id,
        remainingFee: updatedRemainingFee,
        paymentStatus: paymentStatus
      };

      // Step 32: Send the Payment to Backend API (/api/admissions/:id/payment)
      const targetId = selectedAdmission._id || selectedAdmission.id;
      let apiSuccess = false;

      if (targetId) {
        try {
          const res = await recordAdmissionPayment(targetId, {
            amount,
            paymentMethod: paymentForm.paymentMethod,
            paymentDate: paymentForm.paymentDate
          });
          if (res?.status === 200 || res?.data) {
            apiSuccess = true;
          }
        } catch (apiErr) {
          console.warn("recordAdmissionPayment primary API note:", apiErr.message);
        }
      }

      const updateData = {
        totalFee: totalFee,
        paidAmount: updatedPaidAmount,
        amountPaid: updatedPaidAmount,
        remainingFee: updatedRemainingFee,
        balanceFee: updatedRemainingFee,
        paymentStatus: paymentStatus,
        feeStatus: paymentStatus,
        paymentDate: paymentForm.paymentDate,
        paymentMode: paymentForm.paymentMethod
      };

      if (!apiSuccess) {
        await createFee(paymentData).catch((err) => {
          console.warn("createFee fallback:", err);
        });

        if (targetId) {
          await updateStudent(targetId, updateData).catch((err) => {
            console.warn("updateStudent fallback:", err);
          });
        }
      }

      // Sync local storage if present
      try {
        const storageKey = `erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
        const localStudents = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedLocal = localStudents.map((st) => {
          if (st.id === studentId || st._id === studentId) {
            return { ...st, ...updateData };
          }
          return st;
        });
        localStorage.setItem(storageKey, JSON.stringify(updatedLocal));
      } catch (e) {
        console.error("Local storage sync error:", e);
      }

      alert("Payment saved successfully");

      closePaymentModal();
      await fetchAdmissions();

      handlePrintPaymentReceipt(
        {
          ...selectedAdmission,
          totalFee,
          paidAmount: updatedPaidAmount,
          remainingFee: updatedRemainingFee,
          studentName,
          name: studentName,
          course: courseName
        },
        {
          receiptNumber: receiptNo,
          receiptNo,
          amount,
          paidAmount: amount,
          paymentMode: paymentForm.paymentMethod,
          paymentMethod: paymentForm.paymentMethod,
          feeType: 'Tuition Fee / Course Fee',
          paymentDate: paymentForm.paymentDate,
          semester: selectedAdmission.semester || selectedAdmission.sem || 'Sem 1'
        }
      );
    } catch (error) {
      console.error("Payment save error:", error);
      alert(error.message || "Failed to save payment");
    } finally {
      setSavingPayment(false);
      setSubmitting(false);
    }
  };

  const handleSavePayment = handleSubmitPayment;

  // Step 46.8: Add Confirmation Before Recording Payment
  const handlePaymentConfirmation = () => {
    const amount = Number(paymentForm.amount);

    if (!amount || amount <= 0 || isNaN(amount)) {
      alert("Please enter a valid payment amount");
      return;
    }

    const totalFee = Number(selectedAdmission?.totalFee || 0);
    const oldPaidAmount = Number(selectedAdmission?.paidAmount || 0);
    const remainingFee = Number(
      selectedAdmission?.remainingFee !== undefined
        ? selectedAdmission.remainingFee
        : Math.max(0, totalFee - oldPaidAmount)
    );

    if (amount > remainingFee) {
      alert("Payment cannot exceed the remaining balance");
      return;
    }

    openConfirmation({
      title: "Confirm Payment",
      message: `Record a payment of ₹${amount.toLocaleString('en-IN')} for ${selectedAdmission?.studentName || selectedAdmission?.name || 'this student'}?`,
      action: handleSubmitPayment,
    });
  };

  const handleEditDeskPayment = (student, payment) => {
    selectStudent(student);
    setEditingPayment(payment);
    setAmount(payment.paidAmount || payment.amount || 0);
    setFeeType(payment.feeType || 'Tuition Fee');
    setSemester(payment.semester || 'Sem 1');
    setPaymentMode(payment.paymentMode || 'Cash');
    setRefNo(payment.transactionRef || payment.receiptNo || '');
    if (payment.paymentDate) {
      setPaymentDate(new Date(payment.paymentDate).toISOString().split('T')[0]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDeskPayment = async (student, payment) => {
    const payId = payment._id || payment.id;
    if (!payId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete this payment record of ₹${Number(payment.paidAmount || 0).toLocaleString('en-IN')} (Receipt: ${payment.receiptNo})?\n\nThis will automatically recalculate the student's paid amount and outstanding balance.`
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      await deleteFee(payId);
      setSuccessMsg(`✅ Payment record ${payment.receiptNo || ''} deleted successfully. Balance recalculated.`);
      
      // Reload student directory & active student fee breakdown
      await load();
      if (selectedStudent) {
        await selectStudent(selectedStudent);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Delete payment error:', err);
      setErrorMsg('Failed to delete payment record. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  // Step 21: Generate Payment Receipt Handler
  const handleGenerateReceipt = (student, payment) => {
    if (!student) return;
    const sTotal = Number(student.totalFee || student.totalAmount || 0);
    const sPaid = Number(student.amountPaid || student.paidAmount || 0);
    const sRemaining = Math.max(0, student.balanceFee !== undefined ? Number(student.balanceFee) : sTotal - sPaid);

    const payDate = payment?.paymentDate 
      ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : (payment?.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));

    const receiptData = {
      receiptNo: payment?.receiptNo || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      studentName: student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Student',
      studentId: student.id || student.admissionNo || 'N/A',
      course: student.course || student.courseName || student.dept || student.department || 'General',
      semester: payment?.semester || student.semester || student.sem || 'Sem 1',
      paymentDate: payDate,
      amount: Number(payment?.paidAmount || payment?.amount || amount || 0),
      paymentMethod: payment?.paymentMode || payment?.paymentMethod || paymentMode || 'Cash',
      feeType: payment?.feeType || feeType || 'Tuition Fee',
      totalFee: sTotal,
      paidAmount: sPaid,
      remainingFee: sRemaining,
    };

    setSelectedReceipt(receiptData);
  };

  // Step 35.2: Create the Receipt Function
  const handlePrintPaymentReceipt = (
    admission,
    payment
  ) => {
    if (!admission || !payment) return;
    const totalFee = Number(admission.totalFee || admission.totalAmount || 0);
    const paidAmount = Number(admission.paidAmount || admission.amountPaid || 0);
    const remainingFee = Number(
      admission.remainingFee !== undefined
        ? admission.remainingFee
        : Math.max(0, totalFee - paidAmount)
    );

    setReceiptData({
      receiptNumber:
        payment.receiptNumber ||
        payment.receiptNo ||
        `REC-${Date.now()}`,

      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toLocaleDateString()
        : new Date().toLocaleDateString(),

      studentName:
        admission.studentName ||
        admission.name ||
        [admission.firstName, admission.lastName].filter(Boolean).join(" ") ||
        "Student",

      admissionNumber:
        admission.admissionNumber ||
        admission.admissionNo ||
        admission.id ||
        admission.rollNo ||
        "N/A",

      course:
        admission.course?.name ||
        admission.course?.courseName ||
        admission.course ||
        admission.dept ||
        admission.department ||
        "N/A",

      paymentMethod: payment.paymentMethod || payment.paymentMode || "Cash",
      amount: payment.amount || payment.paidAmount || 0,

      totalFee,
      paidAmount,
      remainingFee,

      paymentStatus:
        admission.paymentStatus ||
        admission.feeStatus ||
        (remainingFee === 0 && totalFee > 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending"),
    });

    setShowReceipt(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg('Please search and select a student first from the list.');
      return;
    }

    const payAmt = Number(amount);
    if (payAmt <= 0) {
      setErrorMsg('Enter a valid payment amount.');
      alert('Enter a valid payment amount.');
      return;
    }

    const pendingFee = getFeePending(feeType);
    if (!editingPayment && pendingFee > 0 && payAmt > pendingFee) {
      setErrorMsg(`Payment amount cannot exceed the remaining fee of ₹${pendingFee.toLocaleString('en-IN')}.`);
      alert(`Payment amount cannot exceed the remaining fee of ₹${pendingFee.toLocaleString('en-IN')}.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const receiptNo = editingPayment?.receiptNo || `REC-${Math.floor(100000 + Math.random() * 900000)}`;
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
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        transactionRef: refNo || ''
      };

      if (editingPayment) {
        const payId = editingPayment._id || editingPayment.id;
        const res = await updateFee(payId, payload);
        if (res?.status === 200 || res?.status === 201 || res?.data) {
          setSuccessMsg(`✅ Payment record updated successfully! (Receipt No: ${receiptNo})`);
          setEditingPayment(null);
          await load();
          if (selectedStudent) {
            await selectStudent(selectedStudent);
          }
          handleGenerateReceipt(selectedStudent, { ...payload, receiptNo, paidAmount: Number(amount) });
          setTimeout(() => {
            setSuccessMsg('');
            setRefNo('');
          }, 3500);
        }
      } else {
        const res = await createFee(payload);
        if (res?.status === 201 || res?.status === 200) {
          setLastReceipt({ ...payload, receiptNo });
          setSuccessMsg(`✅ Payment recorded! Receipt No: ${receiptNo}`);
          
          // Generate interactive receipt modal
          handleGenerateReceipt(selectedStudent, { ...payload, receiptNo, paidAmount: Number(amount) });

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
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process payment. Check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 36.3: Create a Reusable Status Function
  const getPaymentStatus = (
    totalFee,
    paidAmount
  ) => {
    const total = Number(totalFee || 0);
    const paid = Number(paidAmount || 0);
    const remaining = Math.max(total - paid, 0);

    if (remaining === 0 && total > 0) {
      return "Paid";
    }

    if (paid > 0 && remaining > 0) {
      return "Partial";
    }

    return "Pending";
  };

  // Step 36.4: Add Status Badge Styling helper
  const getStatusClass = (status) => {
    switch (status) {
      case "Paid":
        return "status-paid";

      case "Partial":
        return "status-partial";

      default:
        return "status-pending";
    }
  };

  // Step 36.1: Calculate Dashboard Summary
  const totalStudents = admissions.length;

  const totalFeeAmount = admissions.reduce(
    (sum, admission) =>
      sum + Number(admission.totalFee || 0),
    0
  );

  const totalCollectedAmount = admissions.reduce(
    (sum, admission) =>
      sum + Number(admission.paidAmount || 0),
    0
  );

  const totalPendingAmount = admissions.reduce(
    (sum, admission) =>
      sum +
      Number(
        admission.remainingFee !== undefined
          ? admission.remainingFee
          : Math.max(0, Number(admission.totalFee || 0) - Number(admission.paidAmount || 0))
      ),
    0
  );

  const totalFees = totalFeeAmount;
  const totalPaid = totalCollectedAmount;
  const totalPending = totalPendingAmount;

  const fullyPaidStudents = admissions.filter(
    (admission) =>
      (admission.paymentStatus || getPaymentStatus(admission.totalFee, admission.paidAmount)) === "Paid"
  ).length;

  const partiallyPaidStudents = admissions.filter(
    (admission) =>
      (admission.paymentStatus || getPaymentStatus(admission.totalFee, admission.paidAmount)) === "Partial"
  ).length;

  const pendingStudents = admissions.filter(
    (admission) =>
      (admission.paymentStatus || getPaymentStatus(admission.totalFee, admission.paidAmount)) === "Pending"
  ).length;

  const summaryMetrics = useMemo(() => {
    return {
      totalStudents,
      totalFees: totalFeeAmount,
      totalPaid: totalCollectedAmount,
      totalPending: totalPendingAmount,
      fullyPaidStudents
    };
  }, [admissions, totalStudents, totalFeeAmount, totalCollectedAmount, totalPendingAmount, fullyPaidStudents]);

  // Step 20 & 30: Course list and Filtered Admissions calculations
  const courseOptions = useMemo(() => {
    const map = new Map();
    courses.forEach(c => {
      const name = c.courseName || c.name;
      const id = c._id || c.id || name;
      if (name) map.set(name, { id, name });
    });
    admissions.forEach(admission => {
      const name = admission.course?.name || admission.course?.courseName || admission.course || admission.courseName || admission.dept || admission.department;
      if (name && !map.has(name)) {
        map.set(name, { id: name, name });
      }
    });
    return Array.from(map.values());
  }, [courses, admissions]);

  // 30.4, 30.5, 30.6 Apply Search, Status, and Course Filters
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((admission) => {
      const admissionCourseId =
        admission.course?._id || admission.course?.id || admission.course?.name || admission.course?.courseName || admission.course;

      const studentName = admission.studentName || admission.name || [admission.firstName, admission.lastName].filter(Boolean).join(' ') || '';
      const admissionNo = admission.admissionNumber || admission.id || admission.admissionNo || '';

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        studentName.toLowerCase().includes(q) ||
        admissionNo.toLowerCase().includes(q);

      const totalFee = Number(admission.totalFee || 0);
      const paidAmount = Number(admission.paidAmount || 0);
      const remainingFee = admission.remainingFee ?? Math.max(0, totalFee - paidAmount);

      const currentStatus =
        admission.paymentStatus ||
        (remainingFee === 0 && totalFee > 0 ? "Paid" : (paidAmount > 0 ? "Partial" : "Pending"));

      const activeStatusFilter = statusFilter !== 'All' ? statusFilter : (selectedStatus || 'All');
      const matchesStatus =
        activeStatusFilter === "All" ||
        activeStatusFilter === "" ||
        currentStatus.toLowerCase() === activeStatusFilter.toLowerCase();

      const activeCourseFilter = courseFilter !== 'All' ? courseFilter : (selectedCourse || 'All');
      const matchesCourse =
        activeCourseFilter === "All" ||
        activeCourseFilter === "" ||
        admissionCourseId === activeCourseFilter ||
        String(admission.course || '').toLowerCase() === String(activeCourseFilter).toLowerCase() ||
        String(admission.courseName || '').toLowerCase() === String(activeCourseFilter).toLowerCase() ||
        String(admission.dept || '').toLowerCase() === String(activeCourseFilter).toLowerCase();

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [admissions, searchTerm, statusFilter, selectedStatus, courseFilter, selectedCourse]);

  const filteredStudents = filteredAdmissions;

  // Step 44.2: Total Pages Calculation
  const totalPages = Math.ceil(
    totalRecords / recordsPerPage
  );

  // Step 44.3: Fetch Data When Filters Change
  useEffect(() => {
    fetchFeeStudents();
  }, [
    currentPage,
    recordsPerPage,
    searchTerm,
    selectedCourse,
    courseFilter,
    selectedPaymentStatus,
    selectedStatus,
    statusFilter,
  ]);

  // Step 44.7: Reset Page After Search or Filter Changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCourse,
    courseFilter,
    selectedPaymentStatus,
    selectedStatus,
    statusFilter,
    recordsPerPage,
  ]);

  // Step 37.3: Flatten Payment History for Reporting
  const reportPayments = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Flatten from admissions.paymentHistory
    admissions.forEach((admission) => {
      const totalFee = Number(admission.totalFee || 0);
      const paidAmount = Number(admission.paidAmount || 0);
      const remainingFee = Number(
        admission.remainingFee !== undefined
          ? admission.remainingFee
          : Math.max(0, totalFee - paidAmount)
      );
      const paymentStatus = admission.paymentStatus || getPaymentStatus(totalFee, paidAmount);

      (admission.paymentHistory || []).forEach((payment, idx) => {
        const key = payment._id || payment.id || `${admission._id || admission.id}-${idx}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            ...payment,
            _id: key,
            admissionId: admission._id || admission.id,
            studentName: admission.studentName || admission.name || "Student",
            admissionNumber: admission.admissionNumber || admission.admissionNo || admission.id || "—",
            course:
              admission.course?._id ||
              admission.course?.id ||
              admission.course?.name ||
              admission.course?.courseName ||
              admission.course ||
              "General",
            courseName:
              admission.course?.name ||
              admission.course?.courseName ||
              admission.course ||
              admission.dept ||
              admission.department ||
              "General",
            totalFee,
            paidAmount,
            remainingFee,
            paymentStatus,
            amount: Number(payment.amount || payment.paidAmount || 0),
            paymentMethod: payment.paymentMethod || payment.paymentMode || "Cash",
            receiptNumber: payment.receiptNumber || payment.receiptNo || `REC-${idx + 1}`,
            paymentDate: payment.paymentDate || new Date(),
          });
        }
      });
    });

    // 2. Also combine backend recorded Fee collection records
    allPaymentsList.forEach((p) => {
      const key = p._id || p.id || (p.receiptNo ? `rec-${p.receiptNo}` : `fee-${Math.random()}`);
      if (!seen.has(key)) {
        seen.add(key);
        const s = admissions.find((st) => (st.id && st.id === p.studentId) || (st._id && st._id === p.studentId));
        list.push({
          _id: key,
          admissionId: s?._id || s?.id || p.studentId,
          studentName: p.studentName || s?.studentName || s?.name || "Student",
          admissionNumber: s?.admissionNumber || s?.admissionNo || s?.id || p.studentId || "—",
          course: s?.course?._id || s?.course?.id || p.department || "General",
          courseName: p.department || s?.course?.name || s?.course?.courseName || s?.course || "General",
          totalFee: Number(s?.totalFee || p.totalFees || p.amount || 0),
          paidAmount: Number(s?.paidAmount || p.paidAmount || p.amount || 0),
          remainingFee: Number(s?.remainingFee ?? 0),
          paymentStatus: s?.paymentStatus || "Paid",
          amount: Number(p.paidAmount || p.amount || 0),
          paymentMethod: p.paymentMode || p.paymentMethod || "Cash",
          receiptNumber: p.receiptNo || "—",
          paymentDate: p.paymentDate || p.createdAt || new Date(),
        });
      }
    });

    return list.sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));
  }, [admissions, allPaymentsList]);

  // Step 37.4: Filter the Payment Records
  const filteredReportPayments = useMemo(() => {
    return reportPayments.filter((payment) => {
      const paymentDate = new Date(payment.paymentDate);

      const matchesStartDate =
        !reportFilters.startDate ||
        paymentDate >= new Date(`${reportFilters.startDate}T00:00:00`);

      const matchesEndDate =
        !reportFilters.endDate ||
        paymentDate <= new Date(`${reportFilters.endDate}T23:59:59`);

      const matchesCourse =
        reportFilters.course === "All" ||
        reportFilters.course === "" ||
        payment.course === reportFilters.course ||
        payment.courseName === reportFilters.course ||
        (payment.course?._id && payment.course._id === reportFilters.course);

      const matchesMethod =
        reportFilters.paymentMethod === "All" ||
        reportFilters.paymentMethod === "" ||
        payment.paymentMethod === reportFilters.paymentMethod;

      const matchesStatus =
        reportFilters.paymentStatus === "All" ||
        reportFilters.paymentStatus === "" ||
        payment.paymentStatus === reportFilters.paymentStatus;

      const q = reportSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (payment.studentName && payment.studentName.toLowerCase().includes(q)) ||
        (payment.admissionNumber && String(payment.admissionNumber).toLowerCase().includes(q)) ||
        (payment.receiptNumber && payment.receiptNumber.toLowerCase().includes(q));

      return (
        matchesStartDate &&
        matchesEndDate &&
        matchesCourse &&
        matchesMethod &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [reportPayments, reportFilters, reportSearch]);

  // Step 37.5: Calculate Report Totals
  const reportTotalCollected = useMemo(() => {
    return filteredReportPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
  }, [filteredReportPayments]);

  const reportPaymentCount = filteredReportPayments.length;

  // Step 37.7: Add Clear Filters Button function
  const clearReportFilters = () => {
    setReportFilters({
      startDate: "",
      endDate: "",
      course: "All",
      paymentMethod: "All",
      paymentStatus: "All",
    });
    setReportSearch("");
  };

  // Step 38.1: Add Export CSV Function
  const exportReportToCSV = () => {
    if (filteredReportPayments.length === 0) {
      alert("No payment records available to export");
      return;
    }

    const headers = [
      "Student Name",
      "Admission ID",
      "Course",
      "Payment Amount",
      "Payment Method",
      "Payment Date",
      "Total Fee",
      "Paid Amount",
      "Remaining Fee",
      "Payment Status",
    ];

    const rows = filteredReportPayments.map((payment) => [
      payment.studentName || "",
      payment.admissionNumber || payment.admissionId || payment.studentId || "",
      payment.courseName || "",
      payment.amount || 0,
      payment.paymentMethod || "",
      payment.paymentDate
        ? new Date(payment.paymentDate).toLocaleDateString()
        : "",
      payment.totalFee || 0,
      payment.paidAmount || 0,
      payment.remainingFee || 0,
      payment.paymentStatus || "",
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `fee-collection-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const handleExportCSV = exportReportToCSV;

  // Step 38.3: Add Print Function
  const handlePrintReport = () => {
    window.print();
  };

  const step1Done = !!selectedStudent;

  return (
    <div className="animate-fade-in p-6">
      {/* Header with Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
            💳 Fees Collection & Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            Record student fee payments, track pending balances, and generate audit reports.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('collection')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'collection' ? '#3b82f6' : 'transparent',
              color: activeTab === 'collection' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <IndianRupee size={16} /> Fee Collection Desk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'report' ? '#3b82f6' : 'transparent',
              color: activeTab === 'report' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <BarChart3 size={16} /> Fee Collection Report
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: FEE COLLECTION DESK & STUDENT LEDGER                             */}
      {/* ========================================================================= */}
      {activeTab === 'collection' && (
        <>
          {/* 30.7 Summary Cards */}
          <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '26px' }}>
            {/* Total Students */}
            <div className="summary-card glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Students</h4>
                <p style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalStudents}</p>
              </div>
            </div>

            {/* Total Fees */}
            <div className="summary-card glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #6366f1' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Fees</h4>
                <p style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 800, color: '#6366f1' }}>₹{totalFees.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Total Paid */}
            <div className="summary-card glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #10b981' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Paid</h4>
                <p style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 800, color: '#10b981' }}>₹{totalPaid.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Total Pending */}
            <div className="summary-card glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pending</h4>
                <p style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 800, color: '#ef4444' }}>₹{totalPending.toLocaleString('en-IN')}</p>
              </div>
            </div>
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

                    {/* Student Payment Transaction History Ledger */}
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                          📜 Payment Transaction History ({studentPayments.length})
                        </h4>
                      </div>

                      {studentPayments.length === 0 ? (
                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          No previous payments recorded for this student yet.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                              <tr>
                                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Receipt No</th>
                                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Fee Type</th>
                                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Amount</th>
                                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Method</th>
                                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentPayments.map((p, idx) => {
                                const pDate = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
                                return (
                                  <tr key={p._id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '8px 10px', color: 'var(--text-main)', fontWeight: 600 }}>{pDate}</td>
                                    <td style={{ padding: '8px 10px', color: '#3b82f6', fontWeight: 600 }}>{p.receiptNo || `REC-${idx + 1}`}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{p.feeType || 'Tuition Fee'}</td>
                                    <td style={{ padding: '8px 10px', color: '#16a34a', fontWeight: 700 }}>₹{Number(p.paidAmount || 0).toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--text-main)' }}>{p.paymentMode || 'Cash'}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                        {p.status || 'Paid'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleGenerateReceipt(selectedStudent, p)}
                                          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                          title="Generate Receipt"
                                        >
                                          <FileText size={12} /> Generate Receipt
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleEditDeskPayment(selectedStudent, p)}
                                          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                          title="Edit Payment"
                                        >
                                          <Edit size={12} /> Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDeskPayment(selectedStudent, p)}
                                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                          title="Delete Payment"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
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
        <div className="glass-card" style={{ padding:'28px', border: editingPayment ? '2px solid #3b82f6' : (selectedStudent ? '2px solid #10b981' : '1px solid var(--border-color)'), opacity: selectedStudent ? 1 : 0.65 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'22px', paddingBottom:'16px', borderBottom:'1px solid var(--border-color)' }}>
            <span style={{ background: editingPayment ? '#3b82f6' : (selectedStudent ? '#10b981' : 'var(--border-color)'), color:'white', width:'24px', height:'24px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', flexShrink:0 }}>
              {editingPayment ? '✏️' : (selectedStudent ? '✓' : '2')}
            </span>
            <h3 style={{ margin:0, fontWeight:700, color:'var(--text-main)', fontSize:'1.1rem' }}>
              {editingPayment ? `Edit Payment Voucher (${editingPayment.receiptNo || 'Voucher'})` : 'Payment Details'}
            </h3>
            {editingPayment && (
              <button
                type="button"
                onClick={() => {
                  setEditingPayment(null);
                  if (selectedStudent) selectStudent(selectedStudent);
                }}
                style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel Edit
              </button>
            )}
            {!selectedStudent && !editingPayment && <span style={{ marginLeft:'auto', color:'#f59e0b', fontSize:'0.8rem', fontWeight:600 }}>⚠ Search a student first</span>}
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

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px', marginBottom:'18px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'6px' }}>Payment Method</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'0.95rem', outline:'none' }}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Credit/Debit Card">Credit/Debit Card</option>
                  <option value="Demand Draft">Demand Draft</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'6px' }}>Payment Date</label>
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-main)', fontSize:'0.95rem', outline:'none', boxSizing:'border-box' }} />
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
                style={{ padding:'11px 28px', borderRadius:'9px', border:'none', background: selectedStudent ? (editingPayment ? 'linear-gradient(to right, #3b82f6, #1d4ed8)' : 'linear-gradient(to right, #10b981, #059669)') : 'var(--border-color)', color: selectedStudent ? 'white' : 'var(--text-muted)', fontWeight:700, cursor: selectedStudent ? 'pointer' : 'not-allowed', fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'8px', transition:'all 0.2s' }}>
                {submitting ? '⏳ Processing...' : (editingPayment ? <><CheckCircle2 size={17} /> Update Payment Record</> : <><FileText size={17} /> Record Payment & Print Receipt</>)}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 36.2: DISPLAY SUMMARY CARDS                                          */}
      {/* ========================================================================= */}
      <div className="summary-grid" style={{ marginTop: '24px' }}>
        <div className="summary-card">
          <h4>Total Students</h4>
          <p>{totalStudents}</p>
        </div>

        <div className="summary-card">
          <h4>Total Fee Amount</h4>
          <p>₹{totalFeeAmount.toLocaleString('en-IN')}</p>
        </div>

        <div className="summary-card">
          <h4>Total Collected</h4>
          <p>₹{totalCollectedAmount.toLocaleString('en-IN')}</p>
        </div>

        <div className="summary-card">
          <h4>Total Pending</h4>
          <p>₹{totalPendingAmount.toLocaleString('en-IN')}</p>
        </div>

        <div className="summary-card">
          <h4>Fully Paid Students</h4>
          <p>{fullyPaidStudents}</p>
        </div>

        <div className="summary-card">
          <h4>Partial Payments</h4>
          <p>{partiallyPaidStudents}</p>
        </div>

        <div className="summary-card">
          <h4>Pending Payments</h4>
          <p>{pendingStudents}</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STUDENT FEE DETAILS & ACCOUNTS COLLECTION REGISTER TABLE                  */}
      {/* ========================================================================= */}
      <div className="glass-card" style={{ marginTop: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Student Fee Ledger & Payment Overview
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time directory of enrolled students, assessed course fees, collected amounts, and remaining balances.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Step 45.7: Refresh Button */}
            <button
              type="button"
              onClick={fetchFeeStudents}
              disabled={loading}
              className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#374151',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <span style={{ fontSize: '0.82rem', padding: '6px 12px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 700 }}>
              {searchTerm || courseFilter !== 'All' || statusFilter !== 'All' ? `Filtered: ${totalRecords} Records` : `Total Records: ${totalRecords}`}
            </span>
          </div>
        </div>

        {/* 30.4, 30.5, 30.6: Search and Filter Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto',
          gap: '12px',
          marginBottom: '20px',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: '14px 16px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          {/* 30.4 Search Student Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 30.6 Course / Major Filter */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setSelectedCourse(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="All">All Courses</option>
              {courseOptions.map((course) => (
                <option key={course.id || course._id || course.name} value={course.name || course.courseName || course.id}>
                  {course.name || course.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* 30.5 Payment Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSelectedStatus(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {(searchTerm || courseFilter !== 'All' || statusFilter !== 'All' || selectedCourse || selectedStatus) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCourseFilter('All');
                setStatusFilter('All');
                setSelectedCourse('');
                setSelectedStatus('');
              }}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <RotateCcw size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Step 45.3: Add Loading State */}
        {loading && (
          <div
            className="flex items-center justify-center gap-3 py-8 rounded-lg bg-blue-50 p-6 text-center text-blue-700"
            style={{
              padding: '36px 20px',
              background: 'rgba(59,130,246,0.06)',
              borderRadius: '12px',
              border: '1px solid rgba(59,130,246,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}
          >
            <div
              className="h-6 w-6 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '3px solid rgba(59,130,246,0.2)',
                borderTopColor: '#3b82f6',
                animation: 'spin 1s linear infinite'
              }}
            />
            <span className="text-gray-600 font-semibold" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
              Loading fee collection records...
            </span>
          </div>
        )}

        {/* Step 45.4: Add Error Message */}
        {!loading && error && (
          <div
            className="rounded-lg bg-red-50 p-4 text-red-700"
            style={{
              padding: '20px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '12px',
              marginBottom: '20px'
            }}
          >
            <p className="font-semibold" style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#dc2626' }}>
              Unable to load fee records
            </p>

            <p className="text-sm" style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#ef4444' }}>
              {error}
            </p>

            <button
              type="button"
              onClick={fetchFeeStudents}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              style={{
                marginTop: '14px',
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        )}

        {/* Step 45.5: Add Empty State */}
        {!loading && !error && feeStudents.length === 0 && (
          <div
            className="rounded-lg border border-dashed border-gray-300 p-10 text-center"
            style={{
              padding: '48px 24px',
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              marginBottom: '20px'
            }}
          >
            <h3 className="text-lg font-semibold text-gray-700" style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '1.15rem' }}>
              No Fee Records Found
            </h3>

            <p className="mt-2 text-sm text-gray-500" style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No student fee records match the current search or filters.
            </p>
          </div>
        )}

        {/* Step 45.6: Display the Table Only When Records Exist */}
        {!loading && !error && feeStudents.length > 0 && (
          <>
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Admission No.</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Course</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Quota</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Normal Fee</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Discount</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Final Fee</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Paid Amount</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Remaining</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feeStudents.map((admission) => {
                    // Step 55.5: Add Fallback Values for Older Records
                    const normalFee = Number(admission.normalFee ?? admission.totalFee ?? 0);
                    const discountAmount = Number(admission.discountAmount ?? 0);
                    const finalFee = Number(admission.finalFee ?? admission.totalFee ?? normalFee);
                    const quotaName = admission.quotaName || admission.quota || "General Quota";
                    const paidAmount = Number(admission.paidAmount ?? admission.paid ?? admission.amountPaid ?? 0);
                    const remainingFee = Number(
                      admission.remainingFee ?? Math.max(finalFee - paidAmount, 0)
                    );

                    // 36.3 Reusable Status Function
                    const status =
                      admission.paymentStatus ||
                      getPaymentStatus(
                        finalFee,
                        paidAmount
                      );

                    return (
                      <tr
                        key={admission._id || admission.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.04)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          <div style={{ fontWeight: 700 }}>
                            {admission.studentName}
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e40af' }}>
                          {admission.admissionNumber}
                        </td>

                        <td style={{ padding: '12px 14px', color: 'var(--text-main)' }}>
                          <div>
                            {admission.course?.name ||
                              admission.course?.courseName ||
                              admission.course ||
                              admission.dept ||
                              admission.department ||
                              "General"}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Sem {admission.semester || admission.sem || 1}
                          </div>
                        </td>

                        {/* Step 55: Quota Column */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            className="quota-badge"
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: String(quotaName).includes('Sports')
                                ? '#e0f2fe'
                                : String(quotaName).includes('Gov')
                                ? '#dcfce7'
                                : String(quotaName).includes('Manage')
                                ? '#fef3c7'
                                : '#f1f5f9',
                              color: String(quotaName).includes('Sports')
                                ? '#0369a1'
                                : String(quotaName).includes('Gov')
                                ? '#15803d'
                                : String(quotaName).includes('Manage')
                                ? '#b45309'
                                : '#475569'
                            }}
                          >
                            {quotaName}
                          </span>
                        </td>

                        {/* Normal Fee */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '600', color: '#64748b' }}>
                          {formatCurrency(normalFee)}
                        </td>

                        {/* Quota Discount */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {discountAmount > 0 ? (
                            <span className="discount-amount" style={{ padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: '700', fontSize: '0.78rem' }}>
                              - {formatCurrency(discountAmount)}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{formatCurrency(0)}</span>
                          )}
                        </td>

                        {/* Final Fee */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#1e40af' }}>
                          <strong>{formatCurrency(finalFee)}</strong>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {formatCurrency(paidAmount)}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: remainingFee > 0 ? '#dc2626' : '#16a34a' }}>
                          {formatCurrency(remainingFee)}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span className={getStatusClass(status)}>
                            {status}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => handleViewFeeDetails(admission)}
                              className="rounded-lg bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#4f46e5',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s',
                                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                              }}
                              title="View Fee Details"
                            >
                              <FileText size={13} /> View Details
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRecordPayment(admission)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                background: selectedStudent?.id === (admission.id || admission.admissionNumber) ? '#10b981' : '#1e40af',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                              }}
                            >
                              {selectedStudent?.id === (admission.id || admission.admissionNumber) ? '✓ Selected' : 'Record Payment'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleViewPaymentHistory(admission)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid #6366f1',
                                color: '#6366f1',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                              }}
                              title="View Payment History"
                            >
                              <History size={13} /> Payment History
                            </button>

                            {paidAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => handlePrintPaymentReceipt(admission, {
                                  amount: paidAmount,
                                  paidAmount: paidAmount,
                                  feeType: 'Tuition Fee / Course Fee',
                                  paymentMethod: 'Bank / Cash / UPI',
                                  receiptNumber: admission.receiptNumber || admission.receiptNo
                                })}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(16,185,129,0.1)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s'
                                }}
                                title="View Receipt"
                              >
                                <FileText size={13} /> View Receipt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Step 44.6: Update Pagination Display */}
            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <p className="text-sm text-gray-600" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing{" "}
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {totalRecords === 0
                    ? 0
                    : (currentPage - 1) * recordsPerPage + 1}
                </span>{" "}
                to{" "}
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {Math.min(
                    currentPage * recordsPerPage,
                    totalRecords
                  )}
                </span>{" "}
                of{" "}
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {totalRecords}
                </span>{" "}
                records
              </p>

              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => page - 1)}
                  className="rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>

                {/* Step 44.6: Page Indicator */}
                <span
                  className="rounded-lg bg-gray-100 px-4 py-2"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Page {currentPage} of {totalPages || 1}
                </span>

                {/* Step 42.6: Page Number Buttons */}
                <div className="flex flex-wrap gap-2" style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: totalPages || 1 }, (_, index) => index + 1).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`rounded-lg px-3 py-2 ${
                          currentPage === pageNumber
                            ? "bg-blue-600 text-white"
                            : "border bg-white text-gray-700"
                        }`}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: currentPage === pageNumber ? 'none' : '1px solid var(--border-color)',
                          background: currentPage === pageNumber ? '#3b82f6' : 'var(--bg-secondary)',
                          color: currentPage === pageNumber ? '#ffffff' : 'var(--text-main)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {pageNumber}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    currentPage === totalPages ||
                    totalPages === 0
                  }
                  onClick={() => setCurrentPage((page) => page + 1)}
                  className="rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                    opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )}

      {/* ========================================================================= */}
      {/* VIEW 2: STEP 37 & 38 — FEE COLLECTION REPORT (EXPORT & PRINT-FRIENDLY)     */}
      {/* ========================================================================= */}
      {activeTab === 'report' && (
        <div className="animate-fade-in printable-report">
          {/* Report Header Card */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📊 Fee Collection Report
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Generated on: {new Date().toLocaleDateString()} • Audit payments and filter with real-time calculated totals.
                </p>
              </div>

              {/* Step 38.2 & 38.3: Export CSV and Print Report Action Buttons */}
              <div className="report-actions flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={exportReportToCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Download size={15} /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <Printer size={15} /> Print Report
                </button>
              </div>
            </div>

            {/* Step 37.2: Report Filters */}
            <div style={{ marginTop: '24px' }}>
              <div className="report-filters">
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        startDate: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        endDate: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Course/Major
                  </label>
                  <select
                    value={reportFilters.course}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        course: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="All">All Courses</option>
                    {courseOptions.map((course) => (
                      <option key={course.id || course._id || course.name} value={course.name || course.courseName || course.id}>
                        {course.name || course.courseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Payment Method
                  </label>
                  <select
                    value={reportFilters.paymentMethod}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        paymentMethod: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="All">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Payment Status
                  </label>
                  <select
                    value={reportFilters.paymentStatus}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        paymentStatus: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Step 37.7: Clear Filters Button */}
              {(reportFilters.startDate || reportFilters.endDate || reportFilters.course !== 'All' || reportFilters.paymentMethod !== 'All' || reportFilters.paymentStatus !== 'All' || reportSearch) && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={clearReportFilters}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RotateCcw size={13} /> Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 37.5: Report Summary Cards */}
          <div className="report-summary">
            <div className="summary-card">
              <h4>Payment Records</h4>
              <p>{reportPaymentCount}</p>
            </div>

            <div className="summary-card">
              <h4>Total Collected</h4>
              <p>₹{reportTotalCollected.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Step 37.6 & 38.4: Display the Report Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📑 Payment Records Ledger
              </h3>
              <span style={{ fontSize: '0.82rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>
                Showing {filteredReportPayments.length} Transactions
              </span>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Receipt No.</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Admission No.</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Course</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Amount</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Payment Method</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Payment Date</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No payment records match the selected date range or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReportPayments.map((payment, index) => {
                      const payDateStr = payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString()
                        : "—";

                      return (
                        <tr
                          key={payment._id || index}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.04)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#3b82f6' }}>
                            {payment.receiptNumber || payment.receiptNo || "—"}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {payment.studentName}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#1e40af', fontWeight: 600 }}>
                            {payment.admissionNumber || payment.studentId}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                            {payment.courseName}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                            ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: 600 }}>
                              {payment.paymentMethod || "Cash"}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {payDateStr}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span className={getStatusClass(payment.paymentStatus || "Paid")}>
                              {payment.paymentStatus || "Paid"}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() =>
                                handlePrintPaymentReceipt(
                                  {
                                    studentName: payment.studentName,
                                    admissionNumber: payment.admissionNumber || payment.studentId,
                                    course: payment.courseName,
                                    totalFee: payment.totalFee,
                                    paidAmount: payment.paidAmount,
                                    remainingFee: payment.remainingFee,
                                    paymentStatus: payment.paymentStatus
                                  },
                                  payment
                                )
                              }
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'rgba(59,130,246,0.1)',
                                border: '1px solid #3b82f6',
                                color: '#3b82f6',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Print Receipt"
                            >
                              <FileText size={12} /> Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report Total Banner / Print Footer */}
          <div style={{
            marginTop: '20px',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
            border: '1px solid #10b981',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                💰 Total Fee Collection Summary
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Calculated across {filteredReportPayments.length} filtered transaction records
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#059669' }}>
              Total Collected: ₹{reportTotalCollected.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

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

      {/* ========================================================================= */}
      {/* STEP 21 & 56: FEE PAYMENT RECEIPT DISPLAY MODAL                           */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* STEP 31: RECORD PAYMENT MODAL                                             */}
      {/* ========================================================================= */}
      {showPaymentModal && selectedAdmission && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Record Payment</h2>
              <button
                type="button"
                onClick={closePaymentModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p>
              <strong>Student:</strong>{" "}
              {selectedAdmission.studentName || selectedAdmission.name}
            </p>

            <p>
              <strong>Course/Major:</strong>{" "}
              {selectedAdmission.course?.name ||
                selectedAdmission.course?.courseName ||
                selectedAdmission.course ||
                selectedAdmission.dept ||
                selectedAdmission.department ||
                'N/A'}
            </p>

            <p>
              <strong>Total Fee:</strong> ₹
              {Number(selectedAdmission.totalFee || 0).toLocaleString('en-IN')}
            </p>

            <p>
              <strong>Already Paid:</strong> ₹
              {Number(selectedAdmission.paidAmount || 0).toLocaleString('en-IN')}
            </p>

            <p>
              <strong>Remaining Balance:</strong> ₹
              {Number(
                selectedAdmission.remainingFee ??
                  Math.max(0, (selectedAdmission.totalFee || 0) - (selectedAdmission.paidAmount || 0))
              ).toLocaleString('en-IN')}
            </p>

            <div className="form-group">
              <label>Payment Amount</label>

              <input
                type="number"
                min="1"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: e.target.value,
                  })
                }
                placeholder="Enter payment amount"
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>

              <select
                value={paymentForm.paymentMethod}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    paymentMethod: e.target.value,
                  })
                }
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">
                  Bank Transfer
                </option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label>Payment Date</label>

              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    paymentDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={closePaymentModal}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#f3f4f6',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button 
                type="button" 
                onClick={handlePaymentConfirmation}
                disabled={savingPayment || submitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: (savingPayment || submitting) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                }}
              >
                {savingPayment || submitting ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 33 & 57: PAYMENT HISTORY MODAL                                       */}
      {/* ========================================================================= */}
      {showHistoryModal && historyAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl" style={{ width: '100%', maxWidth: '920px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-primary, #ffffff)', borderRadius: '16px', padding: '26px', color: 'var(--text-main, #1e293b)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="mb-5 flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📜 Payment History
                </h2>
                <p className="text-sm text-gray-500" style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted, #64748b)' }}>
                  {historyAdmission.studentName || historyAdmission.name} - {historyAdmission.admissionNumber || historyAdmission.id || historyAdmission._id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeHistoryModal}
                className="text-2xl text-gray-500 hover:text-gray-800"
                style={{ background: 'none', border: 'none', fontSize: '1.8rem', color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: '0 6px' }}
              >
                ×
              </button>
            </div>

            {/* Step 57.13: Show Payment Summary Above the History Table */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
              <div className="rounded-lg bg-blue-50 p-4" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p className="text-sm text-gray-600" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Final Payable Fee
                </p>
                <p className="text-lg font-semibold" style={{ margin: '6px 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8' }}>
                  ₹{Number(historyAdmission.finalFee ?? historyAdmission.totalFee ?? 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-4" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p className="text-sm text-gray-600" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Paid
                </p>
                <p className="text-lg font-semibold" style={{ margin: '6px 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>
                  ₹{Number(historyAdmission.paidAmount ?? historyAdmission.paid ?? 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-lg bg-orange-50 p-4" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                <p className="text-sm text-gray-600" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Remaining Balance
                </p>
                <p className="text-lg font-semibold" style={{ margin: '6px 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#ea580c' }}>
                  ₹{Number(historyAdmission.remainingFee ?? Math.max(0, (historyAdmission.finalFee ?? historyAdmission.totalFee ?? 0) - (historyAdmission.paidAmount ?? historyAdmission.paid ?? 0))).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Step 57.12: Loading / Empty / History Table */}
            {isHistoryLoading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Loading payment history...</p>
              </div>
            ) : !historyPayments || historyPayments.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px dashed var(--border-color, #cbd5e1)' }}>
                <p className="text-gray-500" style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                  No payments have been recorded yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card, #ffffff)' }}>
                <table className="min-w-[700px] w-full border-collapse" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr className="border-b bg-gray-50" style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <th className="p-3 text-left" style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>Receipt Number</th>
                      <th className="p-3 text-left" style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>Payment Date</th>
                      <th className="p-3 text-left" style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>Amount</th>
                      <th className="p-3 text-left" style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>Payment Mode</th>
                      <th className="p-3 text-left" style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>Transaction Reference</th>
                      <th className="p-3 text-left" style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>Collected By</th>
                      <th className="p-3 text-center" style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted, #475569)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPayments.map((payment, index) => {
                      const receiptNo = payment.receiptNumber || payment.receiptNo || `REC-${index + 1}`;
                      const payDateStr = payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString("en-IN")
                        : "-";
                      const payAmt = Number(payment.amount || payment.paidAmount || 0);
                      const payMode = payment.paymentMode || payment.paymentMethod || "Cash";
                      const transRef = payment.transactionReference || payment.transactionRef || "-";
                      const collector = payment.collectedBy?.name || payment.collectorName || "Accounts Staff";

                      return (
                        <tr key={payment._id || index} className="border-b" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                          <td className="p-3 font-semibold" style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>
                            {receiptNo}
                          </td>
                          <td className="p-3" style={{ padding: '12px 14px', color: 'var(--text-main, #334155)' }}>
                            {payDateStr}
                          </td>
                          <td className="p-3 font-semibold text-emerald-600" style={{ padding: '12px 14px', fontWeight: 700, color: '#059669' }}>
                            ₹{payAmt.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3" style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.8rem' }}>
                              {payMode}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500" style={{ padding: '12px 14px', color: '#64748b' }}>
                            {transRef}
                          </td>
                          <td className="p-3 text-gray-600" style={{ padding: '12px 14px', color: '#475569' }}>
                            {collector}
                          </td>
                          <td className="p-3" style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleEditPayment(historyAdmission, payment)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: '1px solid #3b82f6',
                                  color: '#3b82f6',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Edit Payment"
                              >
                                <Edit size={12} /> Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePayment(historyAdmission, payment)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid #ef4444',
                                  color: '#ef4444',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Delete Payment"
                              >
                                <Trash2 size={12} /> Delete
                              </button>

                              <button
                                type="button"
                                onClick={() => handleViewReceipt(payment)}
                                style={{
                                  padding: '4px 9px',
                                  borderRadius: '5px',
                                  background: '#9333ea',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="View Receipt"
                              >
                                <FileText size={12} /> Receipt
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintPaymentReceipt(historyAdmission, payment)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  background: 'rgba(16,185,129,0.1)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Print Receipt"
                              >
                                <Printer size={12} /> Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end" style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="rounded-lg bg-gray-800 px-4 py-2 text-white"
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 34: EDIT PAYMENT MODAL                                               */}
      {/* ========================================================================= */}
      {showEditPaymentModal && selectedPayment && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Edit Payment</h2>
              <button
                type="button"
                onClick={() => setShowEditPaymentModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {historyAdmission && (
              <p style={{ margin: '0 0 14px', fontSize: '0.9rem', color: '#64748b' }}>
                Student: <strong style={{ color: '#0f172a' }}>{historyAdmission.studentName || historyAdmission.name}</strong>
              </p>
            )}

            <div className="form-group">
              <label>Payment Amount</label>
              <input
                type="number"
                min="1"
                value={editPaymentForm.amount}
                onChange={(e) =>
                  setEditPaymentForm({
                    ...editPaymentForm,
                    amount: e.target.value,
                  })
                }
                placeholder="Enter payment amount"
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select
                value={editPaymentForm.paymentMethod}
                onChange={(e) =>
                  setEditPaymentForm({
                    ...editPaymentForm,
                    paymentMethod: e.target.value,
                  })
                }
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label>Payment Date</label>
              <input
                type="date"
                value={editPaymentForm.paymentDate}
                onChange={(e) =>
                  setEditPaymentForm({
                    ...editPaymentForm,
                    paymentDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowEditPaymentModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#f3f4f6',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdatePaymentConfirmation}
                disabled={submitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                }}
              >
                {submitting ? 'Updating...' : 'Update Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 35 & 56: PRINTABLE PAYMENT RECEIPT                                   */}
      {/* ========================================================================= */}
      {showReceipt && receiptData && (
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
              selectedFeeRecord={receiptData}
              selectedPayment={receiptData}
              onClose={() => setShowReceipt(false)}
              institutionName="Royal College"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 39.4 & 56: PAYMENT RECEIPT MODAL                                     */}
      {/* ========================================================================= */}
      {showReceiptModal && selectedPayment && (
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
              selectedFeeRecord={selectedPayment}
              selectedPayment={selectedPayment}
              onClose={closeReceiptModal}
              institutionName="Royal College"
            />
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* STEP 41.4: STUDENT FEE DETAILS MODAL                                      */}
      {/* ========================================================================= */}
      {showDetailsModal && selectedFeeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl" style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-primary, #ffffff)', borderRadius: '14px', padding: '28px', color: 'var(--text-main, #1e293b)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div className="mb-6 flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
              <h2 className="text-2xl font-bold" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎓 Student Fee Details
              </h2>

              <button
                type="button"
                onClick={closeDetailsModal}
                className="text-2xl text-gray-500 hover:text-gray-800"
                style={{ background: 'none', border: 'none', fontSize: '1.8rem', color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: '0 6px' }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div>
                <p className="text-sm text-gray-500" style={{ margin: '0 0 2px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>Student Name</p>
                <p className="font-semibold" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  {selectedFeeStudent.studentName || selectedFeeStudent.name || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500" style={{ margin: '0 0 2px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>Admission Number</p>
                <p className="font-semibold" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>
                  {selectedFeeStudent.admissionNumber || selectedFeeStudent.admissionNo || selectedFeeStudent.id || selectedFeeStudent._id || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500" style={{ margin: '0 0 2px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>Course/Major</p>
                <p className="font-semibold" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                  {selectedFeeStudent.courseName ||
                    selectedFeeStudent.course?.name ||
                    selectedFeeStudent.course?.courseName ||
                    selectedFeeStudent.course ||
                    selectedFeeStudent.dept ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500" style={{ margin: '0 0 2px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>Selected Quota</p>
                <p className="font-semibold" style={{ margin: '4px 0 0' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '12px', background: '#ede9fe', color: '#6d28d9', fontWeight: 700, fontSize: '0.82rem' }}>
                    {selectedFeeStudent.quotaName || selectedFeeStudent.admissionQuota || 'General Quota'}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500" style={{ margin: '0 0 2px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>Payment Status</p>
                <p className="font-semibold" style={{ margin: '4px 0 0' }}>
                  <span className={getStatusClass(selectedFeeStudent.paymentStatus || getPaymentStatus(selectedFeeStudent.totalFee, selectedFeeStudent.paidAmount))}>
                    {selectedFeeStudent.paymentStatus || getPaymentStatus(selectedFeeStudent.totalFee, selectedFeeStudent.paidAmount)}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500" style={{ margin: '0 0 2px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>Hostel Required</p>
                <p className="font-semibold" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                  {selectedFeeStudent.hostelRequired || selectedFeeStudent.hostel ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* Quota Fee Summary Row */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', margin: '20px 0' }}>
              <div className="rounded-lg bg-slate-50 p-4" style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p className="text-sm text-gray-600" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Normal Department Fee</p>
                <p className="text-xl font-bold" style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                  {formatCurrency(selectedFeeStudent.normalFee ?? selectedFeeStudent.totalFee ?? 0)}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-4" style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p className="text-sm text-red-600" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Quota Discount</p>
                <p className="text-xl font-bold text-red-700" style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>
                  - {formatCurrency(selectedFeeStudent.discountAmount ?? 0)}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-4" style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p className="text-sm text-gray-600" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Final Payable Fee</p>
                <p className="text-xl font-bold text-blue-700" style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                  {formatCurrency(selectedFeeStudent.finalFee ?? selectedFeeStudent.totalFee ?? 0)}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-4" style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p className="text-sm text-gray-600" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Paid Amount</p>
                <p className="text-xl font-bold text-green-700" style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                  {formatCurrency(selectedFeeStudent.paidAmount ?? selectedFeeStudent.paid ?? 0)}
                </p>
              </div>
            </div>

            <div className="mt-6" style={{ marginTop: '20px' }}>
              <h3 className="mb-3 text-lg font-bold" style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                📋 Fee Breakdown
              </h3>

              <div className="overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <table className="w-full border-collapse border border-gray-300" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Tuition Fee
                      </td>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main)', textAlign: 'right' }}>
                        ₹{Number(selectedFeeStudent.tuitionFee || (Number(selectedFeeStudent.totalFee || 0) > 0 ? Math.max(0, Number(selectedFeeStudent.totalFee || 0) - Number(selectedFeeStudent.hostelFee || 0) - Number(selectedFeeStudent.transportFee || 0) - Number(selectedFeeStudent.otherFee || 0)) : 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Hostel Fee
                      </td>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main)', textAlign: 'right' }}>
                        ₹{Number(selectedFeeStudent.hostelFee || selectedFeeStudent.hostelFeeAmount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Transport Fee
                      </td>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main)', textAlign: 'right' }}>
                        ₹{Number(selectedFeeStudent.transportFee || selectedFeeStudent.transportFeeAmount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Other Fee / Lab & Amenities
                      </td>
                      <td className="border border-gray-300 px-4 py-2" style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main)', textAlign: 'right' }}>
                        ₹{Number(selectedFeeStudent.otherFee || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeDetailsModal}
                className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  background: '#475569',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* STEP 46.7: CONFIRMATION MODAL                                             */}
      {/* ========================================================================= */}
      {confirmation.open && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 9999, 
            background: 'rgba(0,0,0,0.55)', 
            backdropFilter: 'blur(3px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '16px' 
          }}
        >
          <div 
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" 
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              background: '#ffffff', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' 
            }}
          >
            <h2 
              className="text-xl font-bold text-gray-800" 
              style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#1e293b' }}
            >
              {confirmation.title}
            </h2>

            <p 
              className="mt-3 text-gray-600" 
              style={{ marginTop: '12px', fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5' }}
            >
              {confirmation.message}
            </p>

            <div 
              className="mt-6 flex justify-end gap-3" 
              style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}
            >
              <button
                type="button"
                onClick={closeConfirmation}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                style={{ 
                  padding: '9px 18px', 
                  borderRadius: '8px', 
                  border: '1px solid #d1d5db', 
                  background: '#f8fafc', 
                  color: '#475569', 
                  fontWeight: 600, 
                  fontSize: '0.875rem', 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                style={{ 
                  padding: '9px 20px', 
                  borderRadius: '8px', 
                  background: '#dc2626', 
                  color: '#ffffff', 
                  border: 'none', 
                  fontWeight: 700, 
                  fontSize: '0.875rem', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesCollection;




