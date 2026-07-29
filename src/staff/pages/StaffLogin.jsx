import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '../../api/index';
import './StaffLogin.css';

const StaffLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginUser({ email, password });
      const userData = res.data;

      if (userData.role !== 'Staff') {
        setError('Unauthorized role for this portal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('staff_token', userData.token);
      if (userData.tenantId || userData.collegeId) {
        sessionStorage.setItem('tenantId', userData.tenantId || userData.collegeId);
      }
      sessionStorage.setItem('staff_session', JSON.stringify({
        id: userData.referenceId,
        name: userData.name, dept: userData.department, deptCode: userData.department?.substring(0, 2).toUpperCase() || 'CS', role: 'Staff', email: userData.email, subjects: userData.subjects || []
      }));
      navigate('/staff/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try karthik@college.edu / password123');
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-page">
      {/* Animated background */}
      <div className="staff-login-bg">
        <div className="staff-bg-circle c1"></div>
        <div className="staff-bg-circle c2"></div>
        <div className="staff-bg-circle c3"></div>
      </div>

      <div className="staff-login-card">
        {/* Brand */}
        <div className="staff-login-brand">
          <div className="staff-login-logo">
            <GraduationCap size={32} color="white" />
          </div>
          <h1>Staff Portal</h1>
          <p>Sign in to access your instructor dashboard</p>
        </div>

        {/* Demo credentials hint */}
        <div className="staff-demo-hint">
          <span className="demo-badge">DEMO</span>
          <span>Use <strong>karthik@college.edu</strong> / <strong>password123</strong></span>
        </div>

        <form onSubmit={handleLogin} className="staff-login-form">
          <div className="staff-field">
            <label>Email Address</label>
            <div className="staff-input-wrapper">
              <User size={17} className="staff-field-icon" />
              <input
                type="email"
                placeholder="karthik@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="staff-field">
            <label>Password</label>
            <div className="staff-input-wrapper">
              <Lock size={17} className="staff-field-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="staff-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <div className="staff-error">{error}</div>}

          <button type="submit" className={`staff-login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="staff-spinner"></span> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="staff-login-footer">
          <a href="/admin">← Go to Admin Portal</a>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
