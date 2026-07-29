import React, { useState, useEffect, useContext } from 'react';
import {
  Save, Database, Shield, Bell, Globe, CheckCircle2,
  Lock, Key, RefreshCw, AlertCircle, ChevronRight,
  Server, Mail, Smartphone, Palette, Grid
} from 'lucide-react';
import { getSettings, updateSettings } from '../api/index';
import { SettingsContext } from '../App';
import './Settings.css';

/* ── Tab metadata ────────────────────────────── */
const TABS = [
  {
    id: 'general',
    label: 'Institution Profile',
    sub: 'Name, logo, & timezone',
    Icon: Globe,
  },
  {
    id: 'appearance',
    label: 'Appearance & Branding',
    sub: 'Colors & theme',
    Icon: Palette,
  },
  {
    id: 'modules',
    label: 'Module Configuration',
    sub: 'Enable/disable ERP modules',
    Icon: Grid,
  },
  {
    id: 'security',
    label: 'Security & Auth',
    sub: 'Passwords & access',
    Icon: Shield,
  },
];

/* ── Reusable toggle switch ──────────────────── */
const Toggle = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked || false} onChange={onChange} />
    <span className="toggle-track" />
  </label>
);

/* ── Main component ──────────────────────────── */
const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const { setCollegeSettings } = useContext(SettingsContext);
  
  const [form, setForm] = useState({
    collegeName: '',
    collegeLogo: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#3b82f6',
    timezone: 'Asia/Kolkata (IST)',
    currency: 'INR (₹)',
    academicYear: '2026-2027',
    attendanceEnabled: true,
    hostelEnabled: true,
    transportEnabled: true,
    libraryEnabled: true,
    placementEnabled: true,
    examEnabled: true,
    // Add existing ones for security if they are ever needed
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSettings();
        if (res.data) {
          setForm(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      const res = await updateSettings(form);
      if (res.data) {
        setCollegeSettings(res.data);
        if (res.data.primaryColor) {
          document.documentElement.style.setProperty('--primary-color', res.data.primaryColor);
          document.documentElement.style.setProperty('--brand-color', res.data.primaryColor);
        }
        if (res.data.secondaryColor) {
          document.documentElement.style.setProperty('--secondary-color', res.data.secondaryColor);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    }
  };

  return (
    <div className="settings-page animate-fade-in">

      {/* ── Page header ── */}
      <div className="settings-header">
        <div>
          <h1>System Settings</h1>
          <p>Configure global ERP parameters, security preferences, and notification rules.</p>
        </div>
        <button className="btn-settings-save" onClick={handleSave}>
          <Save size={16} /> Save All Changes
        </button>
      </div>

      {/* ── Success flash ── */}
      {saved && (
        <div className="settings-success">
          <CheckCircle2 size={17} /> Settings saved successfully!
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="settings-layout">

        {/* Left: nav */}
        <nav className="settings-nav">
          {TABS.map(({ id, label, sub, Icon }) => (
            <button
              key={id}
              className={`settings-nav-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <span className="nav-icon"><Icon size={16} /></span>
              <span className="nav-label">
                <span style={{ display: 'block' }}>{label}</span>
                <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.75 }}>{sub}</span>
              </span>
              <ChevronRight size={14} className="nav-arrow" />
            </button>
          ))}
        </nav>

        {/* Right: content panel */}
        <div className="settings-panel">

          {/* ─── GENERAL ─── */}
          {activeTab === 'general' && (
            <div className="animate-fade-in">
              <div className="settings-panel-header">
                <div className="settings-panel-icon"><Globe size={18} /></div>
                <div>
                  <h3>General ERP Configuration</h3>
                  <p>Core academic year, semester, and institution settings</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="settings-form">
                <div className="settings-row">
                  <div className="settings-field">
                    <label>Institution Name</label>
                    <input
                      type="text"
                      value={form.collegeName}
                      onChange={e => set('collegeName', e.target.value)}
                    />
                  </div>
                  <div className="settings-field">
                    <label>Academic Year</label>
                    <select value={form.academicYear} onChange={e => set('academicYear', e.target.value)}>
                      <option>2025-2026</option>
                      <option>2026-2027</option>
                      <option>2027-2028</option>
                    </select>
                  </div>
                </div>

                <div className="settings-row">
                  <div className="settings-field">
                    <label>Default Currency</label>
                    <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                      <option>INR (₹)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                  <div className="settings-field">
                    <label>Server Timezone</label>
                    <select value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                      <option>Asia/Kolkata (IST)</option>
                      <option>UTC+0 (GMT)</option>
                      <option>America/New_York (EST)</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ─── APPEARANCE & BRANDING ─── */}
          {activeTab === 'appearance' && (
            <div className="animate-fade-in">
              <div className="settings-panel-header">
                <div className="settings-panel-icon"><Palette size={18} /></div>
                <div>
                  <h3>Appearance & Branding</h3>
                  <p>Customize college logo and theme colors</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="settings-form">
                <div className="settings-field">
                  <label>College Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={form.collegeLogo}
                    onChange={e => set('collegeLogo', e.target.value)}
                  />
                  {form.collegeLogo && (
                    <div style={{ marginTop: '10px' }}>
                      <img src={form.collegeLogo} alt="Logo Preview" style={{ height: '40px', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>

                <div className="settings-row">
                  <div className="settings-field">
                    <label>Primary Theme Color</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={e => set('primaryColor', e.target.value)}
                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px' }}
                      />
                      <input
                        type="text"
                        value={form.primaryColor}
                        onChange={e => set('primaryColor', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>Secondary Theme Color</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={form.secondaryColor}
                        onChange={e => set('secondaryColor', e.target.value)}
                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px' }}
                      />
                      <input
                        type="text"
                        value={form.secondaryColor}
                        onChange={e => set('secondaryColor', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ─── MODULES ─── */}
          {activeTab === 'modules' && (
            <div className="animate-fade-in">
              <div className="settings-panel-header">
                <div className="settings-panel-icon"><Grid size={18} /></div>
                <div>
                  <h3>Module Configuration</h3>
                  <p>Enable or disable ERP modules for your institution</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="settings-form">
                <label className="settings-toggle-card">
                  <Toggle checked={form.attendanceEnabled} onChange={e => set('attendanceEnabled', e.target.checked)} />
                  <div className="settings-toggle-label">
                    <strong>Attendance Module</strong>
                    <span>Enable daily attendance tracking for students and staff.</span>
                  </div>
                </label>

                <label className="settings-toggle-card">
                  <Toggle checked={form.hostelEnabled} onChange={e => set('hostelEnabled', e.target.checked)} />
                  <div className="settings-toggle-label">
                    <strong>Hostel Module</strong>
                    <span>Enable hostel allocations and complaints management.</span>
                  </div>
                </label>

                <label className="settings-toggle-card">
                  <Toggle checked={form.transportEnabled} onChange={e => set('transportEnabled', e.target.checked)} />
                  <div className="settings-toggle-label">
                    <strong>Transport Module</strong>
                    <span>Enable bus route tracking and driver management.</span>
                  </div>
                </label>

                <label className="settings-toggle-card">
                  <Toggle checked={form.libraryEnabled} onChange={e => set('libraryEnabled', e.target.checked)} />
                  <div className="settings-toggle-label">
                    <strong>Library Module</strong>
                    <span>Enable book cataloging and issue/return tracking.</span>
                  </div>
                </label>

                <label className="settings-toggle-card">
                  <Toggle checked={form.placementEnabled} onChange={e => set('placementEnabled', e.target.checked)} />
                  <div className="settings-toggle-label">
                    <strong>Placement Module</strong>
                    <span>Enable campus recruitment tracking and applications.</span>
                  </div>
                </label>
                
                <label className="settings-toggle-card">
                  <Toggle checked={form.examEnabled} onChange={e => set('examEnabled', e.target.checked)} />
                  <div className="settings-toggle-label">
                    <strong>Exam Module</strong>
                    <span>Enable exam scheduling and result publishing.</span>
                  </div>
                </label>
              </form>
            </div>
          )}

          {/* ─── SECURITY ─── */}
          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <div className="settings-panel-header">
                <div className="settings-panel-icon" style={{ background: 'rgba(99, 102, 241,0.1)', color: '#6366F1' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h3>Security & Authentication</h3>
                  <p>Manage admin credentials and login session policies</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="settings-form">
                <div className="settings-field">
                  <label><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />Current Admin Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password to authorise changes"
                    value={form.currentPassword}
                    onChange={e => set('currentPassword', e.target.value)}
                  />
                </div>

                <div className="settings-row">
                  <div className="settings-field">
                    <label><Key size={12} style={{ display: 'inline', marginRight: 4 }} />New Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={form.newPassword}
                      onChange={e => set('newPassword', e.target.value)}
                    />
                  </div>
                  <div className="settings-field">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label>Session Auto-Logout Timeout</label>
                  <select value={form.sessionTimeout} onChange={e => set('sessionTimeout', e.target.value)}>
                    <option>30 minutes</option>
                    <option>60 minutes</option>
                    <option>2 hours</option>
                    <option>8 hours (Stay Logged In)</option>
                  </select>
                </div>

                <label className="settings-toggle-card">
                  <Toggle
                    checked={form.twoFactor}
                    onChange={e => set('twoFactor', e.target.checked)}
                  />
                  <div className="settings-toggle-label">
                    <strong>Two-Factor Authentication (2FA)</strong>
                    <span>Require OTP verification via email on every admin login for extra protection.</span>
                  </div>
                </label>
              </form>
            </div>
          )}



        </div>
      </div>
    </div>
  );
};

export default Settings;
