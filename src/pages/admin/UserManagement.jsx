import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Users, Eye, EyeOff } from 'lucide-react';
import { createUser, getUsers, deleteUser } from '../../api/index';

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
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>User Management</h1>
          <p style={{ marginTop: '6px' }}>
            Create and manage login credentials for all ERP roles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 16px',
            border: 0,
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} style={{ verticalAlign: 'middle' }} /> Add User
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            marginBottom: '24px'
          }}
        >
          <h2>Create User Credential</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '14px'
            }}
          >
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <input
              name="email"
              type="email"
              placeholder="Email / Username"
              value={form.email}
              onChange={handleChange}
              required
            />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Login Password"
                value={form.password}
                onChange={handleChange}
                required
                style={{ width: '100%', paddingRight: '40px' }}
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

            <input
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
            />

            <input
              name="department"
              placeholder="Department"
              value={form.department}
              onChange={handleChange}
            />

            <input
              name="referenceId"
              placeholder="Reference ID / Employee ID / Student ID"
              value={form.referenceId}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginTop: '18px' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Credential'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              style={{ marginLeft: '10px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ marginBottom: '18px' }}>
        <Search size={18} style={{ verticalAlign: 'middle' }} />

        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: '8px', padding: '8px', width: '300px' }}
        />
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Reference ID</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.department || '-'}</td>
                <td>{user.referenceId || '-'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleDelete(user._id)}
                    title="Delete user"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                  <Users size={30} />
                  <div>No users found.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
