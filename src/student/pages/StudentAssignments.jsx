import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, submitAssignment as apiSubmitAssignment, getStudentSubmissions } from '../../api/index';
import { ClipboardList, Calendar, Users, X, CheckCircle, FileText, ArrowLeft, UploadCloud } from 'lucide-react';
import './StudentAssignments.css';

// Fallbacks
const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Computer Science',
  sem: 'Sem 6',
  email: 'john@college.edu'
};

const StudentAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);
  const [assignments, setAssignments] = useState([]);

  // Submission popup state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [fileName, setFileName] = useState('');
  const [submittedTasks, setSubmittedTasks] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      const session = sessionStorage.getItem('student_session');
      let activeStud = DEFAULT_STUDENT;
      if (session) {
        activeStud = JSON.parse(session);
        setStudentSession(activeStud);
      } else {
        navigate('/student/login');
        return;
      }

      let studentSem = activeStud.sem;
      let studentDept = activeStud.dept;
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const localMatch = erpStudents.find(s => s.id === activeStud.id || s.rollNo === activeStud.id);
      
      if (localMatch) {
        if (!studentSem && (localMatch.sem || localMatch.semester)) {
          studentSem = localMatch.sem || localMatch.semester;
        }
        if (localMatch.dept || localMatch.department) {
          studentDept = localMatch.dept || localMatch.department;
        }
      }

      studentSem = studentSem || 'Sem 1';
      console.log('Fetching assignments for:', studentDept, studentSem);

      try {
        const res = await getAssignments();
        console.log('All Assignments:', res.data);
        
        // Filter locally to allow demo testing across departments
        const filtered = (res.data || []).filter(a => {
          // Relaxed for demo: allow them to see it regardless of department so they can test the flow
          return true;
        });
        
        console.log('Filtered Assignments for student:', filtered);
        setAssignments(filtered);
        
        const subRes = await getStudentSubmissions(activeStud.id);
        const subDict = {};
        if (subRes.data) {
          subRes.data.forEach(s => {
            subDict[s.assignmentId] = s;
          });
        }
        setSubmittedTasks(subDict);
      } catch (err) {
        console.warn('Failed to load DB assignments');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const openSubmit = (task) => {
    setActiveTask(task);
    setFileName('');
    setSuccess(false);
    setSubmitOpen(true);
  };

  const closeSubmit = () => {
    setSubmitOpen(false);
    setActiveTask(null);
  };

  const handleMockSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      const payload = {
        studentId: studentSession.id,
        studentName: studentSession.name,
        department: studentSession.dept,
        fileName: fileName || 'assignment_submission.pdf'
      };
      
      const res = await apiSubmitAssignment(activeTask._id || activeTask.id, payload);
      
      setSubmittedTasks(prev => ({
        ...prev,
        [activeTask._id || activeTask.id]: res.data
      }));

      setSuccess(true);
      setTimeout(() => {
        closeSubmit();
        setSuccess(false);
      }, 800);
    } catch (err) {
      alert('Error submitting assignment');
    }
  };

  return (
    <div className="student-assignments-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          
          <div>
            <h1>Course Assignments</h1>
            <p className="text-muted">Stay up to date with tasks assigned by your instructors and upload submissions.</p>
          </div>
        </div>
      </div>

      <div className="student-assignments-grid">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card assignment-skeleton-card">
              <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '1rem' }}></div>
              <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '0.6rem' }}></div>
              <div className="skeleton" style={{ height: '36px', width: '100%' }}></div>
            </div>
          ))
        ) : assignments.length === 0 ? (
          <div className="glass-card no-assignments-banner-s col-span-full">
            <ClipboardList size={40} className="text-muted" style={{ marginBottom: '1rem' }} />
            <h3>No Pending Assignments</h3>
            <p className="text-muted">Your semester courses do not have active homework tasks assigned.</p>
          </div>
        ) : (
          assignments.map(a => {
            const assignmentId = a._id || a.id;
            const isSubmitted = !!submittedTasks[assignmentId];
            const subData = submittedTasks[assignmentId];

            return (
              <div key={assignmentId} className="glass-card s-assignment-card">
                <div className="s-assignment-header">
                  <span className="subject-code-tag" style={{ background: 'rgba(55, 48, 165, 0.1)', color: '#3730A5', border: '1px solid rgba(55, 48, 165, 0.2)' }}>{a.subject}</span>
                  <span className={`status-pill ${isSubmitted ? 'submitted' : 'pending'}`}>
                    {isSubmitted ? '✓ Submitted' : 'Pending Submission'}
                  </span>
                </div>

                <div className="s-assignment-body">
                  <h3>{a.title}</h3>
                  <p className="instructor-label">Instructor: <strong>{a.faculty}</strong></p>
                  <p className="guideline-text">"{a.description}"</p>
                </div>

                <div className="s-assignment-footer">
                  <div className="footer-details-row">
                    <div className="detail-item">
                      <Calendar size={14} />
                      <span>Due Date: <strong>{a.dueDate}</strong></span>
                    </div>
                  </div>

                  {isSubmitted ? (
                    <div className="submitted-file-info" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', background: 'var(--bg-secondary)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <FileText size={14} className="text-primary-s" />
                        <span>{subData.fileName}</span>
                      </div>
                      <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: 'var(--primary)' }} onClick={() => openSubmit(a)}>
                        Resubmit
                      </button>
                    </div>
                  ) : (
                    <button className="btn-submit-task" style={{ background: '#3730A5', color: 'white', boxShadow: '0 4px 10px rgba(55, 48, 165, 0.25)', border: 'none' }} onClick={() => openSubmit(a)}>
                      <UploadCloud size={14} /> Submit Task
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mock Submit Dialog */}
      {submitOpen && (
        <div className="modal-overlay" onClick={closeSubmit}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Upload Coursework</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>{activeTask?.title}</p>
              </div>
              <button className="btn-icon" onClick={closeSubmit}><X size={20} /></button>
            </div>

            {success && (
              <div className="modal-success-flash">
                <CheckCircle size={18} /> Assignment submitted successfully!
              </div>
            )}

            <form onSubmit={handleMockSubmit} className="modal-form">
              <div className="form-group">
                <label>File Upload (Simulated)</label>
                <div className="mock-upload-zone">
                  <UploadCloud size={32} className="text-primary-s" />
                  <p className="text-sm text-muted">Click or drag a file to this zone to upload</p>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dbms_assignment_john.pdf"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', marginTop: '0.5rem', textAlign: 'center' }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeSubmit}>Cancel</button>
                <button type="submit" className="btn-primary">Upload File</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
