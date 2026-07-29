import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, BookOpenCheck,
  ClipboardList, CreditCard, Calendar, FileText,
  Settings, LogOut, ChevronRight, ChevronDown, Megaphone, GraduationCap, Home, Briefcase, Library, ShieldAlert
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

// Fallback session
const getStudentSession = () => {
  return JSON.parse(sessionStorage.getItem('student_session') || 'null') || {
    id: 'CS2022001',
    name: 'John Doe',
    dept: 'Cyber Security',
    sem: 'Sem 3',
  };
};

const StudentSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext);
  const navigate = useNavigate();
  const student = getStudentSession();

  const [expandedGroups, setExpandedGroups] = React.useState({ Academics: true });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const menuGroups = [
    {
      name: 'Academics',
      icon: <BookOpenCheck size={20} />,
      items: [
        { name: 'Class Timetable', path: '/student/timetable', icon: <Calendar size={20} /> },
        { name: 'Exam Timetable', path: '/student/exams', icon: <GraduationCap size={20} /> },
        { name: 'My Attendance', path: '/student/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Semester Marks', path: '/student/marks', icon: <BookOpenCheck size={20} /> },
        { name: 'Assignments', path: '/student/assignments', icon: <ClipboardList size={20} /> }
      ]
    },
    {
      name: 'Campus Life',
      icon: <Home size={20} />,
      items: [
        { name: 'Hostel Allocation', path: '/student/hostel', icon: <Home size={20} /> },
        { name: 'Library', path: '/student/library', icon: <Library size={20} /> },
        { name: 'Placements', path: '/student/placement', icon: <Briefcase size={20} /> }
      ]
    },
    {
      name: 'Administration',
      icon: <FileText size={20} />,
      items: [
        { name: 'Fee Status', path: '/student/fees', icon: <CreditCard size={20} /> },
        { name: 'Leave Requests', path: '/student/leaves', icon: <FileText size={20} /> }
      ]
    },
    {
      name: 'Support & Settings',
      icon: <ShieldAlert size={20} />,
      items: [
        { name: 'Announcements', path: '/student/announcements', icon: <Megaphone size={20} /> },
        { name: 'Student Support Center', path: '/student/welfare', icon: <ShieldAlert size={20} /> },
        { name: 'Profile Settings', path: '/student/settings', icon: <Settings size={20} /> }
      ]
    }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('student_session');
    sessionStorage.removeItem('student_token');
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand */}
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

      {/* Nav links */}
      <nav className="sidebar-nav">
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink
              to="/student/dashboard"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
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
                      className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
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
      <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--sidebar-border)' }}>
        <button 
          onClick={handleLogout} 
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', color: '#ffffff', background: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', borderRadius: '8px', transition: 'all 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
          onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default StudentSidebar;
