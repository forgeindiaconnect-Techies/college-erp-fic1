import React, { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { SettingsContext } from '../../App';
import { 
  X, LayoutDashboard, Building2, GraduationCap, Users, Heart, BookOpen, 
  Calendar, CalendarCheck, FileSpreadsheet, BookOpenCheck, Inbox, FileBarChart, 
  ClipboardList, Megaphone, ShieldCheck, Settings, ChevronRight, ChevronDown, 
  Wallet, Activity, PieChart, LogOut, Library, Bus, Building, Briefcase, Bot, Layers, Clock
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState({});
  const { collegeSettings } = useContext(SettingsContext);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_token');
    navigate('/login');
  };

  const menuGroups = [
    {
      name: 'User Management',
      icon: <Users size={20} />,
      items: [
        { name: 'Accounts Officer', path: '/admin/accounts-management', icon: <Wallet size={20} /> },
        { name: 'HODs', path: '/admin/hods', icon: <GraduationCap size={20} /> },
        { name: 'Staff', path: '/admin/staff', icon: <GraduationCap size={20} /> },
        { name: 'Students', path: '/admin/students', icon: <Users size={20} /> },
        { name: 'Parents', path: '/admin/parents', icon: <Heart size={20} /> }
      ]
    },
    {
      name: 'Academic',
      icon: <Layers size={20} />,
      items: [
        { name: 'Departments', path: '/admin/departments', icon: <Building2 size={20} /> },
        { name: 'Subjects', path: '/admin/subjects', icon: <BookOpen size={20} /> },
        { name: 'Class Timetable', path: '/admin/timetable', icon: <Calendar size={20} /> },
        { name: 'Period Master', path: '/admin/period-master', icon: <Clock size={20} /> },
        { name: 'Student Attendance', path: '/admin/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Staff Attendance', path: '/admin/employee-attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Exam Timetable', path: '/admin/exams', icon: <FileSpreadsheet size={20} /> },
        { name: 'Student Promotion', path: '/admin/promotion', icon: <GraduationCap size={20} /> },
        { name: 'Results', path: '/admin/marks', icon: <BookOpenCheck size={20} /> },
        { name: 'Assignments', path: '/admin/assignments', icon: <ClipboardList size={20} /> }
      ]
    },
    {
      name: 'Finance',
      icon: <Wallet size={20} />,
      items: [
        { name: 'Fees', path: '/admin/fees', icon: <Wallet size={20} /> },
        { name: 'Payroll', path: '/admin/payroll', icon: <FileSpreadsheet size={20} /> }
      ]
    },
    {
      name: 'Resources',
      icon: <Library size={20} />,
      items: [
        { name: 'Library', path: '/admin/library', icon: <Library size={20} />, flag: 'libraryEnabled' },
        { name: 'Transport', path: '/admin/transport', icon: <Bus size={20} />, flag: 'transportEnabled' },
        { name: 'Hostel', path: '/admin/hostel', icon: <Building size={20} />, flag: 'hostelEnabled' },
        { name: 'Placement', path: '/admin/placement', icon: <Briefcase size={20} />, flag: 'placementEnabled' }
      ].filter(item => !collegeSettings || collegeSettings[item.flag] !== false)
    },
    {
      name: 'Communication',
      icon: <Megaphone size={20} />,
      items: [
        { name: 'Announcements', path: '/admin/announcements', icon: <Megaphone size={20} /> },
        { name: 'Leave Requests', path: '/admin/leaves', icon: <Inbox size={20} /> }
      ]
    },
    {
      name: 'Reports & Analytics',
      icon: <PieChart size={20} />,
      items: [
        { name: 'Reports', path: '/admin/reports', icon: <FileBarChart size={20} /> },
        { name: 'Analytics', path: '/admin/analytics', icon: <PieChart size={20} /> },
        { name: 'Activity Logs', path: '/admin/activity-logs', icon: <Activity size={20} /> }
      ]
    },
    {
      name: 'Administration',
      icon: <Settings size={20} />,
      items: [
        { name: 'Settings & Security', path: '/admin/settings', icon: <ShieldCheck size={20} className="text-red-500" /> },
        { name: 'My Subscription', path: '/admin/subscription', icon: <Wallet size={20} style={{ color: '#f59e0b' }} /> }
      ]
    }
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
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
              src="/logo.svg?v=1782115707199" 
              alt="ERPSYS Logo" 
              style={{ height: '32px', objectFit: 'contain' }} 
            />
          )}
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, paddingBottom: '2rem' }}>
          <ul>
            <li style={{ marginBottom: '0.5rem' }}>
              <NavLink 
                to="/admin/dashboard" 
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
                        end={item.exact}
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
    </>
  );
};

export default Sidebar;
