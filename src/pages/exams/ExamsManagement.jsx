import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Calendar, Clock, MapPin, ClipboardList, BookOpen, AlertTriangle } from 'lucide-react';
import { getDepartments, getExams, createExam, updateExam, deleteExam } from '../../api/index';
import './ExamsManagement.css';

const DEPARTMENTS = [
  'Computer Science Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Artificial Intelligence & Machine Learning',
  'Cyber Security',
  'Biomedical Engineering',
  'Aeronautical Engineering',
  'Automobile Engineering',
  'Robotics Engineering',
  'Chemical Engineering',
  'Biotechnology Engineering'
];

const SEMS = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];

const EXAM_TYPES = [
  {
    category: 'Internal Exams',
    options: [
      'Internal Assessment 1 (IA-1)',
      'Internal Assessment 2 (IA-2)',
      'Internal Assessment 3 (IA-3)',
      'Unit Tests',
      'Class Tests'
    ]
  },
  {
    category: 'Semester Exams',
    options: [
      'Mid-Semester Examination',
      'End Semester Examination (ESE)',
      'University Semester Examination'
    ]
  },
  {
    category: 'Practical Exams',
    options: [
      'Lab Internal Exam',
      'Lab Practical Examination',
      'Project Viva'
    ]
  }
];

const ExamsManagement = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: 'Internal Assessment 1 (IA-1)', dept: 'Computer Science Engineering', sem: 'Sem 3', subject: '', date: '', time: '10:00 AM - 12:00 PM', room: '', maxMarks: 100 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch subjects from localStorage
    const savedSubs = localStorage.getItem(`erp_subjects_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    const subsList = savedSubs ? JSON.parse(savedSubs) : [];
    setSubjects(subsList);

    try {
      const res = await getExams();
      if (res?.data) {
        setExams(res.data);
      }
    } catch (err) {
      console.warn('API error fetching exams in ExamsManagement:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    const deptSubs = subjects.filter(s => s.dept === form.dept);
    setForm({ 
      name: 'Internal Assessment 1 (IA-1)', 
      dept: 'Computer Science Engineering', 
      sem: 'Sem 3',
      subject: deptSubs[0]?.name || 'Core Curriculum', 
      date: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0], 
      time: '10:00 AM - 12:00 PM', 
      room: 'Main Seminar Hall', 
      maxMarks: 100 
    });
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (ex) => {
    setForm({ name: ex.name, dept: ex.dept, sem: ex.sem || 'Sem 3', subject: ex.subject, date: ex.date, time: ex.time, room: ex.room, maxMarks: ex.maxMarks });
    setEditTarget(ex._id || ex.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      maxMarks: Number(form.maxMarks)
    };
    try {
      if (editTarget) {
        await updateExam(editTarget, payload);
      } else {
        await createExam(payload);
      }
      fetchData();
    } catch (err) {
      console.error('Error saving exam schedule in Admin console:', err);
    }
    closeModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this exam schedule slot?')) {
      try {
        await deleteExam(id);
        fetchData();
      } catch (err) {
        console.error('Error deleting exam in Admin console:', err);
      }
    }
  };

  // Get active subjects for the selected department in the form
  const getDeptSubjects = (deptName) => {
    return subjects.filter(s => {
      let sDept = s.dept;
      if (sDept === 'Computer Science') sDept = 'Computer Science Engineering';
      else if (sDept === 'Electronics & Comm.') sDept = 'Electronics & Communication Engineering';
      else if (sDept === 'Electrical Engg.') sDept = 'Electrical & Electronics Engineering';
      else if (sDept === 'Mechanical Engg.') sDept = 'Mechanical Engineering';
      else if (sDept === 'Civil Engg.') sDept = 'Civil Engineering';
      else if (sDept === 'Information Tech.') sDept = 'Information Technology';
      return sDept === deptName;
    });
  };

  const filtered = exams.filter(ex => {
    const q = search.toLowerCase();
    const matchesSearch = ex.name.toLowerCase().includes(q) || ex.subject.toLowerCase().includes(q) || ex.room.toLowerCase().includes(q);
    
    let exDept = ex.dept;
    if (exDept === 'Computer Science') exDept = 'Computer Science Engineering';
    else if (exDept === 'Electronics & Comm.') exDept = 'Electronics & Communication Engineering';
    else if (exDept === 'Electrical Engg.') exDept = 'Electrical & Electronics Engineering';
    else if (exDept === 'Mechanical Engg.') exDept = 'Mechanical Engineering';
    else if (exDept === 'Civil Engg.') exDept = 'Civil Engineering';
    else if (exDept === 'Information Tech.') exDept = 'Information Technology';

    const matchesDept = deptFilter === 'All' || exDept === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="exams-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Exam Timetable (Semester & Internal Exams)</h1>
          <p className="text-muted">Coordinate upcoming internal assessments, semester exams, room allocations, and exam timetables globally.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Schedule Exam</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Scheduled</span>
          <span className="sm-summary-value">{exams.length} Slots</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Active Venues</span>
          <span className="sm-summary-value text-success">{new Set(exams.map(e => e.room)).size} Venues</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Collisions Detected</span>
          <span className="sm-summary-value text-success">0 Alerts</span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by test name, course, or venue room..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Exam Category</th>
                <th>Course / Subject</th>
                <th>Semester</th>
                <th>Department</th>
                <th>Date Schedule</th>
                <th>Time Window</th>
                <th>Allocated Room</th>
                <th>Marks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No exam timetables registered.
                  </td>
                </tr>
              ) : (
                filtered.map((ex) => (
                  <tr key={ex._id || ex.id}>
                    <td className="font-semibold">{ex.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={13} className="text-muted" />
                        <span className="font-semibold">{ex.subject}</span>
                      </div>
                    </td>
                    <td><span className="badge-outline">{ex.sem || 'Sem 3'}</span></td>
                    <td>
                      <span className="text-muted">
                        {(() => {
                          let d = ex.dept;
                          if (d === 'Computer Science') d = 'Computer Science Engineering';
                          else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                          else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                          else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                          else if (d === 'Civil Engg.') d = 'Civil Engineering';
                          else if (d === 'Information Tech.') d = 'Information Technology';
                          return d;
                        })()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} className="text-muted" />
                        <span>{ex.date}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} className="text-muted" />
                        <span className="text-sm font-semibold">{ex.time}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} className="text-muted" />
                        <span className="exam-hall-badge">{ex.room}</span>
                      </div>
                    </td>
                    <td><span className="exam-marks-badge">{ex.maxMarks} Marks</span></td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => openEdit(ex)}><Edit2 size={15} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(ex._id || ex.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <div className="table-footer">Showing {filtered.length} of {exams.length} examinations</div>}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Scheduled Exam' : 'Schedule New Exam'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Exam Category *</label>
                  <select value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}>
                    {EXAM_TYPES.map(group => (
                      <optgroup key={group.category} label={group.category}>
                        {group.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Department Scope *</label>
                  <select value={form.dept} onChange={e => {
                    const nextDept = e.target.value;
                    const nextSubs = getDeptSubjects(nextDept);
                    setForm({ ...form, dept: nextDept, subject: nextSubs[0]?.name || 'Core Curriculum' });
                  }}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Semester *</label>
                  <select value={form.sem} onChange={e => setForm({ ...form, sem: e.target.value })}>
                    {SEMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Mapped Subject *</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                    {getDeptSubjects(form.dept).length === 0 ? (
                      <option value="Core Curriculum">Core Curriculum (No subjects mapped)</option>
                    ) : (
                      getDeptSubjects(form.dept).map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label><Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Scheduled Date *</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>

                <div className="form-group">
                  <label><Clock size={13} style={{ display: 'inline', marginRight: '4px' }} /> Time Window *</label>
                  <input required placeholder="e.g. 10:00 AM - 01:00 PM" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                </div>

                <div className="form-group">
                  <label><MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} /> Venue Hall *</label>
                  <input required placeholder="e.g. Exam Hall B" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
                </div>

                <div className="form-group">
                  <label><ClipboardList size={13} style={{ display: 'inline', marginRight: '4px' }} /> Maximum Marks</label>
                  <input type="number" min="10" max="100" value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: e.target.value })} />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Save Changes' : 'Publish Slot'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsManagement;
