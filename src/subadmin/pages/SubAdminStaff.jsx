import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Mail, Phone, X, BookOpen, Download } from 'lucide-react';
import { getStaff, createStaff, updateStaff, getDepartments } from '../../api/index';
import { io } from 'socket.io-client';
import { getBackendURL } from '../../utils/backendUrl';
import '../../pages/staff/StaffManagement.css';

const SUBJECTS = ['Data Structures', 'DBMS', 'Networks', 'OS', 'Machine Learning', 'Circuits', 'Thermodynamics', 'Fluid Mechanics', 'Structural Analysis'];

const EMPTY_FORM = { name: '', email: '', phone: '', dept: '', designation: 'Assistant Prof.', subjects: [], workload: '', attendance: 0, status: 'Active' };

const getInitials = (name) => name.replace('Dr. ', '').replace('Prof. ', '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const AVATAR_COLORS = ['bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-orange', 'bg-gradient-green', 'bg-gradient-teal'];

const SubAdminStaff = () => {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [departmentsList, setDepartmentsList] = useState([]);

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
    
    const socket = io(getBackendURL());
    socket.on('staffUpdated', () => {
      fetchStaff();
    });
    
    return () => socket.disconnect();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await getDepartments();
      const names = (res.data || []).map(d => d.name);
      setDepartmentsList(names);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await getStaff();
      // Filter out HODs for the Sub Admin view
      const staffOnly = (res.data || []).filter(s => s.designation !== 'HOD');
      setStaff(staffOnly);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = staff.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
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

  const toggleSubject = (sub) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(sub) ? f.subjects.filter(s => s !== sub) : [...f.subjects, sub]
    }));
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Staff Name,Staff ID,Department,Role,Subject,Email,Phone,Workload,Status\n"
      + filtered.map(s => `${s.name},${s.id},${s.dept},${s.designation},"${s.subjects.join(', ')}",${s.email},${s.phone},${s.workload},${s.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "staff_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWorkloadColor = (w) => w > 18 ? 'text-danger' : w > 14 ? 'text-warning-cgpa' : 'text-success';

  return (
    <div className="staff-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Sub Admin Staff Management</h1>
          <p className="text-muted">Manage faculty, assign departments, and export staff reports.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline shadow-glow" onClick={handleExport}>
            <Download size={18} /> Export Report
          </button>
          <button className="btn-primary shadow-glow" onClick={openAdd}>
            <Plus size={18} /> Add Staff
          </button>
        </div>
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
            {staff.length ? (staff.reduce((a, b) => a + (b.attendance || 0), 0) / staff.length).toFixed(1) + '%' : '—'}
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
          <div className="filter-select-wrapper">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="filter-select">
            <option value="All">All Departments</option>
            {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
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
                  <td>
                    <div className="subjects-list">
                      {s.subjects.map(sub => <span key={sub} className="subject-tag">{sub}</span>)}
                    </div>
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
                      <button className="btn-icon" onClick={() => openEdit(s)}><Edit2 size={15} /></button>
                      {/* Delete button removed for Sub Admin */}
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
                  <label><Phone size={13} /> Phone</label>
                  <input placeholder="10-digit number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select value={form.dept} onChange={e => setForm({...form, dept: e.target.value})} required>
                    <option value="">Select Department</option>
                    {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Designation / Role</label>
                  <select required value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}>
                    <option value="Assistant Prof.">Assistant Prof.</option>
                    <option value="Associate Prof.">Associate Prof.</option>
                    <option value="Professor">Professor</option>
                    <option value="HOD">HOD</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Weekly Workload (hrs)</label>
                  <input type="number" min="1" max="30" placeholder="e.g. 16" value={form.workload} onChange={e => setForm({ ...form, workload: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label><BookOpen size={13} /> Subjects (select all that apply)</label>
                <div className="subjects-picker">
                  {SUBJECTS.map(sub => (
                    <button type="button" key={sub}
                      className={`subject-pick-btn ${form.subjects.includes(sub) ? 'selected' : ''}`}
                      onClick={() => toggleSubject(sub)}
                    >{sub}</button>
                  ))}
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

export default SubAdminStaff;
