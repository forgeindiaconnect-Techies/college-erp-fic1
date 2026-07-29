import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, CheckCircle, ArrowLeft, Save } from 'lucide-react';
import './StudentSettings.css';

// Fallbacks
const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Computer Science',
  sem: 'Sem 6',
  email: 'john@college.edu'
};

const StudentSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);

  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

    // Set initial values
    setEmail(activeStud.email || '');
    setPhone('+91 98451 0001');
    setLoading(false);
  }, [navigate]);

  const handleSave = (e) => {
    e.preventDefault();

    // 1. Update sessionStorage
    const updatedSession = { ...studentSession, email };
    sessionStorage.setItem('student_session', JSON.stringify(updatedSession));

    // 2. Update erp_students list in localStorage
    const savedStud = localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (savedStud) {
      const updatedList = JSON.parse(savedStud).map(s =>
        s.id === studentSession.id ? { ...s, email } : s
      );
      localStorage.setItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updatedList));
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 1500);
  };

  return (
    <div className="student-settings-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          
          <div>
            <h1>Profile Settings</h1>
            <p className="text-muted">Update your contact channels, profile handles, and password security.</p>
          </div>
        </div>
      </div>

      <div className="glass-card settings-card-s">
        {success && (
          <div className="modal-success-flash" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle size={18} /> Profile settings updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="settings-form-s">
          <div className="form-grid-settings-s">
            <div className="form-group">
              <label>Register Number</label>
              <input type="text" disabled value={studentSession.id} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
              <label>Department / Class</label>
              <input type="text" disabled value={`${studentSession.dept} · ${studentSession.sem}`} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
              <label><Mail size={13} /> Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label><Phone size={13} /> Contact Number</label>
              <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label><Lock size={13} /> Reset Password</label>
              <input type="password" placeholder="•••••••• (Enter new password)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn-save-settings-s shadow-glow-s" style={{ background: '#3730A5', color: 'white', border: 'none' }}>
            <Save size={16} /> Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentSettings;
