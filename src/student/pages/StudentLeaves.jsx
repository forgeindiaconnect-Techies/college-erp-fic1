import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Calendar, Plus, Clock, CheckCircle2,
  XCircle, AlertCircle, ArrowLeft, Send
} from 'lucide-react';
import './StudentLeaves.css';

// Fallbacks
const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Computer Science',
  sem: 'Sem 6',
  email: 'john@college.edu'
};

const MOCK_LEAVES = [
  { id: '101', staffId: 'CS2022001', staffName: 'John Doe', type: 'Medical Leave', startDate: '2026-05-02', endDate: '2026-05-04', reason: 'Flu recovery, medical certificate attached.', status: 'Approved' }
];

const StudentLeaves = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);

  // Leave Requests database state
  const [leaves, setLeaves] = useState([]);

  // Form State
  const [form, setForm] = useState({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('student_session');
    let activeStud = DEFAULT_STUDENT;
    if (session) {
      activeStud = JSON.parse(session);
      setStudentSession(activeStud);
    } else {
      navigate('/student/login');
      return;
    }

    // 2. Load leaves
    const savedLeaves = localStorage.getItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (savedLeaves) {
      setLeaves(JSON.parse(savedLeaves));
    } else {
      localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(MOCK_LEAVES));
      setLeaves([]);
    }

    setLoading(false);
  }, [navigate]);

  const studentId = studentSession.id;
  const studentName = studentSession.name;

  // Filter leaves to current student
  const myLeaves = leaves.filter(l => l.staffId === studentId);

  // Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const newLeave = {
      id: String(Date.now()),
      staffId: studentId,
      staffName: studentName,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      status: 'Pending'
    };

    const updated = [...leaves, newLeave];
    setLeaves(updated);
    localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));

    setSuccess(true);
    setForm({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
    setTimeout(() => {
      setSuccess(false);
    }, 1500);
  };

  const getStatusIcon = (status) => {
    if (status === 'Approved') return <CheckCircle2 size={16} className="text-success" />;
    if (status === 'Pending') return <Clock size={16} className="text-warning-s" />;
    return <XCircle size={16} className="text-danger" />;
  };

  return (
    <div className="student-leaves-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          
          <div>
            <h1>Leave Applications</h1>
            <p className="text-muted">Apply for medical or casual leave and track HOD approvals.</p>
          </div>
        </div>
      </div>

      <div className="leaves-layout-grid-s">
        {/* Left Column: Apply Form */}
        <div className="glass-card leave-form-card-s">
          <div className="card-header-leaves-s">
            <h2><Send size={18} style={{ color: '#3730A5' }} /> Apply for Leave</h2>
            <p className="text-muted" style={{ fontSize: '0.82rem', margin: '2px 0 0' }}>
              Ensure to specify valid reasons and submit supporting docs if required.
            </p>
          </div>

          {success && (
            <div className="modal-success-flash" style={{ margin: '1rem 0' }}>
              <CheckCircle2 size={18} /> Leave request submitted successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="leave-application-form-s">
            <div className="form-group">
              <label>Leave Category</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                required
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="On Duty Leave">On Duty Leave (OD)</option>
              </select>
            </div>

            <div className="form-dates-group-s">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Reason / Statement</label>
              <textarea
                required
                placeholder="Describe your reason for taking leave..."
                rows="4"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-submit-leave-application-s" style={{ background: '#3730A5', color: 'white', border: 'none' }}>
              Submit Leave Request
            </button>
          </form>
        </div>

        {/* Right Column: History List */}
        <div className="glass-card leave-history-card-s">
          <div className="card-header-leaves-s" style={{ marginBottom: '1.25rem' }}>
            <h2><FileText size={18} className="text-warning-s" /> Request History</h2>
            <p className="text-muted" style={{ fontSize: '0.82rem', margin: '2px 0 0' }}>
              All submitted leave requests and their current statuses.
            </p>
          </div>

          <div className="leave-history-list-s">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '8px', marginBottom: '0.75rem' }}></div>
              ))
            ) : myLeaves.length === 0 ? (
              <p className="no-leave-history-s">No leave applications recorded in your log.</p>
            ) : (
              myLeaves.map(l => (
                <div key={l.id} className="leave-history-item-s">
                  <div className="history-header-s">
                    <span className="history-type-s">{l.type}</span>
                    <div className="history-status-wrapper-s">
                      {getStatusIcon(l.status)}
                      <span className={`history-status-label-s ${l.status.toLowerCase()}`}>
                        {l.status}
                      </span>
                    </div>
                  </div>
                  <p className="history-dates-s">
                    <Calendar size={12} /> {l.startDate} to {l.endDate}
                  </p>
                  <p className="history-reason-s">"{l.reason}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLeaves;
