import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Calendar, Plus, Clock, CheckCircle2,
  XCircle, AlertCircle, ArrowLeft, Send
} from 'lucide-react';
import './StaffLeaves.css';

// Fallback session
const DEFAULT_SESSION = {
  id: 'STF001',
  name: 'Dr. Ananya Rao',
  dept: 'Computer Science',
  deptCode: 'CS',
  role: 'Staff',
  email: 'ananya@college.edu',
  subjects: ['Data Structures', 'DBMS']
};

const MOCK_LEAVES = [
  { id: '1', staffId: 'STF001', staffName: 'Dr. Ananya Rao', type: 'Sick Leave', startDate: '2026-05-10', endDate: '2026-05-11', reason: 'Medical emergency, doctor advised rest.', status: 'Approved' },
  { id: '2', staffId: 'STF001', staffName: 'Dr. Ananya Rao', type: 'Casual Leave', startDate: '2026-06-05', endDate: '2026-06-06', reason: 'Personal family emergency.', status: 'Pending' }
];

const StaffLeaves = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(DEFAULT_SESSION);

  // Leave Requests database state
  const [leaves, setLeaves] = useState([]);

  // Form State
  const [form, setForm] = useState({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('staff_session');
    let activeStaff = DEFAULT_SESSION;
    if (session) {
      activeStaff = JSON.parse(session);
      setStaffSession(activeStaff);
    } else {
      navigate('/staff/login');
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

  const staffId = staffSession.id || 'STF001';
  const staffName = staffSession.name;

  // Filter leaves to current staff
  const myLeaves = leaves.filter(l => l.staffId === staffId);

  // Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const newLeave = {
      id: String(Date.now()),
      staffId: staffId,
      staffName: staffName,
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
    if (status === 'Pending') return <Clock size={16} className="text-warning-cgpa" />;
    return <XCircle size={16} className="text-danger" />;
  };

  return (
    <div className="leaves-management-staff animate-fade-in">
      <div className="page-header-staff">
        <div className="header-left">
          
          <div>
            <h1>Leave Applications</h1>
            <p className="text-muted">Apply for leaves and track approval responses from your HOD.</p>
          </div>
        </div>
      </div>

      <div className="leaves-layout-grid">
        {/* Left Column: Leave Request Form */}
        <div className="glass-card leave-form-card">
          <div className="card-header-leaves">
            <h2><Send size={18} className="text-primary" /> Apply for Leave</h2>
            <p className="text-muted" style={{ fontSize: '0.82rem', margin: '2px 0 0' }}>
              Ensure to apply in advance for casual or duty leaves.
            </p>
          </div>

          {success && (
            <div className="modal-success-flash" style={{ margin: '1rem 0' }}>
              <CheckCircle2 size={18} /> Leave application submitted successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="leave-application-form">
            <div className="form-group">
              <label>Leave Category</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                required
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
                <option value="Duty Leave">Duty Leave</option>
              </select>
            </div>

            <div className="form-dates-group">
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
                placeholder="State the reason for leave clearly..."
                rows="4"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-submit-leave-application">
              Submit Application
            </button>
          </form>
        </div>

        {/* Right Column: History List */}
        <div className="glass-card leave-history-card">
          <div className="card-header-leaves" style={{ marginBottom: '1.25rem' }}>
            <h2><FileText size={18} className="text-warning-cgpa" /> Request History</h2>
            <p className="text-muted" style={{ fontSize: '0.82rem', margin: '2px 0 0' }}>
              All submitted leave requests and their current statuses.
            </p>
          </div>

          <div className="leave-history-list">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '8px', marginBottom: '0.75rem' }}></div>
              ))
            ) : myLeaves.length === 0 ? (
              <p className="no-leave-history">No leave applications recorded in your log.</p>
            ) : (
              myLeaves.map(l => (
                <div key={l.id} className="leave-history-item">
                  <div className="history-header">
                    <span className="history-type">{l.type}</span>
                    <div className="history-status-wrapper">
                      {getStatusIcon(l.status)}
                      <span className={`history-status-label ${l.status.toLowerCase()}`}>
                        {l.status}
                      </span>
                    </div>
                  </div>
                  <p className="history-dates">
                    <Calendar size={12} /> {l.startDate} to {l.endDate}
                  </p>
                  <p className="history-reason">"{l.reason}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLeaves;
