import React, { useEffect, useState } from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  X, LayoutDashboard, Building2, UserCheck, GraduationCap, Users, CalendarCheck, CalendarDays, 
  Megaphone, FileBarChart, LogOut, Briefcase, Settings, ClipboardList, ShieldAlert, LifeBuoy, 
  ChevronRight, ChevronDown, Layers, Wallet, Library, PieChart
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const PrincipalSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext);
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Principal');
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  useEffect(() => {
    const sessionData = sessionStorage.getItem('principal_session');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        setUserName(parsed.name || 'Principal');
      } catch (e) {
        console.error('Error parsing session data', e);
      }
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('principal_session');
    sessionStorage.removeItem('principal_token');
    navigate('/login');
  };

  const menuGroups = [
    {
      name: 'User Management',
      icon: <Users size={20} />,
      items: [
        { name: 'HOD Management', path: '/principal/hods', icon: <UserCheck size={20} /> },
        { name: 'Staff Overview', path: '/principal/staff', icon: <GraduationCap size={20} /> },
        { name: 'Students Overview', path: '/principal/students', icon: <Users size={20} /> }
      ]
    },
    {
      name: 'Academic',
      icon: <Layers size={20} />,
      items: [
        { name: 'Departments', path: '/principal/departments', icon: <Building2 size={20} /> },
        { name: 'Academic Planning', path: '/principal/academic-planning', icon: <CalendarCheck size={20} /> },
        { name: 'Attendance Analytics', path: '/principal/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Exam & Results', path: '/principal/exams', icon: <FileBarChart size={20} /> },
        { name: 'Assignments', path: '/principal/assignments', icon: <ClipboardList size={20} /> }
      ]
    },
    {
      name: 'Finance',
      icon: <Wallet size={20} />,
      items: [
        { name: 'Fees Overview', path: '/principal/fees', icon: <ClipboardList size={20} /> }
      ]
    },
    {
      name: 'Resources',
      icon: <Library size={20} />,
      items: [
        { name: 'Placements', path: '/principal/placement', icon: <Briefcase size={20} /> }
      ]
    },
    {
      name: 'Communication',
      icon: <Megaphone size={20} />,
      items: [
        { name: 'Communication Center', path: '/principal/communication', icon: <Megaphone size={20} /> },
        { name: 'Meetings & Events', path: '/principal/meetings', icon: <CalendarDays size={20} /> },
        { name: 'Staff Support Center', path: '/principal/staff-support', icon: <LifeBuoy size={20} /> }
      ]
    },
    {
      name: 'Reports & Analytics',
      icon: <PieChart size={20} />,
      items: [
        { name: 'Reports', path: '/principal/reports', icon: <ClipboardList size={20} /> },
        { name: 'Faculty Performance', path: '/principal/faculty-performance', icon: <UserCheck size={20} /> },
        { name: 'Student Welfare & Discipline', path: '/principal/student-welfare', icon: <ShieldAlert size={20} /> }
      ]
    },
    {
      name: 'Administration',
      icon: <Settings size={20} />,
      items: [
        { name: 'Settings', path: '/principal/settings', icon: <Settings size={20} /> }
      ]
    }
  ];

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
              to="/principal/dashboard" 
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
  );
};

export default PrincipalSidebar;
