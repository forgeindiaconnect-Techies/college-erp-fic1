import React, { useEffect, useState } from 'react';
import { Users, GraduationCap, CalendarCheck, Building2, Megaphone, FileBarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../pages/Dashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard'; // Reuse dashboard styles

const SubAdminDashboard = () => {
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
    <div className="dashboard-container">
      <CollegeInfoCard />
      <div className="dashboard-header">
      <CollegeInfoCard />
        <div>
          <h1 className="page-title">Welcome back, {userName}</h1>
          <p className="text-muted">Here's your permitted administrative access overview.</p>
        </div>
      </div>

      {allowedCards.length > 0 ? (
        <div className="dashboard-grid">
      <CollegeInfoCard />
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
