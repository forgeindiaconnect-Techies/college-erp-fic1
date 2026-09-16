import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserPlus,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  User,
  GraduationCap,
  Users,
  MapPin,
  Home,
  Bus,
  Camera,
  Search,
  FileSpreadsheet,
  Upload,
  CloudUpload,
  Trash2,
  Plus,
  HelpCircle,
  FolderOpen,
  Check,
  X,
  Languages,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Printer,
  FileText,
  IndianRupee,
  Layers,
  Award,
  Eye
} from 'lucide-react';
import {
  createStudent,
  updateStudent,
  createFee,
  getDepartments,
  getStudents,
  getCourses,
  getFeePlans,
  getFeeStructures,
  getSections
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentRegistration.css';

const COMMUNITIES = ['Select', 'BC', 'MBC', 'SC', 'ST', 'OC', 'BCM', 'DNC'];
const BLOOD_GROUPS = ['Select', 'A1+', 'A1-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const DEGREE_TYPES = ['UG', 'PG', 'Diploma', 'Ph.D'];
const SEMESTERS_LIST = [1, 2, 3, 4, 5, 6, 7, 8];
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Jain', 'Sikh', 'Buddhist', 'Other'];

const DEFAULT_QUALIFICATIONS = [
  { study: 'SSLC', institute: '', board: '', percentage: '', passYear: '', marksheetNo: '' },
  { study: 'HSC', institute: '', board: '', percentage: '', passYear: '', marksheetNo: '' },
  { study: 'enter if', institute: '', board: '', percentage: '', passYear: '', marksheetNo: '' }
];

const DEFAULT_FEE_BREAKDOWN = {
  admissionFee: 0,
  universityFee: 0,
  marksheetVerification: 0,
  tuitionFee: 0,
  specialFee: 0,
  englishLabNssId: 0,
  computerLab: 0,
  stationary: 0,
  pta: 0,
  otherFee: 0
};

const EMPTY_FORM = {
  // Admission Core
  previousAdmissionNo: '',
  id: '',
  admissionNo: '',
  admissionDate: new Date().toISOString().split('T')[0],
  academicYear: `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
  degreeType: 'UG',
  course: '',
  courseId: '',
  dept: '',
  department: '',
  semester: 1,
  sem: '1stYear-Sem-I',
  section: 'A',

  // Personal Info
  firstName: '',
  midName: '',
  lastName: '',
  name: '',
  dob: '',
  gender: 'Male',
  placeOfBirth: '',
  bloodGroup: 'Select',
  nationality: 'Indian',
  religion: 'Hindu',
  community: 'BC',
  caste: '',
  communityCertNo: '',
  motherTongue: 'Tamil',
  handicapped: 'No',
  physicallyChallenged: false,
  aadharNo: '',
  panNo: '',
  photoUrl: '',

  // Family & Guardian
  fatherName: '',
  motherName: '',
  fatherOccupation: '',
  yearlyIncome: '',
  fatherPhone: '',
  fatherEmail: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianAddress: '',

  // Contact & Address
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '',

  // Facilities
  hostel: 'No',
  dormFacility: false,
  hostelRequired: 'no',
  transport: 'No',
  busFacility: false,
  transportRequired: 'no',
  busRoute: '',
  pickupPoint: '',

  // Prior Academic Qualifications
  qualifications: [...DEFAULT_QUALIFICATIONS],

  // Fee Details (RS)
  feeBreakdown: { ...DEFAULT_FEE_BREAKDOWN },
  totalFee: 0,
  amountPaid: 0,
  balanceFee: 0,
  paymentMode: 'Cash',
  paymentStatus: 'Pending',
  receiptNumber: '',
  paymentDate: null,

  applicationStatus: 'Approved',
  admissionStatus: 'Confirmed',
  status: 'Active'
};

const generateRegNo = (codeOrName, studentsList) => {
  const cleanCode = (codeOrName || 'ST').replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'ST';
  const year = new Date().getFullYear();

  const matchingStudents = (studentsList || []).filter(
    student => student.id && String(student.id).startsWith(`${cleanCode}${year}`)
  );

  let maxSeq = 0;
  matchingStudents.forEach(student => {
    const parts = String(student.id).split('-');
    if (parts.length > 1) {
      const seq = parseInt(parts[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  return `${cleanCode}${year}-${String(maxSeq + 1).padStart(3, '0')}`;
};

const printReceiptDirect = (data) => {
  const win = window.open('', '_blank', 'width=800,height=750');
  if (!win) return;
  
  const recNo = data.receiptNumber || `REC-${Date.now()}`;
  const total = Number(data.totalFee || data.totalAmount || 0);
  const paid = Number(data.amountPaid || data.paidAmount || 0);
  const balance = Number(data.balanceFee || data.balanceAmount || Math.max(0, total - paid));

  win.document.write(`
    <!DOCTYPE html><html><head><title>Fee Receipt - ${recNo}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 30px; background: #fff; color: #1e293b; }
      .receipt-box { border: 2px solid #cbd5e1; border-radius: 8px; padding: 25px; max-width: 720px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 18px; }
      .header h1 { margin: 0; color: #1e40af; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
      .header p { margin: 3px 0; color: #64748b; font-size: 13px; }
      .badge-row { display: flex; justify-content: space-between; align-items: center; margin: 15px 0; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
      .badge-row .rec-no { font-weight: bold; color: #2563eb; font-size: 14px; }
      .badge-row .rec-date { color: #64748b; font-size: 13px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin-bottom: 18px; font-size: 13px; }
      .grid-2 .item { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
      .grid-2 .label { color: #64748b; font-weight: 500; }
      .grid-2 .val { font-weight: 600; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
      th { background: #f1f5f9; color: #334155; font-weight: 600; }
      .amount-col { text-align: right; }
      .totals-area { margin-top: 15px; border-top: 2px solid #cbd5e1; padding-top: 10px; font-size: 14px; }
      .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
      .total-bold { font-size: 16px; font-weight: 700; color: #1e40af; }
      .paid-bold { font-size: 15px; font-weight: 700; color: #16a34a; }
      .bal-bold { font-size: 15px; font-weight: 700; color: #dc2626; }
      .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; font-size: 12px; color: #64748b; }
      .sign-box { text-align: center; width: 160px; border-top: 1px solid #94a3b8; padding-top: 6px; }
    </style></head><body>
    <div class="receipt-box">
      <div class="header">
        <h1>COLLEGE ERP SYSTEM</h1>
        <p>Finance & Accounts Department — Official Student Fee Receipt</p>
      </div>
      <div class="badge-row">
        <div class="rec-no">RECEIPT NO: ${recNo}</div>
        <div class="rec-date">Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>
      <div class="grid-2">
        <div class="item"><span class="label">Student Name:</span><span class="val">${data.name || data.firstName + ' ' + data.lastName}</span></div>
        <div class="item"><span class="label">Admission No:</span><span class="val">${data.id || data.admissionNo || 'N/A'}</span></div>
        <div class="item"><span class="label">Course & Dept:</span><span class="val">${data.course || ''} - ${data.department || data.dept || ''}</span></div>
        <div class="item"><span class="label">Semester / Year:</span><span class="val">Semester ${data.semester || 1} (${data.academicYear || ''})</span></div>
        <div class="item"><span class="label">Payment Mode:</span><span class="val">${data.paymentMode || 'Cash'}</span></div>
        <div class="item"><span class="label">Payment Status:</span><span class="val">${paid >= total ? 'PAID IN FULL' : paid > 0 ? 'PARTIAL' : 'PENDING'}</span></div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Fee Description</th>
            <th class="amount-col">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.feeBreakdown || DEFAULT_FEE_BREAKDOWN)
            .filter(([_, val]) => Number(val) > 0)
            .map(([key, val], idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                <td class="amount-col">₹${Number(val).toLocaleString()}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>

      <div class="totals-area">
        <div class="totals-row total-bold">
          <span>Total Fee Payable:</span>
          <span>₹${total.toLocaleString()}</span>
        </div>
        <div class="totals-row paid-bold">
          <span>Amount Paid:</span>
          <span>₹${paid.toLocaleString()}</span>
        </div>
        <div class="totals-row bal-bold">
          <span>Balance Outstanding:</span>
          <span>₹${balance.toLocaleString()}</span>
        </div>
      </div>

      <div class="footer">
        <div>
          <p style="margin:0;">* This is a system-generated computer receipt.</p>
          <p style="margin:2px 0 0;">Accounts Verification Stamp Included.</p>
        </div>
        <div class="sign-box">
          Authorized Signatory<br>Accounts Officer
        </div>
      </div>
    </div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

const StudentRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Workflow modes: 1 = Form Entry, 2 = Confirmation / Verification Preview, 3 = Registered Students Directory
  const [activeTab, setActiveTab] = useState(1);

  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeStructuresList, setFeeStructuresList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);

  // Directory search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('All');
  const [filterDept, setFilterDept] = useState('All');

  // Load real departments, courses, sections, students, and fee structures from backend APIs
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [deptRes, courseRes, studRes, structRes, secRes] = await Promise.allSettled([
        getDepartments(),
        getCourses(),
        getStudents(),
        getFeeStructures(),
        getSections()
      ]);

      let loadedDepts = [];
      if (deptRes.status === 'fulfilled') {
        loadedDepts = Array.isArray(deptRes.value?.data)
          ? deptRes.value.data
          : deptRes.value?.data?.departments || [];
        setDepartments(loadedDepts);
      }

      let loadedCourses = [];
      if (courseRes.status === 'fulfilled') {
        loadedCourses = Array.isArray(courseRes.value?.data?.courses)
          ? courseRes.value.data.courses
          : Array.isArray(courseRes.value?.data)
          ? courseRes.value.data
          : [];
        setCourses(loadedCourses);
      }

      if (secRes.status === 'fulfilled') {
        const secData = Array.isArray(secRes.value?.data?.sections)
          ? secRes.value.data.sections
          : Array.isArray(secRes.value?.data)
          ? secRes.value.data
          : [];
        setSectionsList(secData);
      }

      if (studRes.status === 'fulfilled') {
        const sData = Array.isArray(studRes.value?.data)
          ? studRes.value.data
          : studRes.value?.data?.students || [];
        setStudents(sData);
      }

      if (structRes.status === 'fulfilled') {
        const strData = Array.isArray(structRes.value?.data) ? structRes.value.data : [];
        setFeeStructuresList(strData);
      }

      // Initialize default department if none selected
      if (!form.department && loadedDepts.length > 0) {
        const firstDept = loadedDepts[0]?.name || loadedDepts[0]?.departmentName || loadedDepts[0];
        const deptCode = loadedDepts[0]?.code || firstDept.substring(0, 3).toUpperCase();
        setForm(prev => ({
          ...prev,
          dept: firstDept,
          department: firstDept,
          id: prev.id || generateRegNo(deptCode, studRes.value?.data || [])
        }));
      }

    } catch (err) {
      console.error('Initial data load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useRealtimeSync('students', loadInitialData);
  useRealtimeSync('departments', loadInitialData);
  useRealtimeSync('courses', loadInitialData);
  useRealtimeSync('sections', loadInitialData);
  useRealtimeSync('feeStructure', loadInitialData);

  // Filter sections dynamically based on the selected Department & Course
  const availableSections = useMemo(() => {
    const currentDept = form.department || form.dept;
    if (!currentDept) return ['A', 'B', 'C', 'D'];

    const deptObj = departments.find(d =>
      (d?.name && d.name.toLowerCase() === currentDept.toLowerCase()) ||
      (d?.id && String(d.id).toLowerCase() === String(currentDept).toLowerCase()) ||
      (d?.code && d.code.toLowerCase() === currentDept.toLowerCase())
    );

    const deptId = deptObj?.id || deptObj?._id || currentDept;
    const deptCode = deptObj?.code || '';
    const deptName = deptObj?.name || currentDept;

    const matched = sectionsList.filter(sec => {
      const sDeptId = String(sec?.departmentId || sec?.department || '').trim().toLowerCase();
      return (
        (deptId && sDeptId === String(deptId).trim().toLowerCase()) ||
        (deptCode && sDeptId === String(deptCode).trim().toLowerCase()) ||
        (deptName && sDeptId === String(deptName).trim().toLowerCase())
      );
    });

    if (matched.length > 0) {
      const uniqueNames = Array.from(new Set(matched.map(s => s.name || s.sectionName || s))).filter(Boolean);
      return uniqueNames.length > 0 ? uniqueNames : ['A', 'B', 'C', 'D'];
    }

    return ['A', 'B', 'C', 'D'];
  }, [form.department, form.dept, departments, sectionsList]);

  // Filter courses strictly by the selected Department
  const availableCourses = useMemo(() => {
    const currentDeptName = form.department || form.dept;
    if (!currentDeptName) return [];

    const deptObj = departments.find(d =>
      (d?.name && d.name.toLowerCase() === currentDeptName.toLowerCase()) ||
      (d?.id && String(d.id).toLowerCase() === String(currentDeptName).toLowerCase()) ||
      (d?.code && d.code.toLowerCase() === currentDeptName.toLowerCase())
    );

    const deptId = deptObj?.id || deptObj?._id || currentDeptName;
    const deptCode = deptObj?.code || '';
    const deptName = deptObj?.name || currentDeptName;

    const matched = courses.filter(c => {
      const cDeptId = String(c?.departmentId || '').trim().toLowerCase();
      const cDept = String(c?.department || c?.departmentName || '').trim().toLowerCase();

      return (
        (deptId && cDeptId === String(deptId).trim().toLowerCase()) ||
        (deptCode && cDeptId === String(deptCode).trim().toLowerCase()) ||
        (deptName && cDeptId === String(deptName).trim().toLowerCase()) ||
        (deptName && cDept === String(deptName).trim().toLowerCase()) ||
        (deptCode && cDept === String(deptCode).trim().toLowerCase())
      );
    });

    return matched;
  }, [form.department, form.dept, departments, courses]);

  const getDepartmentDefaultFeeBreakdown = (deptName) => {
    const dLower = String(deptName || '').toLowerCase();

    if (dLower.includes('computer') || dLower.includes('cse') || dLower.includes('tech') || dLower.includes('engineering')) {
      return {
        admissionFee: 5000,
        universityFee: 2500,
        marksheetVerification: 500,
        tuitionFee: 35000,
        specialFee: 5000,
        englishLabNssId: 2000,
        computerLab: 4000,
        stationary: 1500,
        pta: 1000,
        otherFee: 1500
      };
    }

    if (dLower.includes('food') || dLower.includes('nutrition') || dLower.includes('math') || dLower.includes('science')) {
      return {
        admissionFee: 3500,
        universityFee: 2000,
        marksheetVerification: 500,
        tuitionFee: 22000,
        specialFee: 3500,
        englishLabNssId: 1500,
        computerLab: 3000,
        stationary: 1000,
        pta: 1000,
        otherFee: 1000
      };
    }

    // Arts / Language / History / BA Tamil / General
    return {
      admissionFee: 2500,
      universityFee: 1500,
      marksheetVerification: 500,
      tuitionFee: 15000,
      specialFee: 2000,
      englishLabNssId: 1000,
      computerLab: 1000,
      stationary: 1000,
      pta: 500,
      otherFee: 1000
    };
  };

  // Synchronize Fee Breakdown whenever Course, Dept, Semester or Academic Year changes
  useEffect(() => {
    const courseName = form.course;
    const deptName = form.department || form.dept;
    const semNum = Number(form.semester) || 1;
    const acadYrNorm = (form.academicYear || '').replace(/\s+/g, '').toLowerCase();

    if (!deptName) return;

    // Search configured FeeStructure
    const matched = feeStructuresList.find(s => {
      const sDept = (s.department || '').toLowerCase().trim();
      const sCourse = (s.course || '').toLowerCase().trim();
      const sAcadYr = (s.academicYear || '').replace(/\s+/g, '').toLowerCase();
      const dNorm = deptName.toLowerCase().trim();
      const cNorm = (courseName || '').toLowerCase().trim();

      const deptMatches = sDept === dNorm || (s.departmentId && String(s.departmentId).toLowerCase() === dNorm);
      const courseMatches = !courseName || sCourse === cNorm || cNorm.includes(sCourse) || sCourse.includes(cNorm);
      const semMatches = Number(s.semester) === semNum;
      const yrMatches = !sAcadYr || !acadYrNorm || sAcadYr === acadYrNorm;

      return deptMatches && courseMatches && semMatches && yrMatches;
    });

    let breakdown = {};
    let total = 0;

    if (matched && matched.fees && matched.fees.length > 0) {
      breakdown = {
        admissionFee: 0,
        universityFee: 0,
        marksheetVerification: 0,
        tuitionFee: 0,
        specialFee: 0,
        englishLabNssId: 0,
        computerLab: 0,
        stationary: 0,
        pta: 0,
        otherFee: 0
      };

      matched.fees.forEach(f => {
        const fType = (f.feeType || '').toLowerCase();
        const amt = Number(f.amount) || 0;
        total += amt;

        if (fType.includes('admission')) breakdown.admissionFee = amt;
        else if (fType.includes('tuition')) breakdown.tuitionFee = amt;
        else if (fType.includes('exam') || fType.includes('univ')) breakdown.universityFee = amt;
        else if (fType.includes('mark') || fType.includes('verif')) breakdown.marksheetVerification = amt;
        else if (fType.includes('library') || fType.includes('id') || fType.includes('nss')) breakdown.englishLabNssId = amt;
        else if (fType.includes('lab') || fType.includes('computer')) breakdown.computerLab = amt;
        else if (fType.includes('station')) breakdown.stationary = amt;
        else if (fType.includes('special')) breakdown.specialFee = amt;
        else if (fType.includes('pta')) breakdown.pta = amt;
        else breakdown.otherFee = (breakdown.otherFee || 0) + amt;
      });
    } else {
      breakdown = getDepartmentDefaultFeeBreakdown(deptName);
      total = Object.values(breakdown).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }

    const currentPaid = Number(form.amountPaid) || 0;
    setForm(prev => ({
      ...prev,
      feeBreakdown: breakdown,
      totalFee: total,
      balanceFee: Math.max(0, total - currentPaid)
    }));
  }, [form.course, form.department, form.dept, form.semester, form.academicYear, feeStructuresList]);

  // Recalculate totals whenever fee breakdown fields change
  const handleFeeBreakdownChange = (field, val) => {
    const num = Math.max(0, Number(val) || 0);
    const updatedBreakdown = {
      ...form.feeBreakdown,
      [field]: num
    };

    const total = Object.values(updatedBreakdown).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const paid = Number(form.amountPaid) || 0;

    setForm(prev => ({
      ...prev,
      feeBreakdown: updatedBreakdown,
      totalFee: total,
      balanceFee: Math.max(0, total - paid)
    }));
  };

  const handleAmountPaidChange = (val) => {
    const paid = Math.max(0, Number(val) || 0);
    const total = Number(form.totalFee) || 0;
    const balance = Math.max(0, total - paid);

    let status = 'Pending';
    if (paid >= total && total > 0) status = 'Paid';
    else if (paid > 0) status = 'Partial';

    setForm(prev => ({
      ...prev,
      amountPaid: paid,
      balanceFee: balance,
      paymentStatus: status
    }));
  };

  const handleChange = (field, val) => {
    setForm(prev => {
      const updated = { ...prev, [field]: val };

      if (field === 'firstName' || field === 'lastName' || field === 'midName') {
        updated.name = [updated.firstName, updated.midName, updated.lastName].filter(Boolean).join(' ').trim();
      }

      if (field === 'dept' || field === 'department') {
        updated.dept = val;
        updated.department = val;

        const deptObj = departments.find(d =>
          (d?.name && d.name.toLowerCase() === val.toLowerCase()) ||
          (d?.id && String(d.id).toLowerCase() === String(val).toLowerCase()) ||
          (d?.code && d.code.toLowerCase() === val.toLowerCase())
        );
        const deptId = deptObj?.id || deptObj?._id || val;
        const deptCode = deptObj?.code || '';
        const deptName = deptObj?.name || val;

        const matchingCourses = courses.filter(c => {
          const cDeptId = String(c?.departmentId || '').trim().toLowerCase();
          const cDept = String(c?.department || c?.departmentName || '').trim().toLowerCase();

          return (
            (deptId && cDeptId === String(deptId).trim().toLowerCase()) ||
            (deptCode && cDeptId === String(deptCode).trim().toLowerCase()) ||
            (deptName && cDeptId === String(deptName).trim().toLowerCase()) ||
            (deptName && cDept === String(deptName).trim().toLowerCase()) ||
            (deptCode && cDept === String(deptCode).trim().toLowerCase())
          );
        });

        if (matchingCourses.length > 0) {
          updated.course = matchingCourses[0]?.name || matchingCourses[0]?.courseName || '';
          updated.courseId = matchingCourses[0]?.id || matchingCourses[0]?._id || '';
          if (matchingCourses[0]?.degreeType) {
            updated.degreeType = matchingCourses[0].degreeType;
          }
        } else {
          updated.course = '';
          updated.courseId = '';
        }

        const codeForReg = deptCode || (val ? val.substring(0, 3).toUpperCase() : 'ST');
        updated.id = generateRegNo(codeForReg, students);
        updated.admissionNo = updated.id;
      }

      if (field === 'course') {
        updated.course = val;
        const matchedCourse = courses.find(c => (c.name === val || c.courseName === val));
        if (matchedCourse) {
          updated.courseId = matchedCourse.id || matchedCourse._id || '';
          if (matchedCourse.degreeType) {
            updated.degreeType = matchedCourse.degreeType;
          }
        }
      }

      if (field === 'hostel') {
        updated.dormFacility = val === 'Yes' || val === 'yes';
        updated.hostelRequired = updated.dormFacility ? 'yes' : 'no';
      }

      if (field === 'transport') {
        updated.busFacility = val === 'Yes' || val === 'yes';
        updated.transportRequired = updated.busFacility ? 'yes' : 'no';
      }

      return updated;
    });
  };

  const handleQualificationChange = (index, field, value) => {
    const updated = [...form.qualifications];
    updated[index] = { ...updated[index], [field]: value };
    setForm(prev => ({ ...prev, qualifications: updated }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    const firstDept = departments[0]?.name || '';
    const deptCode = departments[0]?.code || firstDept.substring(0, 3).toUpperCase();
    setForm({
      ...EMPTY_FORM,
      dept: firstDept,
      department: firstDept,
      id: generateRegNo(deptCode, students),
      admissionNo: generateRegNo(deptCode, students)
    });
    setEditingStudentId(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleProceedToConfirmation = (e) => {
    e?.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrorMsg('Please enter both First Name and Last Name.');
      return;
    }

    if (!form.id.trim()) {
      const fallbackDept = departments[0]?.code || 'ST';
      const newId = generateRegNo(fallbackDept, students);
      setForm(prev => ({ ...prev, id: newId, admissionNo: newId }));
    }

    if (!form.receiptNumber) {
      setForm(prev => ({ ...prev, receiptNumber: `REC-${Date.now()}` }));
    }

    setActiveTab(2); // Go to Step 2: Verification (Confirm)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedFromStep2ToStep3 = (e) => {
    e?.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setActiveTab(3); // Go to Step 3: First Year New Admission Form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedFromStep3ToStep4 = (e) => {
    e?.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrorMsg('Please enter both First Name and Last Name.');
      return;
    }

    if (!form.department && !form.dept) {
      setErrorMsg('Please select a Department.');
      return;
    }

    if (!form.course) {
      setErrorMsg('Please select a Course.');
      return;
    }

    setActiveTab(4); // Go to Step 4: Final Summary & Full-Page View
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async (autoPrint = false) => {
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const fullName = form.name.trim() || [form.firstName, form.midName, form.lastName].filter(Boolean).join(' ').trim();
      const generatedId = form.id || form.admissionNo || generateRegNo(form.department, students);
      const generatedRecNo = form.receiptNumber || `REC-${Date.now()}`;

      const payload = {
        ...form,
        id: generatedId,
        admissionNo: generatedId,
        name: fullName,
        receiptNumber: generatedRecNo,
        paymentDate: new Date(),
        email: form.email || `${form.firstName.toLowerCase()}.${Date.now().toString().slice(-4)}@college.edu`,
        transportRequired: form.transport === 'Yes' || form.busFacility ? 'yes' : 'no',
        hostelRequired: form.hostel === 'Yes' || form.dormFacility ? 'yes' : 'no'
      };

      if (editingStudentId) {
        await updateStudent(editingStudentId, payload);
        setSuccessMsg(`Student Admission Updated Successfully: ${generatedId}`);
      } else {
        await createStudent(payload);
        if (Number(form.amountPaid) > 0) {
          try {
            await createFee({
              studentId: generatedId,
              studentName: fullName,
              department: form.department || form.dept || 'General',
              semester: `Sem ${form.semester || 1}`,
              feeType: 'Tuition Fee',
              totalFees: Number(form.totalFee) || Number(form.amountPaid),
              paidAmount: Number(form.amountPaid),
              paymentMode: 'Cash',
              receiptNo: generatedRecNo,
              paymentDate: new Date(),
            });
          } catch (feeErr) {
            console.warn('Auto fee creation note:', feeErr);
          }
        }
        setSuccessMsg(`First Year New Admission Confirmed: ${generatedId} (Receipt: ${generatedRecNo})`);
      }

      await loadInitialData();

      if (autoPrint) {
        printReceiptDirect(payload);
      }

      setTimeout(() => {
        setActiveTab(5); // Switch to Step 5: Confirmed Directory view
      }, 1500);

    } catch (err) {
      console.error('Admission submit failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to confirm admission. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudentId(student.id || student._id);
    setForm({
      ...EMPTY_FORM,
      ...student,
      firstName: student.firstName || (student.name ? student.name.split(' ')[0] : ''),
      lastName: student.lastName || (student.name ? student.name.split(' ').slice(1).join(' ') : ''),
      department: student.dept || student.department || '',
      dept: student.dept || student.department || '',
      course: student.course || '',
      hostel: student.hostelRequired === 'yes' ? 'Yes' : 'No',
      transport: student.transportRequired === 'yes' ? 'Yes' : 'No',
      feeBreakdown: student.feeBreakdown || { ...DEFAULT_FEE_BREAKDOWN, tuitionFee: student.totalFee || 0 }
    });
    setActiveTab(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter directory students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (s.name || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q) ||
        (s.dept || s.department || '').toLowerCase().includes(q) ||
        (s.course || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q);

      const matchYear = filterAcademicYear === 'All' || s.academicYear === filterAcademicYear;
      const matchDept = filterDept === 'All' || s.dept === filterDept || s.department === filterDept;

      return matchSearch && matchYear && matchDept;
    });
  }, [students, searchQuery, filterAcademicYear, filterDept]);

  return (
    <div className="erp-container" style={{ height: 'auto', minHeight: '100vh', padding: '16px', background: '#f0f4f8' }}>
      {/* Top Header & Step Navigation */}
      <div style={{
        background: '#ffffff',
        borderRadius: '8px',
        padding: '12px 20px',
        border: '1px solid #cbd5e1',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a5f' }}>
              COLLEGE ERP — ADMISSION & FEE DESK
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* 5-Step Tab Navigator */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab(1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              border: activeTab === 1 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              background: activeTab === 1 ? '#2563eb' : '#ffffff',
              color: activeTab === 1 ? '#ffffff' : '#475569'
            }}
          >
            <UserPlus size={16} /> Step 1: Admission Form
          </button>

          <button
            onClick={() => {
              if (form.firstName) setActiveTab(2);
              else handleProceedToConfirmation();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              border: activeTab === 2 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              background: activeTab === 2 ? '#2563eb' : '#ffffff',
              color: activeTab === 2 ? '#ffffff' : '#475569'
            }}
          >
            <CheckCircle size={16} /> Step 2: Verification (Confirm)
          </button>

          <button
            onClick={() => {
              if (form.firstName) setActiveTab(3);
              else handleProceedToConfirmation();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              border: activeTab === 3 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              background: activeTab === 3 ? '#2563eb' : '#ffffff',
              color: activeTab === 3 ? '#ffffff' : '#475569'
            }}
          >
            <Award size={16} /> Step 3: First Year New Admission
          </button>

          <button
            onClick={() => {
              if (form.firstName) setActiveTab(4);
              else handleProceedToConfirmation();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              border: activeTab === 4 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              background: activeTab === 4 ? '#2563eb' : '#ffffff',
              color: activeTab === 4 ? '#ffffff' : '#475569'
            }}
          >
            <Printer size={16} /> Step 4: Admission Summary & Print
          </button>

          <button
            onClick={() => setActiveTab(5)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              border: activeTab === 5 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              background: activeTab === 5 ? '#2563eb' : '#ffffff',
              color: activeTab === 5 ? '#ffffff' : '#475569'
            }}
          >
            <FileText size={16} /> Step 5: Admission Directory ({students.length})
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#dcfce7',
          color: '#15803d',
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #86efac',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#fee2e2',
          color: '#b91c1c',
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #fca5a5',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: STEP 1 - ADMISSION FORM (EXACT MATCH FOR IMAGE 1)                 */}
      {/* ========================================================================= */}
      {activeTab === 1 && (
        <form noValidate onSubmit={handleProceedToConfirmation}>
          <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
            <div style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#000000', fontWeight: '500' }}>
                In student new admission list we can enter the student academic details for new student.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #7ba7cc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}>
              {/* Header Tab Bar matching Image 1: [Icon] Admission */}
              <div style={{
                background: 'linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%)',
                borderBottom: '1px solid #90caf9',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  background: '#f59e0b',
                  color: '#ffffff',
                  borderRadius: '3px',
                  padding: '2px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px'
                }}>
                  <FolderOpen size={13} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>
                  Admission
                </span>
              </div>

              <div style={{ padding: '20px 24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '150px 1fr 160px 1fr',
                  gap: '10px 16px',
                  alignItems: 'center'
                }}>
                  
                  {/* Row 1: First Name | Last Name */}
                  <div style={labelStyle}>First Name</div>
                  <div>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => handleChange('firstName', e.target.value)}
                      placeholder="priya"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Last Name</div>
                  <div>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => handleChange('lastName', e.target.value)}
                      placeholder="r"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 2: Father's Name | Mother's name */}
                  <div style={labelStyle}>Father's Name</div>
                  <div>
                    <input
                      type="text"
                      value={form.fatherName}
                      onChange={e => handleChange('fatherName', e.target.value)}
                      placeholder="rajasekar m"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Mother's name</div>
                  <div>
                    <input
                      type="text"
                      value={form.motherName}
                      onChange={e => handleChange('motherName', e.target.value)}
                      placeholder="latha r"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 3: Gender | Date of birth */}
                  <div style={labelStyle}>Gender</div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#000' }}>
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        checked={form.gender === 'Female'}
                        onChange={e => handleChange('gender', e.target.value)}
                      /> Female
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#000' }}>
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        checked={form.gender === 'Male'}
                        onChange={e => handleChange('gender', e.target.value)}
                      /> Male
                    </label>
                  </div>

                  <div style={labelStyle}>Date of birth</div>
                  <div>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={e => handleChange('dob', e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 4: Place of Birth | Blood Group */}
                  <div style={labelStyle}>Place of Birth</div>
                  <div>
                    <input
                      type="text"
                      value={form.placeOfBirth}
                      onChange={e => handleChange('placeOfBirth', e.target.value)}
                      placeholder="chennai"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Blood Group</div>
                  <div>
                    <select
                      value={form.bloodGroup}
                      onChange={e => handleChange('bloodGroup', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 5: Nationality | Religion */}
                  <div style={labelStyle}>Nationality</div>
                  <div>
                    <select
                      value={form.nationality}
                      onChange={e => handleChange('nationality', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Indian">Indian</option>
                      <option value="NRI">NRI</option>
                      <option value="Foreigner">Foreigner</option>
                    </select>
                  </div>

                  <div style={labelStyle}>Religion</div>
                  <div>
                    <select
                      value={form.religion}
                      onChange={e => handleChange('religion', e.target.value)}
                      style={inputStyle}
                    >
                      {RELIGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 6: Community | Caste */}
                  <div style={labelStyle}>Community</div>
                  <div>
                    <select
                      value={form.community}
                      onChange={e => handleChange('community', e.target.value)}
                      style={inputStyle}
                    >
                      {COMMUNITIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={labelStyle}>Caste</div>
                  <div>
                    <input
                      type="text"
                      value={form.caste}
                      onChange={e => handleChange('caste', e.target.value)}
                      placeholder="Agamudayar"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 7: City | Country */}
                  <div style={labelStyle}>City</div>
                  <div>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => handleChange('city', e.target.value)}
                      placeholder="chennai"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Country</div>
                  <div>
                    <input
                      type="text"
                      value={form.country}
                      onChange={e => handleChange('country', e.target.value)}
                      placeholder="India"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 8: State | E-mail Id */}
                  <div style={labelStyle}>State</div>
                  <div>
                    <input
                      type="text"
                      value={form.state}
                      onChange={e => handleChange('state', e.target.value)}
                      placeholder="tamilnadu"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>E-mail Id</div>
                  <div>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="mpriya123@gmail.com"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 9: Pin code | Handicapped */}
                  <div style={labelStyle}>Pin code</div>
                  <div>
                    <input
                      type="text"
                      value={form.pincode}
                      onChange={e => handleChange('pincode', e.target.value)}
                      placeholder="600089"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Handicapped</div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#000' }}>
                      <input
                        type="radio"
                        name="handicapped"
                        value="Yes"
                        checked={form.handicapped === 'Yes'}
                        onChange={e => handleChange('handicapped', e.target.value)}
                      /> Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#000' }}>
                      <input
                        type="radio"
                        name="handicapped"
                        value="No"
                        checked={form.handicapped === 'No' || !form.handicapped}
                        onChange={e => handleChange('handicapped', e.target.value)}
                      /> No
                    </label>
                  </div>

                  {/* Row 10: Phone no | Mother tongue */}
                  <div style={labelStyle}>Phone no</div>
                  <div>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="9000234617"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Mother tongue</div>
                  <div>
                    <input
                      type="text"
                      value={form.motherTongue}
                      onChange={e => handleChange('motherTongue', e.target.value)}
                      placeholder="tamil"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 11: Student Photo | Community Certificate no */}
                  <div style={labelStyle}>Student Photo</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ fontSize: '12px', width: '100%' }}
                    />
                    {form.photoUrl && (
                      <img
                        src={form.photoUrl}
                        alt="Preview"
                        style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #7ba7cc', flexShrink: 0 }}
                      />
                    )}
                  </div>

                  <div style={labelStyle}>Community Certificate no</div>
                  <div>
                    <input
                      type="text"
                      value={form.communityCertNo}
                      onChange={e => handleChange('communityCertNo', e.target.value)}
                      placeholder="58694"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 12: Father's Occupation | Guardian Name */}
                  <div style={labelStyle}>Father's Occupation</div>
                  <div>
                    <input
                      type="text"
                      value={form.fatherOccupation}
                      onChange={e => handleChange('fatherOccupation', e.target.value)}
                      placeholder="clerck"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Guardian Name</div>
                  <div>
                    <input
                      type="text"
                      value={form.guardianName}
                      onChange={e => handleChange('guardianName', e.target.value)}
                      placeholder=""
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 13: Yearly Income | Guardian Phone */}
                  <div style={labelStyle}>Yearly Income</div>
                  <div>
                    <input
                      type="text"
                      value={form.yearlyIncome}
                      onChange={e => handleChange('yearlyIncome', e.target.value)}
                      placeholder="150000"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Guardian Phone</div>
                  <div>
                    <input
                      type="text"
                      value={form.guardianPhone}
                      onChange={e => handleChange('guardianPhone', e.target.value)}
                      placeholder="07299188844"
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 14: Father's Phone no | Guardian Email Id */}
                  <div style={labelStyle}>Father's Phone no</div>
                  <div>
                    <input
                      type="text"
                      value={form.fatherPhone}
                      onChange={e => handleChange('fatherPhone', e.target.value)}
                      placeholder="987654321"
                      style={inputStyle}
                    />
                  </div>

                  <div style={labelStyle}>Guardian Email Id</div>
                  <div>
                    <input
                      type="email"
                      value={form.guardianEmail}
                      onChange={e => handleChange('guardianEmail', e.target.value)}
                      placeholder=""
                      style={inputStyle}
                    />
                  </div>

                  {/* Row 15: Father's Email Id | Guardian Address */}
                  <div style={labelStyle}>Father's Email Id</div>
                  <div>
                    <input
                      type="email"
                      value={form.fatherEmail}
                      onChange={e => handleChange('fatherEmail', e.target.value)}
                      placeholder="raja123@gmail.com"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ ...labelStyle, alignSelf: 'start', paddingTop: '6px' }}>Guardian Address</div>
                  <div style={{ gridRow: 'span 2' }}>
                    <textarea
                      value={form.guardianAddress}
                      onChange={e => handleChange('guardianAddress', e.target.value)}
                      placeholder=""
                      rows={3}
                      style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
                    />
                  </div>

                  {/* Row 16: Address : */}
                  <div style={{ ...labelStyle, alignSelf: 'start', paddingTop: '6px' }}>Address :</div>
                  <div>
                    <textarea
                      value={form.address}
                      onChange={e => handleChange('address', e.target.value)}
                      placeholder="6 anna salai,perambur, chennai-600082"
                      rows={3}
                      style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
                    />
                  </div>

                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '28px', borderTop: '1px solid #cbd5e1', paddingTop: '18px' }}>
                  <button
                    type="submit"
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '8px 32px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Confirm
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '8px 24px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STEP 2 - CONFIRMATION & VERIFICATION VIEW (IMAGE 2)               */}
      {/* ========================================================================= */}
      {activeTab === 2 && (
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#000000', letterSpacing: '-0.2px' }}>
              Click on the “confirm” button after entering all details
            </h2>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '4px',
            border: '2px solid #ef4444',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            padding: '24px 28px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '20px' }}>
            {/* Left Column Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>First Name :</span><span style={summaryValStyle}>{form.firstName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Last Name :</span><span style={summaryValStyle}>{form.lastName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Father's Name :</span><span style={summaryValStyle}>{form.fatherName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Mother's name :</span><span style={summaryValStyle}>{form.motherName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Gender :</span><span style={summaryValStyle}>{form.gender || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Date of birth :</span><span style={summaryValStyle}>{form.dob || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Place of Birth :</span><span style={summaryValStyle}>{form.placeOfBirth || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Blood Group :</span><span style={summaryValStyle}>{form.bloodGroup || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Caste :</span><span style={summaryValStyle}>{form.caste || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Religion :</span><span style={summaryValStyle}>{form.religion || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Community Certificate no :</span><span style={summaryValStyle}>{form.communityCertNo || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Father's Occupation :</span><span style={summaryValStyle}>{form.fatherOccupation || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Father's Phone no :</span><span style={summaryValStyle}>{form.fatherPhone || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Father's Email Id :</span><span style={summaryValStyle}>{form.fatherEmail || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Address :</span><span style={summaryValStyle}>{form.address || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>city :</span><span style={summaryValStyle}>{form.city || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>State :</span><span style={summaryValStyle}>{form.state || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Pin code :</span><span style={summaryValStyle}>{form.pincode || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>E-mail Id :</span><span style={summaryValStyle}>{form.email || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Phone no :</span><span style={summaryValStyle}>{form.phone || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Mother tongue :</span><span style={summaryValStyle}>{form.motherTongue || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Handicapped :</span><span style={summaryValStyle}>{form.handicapped || 'No'}</span></div>
            </div>

            {/* Right Column Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Yearly Income :</span><span style={summaryValStyle}>{form.yearlyIncome || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Nationality :</span><span style={summaryValStyle}>{form.nationality || 'Indian'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Community :</span><span style={summaryValStyle}>{form.community || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Guardian Name :</span><span style={summaryValStyle}>{form.guardianName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Guardian Phone no :</span><span style={summaryValStyle}>{form.guardianPhone || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Guardian E-mail :</span><span style={summaryValStyle}>{form.guardianEmail || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Guardian Address :</span><span style={summaryValStyle}>{form.guardianAddress || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Country :</span><span style={summaryValStyle}>{form.country || 'India'}</span></div>
              
              <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1', margin: '8px 0' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Student Photo</div>
                {form.photoUrl ? (
                  <img
                    src={form.photoUrl}
                    alt="Student"
                    style={{ width: '130px', height: '150px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #cbd5e1', margin: '0 auto', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '130px', height: '150px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#94a3b8' }}>
                    <User size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Qualifications Entry Table (Image 2) */}
          <div style={{ marginTop: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a5f', marginBottom: '8px' }}>
              Academic Qualification / Prior School Education Details
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  <th style={thStyle}>Study</th>
                  <th style={thStyle}>Institute Name</th>
                  <th style={thStyle}>University/Board</th>
                  <th style={thStyle}>Percentage</th>
                  <th style={thStyle}>Pass out year</th>
                  <th style={thStyle}>Mark sheet sno</th>
                </tr>
              </thead>
              <tbody>
                {form.qualifications.map((q, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={q.study}
                        onChange={e => handleQualificationChange(idx, 'study', e.target.value)}
                        style={{ ...inputStyle, padding: '4px 6px', height: '28px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={q.institute}
                        onChange={e => handleQualificationChange(idx, 'institute', e.target.value)}
                        placeholder="e.g. Holy child"
                        style={{ ...inputStyle, padding: '4px 6px', height: '28px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={q.board}
                        onChange={e => handleQualificationChange(idx, 'board', e.target.value)}
                        placeholder="matriculation"
                        style={{ ...inputStyle, padding: '4px 6px', height: '28px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={q.percentage}
                        onChange={e => handleQualificationChange(idx, 'percentage', e.target.value)}
                        placeholder="99.2"
                        style={{ ...inputStyle, padding: '4px 6px', height: '28px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={q.passYear}
                        onChange={e => handleQualificationChange(idx, 'passYear', e.target.value)}
                        placeholder="2009"
                        style={{ ...inputStyle, padding: '4px 6px', height: '28px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={q.marksheetNo}
                        onChange={e => handleQualificationChange(idx, 'marksheetNo', e.target.value)}
                        placeholder="12356"
                        style={{ ...inputStyle, padding: '4px 6px', height: '28px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Buttons (Confirm and Back matching Image 2) */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={handleProceedFromStep2ToStep3}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 32px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Confirm
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 28px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STEP 3 - 1.2 FIRST YEAR NEW ADMISSION FORM (IMAGE 3)              */}
      {/* ========================================================================= */}
      {activeTab === 3 && (
        <form onSubmit={handleProceedFromStep3ToStep4}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                1.2 First Year New Admission form:
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                In First year New Admission form we can enter the academic details for new student.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '2px solid #ef4444',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#f8fafc',
                borderBottom: '2px solid #ef4444',
                padding: '12px 20px',
                textAlign: 'center'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: '800',
                  color: '#d946ef',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  FIRST YEAR NEW ADMISSION
                </h3>
              </div>

              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                  {/* Previous Admission No */}
                  <div>
                    <label style={labelStyle}>Previous Admission No</label>
                    <input
                      type="text"
                      value={form.previousAdmissionNo}
                      onChange={e => handleChange('previousAdmissionNo', e.target.value)}
                      placeholder="536"
                      style={inputStyle}
                    />
                  </div>

                  {/* New Admission No */}
                  <div>
                    <label style={labelStyle}>New Admission No *</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        required
                        value={form.id || form.admissionNo}
                        onChange={e => {
                          handleChange('id', e.target.value);
                          handleChange('admissionNo', e.target.value);
                        }}
                        placeholder="151"
                        style={{ ...inputStyle, fontWeight: '700', color: '#1e3a5f' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const deptObj = departments.find(d => (d.name === form.department || d.id === form.department));
                          const code = deptObj?.code || form.department?.substring(0, 3).toUpperCase() || 'ST';
                          const newId = generateRegNo(code, students);
                          handleChange('id', newId);
                          handleChange('admissionNo', newId);
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '0 8px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}
                        title="Auto Generate Admission No"
                      >
                        Gen
                      </button>
                    </div>
                  </div>

                  {/* First Name */}
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={e => handleChange('firstName', e.target.value)}
                      placeholder="karthika"
                      style={inputStyle}
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label style={labelStyle}>Last Name *</label>
                    <input
                      type="text"
                      required
                      value={form.lastName}
                      onChange={e => handleChange('lastName', e.target.value)}
                      placeholder="A"
                      style={inputStyle}
                    />
                  </div>

                  {/* Date of birth */}
                  <div>
                    <label style={labelStyle}>Date of birth</label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={e => handleChange('dob', e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  {/* Father's Name */}
                  <div>
                    <label style={labelStyle}>Father's Name *</label>
                    <input
                      type="text"
                      required
                      value={form.fatherName}
                      onChange={e => handleChange('fatherName', e.target.value)}
                      placeholder="Adhikesaven R"
                      style={inputStyle}
                    />
                  </div>

                  {/* Mother's name */}
                  <div>
                    <label style={labelStyle}>Mother's name</label>
                    <input
                      type="text"
                      value={form.motherName}
                      onChange={e => handleChange('motherName', e.target.value)}
                      placeholder="Rani A"
                      style={inputStyle}
                    />
                  </div>

                  {/* Community */}
                  <div>
                    <label style={labelStyle}>Community</label>
                    <select
                      value={form.community}
                      onChange={e => handleChange('community', e.target.value)}
                      style={inputStyle}
                    >
                      {COMMUNITIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Phone No */}
                  <div>
                    <label style={labelStyle}>Phone No *</label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="9875412360"
                      style={inputStyle}
                    />
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label style={labelStyle}>Academic Year *</label>
                    <input
                      type="text"
                      value={form.academicYear}
                      onChange={e => handleChange('academicYear', e.target.value)}
                      placeholder="2015 - 2018"
                      style={inputStyle}
                    />
                  </div>

                  {/* Type of Degree */}
                  <div>
                    <label style={labelStyle}>Type of Degree *</label>
                    <select
                      value={form.degreeType}
                      onChange={e => handleChange('degreeType', e.target.value)}
                      style={inputStyle}
                    >
                      {DEGREE_TYPES.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label style={labelStyle}>Department *</label>
                    <select
                      value={form.department || form.dept || ''}
                      onChange={e => {
                        handleChange('department', e.target.value);
                        handleChange('dept', e.target.value);
                      }}
                      style={inputStyle}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d, i) => {
                        const dName = d.name || d.departmentName || d;
                        return (
                          <option key={d.id || d._id || i} value={dName}>
                            {dName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Course */}
                  <div>
                    <label style={labelStyle}>Course *</label>
                    <select
                      value={form.course || ''}
                      onChange={e => handleChange('course', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">
                        {!(form.department || form.dept)
                          ? 'Select Department First'
                          : availableCourses.length === 0
                          ? 'No courses found for this department'
                          : 'Select Course'}
                      </option>
                      {availableCourses.map((c, i) => {
                        const cName = c.name || c.courseName || c;
                        return (
                          <option key={c.id || c._id || i} value={cName}>
                            {cName} {c.code ? `(${c.code})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label style={labelStyle}>Semester *</label>
                    <select
                      value={form.semester}
                      onChange={e => handleChange('semester', Number(e.target.value))}
                      style={inputStyle}
                    >
                      {SEMESTERS_LIST.map(s => (
                        <option key={s} value={s}>semester - {s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date of Admission */}
                  <div>
                    <label style={labelStyle}>Date of Admission</label>
                    <input
                      type="date"
                      value={form.admissionDate}
                      onChange={e => handleChange('admissionDate', e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  {/* Hostel */}
                  <div>
                    <label style={labelStyle}>Hostel</label>
                    <div style={{ display: 'flex', gap: '16px', height: '32px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        <input
                          type="radio"
                          name="hostelStep3"
                          value="Yes"
                          checked={form.hostel === 'Yes'}
                          onChange={e => handleChange('hostel', e.target.value)}
                        /> yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        <input
                          type="radio"
                          name="hostelStep3"
                          value="No"
                          checked={form.hostel === 'No' || !form.hostel}
                          onChange={e => handleChange('hostel', e.target.value)}
                        /> No
                      </label>
                    </div>
                  </div>

                  {/* Transport */}
                  <div>
                    <label style={labelStyle}>Transport</label>
                    <div style={{ display: 'flex', gap: '16px', height: '32px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        <input
                          type="radio"
                          name="transportStep3"
                          value="Yes"
                          checked={form.transport === 'Yes'}
                          onChange={e => handleChange('transport', e.target.value)}
                        /> yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        <input
                          type="radio"
                          name="transportStep3"
                          value="No"
                          checked={form.transport === 'No' || !form.transport}
                          onChange={e => handleChange('transport', e.target.value)}
                        /> No
                      </label>
                    </div>
                  </div>
                </div>

                {/* Step 3 Form Buttons (Submit & Reset matching Image 3) */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '28px' }}>
                  <button
                    type="submit"
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '10px 32px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Submit
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '10px 24px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(2);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      background: '#64748b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '10px 20px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STEP 4 - NEW ADMISSION FINAL SUMMARY & RECEIPT (IMAGE 4)          */}
      {/* ========================================================================= */}
      {activeTab === 4 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          maxWidth: '850px',
          margin: '0 auto'
        }}>
          {/* Top ERP Header Banner (Image 4) */}
          <div style={{
            background: '#ec4899',
            color: '#ffffff',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>
              ERP Management System
            </h1>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>
              Date : {new Date().toLocaleDateString('en-US')} Time :{new Date().toLocaleTimeString('en-US')}
            </span>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '10px 16px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0369a1' }}>
                New Admission
              </h2>
            </div>

            {/* Summary Key-Values (Image 4 exact list) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>First Name</span><span style={summaryValStyle}>{form.firstName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Last Name</span><span style={summaryValStyle}>{form.lastName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Gender</span><span style={summaryValStyle}>{form.gender || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Date of birth</span><span style={summaryValStyle}>{form.dob || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Father's Name</span><span style={summaryValStyle}>{form.fatherName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Mother's name</span><span style={summaryValStyle}>{form.motherName || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Blood Group</span><span style={summaryValStyle}>{form.bloodGroup || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Phone no</span><span style={summaryValStyle}>{form.phone || form.fatherPhone || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Email</span><span style={summaryValStyle}>{form.email || form.fatherEmail || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Academic Year</span><span style={summaryValStyle}>{form.academicYear || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Type of Degree</span><span style={summaryValStyle}>{form.degreeType || 'UG'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Course</span><span style={{ ...summaryValStyle, fontWeight: '700' }}>{form.course || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Department</span><span style={{ ...summaryValStyle, fontWeight: '700' }}>{form.department || form.dept || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Semester</span><span style={summaryValStyle}>{form.semester || 1}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Section</span><span style={summaryValStyle}>{form.section || 'A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Date of Admission</span><span style={summaryValStyle}>{form.admissionDate || 'N/A'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Hostel</span><span style={summaryValStyle}>{form.hostel || 'No'}</span></div>
              <div style={summaryRowStyle}><span style={summaryLabelStyle}>Transport</span><span style={summaryValStyle}>{form.transport || 'No'}</span></div>
              
              <div style={{ borderTop: '2px dashed #cbd5e1', margin: '8px 0' }} />
              
              <div style={summaryRowStyle}><span style={{ ...summaryLabelStyle, fontWeight: '700', color: '#16a34a' }}>Paid Amount(Rs)</span><span style={{ ...summaryValStyle, color: '#16a34a', fontWeight: '800', fontSize: '15px' }}>₹{Number(form.amountPaid || 0).toLocaleString()}</span></div>
              <div style={summaryRowStyle}><span style={{ ...summaryLabelStyle, fontWeight: '700', color: '#dc2626' }}>Balance Amount(Rs)</span><span style={{ ...summaryValStyle, color: '#dc2626', fontWeight: '800', fontSize: '15px' }}>₹{Number(form.balanceFee || 0).toLocaleString()}</span></div>
              <div style={summaryRowStyle}><span style={{ ...summaryLabelStyle, fontWeight: '800', color: '#1e40af' }}>Total Amount(Rs)</span><span style={{ ...summaryValStyle, color: '#1e40af', fontWeight: '900', fontSize: '16px' }}>₹{Number(form.totalFee || 0).toLocaleString()}</span></div>
            </div>

            {/* Bottom 3 Action Buttons (Image 4 exact buttons: Back, Submit, save&print) */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '9px 24px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit(false)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '9px 26px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit(true)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '9px 24px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={15} /> save&print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STEP 5 - REGISTERED ADMISSION DIRECTORY                            */}
      {/* ========================================================================= */}
      {activeTab === 5 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e3a5f' }}>
              Confirmed Student Admissions Directory ({filteredStudents.length})
            </h2>

            <button
              onClick={() => {
                handleReset();
                setActiveTab(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> New First Year Admission
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by Name, Reg No, Department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '32px' }}
              />
            </div>

            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
            >
              <option value="All">All Departments</option>
              {departments.map((d, i) => {
                const dName = d.name || d.departmentName || d;
                return (
                  <option key={d.id || d._id || i} value={dName}>
                    {dName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={thStyle}>Reg / Admission No</th>
                  <th style={thStyle}>Student Name</th>
                  <th style={thStyle}>Department & Course</th>
                  <th style={thStyle}>Year & Sem</th>
                  <th style={thStyle}>Total Fee</th>
                  <th style={thStyle}>Paid</th>
                  <th style={thStyle}>Balance</th>
                  <th style={thStyle}>Receipt No</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No students found. Click <b>New First Year Admission</b> to register.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s._id || s.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#1e3a5f' }}>{s.id || s.admissionNo}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{s.name || `${s.firstName || ''} ${s.lastName || ''}`}</td>
                      <td style={tdStyle}>{s.course || 'N/A'} — {s.dept || s.department || 'N/A'}</td>
                      <td style={tdStyle}>Sem {s.semester || 1} ({s.academicYear || '2026-2027'})</td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#1e40af' }}>₹{Number(s.totalFee || s.totalAmount || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#16a34a' }}>₹{Number(s.amountPaid || s.paidAmount || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#dc2626' }}>₹{Number(s.balanceFee || s.balanceAmount || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#64748b' }}>{s.receiptNumber || 'REC-' + (s.id || '001')}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => printReceiptDirect(s)}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                            title="Print Official Receipt"
                          >
                            <Printer size={13} /> Receipt
                          </button>

                          <button
                            onClick={() => handleEditStudent(s)}
                            style={{
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline helper styles
const labelStyle = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#000000',
  whiteSpace: 'nowrap'
};

const inputStyle = {
  width: '100%',
  height: '28px',
  padding: '2px 8px',
  fontSize: '13px',
  borderRadius: '2px',
  border: '1px solid #7ba7cc',
  background: '#ffffff',
  color: '#000000',
  outline: 'none',
  boxSizing: 'border-box'
};

const feeRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px'
};

const feeLabelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#334155',
  flex: 1
};

const feeInputStyle = {
  width: '140px',
  height: '30px',
  padding: '4px 8px',
  fontSize: '13px',
  fontWeight: '600',
  textAlign: 'right',
  borderRadius: '4px',
  border: '1px solid #94a3b8',
  background: '#ffffff',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box'
};

const summaryRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '6px 0',
  borderBottom: '1px dashed #e2e8f0',
  fontSize: '13px'
};

const summaryLabelStyle = {
  fontWeight: '700',
  color: '#334155',
  fontSize: '13px'
};

const summaryValStyle = {
  fontWeight: '700',
  color: '#000000',
  fontSize: '13px',
  textAlign: 'right'
};

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: '700',
  fontSize: '12px',
  border: '1px solid #cbd5e1'
};

const tdStyle = {
  padding: '6px 10px',
  border: '1px solid #cbd5e1'
};

export default StudentRegistration;
