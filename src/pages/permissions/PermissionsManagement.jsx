import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, ShieldCheck, Mail, ShieldAlert, Key, Award, Users, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/index';
import './PermissionsManagement.css';

const ROLES = ['Admin', 'Principal', 'HOD', 'Staff', 'Student', 'Parent', 'Accounts'];
const DEPARTMENTS = [
  'Computer Science', 'Electronics & Comm.', 'Electrical & Electronics', 'Mechanical Engg.', 'Bachelor of Computer App.', 'Master of Business Admin.', 'Civil Engg.', 'Information Tech.'
];

const PermissionsManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Student', department: '', referenceId: '' });
  const [successFlash, setSuccessFlash] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res?.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      // Fallback
      setUsers([
        { _id: 'u1', name: 'System Admin', email: 'admin@college.edu', role: 'Admin', department: 'All', referenceId: 'ADM001' },
        { _id: 'u2', name: 'Dr. Suresh Kumar', email: 'principal@college.edu', role: 'Principal', department: 'All', referenceId: 'PRN001' },
        { _id: 'u3', name: 'CSE HOD', email: 'csehod@gmail.com', role: 'HOD', department: 'Computer Science', referenceId: 'STF001' },
        { _id: 'u4', name: 'Dr. Ananya Rao', email: 'ananya@college.edu', role: 'Staff', department: 'Computer Science', referenceId: 'STF003' },
        { _id: 'u5', name: 'John Doe', email: 'john@college.edu', role: 'Student', department: 'Computer Science', referenceId: 'CS2022001' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({ name: '', email: '', password: 'password123', role: 'Student', department: 'Computer Science', referenceId: '' });
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, department: u.department || 'Computer Science', referenceId: u.referenceId || '' });
    setEditTarget(u._id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editTarget) {
        // Edit flow
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
          department: form.department,
          referenceId: form.referenceId
        };
        if (form.password) payload.password = form.password;
        
        await updateUser(editTarget, payload);
        setUsers(prev => prev.map(u => u._id === editTarget ? { ...u, ...payload } : u));
      } else {
        // Add flow
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          department: form.department,
          referenceId: form.referenceId
        };
        const res = await createUser(payload);
        setUsers(prev => [...prev, res.data]);
      }
      setSuccessFlash(true);
      setTimeout(() => {
        setSuccessFlash(false);
        closeModal();
      }, 700);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error occurred while saving user.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you absolutely sure you want to delete this user login account? This will block their system access.')) {
      try {
        await deleteUser(id);
        setUsers(prev => prev.filter(u => u._id !== id));
      } catch (err) {
        console.error(err);
        alert('Failed to delete user.');
      }
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.referenceId && u.referenceId.toLowerCase().includes(q));
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="permissions-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>User Roles & Permissions Registry</h1>
          <p className="text-muted">Global ERP Credentials Registry. Control user access parameters, roles, and scope permissions dynamically.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Register Login Account</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Credentials</span>
          <span className="sm-summary-value">{users.length} Users</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Super Administrators</span>
          <span className="sm-summary-value text-danger">
            {users.filter(u => u.role === 'Admin').length} Account(s)
          </span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Department Heads</span>
          <span className="sm-summary-value text-success">
            {users.filter(u => u.role === 'HOD').length} Active HODs
          </span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by user name, login email, or reference ID..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="All">All Roles</option>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>System Username</th>
                <th>Login Email Address</th>
                <th>Role Designation</th>
                <th>Department Scope</th>
                <th>Reference ID</th>
                <th>Access clearance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No system credentials found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user._id}>
                    <td className="font-semibold">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} className="text-primary" />
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td><span className="text-sm font-semibold text-muted">{user.email}</span></td>
                    <td>
                      <span className={`role-badge ${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td><span className="text-sm">{user.department || 'All (Global View)'}</span></td>
                    <td><span className="badge-outline font-semibold" style={{ fontSize: '0.75rem' }}>{user.referenceId || '—'}</span></td>
                    <td>
                      <span className={`status-pill ${user.role === 'Admin' ? 'approved' : 'pending'}`}>
                        {user.role === 'Admin' ? 'Unrestricted' : 'Scoped Scope'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => openEdit(user)}><Edit2 size={15} /></button>
                        <button className="btn-icon btn-icon-danger" disabled={user.email === 'admin@college.edu'} onClick={() => handleDelete(user._id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Security Role / Clearance' : 'Register Login Credentials'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>

            {successFlash && (
              <div className="modal-success-flash" style={{ margin: '1rem' }}>
                <CheckCircle size={18} /> Credentials saved successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label><Users size={13} style={{ display: 'inline', marginRight: '4px' }} /> User Display Name *</label>
                  <input required placeholder="e.g. Dr. Rajesh Sen" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                
                <div className="form-group">
                  <label><Mail size={13} style={{ display: 'inline', marginRight: '4px' }} /> Login Email Address *</label>
                  <input type="email" required placeholder="rajesh@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>

                <div className="form-group">
                  <label><Key size={13} style={{ display: 'inline', marginRight: '4px' }} /> Account Password {editTarget && '(Leave blank to retain)'}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder={editTarget ? '••••••••' : 'Enter login password'} 
                      value={form.password} 
                      onChange={e => setForm({ ...form, password: e.target.value })} 
                      style={{ paddingRight: '40px', width: '100%' }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label><ShieldAlert size={13} style={{ display: 'inline', marginRight: '4px' }} /> Security Role *</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department Scope Assignment</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="">All (Global Access / Principal / Accounts)</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label><Award size={13} style={{ display: 'inline', marginRight: '4px' }} /> System Reference ID (Student Roll / Staff Code)</label>
                  <input placeholder="e.g. STF007 or CS2022001" value={form.referenceId} onChange={e => setForm({ ...form, referenceId: e.target.value })} />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsManagement;
