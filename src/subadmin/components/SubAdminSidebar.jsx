import React, { useEffect, useState } from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  GraduationCap, 
  Users, 
  CalendarCheck,
  Megaphone,
  FileBarChart,
  LogOut,
  Bell,
  Activity,
  Library,
  ClipboardList,
  UserCheck,
  Calendar,
  User,
  Bus,
  Building,
  Briefcase,
  Bot, ChevronRight, ChevronDown, BookOpenCheck
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const SubAdminSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext);
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

  const handleLogout = () => {
    sessionStorage.removeItem('subadmin_session');
    sessionStorage.removeItem('subadmin_token');
    navigate('/login');
  };

  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const allMenuGroups = [
    {
      name: 'User Management',
      icon: <Users size={20} />,
      items: [
        { name: 'Students', path: '/subadmin/students', icon: <Users size={20} />, module: 'manage_students' },
        { name: 'Staff', path: '/subadmin/staff', icon: <GraduationCap size={20} />, module: 'manage_staff' }
      ]
    },
    {
      name: 'Academic',
      icon: <BookOpenCheck size={20} />,
      items: [
        { name: 'Departments', path: '/subadmin/departments', icon: <Building2 size={20} />, module: 'view_departments' },
        { name: 'Attendance', path: '/subadmin/attendance', icon: <CalendarCheck size={20} />, module: 'view_attendance' },
        { name: 'Timetable', path: '/subadmin/timetable', icon: <Calendar size={20} />, module: 'always' },
        { name: 'Placement', path: '/subadmin/placement', icon: <Briefcase size={20} />, module: 'always' }
      ]
    },
    {
      name: 'Communication',
      icon: <Megaphone size={20} />,
      items: [
        { name: 'Announcements', path: '/subadmin/announcements', icon: <Megaphone size={20} />, module: 'create_announcements' },
        { name: 'Notifications', path: '/subadmin/notifications', icon: <Bell size={20} />, module: 'always' }
      ]
    },
    {
      name: 'Reports & Logs',
      icon: <FileBarChart size={20} />,
      items: [
        { name: 'Reports', path: '/subadmin/reports', icon: <ClipboardList size={20} />, module: 'reports' },
        { name: 'Activity Logs', path: '/subadmin/activity-logs', icon: <Activity size={20} />, module: 'always' }
      ]
    },
    {
      name: 'Settings',
      icon: <User size={20} />,
      items: [
        { name: 'Profile', path: '/subadmin/profile', icon: <User size={20} />, module: 'always' }
      ]
    }
  ];

  // Filter items and groups based on permissions
  const menuGroups = allMenuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.module === 'always' || permissions.includes(item.module))
  })).filter(group => group.items.length > 0);

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-header">
        {collegeSettings?.collegeLogo ? (
          <img 
            src={collegeSettings.collegeLogo} 
            alt={collegeSettings.collegeName || "College Logo"} 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        ) : collegeSettings?.collegeName ? (
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--sidebar-text-active, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
            {collegeSettings.collegeName}
          </div>
        ) : (
          <img 
            src="/logo.svg" 
            alt="ERPSYS Logo" 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        )}
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink 
              to="/subadmin/dashboard" 
              end={true}
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>

          {menuGroups.map((group, idx) => (
            <li key={idx} style={{ marginBottom: '0.5rem' }}>
              <div 
                className="nav-group-header" 
                onClick={() => toggleGroup(group.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {group.icon}
                  <span>{group.name}</span>
                </div>
                {expandedGroups[group.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
              
              <ul className={`nav-group-items ${expandedGroups[group.name] ? 'expanded' : 'collapsed'}`}>
                {group.items.map((item, i) => (
                  <li key={i}>
                    <NavLink 
                      to={item.path} 
                      className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                      style={{ paddingLeft: '2.8rem' }}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button 
          onClick={handleLogout} 
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', color: '#ffffff', background: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', borderRadius: '8px', transition: 'all 0.2s', marginBottom: '8px' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
          onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
        <div className="admin-badge">
          <div className="admin-avatar">{userName.charAt(0)}</div>
          <div className="admin-info">
            <p className="admin-name">{userName}</p>
            <p className="admin-role">Sub Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SubAdminSidebar;
