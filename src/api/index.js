import axios from 'axios';

// In production (Vercel), use the Render backend URL.
// In local dev, use localhost via the Vite proxy.
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If running on Vercel (not localhost), use the Render backend directly
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://college-erp-software.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
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
        token = sessionStorage.getItem('accounts_token');
      } else if (path.startsWith('/driver')) {
        token = sessionStorage.getItem('driver_token');
      } else {
        // Fallback: Check all in priority
        token = sessionStorage.getItem('superadmin_token')
          || sessionStorage.getItem('admin_token')
          || sessionStorage.getItem('subadmin_token')
          || sessionStorage.getItem('principal_token')
          || sessionStorage.getItem('hod_token')
          || sessionStorage.getItem('staff_token')
          || sessionStorage.getItem('student_token')
          || sessionStorage.getItem('parent_token')
          || sessionStorage.getItem('accounts_token')
          || sessionStorage.getItem('driver_token')
          || sessionStorage.getItem('token');
      }
    } catch (e) {
      console.error('Error fetching token from storage', e);
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
      const protectedPrefixes = ['/admin', '/superadmin', '/subadmin', '/principal', '/hod', '/staff', '/student', '/parent', '/accounts', '/driver'];
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
        'superadmin_token', 'admin_token', 'subadmin_token', 'principal_token', 'hod_token', 'staff_token', 'student_token', 'parent_token', 'accounts_token', 'driver_token',
        'superadmin_session', 'admin_session', 'subadmin_session', 'principal_session', 'hod_session', 'staff_session', 'student_session', 'parent_session', 'accounts_session', 'driver_session'
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
          'superadmin_token', 'admin_token', 'subadmin_token', 'principal_token', 'hod_token', 'staff_token', 'student_token', 'parent_token', 'accounts_token', 'driver_token',
          'superadmin_session', 'admin_session', 'subadmin_session', 'principal_session', 'hod_session', 'staff_session', 'student_session', 'parent_session', 'accounts_session', 'driver_session'
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

// Student Endpoints
export const getStudents = () => api.get('/students');
export const getStudentById = (id) => api.get(`/students/${id}`);
export const createStudent = (studentData) => api.post('/students', studentData);
export const updateStudent = (id, studentData) => api.put(`/students/${id}`, studentData);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const promoteStudents = (payload) => api.post('/students/promote', payload);

// Staff Endpoints
export const getStaff = () => api.get('/staff');
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
export const updateMark = (id, markData) => api.put(`/marks/${id}`, markData);
export const deleteMark = (id) => api.delete(`/marks/${id}`);

// Fees Endpoints
export const getAllFees = () => api.get('/fees');
export const getFeesByStudent = (studentId) => api.get(`/fees/student/${studentId}`);
export const getStudentFeeStructure = (studentId) => api.get(`/fees/structure/${studentId}`);
export const createFee = (feeData) => api.post('/fees', feeData);
export const updateFee = (id, feeData) => api.put(`/fees/${id}`, feeData);
export const deleteFee = (id) => api.delete(`/fees/${id}`);

// Salary / Payroll Endpoints
export const getSalaries = () => api.get('/salaries');
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

// Library Management (Old exports removed, new ones at bottom)

// Transport Management
export const getTransportRoutes = () => api.get('/transport/routes').catch(() => ({ data: [] }));
export const getTransportDrivers = () => api.get('/transport/drivers').catch(() => ({ data: [] }));
export const updateTransportDriver = (id, data) => api.put(`/transport/drivers/${id}`, data);
export const getTransportStudents = () => api.get('/transport/students').catch(() => ({ data: [] }));

// Driver Operations
export const getDriverAttendance = (params) => api.get('/transport/attendance', { params });
export const markDriverAttendance = (data) => api.post('/transport/attendance', data);
export const getTransportComplaints = () => api.get('/transport/complaints');
export const createTransportComplaint = (data) => api.post('/transport/complaints', data);
export const updateTransportComplaint = (id, data) => api.put(`/transport/complaints/${id}`, data);
export const getTransportTrips = () => api.get('/transport/trips');
export const createTransportTrip = (data) => api.post('/transport/trips', data);
export const updateTransportTrip = (id, data) => api.put(`/transport/trips/${id}`, data);
export const getTransportMaintenance = () => api.get('/transport/maintenance');
export const updateTransportMaintenance = (id, data) => api.put(`/transport/maintenance/${id}`, data);
export const getTransportNotifications = () => api.get('/transport/notifications');

// Hostel Management
export const getHostelBlocks = () => api.get('/hostel/blocks');
export const getHostelRooms = () => api.get('/hostel/rooms');
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
export const updatePlacementApplicationStatus = (id, status) => api.put(`/placement/applications/${id}/status`, { status });
export const getPlacementInterviews = () => api.get('/placement/interviews');
export const createPlacementInterview = (data) => api.post('/placement/interviews', data);
export const getPlacementSelections = () => api.get('/placement/selections');
export const createPlacementSelection = (data) => api.post('/placement/selections', data);

// Settings & Security
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const getLoginLogs = () => api.get('/settings/logs');

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
export const requestLibraryBook = (data) => api.post('/library/request', data);
export const getMyLibraryTransactions = () => api.get('/library/my-transactions');
export const getAllLibraryTransactions = (params) => api.get('/library/transactions', { params });
export const issueLibraryBook = (id) => api.put(`/library/transactions/${id}/issue`);
export const manualIssueLibraryBook = (data) => api.post('/library/transactions/manual-issue', data);
export const returnLibraryBook = (id) => api.put(`/library/transactions/${id}/return`);
export const rejectLibraryRequest = (id) => api.put(`/library/transactions/${id}/reject`);

// Super Admin Subscriptions
export const getSuperAdminSubscriptions = () => api.get('/superadmin/subscriptions');
export const getSuperAdminSubscriptionById = (id) => api.get(`/superadmin/subscriptions/${id}`);
export const upgradeSubscription = (id, planName) => api.put(`/superadmin/subscriptions/${id}/upgrade`, { planName });
export const renewSubscription = (id) => api.put(`/superadmin/subscriptions/${id}/renew`);
export const cancelSubscription = (id) => api.put(`/superadmin/subscriptions/${id}/cancel`);

// Super Admin Trials
export const getSuperAdminTrials = () => api.get('/superadmin/trials');
export const getSuperAdminTrialById = (id) => api.get(`/superadmin/trials/${id}`);
export const extendTrial = (id) => api.put(`/superadmin/trials/${id}/extend`);
export const expireTrial = (id) => api.put(`/superadmin/trials/${id}/expire`);
export const convertTrialToPaid = (id) => api.put(`/superadmin/trials/${id}/convert-to-paid`);
export const sendTrialReminder = (id) => api.post(`/superadmin/trials/${id}/remind`);

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
export const employeeCheckIn = () => api.post('/employee-attendance/checkin');
export const employeeCheckOut = () => api.put('/employee-attendance/checkout');
export const getEmployeeAttendanceHistory = () => api.get('/employee-attendance/history');
export const getEmployeeAttendanceReports = (params) => api.get('/employee-attendance/admin/reports', { params });
export const getEmployeeAttendanceStats = () => api.get('/employee-attendance/stats');

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



