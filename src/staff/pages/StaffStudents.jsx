import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, Phone, ArrowLeft, Users, ShieldAlert, GraduationCap } from 'lucide-react';
import { getMyClass } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StaffStudents.css';

const AVATAR_COLORS = ['var(--primary)', '#10b981', '#f59e0b', '#ec4899', '#6366F1'];
const getInitials = (name) => name.replace('Dr. ', '').replace('Prof. ', '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const StaffStudents = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadMyClass = useCallback(async () => {
    const session = sessionStorage.getItem('staff_session');

    if (!session) {
      navigate('/staff/login');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await getMyClass();
      const data = response?.data || {};

      setSections(
        Array.isArray(data.sections) ? data.sections : []
      );

      setStudents(
        Array.isArray(data.students) ? data.students : []
      );
    } catch (err) {
      console.error('Failed to load assigned class:', err);
      setSections([]);
      setStudents([]);
      setError(
        err.response?.data?.message ||
        'Unable to load your assigned class.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadMyClass();
  }, [loadMyClass]);

  useRealtimeSync(
    loadMyClass,
    ['students', 'sections']
  );

  const filteredStudents = students.filter(student => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      student.name,
      student.id,
      student.studentId,
      student.email
    ].some(value =>
      String(value || '').toLowerCase().includes(query)
    );
  });

  const getAttColor = (p) => p >= 90 ? '#10b981' : p >= 75 ? '#f59e0b' : '#ef4444';
  const getCgpaColor = (c) => c >= 8.5 ? '#10b981' : c >= 7.0 ? '#f59e0b' : '#ef4444';

  return (
    <div className="students-management-staff animate-fade-in">
      <div className="page-header-staff">
        <div className="header-left">
          
          <div>
            <h1>My Class</h1>
            <p className="text-muted">
              Students assigned through your Class Teacher allocation.
            </p>
          </div>
        </div>
      </div>

      {/* Directory Search & Statistics Card */}
      <div className="glass-card search-card-students">
        <div className="table-filters-bar" style={{ borderBottom: 'none', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Assigned Class Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-muted)'
              }}
            >
              Assigned Class:
            </span>

            {sections.length > 0 ? (
              sections.map(section => (
                <span
                  key={section.id || section._id}
                  style={{
                    background: 'rgba(55, 48, 165, 0.12)',
                    color: 'var(--primary)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Section {section.name} • Room{' '}
                  {section.roomNumber || 'Not assigned'}
                </span>
              ))
            ) : (
              <span className="text-muted">
                No class assigned
              </span>
            )}
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
        ) : error ? (
          <div className="glass-card no-students-banner col-span-full">
            <ShieldAlert
              size={40}
              className="text-danger"
              style={{ marginBottom: '1rem' }}
            />
            <h3>Unable to Load My Class</h3>
            <p className="text-muted">{error}</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="glass-card no-students-banner col-span-full">
            <GraduationCap
              size={40}
              className="text-muted"
              style={{ marginBottom: '1rem' }}
            />
            <h3>No Class Assigned</h3>
            <p className="text-muted">
              You are not assigned as a Class Teacher for any active section.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="glass-card no-students-banner col-span-full">
            <Users
              size={40}
              className="text-muted"
              style={{ marginBottom: '1rem' }}
            />
            <h3>No Students Found</h3>
            <p className="text-muted">
              No students are allocated to your class or match your search.
            </p>
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
                    <span>{s.phone || 'Phone not available'}</span>
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
