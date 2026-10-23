import React, { useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SettingsContext } from '../../App';
import {
  LayoutDashboard, Users, GraduationCap, CalendarCheck,
  BookOpenCheck, Calendar, BookOpen, FileText, ClipboardList, Inbox,
  LogOut, ChevronRight, ChevronDown, Megaphone, Settings, IndianRupee, Briefcase, Library, LifeBuoy, X, Award, Network,
  CreditCard, ShieldCheck, Layers, Building, FileCheck, Package
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const DEPT_CODE_MAP = {
  'Computer Science Engineering': 'CSE',
  'Information Technology': 'IT',
  'Electronics & Communication Engineering': 'ECE',
  'Electrical & Electronics Engineering': 'EEE',
  'Mechanical Engineering': 'MECH',
  'Civil Engineering': 'CIVIL',
  'Artificial Intelligence & Data Science': 'AIDS',
  'Artificial Intelligence & Machine Learning': 'AIML',
  'Cyber Security': 'CYBER',
  'Biomedical Engineering': 'BME',
  'Aeronautical Engineering': 'AERO',
  'Automobile Engineering': 'AUTO',
  'Robotics Engineering': 'ROBOTICS',
  'Chemical Engineering': 'CHEM',
  'Biotechnology Engineering': 'BIOTECH',
  'Computer Science': 'CSE',
  'Electronics & Comm.': 'ECE',
  'Electrical Engg.': 'EE',
  'Mechanical Engg.': 'MECH',
  'Bachelor of Computer App.': 'BCA',
  'Master of Business Admin.': 'MBA'
};

const HodSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = useContext(SettingsContext) || {};
  const navigate = useNavigate();

  // Read HOD session inside the component to keep it reactive
  const hodSession = JSON.parse(sessionStorage.getItem('hod_session') || 'null') || {
    name: 'Prof. Rajan Iyer',
    dept: 'Computer Science',
    deptCode: 'CSE',
    role: 'HOD',
  };

  const deptCode = DEPT_CODE_MAP[hodSession.dept] || hodSession.deptCode || 'HOD';

  const [expandedGroups, setExpandedGroups] = React.useState({});

  const location = useLocation();
  const isBusinessReferralActive = location.pathname.startsWith('/hod/business-referral') || location.pathname.startsWith('/hod/referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const hodBusinessReferralItems = [
    { name: 'All Categories', path: '/hod/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Cards', path: '/hod/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance', path: '/hod/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Job Openings', path: '/hod/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Bank Accounts', path: '/hod/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives & Rules', path: '/hod/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'My Submissions', path: '/hod/referrals', icon: <FileCheck size={16} /> }
  ];

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const menuGroups = [
    {
      name: 'Department Management',
      icon: <Users size={20} />,
      items: [
        { name: 'Students', path: '/hod/students', icon: <Users size={20} /> },
        { name: 'Staff', path: '/hod/staff', icon: <GraduationCap size={20} /> }
      ]
    },
    {
      name: 'Academic Operations',
      icon: <BookOpenCheck size={20} />,
      items: [
        { name: 'Subjects', path: '/hod/subjects', icon: <BookOpen size={20} /> },
        { name: 'Faculty Allocation', path: '/hod/faculty-allocation', icon: <Users size={20} /> },
        { name: 'Assignments', path: '/hod/assignments', icon: <FileText size={20} /> },
        { name: 'Student Attendance', path: '/hod/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Class Timetable', path: '/hod/timetable', icon: <Calendar size={20} /> },
        { name: 'Faculty Substitution', path: '/hod/substitution', icon: <Users size={20} /> },
        { name: 'Exam Duty Center', path: '/hod/exams', icon: <FileText size={20} /> },
        { name: 'Student Promotion', path: '/hod/promotion', icon: <GraduationCap size={20} /> },
        { name: 'Results', path: '/hod/marks', icon: <BookOpenCheck size={20} /> }
      ]
    },
    {
      name: 'Resources & Career',
      icon: <Library size={20} />,
      items: [
        { name: 'Placement', path: '/hod/placement', icon: <Briefcase size={20} /> },
        { name: 'Library', path: '/hod/library', icon: <Library size={20} /> }
      ]
    },
    {
      name: 'Communication & Workflow',
      icon: <Megaphone size={20} />,
      items: [
        { name: 'Leave Approvals', path: '/hod/leaves', icon: <Inbox size={20} /> },
        { name: 'Announcements', path: '/hod/announcements', icon: <Megaphone size={20} /> },
        { name: 'Gate Deliveries & Parcels', path: '/hod/parcels', icon: <Package size={20} /> },
        { name: 'Support Center', path: '/hod/support', icon: <LifeBuoy size={20} /> }
      ]
    },
    {
      name: 'Analytics & Admin',
      icon: <ClipboardList size={20} />,
      items: [
        { name: 'Reports', path: '/hod/reports', icon: <ClipboardList size={20} /> },
        { name: 'Payroll', path: '/hod/payroll', icon: <IndianRupee size={20} /> },
        { name: 'Settings', path: '/hod/settings', icon: <Settings size={20} /> }
      ]
    }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('hod_session');
    sessionStorage.removeItem('hod_token');
    if (onClose) onClose();
    navigate('/login');
  };

  const displayCollegeName = hodSession?.collegeName || collegeSettings?.collegeName || 'Institution Portal';

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

      {/* Nav */}
      <nav className="sidebar-nav">
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink
              to="/hod"
              end={true}
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
              {hodBusinessReferralItems.map((item, i) => (
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

export default HodSidebar;
