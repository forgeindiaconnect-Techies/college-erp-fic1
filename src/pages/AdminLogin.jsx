import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '../api/index';
import './AdminLogin.css';

const AdminLogin = () => {
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

      if (userData.role !== 'Admin') {
        setError('Unauthorized role for this portal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('token', userData.token);
      sessionStorage.setItem('user_session', JSON.stringify({
        name: userData.name,
        email: userData.email,
        role: 'Admin'
      }));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try admin@college.edu / password123');
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-icon-wrapper">
            <Shield size={32} color="#3b82f6" />
          </div>
          <h1 className="admin-login-title">System Admin Portal</h1>
          <p className="admin-login-subtitle">Sign in to access control panel</p>
        </div>

        <div className="admin-demo-hint">
          <span className="admin-demo-badge">DEMO</span>
          <span className="admin-demo-text">admin@college.edu / password123</span>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-field">
            <label>Email Address</label>
            <div className="admin-input-wrapper">
              <User size={18} className="admin-input-icon" />
              <input
                type="email"
                placeholder="admin@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-field">
            <label>Password</label>
            <div className="admin-input-wrapper">
              <Lock size={18} className="admin-input-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="admin-eye-btn"
                onClick={() => setShowPwd(!showPwd)}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="admin-error">{error}</div>}

          <button 
            type="submit" 
            className="admin-submit-btn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
