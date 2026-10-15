import React from 'react';
import {
  User,
  Shield,
  Mail,
  Phone,
  MapPin,
  Clock,
  Key,
  Calendar,
  CheckCircle,
  Building
} from 'lucide-react';
import { Link } from 'react-router-dom';

const WatchmanProfilePage = () => {
  const sessionStr = sessionStorage.getItem('watchman_session');
  let watchman = {};
  try {
    watchman = sessionStr ? JSON.parse(sessionStr) : {};
  } catch (e) {
    watchman = {};
  }

  return (
    <div className="wm-page">
      <div className="wm-header">
        <div>
          <h1 className="wm-title">Security Officer Profile</h1>
          <p className="wm-subtitle">View your personnel information, security clearance, and shift credentials</p>
        </div>
        <div className="wm-header-actions">
          <Link to="/watchman/change-password" className="wm-btn wm-btn-secondary">
            <Key size={16} />
            Change Password
          </Link>
        </div>
      </div>

      <div className="wm-grid-2" style={{ gap: 24 }}>
        {/* Profile Identity Card */}
        <div className="wm-card">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#2563eb',
              border: '2px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
            }}>
              {watchman.name ? watchman.name.charAt(0).toUpperCase() : 'W'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
                  {watchman.name || 'Campus Watchman'}
                </h2>
                <span className="wm-badge wm-badge-success">● Active</span>
              </div>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Campus Security Staff • Role: {watchman.role || 'Watchman'}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <span className="wm-badge wm-badge-primary">
                  ID: {watchman.employeeId || 'WCH-1001'}
                </span>
                <span className="wm-badge wm-badge-warning">
                  Gate: {watchman.assignedGate || 'Main Gate 1'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
              Contact Information
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Mail size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Email Address</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>
                    {watchman.email || 'watchman@college.edu'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Phone size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Phone Number</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>
                    {watchman.phone || '+91 98765 43210'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Building size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Organization</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>
                    Campus Security & Gate Operations Department
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Duty & Assignment Details */}
        <div className="wm-card">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="#2563eb" />
            Duty & Security Assignment
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Assigned Shift:</span>
                <span className="wm-badge wm-badge-primary" style={{ fontWeight: 600 }}>
                  {watchman.shift || 'Morning Shift'}
                </span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#475569' }}>
                Shift timings: Morning (6:00 AM - 2:00 PM), Evening (2:00 PM - 10:00 PM), Night (10:00 PM - 6:00 AM).
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Gate Jurisdiction:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                  {watchman.assignedGate || 'Main Gate 1 (Front Entrance)'}
                </span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#475569' }}>
                Authorized for visitor pass issuing, QR validation, student gate clearance, and incident escalation.
              </p>
            </div>

            <div style={{ background: '#ecfdf5', padding: 16, borderRadius: 8, border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} color="#059669" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46' }}>
                  Security Clearance Verified
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#047857' }}>
                Account granted full Watchman operational privileges by College Administration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchmanProfilePage;
