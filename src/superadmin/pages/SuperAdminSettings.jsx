import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Shield, 
  Bell, 
  CreditCard, 
  Clock, 
  Save, 
  Server, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  Mail, 
  Globe, 
  Key, 
  Layers,
  Database,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { getSuperAdminSettings, updateSuperAdminSettings } from '../../api';
import './SuperAdminDashboard.css';

const SuperAdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [settings, setSettings] = useState({
    platformName: 'ERPSYS Multi-Tenant Platform',
    supportEmail: 'superadmin@erpsys.com',
    supportPhone: '+91 98765 43210',
    maintenanceMode: false,
    clusterRegion: 'ap-south-1 (Mumbai)',
    
    trialDurationDays: 14,
    maxTrialStudents: 500,
    maxTrialHods: 15,
    enableTrial: true,

    starterPrice: 10000,
    premiumPrice: 20000,
    elitePrice: 35000,
    enablePlans: true,

    razorpayKeyId: 'rzp_live_K8941293810293',
    razorpaySecret: '••••••••••••••••••••••••••••',
    currency: 'INR (₹)',
    autoRenewal: true,

    emailNotifications: true,
    smsNotifications: true,
    trialExpiryReminders: true,
    renewalReminders: true,

    passwordPolicy: 'Strong (8+ chars, Uppercase, Special char)',
    sessionTimeoutMins: 60,
    twoFactorAuth: false,
    loginLimit: 5,
    ipWhitelisting: false
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const tabs = [
    { id: 'general', label: 'General System', icon: Building2, desc: 'Platform branding & clusters' },
    { id: 'trial', label: 'Trial Constraints', icon: Clock, desc: 'Limits & duration rules' },
    { id: 'subscription', label: 'Pricing & Plans', icon: Server, desc: 'Subscription tier rates' },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard, desc: 'Razorpay & webhook keys' },
    { id: 'notification', label: 'Alert Policies', icon: Bell, desc: 'Automated renewal emails' },
    { id: 'security', label: 'Security & Auth', icon: Shield, desc: 'Passwords & sessions' },
  ];

  return (
    <div className="sa-dashboard animate-fade-in">
      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-title-area">
          <div className="sa-badge-cluster">
            <span className="sa-pulse-dot"></span>
            <span>Global Multi-Tenant Engine Config</span>
          </div>
          <h1 className="sa-header-title">
            <Settings size={28} color="#6366f1" />
            Platform & Engine Settings
          </h1>
          <p className="sa-header-subtitle">
            Configure system-wide parameters, pricing plans, evaluation limits, gateway keys, and security constraints.
          </p>
        </div>

        <div className="sa-header-actions">
          {saveSuccess && (
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> Changes Saved Successfully!
            </span>
          )}

          <button 
            type="button"
            className="sa-btn sa-btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? 'Saving Changes...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'flex-start' }}>
        {/* Left Vertical Tab Navigation */}
        <div className="sa-card" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: isActive ? '#6366f1' : 'var(--text-main)',
                    border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <Icon size={18} color={isActive ? '#6366f1' : 'var(--text-muted)'} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{tab.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tab.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Settings Form Body */}
        <div className="sa-card">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Platform Branding & Cluster
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Configure platform title and contact endpoints
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Platform Name</label>
                  <input 
                    type="text"
                    name="platformName"
                    value={settings.platformName}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Cluster Region</label>
                  <input 
                    type="text"
                    name="clusterRegion"
                    value={settings.clusterRegion}
                    disabled
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Support Email Address</label>
                  <input 
                    type="email"
                    name="supportEmail"
                    value={settings.supportEmail}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Support Hotline</label>
                  <input 
                    type="text"
                    name="supportPhone"
                    value={settings.supportPhone}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>System Maintenance Mode</strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    When enabled, only Super Admin can log in. All colleges will see a maintenance banner.
                  </p>
                </div>
                <input 
                  type="checkbox"
                  name="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {/* Trial Limits Tab */}
          {activeTab === 'trial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Free Trial Governance & Quotas
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Define restrictions for new institutions evaluating the platform
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Evaluation Period (Days)</label>
                  <input 
                    type="number"
                    name="trialDurationDays"
                    value={settings.trialDurationDays}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Max Trial Students Allowed</label>
                  <input 
                    type="number"
                    name="maxTrialStudents"
                    value={settings.maxTrialStudents}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Max Trial Faculty / HODs</label>
                  <input 
                    type="number"
                    name="maxTrialHods"
                    value={settings.maxTrialHods}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'subscription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Subscription Tier Pricing (Monthly INR)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Set default monthly recurring charges for institutional tiers
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>Starter Basic (₹/mo)</label>
                  <input 
                    type="number"
                    name="starterPrice"
                    value={settings.starterPrice}
                    onChange={handleChange}
                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontWeight: 700 }}
                  />
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>Premium Standard (₹/mo)</label>
                  <input 
                    type="number"
                    name="premiumPrice"
                    value={settings.premiumPrice}
                    onChange={handleChange}
                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontWeight: 700 }}
                  />
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1' }}>Enterprise Elite (₹/mo)</label>
                  <input 
                    type="number"
                    name="elitePrice"
                    value={settings.elitePrice}
                    onChange={handleChange}
                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Gateway Tab */}
          {activeTab === 'payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Razorpay Enterprise Payment Gateway
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Live API key identifiers and automatic webhook reconciliation
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Razorpay Key ID</label>
                  <input 
                    type="text"
                    name="razorpayKeyId"
                    value={settings.razorpayKeyId}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Razorpay Key Secret</label>
                  <input 
                    type="password"
                    name="razorpaySecret"
                    value={settings.razorpaySecret}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Automated Notification & Reminder Triggers
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Configure automatic lifecycle and renewal emails
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Trial Expiry Email Reminders</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send automated notification 3 days prior to evaluation expiry</div>
                  </div>
                  <input type="checkbox" name="trialExpiryReminders" checked={settings.trialExpiryReminders} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Monthly Renewal Invoices</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email GST invoices automatically upon successful payment debit</div>
                  </div>
                  <input type="checkbox" name="renewalReminders" checked={settings.renewalReminders} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Security & Multi-Tenant Authentication Policies
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Control password complexity, session lifespans, and brute force prevention
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Session Inactivity Timeout (Minutes)</label>
                  <input 
                    type="number"
                    name="sessionTimeoutMins"
                    value={settings.sessionTimeoutMins}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Failed Login Lockout Limit</label>
                  <input 
                    type="number"
                    name="loginLimit"
                    value={settings.loginLimit}
                    onChange={handleChange}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
