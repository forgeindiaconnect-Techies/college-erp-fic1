import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '../../api/index';
import './ParentLogin.css';

const ParentLogin = () => {
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

      if (userData.role !== 'Parent') {
        setError('Unauthorized role for this portal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('token', userData.token);
      sessionStorage.setItem('user_session', JSON.stringify({
        name: userData.name,
        email: userData.email,
        childId: userData.referenceId,
        childName: 'John Doe', // ideally fetched
        role: 'Parent'
      }));

      navigate('/parent/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try parent_john@college.edu / password123');
      setLoading(false);
    }
  };

  return (
    <div className="parent-login-page">
      <div className="parent-login-bg">
        <div className="parent-bg-circle p-c1"></div>
        <div className="parent-bg-circle p-c2"></div>
      </div>

      <div className="parent-login-card">
        <div className="parent-login-brand">
          <div className="parent-login-logo">
            <Users size={32} color="white" />
          </div>
          <h1>Parent Portal</h1>
          <p>Monitor your child's academic progress and attendance</p>
        </div>

        <div className="parent-demo-hint">
          <span className="p-demo-badge">DEMO</span>
          <span>Use <strong>parent_john@college.edu</strong> / <strong>password123</strong></span>
        </div>

        <form onSubmit={handleLogin} className="parent-login-form">
          <div className="parent-field">
            <label>Email Address</label>
            <div className="parent-input-wrapper">
              <User size={17} className="parent-field-icon" />
              <input
                type="email"
                placeholder="parent@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="parent-field">
            <label>Password</label>
            <div className="parent-input-wrapper">
              <Lock size={17} className="parent-field-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="parent-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <div className="parent-error">{error}</div>}

          <button type="submit" className={`parent-login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="parent-spinner"></span> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="parent-login-footer">
          <a href="/admin">← Go to Admin Portal</a>
        </div>
      </div>
    </div>
  );
};

export default ParentLogin;
