import React, { useState } from 'react';
import {
  ShieldCheck, Users, Key, Activity, Settings, 
  Mail, Database, AlertTriangle, Save, RefreshCw, Smartphone
} from 'lucide-react';
import { getSettings, updateSettings, getLoginLogs } from '../../api/index';
import { SettingsContext } from '../../App';
import './SettingsSecurity.css';

const Toggle = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="toggle-slider"></span>
  </label>
);

const SettingsSecurity = () => {
  const [activeTab, setActiveTab] = useState('Security Control');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setCollegeSettings } = React.useContext(SettingsContext);
  
  const [settings, setSettings] = useState({
    twoFactorAdmin: true,
    twoFactorAll: false,
    forcePasswordReset: true,
    lockoutPolicy: true,
    maintenanceMode: false,
    debugMode: false,
    emailNotifications: true,
    smsNotifications: true,
    academicYear: '2025-2026',
    currency: 'INR (₹)',
    collegeName: '',
    timezone: 'Asia/Kolkata (IST)',
    collegeLogo: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#3b82f6',
    attendanceEnabled: true,
    hostelEnabled: true,
    transportEnabled: true,
    libraryEnabled: true,
    placementEnabled: true,
    examEnabled: true
  });

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        getSettings(),
        getLoginLogs()
      ]);
      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
      setLogs(logsRes.data);
    } catch (error) {
      console.error('Failed to load settings data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await updateSettings(settings);
      
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
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const TABS = [
    { name: 'Role Permissions', icon: <Users size={16} /> },
    { name: 'Login Activity', icon: <Activity size={16} /> },
    { name: 'System Config', icon: <Settings size={16} /> },
    { name: 'Branding & Theme', icon: <Settings size={16} /> }
  ];

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header flex justify-between items-end">
        <div>
          <h1><ShieldCheck size={32} className="text-red-500" /> Settings & Security</h1>
          <p className="text-muted mt-2">Manage global system configurations, role access, and security protocols.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
          <Save size={16}/> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      <div className="settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab.name}
            className={`settings-tab ${activeTab === tab.name ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon} {tab.name}
          </button>
        ))}
      </div>

      <div className="glass-card">
        
        {activeTab === 'Security Control' && (
          <div className="animate-fade-in">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold mb-1">Authentication & Access</h2>
              <p className="text-sm text-muted">Configure how users log in and secure their accounts.</p>
            </div>
            
            <div className="setting-row">
              <div className="setting-info">
                <h4>Two-Factor Authentication (Admins)</h4>
                <p>Require OTP via email/authenticator for Admin and Sub-Admin logins.</p>
              </div>
              <Toggle checked={settings.twoFactorAdmin} onChange={() => handleToggle('twoFactorAdmin')} />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Force 2FA for All Users</h4>
                <p>Enforce 2FA for HODs, Staff, and Students. (May cause login friction)</p>
              </div>
              <Toggle checked={settings.twoFactorAll} onChange={() => handleToggle('twoFactorAll')} />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>90-Day Password Reset Policy</h4>
                <p>Force users to change their password every 90 days for security compliance.</p>
              </div>
              <Toggle checked={settings.forcePasswordReset} onChange={() => handleToggle('forcePasswordReset')} />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Brute Force Lockout</h4>
                <p>Lock account for 30 minutes after 5 consecutive failed login attempts.</p>
              </div>
              <Toggle checked={settings.lockoutPolicy} onChange={() => handleToggle('lockoutPolicy')} />
            </div>
          </div>
        )}

        {activeTab === 'Login Activity' && (
          <div className="animate-fade-in">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-1">Authentication Logs</h2>
                <p className="text-sm text-muted">Track all successful and failed login attempts across the ERP.</p>
              </div>
              <button className="btn-secondary flex items-center gap-2" onClick={fetchData}><RefreshCw size={14}/> Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User / Email</th>
                    <th>Role</th>
                    <th>IP Address</th>
                    <th>Device / Browser</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id || log.id}>
                      <td className="font-bold">{log.user}</td>
                      <td><span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-bold">{log.role}</span></td>
                      <td className="font-mono text-sm">{log.ip}</td>
                      <td className="text-sm text-muted">{log.browser}</td>
                      <td className="text-sm">{log.time}</td>
                      <td>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'System Config' && (
          <div className="animate-fade-in p-6">
            <h2 className="text-xl font-bold mb-6">Global ERP Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="form-group">
                <label className="text-sm font-bold block mb-2">Current Academic Year</label>
                <select name="academicYear" value={settings.academicYear || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <option>2025-2026</option>
                  <option>2026-2027</option>
                </select>
              </div>
              <div className="form-group">
                <label className="text-sm font-bold block mb-2">Default Currency</label>
                <select name="currency" value={settings.currency || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="text-sm font-bold block mb-2">Institution Name</label>
                <input type="text" name="collegeName" value={settings.collegeName || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
              </div>
              <div className="form-group">
                <label className="text-sm font-bold block mb-2">Timezone</label>
                <select name="timezone" value={settings.timezone || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <option>Asia/Kolkata (IST)</option>
                  <option>UTC</option>
                </select>
              </div>
            </div>

            <div className="setting-row px-0">
              <div className="setting-info">
                <h4>Maintenance Mode</h4>
                <p>Prevent all non-admin users from logging in while system updates are performed.</p>
              </div>
              <Toggle checked={settings.maintenanceMode} onChange={() => handleToggle('maintenanceMode')} />
            </div>
          </div>
        )}

        {activeTab === 'Branding & Theme' && (
          <div className="animate-fade-in p-6">
            <h2 className="text-xl font-bold mb-6">Appearance & Branding</h2>
            
            <div className="form-group mb-6">
              <label className="text-sm font-bold block mb-2">College Logo URL</label>
              <input type="text" name="collegeLogo" placeholder="https://example.com/logo.png" value={settings.collegeLogo || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
              {settings.collegeLogo && (
                <div style={{ marginTop: '10px' }}>
                  <img src={settings.collegeLogo} alt="Logo Preview" style={{ height: '40px', objectFit: 'contain' }} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="form-group">
                <label className="text-sm font-bold block mb-2">Primary Theme Color</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="color" name="primaryColor" value={settings.primaryColor || '#4f46e5'} onChange={handleChange} style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px' }} />
                  <input type="text" name="primaryColor" value={settings.primaryColor || '#4f46e5'} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                </div>
              </div>
              <div className="form-group">
                <label className="text-sm font-bold block mb-2">Secondary Theme Color</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="color" name="secondaryColor" value={settings.secondaryColor || '#3b82f6'} onChange={handleChange} style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px' }} />
                  <input type="text" name="secondaryColor" value={settings.secondaryColor || '#3b82f6'} onChange={handleChange} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Module Config' && (
          <div className="animate-fade-in p-6">
            <h2 className="text-xl font-bold mb-6">Module Configuration</h2>
            <p className="text-sm text-muted mb-6">Enable or disable core ERP modules. Disabled modules will be hidden from all sidebars.</p>

            <div className="setting-row px-0">
              <div className="setting-info">
                <h4>Attendance Module</h4>
                <p>Enable daily attendance tracking for students and staff.</p>
              </div>
              <Toggle checked={settings.attendanceEnabled} onChange={() => handleToggle('attendanceEnabled')} />
            </div>

            <div className="setting-row px-0">
              <div className="setting-info">
                <h4>Hostel Module</h4>
                <p>Enable hostel allocations and complaints management.</p>
              </div>
              <Toggle checked={settings.hostelEnabled} onChange={() => handleToggle('hostelEnabled')} />
            </div>

            <div className="setting-row px-0">
              <div className="setting-info">
                <h4>Transport Module</h4>
                <p>Enable bus route tracking and driver management.</p>
              </div>
              <Toggle checked={settings.transportEnabled} onChange={() => handleToggle('transportEnabled')} />
            </div>

            <div className="setting-row px-0">
              <div className="setting-info">
                <h4>Library Module</h4>
                <p>Enable book cataloging and issue/return tracking.</p>
              </div>
              <Toggle checked={settings.libraryEnabled} onChange={() => handleToggle('libraryEnabled')} />
            </div>

            <div className="setting-row px-0">
              <div className="setting-info">
                <h4>Placement Module</h4>
                <p>Enable campus recruitment tracking and applications.</p>
              </div>
              <Toggle checked={settings.placementEnabled} onChange={() => handleToggle('placementEnabled')} />
            </div>

            <div className="setting-row px-0">
              <div className="setting-info">
                <h4>Exam Module</h4>
                <p>Enable exam scheduling and result publishing.</p>
              </div>
              <Toggle checked={settings.examEnabled} onChange={() => handleToggle('examEnabled')} />
            </div>
          </div>
        )}

        {activeTab === 'Backup & Restore' && (
          <div className="animate-fade-in p-6">
            <h2 className="text-xl font-bold mb-2">Database Backup Management</h2>
            <p className="text-muted text-sm mb-6">Create manual snapshots of the MongoDB database or configure automated daily backups.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
                <Database size={32} className="text-blue-500 mb-4" />
                <h3 className="font-bold text-lg mb-2">Manual Backup</h3>
                <p className="text-sm text-muted mb-4">Generate a full encrypted snapshot of the current ERP state.</p>
                <button className="btn-primary w-full flex justify-center items-center gap-2">Generate Backup Now</button>
              </div>
              
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
                <RefreshCw size={32} className="text-green-500 mb-4" />
                <h3 className="font-bold text-lg mb-2">Restore Checkpoint</h3>
                <p className="text-sm text-muted mb-4">Restore the database from a previous automated daily snapshot.</p>
                <select className="w-full p-2 mb-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm">
                  <option>Auto-Backup (2026-05-25 00:00)</option>
                  <option>Auto-Backup (2026-05-24 00:00)</option>
                </select>
                <button className="btn-secondary w-full">Initiate Restore</button>
              </div>
            </div>

            <div className="danger-zone">
              <h3><AlertTriangle size={20} /> Danger Zone</h3>
              <p className="text-sm mb-4">The following actions are destructive and cannot be undone. Please proceed with extreme caution.</p>
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-sm transition-colors">Factory Reset ERP</button>
                <button className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded font-bold text-sm transition-colors">Clear Activity Logs</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Role Permissions' && (
          <div className="animate-fade-in p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Role Matrix Configuration</h2>
                <p className="text-sm text-muted">Quick overview of role capabilities. For detailed configuration, visit the main Permissions module.</p>
              </div>
              <a href="/admin/permissions" className="btn-secondary">Advanced Permissions</a>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Sub-Admin</th>
                    <th>Principal</th>
                    <th>HOD</th>
                    <th>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold">Student Records</td>
                    <td><span className="text-green-500 font-bold">View/Edit</span></td>
                    <td><span className="text-blue-500 font-bold">View Only</span></td>
                    <td><span className="text-blue-500 font-bold">View Only</span></td>
                    <td><span className="text-muted">No Access</span></td>
                  </tr>
                  <tr>
                    <td className="font-bold">Fee Management</td>
                    <td><span className="text-muted">No Access</span></td>
                    <td><span className="text-blue-500 font-bold">View Only</span></td>
                    <td><span className="text-muted">No Access</span></td>
                    <td><span className="text-muted">No Access</span></td>
                  </tr>
                  <tr>
                    <td className="font-bold">Attendance</td>
                    <td><span className="text-green-500 font-bold">View/Edit</span></td>
                    <td><span className="text-blue-500 font-bold">View Only</span></td>
                    <td><span className="text-green-500 font-bold">View/Edit</span></td>
                    <td><span className="text-green-500 font-bold">View/Edit</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Communications' && (
          <div className="animate-fade-in p-6">
            <h2 className="text-xl font-bold mb-2">Notification & Alert Rules</h2>
            <p className="text-muted text-sm mb-6">Control global communication channels for automated ERP alerts.</p>
            
            <div className="setting-row">
              <div className="setting-info">
                <h4><Mail size={14} className="inline mr-2 text-primary" />Email Broadcasting</h4>
                <p>Send fee reminders, result declarations, and absence alerts to registered emails.</p>
              </div>
              <Toggle checked={settings.emailNotifications} onChange={() => handleToggle('emailNotifications')} />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4><Smartphone size={14} className="inline mr-2 text-success" />SMS Gateway Integration</h4>
                <p>Dispatch critical low-attendance and pending-fee warnings via SMS.</p>
              </div>
              <Toggle checked={settings.smsNotifications} onChange={() => handleToggle('smsNotifications')} />
            </div>
          </div>
        )}

        {activeTab === 'Data Privacy' && (
          <div className="animate-fade-in p-6">
            <h2 className="text-xl font-bold mb-2">Privacy & Compliance</h2>
            <p className="text-muted text-sm mb-6">Manage data retention policies and user privacy settings.</p>
            
            <div className="setting-row">
              <div className="setting-info">
                <h4>Student Data Masking</h4>
                <p>Mask sensitive student information (like phone numbers) from staff members.</p>
              </div>
              <Toggle checked={true} onChange={() => {}} />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Auto-Delete Alumni Logs</h4>
                <p>Automatically purge activity logs of graduated students after 1 year.</p>
              </div>
              <Toggle checked={false} onChange={() => {}} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsSecurity;
