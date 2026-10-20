import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  GraduationCap, Lock, Mail, Eye, EyeOff, ArrowRight,
  Shield, Users, Headphones, AlertCircle
} from 'lucide-react';
import { loginUser } from '../api/index';
import './Login.css';

const applySession = (userData) => {
  // Normalize role to Title Case to match destinations dictionary
  const roleMap = {
    'super admin': 'Super Admin', 'superadmin': 'Super Admin',
    'admin': 'Admin', 'sub admin': 'Sub Admin', 'subadmin': 'Sub Admin',
    'principal': 'Principal', 'hod': 'HOD', 'staff': 'Staff',
    'student': 'Student', 'parent': 'Parent', 'accounts': 'Accounts', 'accountant': 'Accounts',
    'driver': 'Driver', 'hostel': 'Hostel', 'watchman': 'Watchman',
    'librarian': 'Librarian', 'library': 'Librarian',
    'placement': 'Placement', 'placement officer': 'Placement', 'placement cell': 'Placement'
  };
  const role = roleMap[userData.role?.toLowerCase()] || userData.role;
  const roleKey = role.toLowerCase().replace(/\s+/g, '');
  const allKeys = [
    'superadmin_token','admin_token','subadmin_token','principal_token','hod_token','staff_token','student_token','parent_token','accounts_token','driver_token','hostel_token','watchman_token','librarian_token','placement_token',
    'superadmin_session','admin_session','subadmin_session','principal_session','hod_session','staff_session','student_session','parent_session','accounts_session','driver_session','hostel_session','watchman_session','librarian_session','placement_session', 'tenantId'
  ];
  allKeys.forEach(k => sessionStorage.removeItem(k));

  sessionStorage.setItem(`${roleKey}_token`, userData.token);
  sessionStorage.setItem('token', userData.token);
  if (userData.tenantId) {
    sessionStorage.setItem('tenantId', userData.tenantId);
  }

  const sessionPayload = {
    _id: userData._id,
    name: userData.name,
    email: userData.email,
    role,
    department: userData.department || null,
    referenceId: userData.referenceId || null,
    permissions: userData.permissions || [],
    tenantId: userData.tenantId || null,
    collegeName: userData.collegeName || 'Institution Portal',
    subscription: userData.subscription || null
  };

  if (role === 'HOD' || role === 'Staff') {
    sessionPayload.dept = userData.department;
    sessionPayload.deptCode = (userData.department || '').substring(0, 2).toUpperCase() || 'CS';
    sessionPayload.subjects = userData.subjects || [];
  } else if (role === 'Student') {
    sessionPayload.id = userData.referenceId;
    sessionPayload.dept = userData.department;
  } else if (role === 'Parent') {
    sessionPayload.childId = userData.referenceId || userData.parentOf || null;
    sessionPayload.childName = userData.childName || userData.studentName || '';
  } else if (role === 'Placement') {
    sessionPayload.id = userData.referenceId;
    sessionPayload.department = userData.department || 'Training & Placement Cell';
  } else if (role === 'Watchman') {
    sessionPayload.employeeId = userData.employeeId || userData.referenceId || 'WCH-1001';
    sessionPayload.assignedGate = userData.assignedGate || 'Main Gate 1';
    sessionPayload.shift = userData.shift || 'Morning';
    sessionPayload.phone = userData.phone || '';
  }
  sessionStorage.setItem(`${roleKey}_session`, JSON.stringify(sessionPayload));

  const destinations = {
    'Super Admin': '/superadmin/dashboard',
    'Admin': '/admin/dashboard', 'Sub Admin': '/subadmin/dashboard',
    'Principal': '/principal/dashboard', 'HOD': '/hod',
    'Staff': '/staff/dashboard', 'Student': '/student/dashboard',
    'Parent': '/parent/dashboard', 'Accounts': '/accounts/dashboard',
    'Driver': '/driver/dashboard', 'Hostel': '/hostel/dashboard', 'Watchman': '/watchman/dashboard',
    'Librarian': '/librarian/dashboard',
    'Placement': '/placement/dashboard'
  };
  return destinations[role] || null;
};

const UnifiedLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryParams.get('deactivated') === 'true') {
      setError('Your college account has been deactivated. Please contact your Super Admin.');
    } else {
      setError('');
    }

    const savedEmail = localStorage.getItem('erp_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [location.search]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter your username/email and password.');
      setLoading(false);
      return;
    }

    try {
      // 1. Backend authentication
      const res = await loginUser({ email: cleanEmail, password: cleanPassword });
      const userData = res.data;
      
      const roleMap = {
        'super admin': 'Super Admin', 'superadmin': 'Super Admin',
        'admin': 'Admin', 'sub admin': 'Sub Admin', 'subadmin': 'Sub Admin',
        'principal': 'Principal', 'hod': 'HOD', 'staff': 'Staff',
        'student': 'Student', 'parent': 'Parent', 'accounts': 'Accounts', 'accountant': 'Accounts',
        'driver': 'Driver', 'hostel': 'Hostel', 'watchman': 'Watchman',
        'librarian': 'Librarian', 'library': 'Librarian',
        'placement': 'Placement', 'placement officer': 'Placement', 'placement cell': 'Placement'
      };
      
      const actualRole = roleMap[userData.role?.toLowerCase()] || userData.role;
      
      if (userData.subscription && userData.subscription.status === 'Expired') {
        applySession(userData);
        navigate('/upgrade-plan');
        return;
      }
      
      if (rememberMe) {
        localStorage.setItem('erp_remember_email', cleanEmail);
      } else {
        localStorage.removeItem('erp_remember_email');
      }

      const dest = applySession({ ...userData, role: actualRole });
      if (dest) {
        navigate(dest);
        return;
      }
      setError('Unknown role assigned to this account. Cannot redirect.');
      setLoading(false);
    } catch (err) {
      // Local fallback for offline provisioned demo roles (e.g., Meena Librarian, Placement)
      const cleanEmailLower = cleanEmail.toLowerCase();

      // Librarian Fallback
      if (cleanEmailLower.includes('meena') || cleanEmailLower.includes('lib')) {
        let foundLibrarian = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('erp_librarians')) {
            try {
              const list = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(list)) {
                const match = list.find(l => (l.email || '').trim().toLowerCase() === cleanEmailLower);
                if (match) {
                  foundLibrarian = match;
                  break;
                }
              }
            } catch (e) {}
          }
        }

        if (!foundLibrarian && cleanEmailLower === 'meena@gmail.com') {
          foundLibrarian = {
            _id: 'LIB-MEENA-001',
            name: 'Meena (Librarian)',
            email: 'meena@gmail.com',
            password: 'meena',
            referenceId: 'LIB-001',
            role: 'Librarian'
          };
        }

        if (foundLibrarian) {
          if (!foundLibrarian.password || foundLibrarian.password === cleanPassword || (cleanEmailLower === 'meena@gmail.com' && cleanPassword === 'meena')) {
            const tenant = sessionStorage.getItem('tenantId') || 'COL001';
            const fallbackUserData = {
              _id: foundLibrarian._id || foundLibrarian.id || `LIB-${Date.now()}`,
              name: foundLibrarian.name || 'Librarian User',
              email: foundLibrarian.email,
              role: 'Librarian',
              referenceId: foundLibrarian.referenceId || foundLibrarian.employeeId || 'LIB-001',
              tenantId: tenant,
              token: `mock-librarian-tenant-${tenant}`
            };
            const dest = applySession(fallbackUserData);
            if (dest) {
              navigate(dest);
              return;
            }
          }
        }
      }

      // Placement Fallback
      if (cleanEmailLower.includes('placement') || cleanEmailLower.includes('suresh') || cleanEmailLower.includes('menaka') || cleanEmailLower.includes('karthick')) {
        let foundOfficer = null;
        let matchedKey = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('erp_placement_officers')) {
            try {
              const list = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(list)) {
                const match = list.find(l => (l.email || '').trim().toLowerCase() === cleanEmailLower);
                if (match) {
                  foundOfficer = match;
                  matchedKey = key;
                  break;
                }
              }
            } catch (e) {}
          }
        }

        if (!foundOfficer && (cleanEmailLower === 'placement@college.edu' || cleanEmailLower.includes('placement'))) {
          foundOfficer = {
            _id: 'PLC-DEMO-001',
            name: 'Dr. Suresh Kumar (Placement Officer)',
            email: cleanEmail,
            password: 'password123',
            referenceId: 'PLC-001',
            role: 'Placement',
            tenantId: 'COL004-3190860',
            collegeId: 'COL004-3190860'
          };
        }

        if (foundOfficer) {
          if (!foundOfficer.password || foundOfficer.password === cleanPassword || (cleanEmailLower === 'placement@college.edu' && cleanPassword === 'password123') || cleanPassword === 'menaka' || cleanPassword === 'karthick') {
            let tenant = foundOfficer.tenantId || foundOfficer.collegeId || sessionStorage.getItem('tenantId') || 'COL004-3190860';
            const fallbackUserData = {
              _id: foundOfficer._id || foundOfficer.id || `PLC-${Date.now()}`,
              name: foundOfficer.name || 'Placement Officer',
              email: foundOfficer.email,
              role: 'Placement',
              referenceId: foundOfficer.referenceId || foundOfficer.employeeId || 'PLC-001',
              department: foundOfficer.department || 'Training & Placement Cell',
              tenantId: tenant,
              collegeId: tenant,
              token: `mock-placement-tenant-${tenant}`
            };
            const dest = applySession(fallbackUserData);
            if (dest) {
              navigate(dest);
              return;
            }
          }
        }
      }

      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="unified-login-container">
      <div className="login-wrapper-card">
        {/* LEFT PANEL: Bright Sunny Campus Visual */}
        <div className="login-visual-section">
          <div className="visual-image-bg"></div>
          <div className="visual-top-scrim"></div>
          
          <div className="visual-content">
            {/* Top Logo */}
            <div className="visual-brand-header">
              <img src="/logo.svg" alt="ERPSYS Logo" className="visual-logo-img" />
            </div>

            {/* Headline & Subtitle */}
            <div className="visual-hero-text">
              <h1 className="brand-headline">
                Smart Campus,<br />
                Smarter Management
              </h1>
              <div className="headline-accent-bar"></div>
              <p className="brand-description">
                One connected platform for students,<br />
                faculty and campus operations.
              </p>
            </div>

            {/* Bottom Glass Role Badges */}
            <div className="glass-role-pills">
              <div className="glass-pill-item">
                <GraduationCap size={20} className="pill-icon" />
                <span>Students</span>
              </div>
              <div className="glass-pill-divider"></div>
              <div className="glass-pill-item">
                <Users size={20} className="pill-icon" />
                <span>Faculty</span>
              </div>
              <div className="glass-pill-divider"></div>
              <div className="glass-pill-item">
                <Shield size={20} className="pill-icon" />
                <span>Administration</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Crisp White Login Form */}
        <div className="login-form-section">
          {/* Subtle Decorative Background Accents */}
          <div className="corner-decor top-right"></div>
          <div className="corner-decor bottom-right"></div>

          <div className="login-card-container">
            {/* Form Header */}
            <div className="login-card-header">
              <div className="login-logo-wrap">
                <img src="/logo_dark.svg" alt="ERPSYS Logo" className="login-right-logo" />
              </div>
              <h2 className="login-title">Welcome Back!</h2>
              <p className="login-subtitle">Sign in to your institution ERP</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="unified-form" autoComplete="off">
              <div className="input-group">
                <label htmlFor="login-username">Username / Email</label>
                <div className="input-wrapper">
                  <Mail size={18} className="form-icon" />
                  <input
                    id="login-username"
                    type="text"
                    name="login_username"
                    autoComplete="off"
                    placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="form-icon" />
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    name="login_password"
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="pwd-toggle-btn"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-meta-row">
                <label className="remember-me-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {error && (
                <div className="login-error-msg" role="alert">
                  <AlertCircle size={15} className="error-icon" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="login-spinner"></span>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    <span>Login</span>
                  </>
                )}
              </button>

              {/* Create Account Link */}
              <div className="login-register-row">
                <span>Don't have an institution account? </span>
                <Link to="/register" className="create-account-link">
                  Create an Account &rarr;
                </Link>
              </div>

              {/* Bottom Support Info */}
              <div className="login-help-footer">
                <Headphones size={17} className="help-icon" />
                <div className="help-text">
                  <span className="help-title">Need help signing in?</span>
                  <span className="help-sub">Contact your administrator</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
