import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, BookOpenCheck,
  ClipboardList, CreditCard, Calendar, FileText,
  Settings, LogOut, ChevronRight, ChevronDown, Megaphone, GraduationCap, Home, Briefcase, Library, ShieldAlert, X, Award, Network,
  ShieldCheck, Layers, Building, FileCheck
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
  const { collegeSettings } = React.useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const location = useLocation();
  const student = getStudentSession();

  const [expandedGroups, setExpandedGroups] = React.useState({ Academics: true });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const isBusinessReferralActive = location.pathname.startsWith('/student/business-referral') || location.pathname.startsWith('/student/referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const studentBusinessReferralItems = [
    { name: 'All Categories', path: '/student/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Card Referral', path: '/student/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance Referral', path: '/student/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Job Referral', path: '/student/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Bank Account Referral', path: '/student/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives & Rules', path: '/student/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'My Submissions', path: '/student/referrals', icon: <FileCheck size={16} /> }
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
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
    if (onClose) onClose();
    navigate('/login');
  };

  const displayCollegeName = student?.collegeName || collegeSettings?.collegeName || 'Institution Portal';

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand & Mobile Close Button */}
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {collegeSettings?.collegeLogo ? (
          <img 
            src={collegeSettings.collegeLogo} 
            alt={displayCollegeName} 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        ) : (
          <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--sidebar-text-active, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
            {displayCollegeName}
          </div>
        )}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar"
          style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <X size={22} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav">
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink
              to="/student/dashboard"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              onClick={handleNavClick}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>

          <li style={{ marginBottom: '0.5rem' }}>
            <div 
              className={`nav-group-header ${isBusinessReferralActive ? 'active' : ''}`}
              onClick={() => toggleGroup('Business Referral')}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Network size={20} />
                <span>Business Referral</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ 
                  background: '#10b981', 
                  color: '#ffffff', 
                  fontSize: '9px', 
                  fontWeight: 800, 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  lineHeight: '1.2'
                }}>New</span>
                {isBusinessReferralExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            <ul className={`nav-group-items ${isBusinessReferralExpanded ? 'expanded' : 'collapsed'}`}>
              {studentBusinessReferralItems.map((item, i) => (
                <li key={i}>
                  <NavLink 
                    to={item.path} 
                    end={item.exact}
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                    style={{ paddingLeft: '2.8rem' }}
                    onClick={handleNavClick}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
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
                      onClick={handleNavClick}
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
