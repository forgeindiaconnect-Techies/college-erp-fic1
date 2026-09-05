import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Building2, Users, UserCircle, ArrowRight, CheckCircle, Hash, Calendar } from 'lucide-react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getStaff } from '../../api/index';
import CustomSelect from '../../components/CustomSelect';
import './DepartmentManagement.css';

const MOCK_DEPARTMENTS = [
  { id: 'DEPT01', name: 'Computer Science', code: 'CS', hod: 'Dr. Ananya Rao', students: 420, staff: 28, established: 1998, status: 'Active' },
  { id: 'DEPT02', name: 'Electrical Engg.', code: 'EE', hod: 'Prof. Rajan Iyer', students: 380, staff: 22, established: 1990, status: 'Active' },
  { id: 'DEPT03', name: 'Mechanical Engg.', code: 'ME', hod: 'Dr. Meena Pillai', students: 360, staff: 20, established: 1985, status: 'Active' },
  { id: 'DEPT04', name: 'Civil Engg.', code: 'CE', hod: 'Dr. Shalini Nair', students: 290, staff: 18, established: 1988, status: 'Inactive' },
  { id: 'DEPT05', name: 'Information Tech.', code: 'IT', hod: 'Prof. Karthik S.', students: 340, staff: 19, established: 2001, status: 'Active' },
];


const STANDARD_DEPARTMENTS = [
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

const EMPTY_FORM = { name: '', code: '', hod: '', students: '', staff: '', established: '2020', status: 'Active' };

const DepartmentManagement = () => {
  const [loading, setLoading] = useState(true);
  const [depts, setDepts] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [availableHods, setAvailableHods] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();
    
    // Fetch available HODs for the dropdown
    getStaff().then(res => {
      const hods = (res.data || []).filter(s => s.role === 'HOD' || s.designation === 'HOD');
      setAvailableHods(hods);
    }).catch(err => console.error('Failed to load HODs:', err));
  }, []);

  // Auto-generate Department Code based on Department Name input
  useEffect(() => {
    if (!editTarget && form.name) {
      const generateCode = (name) => {
        const std = STANDARD_DEPARTMENTS.find(d => d.name.toLowerCase() === name.toLowerCase());
        if (std) return std.code;

        // Fallback (just in case)
        const words = name.trim().split(/[\s&\-]+/).filter(w => w.length > 0);
        if (words.length > 1) {
          return words.map(w => w[0].toUpperCase()).join('');
        }
        return name.substring(0, 3).toUpperCase();
      };
      setForm(prev => ({ ...prev, code: generateCode(form.name) }));
    } else if (!editTarget && !form.name) {
      setForm(prev => ({ ...prev, code: '' }));
    }
  }, [form.name, editTarget]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      setDepts(res.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setDepts([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = depts.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_FORM); setEditTarget(null); setModalOpen(true); };
  const openEdit = (d) => { 
    setForm({ 
      ...d, 
      name: d.name
    }); 
    setEditTarget(d.id); 
    setModalOpen(true); 
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.name || !form.name.trim()) {
        alert("Please provide a department name.");
        return;
      }
      
      const payloadBase = { ...form, name: form.name.trim(), students: Number(form.students) || 0, staff: Number(form.staff) || 0 };
      
      if (editTarget) {
        await updateDepartment(editTarget, payloadBase);
        setDepts(prev => prev.map(d => d.id === editTarget ? { ...d, ...payloadBase } : d));
      } else {
        const newId = `DEPT${String(depts.length + 1).padStart(2, '0')}`;
        const payload = { id: newId, ...payloadBase };
        const res = await createDepartment(payload);
        setDepts(prev => [...prev, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save department. Ensure backend is running.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this department? This action cannot be undone.')) {
      try {
        await deleteDepartment(id);
        setDepts(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete department.');
      }
    }
  };

  return (
    <div className="dept-management animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={28} className="text-[var(--primary)]" />
            Department Management
          </h1>
          <p className="text-muted" style={{ margin: '6px 0 0 0', fontSize: '0.95rem' }}>Monitor and manage academic divisions, allocate HODs, and review capacity metrics.</p>
        </div>
        <button 
          className="btn-primary shadow-glow" 
          onClick={openAdd}
          style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', borderRadius: '10px', fontWeight: 600 }}
        >
          <Plus size={18} /> New Department
        </button>
      </div>

      {/* Summary Row */}
      <div className="sm-summary-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(79, 70, 229, 0.2))', padding: '1rem', borderRadius: '12px' }}>
            <Building2 size={24} color="#4F46E5" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Total Divisions</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.2' }}>{depts.length}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.2))', padding: '1rem', borderRadius: '12px' }}>
            <Users size={24} color="#10b981" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Total Students</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', lineHeight: '1.2' }}>{depts.reduce((a, b) => a + Number(b.students || 0), 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.2))', padding: '1rem', borderRadius: '12px' }}>
            <UserCircle size={24} color="#f59e0b" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Faculty Count</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', lineHeight: '1.2' }}>{depts.reduce((a, b) => a + Number(b.staff || 0), 0)}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.2))', padding: '1rem', borderRadius: '12px' }}>
            <CheckCircle size={24} color="#3b82f6" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Active Departments</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', lineHeight: '1.2' }}>{depts.filter(d => d.status === 'Active').length}</div>
          </div>
        </div>
      </div>

      {/* Department Table Section */}
      <div className="department-table-section">
        <div className="filters-row glass-card">
          <div className="search-box">
            <Search size={17} className="text-muted" />

            <input
              type="text"
              placeholder="Search by department name or code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="table-container department-table">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Department</th>
                <th>Head of Department</th>
                <th>Students</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="department-table-message">
                    Loading departments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="department-table-message">
                    No departments match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((dept) => (
                  <tr key={dept._id || dept.id}>
                    <td>
                      <span className="department-code">
                        {dept.code}
                      </span>
                    </td>

                    <td>
                      <div className="department-name-cell">
                        <Building2 size={18} />
                        <strong>{dept.name}</strong>
                      </div>
                    </td>

                    <td>
                      <div className="department-hod-cell">
                        <UserCircle size={17} />
                        <span>
                          {dept.headOfDepartment ||
                            dept.hod ||
                            "Not assigned"}
                        </span>
                      </div>
                    </td>

                    <td>
                      {Number(dept.students || 0).toLocaleString()}
                    </td>

                    <td>
                      {Number(dept.staff || 0).toLocaleString()}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          dept.status === "Inactive"
                            ? "badge-inactive"
                            : "badge-active"
                        }`}
                      >
                        {dept.status || "Active"}
                      </span>
                    </td>

                    <td>
                      <div className="department-action-buttons">
                        <button
                          className="department-view-btn"
                          onClick={() =>
                            navigate(
                              `/admin/departments/${dept._id || dept.id}`
                            )
                          }
                          title="View Department"
                        >
                          View Details
                          <ArrowRight size={15} />
                        </button>

                        <button
                          className="department-icon-btn edit"
                          onClick={() => openEdit(dept)}
                          title="Edit Department"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          className="department-icon-btn delete"
                          onClick={() =>
                            handleDelete(dept._id || dept.id)
                          }
                          title="Delete Department"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Department' : 'Add New Department'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Department Name</label>
                  <input 
                    required 
                    placeholder="e.g. Computer Science Engineering" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Department Code (Auto)</label>
                  <input 
                    required 
                    placeholder="e.g. CS" 
                    value={form.code} 
                    readOnly
                    disabled
                    style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                  />
                </div>
                <div className="form-group">
                  <label>Assign HOD</label>
                  <CustomSelect 
                    value={form.hod}
                    onChange={e => setForm({ ...form, hod: e.target.value })}
                    options={[
                      ...availableHods.map(h => ({ value: h.name, label: h.name })),
                      ...(form.hod && !availableHods.some(h => h.name === form.hod) ? [{ value: form.hod, label: `${form.hod} (Legacy/Missing)` }] : [])
                    ]}
                    placeholder="Select HOD"
                  />
                </div>
                <div className="form-group">
                  <label>Year Established</label>
                  <input 
                    type="number" 
                    min="1900" 
                    max="2026" 
                    placeholder="e.g. 1998" 
                    value={form.established} 
                    onChange={e => setForm({ ...form, established: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Total Students</label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="e.g. 420" 
                    value={form.students} 
                    onChange={e => setForm({ ...form, students: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Total Staff</label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="e.g. 28" 
                    value={form.staff} 
                    onChange={e => setForm({ ...form, staff: e.target.value })} 
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
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Save Changes' : 'Add Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
