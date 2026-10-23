import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Lock, Key, Shield, Bell, Save,
  CheckCircle2, BookOpen, GraduationCap, Building,
  Clock, AlertCircle, Smartphone, Check, Briefcase
} from 'lucide-react';
import './StaffSettings.css';

const DEFAULT_STAFF = {
  id: 'STF-1002',
  name: 'Dr. Ananya Rao',
  email: 'ananya.cs@college.edu',
  phone: '+91 98451 22334',
  dept: 'Computer Science & Engineering',
  deptCode: 'CS',
  designation: 'Associate Professor',
  qualification: 'Ph.D in Machine Learning (IIT Madras)',
  cabin: 'Academic Block B, Room 304',
  experience: '9+ Years',
  subjects: ['Design & Analysis of Algorithms', 'Machine Learning', 'Artificial Intelligence'],
  role: 'Staff'
};

const TABS = [
  { id: 'profile', label: 'Faculty Profile', Icon: User },
  { id: 'academic', label: 'Academic & Duties', Icon: BookOpen },
  { id: 'security', label: 'Password & Security', Icon: Shield },
  { id: 'notifications', label: 'Alerts & Notices', Icon: Bell },
];

export default function StaffSettings() {
  const [tab, setTab] = useState('profile');
  const [staffSession, setStaffSession] = useState(DEFAULT_STAFF);
  const [savedToast, setSavedToast] = useState({ show: false, message: '' });
  const [pwdError, setPwdError] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dept: '',
    designation: '',
    qualification: '',
    cabin: '',
    experience: '',
    currentPwd: '',
    newPwd: '',
    confirmPwd: '',
    twoFactor: false,
    dutyAvailability: true,
    emailDutyAlerts: true,
    smsUrgentAlerts: true,
    leaveUpdatesAlerts: true,
    parcelDeliveryAlerts: true,
    payrollAlerts: true
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('staff_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULT_STAFF, ...parsed };
        setStaffSession(merged);
        setForm(prev => ({
          ...prev,
          name: merged.name || '',
          email: merged.email || '',
          phone: merged.phone || '+91 98451 22334',
          dept: merged.dept || merged.department || 'Computer Science & Engineering',
          designation: merged.designation || 'Associate Professor',
          qualification: merged.qualification || 'Ph.D in Machine Learning (IIT Madras)',
          cabin: merged.cabin || 'Academic Block B, Room 304',
          experience: merged.experience || '9+ Years',
        }));
      } else {
        setForm(prev => ({
          ...prev,
          name: DEFAULT_STAFF.name,
          email: DEFAULT_STAFF.email,
          phone: DEFAULT_STAFF.phone,
          dept: DEFAULT_STAFF.dept,
          designation: DEFAULT_STAFF.designation,
          qualification: DEFAULT_STAFF.qualification,
          cabin: DEFAULT_STAFF.cabin,
          experience: DEFAULT_STAFF.experience
        }));
      }
    } catch (e) {
      console.error('Failed to parse staff_session', e);
    }
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPwdError('');

    // If attempting password reset
    if (form.newPwd || form.confirmPwd) {
      if (form.newPwd.length < 6) {
        setPwdError('New password must be at least 6 characters long.');
        return;
      }
      if (form.newPwd !== form.confirmPwd) {
        setPwdError('New password and confirm password do not match.');
        return;
      }
    }

    // Update sessionStorage
    const updated = {
      ...staffSession,
      name: form.name.trim() || staffSession.name,
      email: form.email.trim() || staffSession.email,
      phone: form.phone.trim() || staffSession.phone,
      cabin: form.cabin.trim() || staffSession.cabin,
      designation: form.designation.trim() || staffSession.designation,
      qualification: form.qualification.trim() || staffSession.qualification,
    };

    sessionStorage.setItem('staff_session', JSON.stringify(updated));
    setStaffSession(updated);

    // Trigger storage event so Top Navbar updates avatar/name immediately
    window.dispatchEvent(new Event('storage'));

    // Clear password fields
    setForm(prev => ({ ...prev, currentPwd: '', newPwd: '', confirmPwd: '' }));

    setSavedToast({
      show: true,
      message: 'Profile & Portal Settings updated successfully!'
    });

    setTimeout(() => {
      setSavedToast({ show: false, message: '' });
    }, 3000);
  };

  const initials = (staffSession.name || 'Staff')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="staff-settings-container animate-fade-in">
      {/* Top Header */}
      <div className="staff-settings-header">
        <div className="staff-settings-header-left">
          <div className="staff-settings-badge">
            <GraduationCap size={14} />
            <span>Institution Faculty Management</span>
          </div>
          <h1>Faculty Profile & Settings</h1>
          <p>Manage your institutional credentials, faculty directory profile, and notification settings.</p>
        </div>

        <button
          type="button"
          className="btn-save-staff-settings"
          onClick={handleSave}
          title="Save all changes"
        >
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Toast */}
      {savedToast.show && (
        <div className="staff-settings-toast">
          <CheckCircle2 size={18} />
          <span>{savedToast.message}</span>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="staff-settings-layout">
        {/* Left Side: Summary Card + Tabs Navigation */}
        <div className="staff-settings-nav-card">
          <div className="staff-profile-mini-summary">
            <div className="staff-avatar-hex">
              {initials}
            </div>
            <div className="staff-mini-info">
              <span className="staff-mini-name">{staffSession.name || 'Faculty Member'}</span>
              <span className="staff-mini-dept">{staffSession.dept || 'Academic Faculty'}</span>
              <span className="staff-mini-id">{staffSession.id || 'FACULTY-001'}</span>
            </div>
          </div>

          <div className="staff-settings-tabs-list">
            {TABS.map(({ id, label, Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`staff-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Tab Panels */}
        <div className="staff-settings-panel">
          {/* TAB 1: FACULTY PROFILE */}
          {tab === 'profile' && (
            <div className="animate-fade-in">
              <div className="staff-panel-header">
                <h2>General Profile Information</h2>
                <p>Personal identification and official institutional contact records.</p>
              </div>

              <form onSubmit={handleSave} className="staff-form-grid">
                <div className="staff-field">
                  <label><User size={13} /> Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="e.g. Dr. Karthik Raman"
                  />
                  <span className="input-hint">Displayed on class rosters, marks sheets & reports.</span>
                </div>

                <div className="staff-field">
                  <label><Shield size={13} /> Faculty / Employee ID</label>
                  <input
                    type="text"
                    disabled
                    value={staffSession.id || 'FACULTY-1002'}
                  />
                  <span className="input-hint">Assigned centrally by Academic HR & Registry.</span>
                </div>

                <div className="staff-field">
                  <label><Mail size={13} /> Official Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="faculty@college.edu"
                  />
                </div>

                <div className="staff-field">
                  <label><Phone size={13} /> Contact Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="+91 98451 00000"
                  />
                </div>

                <div className="staff-field">
                  <label><Building size={13} /> Department</label>
                  <input
                    type="text"
                    disabled
                    value={form.dept}
                  />
                  <span className="input-hint">Department transfers must be requested through Dean / HOD.</span>
                </div>

                <div className="staff-field">
                  <label><Briefcase size={13} /> Academic Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => handleChange('designation', e.target.value)}
                    placeholder="e.g. Assistant Professor (Senior Grade)"
                  />
                </div>

                <div className="staff-field">
                  <label><GraduationCap size={13} /> Highest Qualification</label>
                  <input
                    type="text"
                    value={form.qualification}
                    onChange={e => handleChange('qualification', e.target.value)}
                    placeholder="e.g. M.E., Ph.D."
                  />
                </div>

                <div className="staff-field">
                  <label><Clock size={13} /> Office Cabin / Staff Room</label>
                  <input
                    type="text"
                    value={form.cabin}
                    onChange={e => handleChange('cabin', e.target.value)}
                    placeholder="e.g. Block C, 2nd Floor, Room 204"
                  />
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ACADEMIC & DUTIES */}
          {tab === 'academic' && (
            <div className="animate-fade-in">
              <div className="staff-panel-header">
                <h2>Teaching Subjects & Campus Roles</h2>
                <p>Course allocations, exam invigilation availability, and student mentorship.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="staff-field">
                  <label><BookOpen size={13} /> Assigned Courses & Subjects</label>
                  <div className="subjects-tag-cluster">
                    {(staffSession.subjects && staffSession.subjects.length > 0
                      ? staffSession.subjects
                      : ['Data Structures & Algorithms', 'Database Systems', 'Cloud Computing Architecture']
                    ).map((sub, idx) => (
                      <span key={idx} className="subject-tag-chip active-sub">
                        <Check size={12} />
                        <span>{sub}</span>
                      </span>
                    ))}
                  </div>
                  <span className="input-hint" style={{ marginTop: '0.4rem' }}>
                    Courses assigned for the active Academic Semester by HOD.
                  </span>
                </div>

                <div className="staff-notif-list">
                  <div className="staff-notif-item">
                    <label className="staff-toggle-switch">
                      <input
                        type="checkbox"
                        checked={form.dutyAvailability}
                        onChange={e => handleChange('dutyAvailability', e.target.checked)}
                      />
                      <span className="staff-toggle-slider" />
                    </label>
                    <div className="staff-notif-content">
                      <div className="staff-notif-title">
                        <span>Exam Invigilation Availability</span>
                      </div>
                      <div className="staff-notif-desc">
                        Mark yourself as actively available for mid-term CIA and semester end examination duty rosters.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASSWORD & SECURITY */}
          {tab === 'security' && (
            <div className="animate-fade-in">
              <div className="staff-panel-header">
                <h2>Security & Account Credentials</h2>
                <p>Manage your account password and security protection.</p>
              </div>

              <div className="security-status-box">
                <div className="security-status-icon">
                  <Shield size={20} />
                </div>
                <div className="security-status-text">
                  <h4>Account Protected & Verified</h4>
                  <p>Your session is authenticated via Institutional Single Sign-On and campus tokens.</p>
                </div>
              </div>

              {pwdError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  marginBottom: '1.25rem',
                  fontSize: '0.86rem',
                  fontWeight: 600
                }}>
                  <AlertCircle size={16} />
                  <span>{pwdError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="staff-form-grid">
                <div className="staff-field col-span-2">
                  <label><Lock size={13} /> Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.currentPwd}
                    onChange={e => handleChange('currentPwd', e.target.value)}
                  />
                </div>

                <div className="staff-field">
                  <label><Key size={13} /> New Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={form.newPwd}
                    onChange={e => handleChange('newPwd', e.target.value)}
                  />
                </div>

                <div className="staff-field">
                  <label><Key size={13} /> Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={form.confirmPwd}
                    onChange={e => handleChange('confirmPwd', e.target.value)}
                  />
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: ALERTS & NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div className="animate-fade-in">
              <div className="staff-panel-header">
                <h2>Notification Preferences</h2>
                <p>Configure which alerts you receive across email, mobile, and the ERP portal.</p>
              </div>

              <div className="staff-notif-list">
                {[
                  {
                    key: 'emailDutyAlerts',
                    title: 'Exam Duty & Invigilation Alerts',
                    desc: 'Receive immediate email notifications whenever you are assigned to an examination duty slot.',
                    Icon: Mail
                  },
                  {
                    key: 'smsUrgentAlerts',
                    title: 'Urgent Campus Broadcast SMS',
                    desc: 'Emergency announcements, weather holidays, or critical circulars via instant SMS.',
                    Icon: Smartphone
                  },
                  {
                    key: 'leaveUpdatesAlerts',
                    title: 'Staff Leave Request Approvals',
                    desc: 'Get notified as soon as HOD or Principal reviews and acts on your leave requests.',
                    Icon: Bell
                  },
                  {
                    key: 'parcelDeliveryAlerts',
                    title: 'Gate Courier & Parcel Arrival',
                    desc: 'Real-time alert when campus security logs an incoming courier or parcel in your name.',
                    Icon: Bell
                  },
                  {
                    key: 'payrollAlerts',
                    title: 'Monthly Payslip Generated',
                    desc: 'Receive notification when monthly salary vouchers and tax deductions are available.',
                    Icon: Mail
                  }
                ].map(({ key, title, desc, Icon }) => (
                  <div key={key} className="staff-notif-item">
                    <label className="staff-toggle-switch">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={e => handleChange(key, e.target.checked)}
                      />
                      <span className="staff-toggle-slider" />
                    </label>
                    <div className="staff-notif-content">
                      <div className="staff-notif-title">
                        <Icon size={14} color="#3730a5" />
                        <span>{title}</span>
                      </div>
                      <div className="staff-notif-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
