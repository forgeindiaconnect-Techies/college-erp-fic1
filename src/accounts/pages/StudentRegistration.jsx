import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  CreditCard,
  Building2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  Download,
  Plus,
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  Printer,
  Trash2,
  Edit2,
  Search,
  Eye,
  SlidersHorizontal,
  Home,
  Bus,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  getStudents,
  getDepartments,
  getCourses,
  getQuotas,
  createFee
} from '../../api/index';
import useRealtimeSync, { emitERPDataUpdate } from '../../hooks/useRealtimeSync';
import './StudentRegistration.css';

const REAL_COLLEGE_DEPARTMENTS = [
  { id: '1', name: 'History and Arts', code: 'HAA', degree: 'B.A', courses: ['B.A. - History and Arts', 'B.A. - History', 'B.A. - Arts'] },
  { id: '2', name: 'Computer Science Engineering', code: 'CSE', degree: 'B.E', courses: ['B.E. - Computer Science Engineering', 'B.Tech - Computer Science Engineering'] },
  { id: '3', name: 'FOOD AND NUTRITION', code: 'FN', degree: 'B.Sc', courses: ['B.Sc. - Food and Nutrition', 'B.Sc. - Food Science & Nutrition'] },
  { id: '4', name: 'MATHEMATICS', code: 'MATH', degree: 'B.Sc', courses: ['B.Sc. - Mathematics'] },
  { id: '5', name: 'BA TAMIL', code: 'BAT', degree: 'B.A', courses: ['B.A. - Tamil', 'BA Tamil'] }
];

const getDepartmentCourses = (deptName) => {
  const norm = (deptName || '').toLowerCase().trim();
  const match = REAL_COLLEGE_DEPARTMENTS.find(d => 
    d.name.toLowerCase() === norm || 
    norm.includes(d.name.toLowerCase()) || 
    d.name.toLowerCase().includes(norm)
  );
  if (match && match.courses && match.courses.length > 0) return match.courses;
  if (norm.includes('history') || norm.includes('arts')) return ['B.A. - History and Arts', 'B.A. - History', 'B.A. - Arts'];
  if (norm.includes('computer')) return ['B.E. - Computer Science Engineering', 'B.Tech - Computer Science Engineering'];
  if (norm.includes('food') || norm.includes('nutrition')) return ['B.Sc. - Food and Nutrition'];
  if (norm.includes('math')) return ['B.Sc. - Mathematics'];
  if (norm.includes('tamil')) return ['B.A. - Tamil', 'BA Tamil'];
  return [deptName ? `B.A. - ${deptName}` : 'B.A. - History and Arts'];
};

const getDepartmentCourse = (deptName) => {
  const courses = getDepartmentCourses(deptName);
  return courses[0] || 'B.A. - History and Arts';
};

const getDepartmentDegree = (deptName) => {
  const norm = (deptName || '').toLowerCase().trim();
  if (norm.includes('history') || norm.includes('tamil') || norm.includes('arts')) return 'B.A';
  if (norm.includes('computer') || norm.includes('engineering')) return 'B.E';
  if (norm.includes('food') || norm.includes('nutrition') || norm.includes('math')) return 'B.Sc';
  return 'B.A';
};

const getDeptCode = (deptName) => {
  const norm = (deptName || '').toLowerCase().trim();
  if (norm.includes('history')) return 'HAA';
  if (norm.includes('computer')) return 'CSE';
  if (norm.includes('food') || norm.includes('nutrition')) return 'FN';
  if (norm.includes('math')) return 'MATH';
  if (norm.includes('tamil')) return 'BAT';
  return (deptName || 'HAA').substring(0, 3).toUpperCase();
};

const DEGREE_OPTIONS = [
  { code: 'B.A', name: 'B.A (Bachelor of Arts)' },
  { code: 'B.Sc', name: 'B.Sc (Bachelor of Science)' },
  { code: 'B.E', name: 'B.E (Bachelor of Engineering)' }
];

const DEFAULT_QUALIFICATIONS = [
  { study: 'SSLC (10th Standard)', institute: '', board: 'State Board', percentage: '', passYear: '2024', marksheetNo: '' },
  { study: 'HSC (+2 Higher Secondary)', institute: '', board: 'State Board', percentage: '', passYear: '2026', marksheetNo: '' }
];

const DEFAULT_FEE_BREAKDOWN = {
  admissionFee: 5000,
  tuitionFee: 30000,
  specialFee: 4000,
  labFee: 2200,
  otherFee: 0
};

const EMPTY_FORM = {
  _id: '',
  id: '',
  admissionNo: '',
  admissionDate: new Date().toISOString().split('T')[0],
  academicYear: '2026-2027',
  degreeType: 'UG',
  degreeCode: 'B.A',
  dept: 'History and Arts',
  department: 'History and Arts',
  course: 'B.A. - History and Arts',
  semester: 1,
  section: 'A',
  admissionQuota: 'General Quota',
  quotaName: 'General Quota',
  discountAmount: 0,

  // Personal Info
  firstName: '',
  midName: '',
  lastName: '',
  name: '',
  gender: 'Male',
  dob: '',
  placeOfBirth: '',
  bloodGroup: 'Select',
  motherTongue: 'Tamil',
  nationality: 'Indian',
  religion: 'Hindu',
  community: 'BC',
  caste: '',
  aadharNo: '',
  panNo: '',
  handicapped: 'No',

  // Parents
  fatherName: '',
  fatherPhone: '',
  fatherEmail: '',
  fatherOccupation: '',
  motherName: '',
  motherPhone: '',
  motherOccupation: '',
  annualIncome: '',

  // Address
  phone: '',
  email: '',
  address: '',
  city: '',
  district: 'Tirupattur',
  state: 'Tamil Nadu',
  pincode: '',

  // Facilities
  transport: 'No',
  transportRequired: 'no',
  busRoute: '',
  hostel: 'No',
  hostelRequired: 'no',

  // Qualifications
  qualifications: [...DEFAULT_QUALIFICATIONS],

  // Fees
  feeBreakdown: { ...DEFAULT_FEE_BREAKDOWN },
  totalFee: 51500,
  amountPaid: 35000,
  balanceFee: 16500,
  paymentMode: 'Cash',
  paymentStatus: 'Partial',
  receiptNo: '',

  applicationStatus: 'Approved',
  status: 'Active'
};

const generateStudentRegNo = (deptName, studentsList) => {
  const code = getDeptCode(deptName);
  const year = new Date().getFullYear();
  const matching = (studentsList || []).filter(s => (s.id || '').startsWith(`${code}${year}`) || (s.dept === deptName && s.id));
  let maxSeq = 0;
  matching.forEach(s => {
    const parts = String(s.id || '').split('-');
    if (parts.length > 1) {
      const seq = parseInt(parts[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  return `${code}${year}-${String(maxSeq + 1).padStart(3, '0')}`;
};

const StudentRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Wizard Navigation Step (1 to 6)
  const [activeStep, setActiveStep] = useState(1);

  // Master Data
  const [studentsList, setStudentsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState(REAL_COLLEGE_DEPARTMENTS);
  const [coursesList, setCoursesList] = useState([]);
  const [quotasList, setQuotasList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Directory Search
  const [dirSearch, setDirSearch] = useState('');

  // Load Real-time Data from Backend
  const loadData = async () => {
    try {
      setLoading(true);
      const [stuRes, deptRes, coursesRes, quotaRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getCourses ? getCourses().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        getQuotas ? getQuotas().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      const fetchedStudents = Array.isArray(stuRes?.data) ? stuRes.data : (stuRes?.data?.students || []);
      setStudentsList(fetchedStudents);

      if (Array.isArray(deptRes?.data) && deptRes.data.length > 0) {
        setDepartmentsList(deptRes.data);
      } else if (deptRes?.data?.departments && Array.isArray(deptRes.data.departments)) {
        setDepartmentsList(deptRes.data.departments);
      } else {
        setDepartmentsList(REAL_COLLEGE_DEPARTMENTS);
      }

      if (coursesRes?.data) {
        const loadedCourses = Array.isArray(coursesRes.data?.courses) 
          ? coursesRes.data.courses 
          : Array.isArray(coursesRes.data) 
          ? coursesRes.data 
          : coursesRes.data?.data || [];
        setCoursesList(loadedCourses);
      }

      if (quotaRes?.data) {
        const loadedQuotas = quotaRes.data.quotas || quotaRes.data.data || (Array.isArray(quotaRes.data) ? quotaRes.data : []);
        setQuotasList(Array.isArray(loadedQuotas) ? loadedQuotas : []);
      }
    } catch (err) {
      console.error('Error loading real-time student registration data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Generate initial auto reg id
    const count = studentsList.length + 1;
    setForm(prev => ({
      ...prev,
      id: `HAA2026-${String(count).padStart(3, '0')}`,
      admissionNo: `HAA2026-${String(count).padStart(3, '0')}`
    }));
  }, []);

  useRealtimeSync(['students', 'fees', 'hostel', 'transport', 'quotas', 'departments', 'courses', 'admissions'], () => {
    loadData();
  });

  // Dynamic Courses for Department (Real-time DB + fallback)
  const getDepartmentCourses = (deptName) => {
    if (Array.isArray(coursesList) && coursesList.length > 0) {
      const dbCourses = coursesList.filter(c => {
        const cDeptName = typeof c.departmentId === 'object' ? c.departmentId?.name : (c.department || c.departmentName || '');
        const cName = c.name || c.courseName || '';
        return (
          (cDeptName && deptName && (cDeptName.toLowerCase().includes(deptName.toLowerCase()) || deptName.toLowerCase().includes(cDeptName.toLowerCase()))) ||
          (cName && deptName && (cName.toLowerCase().includes(deptName.toLowerCase()) || deptName.toLowerCase().includes(cName.toLowerCase())))
        );
      });
      if (dbCourses.length > 0) {
        return dbCourses.map(c => c.name || c.courseName);
      }
    }

    const norm = (deptName || '').toLowerCase().trim();
    const match = REAL_COLLEGE_DEPARTMENTS.find(d => 
      d.name.toLowerCase() === norm || 
      norm.includes(d.name.toLowerCase()) || 
      d.name.toLowerCase().includes(norm)
    );
    if (match && match.courses && match.courses.length > 0) return match.courses;
    if (norm.includes('history') || norm.includes('arts')) return ['B.A. - History and Arts', 'B.A. - History', 'B.A. - Arts'];
    if (norm.includes('computer')) return ['B.E. - Computer Science Engineering', 'B.Tech - Computer Science Engineering'];
    if (norm.includes('food') || norm.includes('nutrition')) return ['B.Sc. - Food and Nutrition', 'B.Sc. - Food Science & Nutrition'];
    if (norm.includes('math')) return ['B.Sc. - Mathematics'];
    if (norm.includes('tamil')) return ['B.A. - Tamil', 'BA Tamil'];
    return [deptName ? `B.A. - ${deptName}` : 'B.A. - History and Arts'];
  };

  // KPI Calculations
  const totalEnrolled = studentsList.length;
  const totalFeesAssessed = useMemo(() => {
    return studentsList.reduce((acc, s) => acc + (Number(s.totalFee || s.totalAmount || 41200)), 0) || 41200;
  }, [studentsList]);
  const totalCollections = useMemo(() => {
    return studentsList.reduce((acc, s) => acc + (Number(s.amountPaid || s.paidAmount || 35000)), 0) || 35000;
  }, [studentsList]);
  const totalOutstanding = Math.max(0, totalFeesAssessed - totalCollections);

  // Dynamic Degree Levels from Database & Departments
  const dynamicDegreeOptions = useMemo(() => {
    const degreesSet = new Set(['B.A', 'B.Sc', 'B.E']);
    (departmentsList || []).forEach(d => {
      const deg = d.degree || getDepartmentDegree(d.name);
      if (deg) degreesSet.add(deg);
    });
    (coursesList || []).forEach(c => {
      const deg = c.degreeType || (c.name ? c.name.split(' ')[0].replace('.', '') : null);
      if (deg && ['B.A', 'B.Sc', 'B.E', 'B.Tech', 'B.Com', 'M.A', 'M.Sc', 'M.E', 'MBA', 'MCA'].includes(deg)) {
        degreesSet.add(deg);
      }
    });

    const degreeNames = {
      'B.A': 'B.A (Bachelor of Arts)',
      'B.Sc': 'B.Sc (Bachelor of Science)',
      'B.E': 'B.E (Bachelor of Engineering)',
      'B.Tech': 'B.Tech (Bachelor of Technology)',
      'B.Com': 'B.Com (Bachelor of Commerce)',
      'M.A': 'M.A (Master of Arts)',
      'M.Sc': 'M.Sc (Master of Science)',
      'M.E': 'M.E (Master of Engineering)',
      'MBA': 'MBA (Master of Business Admin)',
      'MCA': 'MCA (Master of Computer Apps)'
    };

    return Array.from(degreesSet).map(code => ({
      code,
      name: degreeNames[code] || `${code} Degree`
    }));
  }, [departmentsList, coursesList]);

  // Filtered departments based strictly on currently selected Degree Level
  const filteredDepartments = useMemo(() => {
    const currentDegree = form.degreeCode || 'B.A';
    const filtered = departmentsList.filter(d => {
      const deptDegree = d.degree || getDepartmentDegree(d.name);
      return deptDegree === currentDegree;
    });
    return filtered.length > 0 ? filtered : departmentsList;
  }, [departmentsList, form.degreeCode]);

  // Quotas available strictly for the selected course / department in real-time
  const availableQuotas = useMemo(() => {
    const selectedCourse = (form.course || '').toLowerCase().trim();
    const selectedDept = (form.dept || form.department || '').toLowerCase().trim();

    const list = [
      {
        quotaName: 'General Quota',
        discountType: 'fixed',
        discountValue: 0,
        description: 'Standard admission'
      }
    ];

    if (Array.isArray(quotasList) && quotasList.length > 0) {
      const matched = quotasList.filter(q => {
        if (q.status && q.status.toLowerCase() !== 'active') return false;

        const qCourse = (q.courseName || (typeof q.course === 'object' ? q.course?.name : q.course) || '').toLowerCase().trim();
        const qDept = (q.departmentName || (typeof q.department === 'object' ? q.department?.name : q.department) || '').toLowerCase().trim();

        const hasSpecificCourse = qCourse && qCourse !== 'all' && qCourse !== 'all courses' && qCourse !== '';
        const hasSpecificDept = qDept && qDept !== 'all' && qDept !== 'all departments' && qDept !== '';

        if (hasSpecificCourse) {
          return (
            qCourse === selectedCourse || 
            selectedCourse.includes(qCourse) || 
            qCourse.includes(selectedCourse)
          );
        }

        if (hasSpecificDept) {
          return (
            qDept === selectedDept || 
            selectedDept.includes(qDept) || 
            qDept.includes(selectedDept)
          );
        }

        return true;
      });

      matched.forEach(q => {
        if (!list.some(existing => existing.quotaName.toLowerCase() === q.quotaName.toLowerCase())) {
          const val = Number(q.discountValue || q.discountAmount || 0);
          const desc = q.discountType === 'percentage'
            ? `${val}% concession`
            : `₹${val.toLocaleString()} concession`;

          list.push({
            quotaName: q.quotaName,
            discountType: q.discountType || 'fixed',
            discountValue: val,
            description: desc
          });
        }
      });
    }

    return list;
  }, [quotasList, form.course, form.dept]);

  // Field change handler
  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'firstName' || field === 'midName' || field === 'lastName') {
        const parts = [
          field === 'firstName' ? value : prev.firstName,
          field === 'midName' ? value : prev.midName,
          field === 'lastName' ? value : prev.lastName
        ].filter(Boolean);
        updated.name = parts.join(' ');
      }

      if (field === 'degreeCode' || field === 'degreeType') {
        const matchingDepts = departmentsList.filter(d => getDepartmentDegree(d.name) === value);
        const firstDept = matchingDepts[0]?.name || (value === 'B.Sc' ? 'FOOD AND NUTRITION' : value === 'B.E' ? 'Computer Science Engineering' : 'History and Arts');
        const availableCourses = getDepartmentCourses(firstDept);
        const firstCourse = availableCourses[0] || getDepartmentCourse(firstDept);

        updated.degreeCode = value;
        updated.degreeType = value.startsWith('M') ? 'PG' : 'UG';
        updated.dept = firstDept;
        updated.department = firstDept;
        updated.course = firstCourse;

        if (!selectedStudentId) {
          const autoId = generateStudentRegNo(firstDept, studentsList);
          updated.id = autoId;
          updated.admissionNo = autoId;
        }
      }

      if (field === 'dept' || field === 'department') {
        const matchingDept = REAL_COLLEGE_DEPARTMENTS.find(d => 
          d.name.toLowerCase() === (value || '').toLowerCase() || 
          (value || '').toLowerCase().includes(d.name.toLowerCase()) || 
          d.name.toLowerCase().includes((value || '').toLowerCase())
        );
        const deptDegree = matchingDept ? matchingDept.degree : getDepartmentDegree(value);
        const availableCourses = getDepartmentCourses(value);
        const defaultCourse = availableCourses[0] || getDepartmentCourse(value);

        updated.dept = value;
        updated.department = value;
        updated.degreeCode = deptDegree;
        updated.degreeType = deptDegree.startsWith('M') ? 'PG' : 'UG';
        updated.course = defaultCourse;

        if (!selectedStudentId) {
          const autoId = generateStudentRegNo(value, studentsList);
          updated.id = autoId;
          updated.admissionNo = autoId;
        }
      }

      if (field === 'admissionQuota' || field === 'quotaName') {
        const selectedQuotaObj = availableQuotas.find(q => q.quotaName.toLowerCase() === (value || '').toLowerCase());
        let discount = 0;
        const baseTotal = Number(updated.totalFee || 41200);

        if (selectedQuotaObj) {
          if (selectedQuotaObj.discountType === 'percentage') {
            discount = Math.round((baseTotal * Number(selectedQuotaObj.discountValue || 0)) / 100);
          } else {
            discount = Number(selectedQuotaObj.discountValue || 0);
          }
        } else if (value.toLowerCase().includes('sports') || value.toLowerCase().includes('merit')) {
          discount = 15000;
        } else if (value.toLowerCase().includes('government')) {
          discount = 10000;
        } else {
          discount = 0;
        }

        updated.admissionQuota = value;
        updated.quotaName = value;
        updated.discountAmount = discount;

        const net = Math.max(0, baseTotal - discount);
        updated.amountPaid = net;
        updated.balanceFee = 0;
      }

      if (field === 'amountPaid') {
        const paid = Number(value || 0);
        const netTotal = Math.max(0, Number(updated.totalFee || 41200) - Number(updated.discountAmount || 0));
        updated.balanceFee = Math.max(0, netTotal - paid);
        updated.paymentStatus = updated.balanceFee === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
      }

      return updated;
    });
  };

  // Reset / Blank Form
  const handleBlankForm = () => {
    setSelectedStudentId(null);
    const count = studentsList.length + 1;
    const newId = `HAA2026-${String(count).padStart(3, '0')}`;
    setForm({
      ...EMPTY_FORM,
      id: newId,
      admissionNo: newId,
      firstName: '',
      lastName: '',
      name: '',
      phone: '',
      email: ''
    });
    setActiveStep(1);
    setSuccessMsg('Blank Form initialized. Ready for new student admission.');
    setErrorMsg('');
  };

  // Select student from directory for editing
  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id || student._id);
    setForm({
      ...EMPTY_FORM,
      ...student,
      firstName: student.firstName || (student.name ? student.name.split(' ')[0] : ''),
      lastName: student.lastName || (student.name ? student.name.split(' ').slice(1).join(' ') : ''),
      dept: student.dept || student.department || 'Computer Science Engineering',
      department: student.dept || student.department || 'Computer Science Engineering',
      course: student.course || 'B.E - Computer Science Engineering',
      qualifications: student.qualifications?.length ? student.qualifications : [...DEFAULT_QUALIFICATIONS]
    });
    setActiveStep(1);
    setSuccessMsg(`Loaded student details for ${student.name || student.id}`);
  };

  // Final Save / Register
  const handleSaveRegistration = async () => {
    if (!form.firstName.trim()) {
      setErrorMsg('First Name is required.');
      setActiveStep(1);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const fullName = [form.firstName, form.midName, form.lastName].filter(Boolean).join(' ');
      const payload = {
        ...form,
        name: fullName,
        firstName: form.firstName,
        lastName: form.lastName,
        dept: form.dept || form.department,
        department: form.dept || form.department,
        course: form.course || `${form.degreeCode} - ${form.dept}`,
        status: 'Active'
      };

      if (selectedStudentId) {
        await updateStudent(selectedStudentId, payload);
        setSuccessMsg(`Student registration updated: ${fullName}`);
      } else {
        const created = await createStudent(payload);
        const newId = created?.data?.id || payload.id || `HAA2026-${String(studentsList.length + 1).padStart(3, '0')}`;
        setSuccessMsg(`New Admission Confirmed! Registration ID: ${newId}`);

        // Auto create fee record
        try {
          await createFee({
            studentId: newId,
            studentName: fullName,
            department: payload.dept,
            course: payload.course,
            academicYear: payload.academicYear,
            totalAmount: Number(payload.totalFee || 41200),
            paidAmount: Number(payload.amountPaid || 35000),
            remainingFee: Number(payload.balanceFee || 6200),
            paymentMode: payload.paymentMode || 'Cash',
            receiptNo: `REC-${Date.now().toString().slice(-6)}`,
            paymentDate: new Date(),
            status: Number(payload.balanceFee || 0) <= 0 ? 'Paid' : 'Partial'
          });
        } catch (feeErr) {
          console.warn('Fee note:', feeErr);
        }
      }

      emitERPDataUpdate(['students', 'fees', 'hostel', 'transport'], 'saved', payload);
      await loadData();
      setActiveStep(6); // Go to directory
    } catch (err) {
      console.error('Error saving student:', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to save student admission.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm(`Are you sure you want to delete student registration ${studentId}?`)) return;
    try {
      setLoading(true);
      await deleteStudent(studentId);
      emitERPDataUpdate(['students', 'fees', 'hostel', 'transport'], 'deleted', { studentId });
      setSuccessMsg(`Student registration deleted.`);
      await loadData();
    } catch (err) {
      console.error('Error deleting:', err);
      setErrorMsg('Failed to delete student.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Printable Fee Receipt
  const handlePrintReceipt = (stu) => {
    const data = stu || form;
    const win = window.open('', '_blank', 'width=800,height=850');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Receipt - ${data.id || 'N/A'}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #0f172a; }
          .receipt { border: 2px solid #1e40af; border-radius: 8px; padding: 24px; max-width: 700px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
          .header h2 { margin: 0; color: #1e40af; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size: 13px; margin: 16px 0; }
          .grid div { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
          .label { color: #64748b; font-weight: 600; }
          .val { font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h2>COLLEGE ERP — OFFICIAL ADMISSION FEE RECEIPT</h2>
            <p>Academic Year: ${data.academicYear} | Reg No: <strong>${data.id || data.admissionNo || 'N/A'}</strong></p>
          </div>
          <div class="grid">
            <div><span class="label">Student Name:</span><span class="val">${data.name || data.firstName}</span></div>
            <div><span class="label">Department:</span><span class="val">${data.dept || data.department}</span></div>
            <div><span class="label">Admission Quota:</span><span class="val">${data.admissionQuota || 'General Quota'}</span></div>
            <div><span class="label">Payment Mode:</span><span class="val">${data.paymentMode || 'Cash'}</span></div>
          </div>
          <table>
            <thead>
              <tr><th>Description</th><th>Amount (₹)</th></tr>
            </thead>
            <tbody>
              <tr><td>Total Assessed Fee</td><td>₹${data.totalFee || 41200}</td></tr>
              <tr><td>Quota Concession / Discount</td><td>-₹${data.discountAmount || 0}</td></tr>
              <tr><td><strong>Amount Paid Realized</strong></td><td><strong>₹${data.amountPaid || 35000}</strong></td></tr>
              <tr><td><strong>Outstanding Balance</strong></td><td><strong>₹${data.balanceFee || 6200}</strong></td></tr>
            </tbody>
          </table>
          <div class="footer">
            <div><p>_______________________</p><p>Student / Depositor</p></div>
            <div><p>_______________________</p><p>Accounts Officer Seal & Sign</p></div>
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Filtered Directory Students
  const directoryFiltered = useMemo(() => {
    return studentsList.filter(s => {
      const q = dirSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.id && String(s.id).toLowerCase().includes(q)) ||
        (s.dept && s.dept.toLowerCase().includes(q))
      );
    });
  }, [studentsList, dirSearch]);

  return (
    <div className="erp-workbench animate-fade-in">
      
      {/* ── 1. Top Command Header Card ── */}
      <div className="erp-header-card">
        <div className="erp-header-top">
          <div className="erp-header-title-box">
            <div className="erp-brand-badge">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="erp-header-title">COLLEGE ERP — ADMISSION & ENROLLMENT WORKBENCH</h1>
              <p className="erp-header-sub">
                Real-Time Enterprise Student Registration & Fee Desk • 
                <span className="erp-status-live">● Live Sync Engine Active</span> • 
                {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="erp-header-actions">
            <button className="erp-btn-header" onClick={loadData} type="button" title="Sync Data">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
            <button className="erp-btn-header" onClick={handleBlankForm} type="button">
              <RotateCcw size={14} />
              <span>Blank Form</span>
            </button>
            <button className="erp-btn-header" onClick={() => setActiveStep(6)} type="button">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button className="erp-btn-header erp-btn-header-primary" onClick={handleBlankForm} type="button">
              <Plus size={15} />
              <span>+ New Admission</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="erp-alert erp-alert-success">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="erp-alert erp-alert-error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 2. KPI Metrics Strip (5 Cards) ── */}
      <div className="erp-kpi-grid">
        <div className="erp-kpi-card">
          <div className="erp-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={18} />
          </div>
          <span className="erp-kpi-label">TOTAL ENROLLED</span>
          <span className="erp-kpi-value">{totalEnrolled} Students</span>
        </div>

        <div className="erp-kpi-card">
          <div className="erp-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <span style={{ fontWeight: 800, fontSize: '16px' }}>₹</span>
          </div>
          <span className="erp-kpi-label">TOTAL FEES ASSESSED</span>
          <span className="erp-kpi-value">₹{totalFeesAssessed.toLocaleString('en-IN')}</span>
        </div>

        <div className="erp-kpi-card">
          <div className="erp-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CreditCard size={18} />
          </div>
          <span className="erp-kpi-label">COLLECTIONS REALIZED</span>
          <span className="erp-kpi-value" style={{ color: '#059669' }}>₹{totalCollections.toLocaleString('en-IN')}</span>
        </div>

        <div className="erp-kpi-card">
          <div className="erp-kpi-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertCircle size={18} />
          </div>
          <span className="erp-kpi-label">OUTSTANDING BALANCE</span>
          <span className="erp-kpi-value" style={{ color: '#dc2626' }}>₹{totalOutstanding.toLocaleString('en-IN')}</span>
        </div>

        <div className="erp-kpi-card">
          <div className="erp-kpi-icon-wrap" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Building2 size={18} />
          </div>
          <span className="erp-kpi-label">ACTIVE DEPTS</span>
          <span className="erp-kpi-value">{departmentsList.length || 5} Depts</span>
        </div>
      </div>

      {/* ── 3. Step Navigator Strip ── */}
      <div className="erp-steps-bar">
        <button 
          className={`erp-step-tab ${activeStep === 1 ? 'active' : ''}`}
          onClick={() => setActiveStep(1)}
          type="button"
        >
          <div className="erp-step-number">1</div>
          <div className="erp-step-tab-text">
            <span className="erp-step-tag">STEP 1</span>
            <span>Demographics</span>
          </div>
        </button>

        <button 
          className={`erp-step-tab ${activeStep === 2 ? 'active' : ''}`}
          onClick={() => setActiveStep(2)}
          type="button"
        >
          <div className="erp-step-number">2</div>
          <div className="erp-step-tab-text">
            <span className="erp-step-tag">STEP 2</span>
            <span>Academics</span>
          </div>
        </button>

        <button 
          className={`erp-step-tab ${activeStep === 3 ? 'active' : ''}`}
          onClick={() => setActiveStep(3)}
          type="button"
        >
          <div className="erp-step-number">3</div>
          <div className="erp-step-tab-text">
            <span className="erp-step-tag">STEP 3</span>
            <span>Qualifications</span>
          </div>
        </button>

        <button 
          className={`erp-step-tab ${activeStep === 4 ? 'active' : ''}`}
          onClick={() => setActiveStep(4)}
          type="button"
        >
          <div className="erp-step-number">4</div>
          <div className="erp-step-tab-text">
            <span className="erp-step-tag">STEP 4</span>
            <span>Fee Ledger</span>
          </div>
        </button>

        <button 
          className={`erp-step-tab ${activeStep === 5 ? 'active' : ''}`}
          onClick={() => setActiveStep(5)}
          type="button"
        >
          <div className="erp-step-number">5</div>
          <div className="erp-step-tab-text">
            <span className="erp-step-tag">STEP 5</span>
            <span>Verification</span>
          </div>
        </button>

        <button 
          className={`erp-step-tab ${activeStep === 6 ? 'active' : ''}`}
          onClick={() => setActiveStep(6)}
          type="button"
        >
          <div className="erp-step-number">6</div>
          <div className="erp-step-tab-text">
            <span className="erp-step-tag">REGISTER</span>
            <span>Directory ({totalEnrolled})</span>
          </div>
        </button>
      </div>

      {/* ── 4. Main Step Body Card ── */}
      <div className="erp-card-main">
        
        {/* STEP 1: DEMOGRAPHICS & IDENTIFICATION */}
        {activeStep === 1 && (
          <div>
            <div className="erp-card-header">
              <div className="erp-card-header-left">
                <div className="step-icon-bubble"><Users size={18} /></div>
                <div>
                  <h2 className="erp-card-title">Step 1: Student Demographics & Identification</h2>
                  <p className="erp-card-subtitle">Enter personal, parent, demographic and contact details for student registration</p>
                </div>
              </div>
              <div className="erp-badge-auto-reg">
                AUTO-REG ID: {form.id || 'HAA2026-001'}
              </div>
            </div>

            {/* Section 1: Personal Details */}
            <div className="erp-section-box">
              <div className="erp-section-title">
                <Users size={16} />
                <span>1. Personal & Identity Details</span>
              </div>

              <div className="erp-form-grid-3">
                <div className="erp-field">
                  <label className="erp-field-label">First Name <span className="req">*</span></label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="e.g. Priya"
                    value={form.firstName} 
                    onChange={(e) => handleChange('firstName', e.target.value)} 
                    required
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Middle Name</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="e.g. Kumar"
                    value={form.midName} 
                    onChange={(e) => handleChange('midName', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Last Name / Initial <span className="req">*</span></label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="e.g. R"
                    value={form.lastName} 
                    onChange={(e) => handleChange('lastName', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Gender <span className="req">*</span></label>
                  <div className="erp-pill-group">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`erp-pill-btn ${form.gender === g ? 'active' : ''}`}
                        onClick={() => handleChange('gender', g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Date of Birth <span className="req">*</span></label>
                  <input 
                    type="date" 
                    className="erp-input" 
                    value={form.dob} 
                    onChange={(e) => handleChange('dob', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Place of Birth</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="e.g. Chennai"
                    value={form.placeOfBirth} 
                    onChange={(e) => handleChange('placeOfBirth', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Blood Group</label>
                  <select 
                    className="erp-select" 
                    value={form.bloodGroup} 
                    onChange={(e) => handleChange('bloodGroup', e.target.value)}
                  >
                    <option value="Select">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Mother Tongue</label>
                  <select 
                    className="erp-select" 
                    value={form.motherTongue} 
                    onChange={(e) => handleChange('motherTongue', e.target.value)}
                  >
                    <option value="Tamil">Tamil</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Malayalam">Malayalam</option>
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Nationality</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    value={form.nationality} 
                    onChange={(e) => handleChange('nationality', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Religion</label>
                  <select 
                    className="erp-select" 
                    value={form.religion} 
                    onChange={(e) => handleChange('religion', e.target.value)}
                  >
                    <option value="Hindu">Hindu</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Christian">Christian</option>
                    <option value="Jain">Jain</option>
                    <option value="Sikh">Sikh</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Community</label>
                  <select 
                    className="erp-select" 
                    value={form.community} 
                    onChange={(e) => handleChange('community', e.target.value)}
                  >
                    <option value="BC">BC</option>
                    <option value="MBC">MBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="OC">OC</option>
                    <option value="BCM">BCM</option>
                    <option value="DNC">DNC</option>
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Caste / Sub-Caste</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="e.g. Kongu Vellalar"
                    value={form.caste} 
                    onChange={(e) => handleChange('caste', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Aadhar Number</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="12-digit UID"
                    value={form.aadharNo} 
                    onChange={(e) => handleChange('aadharNo', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">PAN / Identification</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="Optional PAN / ID mark"
                    value={form.panNo} 
                    onChange={(e) => handleChange('panNo', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Parent & Guardian Details */}
            <div className="erp-section-box">
              <div className="erp-section-title">
                <Users size={16} />
                <span>2. Parent & Guardian Details</span>
              </div>

              <div className="erp-form-grid-3">
                <div className="erp-field">
                  <label className="erp-field-label">Father's Name</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="Father Name"
                    value={form.fatherName} 
                    onChange={(e) => handleChange('fatherName', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Father's Mobile</label>
                  <input 
                    type="tel" 
                    className="erp-input" 
                    placeholder="10-digit mobile"
                    value={form.fatherPhone} 
                    onChange={(e) => handleChange('fatherPhone', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Father's Occupation</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="e.g. Business / Service"
                    value={form.fatherOccupation} 
                    onChange={(e) => handleChange('fatherOccupation', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Mother's Name</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="Mother Name"
                    value={form.motherName} 
                    onChange={(e) => handleChange('motherName', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Mother's Mobile</label>
                  <input 
                    type="tel" 
                    className="erp-input" 
                    placeholder="10-digit mobile"
                    value={form.motherPhone} 
                    onChange={(e) => handleChange('motherPhone', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Annual Family Income (₹)</label>
                  <input 
                    type="number" 
                    className="erp-input" 
                    placeholder="e.g. 250000"
                    value={form.annualIncome} 
                    onChange={(e) => handleChange('annualIncome', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Contact & Residential Address */}
            <div className="erp-section-box">
              <div className="erp-section-title">
                <Home size={16} />
                <span>3. Contact & Residential Address</span>
              </div>

              <div className="erp-form-grid-3">
                <div className="erp-field">
                  <label className="erp-field-label">Student Phone / Mobile</label>
                  <input 
                    type="tel" 
                    className="erp-input" 
                    placeholder="Student Mobile"
                    value={form.phone} 
                    onChange={(e) => handleChange('phone', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Student Email ID</label>
                  <input 
                    type="email" 
                    className="erp-input" 
                    placeholder="student@college.edu"
                    value={form.email} 
                    onChange={(e) => handleChange('email', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Door No & Street Address</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="Door No, Street"
                    value={form.address} 
                    onChange={(e) => handleChange('address', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">City / Town</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="City"
                    value={form.city} 
                    onChange={(e) => handleChange('city', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">District</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="District"
                    value={form.district} 
                    onChange={(e) => handleChange('district', e.target.value)} 
                  />
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">PIN Code</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    placeholder="6-digit PIN"
                    value={form.pincode} 
                    onChange={(e) => handleChange('pincode', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Wizard Footer */}
            <div className="erp-wizard-footer">
              <div></div>
              <button 
                className="erp-btn-step-next" 
                type="button" 
                onClick={() => setActiveStep(2)}
              >
                <span>Next: Academic Program</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ACADEMIC PROGRAM & ENROLLMENT */}
        {activeStep === 2 && (
          <div>
            <div className="erp-card-header">
              <div className="erp-card-header-left">
                <div className="step-icon-bubble"><GraduationCap size={18} /></div>
                <div>
                  <h2 className="erp-card-title">Step 2: Academic Program & Enrolling Details</h2>
                  <p className="erp-card-subtitle">Select degree, department, academic quota, and hostel/transport facilities</p>
                </div>
              </div>
            </div>

            <div className="erp-section-box">
              <div className="erp-form-grid-3">
                <div className="erp-field">
                  <label className="erp-field-label">Academic Session <span className="req">*</span></label>
                  <select 
                    className="erp-select" 
                    value={form.academicYear} 
                    onChange={(e) => handleChange('academicYear', e.target.value)}
                  >
                    <option value="2026-2027">2026–2027</option>
                    <option value="2025-2026">2025–2026</option>
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Degree Level <span className="req">*</span></label>
                  <select 
                    className="erp-select" 
                    value={form.degreeCode} 
                    onChange={(e) => handleChange('degreeCode', e.target.value)}
                  >
                    {dynamicDegreeOptions.map(d => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Department / Branch <span className="req">*</span></label>
                  <select 
                    className="erp-select" 
                    value={form.dept} 
                    onChange={(e) => handleChange('dept', e.target.value)}
                  >
                    {filteredDepartments.map(d => (
                      <option key={d.id || d._id || d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Enrolled Course / Program <span className="req">*</span></label>
                  <select 
                    className="erp-select" 
                    value={form.course} 
                    onChange={(e) => handleChange('course', e.target.value)}
                  >
                    {getDepartmentCourses(form.dept).map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Semester</label>
                  <select 
                    className="erp-select" 
                    value={form.semester} 
                    onChange={(e) => handleChange('semester', Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Section Allocation</label>
                  <select 
                    className="erp-select" 
                    value={form.section} 
                    onChange={(e) => handleChange('section', e.target.value)}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>

                <div className="erp-field">
                  <label className="erp-field-label">Admission Quota <span className="req">*</span></label>
                  <select 
                    className="erp-select" 
                    value={form.admissionQuota} 
                    onChange={(e) => handleChange('admissionQuota', e.target.value)}
                  >
                    {availableQuotas.map(q => (
                      <option key={q.quotaName} value={q.quotaName}>
                        {q.quotaName} {q.description && q.description !== 'Standard admission' ? `(${q.description})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Facilities */}
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <div className="erp-form-grid-2">
                  <div className="erp-field">
                    <label className="erp-field-label">Hostel Facility Required?</label>
                    <div className="erp-pill-group">
                      <button
                        type="button"
                        className={`erp-pill-btn ${form.hostel === 'Yes' ? 'active' : ''}`}
                        onClick={() => { handleChange('hostel', 'Yes'); handleChange('hostelRequired', 'yes'); }}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        className={`erp-pill-btn ${form.hostel === 'No' ? 'active' : ''}`}
                        onClick={() => { handleChange('hostel', 'No'); handleChange('hostelRequired', 'no'); }}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="erp-field">
                    <label className="erp-field-label">College Transport / Bus Required?</label>
                    <div className="erp-pill-group">
                      <button
                        type="button"
                        className={`erp-pill-btn ${form.transport === 'Yes' ? 'active' : ''}`}
                        onClick={() => { handleChange('transport', 'Yes'); handleChange('transportRequired', 'yes'); }}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        className={`erp-pill-btn ${form.transport === 'No' ? 'active' : ''}`}
                        onClick={() => { handleChange('transport', 'No'); handleChange('transportRequired', 'no'); }}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="erp-wizard-footer">
              <button className="erp-btn-step-prev" type="button" onClick={() => setActiveStep(1)}>
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
              <button className="erp-btn-step-next" type="button" onClick={() => setActiveStep(3)}>
                <span>Next: Qualifications</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: QUALIFICATIONS */}
        {activeStep === 3 && (
          <div>
            <div className="erp-card-header">
              <div className="erp-card-header-left">
                <div className="step-icon-bubble"><FileText size={18} /></div>
                <div>
                  <h2 className="erp-card-title">Step 3: Academic Qualifications & History</h2>
                  <p className="erp-card-subtitle">Prior educational background, school/college boards, pass year and percentages</p>
                </div>
              </div>
            </div>

            <div className="erp-table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Examination / Course</th>
                    <th>Institute / School</th>
                    <th>Board / University</th>
                    <th>Percentage (%)</th>
                    <th>Pass Year</th>
                    <th>Marksheet No</th>
                  </tr>
                </thead>
                <tbody>
                  {form.qualifications.map((q, idx) => (
                    <tr key={idx}>
                      <td><strong>{q.study}</strong></td>
                      <td>
                        <input 
                          type="text" 
                          className="erp-input" 
                          placeholder="School name"
                          value={q.institute} 
                          onChange={(e) => {
                            const updated = [...form.qualifications];
                            updated[idx].institute = e.target.value;
                            setForm(prev => ({ ...prev, qualifications: updated }));
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={q.board} 
                          onChange={(e) => {
                            const updated = [...form.qualifications];
                            updated[idx].board = e.target.value;
                            setForm(prev => ({ ...prev, qualifications: updated }));
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="erp-input" 
                          placeholder="e.g. 88%"
                          value={q.percentage} 
                          onChange={(e) => {
                            const updated = [...form.qualifications];
                            updated[idx].percentage = e.target.value;
                            setForm(prev => ({ ...prev, qualifications: updated }));
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="erp-input" 
                          value={q.passYear} 
                          onChange={(e) => {
                            const updated = [...form.qualifications];
                            updated[idx].passYear = e.target.value;
                            setForm(prev => ({ ...prev, qualifications: updated }));
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="erp-input" 
                          placeholder="Reg/Roll No"
                          value={q.marksheetNo} 
                          onChange={(e) => {
                            const updated = [...form.qualifications];
                            updated[idx].marksheetNo = e.target.value;
                            setForm(prev => ({ ...prev, qualifications: updated }));
                          }} 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="erp-wizard-footer">
              <button className="erp-btn-step-prev" type="button" onClick={() => setActiveStep(2)}>
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
              <button className="erp-btn-step-next" type="button" onClick={() => setActiveStep(4)}>
                <span>Next: Fee Ledger</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FEE LEDGER */}
        {activeStep === 4 && (
          <div>
            <div className="erp-card-header">
              <div className="erp-card-header-left">
                <div className="step-icon-bubble"><CreditCard size={18} /></div>
                <div>
                  <h2 className="erp-card-title">Step 4: Fee Structure & Payment Ledger</h2>
                  <p className="erp-card-subtitle">Tuition, special fee assessments, quota concessions and payment realization</p>
                </div>
              </div>
            </div>

            <div className="erp-form-grid-2">
              <div className="erp-section-box">
                <div className="erp-section-title">
                  <CreditCard size={16} />
                  <span>Fee Assessment Summary</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Standard Tuition & Admission Fee:</span>
                    <span style={{ fontWeight: 700 }}>₹41,200</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Quota Concession ({form.admissionQuota}):</span>
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>-₹{form.discountAmount || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: 800 }}>Net Assessed Fee Payable:</span>
                    <span style={{ fontWeight: 800, color: '#1e40af' }}>₹{Math.max(0, 41200 - (form.discountAmount || 0)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="erp-section-box">
                <div className="erp-section-title">
                  <Save size={16} />
                  <span>Payment Realization</span>
                </div>

                <div className="erp-field" style={{ marginBottom: '12px' }}>
                  <label className="erp-field-label">Amount Paid Realized (₹) <span className="req">*</span></label>
                  <input 
                    type="number" 
                    className="erp-input" 
                    value={form.amountPaid} 
                    onChange={(e) => handleChange('amountPaid', e.target.value)} 
                  />
                </div>

                <div className="erp-field" style={{ marginBottom: '12px' }}>
                  <label className="erp-field-label">Payment Mode</label>
                  <select 
                    className="erp-select" 
                    value={form.paymentMode} 
                    onChange={(e) => handleChange('paymentMode', e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque / DD">Cheque / Demand Draft</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Balance Due:</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: form.balanceFee > 0 ? '#dc2626' : '#16a34a' }}>
                    ₹{Number(form.balanceFee || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="erp-wizard-footer">
              <button className="erp-btn-step-prev" type="button" onClick={() => setActiveStep(3)}>
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
              <button className="erp-btn-step-next" type="button" onClick={() => setActiveStep(5)}>
                <span>Next: Verification Summary</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: VERIFICATION & CONFIRMATION */}
        {activeStep === 5 && (
          <div>
            <div className="erp-card-header">
              <div className="erp-card-header-left">
                <div className="step-icon-bubble"><ShieldCheck size={18} /></div>
                <div>
                  <h2 className="erp-card-title">Step 5: Verification & Confirmation</h2>
                  <p className="erp-card-subtitle">Verify all student information before final registration and ledger creation</p>
                </div>
              </div>
            </div>

            <div className="erp-section-box">
              <div className="erp-form-grid-2">
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div><span style={{ color: '#64748b' }}>Student Name:</span> <strong>{form.name || form.firstName}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Registration ID:</span> <strong>{form.id}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Department:</span> <strong>{form.dept}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Degree / Program:</span> <strong>{form.degreeCode}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Gender & DOB:</span> <strong>{form.gender} ({form.dob || 'N/A'})</strong></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div><span style={{ color: '#64748b' }}>Admission Quota:</span> <strong>{form.admissionQuota}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Net Fee Assessed:</span> <strong>₹{form.totalFee - form.discountAmount}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Amount Paid:</span> <strong style={{ color: '#16a34a' }}>₹{form.amountPaid}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Balance Outstanding:</span> <strong style={{ color: form.balanceFee > 0 ? '#dc2626' : '#16a34a' }}>₹{form.balanceFee}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Hostel / Transport:</span> <strong>Hostel: {form.hostel}, Bus: {form.transport}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="erp-wizard-footer">
              <button className="erp-btn-step-prev" type="button" onClick={() => setActiveStep(4)}>
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="erp-btn-step-save" 
                  type="button" 
                  onClick={handleSaveRegistration}
                  disabled={submitting}
                >
                  <Save size={16} />
                  <span>{selectedStudentId ? 'Update Registration' : 'Confirm & Submit Admission'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REGISTER DIRECTORY */}
        {activeStep === 6 && (
          <div>
            <div className="erp-card-header">
              <div className="erp-card-header-left">
                <div className="step-icon-bubble"><Users size={18} /></div>
                <div>
                  <h2 className="erp-card-title">Confirmed Student Directory</h2>
                  <p className="erp-card-subtitle">Real-time database of all registered students, departments, fees and actions</p>
                </div>
              </div>
              <div>
                <input 
                  type="text" 
                  className="erp-input" 
                  style={{ width: '240px' }}
                  placeholder="Search name, ID, dept..."
                  value={dirSearch} 
                  onChange={(e) => setDirSearch(e.target.value)} 
                />
              </div>
            </div>

            <div className="erp-table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Reg No</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Quota</th>
                    <th>Assessed Fee</th>
                    <th>Paid</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {directoryFiltered.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        No enrolled students registered yet.
                      </td>
                    </tr>
                  ) : (
                    directoryFiltered.map(stu => (
                      <tr key={stu.id || stu._id}>
                        <td><strong>{stu.id || stu.admissionNo}</strong></td>
                        <td>{stu.name || `${stu.firstName || ''} ${stu.lastName || ''}`}</td>
                        <td>{stu.dept || stu.department}</td>
                        <td>{stu.admissionQuota || stu.quotaName || 'General'}</td>
                        <td>₹{stu.totalFee || 41200}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>₹{stu.amountPaid || 35000}</td>
                        <td>
                          <span style={{ 
                            background: '#ecfdf5', 
                            color: '#059669', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '11px', 
                            fontWeight: 700 
                          }}>
                            {stu.status || 'Active'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              className="erp-btn-header" 
                              style={{ height: '28px', padding: '0 8px' }} 
                              onClick={() => handleSelectStudent(stu)}
                              title="Edit Record"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              className="erp-btn-header" 
                              style={{ height: '28px', padding: '0 8px' }} 
                              onClick={() => handlePrintReceipt(stu)}
                              title="Print Receipt"
                            >
                              <Printer size={12} />
                            </button>
                            <button 
                              className="erp-btn-header" 
                              style={{ height: '28px', padding: '0 8px', color: '#dc2626' }} 
                              onClick={() => handleDeleteStudent(stu.id || stu._id)}
                              title="Delete Student"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="erp-wizard-footer">
              <button className="erp-btn-header-primary" type="button" onClick={handleBlankForm}>
                <Plus size={15} />
                <span>+ Register Another Student</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default StudentRegistration;
