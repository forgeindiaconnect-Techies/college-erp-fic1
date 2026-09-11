import React, {
  useState,
  useEffect,
  useCallback
} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, submitAssignment as apiSubmitAssignment, getStudentSubmissions } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { ClipboardList, Calendar, Users, X, CheckCircle, FileText, ArrowLeft, UploadCloud } from 'lucide-react';
import './StudentAssignments.css';

const StudentAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(null);
  const [assignments, setAssignments] = useState([]);

  // Submission popup state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [fileName, setFileName] = useState('');
  const [submittedTasks, setSubmittedTasks] = useState({});
  const [success, setSuccess] = useState(false);

  const loadAssignments = useCallback(async () => {
    const session =
      sessionStorage.getItem('student_session');

    if (!session) {
      navigate('/student/login');
      return;
    }

    const activeStudent = JSON.parse(session);
    const studentId =
      activeStudent.id ||
      activeStudent.referenceId;

    setStudentSession(activeStudent);

    if (!studentId) {
      setAssignments([]);
      setSubmittedTasks({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [assignmentResponse, submissionResponse] =
        await Promise.all([
          getAssignments(),
          getStudentSubmissions(studentId)
        ]);

      const assignmentData =
        Array.isArray(assignmentResponse?.data)
          ? assignmentResponse.data
          : [];

      const submissionData =
        Array.isArray(submissionResponse?.data)
          ? submissionResponse.data
          : [];

      const submissionMap = {};

      submissionData.forEach(submission => {
        submissionMap[submission.assignmentId] =
          submission;
      });

      setAssignments(assignmentData);
      setSubmittedTasks(submissionMap);
    } catch (error) {
      console.error(
        'Failed to load student assignments:',
        error
      );
      setAssignments([]);
      setSubmittedTasks({});
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useRealtimeSync(
    loadAssignments,
    'assignments'
  );

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

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      const studentId =
        studentSession?.id ||
        studentSession?.referenceId;

      if (!studentId || !studentSession?.name) {
        alert('Student session is incomplete.');
        return;
      }

      if (!fileName) {
        alert('Please select a submission file.');
        return;
      }

      const payload = {
        studentId,
        studentName: studentSession.name,
        department:
          studentSession.dept ||
          studentSession.department ||
          '',
        fileName
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
      console.error('Submission error:', err);
      alert(err.response?.data?.message || 'Error submitting assignment');
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

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>File Upload</label>
                <div
                  className="mock-upload-zone"
                  style={{ position: 'relative', cursor: 'pointer', padding: '1.5rem', border: '2px dashed var(--border-color)', borderRadius: '10px', textAlign: 'center' }}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <UploadCloud size={36} className="text-primary-s" style={{ margin: '0 auto 0.5rem' }} />
                  <p className="text-sm text-muted">Click to select a file or type a filename below</p>
                  <div style={{ marginTop: '0.8rem' }} onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="e.g. dbms_assignment_john.pdf"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                      style={{ background: 'var(--bg-secondary)', width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                  </div>
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
