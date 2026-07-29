import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Filter, MoreVertical, Edit2, Trash2, Mail, Phone, Clock, AlertTriangle, CheckCircle, X, BookOpen } from 'lucide-react';
import { getStaff, createStaff, updateStaff, deleteStaff, approveStaff, getSubjects } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import CustomSelect from '../../components/CustomSelect';
import './StaffManagement.css';

const DEPARTMENTS = [
  'Computer Science Engineering', 'Information Technology', 'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Artificial Intelligence & Data Science', 'Artificial Intelligence & Machine Learning',
  'Cyber Security', 'Biomedical Engineering', 'Aeronautical Engineering', 'Automobile Engineering',
  'Robotics Engineering', 'Chemical Engineering', 'Biotechnology Engineering'
];

const MOCK_STAFF = [
  { id: 'STF001', name: 'Dr. Ananya Rao', email: 'ananya@college.edu', phone: '9876543210', dept: 'Computer Science', designation: 'Professor', subjects: ['Data Structures', 'DBMS'], workload: 18, attendance: 97, status: 'Active' },
  { id: 'STF001', name: 'Dr. Ananya Rao', email: 'ananya@college.edu', phone: '9876543210', dept: 'Computer Science', designation: 'Professor', workload: 18, attendance: 97, status: 'Active' },
  { id: 'STF002', name: 'Prof. Rajan Iyer', email: 'rajan@college.edu', phone: '9845123456', dept: 'Electrical Engg.', designation: 'HOD', workload: 14, attendance: 95, status: 'Active' },
  { id: 'STF003', name: 'Dr. Meena Pillai', email: 'meena@college.edu', phone: '9812987654', dept: 'Mechanical Engg.', designation: 'Associate Prof.', workload: 16, attendance: 92, status: 'Active' },
  { id: 'STF004', name: 'Prof. Karthik S.', email: 'karthik@college.edu', phone: '9823456789', dept: 'Computer Science', designation: 'Assistant Prof.', workload: 20, attendance: 89, status: 'Active' },
  { id: 'STF005', name: 'Dr. Shalini Nair', email: 'shalini@college.edu', phone: '9867123456', dept: 'Civil Engg.', designation: 'Professor', workload: 12, attendance: 98, status: 'Inactive' },
];

const EMPTY_FORM = { name: '', email: '', phone: '', dept: '', designation: 'Assistant Prof.', workload: '', attendance: '95', status: 'Active' };

const getInitials = (name) => name.replace('Dr. ', '').replace('Prof. ', '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const AVATAR_COLORS = ['bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-orange', 'bg-gradient-green', 'bg-gradient-teal'];

const StaffManagement = () => {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchStaff();
  }, []);

  // Auto-refresh when staff data changes on another dashboard
  useRealtimeSync(useCallback(() => { fetchStaff(false); }, []), 'staff');

  const fetchStaff = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getStaff();
      let allStaff = res.data || [];
      
      const local = localStorage.getItem('erp_staff');
      if (local) {
        const parsed = JSON.parse(local);
        const dbIds = new Set(allStaff.map(s => s.id || s._id));
        parsed.forEach(s => { if (!dbIds.has(s.id)) allStaff.push(s); });
      }
      setStaff(allStaff);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      const local = localStorage.getItem('erp_staff');
      setStaff(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = staff.filter(s => {
    const isHod = s.designation === 'HOD' || (s.id && s.id.startsWith('HOD')) || (s.role === 'HOD');
    if (isHod) return false;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.id && s.id.toLowerCase().includes(search.toLowerCase()));
    const matchDept = deptFilter === 'All' || s.dept === deptFilter;
    return matchSearch && matchDept;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setEditTarget(null); setModalOpen(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditTarget(s.id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editTarget) {
      const updatedStaff = staff.map(s => s.id === editTarget ? { ...s, ...form } : s);
      try {
        await updateStaff(editTarget, form);
      } catch (err) {
        console.warn('Backend update failed, saving locally.');
      }
      setStaff(updatedStaff);
    } else {
      const newId = `STF${String(staff.length + 1).padStart(3, '0')}`;
      const payload = { id: newId, ...form };
      const updatedStaff = [...staff, payload];
      try {
        const res = await createStaff(payload);
        updatedStaff[updatedStaff.length - 1] = res.data;
        setStaff(updatedStaff);
        closeModal();
      } catch (err) {
        console.error('Backend create failed:', err);
        alert(`Failed to save staff: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this staff member?')) {
      try {
        await deleteStaff(id);
        setStaff(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete staff.');
      }
    }
  };

  const handleApprove = async (id) => {
    if (window.confirm('Approve this staff onboarding request?')) {
      try {
        await approveStaff(id);
        setStaff(prev => prev.map(s => s.id === id ? { ...s, status: 'Active' } : s));
      } catch (err) {
        console.error('Approval failed:', err);
        alert('Failed to approve staff.');
      }
    }
  };

  const getWorkloadColor = (w) => w > 18 ? 'text-danger' : w > 14 ? 'text-warning-cgpa' : 'text-success';

  return (
    <div className="staff-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Staff Management</h1>
          <p className="text-muted">Manage faculty, workload, and department assignments.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Add Staff</button>
      </div>

      {/* Summary */}
      <div className="sm-summary-row">
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Staff</span>
          <span className="sm-summary-value">{staff.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Professors</span>
          <span className="sm-summary-value gradient-text">{staff.filter(s => s.designation === 'Professor').length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Avg Attendance</span>
          <span className="sm-summary-value text-success">
            {staff.length ? (staff.reduce((a, b) => a + b.attendance, 0) / staff.length).toFixed(1) + '%' : '—'}
          </span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Overloaded (&gt;18h)</span>
          <span className="sm-summary-value text-danger">{staff.filter(s => s.workload > 18).length}</span>
        </div>
      </div>

      <div className="glass-card table-wrapper">
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input type="text" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-select-wrapper" style={{ width: '220px' }}>
            <CustomSelect 
              value={deptFilter} 
              onChange={e => setDeptFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Departments' },
                ...DEPARTMENTS.map(d => ({ value: d, label: d }))
              ]}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Staff Name</th><th>Staff ID</th><th>Department</th>
                <th>Subject</th><th>Email</th><th>Phone</th><th>Workload</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 10 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px', width: j === 1 ? '160px' : '70px' }}></div></td>)}</tr>
              )) : filtered.map((s, idx) => (
                <tr key={s.id}>
                  <td className="text-muted">{idx + 1}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`avatar-sm ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{getInitials(s.name)}</div>
                      <span className="font-semibold">{s.name}</span>
                    </div>
                  </td>
                  <td><span className="roll-no">{s.id}</span></td>
                  <td>{s.dept}</td>
                  <td className="text-muted">
                    Managed via Faculty Allocation module.
                  </td>
                  <td><span className="text-sm font-semibold">{s.email}</span></td>
                  <td><span className="text-sm">{s.phone || '—'}</span></td>
                  <td><span className={`font-semibold ${getWorkloadColor(s.workload)}`}>{s.workload}h</span></td>
                  <td>
                    <span className={`status-badge ${s.status === 'Active' ? 'badge-active' : s.status === 'Pending Approval' ? 'badge-warning' : 'badge-inactive'}`}
                          style={s.status === 'Pending Approval' ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' } : {}}>
                      {s.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {s.status === 'Pending Approval' && (
                        <button className="btn-icon text-success" title="Approve Staff" onClick={() => handleApprove(s.id)}>
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => openEdit(s)}><Edit2 size={15} /></button>
                      <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(s.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div className="table-footer">Showing {filtered.length} of {staff.length} staff members</div>}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Staff Member' : 'Add New Staff'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input required placeholder="e.g. Dr. Ananya Rao" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" required placeholder="staff@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
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
                  <label><Phone size={13} /> Phone</label>
                  <input placeholder="10-digit number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <CustomSelect 
                    value={form.dept}
                    onChange={e => setForm({ ...form, dept: e.target.value })}
                    options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
                    placeholder="Select Department"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Weekly Workload (hrs)</label>
                  <input type="number" min="1" max="30" placeholder="e.g. 16" value={form.workload} onChange={e => setForm({ ...form, workload: e.target.value })} />
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
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Save Changes' : 'Add Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
