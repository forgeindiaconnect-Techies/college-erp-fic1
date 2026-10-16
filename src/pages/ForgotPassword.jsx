import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, Mail, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, Users, Shield, Headphones
} from 'lucide-react';
import { forgotPassword } from '../api/index';
import './Login.css';

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
      setSuccessMsg(res.data?.message || 'Password reset link successfully sent to your email.');
      setEmail('');
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to request password reset. Please verify your email.');
      setLoading(false);
    }
  };

  return (
    <div className="unified-login-container">
      <div className="login-wrapper-card">
        {/* LEFT PANEL: Vibrant, sunny campus visual */}
        <div className="login-visual-section">
          <div className="visual-image-bg"></div>
          <div className="visual-top-scrim"></div>
          
          <div className="visual-content">
            <div className="visual-brand-header">
              <img src="/logo.svg" alt="ERPSYS Logo" className="visual-logo-img" />
            </div>

            <div className="visual-hero-text">
              <h1 className="brand-headline">
                Smart Campus,<br />
                Smarter Management
              </h1>
              <div className="headline-accent-bar"></div>
              <p className="brand-description">
                Secure self-service account recovery and credential management for your institution portal.
              </p>
            </div>

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

        {/* RIGHT PANEL: Clean white recovery form */}
        <div className="login-form-section">
          <div className="corner-decor top-right"></div>
          <div className="corner-decor bottom-right"></div>

          <div className="login-card-container">
            <div style={{ marginBottom: '16px' }}>
              <Link 
                to="/login" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  color: '#2563eb', 
                  textDecoration: 'none', 
                  fontSize: '13px', 
                  fontWeight: '600'
                }}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>

            <div className="login-card-header">
              <div className="login-logo-wrap">
                <img src="/logo_dark.svg" alt="ERPSYS Logo" className="login-right-logo" />
              </div>
              <h2 className="login-title">Reset Password</h2>
              <p className="login-subtitle">Enter your registered email to receive recovery instructions</p>
            </div>

            {successMsg ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '24px', 
                background: '#ecfdf5', 
                border: '1px solid #a7f3d0', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <CheckCircle2 size={40} color="#059669" />
                <h4 style={{ color: '#065f46', fontSize: '16px', fontWeight: '700', margin: 0 }}>Recovery Link Sent</h4>
                <p style={{ color: '#047857', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>{successMsg}</p>
                <button 
                  onClick={() => navigate('/login')} 
                  className="login-submit-btn" 
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="unified-form" autoComplete="off">
                <div className="input-group">
                  <label htmlFor="recovery-email">Registered Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="form-icon" />
                    <input
                      id="recovery-email"
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="login-error-msg" role="alert">
                    <AlertCircle size={16} className="error-icon" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="login-spinner"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="login-help-footer">
                  <Headphones size={22} className="help-icon" />
                  <div className="help-text">
                    <span className="help-title">Need help signing in?</span>
                    <span className="help-sub">Contact your administrator</span>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
