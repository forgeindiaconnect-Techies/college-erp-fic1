import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Calendar, Users, FileText, ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, getAssignmentSubmissions, getStudents } from '../../api/index';

const HodAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hodSession, setHodSession] = useState({ dept: 'Computer Science' });
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');

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
    const init = async () => {
      const session = sessionStorage.getItem('hod_session');
      let activeHod = { dept: 'Computer Science' };
      if (session) {
        activeHod = JSON.parse(session);
        setHodSession(activeHod);
      }
      
      try {
        const res = await getAssignments({ department: activeHod.dept });
        setAssignments(res.data || []);
      } catch (err) {
        console.warn('Failed to fetch hod assignments');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const hodDept = hodSession.dept;

  // Filter assignments by HOD's department (or show all if no dept tagged yet to avoid missing legacy mocks)
  const myDeptAssignments = assignments.filter(a => !a.department || a.department === hodDept);

  const filteredAssignments = myDeptAssignments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase()) ||
    a.faculty.toLowerCase().includes(search.toLowerCase())
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
    <div className="assignments-management-staff animate-fade-in">
      <div className="page-header-staff" style={{ background: 'transparent' }}>
        <div className="header-left">
          <div>
            <h1>Department Assignments Overview</h1>
            <p className="text-muted">Oversight of all coursework and homework assigned by faculty in your department.</p>
          </div>
        </div>
      </div>

      <div className="glass-card search-card-assignments">
        <div className="table-filters-bar" style={{ borderBottom: 'none', padding: '1rem 1.5rem' }}>
          <div className="search-box-attendance" style={{ width: '100%' }}>
            <Search size={17} className="search-icon" />
            <input
              type="text"
              placeholder="Search by faculty, subject, or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="assignments-grid">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card assignment-skeleton-card">
              <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '1rem' }}></div>
              <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '0.6rem' }}></div>
              <div className="skeleton" style={{ height: '36px', width: '100%' }}></div>
            </div>
          ))
        ) : filteredAssignments.length === 0 ? (
          <div className="glass-card no-assignments-banner col-span-full">
            <ClipboardList size={40} className="text-muted" style={{ marginBottom: '1rem' }} />
            <h3>No Active Assignments</h3>
            <p className="text-muted">Faculty in your department haven't posted any assignments recently.</p>
          </div>
        ) : (
          filteredAssignments.map(a => {
            const daysLeftStr = getDaysLeft(a.dueDate);
            const isOverdue = daysLeftStr === 'Overdue';
            const isDueToday = daysLeftStr === 'Due Today';

            return (
              <div key={a._id || a.id} className="glass-card assignment-card" onClick={() => openSubmissions(a)} style={{ cursor: 'pointer' }}>
                <div className="assignment-card-header">
                  <span className="assignment-class-badge">{a.department || hodDept} - {a.class}</span>
                  <span className="instructor-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By: {a.faculty}</span>
                </div>

                <div className="assignment-card-body">
                  <h3 className="assignment-title">{a.title}</h3>
                  <p className="assignment-subject-tag"><BookOpen size={13} /> {a.subject}</p>
                  <p className="assignment-desc">"{a.description}"</p>
                </div>

                <div className="assignment-card-footer">
                  <div className="assignment-meta-item">
                    <Calendar size={14} className="meta-icon" />
                    <span>Due: <strong>{a.dueDate}</strong></span>
                  </div>

                  <div className="assignment-meta-item">
                    <Users size={14} className="meta-icon" />
                    <span>Submissions: <strong>{a.submissionsCount || 0}</strong></span>
                  </div>

                  <div className={`assignment-deadline-badge ${isOverdue ? 'overdue' : isDueToday ? 'today' : 'active'}`}>
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

export default HodAssignments;
