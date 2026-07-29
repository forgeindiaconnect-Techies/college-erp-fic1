import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Heart, Mail, Phone, User, Link2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { getUsers, getStudents, createUser, updateUser, deleteUser } from '../../api/index';
import './ParentsManagement.css';

const ParentsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', parentOf: '', password: '' });
  const [formErrors, setFormErrors] = useState({});
  const [successFlash, setSuccessFlash] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      let parentUsers = [];
      try {
        const usersRes = await getUsers();
        const allUsers = usersRes?.data || [];
        parentUsers = allUsers.filter(u => u.role === 'Parent');
        setParents(parentUsers);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
      
      try {
        const studentsRes = await getStudents();
        setStudents(studentsRes?.data || []);
      } catch (err) {
        console.error('Failed to load students:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!editTarget && !form.password) e.password = 'Password is required';
    if (!form.parentOf) e.parentOf = 'Select linked student';
    return e;
  };

  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', parentOf: '', password: 'password123' });
    setEditTarget(null);
    setFormErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setForm({ name: p.name, email: p.email, phone: p.phone || '', parentOf: p.parentOf || '', password: '' });
    setEditTarget(p._id);
    setFormErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editTarget) {
        // Edit flow
        const payload = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          parentOf: form.parentOf,
          referenceId: form.parentOf
        };
        if (form.password) payload.password = form.password;
        
        await updateUser(editTarget, payload);
        setParents(prev => prev.map(p => p._id === editTarget ? { ...p, ...payload } : p));
      } else {
        // Create flow
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password || 'password123',
          role: 'Parent',
          parentOf: form.parentOf,
          referenceId: form.parentOf,
          phone: form.phone
        };
        const res = await createUser(payload);
        setParents(prev => [res.data, ...prev]);
      }
      setSuccessFlash(true);
      setTimeout(() => {
        setSuccessFlash(false);
        closeModal();
      }, 700);
    } catch (err) {
      console.error('Failed to save parent:', err);
      alert(err.response?.data?.message || err.message || 'Failed to save parent account.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this parent account? This will revoke their dashboard login.')) {
      try {
        await deleteUser(id);
        setParents(prev => prev.filter(p => p._id !== id));
      } catch (err) {
        console.error('Failed to delete parent user:', err);
        alert('Failed to delete parent account.');
      }
    }
  };

  // Bind student object to parent
  const getLinkedStudentName = (studentId) => {
    const s = students.find(stud => stud.id === studentId);
    return s ? `${s.name} (${s.id})` : studentId || 'Unassigned';
  };

  const getInitials = (n) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const BG_COLORS = ['#3b82f6', '#6366F1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'];

  const filtered = parents.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.parentOf && p.parentOf.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="parent-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Parent Management</h1>
          <p className="text-muted">Register and link parent accounts to student academic profiles for dashboard visibility.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Add Parent Account</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Parents</span>
          <span className="sm-summary-value">{parents.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Linked Students</span>
          <span className="sm-summary-value text-success">{new Set(parents.map(p => p.parentOf)).size}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Unlinked Profiles</span>
          <span className="sm-summary-value text-warning-c">0</span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by parent name, email or child ID..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Parent Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Linked Child</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No parent credentials found.
                  </td>
                </tr>
              ) : (
                filtered.map((parent, idx) => (
                  <tr key={parent._id}>
                    <td>
                      <div className="parent-avatar-badge">
                        <div className="parent-initials" style={{ backgroundColor: BG_COLORS[idx % BG_COLORS.length] }}>
                          {getInitials(parent.name)}
                        </div>
                        <span className="font-semibold">{parent.name}</span>
                      </div>
                    </td>
                    <td><span className="text-sm font-semibold">{parent.email}</span></td>
                    <td><span className="text-sm">{parent.phone || '—'}</span></td>
                    <td>
                      <span className="parent-student-link">
                        <Link2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {getLinkedStudentName(parent.parentOf)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" title="Edit Parent" onClick={() => openEdit(parent)}><Edit2 size={15} /></button>
                        <button className="btn-icon btn-icon-danger" title="Delete Account" onClick={() => handleDelete(parent._id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <div className="table-footer">Showing {filtered.length} of {parents.length} parent accounts</div>}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Parent Profile' : 'Register Parent'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            
            {successFlash && (
              <div className="modal-success-flash" style={{ margin: '1rem' }}>
                <CheckCircle size={18} /> Parent account updated successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label><User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Parent Full Name *</label>
                  <input 
                    required 
                    placeholder="e.g. Robert Smith" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                  />
                  {formErrors.name && <span className="text-danger text-xs">{formErrors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label><Mail size={13} style={{ display: 'inline', marginRight: '4px' }} /> Email Address *</label>
                  <input 
                    type="email"
                    required 
                    placeholder="parent@gmail.com" 
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                  />
                  {formErrors.email && <span className="text-danger text-xs">{formErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label><Phone size={13} style={{ display: 'inline', marginRight: '4px' }} /> Phone Number</label>
                  <input 
                    placeholder="e.g. 9845123456" 
                    value={form.phone} 
                    onChange={e => setForm({ ...form, phone: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label><Link2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Link to Student (Child) *</label>
                  <select 
                    required
                    value={form.parentOf} 
                    onChange={e => setForm({ ...form, parentOf: e.target.value })}
                  >
                    <option value="">— Select Student —</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id} - {s.dept})</option>
                    ))}
                  </select>
                  {formErrors.parentOf && <span className="text-danger text-xs">{formErrors.parentOf}</span>}
                </div>

                <div className="form-group">
                  <label>Login Password {editTarget && '(Leave empty to keep current)'}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder={editTarget ? '••••••••' : 'Enter login password'}
                      value={form.password} 
                      onChange={e => setForm({ ...form, password: e.target.value })} 
                      style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.password && <span className="text-danger text-xs">{formErrors.password}</span>}
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Save Changes' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentsManagement;
