import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GraduationCap, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Award, Users, BookOpen, Briefcase } from 'lucide-react';
import { loginUser } from '../api/index';
import CustomSelect from '../components/CustomSelect';
import './Login.css';


const applySession = (userData) => {
  // Normalize role to Title Case to match destinations dictionary
  const roleMap = {
    'super admin': 'Super Admin', 'superadmin': 'Super Admin',
    'admin': 'Admin', 'sub admin': 'Sub Admin', 'subadmin': 'Sub Admin',
    'principal': 'Principal', 'hod': 'HOD', 'staff': 'Staff',
    'student': 'Student', 'parent': 'Parent', 'accounts': 'Accounts', 'accountant': 'Accounts', 'driver': 'Driver'
  };
  const role = roleMap[userData.role?.toLowerCase()] || userData.role;
  const roleKey = role.toLowerCase().replace(/\s+/g, '');
  const allKeys = ['superadmin_token','admin_token','subadmin_token','principal_token','hod_token','staff_token','student_token','parent_token','accounts_token','driver_token',
                   'superadmin_session','admin_session','subadmin_session','principal_session','hod_session','staff_session','student_session','parent_session','accounts_session','driver_session', 'tenantId'];
  allKeys.forEach(k => sessionStorage.removeItem(k));

  sessionStorage.setItem(`${roleKey}_token`, userData.token);
  if (userData.tenantId) {
    sessionStorage.setItem('tenantId', userData.tenantId);
  }

  const sessionPayload = {
    _id: userData._id, name: userData.name, email: userData.email,
    role, department: userData.department || null,
    referenceId: userData.referenceId || null,
    permissions: userData.permissions || [],
    tenantId: userData.tenantId || null,
    collegeName: userData.collegeName || null,
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
    sessionPayload.childId = userData.referenceId;
    sessionPayload.childName = 'John Doe';
  }
  sessionStorage.setItem(`${roleKey}_session`, JSON.stringify(sessionPayload));

  const destinations = {
    'Super Admin': '/superadmin/dashboard',
    'Admin': '/admin/dashboard', 'Sub Admin': '/subadmin/dashboard',
    'Principal': '/principal/dashboard', 'HOD': '/hod',
    'Staff': '/staff/dashboard', 'Student': '/student/dashboard',
    'Parent': '/parent/dashboard', 'Accounts': '/accounts/dashboard',
    'Driver': '/driver/dashboard'
  };
  return destinations[role] || null;
};

const UnifiedLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(initialRole || '');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryParams.get('deactivated') === 'true') {
      setError('Your college account has been deactivated. Please contact your Super Admin.');
    }
  }, [location.search]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    if (!selectedRole) {
      setError('Please select a User Role before logging in.');
      setLoading(false);
      return;
    }

    try {
      // Driver Intercept
      if (selectedRole === 'Driver') {
        const cleanStr = (str) => (str || '').toString().replace(/\s+/g, '');
        const cleanEmail = cleanStr(email);
        const cleanPass = cleanStr(password);
        
        let matchedDriver = null;
        let foundTenantId = 'mock_college_id';

        // Search across all tenant storage keys since user is logged out and tenantId is unknown
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('erp_transport_drivers_')) {
            try {
              const driversInTenant = JSON.parse(localStorage.getItem(key) || '[]');
              const found = driversInTenant.find(d => cleanStr(d.phone) === cleanEmail && cleanPass === cleanEmail);
              if (found) {
                matchedDriver = found;
                foundTenantId = key.replace('erp_transport_drivers_', '');
                break;
              }
            } catch (e) {
              console.error('Error parsing driver data', e);
            }
          }
        }
        
        if (!matchedDriver) {
          setError('Invalid Driver Credentials. Use registered Phone Number as both Username and Password.');
          setLoading(false);
          return;
        }
        
        if (matchedDriver.status !== 'Active') {
          setError('Driver account is inactive.');
          setLoading(false);
          return;
        }

        const dest = applySession({
          _id: matchedDriver.driverId,
          referenceId: matchedDriver.driverId,
          name: matchedDriver.name,
          email: matchedDriver.phone,
          role: 'Driver',
          tenantId: foundTenantId,
          token: 'mock-driver-tenant-' + foundTenantId
        });
        if (dest) { navigate(dest); return; }
      }

      // Try backend first
      const res = await loginUser({ email, password });
      const userData = res.data;
      
      // Normalize roles to safely compare them
      const roleMap = {
        'super admin': 'Super Admin', 'superadmin': 'Super Admin',
        'admin': 'Admin', 'sub admin': 'Sub Admin', 'subadmin': 'Sub Admin',
        'principal': 'Principal', 'hod': 'HOD', 'staff': 'Staff',
        'student': 'Student', 'parent': 'Parent', 'accounts': 'Accounts', 'accountant': 'Accounts', 'driver': 'Driver'
      };
      
      const actualRole = roleMap[userData.role?.toLowerCase()] || userData.role;
      const expectedRole = roleMap[selectedRole?.toLowerCase()] || selectedRole;
      
      // ENFORCE ROLE MATCH: Prevent cross-portal login with wrong credentials
      if (actualRole !== expectedRole) {
        setError(`Access Denied: These credentials are not authorized for the ${expectedRole} portal.`);
        setLoading(false);
        return;
      }
      
      // If subscription is expired, redirect to upgrade
      if (userData.subscription && userData.subscription.status === 'Expired') {
        applySession(userData); // Save session so we know who is logged in
        navigate('/upgrade-plan');
        return;
      }
      
      const dest = applySession(userData);
      if (dest) { navigate(dest); return; }
      setError('Unknown role. Cannot redirect.');
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setLoading(true);
    setError('');
    // Try backend, fall back to offline mock if unreachable
    loginUser({ email: demoEmail, password: 'password123' })
      .then((res) => {
        const dest = applySession(res.data);
        if (dest) { window.location.href = dest; }
        else { setError('Unknown role.'); setLoading(false); }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Demo login failed. Backend unreachable or invalid credentials.');
        setLoading(false);
      });
  };

  return (
    <div className="unified-login-container">
      <div className="login-visual-section">
        <div className="visual-overlay"></div>
        <div className="visual-content">
          <div style={{ marginBottom: '24px' }}>
            <img src="/logo.svg" alt="ERPSYS Logo" style={{ width: '240px', height: 'auto' }} />
          </div>
          <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Smart Campus, Smarter Management</p>
          <p className="brand-description">
            A unified platform to manage students, faculty, courses, attendance, exams, fees and more — efficiently and securely.
          </p>
          <div className="feature-indicator-list">
            <div className="feat-ind">
              <Users size={24} />
              <span>Students</span>
            </div>
            <div className="feat-ind">
              <GraduationCap size={24} />
              <span>Faculty</span>
            </div>
            <div className="feat-ind">
              <Shield size={24} />
              <span>Administration</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-card-container">
          <div className="login-card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ padding: '16px 24px', background: '#1e293b', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <img src="/logo.svg" alt="ERPSYS Logo" style={{ width: '140px', height: 'auto', display: 'block' }} />
            </div>
            <h2>{initialRole ? `${initialRole} Login` : 'Welcome Back!'}</h2>
            <p>{initialRole ? `Login to your ${initialRole} account` : 'Login to your ERP account'}</p>
          </div>

          <form onSubmit={handleLogin} className="unified-form">
            {!initialRole && (
              <div className="input-group" style={{ marginBottom: '1.2rem' }}>
                <label>User Role</label>
                <CustomSelect 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  options={[
                    { value: 'Super Admin', label: 'Super Admin' },
                    { value: 'Admin', label: 'Admin' },
                    { value: 'Principal', label: 'Principal' },
                    { value: 'HOD', label: 'HOD' },
                    { value: 'Staff', label: 'Staff' },
                    { value: 'Student', label: 'Student' },
                    { value: 'Parent', label: 'Parent' },
                    { value: 'Accounts', label: 'Accounts' },
                    { value: 'Driver', label: 'Driver' }
                  ]}
                  placeholder="Select Role"
                  icon={Users}
                  required={true}
                />
              </div>
            )}

            <div className="input-group">
              <label>{selectedRole === 'Driver' ? 'Phone Number' : 'Username'}</label>
              <div className="input-wrapper">
                <Mail size={18} className="form-icon" />
                <input
                  type="text"
                  placeholder={selectedRole === 'Driver' ? 'Enter registered phone number' : 'Enter your email/username'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="form-icon" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#64748b', fontWeight: '500', textTransform: 'none' }}>
                <input type="checkbox" style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                Remember me
              </label>
              <Link 
                to="/forgot-password" 
                style={{ 
                  color: '#2563eb', 
                  fontSize: '13px', 
                  textDecoration: 'none', 
                  fontWeight: '600'
                }}
              >
                Forgot Password?
              </Link>
            </div>

            {error && <div className="login-error-msg">{error}</div>}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : <><ArrowRight size={18} /> Login</>}
            </button>


          </form>


        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
