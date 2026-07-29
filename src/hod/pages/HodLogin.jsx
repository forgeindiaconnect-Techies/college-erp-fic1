import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '../../api/index';
import './HodLogin.css';

const HodLogin = () => {
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

      if (userData.role !== 'HOD') {
        setError('Unauthorized role for this portal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('hod_token', userData.token);
      sessionStorage.setItem('hod_session', JSON.stringify({
        name: userData.name, dept: userData.department, deptCode: userData.department?.substring(0, 2).toUpperCase() || 'CS', role: 'HOD', email: userData.email
      }));
      navigate('/hod');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try ananya@college.edu / password123');
      setLoading(false);
    }
  };

  return (
    <div className="hod-login-page">
      {/* Animated background */}
      <div className="hod-login-bg">
        <div className="hod-bg-circle c1"></div>
        <div className="hod-bg-circle c2"></div>
        <div className="hod-bg-circle c3"></div>
      </div>

      <div className="hod-login-card">
        {/* Brand */}
        <div className="hod-login-brand">
          <div className="hod-login-logo">
            <GraduationCap size={32} color="white" />
          </div>
          <h1>HOD Portal</h1>
          <p>Sign in to access your department dashboard</p>
        </div>

        {/* Demo credentials hint */}
        <div className="hod-demo-hint">
          <span className="demo-badge">DEMO</span>
          <span>Use <strong>ananya@college.edu</strong> / <strong>password123</strong></span>
        </div>

        <form onSubmit={handleLogin} className="hod-login-form">
          <div className="hod-field">
            <label>Email Address</label>
            <div className="hod-input-wrapper">
              <User size={17} className="hod-field-icon" />
              <input
                type="email"
                placeholder="ananya@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="hod-field">
            <label>Password</label>
            <div className="hod-input-wrapper">
              <Lock size={17} className="hod-field-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="hod-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <div className="hod-error">{error}</div>}

          <button type="submit" className={`hod-login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="hod-spinner"></span> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="hod-login-footer">
          <a href="/admin">← Go to Admin Portal</a>
        </div>
      </div>
    </div>
  );
};

export default HodLogin;
