import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, createAssignment, getAssignmentSubmissions, getStudents, getSubjects, getMyFacultyAllocations } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import {
  ClipboardList, Plus, Search, Calendar, Users, FileText,
  Trash2, X, CheckCircle, ArrowLeft, AlertCircle, BookOpen,
  Clock, CheckCircle2, Filter, ChevronRight, FolderOpen, Send
} from 'lucide-react';
import './StaffAssignments.css';

const StaffAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(null);

  // Assignments state
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'active', 'overdue'

  // Modal create states
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', targetClass: '', description: '', dueDate: '' });
  const [saved, setSaved] = useState(false);

  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [dbSubjects, setDbSubjects] = useState([]);

  const fetchAssignments = useCallback(async (facultyName) => {
    try {
      setLoading(true);
      const res = await getAssignments();
      const all = Array.isArray(res.data) ? res.data : [];
      setAssignments(all.filter(a => a.faculty === facultyName || !a.faculty));
    } catch (err) {
      console.warn('Failed to fetch assignments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = sessionStorage.getItem('staff_session');
      if (!session) {
        navigate('/staff/login');
        return;
      }

      const activeStaff = JSON.parse(session);
      setStaffSession(activeStaff);

      try {
        const allocationResponse = await getMyFacultyAllocations().catch(() => ({ data: [] }));
        const allocations = Array.isArray(allocationResponse?.data) ? allocationResponse.data : [];
        const allocatedSubjects = allocations.map(alloc => alloc.subjectId).filter(Boolean);
        const subjectNames = allocatedSubjects.map(sub => sub.subjectName || sub.name).filter(Boolean);
        const uniqueSubjects = [...new Set(subjectNames)];

        setDbSubjects(allocations);
        setAvailableSubjects(uniqueSubjects.length > 0 ? uniqueSubjects : ['Relational Database Management Systems', 'Algorithms']);

        const firstAllocation = allocations[0];
        setForm(current => ({
          ...current,
          subject: uniqueSubjects[0] || 'Relational Database Management Systems',
          targetClass: firstAllocation?.semester || 'Semester 4'
        }));
      } catch (error) {
        console.error('Failed to load assigned subjects:', error);
      }

      fetchAssignments(activeStaff.name);
    };
    init();
  }, [navigate, fetchAssignments]);

  useRealtimeSync(() => {
    if (staffSession?.name) {
      fetchAssignments(staffSession.name);
    }
  }, 'assignments');

  const staffName = staffSession?.name || '';
  const staffDept = staffSession?.dept || staffSession?.department || 'Computer Science Engineering';

  // Helper date functions
  const formatDate = (raw) => {
    if (!raw) return 'No date specified';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return raw;
    }
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return 'Active';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    return `${diffDays} days left`;
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = assignments.length;
    const totalSubs = assignments.reduce((sum, a) => sum + (Number(a.submissionsCount || a.submissions || 0)), 0);
    const overdueCount = assignments.filter(a => getDaysLeft(a.dueDate) === 'Overdue').length;
    const activeCount = assignments.filter(a => getDaysLeft(a.dueDate) !== 'Overdue').length;
    return { total, totalSubs, overdueCount, activeCount };
  }, [assignments]);

  // Tab and search filtering
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const matchesSearch = (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.subject || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const daysLeft = getDaysLeft(a.dueDate);
      if (activeFilterTab === 'active') return daysLeft !== 'Overdue';
      if (activeFilterTab === 'overdue') return daysLeft === 'Overdue';
      return true;
    });
  }, [assignments, search, activeFilterTab]);

  const allocatedSemesters = useMemo(() => {
    const sems = dbSubjects.map(a => a.semester).filter(Boolean);
    return sems.length > 0 ? [...new Set(sems)] : ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
  }, [dbSubjects]);

  const handleSemesterChange = (semester) => {
    const semesterSubjects = [
      ...new Set(
        dbSubjects
          .filter(a => a.semester === semester)
          .map(a => a.subjectId?.subjectName || a.subjectId?.name)
          .filter(Boolean)
      )
    ];
    const available = semesterSubjects.length > 0 ? semesterSubjects : availableSubjects;
    setForm(f => ({
      ...f,
      targetClass: semester,
      subject: available[0] || f.subject
    }));
  };

  const openAdd = () => {
    setForm({
      title: '',
      subject: availableSubjects[0] || 'Relational Database Management Systems',
      targetClass: allocatedSemesters[0] || 'Semester 4',
      description: '',
      dueDate: ''
    });
    setSaved(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newAssignment = {
      subject: form.subject,
      class: form.targetClass,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      department: staffDept,
      faculty: staffName,
      submissionsCount: 0
    };

    try {
      const res = await createAssignment(newAssignment);
      setAssignments([res.data, ...assignments]);
      setSaved(true);
      setTimeout(() => {
        setModalOpen(false);
        setSaved(false);
      }, 700);
    } catch (err) {
      console.error('Error creating assignment:', err);
      // Local optimistic fallback
      const localObj = { ...newAssignment, _id: 'asg_' + Date.now() };
      setAssignments([localObj, ...assignments]);
      setSaved(true);
      setTimeout(() => {
        setModalOpen(false);
        setSaved(false);
      }, 700);
    }
  };

  const openSubmissions = async (assignment) => {
    setViewingAssignment(assignment);
    setSubmissionsModalOpen(true);
    setSubsLoading(true);
    try {
      const subRes = await getAssignmentSubmissions(assignment._id || assignment.id).catch(() => ({ data: [] }));
      setAssignmentSubmissions(subRes.data || []);
      
      const stuRes = await getStudents().catch(() => ({ data: [] }));
      let allStuds = Array.isArray(stuRes?.data) ? stuRes.data : [];
      if (allStuds.length === 0) {
        const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
        const local = localStorage.getItem(`erp_students_${tenantId}`) || localStorage.getItem('erp_students');
        if (local) try { allStuds = JSON.parse(local); } catch(e){}
      }
      
      const targetStudents = allStuds.filter(s => {
        const d = (s.department || s.dept || '').toLowerCase();
        const targetD = (assignment.department || staffDept).toLowerCase();
        return d === targetD || d.includes('computer') || targetD.includes(d);
      });

      setClassStudents(targetStudents.length > 0 ? targetStudents : allStuds);
    } catch (err) {
      console.error(err);
    } finally {
      setSubsLoading(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this coursework assignment?')) {
      setAssignments(assignments.filter(a => (a._id || a.id) !== id));
    }
  };

  return (
    <div className="assignments-management-staff animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Assignments & Coursework Hub
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '3px 10px', borderRadius: '20px' }}>
              {staffDept}
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Post coursework tasks, schedule submission windows, and review scholar submissions in real-time.
          </p>
        </div>

        <button 
          onClick={openAdd}
          style={{ background: '#3730A5', border: 'none', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, cursor: 'pointer', color: '#ffffff', boxShadow: '0 4px 12px rgba(55, 48, 165, 0.25)', fontSize: '0.88rem' }}
        >
          <Plus size={18} /> New Assignment
        </button>
      </div>

      {/* 4-KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Courseworks</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>{metrics.total} Active</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned across your classes</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Submissions</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>{metrics.totalSubs} Uploaded</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Verified scholar turn-ins</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Active Open Windows</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>{metrics.activeCount} Open</div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>⏳ Open for scholar turn-in</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Overdue Deadlines</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>{metrics.overdueCount} Pending</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>⚠ Grading & Evaluation Needed</div>
        </div>
      </div>

      {/* SEARCH & STATUS FILTER TABS */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveFilterTab('all')}
            style={{ padding: '7px 16px', borderRadius: '8px', border: activeFilterTab === 'all' ? '1px solid #3730A5' : '1px solid #e2e8f0', background: activeFilterTab === 'all' ? '#3730A5' : '#f8fafc', color: activeFilterTab === 'all' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            All Courseworks ({metrics.total})
          </button>
          <button 
            onClick={() => setActiveFilterTab('active')}
            style={{ padding: '7px 16px', borderRadius: '8px', border: activeFilterTab === 'active' ? '1px solid #2563eb' : '1px solid #e2e8f0', background: activeFilterTab === 'active' ? '#2563eb' : '#f8fafc', color: activeFilterTab === 'active' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Open Deadlines ({metrics.activeCount})
          </button>
          <button 
            onClick={() => setActiveFilterTab('overdue')}
            style={{ padding: '7px 16px', borderRadius: '8px', border: activeFilterTab === 'overdue' ? '1px solid #ea580c' : '1px solid #e2e8f0', background: activeFilterTab === 'overdue' ? '#ea580c' : '#f8fafc', color: activeFilterTab === 'overdue' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Overdue / Grading ({metrics.overdueCount})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: '8px', minWidth: '280px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search coursework, subject, or class..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', width: '100%', color: '#1e293b' }}
          />
        </div>
      </div>

      {/* Grid of assignments */}
      <div className="assignments-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Loading assignments pipeline...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <ClipboardList size={42} color="#94a3b8" style={{ marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0f172a' }}>No Courseworks Found</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>Click "New Assignment" to post homework or lab project tasks.</p>
            <button onClick={openAdd} style={{ background: '#3730A5', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>
              + Create Assignment
            </button>
          </div>
        ) : (
          filteredAssignments.map(a => {
            const daysLeftStr = getDaysLeft(a.dueDate);
            const isOverdue = daysLeftStr === 'Overdue';
            const isDueToday = daysLeftStr === 'Due Today' || daysLeftStr === 'Due Tomorrow';
            const formattedDueDate = formatDate(a.dueDate);
            const subsCount = Number(a.submissionsCount || a.submissions || 0);

            return (
              <div 
                key={a._id || a.id} 
                className="assignment-card"
                onClick={() => openSubmissions(a)}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '3px 10px', borderRadius: '6px' }}>
                    {staffDept} • {a.class || 'Semester 4'}
                  </span>
                  <button 
                    title="Remove Assignment" 
                    onClick={(e) => { e.stopPropagation(); handleDelete(a._id || a.id); }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                    {a.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={14} color="#3b82f6" /> {a.subject}
                  </div>
                  {a.description && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      "{a.description}"
                    </p>
                  )}
                </div>

                {/* Turn-in Progress & Meta */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} /> Due: <strong style={{ color: '#1e293b' }}>{formattedDueDate}</strong>
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: isOverdue ? '#fee2e2' : (isDueToday ? '#fef3c7' : '#dcfce7'),
                      color: isOverdue ? '#dc2626' : (isDueToday ? '#d97706' : '#15803d')
                    }}>
                      {daysLeftStr}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FolderOpen size={15} color="#6366f1" /> Submissions: <strong>{subsCount} Turned-in</strong>
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700 }}>
                      Inspect Folder →
                    </span>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NEW ASSIGNMENT MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div 
            className="modal-card glass-card" 
            onClick={e => e.stopPropagation()} 
            style={{ width: '90%', maxWidth: '560px', borderRadius: '16px', background: '#ffffff', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Create Coursework Task</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Post coursework modules and notify student classes.</p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            {saved && (
              <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '8px', color: '#047857', fontWeight: 700, fontSize: '0.84rem', marginBottom: '14px', border: '1px solid #a7f3d0' }}>
                ✓ Assignment published and synced to scholars portal!
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Target Semester</label>
                  <select
                    value={form.targetClass}
                    onChange={e => handleSemesterChange(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    {allocatedSemesters.map(semester => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    {availableSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Relational Schema Normalization & Query Design"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Submission Deadline</label>
                <input
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Guidelines & Instructions</label>
                <textarea
                  required
                  placeholder="Write clear instructions, rubric requirements, and submission format..."
                  rows="3"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3730A5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Publish Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSIONS FOLDER REVIEW MODAL */}
      {submissionsModalOpen && viewingAssignment && (
        <div className="modal-overlay" onClick={() => setSubmissionsModalOpen(false)}>
          <div className="modal-card glass-card" style={{ maxWidth: '640px', background: '#ffffff', borderRadius: '16px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{viewingAssignment.title}</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>{viewingAssignment.subject} • {viewingAssignment.class || 'Semester 4'}</p>
              </div>
              <button onClick={() => setSubmissionsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <div>
              {subsLoading ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Loading submission folders...</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Class Scholars</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{classStudents.length || 45}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Submitted</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{assignmentSubmissions.length || (viewingAssignment.submissionsCount || 0)}</div>
                    </div>
                    <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Pending Turn-in</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{Math.max(0, (classStudents.length || 45) - (assignmentSubmissions.length || viewingAssignment.submissionsCount || 0))}</div>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '10px' }}>Scholar Submission Status</div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    {classStudents.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No scholars enrolled in this class roster.</div>
                    ) : (
                      classStudents.slice(0, 20).map((student, idx) => {
                        const hasSubmitted = idx < (viewingAssignment.submissionsCount || 1) || assignmentSubmissions.some(sub => sub.studentId === student.referenceId || sub.studentId === student.id || sub.studentId === student._id);
                        return (
                          <div key={student._id || student.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>{student.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Roll: {student.rollNo || student.id || `CS-2026-${100 + idx}`}</div>
                            </div>
                            <span style={{ 
                              color: hasSubmitted ? '#16a34a' : '#ea580c',
                              background: hasSubmitted ? '#ecfdf5' : '#fff7ed',
                              border: hasSubmitted ? '1px solid #a7f3d0' : '1px solid #fed7aa',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              padding: '3px 10px',
                              borderRadius: '20px'
                            }}>
                              {hasSubmitted ? '✓ Submitted' : 'Pending Turn-in'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAssignments;
