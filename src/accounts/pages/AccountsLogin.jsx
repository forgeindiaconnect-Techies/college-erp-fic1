import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '../../api/index';
import './AccountsLogin.css';

const AccountsLogin = () => {
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

      if (userData.role !== 'Accounts') {
        setError('Unauthorized role for this portal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('token', userData.token);
      sessionStorage.setItem('user_session', JSON.stringify({
        name: userData.name,
        email: userData.email,
        role: 'Accounts Dept.'
      }));
      navigate('/accounts/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try accounts@college.edu / password123');
      setLoading(false);
    }
  };

  return (
    <div className="accounts-login-page">
      <div className="accounts-login-bg">
        <div className="accounts-bg-circle a-c1"></div>
        <div className="accounts-bg-circle a-c2"></div>
      </div>

      <div className="accounts-login-card">
        <div className="accounts-login-brand">
          <div className="accounts-login-logo">
            <Briefcase size={32} color="white" />
          </div>
          <h1>Finance Portal</h1>
          <p>Access the unified accounting system</p>
        </div>

        <div className="accounts-demo-hint">
          <span className="a-demo-badge">DEMO</span>
          <span>Use <strong>accounts@college.edu</strong> / <strong>password123</strong></span>
        </div>

        <form onSubmit={handleLogin} className="accounts-login-form">
          <div className="accounts-field">
            <label>Email Address</label>
            <div className="accounts-input-wrapper">
              <User size={17} className="accounts-field-icon" />
              <input
                type="email"
                placeholder="accounts@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="accounts-field">
            <label>Password</label>
            <div className="accounts-input-wrapper">
              <Lock size={17} className="accounts-field-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="accounts-eye-btn" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <div className="accounts-error">{error}</div>}

          <button type="submit" className={`accounts-login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="accounts-spinner"></span> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="accounts-login-footer">
          <a href="/admin">← Go to Admin Portal</a>
        </div>
      </div>
    </div>
  );
};

export default AccountsLogin;
