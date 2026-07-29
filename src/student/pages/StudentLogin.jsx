import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '../../api/index';
import './StudentLogin.css';

const StudentLogin = () => {
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

      if (userData.role !== 'Student') {
        setError('Unauthorized role for this portal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('student_token', userData.token);
      if (userData.tenantId || userData.collegeId) {
        sessionStorage.setItem('tenantId', userData.tenantId || userData.collegeId);
      }
      sessionStorage.setItem('student_session', JSON.stringify({
        id: userData.referenceId,
        name: userData.name,
        dept: userData.department,
        email: userData.email,
        role: userData.role
      }));

      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try john@college.edu / password123');
      setLoading(false);
    }
  };

  return (
    <div className="student-login-page">
      {/* Animated background */}
      <div className="student-login-bg">
        <div className="student-bg-circle sc1"></div>
        <div className="student-bg-circle sc2"></div>
        <div className="student-bg-circle sc3"></div>
      </div>

      <div className="student-login-card">
        {/* Brand */}
        <div className="student-login-brand">
          <div className="student-login-logo">
            <GraduationCap size={32} color="white" />
          </div>
          <h1>Student Portal</h1>
          <p>Sign in to access your grades, schedules, and attendance</p>
        </div>

        {/* Demo credentials hint */}
        <div className="student-demo-hint">
          <span className="s-demo-badge">DEMO</span>
          <span>Use <strong>john@college.edu</strong> / <strong>password123</strong></span>
        </div>

        <form onSubmit={handleLogin} className="student-login-form">
          <div className="student-field">
            <label>Email Address</label>
            <div className="student-input-wrapper">
              <User size={17} className="student-field-icon" />
              <input
                type="email"
                placeholder="john@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="student-field">
            <label>Password</label>
            <div className="student-input-wrapper">
              <Lock size={17} className="student-field-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="student-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <div className="student-error">{error}</div>}

          <button type="submit" className={`student-login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="student-spinner"></span> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="student-login-footer">
          <a href="/admin">← Go to Admin Portal</a>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
