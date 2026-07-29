import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, ArrowRight, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { forgotPassword } from '../api/index';
import './Login.css'; // Reuse premium login layout CSS for absolute consistency!

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await forgotPassword(email);
      setSuccessMsg(res.data.message || 'Reset link successfully sent.');
      setEmail('');
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to request password reset. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="unified-login-container">
      <div className="login-visual-section">
        <div className="visual-overlay"></div>
        <div className="visual-content">
          <div className="logo-badge">
            <GraduationCap size={48} className="logo-icon" />
          </div>
          <h1 className="brand-headline">Apex ERP Portal</h1>
          <p className="brand-description">
            Experience next-generation multi-role college operations, academic metrics, and real-time management.
          </p>
          <div className="feature-indicator-list">
            <div className="feat-ind">
              <span className="feat-dot green"></span>
              <span>Fully Secure Password Reset</span>
            </div>
            <div className="feat-ind">
              <span className="feat-dot blue"></span>
              <span>Automated Recovery Dispatch</span>
            </div>
            <div className="feat-ind">
              <span className="feat-dot purple"></span>
              <span>Encrypted Session Management</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-card-container">
          <div style={{ marginBottom: '24px' }}>
            <Link 
              to="/login" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: '#6366f1', 
                textDecoration: 'none', 
                fontSize: '14px', 
                fontWeight: '600',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = '#818cf8'}
              onMouseOut={(e) => e.target.style.color = '#6366f1'}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>

          <div className="login-card-header">
            <h2>Reset Password</h2>
            <p>Enter your registered email address to recover access to your portal</p>
          </div>

          {successMsg ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '16px', 
              padding: '24px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.2)', 
              borderRadius: '16px',
              textAlign: 'center',
              animation: 'cardFadeIn 0.4s ease-out'
            }}>
              <CheckCircle2 size={48} color="#10b981" />
              <h4 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700', margin: 0 }}>Dispatch Successful</h4>
              <p style={{ color: '#a7f3d0', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>{successMsg}</p>
              <button 
                onClick={() => navigate('/login')} 
                className="login-submit-btn" 
                style={{ width: '100%', marginTop: '8px' }}
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="unified-form">
              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="form-icon" />
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="login-error-msg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <ShieldAlert size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Processing Dispatch...' : <>Send Recovery Link <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
