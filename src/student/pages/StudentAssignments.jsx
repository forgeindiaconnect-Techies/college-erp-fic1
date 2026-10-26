import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAssignments,
  submitAssignment as apiSubmitAssignment,
  getStudentSubmissions
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import {
  ClipboardList,
  Calendar,
  CheckCircle,
  FileText,
  UploadCloud,
  Clock,
  Search,
  RefreshCw,
  Award,
  ChevronRight,
  XCircle,
  X,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  User,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import './StudentAssignments.css';

const StudentAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'submitted' | 'cia'
  const [searchQuery, setSearchQuery] = useState('');

  // Submission popup state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [fileName, setFileName] = useState('');
  const [submittedTasks, setSubmittedTasks] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadAssignments = useCallback(async () => {
    const session = sessionStorage.getItem('student_session');

    if (!session) {
      navigate('/student/login');
      return;
    }

    const activeStudent = JSON.parse(session);
    const studentId =
      activeStudent.id ||
      activeStudent.referenceId ||
      activeStudent._id ||
      activeStudent.studentId ||
      activeStudent.email ||
      'student';

    setStudentSession(activeStudent);

    try {
      setLoading(true);

      const [assignmentResponse, submissionResponse] = await Promise.all([
        getAssignments(),
        getStudentSubmissions(studentId).catch(() => ({ data: [] }))
      ]);

      const assignmentData = Array.isArray(assignmentResponse?.data)
        ? assignmentResponse.data
        : [];

      const submissionData = Array.isArray(submissionResponse?.data)
        ? submissionResponse.data
        : [];

      const submissionMap = {};
      submissionData.forEach(submission => {
        const aId = submission.assignmentId?._id || submission.assignmentId || submission.id;
        if (aId) {
          submissionMap[aId] = submission;
        }
      });

      const studentDept = (activeStudent.dept || activeStudent.department || '').toLowerCase().trim();
      const studentSem = (activeStudent.sem || activeStudent.semester || '').toLowerCase().trim();
      const studentSemNum = studentSem.replace(/\D/g, '');

      const filteredAssignments = assignmentData.filter(a => {
        const aDept = (a.department || a.dept || '').toLowerCase().trim();
        const aSem = (a.class || a.semester || a.sem || '').toLowerCase().trim();
        const aSemNum = aSem.replace(/\D/g, '');

        const isGeneral = !aDept || aDept === 'all' || aDept === 'general' || aDept === 'core curriculum';
        const deptMatch =
          isGeneral ||
          !studentDept ||
          aDept.includes(studentDept) ||
          studentDept.includes(aDept) ||
          (a.subject && (studentDept.includes(a.subject.toLowerCase()) || a.subject.toLowerCase().includes(studentDept)));

        const isAllSem = !aSem || aSem === 'all' || !studentSem;
        const semMatch =
          isAllSem ||
          aSem === studentSem ||
          (studentSemNum && aSemNum && studentSemNum === aSemNum) ||
          aSem.includes(studentSem) ||
          studentSem.includes(aSem);

        return deptMatch && semMatch;
      });

      setAssignments(filteredAssignments.length > 0 ? filteredAssignments : assignmentData);
      setSubmittedTasks(submissionMap);
    } catch (error) {
      console.error('Failed to load student assignments:', error);
      setAssignments([]);
      setSubmittedTasks({});
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useRealtimeSync(loadAssignments, 'assignments');

  // Computed metrics
  const pendingAssignments = useMemo(() => {
    return assignments.filter(a => !submittedTasks[a._id || a.id]);
  }, [assignments, submittedTasks]);

  const submittedAssignments = useMemo(() => {
    return assignments.filter(a => !!submittedTasks[a._id || a.id]);
  }, [assignments, submittedTasks]);

  const overdueAssignments = useMemo(() => {
    return pendingAssignments.filter(a => {
      if (!a.dueDate) return false;
      const d = new Date(a.dueDate);
      return !isNaN(d.getTime()) && d < new Date();
    });
  }, [pendingAssignments]);

  const isAllCleared = pendingAssignments.length === 0 && assignments.length > 0;
  const onTimeRate = assignments.length > 0
    ? Math.round((submittedAssignments.length / assignments.length) * 100)
    : 100;

  // Filtered list based on active tab and search query
  const displayedAssignments = useMemo(() => {
    let list = assignments;

    if (activeTab === 'pending') {
      list = pendingAssignments;
    } else if (activeTab === 'submitted') {
      list = submittedAssignments;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.subject || '').toLowerCase().includes(q) ||
        (a.faculty || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [assignments, activeTab, pendingAssignments, submittedAssignments, searchQuery]);

  // Submission Modal Handlers
  const openSubmit = (task) => {
    setActiveTask(task);
    setFileName('');
    setSuccess(false);
    setSubmitOpen(true);
  };

  const closeSubmit = () => {
    setSubmitOpen(false);
    setActiveTask(null);
    setSubmitting(false);
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
      setSubmitting(true);
      const studentId =
        studentSession?.id ||
        studentSession?.referenceId ||
        studentSession?._id;

      if (!studentId || !studentSession?.name) {
        alert('Student session is incomplete.');
        return;
      }

      if (!fileName.trim()) {
        alert('Please choose a file or type a filename for submission.');
        return;
      }

      const payload = {
        studentId,
        studentName: studentSession.name,
        department:
          studentSession.dept ||
          studentSession.department ||
          activeTask.department ||
          'General',
        fileName: fileName.trim()
      };

      const res = await apiSubmitAssignment(activeTask._id || activeTask.id, payload);

      setSubmittedTasks(prev => ({
        ...prev,
        [activeTask._id || activeTask.id]: res.data || {
          fileName: fileName.trim(),
          submittedAt: new Date().toISOString()
        }
      }));

      setSuccess(true);
      setTimeout(() => {
        closeSubmit();
        setSuccess(false);
      }, 700);
    } catch (err) {
      console.error('Submission error:', err);
      alert(err.response?.data?.message || 'Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="student-assignments-page animate-fade-in">
      {/* ── Top Header Bar ── */}
      <div className="assignments-top-header">
        <div className="assignments-header-left">
          <button
            type="button"
            className="btn-erp-back"
            onClick={() => navigate('/student/dashboard')}
          >
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back
          </button>
          <div className="assignments-title-group">
            <h1>Course Assignments & Continuous Assessments</h1>
            <p>
              Continuous internal assessments (CIA), coursework guidelines, due dates, and digital submissions.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="btn-erp-sync"
            onClick={loadAssignments}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Assignments
          </button>
        </div>
      </div>

      {/* ── Overall Assignment Compliance / Status Banner ── */}
      <div
        className={`assignments-status-banner ${
          isAllCleared ? 'banner-success' : 'banner-warning'
        }`}
      >
        <div
          className={`banner-icon-box-status ${
            isAllCleared ? 'icon-success' : 'icon-warning'
          }`}
        >
          {isAllCleared ? <CheckCircle size={26} /> : <XCircle size={26} />}
        </div>
        <div className="banner-info-body">
          <div className="banner-headline-row">
            <h2>Overall Assignment Status:</h2>
            <span
              className={`banner-badge-pill ${
                isAllCleared ? 'pill-success' : 'pill-warning'
              }`}
            >
              {isAllCleared
                ? 'All Coursework Cleared ✓'
                : 'Criteria Pending / Action Required'}
            </span>
          </div>

          <p className="banner-desc">
            {isAllCleared
              ? `All semester continuous assessments have been submitted on schedule. Your submissions are recorded for final Continuous Internal Assessment (CIA) credit.`
              : `Please ensure your coursework solutions are submitted before the scheduled due dates for continuous assessment evaluation.`}
          </p>

          <div className="banner-bullets-row">
            <span className="banner-bullet-item" style={{ color: pendingAssignments.length > 0 ? '#dc2626' : '#15803d' }}>
              • {pendingAssignments.length} Pending Submissions
            </span>
            <span className="banner-bullet-item" style={{ color: '#15803d' }}>
              • {submittedAssignments.length} Submitted Under Review
            </span>
            {overdueAssignments.length > 0 && (
              <span className="banner-bullet-item" style={{ color: '#dc2626', fontWeight: 800 }}>
                • ⚠️ {overdueAssignments.length} Overdue Task(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 4-Card Executive KPI Metrics Strip ── */}
      <div className="assignments-kpi-grid">
        {/* KPI 1: Total Assignments */}
        <div className="assignment-kpi-card blue">
          <div className="kpi-header-line">
            <span className="kpi-title-label blue">Total Coursework</span>
            <div className="kpi-icon-bubble blue">
              <BookOpen size={18} />
            </div>
          </div>
          <div className="kpi-number-display blue">{assignments.length}</div>
          <div className="kpi-subtitle-note">
            {studentSession?.department || studentSession?.dept || 'Core Curriculum'} • Sem {studentSession?.sem || '1'}
          </div>
        </div>

        {/* KPI 2: Pending Submissions */}
        <div className="assignment-kpi-card amber">
          <div className="kpi-header-line">
            <span className="kpi-title-label amber">Pending Submission</span>
            <div className="kpi-icon-bubble amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-number-display amber">{pendingAssignments.length}</div>
          <div className="kpi-subtitle-note" style={{ color: pendingAssignments.length > 0 ? '#b45309' : '#15803d' }}>
            {pendingAssignments.length > 0 ? 'Requires Student Upload' : 'Zero Pending Tasks ✓'}
          </div>
        </div>

        {/* KPI 3: Submitted Coursework */}
        <div className="assignment-kpi-card green">
          <div className="kpi-header-line">
            <span className="kpi-title-label green">Submitted Tasks</span>
            <div className="kpi-icon-bubble green">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="kpi-number-display green">{submittedAssignments.length}</div>
          <div className="kpi-subtitle-note" style={{ color: '#15803d' }}>
            Under Faculty Evaluation
          </div>
        </div>

        {/* KPI 4: CIA Completion Rate */}
        <div className="assignment-kpi-card purple">
          <div className="kpi-header-line">
            <span className="kpi-title-label purple">CIA Completion</span>
            <div className="kpi-icon-bubble purple">
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-number-display purple">{onTimeRate}%</div>
          <div className="kpi-subtitle-note" style={{ color: '#6d28d9' }}>
            Internal Assessment Weightage
          </div>
        </div>
      </div>

      {/* ── Tab Navigation & Search Bar ── */}
      <div className="assignments-tabs-bar">
        <div className="assignments-tabs-list">
          {[
            { key: 'all', label: `📋 All Coursework (${assignments.length})` },
            { key: 'pending', label: `⏳ Pending (${pendingAssignments.length})` },
            { key: 'submitted', label: `✓ Submitted (${submittedAssignments.length})` },
            { key: 'cia', label: '🎓 Continuous Assessment (CIA) Guidelines' }
          ].map(t => (
            <button
              key={t.key}
              type="button"
              className={`tab-nav-btn ${activeTab === t.key ? 'active' : 'inactive'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab !== 'cia' && (
          <div className="assignments-search-wrapper">
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, #94a3b8)'
              }}
            />
            <input
              type="text"
              className="assignments-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search subject, topic, or instructor..."
            />
          </div>
        )}
      </div>

      {/* ── TAB 1 / 2 / 3: Coursework Cards Grid ── */}
      {activeTab !== 'cia' && (
        <>
          {loading ? (
            <div className="assignments-cards-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="assignment-erp-card" style={{ minHeight: 220, opacity: 0.6 }}>
                  <div style={{ height: 20, width: '40%', background: '#e2e8f0', borderRadius: 4 }} />
                  <div style={{ height: 28, width: '75%', background: '#e2e8f0', borderRadius: 6, margin: '10px 0' }} />
                  <div style={{ height: 16, width: '50%', background: '#e2e8f0', borderRadius: 4 }} />
                  <div style={{ height: 38, width: '100%', background: '#e2e8f0', borderRadius: 8, marginTop: 'auto' }} />
                </div>
              ))}
            </div>
          ) : displayedAssignments.length === 0 ? (
            <div className="empty-assignments-box">
              <div className="empty-assignments-icon">
                <ClipboardList size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                No Assignments Found
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b', maxWidth: 420 }}>
                {searchQuery
                  ? `No coursework matched your search term "${searchQuery}". Clear your search or try another query.`
                  : activeTab === 'pending'
                  ? 'Great job! You have submitted all assigned coursework for your active semester courses.'
                  : activeTab === 'submitted'
                  ? 'No completed submissions yet. Choose a pending task to submit your solution.'
                  : 'Your department instructors have not scheduled active assignments at this moment.'}
              </p>
            </div>
          ) : (
            <div className="assignments-cards-grid">
              {displayedAssignments.map(a => {
                const assignmentId = a._id || a.id;
                const isSubmitted = !!submittedTasks[assignmentId];
                const subData = submittedTasks[assignmentId];
                const isOverdue = !isSubmitted && a.dueDate && new Date(a.dueDate) < new Date();

                const formattedDueDate = a.dueDate
                  ? new Date(a.dueDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'Flexible Schedule';

                return (
                  <div key={assignmentId} className="assignment-erp-card">
                    {/* Top Row: Subject Chip & Status Pill */}
                    <div className="assignment-card-top">
                      <span className="subject-tag-chip">
                        {a.subject || 'GENERAL'}
                      </span>
                      <span
                        className={`status-indicator-badge ${
                          isSubmitted ? 'submitted' : isOverdue ? 'overdue' : 'pending'
                        }`}
                      >
                        {isSubmitted
                          ? '✓ Submitted'
                          : isOverdue
                          ? '⚠️ Overdue'
                          : 'Pending Submission'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="assignment-card-body">
                      <h3 className="assignment-card-title">{a.title}</h3>
                      <div className="assignment-faculty-row">
                        <User size={13} />
                        <span>
                          Instructor: <strong>{a.faculty || 'Course Faculty'}</strong>
                        </span>
                      </div>
                      {a.description && (
                        <p className="assignment-guideline-quote">
                          "{a.description}"
                        </p>
                      )}
                    </div>

                    {/* Metadata Strip */}
                    <div className="assignment-card-meta-row">
                      <div className={`meta-chip-item ${isOverdue ? 'overdue' : ''}`}>
                        <Calendar size={13} />
                        <span>
                          Due Date: <strong>{formattedDueDate}</strong>
                        </span>
                      </div>
                      <div className="meta-chip-item">
                        <GraduationCap size={13} />
                        <span>CIA Weight: <strong>25 Marks</strong></span>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="assignment-card-footer">
                      {isSubmitted ? (
                        <div className="submitted-receipt-pill">
                          <span className="submitted-file-name" title={subData?.fileName}>
                            <FileCheck size={14} color="#15803d" />
                            {subData?.fileName || 'solution_submission.pdf'}
                          </span>
                          <button
                            type="button"
                            className="btn-resubmit-link"
                            onClick={() => openSubmit(a)}
                          >
                            Resubmit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-submit-coursework"
                          onClick={() => openSubmit(a)}
                        >
                          <UploadCloud size={15} /> Upload & Submit Solution
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB 4: Continuous Assessment (CIA) Guidelines ── */}
      {activeTab === 'cia' && (
        <div className="cia-guidelines-container">
          <div className="cia-card-policy">
            <div className="cia-policy-header">
              <div className="cia-policy-icon">
                <GraduationCap size={22} />
              </div>
              <div className="cia-policy-title">
                <h3>Institutional Continuous Internal Assessment (CIA) Regulations</h3>
                <p>Arignar Anna College of Arts & Science • Academic Evaluation Framework</p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
              The Continuous Internal Assessment (CIA) represents a vital component (25% to 40% weighting) of your consolidated semester grade. Regular and authentic submission of periodic homework, seminar papers, and research case studies is compulsory for semester exam hall ticket eligibility.
            </p>

            <div className="cia-breakdown-grid">
              <div className="cia-breakdown-item">
                <h4>1. Assignment & Case Studies</h4>
                <p>Minimum 2 comprehensive submissions per registered semester course, evaluated on conceptual depth and clarity.</p>
                <span className="weight-tag">Weightage: 10 Marks</span>
              </div>

              <div className="cia-breakdown-item">
                <h4>2. Periodic CIA Mid-Term Tests</h4>
                <p>Two continuous internal assessments conducted mid-semester to track syllabus progression.</p>
                <span className="weight-tag">Weightage: 10 Marks</span>
              </div>

              <div className="cia-breakdown-item">
                <h4>3. Classroom Attendance & Viva</h4>
                <p>Minimum 75% attendance threshold in lecture sessions and active seminar presentations.</p>
                <span className="weight-tag">Weightage: 5 Marks</span>
              </div>

              <div className="cia-breakdown-item">
                <h4>4. Submission Deadlines & Review</h4>
                <p>Digital uploads must be made in standard PDF format. Late submissions after deadline attract letter grade deductions.</p>
                <span className="weight-tag">Deadline: Strict Due Date</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Assignment Modal Dialog ── */}
      {submitOpen && (
        <div className="erp-assignment-modal-overlay" onClick={closeSubmit}>
          <div
            className="erp-assignment-modal-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="erp-modal-header">
              <div>
                <h3 className="erp-modal-title">Upload Coursework Solution</h3>
                <p className="erp-modal-subtitle">
                  {activeTask?.subject} • {activeTask?.title}
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={closeSubmit}
              >
                <X size={20} />
              </button>
            </div>

            {success && (
              <div
                style={{
                  margin: '16px 22px 0',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <CheckCircle size={18} /> Assignment submitted successfully!
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="erp-modal-body">
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Candidate Name:</span>
                    <strong style={{ color: '#0f172a' }}>{studentSession?.name || 'Student Scholar'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Department / Class:</span>
                    <strong style={{ color: '#0f172a' }}>{studentSession?.dept || 'Tamil'} • Sem {studentSession?.sem || '1'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Scheduled Due Date:</span>
                    <strong style={{ color: '#1e3a8a' }}>
                      {activeTask?.dueDate ? new Date(activeTask.dueDate).toLocaleDateString('en-IN') : 'Standard'}
                    </strong>
                  </div>
                </div>

                <div
                  className="upload-dropzone-box"
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <UploadCloud size={38} color="#2563eb" style={{ margin: '0 auto 6px' }} />
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                    {fileName ? fileName : 'Click to Browse Solution Document'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Supports PDF, DOCX, ZIP files up to 25MB
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Submission Filename *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. assignment1_solution_ram.pdf"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div className="erp-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={closeSubmit}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submitting || !fileName.trim()}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} /> Submit Coursework
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
