import React, { useState, useEffect } from 'react';
import { 
  Settings, Building2, Shield, Bell, CreditCard, Clock, Save, Server
} from 'lucide-react';
import { getSuperAdminSettings, updateSuperAdminSettings } from '../../api';

const SuperAdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    platformName: 'FIC ERP SaaS',
    supportEmail: 'support@erpsaas.com',
    supportPhone: '+91 98765 43210',
    maintenanceMode: false,
    
    trialDurationDays: 14,
    maxTrialStudents: 500,
    maxTrialHods: 15,
    enableTrial: true,

    starterPrice: 599,
    premiumPrice: 699,
    elitePrice: 999,
    enablePlans: true,

    razorpayKeyId: 'rzp_test_XXXXXXXXXXXXXX',
    razorpaySecret: 'XXXXXXXXXXXXXXXXXXXXXXXX',
    currency: 'INR',
    autoRenewal: true,

    emailNotifications: true,
    smsNotifications: true,
    trialExpiryReminders: true,
    renewalReminders: true,

    passwordPolicy: 'Strong (8+ chars, 1 Special)',
    sessionTimeoutMins: 60,
    twoFactorAuth: false,
    loginLimit: 5
  });

  useEffect(() => {
    // In a real app, fetch from backend:
    // fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      // await updateSuperAdminSettings(settings);
      // Fake network delay
      await new Promise(r => setTimeout(r, 600));
      alert('Platform settings saved successfully.');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'trial', label: 'Trial Limits', icon: Clock },
    { id: 'subscription', label: 'Pricing', icon: Server },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { id: 'notification', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Platform Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure global ERP SaaS parameters, trials, and payment gateways.</p>
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '10px 20px', borderRadius: '8px', border: 'none', 
            background: 'var(--primary)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
            opacity: loading ? 0.7 : 1
          }}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Sidebar Tabs */}
        <div style={{ width: '250px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', flexShrink: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                background: activeTab === tab.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: activeTab === tab.id ? '#3b82f6' : 'var(--text-main)',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: activeTab === tab.id ? 600 : 500,
                transition: 'background 0.2s'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '32px' }}>
          
          {activeTab === 'general' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '24px' }}>General Configuration</h2>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Platform Name</label>
                  <input type="text" name="platformName" value={settings.platformName} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Support Email</label>
                  <input type="email" name="supportEmail" value={settings.supportEmail} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Support Phone Number</label>
                  <input type="text" name="supportPhone" value={settings.supportPhone} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <input type="checkbox" name="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Enable Maintenance Mode</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trial' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '24px' }}>Trial Settings</h2>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Trial Duration (Days)</label>
                  <input type="number" name="trialDurationDays" value={settings.trialDurationDays} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Max Students Allowed in Trial</label>
                  <input type="number" name="maxTrialStudents" value={settings.maxTrialStudents} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Max HODs Allowed in Trial</label>
                  <input type="number" name="maxTrialHods" value={settings.maxTrialHods} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <input type="checkbox" name="enableTrial" checked={settings.enableTrial} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Enable Open Trial Registration</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '24px' }}>Subscription Pricing</h2>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Starter Plan Price (₹)</label>
                  <input type="number" name="starterPrice" value={settings.starterPrice} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Premium Plan Price (₹)</label>
                  <input type="number" name="premiumPrice" value={settings.premiumPrice} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Elite Plan Price (₹)</label>
                  <input type="number" name="elitePrice" value={settings.elitePrice} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <input type="checkbox" name="enablePlans" checked={settings.enablePlans} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Enable Subscription Upgrades</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '24px' }}>Payment Gateway Configuration</h2>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Razorpay Key ID</label>
                  <input type="text" name="razorpayKeyId" value={settings.razorpayKeyId} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Razorpay Secret Key</label>
                  <input type="password" name="razorpaySecret" value={settings.razorpaySecret} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Currency</label>
                  <select name="currency" value={settings.currency} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <input type="checkbox" name="autoRenewal" checked={settings.autoRenewal} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Enable Auto-Renewal Invoicing</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notification' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '24px' }}>Global Notification Settings</h2>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" name="emailNotifications" checked={settings.emailNotifications} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Enable Email Notifications</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" name="smsNotifications" checked={settings.smsNotifications} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Enable SMS Notifications</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" name="trialExpiryReminders" checked={settings.trialExpiryReminders} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Send Trial Expiry Reminders (7 Days Before)</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" name="renewalReminders" checked={settings.renewalReminders} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Send Subscription Renewal Reminders</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '24px' }}>Security Policies</h2>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Password Policy</label>
                  <select name="passwordPolicy" value={settings.passwordPolicy} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}>
                    <option value="Basic">Basic (6+ chars)</option>
                    <option value="Strong (8+ chars, 1 Special)">Strong (8+ chars, 1 Special)</option>
                    <option value="Strict">Strict (12+ chars, Alphanumeric)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Session Timeout (Minutes)</label>
                  <input type="number" name="sessionTimeoutMins" value={settings.sessionTimeoutMins} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Login Attempt Limit</label>
                  <input type="number" name="loginLimit" value={settings.loginLimit} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <input type="checkbox" name="twoFactorAuth" checked={settings.twoFactorAuth} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Require Two-Factor Authentication (2FA) for Admins</label>
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
