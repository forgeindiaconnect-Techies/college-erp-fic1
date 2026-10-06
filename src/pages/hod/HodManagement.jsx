import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, GraduationCap, Mail, Phone, CheckCircle, Building, AlertTriangle, Users } from 'lucide-react';
import { getStaff, createStaff, updateStaff, deleteStaff, getDepartments, createUser } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import CustomSelect from '../../components/CustomSelect';
import './HodManagement.css';

const EMPTY_FORM = {
  id: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  dept: '',
  qualification: '',
  experience: '',
  joinDate: '',
  status: 'Active'
};

const HodManagement = () => {
  const [hods, setHods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [availableDepartments, setAvailableDepartments] = useState([]);

  useEffect(() => {
    fetchHods(true);
    fetchDepts();
  }, []);

  // Auto-refresh when staff data changes on another dashboard, guarded when modal is open
  useRealtimeSync(useCallback(() => { 
    if (!modalOpen) {
      fetchHods(false);
    }
  }, [modalOpen]), 'staff');

  const fetchDepts = async () => {
    try {
      const res = await getDepartments();
      if (res.data && res.data.length > 0) {
        setAvailableDepartments(res.data.map(d => ({ name: d.name, code: d.code })));
      } else {
        setAvailableDepartments([]);
      }
    } catch (err) {
      console.warn('Failed to load real departments');
      setAvailableDepartments([]);
    }
  };

  const fetchHods = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getStaff();
      const staffList = Array.isArray(res.data) ? res.data : (res.data?.staff || []);
      const allHods = staffList.filter(s => s.designation === 'HOD' || s.role === 'HOD');
      setHods(allHods);
    } catch (err) {
      console.error('Failed to fetch HODs:', err);
      if (showLoading) setHods([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filtered = hods.filter(h => 
    (h.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (h.dept || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { 
    let maxSuffix = 0;
    hods.forEach(h => {
      if (h.id && typeof h.id === 'string' && h.id.startsWith('HOD')) {
        const num = parseInt(h.id.replace('HOD', ''), 10);
        if (!isNaN(num) && num > maxSuffix) maxSuffix = num;
      }
    });
    const nextNum = Math.max(maxSuffix + 1, hods.length + 1);
    const newId = `HOD${String(nextNum).padStart(3, '0')}`;

    setForm({ 
      ...EMPTY_FORM, 
      id: newId,
      dept: availableDepartments[0]?.name || '',
      qualification: 'M.E., Ph.D.',
      experience: '5+ yrs',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    }); 
    setEditTarget(null); 
    setModalOpen(true); 
  };

  const openEdit = (h) => { 
    setForm({ 
      ...h,
      joinDate: h.joinDate ? String(h.joinDate).split('T')[0] : new Date().toISOString().split('T')[0],
      qualification: h.qualification || 'M.E., Ph.D.',
      experience: h.experience || '5+ yrs'
    }); 
    setEditTarget(h.id || h._id); 
    setModalOpen(true); 
  };

  const closeModal = () => { 
    setModalOpen(false); 
    setEditTarget(null); 
    setForm(EMPTY_FORM); 
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!form.id?.trim()) {
      alert("Please provide the HOD Employee ID.");
      return;
    }

    if (!form.name || !form.name.trim()) {
      alert("Please provide the HOD's Name before saving.");
      return;
    }

    if (!form.email || !form.email.trim()) {
      alert("Please provide the HOD's Email Address before saving.");
      return;
    }

    if (!editTarget && !form.password?.trim()) {
      alert("Please provide a Login Password.");
      return;
    }

    if (!form.dept) {
      alert("Please select a Department.");
      return;
    }

    if (!form.qualification?.trim()) {
      alert("Please provide the HOD Qualification.");
      return;
    }

    const deptInfo =
      availableDepartments.find(d => d.name === form.dept) || { code: form.dept?.substring(0, 4).toUpperCase() || 'HOD' };
    
    try {
      if (editTarget) {
        const payload = { ...form, deptCode: deptInfo.code, designation: 'HOD' };
        await updateStaff(editTarget, payload);
        setHods(prev => prev.map(h => (h.id === editTarget || h._id === editTarget) ? { ...h, ...payload } : h));
      } else {
        const newHod = {
          ...form,
          deptCode: deptInfo.code,
          designation: 'HOD',
          role: 'HOD'
        };
        const res = await createStaff(newHod);
        const createdRecord = res.data || newHod;
        setHods(prev => [...prev, createdRecord]);
      }
      closeModal();
    } catch (err) {
      console.error('Save failed:', err);
      const errMsg = err.response?.data?.message || err.message;
      alert(`Failed to save HOD: ${errMsg}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this HOD record?')) {
      try {
        await deleteStaff(id);
        setHods(prev => prev.filter(h => h.id !== id && h._id !== id));
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete HOD.');
      }
    }
  };

  return (
    <div className="hod-management-page animate-fade-in">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h1>HOD Management 🏛️</h1>
            <div className="erp-live-sync-pill">
              <span className="erp-live-pulse-dot"></span>
              <span>Real-Time ERP Synced</span>
            </div>
          </div>
          <p className="text-muted">Centralized administration for Department Heads, departmental leadership, and administrative credentials.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Add HOD</button>
      </div>

      {/* Summary Cards */}
      <div className="sm-summary-row" style={{ marginTop: '1.25rem' }}>
        <div className="sm-summary-card glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="sm-summary-label">Total HODs</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(79, 70, 229, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#4f46e5" />
            </div>
          </div>
          <span className="sm-summary-value">{hods.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="sm-summary-label">Active HODs</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={18} color="#10b981" />
            </div>
          </div>
          <span className="sm-summary-value text-success">{hods.filter(h => h.status === 'Active').length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="sm-summary-label">Assigned Depts</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139, 92, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={18} color="#8b5cf6" />
            </div>
          </div>
          <span className="sm-summary-value gradient-text">{new Set(hods.map(h => h.dept)).size}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="sm-summary-label">Inactive Roles</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
          </div>
          <span className="sm-summary-value text-danger">{hods.filter(h => h.status !== 'Active').length}</span>
        </div>
      </div>

      {/* Scoped Table View */}
      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by name, ID or department..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>HOD ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Code</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No HOD records match your query.
                  </td>
                </tr>
              ) : (
                filtered.map((hod) => {
                  const deptObj = availableDepartments.find(d => d.name === hod.dept);
                  const displayCode = hod.deptCode || (deptObj ? deptObj.code : (hod.dept ? hod.dept.split(' ').map(w => w[0]).join('').toUpperCase() : '—'));
                  return (
                  <tr key={hod.id}>
                    <td><span className="roll-no">{hod.id}</span></td>
                    <td className="font-semibold">{hod.name}</td>
                    <td>{hod.dept}</td>
                    <td><span className="code-pill">{displayCode}</span></td>
                    <td><span className="text-sm font-semibold">{hod.email}</span></td>
                    <td><span className="text-sm">{hod.phone || '—'}</span></td>
                    <td>
                      <span className={`status-badge ${hod.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                        {hod.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => openEdit(hod)}><Edit2 size={15} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(hod.id || hod._id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && <div className="table-footer">Showing {filtered.length} of {hods.length} HOD records</div>}
      </div>

      {/* Manage HOD Modal */}
      {modalOpen && (
        <div 
          className="modal-overlay" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div 
            className="modal-card glass-card" 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <h2>{editTarget ? 'Edit HOD Account' : 'Register New HOD'}</h2>
              <button className="btn-icon" type="button" onClick={closeModal}><X size={20} /></button>
            </div>
            <form 
              onSubmit={handleSubmit} 
              className="modal-form"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
                  e.preventDefault();
                }
              }}
            >
              <div className="form-grid">
                <div className="form-group">
                  <label>Employee ID *</label>
                  <input
                    required
                    placeholder="e.g. HOD001"
                    value={form.id || ''}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      setForm(prev => ({ ...prev, id: val }));
                    }}
                    disabled={Boolean(editTarget)}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input 
                    required 
                    placeholder="e.g. Dr. Ananya Rao" 
                    value={form.name || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, name: val }));
                    }}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email"
                    required 
                    placeholder="e.g. poojasree@gmail.com" 
                    value={form.email || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, email: val }));
                    }}
                    autoComplete="off"
                    name="hod_registration_email"
                  />
                </div>
                <div className="form-group">
                  <label>Login Password {editTarget ? '' : '*'}</label>
                  <input 
                    type="password"
                    required={!editTarget}
                    placeholder={editTarget ? "Leave blank to keep current" : "e.g. password123"}
                    value={form.password || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, password: val }));
                    }}
                    autoComplete="new-password"
                    name="hod_registration_pwd"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    placeholder="e.g. 9876543210" 
                    value={form.phone || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, phone: val }));
                    }}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <CustomSelect 
                    value={form.dept || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, dept: val }));
                    }}
                    options={availableDepartments.map(d => ({ value: d.name, label: d.name }))}
                    placeholder="Select Department"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <CustomSelect 
                    value={form.status || 'Active'}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, status: val }));
                    }}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                  />
                </div>
                
                {/* Professional Details */}
                <div className="sm-form-section-title" style={{ gridColumn: '1 / -1', marginTop: '1rem', fontWeight: 600, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Professional Details
                </div>
                
                <div className="form-group">
                  <label>Experience (e.g. '10 yrs')</label>
                  <input 
                    placeholder="10 yrs" 
                    value={form.experience || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, experience: val }));
                    }} 
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>Qualification *</label>
                  <input
                    required
                    placeholder="e.g. M.E., Ph.D."
                    value={form.qualification || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, qualification: val }));
                    }}
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={form.joinDate ? String(form.joinDate).split('T')[0] : ''}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, joinDate: val }));
                    }}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Save Changes' : 'Register HOD'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodManagement;
