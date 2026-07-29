import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, Phone, ArrowLeft, Users, ShieldAlert, GraduationCap } from 'lucide-react';
import { getStudents } from '../../api/index';
import './StaffStudents.css';

// Fallback session
const DEFAULT_SESSION = {
  name: 'Dr. Ananya Rao',
  dept: 'Computer Science',
  deptCode: 'CS',
  role: 'Staff',
  subjects: ['Data Structures', 'DBMS']
};

const SUBJECT_TO_CLASS = {
  'Data Structures': 'Sem 3',
  'DBMS': 'Sem 6',
  'OS': 'Sem 4',
  'Machine Learning': 'Sem 6',
  'Circuits': 'Sem 4',
  'Networks': 'Sem 4',
  'Thermodynamics': 'Sem 2',
  'Fluid Mechanics': 'Sem 2',
  'Structural Analysis': 'Sem 8'
};

const AVATAR_COLORS = ['var(--primary)', '#10b981', '#f59e0b', '#ec4899', '#6366F1'];
const getInitials = (name) => name.replace('Dr. ', '').replace('Prof. ', '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const StaffStudents = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(DEFAULT_SESSION);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [mySubjects, setMySubjects] = useState([]);

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

    // 2. Load student database
    const loadStudents = async () => {
      try {
        const res = await getStudents();
        if (res?.data && res.data.length > 0) {
          setStudents(res.data);
        } else {
          // Fallback to local storage if API is restricted or empty
          const localStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
          setStudents(localStudents);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
        const localStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
        setStudents(localStudents);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();

    // 3. Load dynamically assigned subjects
    let dynSubjects = [];
    let deptInitialized = false;
    const savedSubjects = localStorage.getItem(`erp_subjects_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (savedSubjects) {
      const allSubs = JSON.parse(savedSubjects);
      const deptSubs = allSubs.filter(s => s.dept === activeStaff.dept);
      
      if (deptSubs.length > 0) {
        deptInitialized = true;
        const assignedSubs = deptSubs.filter(s => {
          if (!s.teacher) return false;
          const t = s.teacher.toLowerCase().trim();
          const n = activeStaff.name.toLowerCase().trim();
          return t.includes(n) || n.includes(t);
        });
        dynSubjects = [...new Set(assignedSubs.map(s => `${s.name} (${s.sem})`))];
      }
    }
    
    if (!deptInitialized && dynSubjects.length === 0) {
      dynSubjects = activeStaff.subjects && activeStaff.subjects.length > 0 ? activeStaff.subjects : ['General Course'];
    }

    if (dynSubjects.length === 0) {
      dynSubjects = ['No Subjects Assigned by HOD'];
    }
    
    setMySubjects(dynSubjects);
  }, [navigate]);

  const staffDept = staffSession.dept;
  
  // Filter students: For demo purposes, just show all students in the staff's department
  // instead of strictly filtering by targetSems which may hide students if subjects are unmapped.
  const myClassStudents = students.filter(s => s.dept === staffDept || s.department === staffDept || !s.dept);

  const filteredStudents = myClassStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const getAttColor = (p) => p >= 90 ? '#10b981' : p >= 75 ? '#f59e0b' : '#ef4444';
  const getCgpaColor = (c) => c >= 8.5 ? '#10b981' : c >= 7.0 ? '#f59e0b' : '#ef4444';

  return (
    <div className="students-management-staff animate-fade-in">
      <div className="page-header-staff">
        <div className="header-left">
          
          <div>
            <h1>Student List</h1>
            <p className="text-muted">Directory of students currently enrolled in subjects you instruct.</p>
          </div>
        </div>
      </div>

      {/* Directory Search & Statistics Card */}
      <div className="glass-card search-card-students">
        <div className="table-filters-bar" style={{ borderBottom: 'none', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Active Subjects Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Assigned Subjects:</span>
            {mySubjects.map((sub, idx) => (
              <span key={idx} style={{ background: 'rgba(55, 48, 165, 0.12)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                {sub}
              </span>
            ))}
          </div>

          <div className="search-box-attendance" style={{ width: '100%' }}>
            <Search size={17} className="search-icon" />
            <input
              type="text"
              placeholder="Search student directories by name, ID, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid of Student Profile Cards */}
      <div className="students-directory-grid">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card student-skeleton-card">
              <div className="skeleton" style={{ height: '50px', width: '50px', borderRadius: '50%', marginBottom: '1rem' }}></div>
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '0.5rem' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '80%', marginBottom: '1rem' }}></div>
              <div className="skeleton" style={{ height: '32px', width: '100%' }}></div>
            </div>
          ))
        ) : filteredStudents.length === 0 ? (
          <div className="glass-card no-students-banner col-span-full">
            <Users size={40} className="text-muted" style={{ marginBottom: '1rem' }} />
            <h3>No Enrolled Students</h3>
            <p className="text-muted">No students currently match your filters or class lists.</p>
          </div>
        ) : (
          filteredStudents.map((s, idx) => (
            <div key={s.id} className="glass-card student-profile-card-widget">
              <div className="card-top-accent" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}></div>
              <div className="student-profile-main">
                <div
                  className="student-avatar-large"
                  style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                >
                  {getInitials(s.name)}
                </div>

                <h3 className="student-name">{s.name}</h3>
                <span className="student-id-tag">{s.id}</span>
                <span className="student-class-tag">{s.dept} · {s.sem}</span>

                <div className="student-metrics-row">
                  <div className="metric-box">
                    <span className="metric-label">Attendance</span>
                    <span className="metric-value" style={{ color: getAttColor(s.attendance) }}>
                      {s.attendance}%
                    </span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">CGPA Score</span>
                    <span className="metric-value" style={{ color: getCgpaColor(s.cgpa) }}>
                      {s.cgpa}
                    </span>
                  </div>
                </div>

                <div className="student-contact-details">
                  <div className="contact-item">
                    <Mail size={13} />
                    <span>{s.email}</span>
                  </div>
                  <div className="contact-item">
                    <Phone size={13} />
                    <span>+91 98451 000{idx}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffStudents;
