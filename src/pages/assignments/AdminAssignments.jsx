import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Calendar, Users, FileText, ArrowLeft, BookOpen, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, getAssignmentSubmissions, getStudents } from '../../api/index';

const AdminAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All Departments');

  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const openSubmissions = async (assignment) => {
    setViewingAssignment(assignment);
    setSubmissionsModalOpen(true);
    setSubsLoading(true);
    try {
      const subRes = await getAssignmentSubmissions(assignment._id || assignment.id);
      setAssignmentSubmissions(subRes.data || []);
      
      const stuRes = await getStudents();
      const allStuds = stuRes.data || [];
      const targetStudents = allStuds.filter(s => 
        (s.dept === assignment.department || s.department === assignment.department) && 
        (s.sem === assignment.class || s.semester === assignment.class)
      );
      setClassStudents(targetStudents);
    } catch (err) {
      console.error(err);
    } finally {
      setSubsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('admin_session');
    if (!session) {
      navigate('/login');
      return;
    }

    // 2. Load assignments from backend API
    const loadData = async () => {
      try {
        const res = await getAssignments();
        setAssignments(res.data || []);
      } catch (err) {
        console.error('Failed to load assignments', err);
        // Fallback to local storage if API fails completely
        const savedAssignments = localStorage.getItem(`erp_assignments_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
        if (savedAssignments) {
          setAssignments(JSON.parse(savedAssignments));
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [navigate]);

  const departments = [
    'All Departments',
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

  // Filter assignments by selected department
  let filteredAssignments = assignments;
  if (filterDept !== 'All Departments') {
    filteredAssignments = filteredAssignments.filter(a => {
      let dept = a.department;
      if (dept === 'Computer Science') dept = 'Computer Science Engineering';
      else if (dept === 'Electronics & Comm.') dept = 'Electronics & Communication Engineering';
      else if (dept === 'Electrical Engg.') dept = 'Electrical & Electronics Engineering';
      else if (dept === 'Mechanical Engg.') dept = 'Mechanical Engineering';
      else if (dept === 'Civil Engg.') dept = 'Civil Engineering';
      else if (dept === 'Information Tech.') dept = 'Information Technology';
      return dept === filterDept;
    });
  }

  filteredAssignments = filteredAssignments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase()) ||
    a.faculty.toLowerCase().includes(search.toLowerCase()) ||
    (a.department && a.department.toLowerCase().includes(search.toLowerCase()))
  );

  const getDaysLeft = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    return `${diffDays} days left`;
  };

  return (
    <div className="assignments-management-staff animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header-staff" style={{ background: 'transparent', padding: '0 0 1.5rem 0' }}>
        <div className="header-left">
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)' }}>College-Wide Assignments Oversight</h1>
            <p className="text-muted" style={{ marginTop: '0.3rem' }}>Monitor coursework and homework assigned by faculty across all departments.</p>
          </div>
        </div>
      </div>

      <div className="glass-card search-card-assignments" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
        <div className="table-filters-bar" style={{ borderBottom: 'none', padding: '1rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-box-attendance" style={{ flex: '1', minWidth: '300px' }}>
            <Search size={17} className="search-icon" />
            <input
              type="text"
              placeholder="Search by faculty, subject, title, or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="search-box-attendance" style={{ flex: '0 1 250px' }}>
            <Layers size={17} className="search-icon" />
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', paddingLeft: '0.5rem' }}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="assignments-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card assignment-skeleton-card">
              <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '1rem' }}></div>
              <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '0.6rem' }}></div>
              <div className="skeleton" style={{ height: '36px', width: '100%' }}></div>
            </div>
          ))
        ) : filteredAssignments.length === 0 ? (
          <div className="glass-card no-assignments-banner col-span-full" style={{ padding: '3rem', textAlign: 'center' }}>
            <ClipboardList size={40} className="text-muted" style={{ marginBottom: '1rem', margin: '0 auto' }} />
            <h3>No Active Assignments</h3>
            <p className="text-muted">No assignments matching your filters have been posted.</p>
          </div>
        ) : (
          filteredAssignments.map(a => {
            const daysLeftStr = getDaysLeft(a.dueDate);
            const isOverdue = daysLeftStr === 'Overdue';
            const isDueToday = daysLeftStr === 'Due Today';

            return (
              <div key={a._id || a.id} className="glass-card assignment-card" onClick={() => openSubmissions(a)} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                <div className="assignment-card-header">
                  <span className="assignment-class-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {(() => {
                      let dept = a.department || 'General';
                      if (dept === 'Computer Science') dept = 'Computer Science Engineering';
                      else if (dept === 'Electronics & Comm.') dept = 'Electronics & Communication Engineering';
                      else if (dept === 'Electrical Engg.') dept = 'Electrical & Electronics Engineering';
                      else if (dept === 'Mechanical Engg.') dept = 'Mechanical Engineering';
                      else if (dept === 'Civil Engg.') dept = 'Civil Engineering';
                      else if (dept === 'Information Tech.') dept = 'Information Technology';
                      return dept;
                    })()} - {a.class}
                  </span>
                  <span className="instructor-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By: {a.faculty}</span>
                </div>

                <div className="assignment-card-body" style={{ flex: 1 }}>
                  <h3 className="assignment-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{a.title}</h3>
                  <p className="assignment-subject-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <BookOpen size={13} /> {a.subject}
                  </p>
                  <p className="assignment-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>"{a.description}"</p>
                </div>

                <div className="assignment-card-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="assignment-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <Calendar size={14} className="meta-icon" />
                      <span>Due: <strong>{a.dueDate}</strong></span>
                    </div>

                    <div className="assignment-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <Users size={14} className="meta-icon" />
                      <span>Subs: <strong>{a.submissionsCount || 0}</strong></span>
                    </div>
                  </div>

                  <div className={`assignment-deadline-badge ${isOverdue ? 'overdue' : isDueToday ? 'today' : 'active'}`} style={{ 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : isDueToday ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : '#10b981'
                  }}>
                    {daysLeftStr}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {submissionsModalOpen && viewingAssignment && (
        <div className="modal-overlay" onClick={() => setSubmissionsModalOpen(false)}>
          <div className="modal-card glass-card" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Submissions: {viewingAssignment.title}</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>{viewingAssignment.department} - {viewingAssignment.class}</p>
              </div>
              <button className="btn-icon" onClick={() => setSubmissionsModalOpen(false)}>Close</button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {subsLoading ? (
                <p>Loading submissions...</p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="stat-box" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                      <h4>Total Students</h4>
                      <h2>{classStudents.length}</h2>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                      <h4>Submitted</h4>
                      <h2>{assignmentSubmissions.length}</h2>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                      <h4>Pending</h4>
                      <h2>{Math.max(0, classStudents.length - assignmentSubmissions.length)}</h2>
                    </div>
                  </div>
                  
                  <h4>Student List</h4>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                    {classStudents.length === 0 ? (
                      <li className="text-muted">No students found in this class.</li>
                    ) : (
                      classStudents.map(student => {
                        const hasSubmitted = assignmentSubmissions.some(sub => sub.studentId === student.referenceId || sub.studentId === student.id || sub.studentId === student._id);
                        return (
                          <li key={student._id || student.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{student.name} ({student.rollNo || student.id})</span>
                            <span style={{ 
                              color: hasSubmitted ? '#10b981' : '#ef4444',
                              fontWeight: 'bold',
                              fontSize: '0.85rem'
                            }}>
                              {hasSubmitted ? '✓ Submitted' : 'Pending'}
                            </span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssignments;
