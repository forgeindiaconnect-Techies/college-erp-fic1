import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Users, Eye, EyeOff } from 'lucide-react';
import { createUser, getUsers, deleteUser } from '../../api/index';
import './UserManagementCommon.css';

const ROLES = [
  'Accounts',
  'Principal',
  'HOD',
  'Staff',
  'Student',
  'Parent',
  'Hostel',
  'Driver',
  'Watchman'
];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'Staff',
  department: '',
  referenceId: ''
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert('Please enter the user name.');
      return;
    }

    if (!form.email.trim()) {
      alert('Please enter the email.');
      return;
    }

    if (!form.password.trim()) {
      alert('Please enter the password.');
      return;
    }

    try {
      setLoading(true);

      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        role: form.role,
        department: form.department.trim(),
        referenceId: form.referenceId.trim()
      });

      alert(`${form.role} user created successfully.`);

      setForm(EMPTY_FORM);
      setShowPassword(false);
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      console.error('Create user failed:', err);
      alert(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create user.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(id);
      await loadUsers();
    } catch (err) {
      console.error('Delete user failed:', err);
      alert(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete user.'
      );
    }
  };

  const filteredUsers = users.filter((user) => {
    const text = `${user.name || ''} ${user.email || ''} ${user.role || ''} ${user.department || ''}`;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="management-page animate-fade-in">
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #3730a5, #4f46e5, #06b6d4)' }}></div>
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <h1>User Management</h1>
            <p>Create and manage login credentials for all institution ERP roles.</p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #3730a5, #4f46e5)',
                color: '#ffffff',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(55, 48, 165, 0.25)'
              }}
            >
              <Plus size={16} /> {showForm ? 'Close Form' : 'Add User'}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="mgmt-table-card animate-fade-in" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: 800 }}>Create User Credential</h2>

          <form onSubmit={handleCreate}>
            <div className="mgmt-form-grid" style={{ gap: '1rem' }}>
              <div className="mgmt-form-field">
                <label>Full Name *</label>
                <input
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="mgmt-form-input"
                />
              </div>

              <div className="mgmt-form-field">
                <label>Role Scope *</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="mgmt-form-input"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mgmt-form-field">
                <label>Email Address / Username *</label>
                <input
                  name="email"
                  type="email"
                  placeholder="Email / Username"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="mgmt-form-input"
                />
              </div>

              <div className="mgmt-form-field">
                <label>Login Password *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Login Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="mgmt-form-input"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mgmt-form-field">
                <label>Phone Number</label>
                <input
                  name="phone"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={handleChange}
                  className="mgmt-form-input"
                />
              </div>

              <div className="mgmt-form-field">
                <label>Department</label>
                <input
                  name="department"
                  placeholder="Department"
                  value={form.department}
                  onChange={handleChange}
                  className="mgmt-form-input"
                />
              </div>

              <div className="mgmt-form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Reference ID / Roll / Employee ID</label>
                <input
                  name="referenceId"
                  placeholder="Reference ID / Employee ID / Student ID"
                  value={form.referenceId}
                  onChange={handleChange}
                  className="mgmt-form-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  padding: '0.65rem 1.35rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3730a5, #4f46e5)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Creating...' : 'Create Credential'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table Card & Search ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div className="mgmt-search-box">
            <Search size={16} className="text-muted" />
            <input
              placeholder="Search users by name, email, role, or dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mgmt-search-input"
            />
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
            Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> Users
          </span>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Reference ID</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.department || '-'}</td>
                  <td><code style={{ fontSize: '0.8rem' }}>{user.referenceId || '-'}</code></td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(user._id)}
                      title="Delete user"
                      style={{
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.06)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600 }}>No users found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
