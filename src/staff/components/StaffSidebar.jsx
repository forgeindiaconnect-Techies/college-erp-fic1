import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, BookOpenCheck,
  ClipboardList, Calendar, LogOut, ChevronRight, ChevronDown, FileText, Megaphone, GraduationCap, IndianRupee, Briefcase, Library, LifeBuoy, X, Award, Network,
  CreditCard, ShieldCheck, Layers, Building, FileCheck, Package, Settings
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
  const { collegeSettings } = React.useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const staffSession = getStaffSession();

  const [expandedGroups, setExpandedGroups] = React.useState({ 'Academic Management': true });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const location = useLocation();
  const isBusinessReferralActive = location.pathname.startsWith('/staff/business-referral') || location.pathname.startsWith('/staff/referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const staffBusinessReferralItems = [
    { name: 'All Categories', path: '/staff/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Cards', path: '/staff/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance', path: '/staff/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Job Openings', path: '/staff/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Bank Accounts', path: '/staff/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives & Rules', path: '/staff/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'My Submissions', path: '/staff/referrals', icon: <FileCheck size={16} /> }
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const menuGroups = [
    {
      name: 'Academic Management',
      icon: <BookOpenCheck size={20} />,
      items: [
        { name: 'Class Timetable', path: '/staff/timetable', icon: <Calendar size={20} /> },
        { name: 'Exam Duty Center', path: '/staff/exams', icon: <GraduationCap size={20} /> },
        { name: 'Take Attendance', path: '/staff/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Upload Marks', path: '/staff/marks', icon: <BookOpenCheck size={20} /> },
        { name: 'Assignments', path: '/staff/assignments', icon: <ClipboardList size={20} /> }
      ]
    },
    {
      name: 'Class & Students',
      icon: <Users size={20} />,
      items: [
        { name: 'My Class', path: '/staff/students', icon: <Users size={20} /> }
      ]
    },
    {
      name: 'Resources & Career',
      icon: <Library size={20} />,
      items: [
        { name: 'Library', path: '/staff/library', icon: <Library size={20} /> },
        { name: 'Placement', path: '/staff/placement', icon: <Briefcase size={20} /> },
        { name: 'My Deliveries & Parcels', path: '/staff/parcels', icon: <Package size={20} /> }
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
      name: 'Finance & Earnings',
      icon: <IndianRupee size={20} />,
      items: [
        { name: 'Payroll', path: '/staff/payroll', icon: <IndianRupee size={20} /> }
      ]
    },
    {
      name: 'Account & Settings',
      icon: <Settings size={20} />,
      items: [
        { name: 'Profile & Settings', path: '/staff/settings', icon: <Settings size={20} /> }
      ]
    }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('staff_session');
    sessionStorage.removeItem('staff_token');
    if (onClose) onClose();
    navigate('/login');
  };

  const displayCollegeName = staffSession?.collegeName || collegeSettings?.collegeName || 'Institution Portal';

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
              to="/staff/dashboard"
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
              {staffBusinessReferralItems.map((item, i) => (
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

export default StaffSidebar;
