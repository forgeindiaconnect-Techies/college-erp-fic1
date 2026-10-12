import React, { useEffect, useState } from 'react';
import { Users, GraduationCap, CalendarCheck, Building2, Megaphone, FileBarChart, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import '../../pages/Dashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard'; // Reuse dashboard styles

const SubAdminDashboard = () => {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState([]);
  const [userName, setUserName] = useState('Sub Admin');

  useEffect(() => {
    const sessionData = sessionStorage.getItem('subadmin_session');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        setPermissions(parsed.permissions || []);
        setUserName(parsed.name || 'Sub Admin');
      } catch (e) {
        console.error('Error parsing session data', e);
      }
    }
  }, []);

  const moduleCards = [
    { module: 'view_departments', title: 'Departments', icon: <Building2 size={24} />, path: '/subadmin/departments', color: '#f59e0b' },
    { module: 'manage_students', title: 'Students', icon: <Users size={24} />, path: '/subadmin/students', color: '#3b82f6' },
    { module: 'manage_staff', title: 'Staff', icon: <GraduationCap size={24} />, path: '/subadmin/staff', color: '#6366F1' },
    { module: 'view_attendance', title: 'Attendance', icon: <CalendarCheck size={24} />, path: '/subadmin/attendance', color: '#10b981' },
    { module: 'view_reports', title: 'Reports', icon: <FileBarChart size={24} />, path: '/subadmin/reports', color: '#ec4899' },
    { module: 'create_announcements', title: 'Announcements', icon: <Megaphone size={24} />, path: '/subadmin/announcements', color: '#ef4444' }
  ];

  const allowedCards = moduleCards.filter(card => permissions.includes(card.module));

  return (
    <div className="dashboard-container subadmin-dashboard">
      <CollegeInfoCard />
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Welcome back, {userName}</h1>
          <p className="text-muted">Here's your permitted administrative access overview.</p>
        </div>
      </div>

      {allowedCards.length > 0 ? (
        <>
          <div style={{
            background: 'var(--bg-primary, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                    Sub Admin Quick Actions
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                    Immediate shortcuts for your authorized administrative modules
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                Quick Shortcuts
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {allowedCards.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigate(card.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '8px', background: `${card.color}15`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {React.cloneElement(card.icon, { size: 18 })}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>{card.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Manage {card.title.toLowerCase()}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-grid">
          {allowedCards.map((card, idx) => (
            <Link to={card.path} key={idx} style={{ textDecoration: 'none' }}>
              <div className="stat-card glass-card hover-lift" style={{ '--accent-color': card.color }}>
                <div className="stat-icon-wrapper" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                  {card.icon}
                </div>
                <div className="stat-details mt-4">
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Manage {card.title}</h3>
                  <p className="text-muted mt-1" style={{ fontSize: '0.875rem' }}>Access {card.title.toLowerCase()} administration tools</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </>
      ) : (
        <div className="glass-card mt-4" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>No Modules Assigned</h3>
          <p className="text-muted mt-2">You currently do not have administrative access to any modules. Please contact the System Admin to assign permissions to your account.</p>
        </div>
      )}
    </div>
  );
};

export default SubAdminDashboard;
