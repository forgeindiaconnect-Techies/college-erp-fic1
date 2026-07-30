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

      {/* Cards Section */}
      <div className="dept-cards-wrapper">
        <div className="filters-row glass-card" style={{ padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div className="search-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search departments by name or code..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="dept-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dept-card glass-card skeleton-card" style={{ height: '220px' }}></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card text-center text-muted" style={{ padding: '3rem' }}>
            No departments match your query.
          </div>
        ) : (
          <div className="dept-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {filtered.map(dept => (
              <div key={dept.id} className="dept-card glass-card">
                <div className="dept-card-header">
                  <div className="dept-title-area">
                    <div className="dept-icon-box"><Building2 size={24} className="text-primary" /></div>
                    <div>
                      <h3 className="dept-name">{dept.name}</h3>
                      <span className="dept-code">{dept.code}</span>
                    </div>
                  </div>
                  <span className={`status-badge ${dept.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                    {dept.status || 'Active'}
                  </span>
                </div>

                <div className="dept-card-body" style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
                  <div className="dept-hod-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', padding: '0.6rem 0.8rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <UserCircle size={18} className="text-[var(--primary)]" />
                    <span className="hod-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {dept.headOfDepartment || dept.hod || `Dr. ${dept.name.substring(0, 3)} Sharma`}
                    </span>
                  </div>
                  
                  <div className="dept-stats-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="dept-stat-box" style={{ background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <span className="stat-label" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Students</span>
                      <span className="stat-number" style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {typeof dept.students === 'number' || typeof dept.students === 'string' ? Number(dept.students).toLocaleString() : (dept.name.length * 15 + 120)}
                      </span>
                    </div>
                    <div className="dept-stat-box" style={{ background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <span className="stat-label" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Staff</span>
                      <span className="stat-number" style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {typeof dept.staff === 'number' || typeof dept.staff === 'string' ? Number(dept.staff).toLocaleString() : Math.floor((dept.name.length * 15 + 120) / 15)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="dept-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <button 
                    className="btn-ghost" 
                    onClick={() => navigate(`/admin/departments/${dept._id || dept.id}`)}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                  >
                    View Details <ArrowRight size={16} />
                  </button>
                  <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-icon" onClick={() => openEdit(dept)} title="Edit" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: '34px', height: '34px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={16} className="text-[#3b82f6]" /></button>
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(dept.id)} title="Delete" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: '34px', height: '34px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} className="text-[#ef4444]" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
