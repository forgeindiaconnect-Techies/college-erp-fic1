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
  ArrowLeft
} from 'lucide-react';
import {
  createStudent,
  updateStudent,
  getDepartments,
  getStudents,
  getCourses,
  getFeePlans
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const SEMESTERS = [
  '1stYear-Sem-I',
  '1stYear-Sem-II',
  '2ndYear-Sem-III',
  '2ndYear-Sem-IV',
  '3rdYear-Sem-V',
  '3rdYear-Sem-VI',
  '4thYear-Sem-VII',
  '4thYear-Sem-VIII'
];

const BLOOD_GROUPS = ['Select', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const getFeePlanSemester = (sem) => {
  const map = {
    '1stYear-Sem-I': 'Sem 1',
    '1stYear-Sem-II': 'Sem 2',
    '2ndYear-Sem-III': 'Sem 3',
    '2ndYear-Sem-IV': 'Sem 4',
    '3rdYear-Sem-V': 'Sem 5',
    '3rdYear-Sem-VI': 'Sem 6',
    '4thYear-Sem-VII': 'Sem 7',
    '4thYear-Sem-VIII': 'Sem 8'
  };

  return map[sem] || sem;
};

const EMPTY_FORM = {
  id: '',
  firstName: '',
  midName: '',
  lastName: '',
  name: '',
  email: '',
  phone: '',
  dept: '',
  courseId: '',
  sem: '1stYear-Sem-I',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  section: 'A',
  admissionDate: new Date().toISOString().split('T')[0],
  admissionInfo: 'Regular Merit',
  applicationType: 'New Enrollment',
  applicationStatus: 'Approved',

  dob: '',
  gender: 'Male',
  aadharNo: '',
  identification: '',
  familyStat: 'Nuclear',
  firstLang: 'English',
  secondLang: 'Tamil',
  bloodGroup: 'Select',
  religion: '',
  nationality: 'Indian',
  caste: '',
  ethnicity: '',
  panNo: '',
  physicallyChallenged: false,

  country: 'India',
  state: 'Tamil Nadu',
  district: '',
  subDistrict: '',
  pincode: '',
  address: '',

  photoUrl: '',
  busFacility: false,
  busRoute: '',
  pickupPoint: '',
  dormFacility: false,
  hostelName: '',
  roomNumber: '',

  languages: [
    { language: 'English', reading: true, writing: true, speaking: true },
    { language: 'Tamil', reading: true, writing: true, speaking: true }
  ],

  familyMembers: [
    { relation: 'Father', firstName: '', middleName: '', lastName: '', mobile: '', email: '' },
    { relation: 'Mother', firstName: '', middleName: '', lastName: '', mobile: '', email: '' }
  ],

  feePlanId: '',
  feeDetails: null,
  baseFee: 0,
  transportFee: 0,
  hostelFee: 0,
  totalFee: 0,

  feeStatus: 'Pending',
  status: 'Active'
};

const DEPARTMENT_CODES = {
  'Computer Science Engineering': 'CSE',
  'Computer Science & Engineering': 'CSE',
  'Information Technology': 'IT',
  'Electronics & Communication Engineering': 'ECE',
  'Electrical & Electronics Engineering': 'EEE',
  'Mechanical Engineering': 'MECH',
  'Civil Engineering': 'CIVIL',
  'Artificial Intelligence & Data Science': 'AIDS',
  'Artificial Intelligence & Machine Learning': 'AIML',
  'Cyber Security': 'CYBER',
  'Biomedical Engineering': 'BME',
  'Aeronautical Engineering': 'AERO',
  'Automobile Engineering': 'AUTO',
  'Robotics Engineering': 'ROBOTICS',
  'Chemical Engineering': 'CHEM',
  'Biotechnology Engineering': 'BIOTECH',
  'MATHEMATICS': 'MATH',
  'Mathematics': 'MATH',
  'History and Arts': 'HIS',
  'History': 'HIS',
  'Physics': 'PHY',
  'Chemistry': 'CHEM'
};

const generateRegNo = (dept, studentsList) => {
  const code = DEPARTMENT_CODES[dept] || (dept ? dept.substring(0, 3).toUpperCase() : 'ST');
  const year = new Date().getFullYear();

  const deptStudents = (studentsList || []).filter(
    student =>
      (student.dept === dept || student.department === dept) &&
      student.id &&
      String(student.id).startsWith(`${code}${year}`)
  );

  let maxSeq = 0;

  deptStudents.forEach(student => {
    const parts = String(student.id).split('-');

    if (parts.length > 1) {
      const seq = parseInt(parts[1], 10);

      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  return `${code}${year}-${String(maxSeq + 1).padStart(3, '0')}`;
};

const WIZARD_STEPS = [
  { id: 1, title: 'Personal Details', subtitle: 'Basic & Identity Info', icon: User },
  { id: 2, title: 'Contact & Address', subtitle: 'Demographics & Location', icon: MapPin },
  { id: 3, title: 'Enrolling & Fees', subtitle: 'Course, Facilities & Plan', icon: GraduationCap },
  { id: 4, title: 'Languages & Family', subtitle: 'Proficiency & Parents', icon: Users }
];

const StudentRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [selectedFeePlan, setSelectedFeePlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);

  // Left sidebar filter state
  const [filterAcademicYear, setFilterAcademicYear] = useState('All');
  const [filterDegree, setFilterDegree] = useState('All');
  const [filterCourseYear, setFilterCourseYear] = useState('All');
  const [filterAppStatus, setFilterAppStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDataText, setBulkDataText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const fileInputRef = useRef(null);

  const loadSelectedFeePlan = async (departmentName, courseId, semester) => {
    try {
      if (!departmentName || !courseId) {
        setSelectedFeePlan(null);
        return;
      }

      const department = departments.find(
        dept =>
          (dept?.name || dept?.departmentName || dept) === departmentName ||
          dept?.code === departmentName ||
          dept?.id === departmentName ||
          dept?._id === departmentName
      );

      const courseObj = courses.find(
        c =>
          String(c.id || c._id) === String(courseId) ||
          c.name === courseId ||
          c.code === courseId
      );

      const deptId = department?.id || department?._id || departmentName;
      const deptName = department?.name || department?.departmentName || departmentName;
      const cId = courseObj?.id || courseObj?._id || courseId;
      const cName = courseObj?.name || courseId;
      const feeSemester = getFeePlanSemester(semester || form.sem);

      // 1. Try finding in loaded feePlans first
      let matchedPlan = feePlans.find(plan => {
        if (plan.status === 'Inactive') return false;
        const dMatch =
          plan.departmentId === deptId ||
          plan.departmentName === deptName ||
          String(plan.departmentId).toLowerCase() === String(deptName).toLowerCase() ||
          String(plan.departmentName).toLowerCase() === String(deptName).toLowerCase();

        const cMatch =
          plan.courseId === cId ||
          plan.courseName === cName ||
          String(plan.courseId).toLowerCase() === String(cName).toLowerCase() ||
          String(plan.courseName).toLowerCase() === String(cName).toLowerCase();

        const sMatch =
          !plan.semester ||
          plan.semester === 'All' ||
          plan.semester === feeSemester ||
          plan.semester === semester;

        return dMatch && cMatch && sMatch;
      });

      // 2. If not in state, query backend API
      if (!matchedPlan) {
        try {
          const response = await getFeePlans({
            departmentId: deptId,
            departmentName: deptName,
            courseId: String(cId),
            courseName: cName,
            semester: feeSemester
          });

          const plans = Array.isArray(response.data) ? response.data : [];
          matchedPlan = plans.find(plan => plan.status === 'Active') || null;
        } catch (apiErr) {
          console.warn('API fee plan query:', apiErr.message);
        }
      }

      // 3. If no specific custom plan found in DB, supply standard ERP fee plan
      if (!matchedPlan) {
        matchedPlan = {
          _id: `standard-${deptId}-${cId}`,
          departmentId: deptId,
          departmentName: deptName,
          courseId: cId,
          courseName: cName,
          semester: feeSemester,
          tuitionFee: 55000,
          examFee: 2500,
          labFee: 5000,
          libraryFee: 2500,
          transportFee: 15000,
          hostelFee: 40000,
          isDefaultStandard: true,
          status: 'Active'
        };
      }

      setSelectedFeePlan(matchedPlan);
    } catch (error) {
      console.error('Failed to load fee plan:', error);
      setSelectedFeePlan({
        _id: 'standard-fallback',
        tuitionFee: 55000,
        examFee: 2500,
        labFee: 5000,
        libraryFee: 2500,
        transportFee: 15000,
        hostelFee: 40000,
        isDefaultStandard: true,
        status: 'Active'
      });
    }
  };

  const loadInitialData = async () => {
    try {
      const [deptRes, courseRes, studRes, feePlanRes] = await Promise.all([
        getDepartments().catch(() => ({ data: [] })),
        getCourses().catch(() => ({ data: { courses: [] } })),
        getStudents().catch(() => ({ data: [] })),
        getFeePlans().catch(() => ({ data: [] }))
      ]);

      const deptList = Array.isArray(deptRes.data)
        ? deptRes.data
        : deptRes.data?.departments || [];

      const studentList = Array.isArray(studRes.data)
        ? studRes.data
        : studRes.data?.students || [];

      const courseList = Array.isArray(courseRes.data)
        ? courseRes.data
        : courseRes.data?.courses || [];

      const feePlanList = Array.isArray(feePlanRes.data)
        ? feePlanRes.data
        : [];

      setDepartments(deptList);
      setCourses(courseList);
      setStudents(studentList);
      setFeePlans(feePlanList);

      if (deptList.length > 0 && !editingStudentId) {
        const firstDept =
          deptList[0]?.name ||
          deptList[0]?.departmentName ||
          deptList[0];

        setForm(prev => ({
          ...prev,
          dept: prev.dept || firstDept,
          id: prev.id || generateRegNo(firstDept, studentList)
        }));
      }
    } catch (error) {
      console.error('Failed to load registration data:', error);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadSelectedFeePlan(
      form.dept,
      form.courseId,
      form.sem
    );
  }, [form.dept, form.courseId, form.sem, feePlans]);

  useEffect(() => {
    if (!selectedFeePlan) {
      setForm(prev => ({
        ...prev,
        feeDetails: null,
        baseFee: 0,
        transportFee: 0,
        hostelFee: 0,
        totalFee: 0
      }));
      return;
    }

    const baseFee =
      Number(selectedFeePlan.tuitionFee || 0) +
      Number(selectedFeePlan.examFee || 0) +
      Number(selectedFeePlan.labFee || 0) +
      Number(selectedFeePlan.libraryFee || 0);

    const transportFee = form.busFacility
      ? Number(selectedFeePlan.transportFee || 0)
      : 0;

    const hostelFee = form.dormFacility
      ? Number(selectedFeePlan.hostelFee || 0)
      : 0;

    const totalFee = baseFee + transportFee + hostelFee;

    setForm(prev => ({
      ...prev,
      feePlanId: selectedFeePlan._id,
      feeDetails: selectedFeePlan,
      baseFee,
      transportFee,
      hostelFee,
      totalFee
    }));
  }, [selectedFeePlan, form.busFacility, form.dormFacility]);

  useRealtimeSync(() => {
    loadInitialData();
  }, ['departments', 'courses', 'students', 'feePlans']);

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'firstName' || field === 'midName' || field === 'lastName') {
        const fn = field === 'firstName' ? value : prev.firstName;
        const mn = field === 'midName' ? value : prev.midName;
        const ln = field === 'lastName' ? value : prev.lastName;
        updated.name = [fn, mn, ln].filter(Boolean).join(' ').trim();
      }
      return updated;
    });
  };

  const handleDepartmentChange = value => {
    setForm(prev => ({
      ...prev,
      dept: value,
      courseId: '',
      feePlanId: '',
      feeDetails: null,
      baseFee: 0,
      transportFee: 0,
      hostelFee: 0,
      totalFee: 0,
      id: generateRegNo(value, students)
    }));
  };

  const handleSelectStudentForEdit = student => {
    setEditingStudentId(student.id || student._id);
    setActiveStep(1);
    setSuccessMsg('');
    setErrorMsg('');

    const parts = (student.name || '').trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    const midName = student.midName || '';

    setForm({
      ...EMPTY_FORM,
      ...student,
      firstName: student.firstName || firstName,
      midName: midName,
      lastName: student.lastName || lastName,
      dept: student.dept || student.department || '',
      courseId: student.courseId || '',
      sem: student.sem || student.semester || '1stYear-Sem-I',
      academicYear: student.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      section: student.section || 'A',
      admissionDate: student.admissionDate || new Date().toISOString().split('T')[0],
      gender: student.gender || 'Male',
      bloodGroup: student.bloodGroup || 'Select',
      aadharNo: student.aadharNo || student.idNumber || '',
      physicallyChallenged: !!student.physicallyChallenged,
      busFacility: student.transportRequired === 'yes' || !!student.busFacility,
      dormFacility: student.hostelRequired === 'yes' || !!student.dormFacility,
      photoUrl: student.photoUrl || ''
    });
  };

  const handleAddNewUser = () => {
    setEditingStudentId(null);
    setActiveStep(1);
    const firstDept =
      departments[0]?.name ||
      departments[0]?.departmentName ||
      departments[0] ||
      '';

    setForm({
      ...EMPTY_FORM,
      dept: firstDept,
      id: generateRegNo(firstDept, students),
      admissionDate: new Date().toISOString().split('T')[0]
    });
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handlePhotoUpload = e => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Language management
  const handleAddLanguage = () => {
    setForm(prev => ({
      ...prev,
      languages: [
        ...prev.languages,
        { language: 'Hindi', reading: true, writing: true, speaking: true }
      ]
    }));
  };

  const handleRemoveLanguage = index => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const handleLanguageChange = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.languages];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, languages: updated };
    });
  };

  // Family details management
  const handleAddFamilyMember = () => {
    setForm(prev => ({
      ...prev,
      familyMembers: [
        ...prev.familyMembers,
        { relation: 'Guardian', firstName: '', middleName: '', lastName: '', mobile: '', email: '' }
      ]
    }));
  };

  const handleRemoveFamilyMember = index => {
    setForm(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((_, i) => i !== index)
    }));
  };

  const handleFamilyChange = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.familyMembers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, familyMembers: updated };
    });
  };

  const handleSubmit = async event => {
    if (event) event.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const fullName = form.name.trim() || [form.firstName, form.midName, form.lastName].filter(Boolean).join(' ').trim();

    if (!fullName) {
      setErrorMsg('Please enter student First Name or Last Name in Step 1.');
      setActiveStep(1);
      return;
    }

    if (!form.dept) {
      setErrorMsg('Please select a Department in Step 3.');
      setActiveStep(3);
      return;
    }

    if (!form.courseId && courses.length > 0) {
      setErrorMsg('Please select a Degree / Course in Step 3.');
      setActiveStep(3);
      return;
    }

    try {
      setLoading(true);

      const studentPayload = {
        ...form,
        name: fullName,
        id: form.id || generateRegNo(form.dept, students),
        email: form.email || `${(form.firstName || 'student').toLowerCase()}.${Date.now().toString().slice(-4)}@college.edu`,
        transportRequired: form.busFacility ? 'yes' : 'no',
        hostelRequired: form.dormFacility ? 'yes' : 'no',
        idNumber: form.aadharNo
      };

      if (editingStudentId) {
        await updateStudent(editingStudentId, studentPayload);
        setSuccessMsg(`Student record updated successfully — ${studentPayload.id}`);
      } else {
        await createStudent(studentPayload);
        setSuccessMsg(`Student admission registered successfully — ${studentPayload.id}`);
      }

      const updatedStudentsResponse = await getStudents().catch(() => ({ data: [] }));
      const updatedStudents = Array.isArray(updatedStudentsResponse.data)
        ? updatedStudentsResponse.data
        : updatedStudentsResponse.data?.students || [];

      setStudents(updatedStudents);

      if (!editingStudentId) {
        const nextRegNo = generateRegNo(form.dept, updatedStudents);
        setForm({
          ...EMPTY_FORM,
          dept: form.dept,
          id: nextRegNo,
          academicYear: form.academicYear,
          admissionDate: new Date().toISOString().split('T')[0]
        });
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Student registration failed:', error);
      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          'Failed to process student admission.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Bulk Import
  const handleProcessBulkImport = async () => {
    if (!bulkDataText.trim()) return;
    setBulkImporting(true);
    try {
      const lines = bulkDataText.split('\n').map(l => l.trim()).filter(Boolean);
      let count = 0;
      for (const line of lines) {
        const [name, email, dept, sem] = line.split(',').map(s => s?.trim());
        if (name) {
          const autoId = generateRegNo(dept || form.dept, students);
          await createStudent({
            ...EMPTY_FORM,
            name,
            email: email || `${name.toLowerCase().replace(/\s+/g, '')}@college.edu`,
            dept: dept || form.dept,
            sem: sem || '1stYear-Sem-I',
            id: autoId
          }).catch(err => console.error('Bulk item error', err));
          count++;
        }
      }
      setShowBulkModal(false);
      setBulkDataText('');
      setSuccessMsg(`Bulk imported ${count} students successfully!`);
      loadInitialData();
    } catch (err) {
      setErrorMsg('Failed to process bulk import: ' + err.message);
    } finally {
      setBulkImporting(false);
    }
  };

  // Available courses strictly filtered by the selected department in the form
  const availableCourses = useMemo(() => {
    if (!form.dept) return [];

    const selectedDept = departments.find(
      d =>
        (typeof d === 'string' && d.trim().toLowerCase() === form.dept.trim().toLowerCase()) ||
        (d?.name && String(d.name).trim().toLowerCase() === form.dept.trim().toLowerCase()) ||
        (d?.departmentName && String(d.departmentName).trim().toLowerCase() === form.dept.trim().toLowerCase()) ||
        (d?.code && String(d.code).trim().toLowerCase() === form.dept.trim().toLowerCase()) ||
        (d?.id && String(d.id).trim().toLowerCase() === form.dept.trim().toLowerCase()) ||
        (d?._id && String(d._id).trim().toLowerCase() === form.dept.trim().toLowerCase())
    );

    const validDeptMatches = new Set();
    validDeptMatches.add(form.dept.trim().toLowerCase());

    if (selectedDept) {
      if (selectedDept.id) validDeptMatches.add(String(selectedDept.id).trim().toLowerCase());
      if (selectedDept._id) validDeptMatches.add(String(selectedDept._id).trim().toLowerCase());
      if (selectedDept.name) validDeptMatches.add(String(selectedDept.name).trim().toLowerCase());
      if (selectedDept.departmentName) validDeptMatches.add(String(selectedDept.departmentName).trim().toLowerCase());
      if (selectedDept.code) validDeptMatches.add(String(selectedDept.code).trim().toLowerCase());
    }

    return courses.filter(course => {
      if (course.status === 'Inactive') return false;

      const courseDeptId = course.departmentId ? String(course.departmentId).trim().toLowerCase() : '';
      const courseDept = typeof course.department === 'string'
        ? course.department.trim().toLowerCase()
        : (course.department?.id || course.department?._id || course.department?.name || course.department?.code || '');
      const courseDeptStr = courseDept ? String(courseDept).trim().toLowerCase() : '';
      const courseDeptName = course.departmentName ? String(course.departmentName).trim().toLowerCase() : '';
      const courseDeptCode = course.dept ? String(course.dept).trim().toLowerCase() : '';
      const courseDeptIdField = course.deptId ? String(course.deptId).trim().toLowerCase() : '';

      return (
        (courseDeptId && validDeptMatches.has(courseDeptId)) ||
        (courseDeptStr && validDeptMatches.has(courseDeptStr)) ||
        (courseDeptName && validDeptMatches.has(courseDeptName)) ||
        (courseDeptCode && validDeptMatches.has(courseDeptCode)) ||
        (courseDeptIdField && validDeptMatches.has(courseDeptIdField))
      );
    });
  }, [courses, departments, form.dept]);

  // Filtered student list for the left panel
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q));

      const matchesYear = filterAcademicYear === 'All' || s.academicYear === filterAcademicYear;
      const matchesDept = filterDegree === 'All' || (s.dept === filterDegree || s.department === filterDegree);
      const matchesSem = filterCourseYear === 'All' || s.sem === filterCourseYear;
      const matchesStatus = filterAppStatus === 'All' || (s.status || 'Approved') === filterAppStatus;

      return matchesSearch && matchesYear && matchesDept && matchesSem && matchesStatus;
    });
  }, [students, searchQuery, filterAcademicYear, filterDegree, filterCourseYear, filterAppStatus]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // Modern Enterprise ERP styling tokens (Clear, legible, professional)
  const erpInputStyle = {
    width: '100%',
    height: '34px',
    padding: '6px 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
    borderRadius: '5px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s'
  };

  const erpBoxStyle = {
    border: '1px solid #d8e2ec',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '16px 18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    boxSizing: 'border-box'
  };

  const erpLabelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'inherit',
    color: '#334155',
    marginBottom: '4px',
    display: 'block'
  };

  return (
    <div
      style={{
        background: '#f1f5f9',
        height: 'calc(100vh - 75px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 12px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      
      {/* ── BREADCRUMB BAR ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '6px 14px',
          marginBottom: '8px',
          fontSize: '12.5px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 600 }}>
          <button
            type="button"
            onClick={() => navigate(location.pathname.startsWith('/admin') ? '/admin/dashboard' : '/accounts/dashboard')}
            title="Navigate to Dashboard"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              borderRadius: '4px',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ⌂ Home
          </button>
          <span style={{ color: '#94a3b8' }}>»</span>
          <button
            type="button"
            onClick={() => {
              if (location.pathname.startsWith('/admin')) {
                navigate('/admin/departments');
              } else {
                navigate('/accounts/dashboard');
              }
            }}
            title="College Setup"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              borderRadius: '4px',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12.5px'
            }}
          >
            College Setup
          </button>
          <span style={{ color: '#94a3b8' }}>»</span>
          <span style={{ color: '#2563eb', fontWeight: 600 }}>User Registrations</span>
          <span style={{ color: '#94a3b8' }}>»</span>
          <span style={{ color: '#1e3a5f', fontWeight: 700 }}>Student Admissions</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
            Academic Year: {form.academicYear}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontWeight: 700 }}>
            ● Live Connected
          </span>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {successMsg && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            color: '#166534',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '8px'
          }}
        >
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '8px'
          }}
        >
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* ── MAIN WORKBENCH SPLIT (Left Filter Panel + Right Admissions Console) ── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '275px 1fr',
          gap: '10px',
          alignItems: 'stretch',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        
        {/* ========================================================= */}
        {/* LEFT PANEL: ERP FILTER MATRIX & ADMISSION LIST TABLE */}
        {/* ========================================================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          {/* 2x2 Filter Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
            <div>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Academic Year</label>
              <select
                value={filterAcademicYear}
                onChange={e => { setFilterAcademicYear(e.target.value); setCurrentPage(1); }}
                style={{ ...erpInputStyle, height: '30px', fontSize: '12px', padding: '3px 6px' }}
              >
                <option value="All">Select</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Degree Code</label>
              <select
                value={filterDegree}
                onChange={e => { setFilterDegree(e.target.value); setCurrentPage(1); }}
                style={{ ...erpInputStyle, height: '30px', fontSize: '12px', padding: '3px 6px' }}
              >
                <option value="All">Select</option>
                {departments.map((d, i) => {
                  const n = d.name || d.departmentName || d;
                  return <option key={d._id || i} value={n}>{d.code || n}</option>;
                })}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>CourseYear</label>
              <select
                value={filterCourseYear}
                onChange={e => { setFilterCourseYear(e.target.value); setCurrentPage(1); }}
                style={{ ...erpInputStyle, height: '30px', fontSize: '12px', padding: '3px 6px' }}
              >
                <option value="All">Select</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>App Status</label>
              <select
                value={filterAppStatus}
                onChange={e => { setFilterAppStatus(e.target.value); setCurrentPage(1); }}
                style={{ ...erpInputStyle, height: '30px', fontSize: '12px', padding: '3px 6px' }}
              >
                <option value="All">Select</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Add User [+] Button & Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleAddNewUser}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '5px',
                background: '#ffffff',
                border: '1px solid #94a3b8',
                color: '#1e3a5f',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Add User <span style={{ color: '#2563eb', fontWeight: 900 }}>+</span>
            </button>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{ ...erpInputStyle, height: '30px', fontSize: '12px', paddingRight: '24px' }}
              />
              <Search size={14} style={{ position: 'absolute', right: '7px', top: '8px', color: '#64748b' }} />
            </div>
          </div>

          {/* Left Student Table with Independent Scroll */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '5px', overflowY: 'auto', flex: 1, marginBottom: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#2c5282', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Student Name ▴</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Course Year</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      No student records found
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s, idx) => {
                    const isSelected = editingStudentId === (s.id || s._id);
                    return (
                      <tr
                        key={s.id || s._id || idx}
                        onClick={() => handleSelectStudentForEdit(s)}
                        style={{
                          background: isSelected ? '#bfdbfe' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'background 0.1s'
                        }}
                      >
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1e293b' }}>
                          <div style={{ fontSize: '12.5px' }}>{s.name}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{s.id}</div>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>
                          <div style={{ fontSize: '11.5px' }}>{s.sem || '1stYear-Sem-I'}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{s.dept ? (DEPARTMENT_CODES[s.dept] || s.dept) : ''}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '12px', padding: '2px 0', flexShrink: 0 }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{
                padding: '2px 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                background: '#f8fafc',
                cursor: currentPage <= 1 ? 'default' : 'pointer',
                color: currentPage <= 1 ? '#94a3b8' : '#1e293b',
                fontSize: '12px'
              }}
            >
              «
            </button>
            {Array.from({ length: Math.max(4, totalPages) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '2px 8px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  background: currentPage === page ? '#2c5282' : '#ffffff',
                  color: currentPage === page ? '#ffffff' : '#1e293b',
                  cursor: 'pointer',
                  fontWeight: currentPage === page ? 700 : 600,
                  fontSize: '12px'
                }}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= Math.max(4, totalPages)}
              onClick={() => setCurrentPage(prev => Math.min(Math.max(4, totalPages), prev + 1))}
              style={{
                padding: '2px 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                background: '#f8fafc',
                cursor: currentPage >= Math.max(4, totalPages) ? 'default' : 'pointer',
                color: currentPage >= Math.max(4, totalPages) ? '#94a3b8' : '#1e293b',
                fontSize: '12px'
              }}
            >
              »
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT WORK AREA: STEP-BY-STEP ADMISSIONS WIZARD CONSOLE */}
        {/* ========================================================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '14px 18px',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          
          {/* Top Tabs & Action Buttons Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #2c5282',
              paddingBottom: '8px',
              marginBottom: '12px',
              flexShrink: 0
            }}
          >
            {/* Student Admissions Tab Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: '#2c5282',
                  color: '#ffffff',
                  padding: '6px 16px',
                  borderRadius: '5px 5px 0 0',
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '0.2px'
                }}
              >
                {editingStudentId ? `Edit Student (${form.id || form.name})` : 'Student Admissions'}
              </div>

              {/* Physically Challenged Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', fontWeight: 600, marginLeft: '10px' }}>
                <span>PhysicallyChallenged?</span>
                <button
                  type="button"
                  onClick={() => handleChange('physicallyChallenged', !form.physicallyChallenged)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid #94a3b8',
                    background: form.physicallyChallenged ? '#10b981' : '#e2e8f0',
                    color: form.physicallyChallenged ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {form.physicallyChallenged ? 'YES' : 'NO'}
                </button>
              </div>
            </div>

            {/* Top Action Buttons: Bulk Import + Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '5px',
                  background: '#1e3a5f',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                }}
              >
                <CloudUpload size={15} /> Bulk Import
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 18px',
                  borderRadius: '5px',
                  background: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                }}
              >
                <Save size={15} /> {loading ? 'Saving...' : editingStudentId ? 'Update Student' : 'Save Admission'}
              </button>
            </div>
          </div>

          {/* ── STEPPER PROGRESS BAR (1 -> 2 -> 3 -> 4) ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '14px',
              flexShrink: 0
            }}
          >
            {WIZARD_STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const isPast = activeStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: isActive
                      ? '2px solid #2563eb'
                      : isPast
                      ? '1.5px solid #86efac'
                      : '1px solid #cbd5e1',
                    background: isActive
                      ? '#eff6ff'
                      : isPast
                      ? '#f0fdf4'
                      : '#f8fafc',
                    color: isActive ? '#1e3a5f' : isPast ? '#166534' : '#64748b',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.12)' : 'none'
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isActive ? '#2563eb' : isPast ? '#16a34a' : '#cbd5e1',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    {isPast ? <Check size={14} strokeWidth={3} /> : step.id}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: isActive ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '11px', color: isActive ? '#2563eb' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── STEP CONTENT WORKSPACE ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* ========================================================= */}
            {/* STEP 1: PERSONAL DETAILS */}
            {/* ========================================================= */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={erpBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} color="#2563eb" /> Step 1: Personal Details & Identification
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>* Indicates required fields</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 16px' }}>
                    <div>
                      <label style={erpLabelStyle}>*First Name :</label>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={e => handleChange('firstName', e.target.value)}
                        placeholder="e.g. John"
                        style={erpInputStyle}
                      />
                    </div>

                    <div>
                      <label style={erpLabelStyle}>Mid Name :</label>
                      <input
                        type="text"
                        value={form.midName}
                        onChange={e => handleChange('midName', e.target.value)}
                        placeholder="e.g. Robert"
                        style={erpInputStyle}
                      />
                    </div>

                    <div>
                      <label style={erpLabelStyle}>*Last Name :</label>
                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={e => handleChange('lastName', e.target.value)}
                        placeholder="e.g. Doe"
                        style={erpInputStyle}
                      />
                    </div>

                    <div>
                      <label style={erpLabelStyle}>*DOB (Date of Birth) :</label>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={e => handleChange('dob', e.target.value)}
                        style={erpInputStyle}
                      />
                    </div>

                    <div>
                      <label style={erpLabelStyle}>*Gender :</label>
                      <div style={{ display: 'flex', gap: '18px', fontSize: '13px', color: '#1e293b', height: '34px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                          <input
                            type="radio"
                            name="gender"
                            value="Male"
                            checked={form.gender === 'Male'}
                            onChange={e => handleChange('gender', e.target.value)}
                          /> Male
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                          <input
                            type="radio"
                            name="gender"
                            value="Female"
                            checked={form.gender === 'Female'}
                            onChange={e => handleChange('gender', e.target.value)}
                          /> Female
                        </label>
                      </div>
                    </div>

                    <div>
                      <label style={erpLabelStyle}>Aadhar Card No :</label>
                      <input
                        type="text"
                        value={form.aadharNo}
                        onChange={e => handleChange('aadharNo', e.target.value)}
                        placeholder="12-digit UID"
                        style={erpInputStyle}
                      />
                    </div>

                    <div>
                      <label style={erpLabelStyle}>Identification Marks :</label>
                      <input
                        type="text"
                        value={form.identification}
                        onChange={e => handleChange('identification', e.target.value)}
                        placeholder="e.g. Mole on right wrist"
                        style={erpInputStyle}
                      />
                    </div>

                    <div>
                      <label style={erpLabelStyle}>Family Status :</label>
                      <select
                        value={form.familyStat}
                        onChange={e => handleChange('familyStat', e.target.value)}
                        style={erpInputStyle}
                      >
                        <option value="Nuclear">Nuclear</option>
                        <option value="Joint">Joint</option>
                      </select>
                    </div>

                    <div>
                      <label style={erpLabelStyle}>1st Language :</label>
                      <select
                        value={form.firstLang}
                        onChange={e => handleChange('firstLang', e.target.value)}
                        style={erpInputStyle}
                      >
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>

                    <div>
                      <label style={erpLabelStyle}>2nd Language :</label>
                      <select
                        value={form.secondLang}
                        onChange={e => handleChange('secondLang', e.target.value)}
                        style={erpInputStyle}
                      >
                        <option value="Tamil">Tamil</option>
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="French">French</option>
                      </select>
                    </div>

                    <div>
                      <label style={erpLabelStyle}>Physically Challenged :</label>
                      <button
                        type="button"
                        onClick={() => handleChange('physicallyChallenged', !form.physicallyChallenged)}
                        style={{
                          height: '34px',
                          width: '100%',
                          padding: '4px 14px',
                          borderRadius: '5px',
                          border: '1px solid #94a3b8',
                          background: form.physicallyChallenged ? '#10b981' : '#f8fafc',
                          color: form.physicallyChallenged ? '#ffffff' : '#475569',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {form.physicallyChallenged ? '✓ Yes (Physically Challenged)' : '✕ No'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 1 Footer Navigation */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.firstName.trim() && !form.lastName.trim() && !form.name.trim()) {
                        setErrorMsg('Please enter First Name or Last Name to proceed.');
                        return;
                      }
                      setErrorMsg('');
                      setActiveStep(2);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 22px',
                      borderRadius: '5px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    Next: Contact & Address <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 2: CONTACT & ADDRESS DETAILS */}
            {/* ========================================================= */}
            {activeStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'start' }}>
                  
                  {/* Contact & Demographics */}
                  <div style={erpBoxStyle}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a5f', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} color="#2563eb" /> Contact & Identification Details
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={erpLabelStyle}>Email Id :</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => handleChange('email', e.target.value)}
                          placeholder="student@college.edu"
                          style={erpInputStyle}
                        />
                      </div>

                      <div>
                        <label style={erpLabelStyle}>Phone :</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={e => handleChange('phone', e.target.value)}
                          placeholder="Mobile Number"
                          style={erpInputStyle}
                        />
                      </div>

                      <div>
                        <label style={erpLabelStyle}>Blood Grp :</label>
                        <select
                          value={form.bloodGroup}
                          onChange={e => handleChange('bloodGroup', e.target.value)}
                          style={erpInputStyle}
                        >
                          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </div>

                      <div>
                        <label style={erpLabelStyle}>Religion :</label>
                        <input
                          type="text"
                          value={form.religion}
                          onChange={e => handleChange('religion', e.target.value)}
                          placeholder="e.g. Hindu / Muslim / Christian"
                          style={erpInputStyle}
                        />
                      </div>

                      <div>
                        <label style={erpLabelStyle}>Nationality :</label>
                        <input
                          type="text"
                          value={form.nationality}
                          onChange={e => handleChange('nationality', e.target.value)}
                          style={erpInputStyle}
                        />
                      </div>

                      <div>
                        <label style={erpLabelStyle}>Caste :</label>
                        <input
                          type="text"
                          value={form.caste}
                          onChange={e => handleChange('caste', e.target.value)}
                          placeholder="Caste category"
                          style={erpInputStyle}
                        />
                      </div>

                      <div>
                        <label style={erpLabelStyle}>Ethnicity :</label>
                        <input
                          type="text"
                          value={form.ethnicity}
                          onChange={e => handleChange('ethnicity', e.target.value)}
                          style={erpInputStyle}
                        />
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={erpLabelStyle}>PAN No :</label>
                        <input
                          type="text"
                          value={form.panNo}
                          onChange={e => handleChange('panNo', e.target.value)}
                          placeholder="PAN Card Number"
                          style={erpInputStyle}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div style={erpBoxStyle}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a5f', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color="#2563eb" /> Residential Address
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                      <div>
                        <label style={erpLabelStyle}>Country :</label>
                        <select
                          value={form.country}
                          onChange={e => handleChange('country', e.target.value)}
                          style={erpInputStyle}
                        >
                          <option value="India">India</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={erpLabelStyle}>State :</label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={e => handleChange('state', e.target.value)}
                          style={erpInputStyle}
                        />
                      </div>

                      <div>
                        <label style={erpLabelStyle}>District :</label>
                        <input
                          type="text"
                          value={form.district}
                          onChange={e => handleChange('district', e.target.value)}
                          style={erpInputStyle}
                        />
                      </div>

                      <div>
                        <label style={erpLabelStyle}>Sub-District / Taluk :</label>
                        <input
                          type="text"
                          value={form.subDistrict}
                          onChange={e => handleChange('subDistrict', e.target.value)}
                          style={erpInputStyle}
                        />
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={erpLabelStyle}>Pin Code :</label>
                        <input
                          type="text"
                          value={form.pincode}
                          onChange={e => handleChange('pincode', e.target.value)}
                          placeholder="6-digit PIN code"
                          style={erpInputStyle}
                        />
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={erpLabelStyle}>Address :</label>
                        <textarea
                          rows="3"
                          value={form.address}
                          onChange={e => handleChange('address', e.target.value)}
                          placeholder="House / Street / Door No..."
                          style={{ ...erpInputStyle, height: '62px', padding: '6px 10px', resize: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Step 2 Footer Navigation */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 20px',
                      borderRadius: '5px',
                      background: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={16} /> Back to Personal Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 22px',
                      borderRadius: '5px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    Next: Enrolling & Fees <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 3: ENROLLING & FEES */}
            {/* ========================================================= */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '14px', alignItems: 'start' }}>
                  
                  {/* Academic & Enrolling Information */}
                  <div style={erpBoxStyle}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a5f', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GraduationCap size={16} color="#2563eb" /> Academic Enrolling Information
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                      {/* Register Number */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={erpLabelStyle}>*Admission ID / Reg No :</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            required
                            value={form.id}
                            onChange={e => handleChange('id', e.target.value)}
                            style={{ ...erpInputStyle, fontWeight: 700, color: '#1e3a5f' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleChange('id', generateRegNo(form.dept, students))}
                            title="Regenerate Next Reg No"
                            style={{ padding: '4px 10px', border: '1px solid #94a3b8', background: '#f1f5f9', cursor: 'pointer', borderRadius: '5px' }}
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Department */}
                      <div>
                        <label style={erpLabelStyle}>*Department / Degree :</label>
                        <select
                          required
                          value={form.dept}
                          onChange={e => handleDepartmentChange(e.target.value)}
                          style={{ ...erpInputStyle, fontWeight: 600 }}
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept, index) => {
                            const name = dept?.name || dept?.departmentName || dept;
                            return <option key={dept?._id || index} value={name}>{name}</option>;
                          })}
                        </select>
                      </div>

                      {/* Course / Program (Strictly Filtered to Department) */}
                      <div>
                        <label style={erpLabelStyle}>*Course / Program :</label>
                        <select
                          required
                          value={form.courseId}
                          onChange={(e) => handleChange('courseId', e.target.value)}
                          disabled={!form.dept}
                          style={erpInputStyle}
                        >
                          <option value="">
                            {!form.dept
                              ? 'Select Department First'
                              : availableCourses.length === 0
                              ? 'No Courses Found For This Department'
                              : 'Select Course'}
                          </option>

                          {availableCourses.map(course => (
                            <option
                              key={course.id || course._id}
                              value={course.id || course._id}
                            >
                              {course.name} ({course.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Semester */}
                      <div>
                        <label style={erpLabelStyle}>*CourseYear / Semester :</label>
                        <select
                          required
                          value={form.sem}
                          onChange={e => handleChange('sem', e.target.value)}
                          style={erpInputStyle}
                        >
                          {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Application Type */}
                      <div>
                        <label style={erpLabelStyle}>*Application Type :</label>
                        <select
                          value={form.applicationType}
                          onChange={e => handleChange('applicationType', e.target.value)}
                          style={erpInputStyle}
                        >
                          <option value="New Enrollment">New Enrollment</option>
                          <option value="Lateral Entry">Lateral Entry</option>
                          <option value="Transfer">Transfer</option>
                        </select>
                      </div>

                      {/* Facility Toggles: Bus & Dorm */}
                      <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '4px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>Bus Facility?</label>
                          <button
                            type="button"
                            onClick={() => handleChange('busFacility', !form.busFacility)}
                            style={{
                              width: '100%',
                              height: '34px',
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid #94a3b8',
                              background: form.busFacility ? '#10b981' : '#f1f5f9',
                              color: form.busFacility ? '#ffffff' : '#475569',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {form.busFacility ? 'YES (Bus Facility Active)' : 'NO (No Bus)'}
                          </button>
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>Dorm / Hostel?</label>
                          <button
                            type="button"
                            onClick={() => handleChange('dormFacility', !form.dormFacility)}
                            style={{
                              width: '100%',
                              height: '34px',
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid #94a3b8',
                              background: form.dormFacility ? '#10b981' : '#f1f5f9',
                              color: form.dormFacility ? '#ffffff' : '#475569',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {form.dormFacility ? 'YES (Hostel Resident)' : 'NO (Day Scholar)'}
                          </button>
                        </div>
                      </div>

                      {/* Conditional Bus Facility Fields */}
                      {form.busFacility && (
                        <div
                          style={{
                            gridColumn: 'span 2',
                            background: '#f0f9ff',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #bae6fd',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px'
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Bus Route :</label>
                            <input
                              type="text"
                              placeholder="e.g. Route 12"
                              value={form.busRoute || ''}
                              onChange={e => handleChange('busRoute', e.target.value)}
                              style={{ ...erpInputStyle, height: '32px' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Pickup Point :</label>
                            <input
                              type="text"
                              placeholder="e.g. Main Gate"
                              value={form.pickupPoint || ''}
                              onChange={e => handleChange('pickupPoint', e.target.value)}
                              style={{ ...erpInputStyle, height: '32px' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Conditional Hostel Fields */}
                      {form.dormFacility && (
                        <div
                          style={{
                            gridColumn: 'span 2',
                            background: '#f0fdf4',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px'
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Hostel Name :</label>
                            <input
                              type="text"
                              placeholder="e.g. Block A"
                              value={form.hostelName || ''}
                              onChange={e => handleChange('hostelName', e.target.value)}
                              style={{ ...erpInputStyle, height: '32px' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Room Number :</label>
                            <input
                              type="text"
                              placeholder="e.g. 204"
                              value={form.roomNumber || ''}
                              onChange={e => handleChange('roomNumber', e.target.value)}
                              style={{ ...erpInputStyle, height: '32px' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Application Status */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={erpLabelStyle}>*Application Status :</label>
                        <select
                          value={form.applicationStatus}
                          onChange={e => handleChange('applicationStatus', e.target.value)}
                          style={erpInputStyle}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="Provisionally Admitted">Provisionally Admitted</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Right Column: Photo & Live Fee Plan */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Photo Upload Box */}
                    <div style={erpBoxStyle}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a5f', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Camera size={16} color="#2563eb" /> Student Photograph
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '70px',
                            height: '80px',
                            border: '1.5px solid #cbd5e1',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {form.photoUrl ? (
                            <img src={form.photoUrl} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={36} color="#94a3b8" />
                          )}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            style={{ display: 'none' }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '7px 12px',
                              borderRadius: '5px',
                              background: '#315d86',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Camera size={14} /> Upload Photo
                          </button>
                          {form.photoUrl && (
                            <button
                              type="button"
                              onClick={() => handleChange('photoUrl', '')}
                              style={{
                                padding: '2px',
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontWeight: 600
                              }}
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live Fee Plan Card */}
                    <div style={{
                      ...erpBoxStyle,
                      border: '1.5px solid #93c5fd',
                      background: '#f0f7ff'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #bfdbfe', paddingBottom: '6px' }}>
                        <span>Live Fee Structure</span>
                        <span style={{
                          fontSize: '11px',
                          color: selectedFeePlan?.isDefaultStandard ? '#1d4ed8' : '#15803d',
                          background: selectedFeePlan?.isDefaultStandard ? '#dbeafe' : '#dcfce7',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {selectedFeePlan?.isDefaultStandard ? 'Standard Plan' : 'Custom Plan Linked'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: '#334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tuition Fee:</span>
                          <strong>₹{Number(selectedFeePlan?.tuitionFee || 55000).toLocaleString('en-IN')}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Exam, Lab & Library Fee:</span>
                          <strong>₹{Number((selectedFeePlan?.examFee || 2500) + (selectedFeePlan?.labFee || 5000) + (selectedFeePlan?.libraryFee || 2500)).toLocaleString('en-IN')}</strong>
                        </div>

                        {form.busFacility && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                            <span>Transport / Bus Fee:</span>
                            <strong>₹{Number(form.transportFee || selectedFeePlan?.transportFee || 15000).toLocaleString('en-IN')}</strong>
                          </div>
                        )}

                        {form.dormFacility && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                            <span>Hostel / Dorm Fee:</span>
                            <strong>₹{Number(form.hostelFee || selectedFeePlan?.hostelFee || 40000).toLocaleString('en-IN')}</strong>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14.5px', color: '#15803d', borderTop: '2px dashed #93c5fd', paddingTop: '8px', marginTop: '4px' }}>
                          <span>Total Admission Fee:</span>
                          <span>₹{Number(form.totalFee || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Step 3 Footer Navigation */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 20px',
                      borderRadius: '5px',
                      background: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={16} /> Back to Contact & Address
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!form.dept) {
                        setErrorMsg('Please select a Department in Step 3.');
                        return;
                      }
                      if (!form.courseId && courses.length > 0) {
                        setErrorMsg('Please select a Course in Step 3.');
                        return;
                      }
                      setErrorMsg('');
                      setActiveStep(4);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 22px',
                      borderRadius: '5px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    Next: Languages & Family Details <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 4: LANGUAGES, FAMILY DETAILS & FINAL SUBMISSION */}
            {/* ========================================================= */}
            {activeStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                
                {/* Language Proficiency Table */}
                <div style={{ ...erpBoxStyle, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Languages size={16} color="#2563eb" /> Language Proficiency
                    </span>
                    <button
                      type="button"
                      onClick={handleAddLanguage}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: '#2c5282',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      + Add Language
                    </button>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ background: '#2c5282', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', fontWeight: 600 }}>Language</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>Reading</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>Writing</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>Speaking</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.languages.map((lang, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '5px 10px' }}>
                            <input
                              type="text"
                              value={lang.language}
                              onChange={e => handleLanguageChange(idx, 'language', e.target.value)}
                              style={{ ...erpInputStyle, width: '180px', height: '30px' }}
                            />
                          </td>
                          <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={lang.reading}
                              onChange={e => handleLanguageChange(idx, 'reading', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={lang.writing}
                              onChange={e => handleLanguageChange(idx, 'writing', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={lang.speaking}
                              onChange={e => handleLanguageChange(idx, 'speaking', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveLanguage(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                              title="Delete Language"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Family Details Table */}
                <div style={{ ...erpBoxStyle, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={16} color="#2563eb" /> Parent & Family Details
                    </span>
                    <button
                      type="button"
                      onClick={handleAddFamilyMember}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: '#2c5282',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      + Add Member
                    </button>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ background: '#2c5282', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', fontWeight: 600, width: '110px' }}>Relation</th>
                        <th style={{ padding: '6px 10px', fontWeight: 600 }}>First Name</th>
                        <th style={{ padding: '6px 10px', fontWeight: 600 }}>Middle Name</th>
                        <th style={{ padding: '6px 10px', fontWeight: 600 }}>Last Name</th>
                        <th style={{ padding: '6px 10px', fontWeight: 600 }}>Mobile</th>
                        <th style={{ padding: '6px 10px', fontWeight: 600 }}>Parent Email</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, width: '45px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.familyMembers.map((member, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '5px 8px', fontWeight: 600 }}>
                            <select
                              value={member.relation}
                              onChange={e => handleFamilyChange(idx, 'relation', e.target.value)}
                              style={{ ...erpInputStyle, height: '30px', fontSize: '12px' }}
                            >
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Guardian">Guardian</option>
                            </select>
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            <input
                              type="text"
                              value={member.firstName}
                              onChange={e => handleFamilyChange(idx, 'firstName', e.target.value)}
                              placeholder="First Name"
                              style={{ ...erpInputStyle, height: '30px' }}
                            />
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            <input
                              type="text"
                              value={member.middleName}
                              onChange={e => handleFamilyChange(idx, 'middleName', e.target.value)}
                              placeholder="Middle Name"
                              style={{ ...erpInputStyle, height: '30px' }}
                            />
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            <input
                              type="text"
                              value={member.lastName}
                              onChange={e => handleFamilyChange(idx, 'lastName', e.target.value)}
                              placeholder="Last Name"
                              style={{ ...erpInputStyle, height: '30px' }}
                            />
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            <input
                              type="tel"
                              value={member.mobile}
                              onChange={e => handleFamilyChange(idx, 'mobile', e.target.value)}
                              placeholder="Phone"
                              style={{ ...erpInputStyle, height: '30px' }}
                            />
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            <input
                              type="email"
                              value={member.email}
                              onChange={e => handleFamilyChange(idx, 'email', e.target.value)}
                              placeholder="Email"
                              style={{ ...erpInputStyle, height: '30px' }}
                            />
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                            {form.familyMembers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFamilyMember(idx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                title="Delete Member"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Admission Summary Snapshot */}
                <div style={{ ...erpBoxStyle, background: '#f8fafc', padding: '12px 16px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e3a5f', marginBottom: '6px' }}>
                    Quick Summary Checklist:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#334155' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      Student: {form.name || form.firstName || 'Not Specified'}
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      Reg No: {form.id || 'Auto'}
                    </span>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      Dept: {form.dept || 'None'}
                    </span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      Semester: {form.sem}
                    </span>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '12px', fontWeight: 800 }}>
                      Total Fee: ₹{Number(form.totalFee || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Step 4 Footer Navigation */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 20px',
                      borderRadius: '5px',
                      background: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={16} /> Back to Enrolling & Fees
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 26px',
                      borderRadius: '5px',
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 6px rgba(21,128,61,0.25)'
                    }}
                  >
                    <Save size={16} /> {loading ? 'Saving Admission...' : editingStudentId ? 'Update Student Record' : 'Submit & Save Admission'}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ── BULK IMPORT MODAL ── */}
      {showBulkModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              maxWidth: '540px',
              width: '100%',
              padding: '18px 22px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloudUpload size={18} color="#2c5282" /> Bulk Import Students
              </h3>
              <button onClick={() => setShowBulkModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
              Paste CSV rows in the format: <br />
              <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#0f172a', fontSize: '11.5px', display: 'inline-block', marginTop: '4px' }}>
                Full Name, Email, Department, CourseYear
              </code>
            </p>

            <textarea
              rows="6"
              value={bulkDataText}
              onChange={e => setBulkDataText(e.target.value)}
              placeholder="Rohan Sharma, rohan@college.edu, Computer Science & Engineering, 1stYear-Sem-I&#10;Sneha Patel, sneha@college.edu, MATHEMATICS, 1stYear-Sem-I"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '12px',
                fontFamily: 'monospace',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#1e293b',
                boxSizing: 'border-box',
                marginBottom: '14px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{ padding: '7px 14px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkImporting || !bulkDataText.trim()}
                onClick={handleProcessBulkImport}
                style={{ padding: '7px 18px', borderRadius: '4px', border: 'none', background: '#2c5282', color: '#ffffff', cursor: bulkImporting ? 'not-allowed' : 'pointer', fontSize: '12.5px', fontWeight: 700 }}
              >
                {bulkImporting ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegistration;
