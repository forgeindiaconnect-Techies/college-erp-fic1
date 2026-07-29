import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getSettings } from './api/index';
import ScrollToTop from './components/ScrollToTop';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee', color: '#900', fontFamily: 'monospace' }}>
          <h2>Frontend Crash!</h2>
          <p>{this.state.error?.toString()}</p>
          <pre>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Admin Layout & Pages
import GlobalLockdown from './components/layout/GlobalLockdown';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import StudentManagement from './pages/students/StudentManagement';
import StaffManagement from './pages/staff/StaffManagement';
import DepartmentManagement from './pages/departments/DepartmentManagement';
import DepartmentDashboard from './pages/departments/DepartmentDashboard';
import AttendanceManagement from './pages/attendance/AttendanceManagement';
import EmployeeAttendanceReports from './admin/pages/EmployeeAttendanceReports';
import CgpaManagement from './pages/cgpa/CgpaManagement';
import FeesManagement from './pages/fees/FeesManagement';
import TimetableManagement from './pages/TimetableManagement';
import Settings from './pages/Settings';
import ReportsManagement from './pages/reports/ReportsManagement';
import GetAccess from './pages/GetAccess';
import UnifiedLogin from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import HodManagement from './pages/hod/HodManagement';
import StudentPromotion from './pages/StudentPromotion';
import Placeholder from './pages/Placeholder';
import ParentsManagement from './pages/parents/ParentsManagement';
import SubjectsManagement from './pages/subjects/SubjectsManagement';
import ExamsManagement from './pages/exams/ExamsManagement';
import LeavesManagement from './pages/leaves/LeavesManagement';
import AnnouncementsManagement from './pages/announcements/AnnouncementsManagement';
import RolePermissions from './pages/permissions/RolePermissions';
import ActivityLogs from './pages/activity-logs/ActivityLogs';
import SystemAnalytics from './pages/analytics/SystemAnalytics';
import LibraryManagement from './pages/library/LibraryManagement';
import TransportManagement from './pages/transport/TransportManagement';
import HostelManagement from './pages/hostel/HostelManagement';
import PlacementManagement from './pages/placement/PlacementManagement';
import AdminAssignments from './pages/assignments/AdminAssignments';
import AccountsOfficerManagement from './pages/accounts-officer/AccountsOfficerManagement';
import AIAssistant from './pages/ai/AIAssistant';
import SettingsSecurity from './pages/settings/SettingsSecurity';
import LandingPage from './pages/landing/LandingPage';
import AcademicStructure from './pages/academic/AcademicStructure';
import AcademicMaster from './pages/academic/AcademicMaster';
import FacultyAllocation from './pages/academic/FacultyAllocation';
import ClassAdvisorAllocation from './pages/academic/ClassAdvisorAllocation';
import PeriodMaster from './pages/academic/PeriodMaster';

// Super Admin Layout & Pages
import SuperAdminLayout from './superadmin/components/SuperAdminLayout';
import SuperAdminDashboard from './superadmin/pages/SuperAdminDashboard';
import SuperAdminColleges from './superadmin/pages/SuperAdminColleges';
import SuperAdminSubscriptions from './superadmin/pages/SuperAdminSubscriptions';
import SuperAdminTrials from './superadmin/pages/SuperAdminTrials';
import SuperAdminPayments from './superadmin/pages/SuperAdminPayments';
import SuperAdminReports from './superadmin/pages/SuperAdminReports';
import SuperAdminSettings from './superadmin/pages/SuperAdminSettings';

import PrincipalLayout from './principal/components/PrincipalLayout';
import PrincipalDashboard from './principal/pages/PrincipalDashboard';
import PrincipalPlaceholder from './principal/pages/PrincipalPlaceholder';
import PrincipalDepartments from './principal/pages/PrincipalDepartments';
import PrincipalApprovals from './principal/pages/PrincipalApprovals';
import PrincipalReports from './principal/pages/PrincipalReports';
import PrincipalCommunicationCenter from './principal/pages/PrincipalCommunicationCenter';
import PrincipalMeetingsEvents from './principal/pages/PrincipalMeetingsEvents';
import PrincipalAcademicPlanning from './principal/pages/PrincipalAcademicPlanning';
import PrincipalFacultyPerformance from './principal/pages/PrincipalFacultyPerformance';
import PrincipalStudentWelfare from './principal/pages/PrincipalStudentWelfare';
import PrincipalStaffSupport from './principal/pages/PrincipalStaffSupport';
import PrincipalHodManagement from './principal/pages/PrincipalHodManagement';
import PrincipalStaffOverview from './principal/pages/PrincipalStaffOverview';
import PrincipalStudentsOverview from './principal/pages/PrincipalStudentsOverview';
import PrincipalAttendanceAnalytics from './principal/pages/PrincipalAttendanceAnalytics';
import PrincipalExamsResults from './principal/pages/PrincipalExamsResults';
import PrincipalFeesOverview from './principal/pages/PrincipalFeesOverview';
import PrincipalPlacements from './principal/pages/PrincipalPlacements';
import PrincipalAssignments from './principal/pages/PrincipalAssignments';



// HOD Layout & Pages
import HodLayout from './hod/components/HodLayout';
import HodLogin from './hod/pages/HodLogin';
import HodDashboard from './hod/pages/HodDashboard';
import HodStudents from './hod/pages/HodStudents';
import HodStaff from './hod/pages/HodStaff';
import HodAttendance from './hod/pages/HodAttendance';
import HodMarks from './hod/pages/HodMarks';
import HodTimetable from './hod/pages/HodTimetable';
import HodSubstitution from './hod/pages/HodSubstitution';
import HodSubjects from './hod/pages/HodSubjects';
import HodFacultyAllocation from './hod/pages/HodFacultyAllocation';
import HodExams from './hod/pages/HodExams';
import HodLeaves from './hod/pages/HodLeaves';
import HodReports from './hod/pages/HodReports';
import HodAnnouncements from './hod/pages/HodAnnouncements';
import HodSettings from './hod/pages/HodSettings';
import HodAssignments from './hod/pages/HodAssignments';
import HodPayroll from './hod/pages/HodPayroll';
import HodPlacements from './hod/pages/HodPlacements';
import HodLibrary from './hod/pages/HodLibrary';
import HodSupport from './hod/pages/HodSupport';

// Staff Layout & Pages
import StaffLayout from './staff/components/StaffLayout';
import StaffLogin from './staff/pages/StaffLogin';
import StaffDashboard from './staff/pages/StaffDashboard';
import StaffAttendance from './staff/pages/StaffAttendance';
import StaffMarks from './staff/pages/StaffMarks';
import StaffAssignments from './staff/pages/StaffAssignments';
import StaffTimetable from './staff/pages/StaffTimetable';
import StaffStudents from './staff/pages/StaffStudents';
import StaffLeaves from './staff/pages/StaffLeaves';
import StaffAnnouncements from './staff/pages/StaffAnnouncements';
import StaffExams from './staff/pages/StaffExams';
import StaffPayroll from './staff/pages/StaffPayroll';
import StaffPlacements from './staff/pages/StaffPlacements';
import StaffLibrary from './staff/pages/StaffLibrary';
import StaffSupport from './staff/pages/StaffSupport';

// Student Layout & Pages
import StudentLayout from './student/components/StudentLayout';
import StudentLogin from './student/pages/StudentLogin';
import StudentDashboard from './student/pages/StudentDashboard';
import StudentAttendance from './student/pages/StudentAttendance';
import StudentMarks from './student/pages/StudentMarks';
import StudentAssignments from './student/pages/StudentAssignments';
import StudentFees from './student/pages/StudentFees';
import StudentTimetable from './student/pages/StudentTimetable';
import StudentLeaves from './student/pages/StudentLeaves';
import StudentSettings from './student/pages/StudentSettings';
import StudentAnnouncements from './student/pages/StudentAnnouncements';
import StudentExams from './student/pages/StudentExams';
import StudentHostel from './student/pages/StudentHostel';
import StudentPlacements from './student/pages/StudentPlacements';
import StudentLibrary from './student/pages/StudentLibrary';
import StudentWelfare from './student/pages/StudentWelfare';

// Parent Layout & Pages
import ParentLayout from './parent/components/ParentLayout';
import ParentLogin from './parent/pages/ParentLogin';
import ParentDashboard from './parent/pages/ParentDashboard';
import ParentAttendance from './parent/pages/ParentAttendance';
import ParentMarks from './parent/pages/ParentMarks';
import ParentFees from './parent/pages/ParentFees';
import ParentNotifications from './parent/pages/ParentNotifications';
import ParentLeaves from './parent/pages/ParentLeaves';
import ParentTimetable from './parent/pages/ParentTimetable';

import UpgradePlan from './pages/UpgradePlan';
import AdminSubscription from './pages/AdminSubscription';

import PaymentHistory from './accounts/pages/PaymentHistory';
import Expenses from './accounts/pages/Expenses';
import Scholarships from './accounts/pages/Scholarships';

// Accounts Layout & Pages
import AccountsLayout from './accounts/components/AccountsLayout';
import AccountsLogin from './accounts/pages/AccountsLogin';
import AccountsDashboard from './accounts/pages/AccountsDashboard';
import FeesCollection from './accounts/pages/FeesCollection';
import PendingFees from './accounts/pages/PendingFees';
import Salary from './accounts/pages/Salary';
import Receipts from './accounts/pages/Receipts';
import AccountsReports from './accounts/pages/AccountsReports';

// Driver Layout & Pages
import DriverLayout from './driver/components/DriverLayout';
import DriverDashboard from './driver/pages/DriverDashboard';
import DriverRoute from './driver/pages/DriverRoute';
import DriverStudents from './driver/pages/DriverStudents';
import DriverTripManagement from './driver/pages/DriverTripManagement';
import DriverVehicle from './driver/pages/DriverVehicle';
import DriverTasks from './driver/pages/DriverTasks';
import DriverPayroll from './driver/pages/DriverPayroll';
import DriverNotifications from './driver/pages/DriverNotifications';
import DriverAttendance from './driver/pages/DriverAttendance';

import Unauthorized from './pages/Unauthorized';

import './index.css';

export const ThemeContext = createContext();
export const SettingsContext = createContext();

const hasAnyOtherSession = (excludeKey) => {
  const keys = ['superadmin_session', 'admin_session', 'subadmin_session', 'principal_session', 'hod_session', 'staff_session', 'student_session', 'parent_session', 'accounts_session', 'driver_session'];
  return keys.some(key => key !== excludeKey && sessionStorage.getItem(key));
};

const SuperAdminGuard = ({ children }) => {
  const session = sessionStorage.getItem('superadmin_session');
  if (session) return children;
  if (hasAnyOtherSession('superadmin_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

const AdminGuard = ({ children }) => {
  const session = sessionStorage.getItem('admin_session');
  if (session) return children;
  if (hasAnyOtherSession('admin_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

const PrincipalGuard = ({ children }) => {
  const session = sessionStorage.getItem('principal_session');
  if (session) return children;
  if (hasAnyOtherSession('principal_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};



const HodGuard = ({ children }) => {
  const session = sessionStorage.getItem('hod_session');
  if (session) return children;
  if (hasAnyOtherSession('hod_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

const StaffGuard = ({ children }) => {
  const session = sessionStorage.getItem('staff_session');
  if (session) return children;
  if (hasAnyOtherSession('staff_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

const StudentGuard = ({ children }) => {
  const session = sessionStorage.getItem('student_session');
  if (session) return children;
  if (hasAnyOtherSession('student_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

const ParentGuard = ({ children }) => {
  const session = sessionStorage.getItem('parent_session');
  if (session) return children;
  if (hasAnyOtherSession('parent_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

const AccountsGuard = ({ children }) => {
  const session = sessionStorage.getItem('accounts_session');
  if (session) return children;
  if (hasAnyOtherSession('accounts_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

const DriverGuard = ({ children }) => {
  const session = sessionStorage.getItem('driver_session');
  if (session) return children;
  if (hasAnyOtherSession('driver_session')) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  const [theme, setTheme] = useState('light');
  const [collegeSettings, setCollegeSettings] = useState(null);

  useEffect(() => {
    // Force reset to light theme since user dislikes dark mode
    setTheme('light');
    document.body.classList.remove('dark');
    localStorage.setItem('erp-theme', 'light');

    // Fetch college settings
    const fetchCollegeSettings = async () => {
      try {
        const res = await getSettings();
        if (res.data) {
          setCollegeSettings(res.data);
          if (res.data.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', res.data.primaryColor);
            // Derive a darker/lighter shade if needed, or just use as main tint
            document.documentElement.style.setProperty('--brand-color', res.data.primaryColor);
          }
          if (res.data.secondaryColor) {
            document.documentElement.style.setProperty('--secondary-color', res.data.secondaryColor);
          }
          if (res.data.collegeLogo) {
            // Can be used via context
          }
        }
      } catch (err) {
        console.warn('Could not fetch college settings. Either not logged in or endpoint failed.');
      }
    };

    fetchCollegeSettings();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('erp-theme', newTheme);
    document.body.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <ErrorBoundary>
      <SettingsContext.Provider value={{ collegeSettings, setCollegeSettings }}>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <BrowserRouter>
            <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<UnifiedLogin />} />
            <Route path="/get-access" element={<GetAccess />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/upgrade-plan" element={<AdminGuard><UpgradePlan /></AdminGuard>} />
            <Route path="/register" element={<Navigate to="/get-access" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />

            {/* Redirect old login pages to unified login */}
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/principal/login" element={<Navigate to="/login" replace />} />
            <Route path="/hod/login" element={<Navigate to="/login" replace />} />
            <Route path="/staff/login" element={<Navigate to="/login" replace />} />
            <Route path="/student/login" element={<Navigate to="/login" replace />} />
            <Route path="/parent/login" element={<Navigate to="/login" replace />} />
            <Route path="/accounts/login" element={<Navigate to="/login" replace />} />
            <Route path="/superadmin/login" element={<Navigate to="/login" replace />} />

            {/* ── SUPER ADMIN ROUTES ── */}
            <Route path="/superadmin" element={<SuperAdminGuard><SuperAdminLayout /></SuperAdminGuard>}>
              <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="colleges" element={<SuperAdminColleges />} />
              <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
              <Route path="trials" element={<SuperAdminTrials />} />
              <Route path="payments" element={<SuperAdminPayments />} />
              <Route path="reports" element={<SuperAdminReports />} />
              <Route path="settings" element={<SuperAdminSettings />} />
            </Route>

            {/* ── ADMIN ROUTES ── */}
            <Route path="/admin" element={<AdminGuard><GlobalLockdown><Layout /></GlobalLockdown></AdminGuard>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard"     element={<Dashboard />} />
              <Route path="departments"   element={<DepartmentManagement />} />
              <Route path="departments/:id" element={<DepartmentDashboard />} />
              <Route path="hods"          element={<HodManagement />} />
              <Route path="students"      element={<StudentManagement />} />
              <Route path="promotion"     element={<StudentPromotion />} />
              <Route path="staff"         element={<StaffManagement />} />
              <Route path="parents"       element={<ParentsManagement />} />
              <Route path="academic"      element={<AcademicStructure />} />
              <Route path="academic-master" element={<AcademicMaster />} />
              <Route path="faculty-allocation" element={<FacultyAllocation />} />
              <Route path="class-advisor-allocation" element={<ClassAdvisorAllocation />} />
              <Route path="period-master" element={<PeriodMaster />} />
              <Route path="subjects"      element={<SubjectsManagement />} />
              <Route path="attendance"    element={<AttendanceManagement />} />
              <Route path="employee-attendance" element={<EmployeeAttendanceReports />} />
              <Route path="timetable"     element={<TimetableManagement />} />
              <Route path="exams"         element={<ExamsManagement />} />
              <Route path="marks"         element={<CgpaManagement />} />
              <Route path="marks-cgpa"    element={<CgpaManagement />} />
              <Route path="leaves"        element={<LeavesManagement />} />
              <Route path="fees"          element={<FeesManagement />} />
              <Route path="payroll"       element={<Salary />} />
              <Route path="reports"       element={<ReportsManagement />} />
              <Route path="library"       element={<LibraryManagement />} />
              <Route path="transport"     element={<TransportManagement />} />
              <Route path="hostel"        element={<HostelManagement />} />
              <Route path="placement"     element={<PlacementManagement />} />
              <Route path="assignments"   element={<AdminAssignments />} />
              <Route path="accounts-management" element={<AccountsOfficerManagement />} />
              <Route path="ai"            element={<AIAssistant />} />
              <Route path="announcements" element={<AnnouncementsManagement />} />
              <Route path="permissions"   element={<RolePermissions />} />
              <Route path="settings"      element={<SettingsSecurity />} />
              <Route path="activity-logs" element={<ActivityLogs />} />
              <Route path="analytics"     element={<SystemAnalytics />} />
              <Route path="subscription"  element={<AdminSubscription />} />
            </Route>



            {/* ── PRINCIPAL ROUTES ── */}
            <Route path="/principal" element={<PrincipalGuard><GlobalLockdown><PrincipalLayout /></GlobalLockdown></PrincipalGuard>}>
              <Route index element={<Navigate to="/principal/dashboard" replace />} />
              <Route path="dashboard"     element={<PrincipalDashboard />} />
              <Route path="approvals"     element={<PrincipalApprovals />} />
              <Route path="departments"   element={<PrincipalDepartments />} />
              <Route path="hods"          element={<PrincipalHodManagement />} />
              <Route path="staff"         element={<PrincipalStaffOverview />} />
              <Route path="students"      element={<PrincipalStudentsOverview />} />
              <Route path="attendance"    element={<PrincipalAttendanceAnalytics />} />
              <Route path="exams"         element={<PrincipalExamsResults />} />
              <Route path="assignments"   element={<PrincipalAssignments />} />
              <Route path="fees"          element={<PrincipalFeesOverview />} />
              <Route path="communication" element={<PrincipalCommunicationCenter />} />
              <Route path="meetings"       element={<PrincipalMeetingsEvents />} />
              <Route path="academic-planning" element={<PrincipalAcademicPlanning />} />
              <Route path="faculty-performance" element={<PrincipalFacultyPerformance />} />
              <Route path="student-welfare" element={<PrincipalStudentWelfare />} />
              <Route path="staff-support" element={<PrincipalStaffSupport />} />
              <Route path="reports"       element={<PrincipalReports />} />
              <Route path="placement"     element={<PrincipalPlacements />} />
              <Route path="settings"      element={<Settings />} />
            </Route>

            {/* ── HOD ROUTES ── */}
            <Route path="/hod" element={<HodGuard><GlobalLockdown><HodLayout /></GlobalLockdown></HodGuard>}>
              <Route index element={<HodDashboard />} />
              <Route path="students"      element={<HodStudents />} />
              <Route path="staff"         element={<HodStaff />} />
              <Route path="attendance"    element={<HodAttendance />} />
              <Route path="marks"         element={<HodMarks />} />
              <Route path="timetable"     element={<HodTimetable />} />
              <Route path="substitution"  element={<HodSubstitution />} />
              <Route path="assignments"   element={<HodAssignments />} />
              <Route path="subjects"      element={<HodSubjects />} />
              <Route path="faculty-allocation" element={<HodFacultyAllocation />} />
              <Route path="exams"         element={<HodExams />} />
              <Route path="promotion"     element={<StudentPromotion />} />
              <Route path="reports"       element={<HodReports />} />
              <Route path="leaves"        element={<HodLeaves />} />
              <Route path="announcements" element={<HodAnnouncements />} />
              <Route path="payroll"       element={<HodPayroll />} />
              <Route path="support"       element={<HodSupport />} />
              <Route path="placement"     element={<HodPlacements />} />
              <Route path="library"       element={<HodLibrary />} />
              <Route path="settings"      element={<HodSettings />} />
            </Route>

            {/* ── STAFF ROUTES ── */}
            <Route path="/staff" element={<StaffGuard><GlobalLockdown><StaffLayout /></GlobalLockdown></StaffGuard>}>
              <Route index element={<Navigate to="/staff/dashboard" replace />} />
              <Route path="dashboard"  element={<StaffDashboard />} />
              <Route path="attendance" element={<StaffAttendance />} />
              <Route path="marks"      element={<StaffMarks />} />
              <Route path="assignments" element={<StaffAssignments />} />
              <Route path="timetable"  element={<StaffTimetable />} />
              <Route path="students"   element={<StaffStudents />} />
              <Route path="leaves"     element={<StaffLeaves />} />
              <Route path="announcements" element={<StaffAnnouncements />} />
              <Route path="exams"      element={<StaffExams />} />
              <Route path="payroll"    element={<StaffPayroll />} />
              <Route path="placement"  element={<StaffPlacements />} />
              <Route path="library"    element={<StaffLibrary />} />
              <Route path="support"    element={<StaffSupport />} />
            </Route>

            {/* ── STUDENT ROUTES ── */}
            <Route path="/student" element={<StudentGuard><GlobalLockdown><StudentLayout /></GlobalLockdown></StudentGuard>}>
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard"   element={<StudentDashboard />} />
              <Route path="attendance"  element={<StudentAttendance />} />
              <Route path="marks"       element={<StudentMarks />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="fees"        element={<StudentFees />} />
              <Route path="timetable"   element={<StudentTimetable />} />
              <Route path="leaves"      element={<StudentLeaves />} />
              <Route path="settings"    element={<StudentSettings />} />
              <Route path="announcements" element={<StudentAnnouncements />} />
              <Route path="exams"       element={<StudentExams />} />
              <Route path="hostel"      element={<StudentHostel />} />
              <Route path="placement"   element={<StudentPlacements />} />
              <Route path="library"     element={<StudentLibrary />} />
              <Route path="welfare"     element={<StudentWelfare />} />
            </Route>

            {/* ── PARENT ROUTES ── */}
            <Route path="/parent" element={<ParentGuard><GlobalLockdown><ParentLayout /></GlobalLockdown></ParentGuard>}>
              <Route index element={<Navigate to="/parent/dashboard" replace />} />
              <Route path="dashboard" element={<ParentDashboard />} />
              <Route path="attendance" element={<ParentAttendance />} />
              <Route path="marks" element={<ParentMarks />} />
              <Route path="fees" element={<ParentFees />} />
              <Route path="notifications" element={<ParentNotifications />} />
              <Route path="leaves" element={<ParentLeaves />} />
              <Route path="timetable" element={<ParentTimetable />} />
            </Route>

            {/* ── ACCOUNTS ROUTES ── */}
            <Route path="/accounts" element={<AccountsGuard><GlobalLockdown><AccountsLayout /></GlobalLockdown></AccountsGuard>}>
              <Route index element={<Navigate to="/accounts/dashboard" replace />} />
              <Route path="dashboard" element={<AccountsDashboard />} />
              <Route path="fees-collection" element={<FeesCollection />} />
              <Route path="pending-fees" element={<PendingFees />} />
              <Route path="payment-history" element={<PaymentHistory />} />
              <Route path="salary" element={<Salary />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<AccountsReports />} />
              <Route path="scholarships" element={<Scholarships />} />
            </Route>

            {/* ── DRIVER ROUTES ── */}
            <Route path="/driver" element={<DriverGuard><GlobalLockdown><DriverLayout /></GlobalLockdown></DriverGuard>}>
              <Route index element={<Navigate to="/driver/dashboard" replace />} />
              <Route path="dashboard" element={<DriverDashboard />} />
              <Route path="route" element={<DriverRoute />} />
              <Route path="students" element={<DriverStudents />} />
              <Route path="trip" element={<DriverTripManagement />} />
              <Route path="vehicle" element={<DriverVehicle />} />
              <Route path="tasks" element={<DriverTasks />} />
              <Route path="payroll" element={<DriverPayroll />} />
              <Route path="notifications" element={<DriverNotifications />} />
              <Route path="attendance" element={<DriverAttendance />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ThemeContext.Provider>
      </SettingsContext.Provider>
    </ErrorBoundary>
  );
}

export default App;

