import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '../../api/index';
import './PrincipalLogin.css';

const PrincipalLogin = () => {
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

      if (userData.role !== 'Principal') {
        setError('Unauthorized role for this portal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('token', userData.token);
      sessionStorage.setItem('user_session', JSON.stringify({
        name: userData.name,
        email: userData.email,
        role: 'Principal'
      }));
      navigate('/principal/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try principal@college.edu / password123');
      setLoading(false);
    }
  };

  return (
    <div className="principal-login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0fdf4' }}>
      <div className="principal-login-card" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#22c55e', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px' }}>
            <Award size={32} color="white" />
          </div>
          <h1 style={{ margin: 0, color: '#1f2937', fontSize: '24px' }}>Principal Portal</h1>
          <p style={{ margin: '5px 0 0', color: '#6b7280', fontSize: '14px' }}>Sign in to access institution overview</p>
        </div>

        <div style={{ backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '25px', fontSize: '13px', color: '#4b5563' }}>
          <span style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginRight: '8px', fontSize: '11px' }}>DEMO</span>
          <span>principal@college.edu / password123</span>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} />
              <input
                type="email"
                placeholder="principal@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 40px 10px 40px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {loading ? 'Authenticating...' : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/admin" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>← Go to Admin Portal</a>
        </div>
      </div>
    </div>
  );
};

export default PrincipalLogin;
