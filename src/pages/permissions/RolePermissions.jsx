import React, { useState } from 'react';
import { Shield, Save, Check, ShieldAlert, Key, Users, Lock, Unlock, Database } from 'lucide-react';
import './RolePermissions.css';

const ROLES = ['Admin', 'Sub Admin', 'Principal', 'HOD', 'Staff', 'Student', 'Parent'];

const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'departments', name: 'Departments' },
  { id: 'students', name: 'Students' },
  { id: 'staff', name: 'Staff' },
  { id: 'attendance', name: 'Attendance' },
  { id: 'exams', name: 'Exams' },
  { id: 'results', name: 'Results' },
  { id: 'fees', name: 'Fees' },
  { id: 'reports', name: 'Reports' },
  { id: 'announcements', name: 'Announcements' },
  { id: 'settings', name: 'Settings' },
  { id: 'activity_logs', name: 'Activity Logs' }
];

// Initial mock state for matrix
const INITIAL_PERMISSIONS = {
  Admin: Object.fromEntries(MODULES.map(m => [m.id, 'Full access'])),
  'Sub Admin': { ...Object.fromEntries(MODULES.map(m => [m.id, 'Limited access'])), settings: 'No access', activity_logs: 'Limited access' },
  Principal: { ...Object.fromEntries(MODULES.map(m => [m.id, 'View all'])), settings: 'No access', activity_logs: 'View all' },
  HOD: { ...Object.fromEntries(MODULES.map(m => [m.id, 'Department only'])), settings: 'No access' },
  Staff: { ...Object.fromEntries(MODULES.map(m => [m.id, 'No access'])), dashboard: 'Full access', students: 'Class only', attendance: 'Class only', exams: 'Class only', results: 'Class only', announcements: 'View all' },
  Student: { ...Object.fromEntries(MODULES.map(m => [m.id, 'No access'])), dashboard: 'Full access', attendance: 'Own profile only', results: 'Own profile only', fees: 'Own profile only', announcements: 'View all' },
  Parent: { ...Object.fromEntries(MODULES.map(m => [m.id, 'No access'])), dashboard: 'Full access', attendance: 'Own child only', results: 'Own child only', fees: 'Own child only', announcements: 'View all' }
};

const PERMISSION_LEVELS = ['Full access', 'Limited access', 'View all', 'Department only', 'Class only', 'Own profile only', 'Own child only', 'No access'];

const RolePermissions = () => {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' or 'matrix'
  const [selectedRole, setSelectedRole] = useState('Sub Admin');
  const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
  const [saved, setSaved] = useState(false);

  const handlePermissionChange = (role, modId, level) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [modId]: level
      }
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="role-permissions-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Role Permission Manager</h1>
          <p className="text-muted">Configure and lock down system access levels across all user roles.</p>
        </div>
        <div className="flex gap-3">
          <button className={`btn-ghost ${activeTab === 'matrix' ? 'active-tab' : ''}`} onClick={() => setActiveTab('matrix')}>Matrix Overview</button>
          <button className={`btn-ghost ${activeTab === 'editor' ? 'active-tab' : ''}`} onClick={() => setActiveTab('editor')}>Role Editor</button>
        </div>
      </div>

      {activeTab === 'editor' && (
        <div className="role-editor-container">
          <div className="role-sidebar glass-card">
            <h3 className="role-sidebar-title"><Users size={16} /> Select User Role</h3>
            <ul className="role-list">
              {ROLES.map(r => (
                <li 
                  key={r} 
                  className={`role-item ${selectedRole === r ? 'active' : ''}`}
                  onClick={() => setSelectedRole(r)}
                >
                  <Shield size={16} />
                  <span>{r}</span>
                  {r === 'Admin' && <Lock size={14} className="text-muted ml-auto" />}
                </li>
              ))}
            </ul>
          </div>

          <div className="role-content glass-card">
            <div className="role-content-header">
              <div>
                <h2>{selectedRole} Permissions</h2>
                <p className="text-muted text-sm">Enable or disable access to specific modules for this role.</p>
              </div>
              <button 
                className={`btn-primary shadow-glow ${saved ? 'bg-success border-success' : ''}`} 
                onClick={handleSave}
                disabled={selectedRole === 'Admin'}
              >
                {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save Permissions</>}
              </button>
            </div>

            {selectedRole === 'Admin' && (
              <div className="admin-lock-banner">
                <ShieldAlert size={20} />
                <div>
                  <strong>System Administrator (Super Admin)</strong>
                  <p>This role has immutable full access to all system modules and cannot be restricted.</p>
                </div>
              </div>
            )}

            <div className="permissions-grid">
              {MODULES.map(mod => (
                <div key={mod.id} className="permission-row">
                  <div className="perm-info">
                    <Database size={15} className="text-primary" />
                    <span className="font-semibold">{mod.name}</span>
                  </div>
                  <div className="perm-control">
                    <select 
                      value={permissions[selectedRole][mod.id] || 'No access'} 
                      onChange={(e) => handlePermissionChange(selectedRole, mod.id, e.target.value)}
                      disabled={selectedRole === 'Admin'}
                      className={`perm-select ${permissions[selectedRole][mod.id] === 'No access' ? 'no-access' : 'has-access'}`}
                    >
                      {PERMISSION_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
          <div className="table-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="sticky-col">Module</th>
                  {ROLES.map(r => <th key={r}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(mod => (
                  <tr key={mod.id}>
                    <td className="sticky-col font-semibold">
                      <div className="flex items-center gap-2">
                        <Key size={14} className="text-muted" />
                        {mod.name}
                      </div>
                    </td>
                    {ROLES.map(r => {
                      const level = permissions[r][mod.id] || 'No access';
                      const isNoAccess = level === 'No access';
                      return (
                        <td key={r}>
                          <span className={`matrix-badge ${isNoAccess ? 'disabled' : 'enabled'}`}>
                            {level}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default RolePermissions;
