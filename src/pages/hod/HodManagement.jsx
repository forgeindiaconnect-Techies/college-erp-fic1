import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, GraduationCap, Mail, Phone } from 'lucide-react';
import { getStaff, createStaff, updateStaff, deleteStaff, getDepartments, createUser } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import CustomSelect from '../../components/CustomSelect';
import './HodManagement.css';

const DEFAULT_HODS = [
  { id: 'HOD001', name: 'Dr. Ananya Rao', email: 'csehod@gmail.com', phone: '9876543210', dept: 'Computer Science', deptCode: 'CSE', status: 'Active' },
  { id: 'HOD002', name: 'Prof. Rajan Iyer', email: 'ecehod@gmail.com', phone: '9845123456', dept: 'Electronics & Comm.', deptCode: 'ECE', status: 'Active' },
  { id: 'HOD003', name: 'Dr. Meena Pillai', email: 'mechhod@gmail.com', phone: '9812987654', dept: 'Mechanical Engg.', deptCode: 'MECH', status: 'Active' },
  { id: 'HOD004', name: 'Dr. Shalini Nair', email: 'eeehod@gmail.com', phone: '9867123456', dept: 'Electrical & Electronics', deptCode: 'EEE', status: 'Active' },
  { id: 'HOD005', name: 'Prof. Karthik S.', email: 'bcahod@gmail.com', phone: '9823456789', dept: 'Bachelor of Computer App.', deptCode: 'BCA', status: 'Active' },
  { id: 'HOD006', name: 'Dr. Sanjay Sen', email: 'mbahod@gmail.com', phone: '9854321098', dept: 'Master of Business Admin.', deptCode: 'MBA', status: 'Active' }
];

const DEPARTMENTS = [
  { name: 'Computer Science Engineering', code: 'CSE' },
  { name: 'Information Technology', code: 'IT' },
  { name: 'Electronics & Communication Engineering', code: 'ECE' },
  { name: 'Electrical & Electronics Engineering', code: 'EEE' },
  { name: 'Mechanical Engineering', code: 'MECH' },
  { name: 'Civil Engineering', code: 'CIVIL' },
  { name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
  { name: 'Artificial Intelligence & Machine Learning', code: 'AIML' },
  { name: 'Cyber Security', code: 'CYBER' },
  { name: 'Biomedical Engineering', code: 'BME' },
  { name: 'Aeronautical Engineering', code: 'AERO' },
  { name: 'Automobile Engineering', code: 'AUTO' },
  { name: 'Robotics Engineering', code: 'ROBOTICS' },
  { name: 'Chemical Engineering', code: 'CHEM' },
  { name: 'Biotechnology Engineering', code: 'BIOTECH' },
];

const EMPTY_FORM = { 
  name: '', email: '', phone: '', dept: 'Computer Science Engineering', status: 'Active',
  experience: '10 yrs', passRate: 88, attendance: 95, publications: 5, faculty: 5, students: 100, rating: 4.5
};

const HodManagement = () => {
  const [hods, setHods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [availableDepartments, setAvailableDepartments] = useState(DEPARTMENTS);

  useEffect(() => {
    fetchHods();
    fetchDepts();
  }, []);

  // Auto-refresh when staff data changes on another dashboard
  useRealtimeSync(useCallback(() => { fetchHods(); }, []), 'staff');

  const fetchDepts = async () => {
    try {
      const res = await getDepartments();
      if (res.data && res.data.length > 0) {
        setAvailableDepartments(res.data.map(d => ({ name: d.name, code: d.code })));
      }
    } catch (err) {
      console.warn('Failed to load real departments, using defaults');
    }
  };

  const fetchHods = async () => {
    try {
      setLoading(true);
      const res = await getStaff();
      let allHods = res.data.filter(s => s.designation === 'HOD');
      
      // Merge manually entered local data that might not be in DB
      const local = localStorage.getItem('erp_staff');
      if (local) {
        const parsed = JSON.parse(local).filter(s => s.designation === 'HOD' || s.role === 'HOD');
        const dbIds = new Set(allHods.map(h => h.id || h._id));
        parsed.forEach(h => { if (!dbIds.has(h.id)) allHods.push(h); });
      }
      setHods(allHods);
    } catch (err) {
      console.error('Failed to fetch HODs:', err);
      const local = localStorage.getItem('erp_staff');
      setHods(local ? JSON.parse(local).filter(s => s.designation === 'HOD' || s.role === 'HOD') : []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = hods.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) || 
    h.dept.toLowerCase().includes(search.toLowerCase()) ||
    h.id.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_FORM); setEditTarget(null); setModalOpen(true); };
  const openEdit = (h) => { setForm({ ...h }); setEditTarget(h.id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.name.trim()) {
      alert("Please provide the HOD's Name before saving.");
      return;
    }
    if (!form.email || !form.email.trim()) {
      alert("Please provide the HOD's Email Address before saving.");
      return;
    }

    const deptInfo = DEPARTMENTS.find(d => d.name === form.dept) || { code: 'HOD' };
    
    try {
      if (editTarget) {
        const payload = { ...form, deptCode: deptInfo.code, designation: 'HOD' };
        await updateStaff(editTarget, payload);
        setHods(hods.map(h => h.id === editTarget ? { ...h, ...payload } : h));
      } else {
        // Safe ID generation: find max HOD id and increment, fallback to length + 1
        let maxSuffix = 0;
        hods.forEach(h => {
          if (h.id && h.id.startsWith('HOD')) {
            const num = parseInt(h.id.replace('HOD', ''), 10);
            if (!isNaN(num) && num > maxSuffix) maxSuffix = num;
          }
        });
        const nextNum = Math.max(maxSuffix + 1, hods.length + 1);
        const newId = `HOD${String(nextNum).padStart(3, '0')}`;
        
        const newHod = { id: newId, ...form, deptCode: deptInfo.code, designation: 'HOD', workload: 12, attendance: 100 };
        const res = await createStaff(newHod);
        
        // The backend automatically creates a User account during createStaff()

        setHods([...hods, res.data]);
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
        setHods(hods.filter(h => h.id !== id));
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
          <h1>HOD Management</h1>
          <p className="text-muted">Manage department HOD accounts, view assigned codes, and edit credentials.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Add HOD</button>
      </div>

      {/* Summary Cards */}
      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total HODs</span>
          <span className="sm-summary-value">{hods.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Active HODs</span>
          <span className="sm-summary-value text-success">{hods.filter(h => h.status === 'Active').length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Assigned Departments</span>
          <span className="sm-summary-value gradient-text">{new Set(hods.map(h => h.dept)).size}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Inactive Roles</span>
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
                  const deptObj = DEPARTMENTS.find(d => d.name === hod.dept);
                  const displayCode = hod.deptCode || (deptObj ? deptObj.code : '—');
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
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(hod.id)}><Trash2 size={15} /></button>
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit HOD Account' : 'Register New HOD'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    required 
                    placeholder="e.g. Dr. Ananya Rao" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email"
                    required 
                    placeholder="csehod@gmail.com" 
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Login Password</label>
                  <input 
                    type="text"
                    required={!editTarget}
                    placeholder={editTarget ? "Leave blank to keep current" : "e.g. password123"}
                    value={form.password || ''} 
                    onChange={e => setForm({ ...form, password: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    placeholder="e.g. 9876543210" 
                    value={form.phone} 
                    onChange={e => setForm({ ...form, phone: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <CustomSelect 
                    value={form.dept}
                    onChange={e => setForm({ ...form, dept: e.target.value })}
                    options={availableDepartments.map(d => ({ value: d.name, label: d.name }))}
                    placeholder="Select Department"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <CustomSelect 
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                  />
                </div>
                
                {/* Advanced Metrics */}
                <div className="sm-form-section-title" style={{ gridColumn: '1 / -1', marginTop: '1rem', fontWeight: 600, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Advanced Analytics Metrics</div>
                
                <div className="form-group">
                  <label>Experience (e.g. '10 yrs')</label>
                  <input placeholder="10 yrs" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Pass Rate (%)</label>
                  <input type="number" min="0" max="100" value={form.passRate} onChange={e => setForm({ ...form, passRate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Attendance (%)</label>
                  <input type="number" min="0" max="100" value={form.attendance} onChange={e => setForm({ ...form, attendance: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Total Publications</label>
                  <input type="number" min="0" value={form.publications} onChange={e => setForm({ ...form, publications: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Faculty Managed</label>
                  <input type="number" min="0" value={form.faculty} onChange={e => setForm({ ...form, faculty: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Students in Dept</label>
                  <input type="number" min="0" value={form.students} onChange={e => setForm({ ...form, students: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Overall Rating (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />
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
