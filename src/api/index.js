import axios from 'axios';

// In production (Vercel), use the Render backend URL.
// In local dev, use localhost via the Vite proxy.
const getBaseURL = () => {
  // In local dev and local network (LAN IP), connect directly to the local backend
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      port === '5173' ||
      port === '3000'
    ) {
      return `http://${host || '127.0.0.1'}:5000/api`;
    }
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return 'https://college-erp-software.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Add a request interceptor for JWT
api.interceptors.request.use(
  (config) => {
    let token = null;
    try {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        token = sessionStorage.getItem('admin_token');
      } else if (path.startsWith('/superadmin')) {
        token = sessionStorage.getItem('superadmin_token');
      } else if (path.startsWith('/subadmin')) {
        token = sessionStorage.getItem('subadmin_token');
      } else if (path.startsWith('/principal')) {
        token = sessionStorage.getItem('principal_token');
      } else if (path.startsWith('/hod')) {
        token = sessionStorage.getItem('hod_token');
      } else if (path.startsWith('/staff')) {
        token = sessionStorage.getItem('staff_token');
      } else if (path.startsWith('/student')) {
        token = sessionStorage.getItem('student_token');
      } else if (path.startsWith('/parent')) {
        token = sessionStorage.getItem('parent_token');
      } else if (path.startsWith('/accounts')) {
        token = sessionStorage.getItem('accounts_token') || sessionStorage.getItem('admin_token') || sessionStorage.getItem('superadmin_token');
      } else if (path.startsWith('/driver')) {
        token = sessionStorage.getItem('driver_token');
      } else if (path.startsWith('/hostel')) {
        token = sessionStorage.getItem('hostel_token');
      } else if (path.startsWith('/librarian')) {
        token = sessionStorage.getItem('librarian_token');
      } else if (path.startsWith('/placement')) {
        token = sessionStorage.getItem('placement_token');
      } else if (path.startsWith('/watchman')) {
        token = sessionStorage.getItem('watchman_token') || sessionStorage.getItem('admin_token') || sessionStorage.getItem('superadmin_token');
      }

      // Neutral paths (e.g. /referrals, /business-referral, /settings) or fallback:
      // First check active role or currently present session key to prevent cross-account token mixup
      if (!token) {
        const activeRole = sessionStorage.getItem('active_role') || localStorage.getItem('role');
        if (activeRole) {
          const roleKey = activeRole.toLowerCase().replace(/\s+/g, '');
          token = sessionStorage.getItem(`${roleKey}_token`);
        }
      }

      if (!token) {
        // Detect which role session is currently stored
        const roleOrder = [
          'driver', 'staff', 'student', 'parent', 'librarian', 'watchman',
          'hostel', 'placement', 'hod', 'accounts', 'principal', 'admin',
          'subadmin', 'superadmin'
        ];
        for (const r of roleOrder) {
          if (sessionStorage.getItem(`${r}_session`)) {
            token = sessionStorage.getItem(`${r}_token`);
            if (token) break;
          }
        }
      }

      if (!token) {
        token = sessionStorage.getItem('token') || localStorage.getItem('token');
      }
    } catch (e) {
      console.error('Error fetching token from storage', e);
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const activeTenant = sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId') || sessionStorage.getItem('collegeId') || localStorage.getItem('collegeId');
      if (activeTenant && activeTenant !== 'undefined' && activeTenant !== 'null') {
        config.headers['x-tenant-id'] = activeTenant;
      }
    } catch (_) {}

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to catch 401 Unauthorized errors (session expired/database reset)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do not trigger session expiry redirect if the 401 comes from a login attempt (which just means bad credentials)
      if (error.config && error.config.url && error.config.url.includes('/login')) {
        return Promise.reject(error);
      }

      // Do not trigger redirect if fetching settings or public endpoints
      if (error.config && error.config.url && error.config.url.includes('/settings')) {
        return Promise.reject(error);
      }

      // Do not redirect if on a public route (not under protected route prefixes)
      const protectedPrefixes = ['/admin', '/superadmin', '/subadmin', '/principal', '/hod', '/staff', '/student', '/parent', '/accounts', '/driver', '/hostel', '/librarian', '/placement'];
      const isProtectedRoute = protectedPrefixes.some(prefix => window.location.pathname.startsWith(prefix));
      if (!isProtectedRoute) {
        return Promise.reject(error);
      }

      // Do not redirect if using a mock token (fallback mode)
      let isMock = false;
      if (error.config && error.config.headers && error.config.headers.Authorization) {
        if (error.config.headers.Authorization.includes('mock-')) {
          isMock = true;
        }
      }

      if (isMock) {
        return Promise.reject(error);
      }

      // CRITICAL: Do not wipe session or redirect if on the /driver route.
      // Driver auth is local-only (mock token), the backend will always return 401.
      // Clearing the session here would boot the driver back to the landing page.
      if (window.location.pathname.startsWith('/driver')) {
        return Promise.reject(error);
      }

      console.warn('Session expired or unauthorized! Clearing session storage and redirecting to login...');
      const keys = [
        'superadmin_token', 'admin_token', 'subadmin_token', 'principal_token', 'hod_token', 'staff_token', 'student_token', 'parent_token', 'accounts_token', 'driver_token', 'hostel_token', 'watchman_token', 'librarian_token', 'placement_token',
        'superadmin_session', 'admin_session', 'subadmin_session', 'principal_session', 'hod_session', 'staff_session', 'student_session', 'parent_session', 'accounts_session', 'driver_session', 'hostel_session', 'watchman_session', 'librarian_session', 'placement_session'
      ];
      keys.forEach(k => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });

      // Prevent infinite redirect loops if already on login page
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }

    if (error.response && error.response.status === 403) {
      const msg = error.response.data?.message || '';
      if (msg.toLowerCase().includes('deactivated')) {
        console.warn('College is deactivated! Clearing session storage and redirecting to login...');
        const keys = [
          'superadmin_token', 'admin_token', 'subadmin_token', 'principal_token', 'hod_token', 'staff_token', 'student_token', 'parent_token', 'accounts_token', 'driver_token', 'hostel_token', 'watchman_token', 'librarian_token', 'placement_token',
          'superadmin_session', 'admin_session', 'subadmin_session', 'principal_session', 'hod_session', 'staff_session', 'student_session', 'parent_session', 'accounts_session', 'driver_session', 'hostel_session', 'watchman_session', 'librarian_session', 'placement_session'
        ];
        keys.forEach(k => {
          sessionStorage.removeItem(k);
          localStorage.removeItem(k);
        });

        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = '/login?deactivated=true';
        }
      }
    }
    return Promise.reject(error);
  }
);


// Auth Endpoints
export const loginUser = (credentials) => api.post('/auth/login', {
  email: credentials.email?.trim().toLowerCase(),
  password: credentials.password?.trim()
});
export const getMyProfile = () => api.get('/auth/me');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });

// Student & Admission Endpoints
export const getStudents = () => api.get('/students');
export const getStudentById = (id) => api.get(`/students/${id}`);
export const createStudent = (studentData) => api.post('/students', studentData);
export const updateStudent = (id, studentData) => api.put(`/students/${id}`, studentData);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const purgeAllStudents = () => api.post('/students/purge-all');
export const promoteStudents = (payload) => api.post('/students/promote', payload);
export const allocateStudentsToSection = (payload) =>
  api.put('/students/allocate-section', payload);

// Step 32: Backend Payment API
export const recordAdmissionPayment = (id, paymentData) =>
  api.put(`/admissions/${id}/payment`, paymentData);
export const updateAdmissionPayment = (id, paymentId, paymentData) =>
  api.put(`/admissions/${id}/payment/${paymentId}`, paymentData);
export const deleteAdmissionPayment = (id, paymentId) =>
  api.delete(`/admissions/${id}/payment/${paymentId}`);
export const getAdmissions = () => api.get('/admissions');
export const getAdmissionById = (id) => api.get(`/admissions/${id}`);

// Staff Endpoints
export const getStaff = (params) => api.get('/staff', { params });
export const getAllStaff = (params) => api.get('/staff', { params });
export const getStaffForPayroll = () => api.get('/staff/payroll-list');
export const createStaff = (staffData) => api.post('/staff', staffData);
export const updateStaff = (id, staffData) => api.put(`/staff/${id}`, staffData);
export const approveStaff = (id) => api.put(`/staff/${id}/approve`);
export const deleteStaff = (id) => api.delete(`/staff/${id}`);

// Timetable Endpoints
export const getTimetable = (department, semester, section, day) => {
  const params = { department };
  if (semester) params.semester = semester;
  if (section) params.section = section;
  if (day) params.day = day;
  return api.get('/timetable', { params });
};
export const getMyTimetable = () => api.get('/timetable/my-schedule');
export const createTimetable = (data) => api.post('/timetable', data);
export const deleteTimetable = (id) => api.delete(`/timetable/${id}`);
export const getAllTimetables = () => api.get('/timetable');

// Class Advisor Endpoints
export const getClassAdvisors = (params) => api.get('/class-advisor', { params });
export const getMyAdvisingClass = () => api.get('/class-advisor/my-class');
export const getClassAdvisorInfo = (dept, sem, sec) => api.get(`/class-advisor/class/${dept}/${sem}/${sec}`);
export const assignClassAdvisor = (data) => api.post('/class-advisor', data);
export const removeClassAdvisor = (id) => api.delete(`/class-advisor/${id}`);

// Department Endpoints
export const getDepartments = () => api.get('/departments');
export const createDepartment = (deptData) => api.post('/departments', deptData);
export const updateDepartment = (id, deptData) => api.put(`/departments/${id}`, deptData);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

// Course Endpoints
export const getCourses = (departmentId = "") =>
  api.get("/courses", {
    params: departmentId ? { departmentId } : {}
  });

export const createCourse = (courseData) =>
  api.post("/courses", courseData);

export const updateCourse = (id, courseData) =>
  api.put(`/courses/${id}`, courseData);

export const deleteCourse = (id) =>
  api.delete(`/courses/${id}`);


// Semester Endpoints
export const getSemesters = (params = {}) =>
  api.get("/semesters", { params });

export const createSemester = (semesterData) =>
  api.post("/semesters", semesterData);

export const updateSemester = (id, semesterData) =>
  api.put(`/semesters/${id}`, semesterData);

export const deleteSemester = (id) =>
  api.delete(`/semesters/${id}`);


// Section Endpoints
export const getSections = (params = {}) =>
  api.get("/sections", { params });

export const getMyClass = () =>
  api.get("/sections/my-class");

export const createSection = (sectionData) =>
  api.post("/sections", sectionData);

export const updateSection = (id, sectionData) =>
  api.put(`/sections/${id}`, sectionData);

export const deleteSection = (id) =>
  api.delete(`/sections/${id}`);

// Subject Endpoints
export const getSubjects = (params) => api.get('/subjects', { params });
export const createSubject = (subjectData) => api.post('/subjects', subjectData);
export const updateSubject = (id, subjectData) => api.put(`/subjects/${id}`, subjectData);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

// Academic Master Endpoints
export const getAcademicYears = () => api.get('/academic/years');
export const createAcademicYear = (data) => api.post('/academic/years', data);
export const getRegulations = (params) => api.get('/academic/regulations', { params });
export const createRegulation = (data) => api.post('/academic/regulations', data);

// Faculty Allocation Endpoints
export const getFacultyAllocations = (params) => api.get('/faculty-allocation', { params });
export const getMyFacultyAllocations = () => api.get('/faculty-allocation/my-allocations');
export const createFacultyAllocation = (data) => api.post('/faculty-allocation', data);
export const deleteFacultyAllocation = (id) => api.delete(`/faculty-allocation/${id}`);

// Period Master Endpoints
export const getPeriodMasters = () => api.get('/period-master');
export const createPeriodMaster = (data) => api.post('/period-master', data);
export const deletePeriodMaster = (id) => api.delete(`/period-master/${id}`);

// Attendance Endpoints
export const getAllAttendance = () => api.get('/attendance');
export const getAttendanceByStudent = (studentId) => api.get(`/attendance/student/${studentId}`);
export const createAttendance = (attendanceData) => api.post('/attendance', attendanceData);
export const markAttendance = (attendanceData) => api.post('/attendance', attendanceData);
export const updateAttendance = (id, attendanceData) => api.put(`/attendance/${id}`, attendanceData);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`);

// Marks Endpoints
export const getAllMarks = () => api.get('/marks');
export const getMarksByStudent = (studentId) => api.get(`/marks/student/${studentId}`);
export const createMark = (markData) => api.post('/marks', markData);
export const submitMarksToHod = (examId) => api.post(`/marks/submit/${examId}`);
export const updateMark = (id, markData) => api.put(`/marks/${id}`, markData);
export const approveMark = (id) => api.patch(`/marks/${id}/approve`);
export const deleteMark = (id) => api.delete(`/marks/${id}`);

// Fees Endpoints
export const getAllFees = () => api.get('/fees');
export const getFeesByStudent = (studentId) => api.get(`/fees/student/${studentId}`);
export const getStudentFeeStructure = (studentId) => api.get(`/fees/structure/${studentId}`);
export const getFeeStructures = (params = {}) => api.get('/fee-structures', { params });
export const saveFeeStructure = (data) => api.post('/fee-structures', data);
export const createFeeStructure = (data) => api.post('/fee-structures', data);
export const updateFeeStructure = (id, data) => api.put(`/fee-structures/${id}`, data);
// Step 49: Quota Management Endpoints
export const getQuotas = (params = {}) => api.get('/quotas', { params });
export const getQuotaById = (id) => api.get(`/quotas/${id}`);
export const createQuota = (data) => api.post('/quotas', data);
export const updateQuota = (id, data) => api.put(`/quotas/${id}`, data);
export const deleteQuota = (id) => api.delete(`/quotas/${id}`);

export const deleteFeeStructure = (id) => api.delete(`/fee-structures/${id}`);
export const createFee = (feeData) => api.post('/fees', feeData);
export const updateFee = (id, feeData) => api.put(`/fees/${id}`, feeData);
export const deleteFee = (id) => api.delete(`/fees/${id}`);

// Salary / Payroll Endpoints
export const getSalaries = () => api.get('/salaries');
export const getAllSalaries = () => api.get('/salaries');
export const getMySalaries = () => api.get('/salaries/my');
export const getSalariesByStaff = (staffId) => api.get(`/salaries/staff/${staffId}`);
export const createSalary = (data) => api.post('/salaries', data);
export const updateSalary = (id, data) => api.put(`/salaries/${id}`, data);
export const deleteSalary = (id) => api.delete(`/salaries/${id}`);

// Expenses
export const getExpenses = () => api.get('/expenses');
export const createExpense = (data) => api.post('/expenses', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Reports Endpoints
export const getAttendanceReport = () => api.get('/reports/attendance');
export const getLowAttendanceReport = () => api.get('/reports/low-attendance');
export const getCgpaReport = () => api.get('/reports/cgpa');
export const getFeesReport = () => api.get('/reports/fees');

// Welfare & Discipline APIs
export const getWelfareRecords = () => api.get('/welfare');
export const createWelfareRecord = (data) => api.post('/welfare', data);
export const updateWelfareRecord = (id, data) => api.put(`/welfare/${id}`, data);
export const deleteWelfareRecord = (id) => api.delete(`/welfare/${id}`);
export const approveScholarship = (id, data) => api.put(`/welfare/${id}/approve-scholarship`, data);

export const getPendingFeesReport = () => api.get('/reports/pending-fees');
export const getDepartmentsReport = () => api.get('/reports/departments');
export const getActivityLogs = () => api.get('/reports/activity-logs');

// Transport Management
export const getTransportVehicles = () => api.get('/transport/vehicles').catch(() => ({ data: [] }));
export const createTransportVehicle = (data) => api.post('/transport/vehicles', data);
export const updateTransportVehicle = (id, data) => api.put(`/transport/vehicles/${id}`, data);
export const deleteTransportVehicle = (id) => api.delete(`/transport/vehicles/${id}`);

export const getTransportRoutes = () => api.get('/transport/routes').catch(() => ({ data: [] }));
export const createTransportRoute = (data) => api.post('/transport/routes', data);
export const updateTransportRoute = (id, data) => api.put(`/transport/routes/${id}`, data);
export const deleteTransportRoute = (id) => api.delete(`/transport/routes/${id}`);
export const getTransportDrivers = (params) => api.get('/transport/drivers', { params });
export const createTransportDriver = (data) => api.post('/transport/drivers', data);
export const updateTransportDriver = (id, data) => api.put(`/transport/drivers/${id}`, data);
export const deleteTransportDriver = (id) => api.delete(`/transport/drivers/${id}`);
export const getTransportStudents = (params) => api.get('/transport/students', { params });
export const getTransportStudentById = (id) => api.get(`/transport/students/${id}`);
export const createTransportStudent = (data) => api.post('/transport/students', data);
export const updateTransportStudent = (id, data) => api.put(`/transport/students/${id}`, data);
export const deleteTransportStudent = (id) => api.delete(`/transport/students/${id}`);

// Driver Operations
export const getDriverAttendance = (params) => api.get('/transport/attendance', { params });
export const markDriverAttendance = (data) => api.post('/transport/attendance', data);
export const getTransportComplaints = (params) => api.get('/transport/complaints', { params });
export const getTransportComplaintById = (id) => api.get(`/transport/complaints/${id}`);
export const getStudentTransportComplaints = (studentId) => api.get('/transport/complaints', { params: { studentId } });
export const createTransportComplaint = (data) => api.post('/transport/complaints', data);
export const updateTransportComplaint = (id, data) => api.put(`/transport/complaints/${id}`, data);
export const addTransportComplaintReply = (id, data) => api.post(`/transport/complaints/${id}/reply`, data);
export const deleteTransportComplaint = (id) => api.delete(`/transport/complaints/${id}`);
export const getTransportTrips = () => api.get('/transport/trips');
export const createTransportTrip = (data) => api.post('/transport/trips', data);
export const updateTransportTrip = (id, data) => api.put(`/transport/trips/${id}`, data);
export const getTransportMaintenance = () => api.get('/transport/maintenance');
export const createTransportMaintenance = (data) => api.post('/transport/maintenance', data);
export const updateTransportMaintenance = (id, data) => api.put(`/transport/maintenance/${id}`, data);
export const deleteTransportMaintenance = (id) => api.delete(`/transport/maintenance/${id}`);
export const getTransportNotifications = (params) => api.get('/transport/notifications', { params });
export const createTransportNotification = (data) => api.post('/transport/notifications', data);

// Student Transport Attendance & Boarding Reports
export const getStudentTransportAttendance = (params) => api.get('/transport/student-attendance', { params });
export const markStudentTransportAttendance = (data) => api.post('/transport/student-attendance', data);
export const correctStudentTransportAttendance = (data) => api.post('/transport/student-attendance/correct', data);
export const getStudentTransportAttendanceReport = (params) => api.get('/transport/student-attendance/report', { params });

// Hostel Management
export const getHostelBlocks = () => api.get('/hostel/blocks');
export const createHostelBlock = (data) => api.post('/hostel/blocks', data);
export const getHostelRooms = () => api.get('/hostel/rooms');
export const createHostelRoom = (data) => api.post('/hostel/rooms', data);
export const getHostelRequests = () => api.get('/hostel/requests');
export const createHostelRequest = (studentId) => api.post('/hostel/requests', { studentId });
export const allocateHostelRequest = (id, data) => api.put(`/hostel/requests/${id}/allocate`, data);
export const getHostelStudents = () => api.get('/hostel/students');
export const getHostelComplaints = () => api.get('/hostel/complaints');
export const approveHostelComplaint = (id) => api.put(`/hostel/complaints/${id}/approve`);
export const rejectHostelComplaint = (id) => api.put(`/hostel/complaints/${id}/reject`);
export const resolveHostelComplaint = (id) => api.put(`/hostel/complaints/${id}/resolve`);
export const getStudentHostelComplaints = (studentId) => api.get(`/hostel/complaints?studentId=${studentId}`);
export const createHostelComplaint = (data) => api.post('/hostel/complaints', data);
export const updateHostelComplaint = (id, data) => api.put(`/hostel/complaints/${id}`, data);

// Placement Endpoints
export const applyForPlacement = (data) => api.post('/placement/applications', data);

// Placement Management
export const getPlacementCompanies = () => api.get('/placement/companies');
export const createPlacementCompany = (data) => api.post('/placement/companies', data);
export const updatePlacementCompany = (id, data) => api.put(`/placement/companies/${id}`, data);
export const deletePlacementCompany = (id) => api.delete(`/placement/companies/${id}`);

export const getPlacementJobs = () => api.get('/placement/jobs');
export const createPlacementJob = (data) => api.post('/placement/jobs', data);
export const updatePlacementJob = (id, data) => api.put(`/placement/jobs/${id}`, data);
export const deletePlacementJob = (id) => api.delete(`/placement/jobs/${id}`);
export const getEligibleStudentsForJob = (id) => api.get(`/placement/jobs/${id}/eligible-students`).catch(() => ({
  data: {
    eligible: [
      { id: 'CS2022001', name: 'John Doe', dept: 'CSE', cgpa: 8.5, arrears: 0 },
      { id: 'CS2022002', name: 'Jane Smith', dept: 'IT', cgpa: 9.0, arrears: 0 }
    ],
    notEligible: [
      { id: 'CS2022003', name: 'Mike Ross', dept: 'MECH', cgpa: 6.5, arrears: 2, reason: 'CGPA below 7.0 & Arrears > 0' }
    ]
  }
}));

export const getPlacementApplications = () => api.get('/placement/applications');
export const updatePlacementApplicationStatus = async (id, data) => {
  const payload = typeof data === 'string' ? { status: data } : data;
  try {
    return await api.put(`/placement/applications/${id}/status`, payload);
  } catch (err) {
    if (err.response?.status === 404) {
      try {
        return await api.put(`/placement/applications/${id}`, payload);
      } catch (err2) {
        if (payload.company || payload.regNo) {
          try {
            return await api.post(`/placement/applications`, {
              ...payload,
              applicationId: id
            });
          } catch (err3) {}
        }
      }
    }
    throw err;
  }
};
export const bulkApplyPlacementApplications = (data) => api.post('/placement/applications/bulk-apply', data);
export const getPlacementInterviews = () => api.get('/placement/interviews');
export const createPlacementInterview = (data) => api.post('/placement/interviews', data);
export const getPlacementSelections = () => api.get('/placement/selections');
export const createPlacementSelection = (data) => api.post('/placement/selections', data);

// Settings & Security
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const getLoginLogs = () => api.get('/settings/logs');
export const getSettingsLogs = () => api.get('/settings/logs');

// Notifications
export const getNotifications = (params = {}) => api.get('/notifications', { params }).catch(() => ({ data: [] })).then(res => {
  try {
    // Only inject local mock events if on the Principal portal
    if (!window.location.pathname.startsWith('/principal')) {
      return res;
    }

    // Find active tenantId from session
    let tenantId = 'default';
    const SESSION_KEYS = ['principal_session'];
    for (const key of SESSION_KEYS) {
      const sessionData = sessionStorage.getItem(key);
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          if (parsed.tenantId) {
            tenantId = parsed.tenantId;
            break;
          }
        } catch (e) { }
      }
    }
    const rawEvents = localStorage.getItem(`principal_meetings_events_${tenantId}`);
    if (rawEvents) {
      const events = JSON.parse(rawEvents);
      const activeEvents = events.filter(e => e.status !== 'Cancelled').map(e => ({
        _id: 'prin_' + e.id,
        title: `📢 ${e.type}: ${e.name}`,
        message: `Scheduled: ${new Date(e.dateTime).toLocaleString()} | Venue: ${e.venue}. ${e.agenda || ''}`,
        type: e.type.includes('Meeting') ? 'Warning' : 'Success',
        createdAt: e.dateTime || new Date().toISOString()
      }));
      if (!res.data) res.data = [];
      if (Array.isArray(res.data)) {
        res.data = [...res.data, ...activeEvents];
      } else if (res.data && Array.isArray(res.data.notifications)) {
        res.data.notifications = [...res.data.notifications, ...activeEvents];
      }
    }
  } catch (e) { console.error(e); }
  return res;
});
export const getUnreadNotifications = () => api.get('/notifications/unread');
export const createNotification = (data) => api.post('/notifications', data);
export const markNotificationAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// Staff Support
export const getStaffSupportRequests = () => api.get('/staff-support');
export const createStaffSupportRequest = (data) => api.post('/staff-support', data);
export const updateStaffSupportRequest = (id, data) => api.put(`/staff-support/${id}`, data);
export const deleteStaffSupportRequest = (id) => api.delete(`/staff-support/${id}`);

// HOD Support
export const getHodSupportRequests = () => api.get('/hod-support');
export const createHodSupportRequest = (data) => api.post('/hod-support', data);
export const updateHodSupportRequest = (id, data) => api.put(`/hod-support/${id}`, data);
export const deleteHodSupportRequest = (id) => api.delete(`/hod-support/${id}`);

// Analytics
export const getAnalytics = () => api.get('/analytics');

// Dynamic User Management Endpoints (Admin Permissions/Parents management)
export const getUsers = () => api.get('/auth/users');
export const registerCollege = (data) => api.post('/auth/register-college', data);
export const createUser = (userData) => api.post('/auth/users', userData);
export const updateUser = (id, userData) => api.put(`/auth/users/${id}`, userData);
export const deleteUser = (id) => api.delete(`/auth/users/${id}`);

// Principal Approvals Workflows
export const getApprovals = () => api.get('/approvals');
export const getPendingApprovals = () => api.get('/approvals/pending');
export const submitApprovalAction = (id, status, comments) => api.put(`/approvals/${id}`, { status, comments });

// Principal - HOD Meetings & Reviews
export const createMeeting = (data) => api.post('/meetings', data);
export const getMeetings = (params) => api.get('/meetings', { params });
export const updateMeetingStatus = (id, status, notes) => api.patch(`/meetings/${id}`, { status, notes });
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`);

// AI Predictive Analytics
export const getAIInsights = () => api.get('/analytics/ai-insights');

// Unified Exam Timetable System
export const getExams = () => api.get('/exams');
export const createExam = (data) => api.post('/exams', data);
export const updateExam = (id, data) => api.put(`/exams/${id}`, data);
export const deleteExam = (id) => api.delete(`/exams/${id}`);

// Library Management
export const getLibraryBooks = (params) => api.get('/library/books', { params });
export const createLibraryBook = (data) => api.post('/library/books', data);
export const deleteLibraryBook = (id) => api.delete(`/library/books/${id}`);
export const clearLibraryDummyData = (data = {}) => api.post('/library/clear-dummy-data', data);
export const deleteLibraryTransaction = (id) => api.delete(`/library/transactions/${id}`);
export const cancelLibraryRequest = (id) => api.delete(`/library/transactions/${id}`);
export const deleteLibraryReservation = (id) => api.delete(`/library/reservations/${id}`);
export const requestLibraryBook = (data) => api.post('/library/request', data);
export const getMyLibraryTransactions = () => api.get('/library/my-transactions');
export const getMyLibraryClearance = () =>
  api.get('/library/clearance/my');

export const requestLibraryClearance = (data = {}) =>
  api.post('/library/clearance/request', data);

export const getLibraryClearanceRequests = () =>
  api.get('/library/clearance');

export const getLibraryClearances = () =>
  api.get('/library/clearance');

export const getStudentLibraryClearance = (studentId) =>
  api.get(`/library/clearance/student/${studentId}`);

export const directIssueLibraryClearance = (data) =>
  api.post('/library/clearance/direct-issue', data);

export const approveLibraryClearance = (id, remarks = '') =>
  api.put(`/library/clearance/${id}/approve`, typeof remarks === 'object' ? remarks : { remarks });

export const rejectLibraryClearance = (id, remarks = '') =>
  api.put(`/library/clearance/${id}/reject`, typeof remarks === 'object' ? remarks : { remarks });
export const getAllLibraryTransactions = (params) => api.get('/library/transactions', { params });
export const issueLibraryBook = (id) => api.put(`/library/transactions/${id}/issue`);
export const manualIssueLibraryBook = (data) => api.post('/library/transactions/manual-issue', data);
export const returnLibraryBook = (id) => api.put(`/library/transactions/${id}/return`);
export const rejectLibraryRequest = (id) => api.put(`/library/transactions/${id}/reject`);
export const payLibraryFine = (id, amount, paymentMethod = 'Cash', remarks = '') =>
  api.put(`/library/transactions/${id}/pay-fine`, {
    amount,
    paymentMethod,
    remarks
  });
export const getLibraryFineReceipt = (id) => api.get(`/library/transactions/${id}/fine-receipt`);
export const getLibraryFinePayments = () => api.get('/library/fine-payments');
export const createLibraryReservation = (bookId) =>
  api.post('/library/reservations', { bookId });

export const getLibraryReservations = () =>
  api.get('/library/reservations');

export const approveLibraryReservation = (id) =>
  api.put(`/library/reservations/${id}/approve`);

export const rejectLibraryReservation = (id) =>
  api.put(`/library/reservations/${id}/reject`);

// Book Copies Management
export const getBookCopies = (bookId) => api.get(`/library/books/${bookId}/copies`);
export const createBookCopy = (bookId, data) => api.post(`/library/books/${bookId}/copies`, data);
export const updateBookCopy = (id, data) => api.put(`/library/copies/${id}`, data);
export const deleteBookCopy = (id) => api.delete(`/library/copies/${id}`);

// Super Admin Subscriptions
export const getSuperAdminSubscriptions = () => api.get('/superadmin/subscriptions');
export const getSuperAdminSubscriptionById = (id) => api.get(`/superadmin/subscriptions/${id}`);
export const getSuperAdminSubscription = (id) => api.get(`/superadmin/subscriptions/${id}`);
export const upgradeSubscription = (id, data) => api.put(`/superadmin/subscriptions/${id}/upgrade`, typeof data === 'string' ? { planName: data } : (data || {}));
export const renewSubscription = (id) => api.put(`/superadmin/subscriptions/${id}/renew`);
export const cancelSubscription = (id) => api.put(`/superadmin/subscriptions/${id}/cancel`);
export const approveSubscription = (id) => api.put(`/superadmin/subscriptions/${id}/approve`);
export const suspendSubscription = (id) => api.put(`/superadmin/subscriptions/${id}/suspend`);

// Client Registration (SaaS Onboarding)
export const createRegistrationOrder = (data) => api.post('/auth/create-registration-order', data);

// Super Admin Trials
export const getSuperAdminTrials = () => api.get('/superadmin/trials');
export const getSuperAdminTrialById = (id) => api.get(`/superadmin/trials/${id}`);
export const getSuperAdminTrial = (id) => api.get(`/superadmin/trials/${id}`);
export const extendTrial = (id) => api.put(`/superadmin/trials/${id}/extend`);
export const expireTrial = (id) => api.put(`/superadmin/trials/${id}/expire`);
export const convertTrialToPaid = (id, data = {}) => api.put(`/superadmin/trials/${id}/convert-to-paid`, typeof data === 'string' ? { planName: data } : (data || {}));
export const sendTrialReminder = (id) => api.post(`/superadmin/trials/${id}/remind`);
export const activateCollege = (id) => api.put(`/superadmin/college/${id}/activate`);
export const deactivateCollege = (id) => api.put(`/superadmin/college/${id}/deactivate`);
export const updateSuperAdminCollege = (id, data) => api.put(`/superadmin/college/${id}`, data);

// Super Admin Payments
export const getSuperAdminPayments = () => api.get('/superadmin/payments');
export const getSuperAdminPaymentById = (id) => api.get(`/superadmin/payments/${id}`);
export const verifyPayment = (paymentId) => api.post('/superadmin/payments/verify', { paymentId });
export const downloadInvoice = (paymentId) => api.get(`/superadmin/payments/invoice/${paymentId}`);

// Super Admin Reports
export const getSuperAdminReportOverview = () => api.get('/superadmin/reports/overview');
export const getSuperAdminReportRevenue = () => api.get('/superadmin/reports/revenue');
export const getSuperAdminReportSubscriptions = () => api.get('/superadmin/reports/subscriptions');
export const getSuperAdminReportTrials = () => api.get('/superadmin/reports/trials');
export const exportSuperAdminReport = (format) => api.get(`/superadmin/reports/export?format=${format}`);

// Super Admin Settings
export const getSuperAdminSettings = () => api.get('/superadmin/settings');
export const updateSuperAdminSettings = (data) => api.put('/superadmin/settings', data);

export default api;

// Assignments
export const getAssignments = (params) => api.get('/assignments', { params });
export const createAssignment = (assignmentData) => api.post('/assignments', assignmentData);
export const submitAssignment = (assignmentId, data) => api.post(`/assignments/${assignmentId}/submit`, data);
export const getAssignmentSubmissions = (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`);
export const getStudentSubmissions = (studentId) => api.get(`/assignments/student/${studentId}`);

// Accounts Officer Endpoints
export const getAccountsOfficers = () => api.get('/accounts-officer');
export const createAccountsOfficer = (data) => api.post('/accounts-officer', data);
export const deleteAccountsOfficer = (id) => api.delete(`/accounts-officer/${id}`);

// Employee Attendance (Staff, HOD, Principal, Accounts, Driver)
export const getTodayEmployeeAttendance = () => api.get('/employee-attendance/today');
export const employeeCheckIn = (data = {}) => api.post('/employee-attendance/checkin', data);
export const employeeCheckOut = (data = {}) => api.put('/employee-attendance/checkout', data);
export const getEmployeeAttendanceHistory = () => api.get('/employee-attendance/history');
export const getEmployeeAttendanceReports = (params) => api.get('/employee-attendance/admin/reports', { params });
export const markStaffAttendance = (data) =>
  api.post('/employee-attendance/admin/mark', data);
export const adminCheckoutStaff = (employeeId, date) =>
  api.put(`/employee-attendance/admin/checkout/${employeeId}`, {
    date
  });
export const getEmployeeAttendanceStats = (params = {}) =>
  api.get('/employee-attendance/stats', { params });

// Daily Class Execution Monitoring
export const getClassMonitoringDailyStatus = (department) => api.get('/class-monitoring/daily-status', { params: { department } });

// Substitution Management APIs
export const getSubstitutions = (params) => api.get('/substitutions', { params });
export const createSubstitution = (data) => api.post('/substitutions', data);
export const deleteSubstitution = (id) => api.delete(`/substitutions/${id}`);

// Live Class Session APIs
export const getStaffTodaySchedule = () => api.get('/class-sessions/staff-today');
export const startClassSession = (timetableId) => api.post('/class-sessions/start', { timetableId });
export const endClassSession = (id) => api.post(`/class-sessions/end/${id}`);
export const uploadClassNotes = (id, data) => api.post(`/class-sessions/${id}/notes`, data);
export const getStudentLiveClass = () => api.get('/class-sessions/student-live');
export const getHodClassMonitoring = (department) => api.get('/class-sessions/hod-monitoring', { params: { department } });
export const getPrincipalClassSummary = () => api.get('/class-sessions/principal-summary');

// Fee Plans
export const getFeePlans = (params = {}) =>
  api.get('/fee-plans', { params });

export const createFeePlan = (data) =>
  api.post('/fee-plans', data);

export const updateFeePlan = (id, data) =>
  api.put(`/fee-plans/${id}`, data);

export const deleteFeePlan = (id) =>
  api.delete(`/fee-plans/${id}`);

// Fee Collection Backend Pagination & Search
export const getFeeCollectionRecords = (params = {}) =>
  api.get('/admissions/fee-collection', { params });

// Payments API
export const createPayment = (data) =>
  api.post('/payments', data);

export const getPaymentHistory = (admissionId) =>
  api.get(`/payments/history/${admissionId}`);

// Scholarship Management API
export const getScholarships = () =>
  api.get("/scholarships");

export const createScholarship = (data) =>
  api.post("/scholarships", data);

export const updateScholarship = (id, data) =>
  api.put(`/scholarships/${id}`, data);

export const deleteScholarship = (id) =>
  api.delete(`/scholarships/${id}`);

export const getScholarshipApplications = () =>
  api.get("/scholarships/applications");

export const createScholarshipApplication = (data) =>
  api.post("/scholarships/applications", data);

// Librarian Management APIs
export const getLibrarians = () => api.get('/librarian');
export const createLibrarian = (data) => api.post('/librarian', data);
export const updateLibrarian = (id, data) => api.put(`/librarian/${id}`, data);
export const deleteLibrarian = (id) => api.delete(`/librarian/${id}`);
export const getLibraryBorrowers = () => api.get('/library/borrowers');

export const attachLibraryTransactionCopy = (transactionId, bookCopyId) => api.put(`/library/transactions/${transactionId}/attach-copy`, { bookCopyId });
export const issueLibraryReservation = (id, bookCopyId, dueDate) =>
  api.put(`/library/reservations/${id}/issue`, { bookCopyId, dueDate });

export const createLibraryReturnRequest = (transactionId) =>
  api.post('/library/return-requests', { transactionId });

export const getMyLibraryReturnRequests = () =>
  api.get('/library/return-requests/my');

export const getLibraryReturnRequests = () => api.get('/library/return-requests');
export const approveLibraryReturnRequest = (id) => api.put('/library/return-requests/' + id + '/approve');
export const rejectLibraryReturnRequest = (id, remarks = '') => api.put('/library/return-requests/' + id + '/reject', { remarks });

export const getPlacementOfficers = () => api.get('/placement-officers');
export const createPlacementOfficer = (data) => api.post('/placement-officers', data);
export const updatePlacementOfficer = (id, data) => api.put(`/placement-officers/${id}`, data);
export const deletePlacementOfficer = (id) => api.delete(`/placement-officers/${id}`);

// Document Management APIs
export const getDocuments = (params = {}) => api.get('/documents', { params });
export const createDocumentRequirement = (data) => api.post('/documents/requirements', data);
export const uploadDocumentFile = (id, formData) => api.post(`/documents/${id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateDocumentStatus = (id, status, remarks = '') => api.patch(`/documents/${id}/status`, { status, remarks });
export const getDocumentFileUrl = (id) => `/api/documents/${id}/file`;

// College Management APIs
export const deleteCollege = (id) => api.delete(`/superadmin/college/${id}`);

// ── Business Referral & Incentive Management APIs ──────────────────────────
export const submitReferral = (data) => api.post('/referrals', data);
export const getMyReferrals = (params = {}) => api.get('/referrals/my-referrals', { params });
export const getMyReferralStats = () => api.get('/referrals/my-stats');
export const getAdminReferrals = (params = {}) => api.get('/referrals', { params });
export const getReferralDetails = (id) => api.get(`/referrals/${id}`);
export const updateReferralStatus = (id, data) => api.patch(`/referrals/${id}/status`, data);
export const getIncentiveRules = (params = {}) => api.get('/referrals/rules', { params });
export const getIncentiveRuleByCategory = (category) => api.get(`/referrals/rules/category/${encodeURIComponent(category)}`);
export const createIncentiveRule = (data) => api.post('/referrals/rules', data);
export const updateIncentiveRule = (id, data) => api.patch(`/referrals/rules/${id}`, data);
export const getIncentives = (params = {}) => api.get('/referrals/incentives', { params });
export const approveIncentive = (id, data) => api.patch(`/referrals/incentives/${id}/approve`, data);
export const processIncentivePayout = (data) => api.post('/referrals/incentives/payout', data);
export const reverseIncentive = (id, data) => api.post(`/referrals/incentives/${id}/reverse`, data);
export const getAdminReferralOverview = (params = {}) => api.get('/referrals/admin-overview', { params });
export const getSuperAdminReferralOverview = () => api.get('/referrals/superadmin-overview');
export const getReferrerReport = (userId, params = {}) => api.get(`/referrals/referrer/${userId}`, { params });
export const getReferrerWiseReport = (params = {}) => api.get('/referrals/reports/referrer-wise', { params });
export const recordIncentivePayment = (data) => api.post('/referrals/incentive-payment', data);
export const getTopReferralPerformers = (params = {}) => api.get('/referrals/top-performers', { params });
export const getReferrerWiseExportUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/referrals/reports/referrer-wise/export${query ? `?${query}` : ''}`;
};
export const getReferralExportCsvUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/referrals/export/csv${query ? `?${query}` : ''}`;
};

// ── Super Admin-Controlled Business Opportunity Publishing & Application APIs ─
export const getSuperAdminOpportunities = (params = {}) => api.get('/opportunities/superadmin', { params });
export const createOpportunity = (data) => api.post('/opportunities/superadmin', data);
export const updateOpportunity = (id, data) => api.put(`/opportunities/superadmin/${id}`, data);
export const updateOpportunityStatus = (id, status) => api.patch(`/opportunities/superadmin/${id}/status`, { status });
export const getOpportunityApplications = (id, params = {}) => api.get(`/opportunities/superadmin/${id}/applications`, { params });
export const getPublishedOpportunities = (params = {}) => api.get('/opportunities/published', { params });
export const getPublishedOpportunityDetails = (id) => api.get(`/opportunities/published/${id}`);
export const applyForOpportunity = (id, data) => api.post(`/opportunities/apply/${id}`, data);
export const getMyOpportunityApplications = (params = {}) => api.get('/opportunities/my-applications', { params });
export const updateOpportunityApplicationStatus = (appId, data) => api.patch(`/opportunities/applications/${appId}/status`, data);
export const getOpportunityExportCsvUrl = (id) => `/api/opportunities/export/${id}`;

// ── Business Referral Dynamic Form Configuration APIs ──────────────────────────
export const getPublicReferralFormConfig = (category) => api.get(`/referrals/config/public/${encodeURIComponent(category)}`);
export const getAllReferralFormConfigs = () => api.get('/referrals/config/all');
export const getReferralFormConfigByCategory = (category) => api.get(`/referrals/config/category/${encodeURIComponent(category)}`);
export const updateReferralFormConfig = (category, data) => api.put(`/referrals/config/${encodeURIComponent(category)}`, data);
export const addReferralPartner = (category, data) => api.post(`/referrals/config/${encodeURIComponent(category)}/partner`, data);
export const toggleReferralPartner = (category, partnerId) => api.patch(`/referrals/config/${encodeURIComponent(category)}/partner/${partnerId}/toggle`);
export const addReferralProduct = (category, partnerId, data) => api.post(`/referrals/config/${encodeURIComponent(category)}/partner/${partnerId}/product`, data);
export const toggleReferralProduct = (category, partnerId, productId) => api.patch(`/referrals/config/${encodeURIComponent(category)}/partner/${partnerId}/product/${productId}/toggle`);
export const resetReferralFormConfig = (category) => api.post(`/referrals/config/${encodeURIComponent(category)}/reset`);
export const deleteIncentiveRule = (id) => api.delete(`/referrals/rules/${id}`);
export const getReferralConfigHistory = (params = {}) => api.get('/referrals/config/history/logs', { params });
export const updateReferralFormFields = (category, fieldsConfig) => api.put(`/referrals/config/${encodeURIComponent(category)}/fields`, { fieldsConfig });
export const updateReferralPolicy = (category, data) => api.put(`/referrals/config/${encodeURIComponent(category)}/policy`, data);
export const publishReferralForm = (category) => api.post(`/referrals/config/${encodeURIComponent(category)}/publish`);
export const unpublishReferralForm = (category) => api.post(`/referrals/config/${encodeURIComponent(category)}/unpublish`);
export const saveReferralFormDraft = (category, data) => api.post(`/referrals/config/${encodeURIComponent(category)}/draft`, data);

// ── Watchman Management & Campus Security Operations APIs ──────────────────────
// Admin Watchman Management
export const getWatchmen = () => api.get('/watchman');
export const createWatchman = (data) => api.post('/watchman', data);
export const updateWatchman = (id, data) => api.put(`/watchman/${id}`, data);
export const toggleWatchmanStatus = (id) => api.patch(`/watchman/${id}/status`);
export const resetWatchmanPassword = (id, newPassword) => api.post(`/watchman/${id}/reset-password`, { newPassword });
export const deleteWatchman = (id) => api.delete(`/watchman/${id}`);
export const getWatchmanActivities = (params = {}) => api.get('/watchman/admin/activities', { params });
export const getWatchmanDailyReport = (params = {}) => api.get('/watchman/admin/daily-report', { params });

// Watchman Dashboard Operations
export const getWatchmanProfile = () => api.get('/watchman/me');
export const changeWatchmanPassword = (data) => api.post('/watchman/change-password', data);
export const getWatchmanStats = () => api.get('/watchman/stats');

// Visitor Operations
export const getActiveVisitors = () => api.get('/watchman/visitors/active');
export const getAllVisitors = (params = {}) => api.get('/watchman/visitors', { params });
export const recordVisitorEntry = (data) => api.post('/watchman/visitors/entry', data);
export const recordVisitorCampusIn = (id, data = {}) => {
  const target = encodeURIComponent(String(id || data.id || data.passNumber || '').trim());
  return api.post(`/watchman/visitors/${target}/in`, data);
};
export const recordVisitorCampusOut = (id, data = {}) => {
  const target = encodeURIComponent(String(id || data.id || data.passNumber || '').trim());
  return api.post(`/watchman/visitors/${target}/out`, data);
};
export const recordVisitorExit = (id, data = {}) => api.post(`/watchman/visitors/${id}/out`, data);
export const verifyVisitorPass = (query) => {
  let cleanQuery = (query || '').toString().trim();
  if (cleanQuery.includes('code=')) {
    const match = cleanQuery.match(/[?&]code=([^&#]+)/);
    if (match && match[1]) {
      cleanQuery = decodeURIComponent(match[1]).trim();
    }
  }
  return api.get('/watchman/visitors/verify', { params: { code: cleanQuery, query: cleanQuery } });
};
export const getPreRegisteredVisitors = () => api.get('/watchman/visitors/pre-registered');
export const preRegisterVisitor = (data) => api.post('/watchman/visitors/pre-register', data);
export const updateVisitorApproval = (id, data = {}) => {
  const visitorId = id || data.id || data.visitorId || data.passNumber;
  return api.patch(`/watchman/visitors/${encodeURIComponent(visitorId)}/approval`, { ...data, id: visitorId });
};
export const admitPreRegisteredVisitor = (id, data = {}) => api.post(`/watchman/visitors/${id}/in`, data);
export const getVisitorHistory = (params = {}) => api.get('/watchman/visitors/history', { params });

// Delivery & Parcel Operations
export const getParcels = (params = {}) => api.get('/parcels', { params });
export const getParcelById = (id) => api.get(`/parcels/${id}`);
export const logParcel = (data) => api.post('/parcels', data);
export const updateParcel = (id, data) => api.patch(`/parcels/${id}`, data);
export const handoverParcel = (id, data = {}) => api.patch(`/parcels/${id}/handover`, data);
export const collectParcel = (id, data = {}) => api.patch(`/parcels/${id}/collect`, data);
export const deleteParcel = (id) => api.delete(`/parcels/${id}`);
export const getStaffDirectory = (params = {}) => api.get('/parcels/staff-directory', { params });

// Vehicle Operations
export const getVehicles = (params = {}) => api.get('/watchman/vehicles', { params });
export const recordVehicleEntry = (data) => api.post('/watchman/vehicles/entry', data);
export const recordVehicleExit = (id) => api.patch(`/watchman/vehicles/${id}/exit`);

// Student & Staff Gate Movement Registers
export const getStudentMovements = (params = {}) => api.get('/watchman/student-register', { params });
export const recordStudentMovement = (data) => api.post('/watchman/student-register', data);
export const getStaffMovements = (params = {}) => api.get('/watchman/staff-register', { params });
export const recordStaffMovement = (data) => api.post('/watchman/staff-register', data);
export const lookupStaffMember = (code) => api.get(`/watchman/staff-lookup/${encodeURIComponent(code)}`);
export const getStaffWatchmanDirectory = (params = {}) => api.get('/watchman/staff-directory', { params });

// Attendance & Shift Operations
export const getWatchmanAttendance = () => api.get('/watchman/attendance');
export const watchmanClockIn = (data = {}) => api.post('/watchman/attendance/clock-in', data);
export const watchmanClockOut = (data = {}) => api.post('/watchman/attendance/clock-out', data);

// Emergency & Incident Reports
export const getSecurityIncidents = (params = {}) => api.get('/watchman/incidents', { params });
export const reportSecurityIncident = (data) => api.post('/watchman/incidents', data);
export const updateSecurityIncident = (id, data) => api.patch(`/watchman/incidents/${id}`, data);

// Notifications
export const getWatchmanNotifications = () => api.get('/watchman/notifications');

// Student QR Code & Automatic Attendance Tracking
export const lookupStudentQr = (code) => api.get(`/watchman/student-qr/${encodeURIComponent(code)}`);
export const recordStudentCheckin = (data) => api.post('/watchman/student-checkin', data);
export const recordStudentCheckout = (data) => api.post('/watchman/student-checkout', data);
export const getStudentTracking = (params = {}) => api.get('/watchman/student-tracking', { params });
export const getStudentTodayScans = () => api.get('/watchman/student-today-scans');
export const getStudentDailyReport = (params = {}) => api.get('/watchman/student-daily-report', { params });
export const getStudentQrDirectory = (params = {}) => api.get('/watchman/student-qr-directory', { params });

// ── Real-Time College Bus Entry & Exit Tracking APIs ──────────────────────────
export const getCollegeBuses = (params = {}) => api.get('/buses', { params });
export const getCollegeBusById = (id) => api.get(`/buses/${id}`);
export const createCollegeBus = (data) => api.post('/buses', data);
export const updateCollegeBus = (id, data) => api.put(`/buses/${id}`, data);
export const deleteCollegeBus = (id) => api.delete(`/buses/${id}`);
export const recordBusEntry = (id, data = {}) => api.post(`/buses/${id}/entry`, data);
export const recordBusExit = (id, data = {}) => api.post(`/buses/${id}/exit`, data);
export const getBusMovementLogs = (params = {}) => api.get('/buses/logs', { params });
export const getBusTrackingStats = (params = {}) => api.get('/buses/stats', { params });

// ── Campus In & Campus Out Movement APIs ──────────────────────────────────────
export const getCampusPeople = (params = {}) => api.get('/watchman/campus-people', { params });
export const registerCampusPerson = (data) => api.post('/watchman/campus-people', data);
export const recordCampusIn = (data) => api.post('/watchman/campus-in', data);
export const recordCampusOut = (data) => api.post('/watchman/campus-out', data);
export const getCampusMovements = (params = {}) => api.get('/watchman/campus-movements', { params });
export const getCampusMovementStats = (params = {}) => api.get('/watchman/campus-stats', { params });
export const lookupCampusPerson = (query, extraParams = {}) => {
  let cleanQuery = (query || '').toString().trim();
  if (cleanQuery.includes('code=')) {
    const match = cleanQuery.match(/[?&]code=([^&#]+)/);
    if (match && match[1]) cleanQuery = decodeURIComponent(match[1]).trim();
  }
  return api.get('/watchman/campus-people/lookup', { params: { query: cleanQuery, code: cleanQuery, ...extraParams } });
};

// ── Real-Time Leave Management APIs ──────────────────────────────────────────
export const getLeaves = (params = {}) => api.get('/leaves', { params });
export const getStudentLeaves = (studentId) => api.get(`/leaves/student/${studentId}`);
export const createLeave = (data) => api.post('/leaves', data);
export const applyLeave = (data) => api.post('/leaves', data);
export const updateLeaveStatus = (id, data) => api.patch(`/leaves/${id}`, data);
export const deleteLeave = (id) => api.delete(`/leaves/${id}`);
export const getLeaveAttendanceSummary = (params = {}) => api.get('/leaves/attendance-summary', { params });
