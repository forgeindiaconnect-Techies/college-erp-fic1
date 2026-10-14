import React, { useState, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SettingsContext } from '../../App';
import { 
  Building, DoorOpen, Users, UserCheck, Utensils, 
  CreditCard, AlertOctagon, UserPlus, Clock, FileText,
  LayoutDashboard, LogOut, ChevronRight, ChevronDown, CheckCircle, X, Award, Network,
  ShieldCheck, Layers, Briefcase, FileCheck
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const HostelSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    'Accommodation': true,
    'Student Logistics': true,
    'Mess & Facilities': true
  });
  const { collegeSettings } = useContext(SettingsContext) || {};

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const isBusinessReferralActive = location.pathname.startsWith('/hostel/business-referral') || location.pathname.startsWith('/hostel/referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const hostelBusinessReferralItems = [
    { name: 'All Categories', path: '/hostel/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Cards', path: '/hostel/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance', path: '/hostel/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Jobs', path: '/hostel/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Account Opening', path: '/hostel/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives', path: '/hostel/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'My Submissions', path: '/hostel/referrals', icon: <FileCheck size={16} /> }
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('hostel_session');
    sessionStorage.removeItem('hostel_token');
    if (onClose) onClose();
    navigate('/login');
  };

  const menuGroups = [
    {
      name: 'Accommodation',
      icon: <Building size={20} />,
      items: [
        { name: 'Hostel Blocks', path: '/hostel/blocks', icon: <Building size={20} /> },
        { name: 'Rooms Master', path: '/hostel/rooms', icon: <DoorOpen size={20} /> },
        { name: 'Student Allocation', path: '/hostel/allocations', icon: <Users size={20} /> }
      ]
    },
    {
      name: 'Student Logistics',
      icon: <Clock size={20} />,
      items: [
        { name: 'Gate Passes', path: '/hostel/gate-passes', icon: <CheckCircle size={20} /> },
        { name: 'Night Attendance', path: '/hostel/attendance', icon: <Clock size={20} /> },
        { name: 'Visitor Log', path: '/hostel/visitors', icon: <UserPlus size={20} /> }
      ]
    },
    {
      name: 'Mess & Facilities',
      icon: <Utensils size={20} />,
      items: [
        { name: 'Mess Menu', path: '/hostel/mess-menu', icon: <Utensils size={20} /> },
        { name: 'Complaints', path: '/hostel/complaints', icon: <AlertOctagon size={20} /> },
        { name: 'Hostel Fees', path: '/hostel/fees', icon: <CreditCard size={20} /> },
        { name: 'Hostel Reports', path: '/hostel/reports', icon: <FileText size={20} /> }
      ]
    }
  ];

  const getHostelSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('hostel_session') || '{}');
    } catch(e) {
      return {};
    }
  };
  const hostelSession = getHostelSession();
  const displayCollegeName = hostelSession?.collegeName || collegeSettings?.collegeName || 'Institution Portal';

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
              to="/hostel/dashboard"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              onClick={handleNavClick}
            >
              <LayoutDashboard size={20} />
              <span>Hostel Dashboard</span>
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
              {hostelBusinessReferralItems.map((item, i) => (
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

export default HostelSidebar;
