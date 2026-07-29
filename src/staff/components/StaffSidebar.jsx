import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, BookOpenCheck,
  ClipboardList, Calendar, LogOut, ChevronRight, ChevronDown, FileText, Megaphone, GraduationCap, IndianRupee, Briefcase, Library, LifeBuoy
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

// Staff session data — in a real app, this comes from JWT / sessionStorage
const getStaffSession = () => {
  return JSON.parse(sessionStorage.getItem('staff_session') || 'null') || {
    name: 'Dr. Ananya Rao',
    dept: 'Computer Science',
    deptCode: 'CS',
    role: 'Staff',
  };
};

const StaffSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext);
  const navigate = useNavigate();
  const staffSession = getStaffSession();

  const [expandedGroups, setExpandedGroups] = React.useState({ 'Academic Management': true });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const menuGroups = [
    {
      name: 'Academic Management',
      icon: <BookOpenCheck size={20} />,
      items: [
        { name: 'Class Timetable', path: '/staff/timetable', icon: <Calendar size={20} /> },
        { name: 'Exam Timetable', path: '/staff/exams', icon: <GraduationCap size={20} /> },
        { name: 'Take Attendance', path: '/staff/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Upload Marks', path: '/staff/marks', icon: <BookOpenCheck size={20} /> },
        { name: 'Assignments', path: '/staff/assignments', icon: <ClipboardList size={20} /> }
      ]
    },
    {
      name: 'Class & Students',
      icon: <Users size={20} />,
      items: [
        { name: 'Student List', path: '/staff/students', icon: <Users size={20} /> }
      ]
    },
    {
      name: 'Resources & Career',
      icon: <Library size={20} />,
      items: [
        { name: 'Library', path: '/staff/library', icon: <Library size={20} /> },
        { name: 'Placement', path: '/staff/placement', icon: <Briefcase size={20} /> }
      ]
    },
    {
      name: 'Communication',
      icon: <Megaphone size={20} />,
      items: [
        { name: 'Announcements', path: '/staff/announcements', icon: <Megaphone size={20} /> },
        { name: 'Leaves', path: '/staff/leaves', icon: <FileText size={20} /> },
        { name: 'Support Center', path: '/staff/support', icon: <LifeBuoy size={20} /> }
      ]
    },
    {
      name: 'Finance',
      icon: <IndianRupee size={20} />,
      items: [
        { name: 'Payroll', path: '/staff/payroll', icon: <IndianRupee size={20} /> }
      ]
    }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('staff_session');
    sessionStorage.removeItem('staff_token');
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
              to="/staff/dashboard"
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

export default StaffSidebar;
