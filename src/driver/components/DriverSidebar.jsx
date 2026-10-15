import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Bus, MapPin, Users, Bell, Wrench, Calendar, Navigation, 
  LogOut, ChevronRight, ChevronDown, CheckSquare, IndianRupee, X, Award, Network,
  CreditCard, ShieldCheck, Layers, Briefcase, Building, FileCheck
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const DriverSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [expandedGroups, setExpandedGroups] = React.useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const isBusinessReferralActive = location.pathname.startsWith('/driver/business-referral') || location.pathname.startsWith('/driver/referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const driverBusinessReferralItems = [
    { name: 'All Categories', path: '/driver/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Card Referral', path: '/driver/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance Referral', path: '/driver/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Job Referral', path: '/driver/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Bank Account Referral', path: '/driver/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives & Rules', path: '/driver/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'My Submissions', path: '/driver/referrals', icon: <FileCheck size={16} /> }
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const menuGroups = [
    {
      name: 'Transport Ops',
      icon: <Bus size={20} />,
      items: [
        { name: 'Trip Operations', path: '/driver/trip', icon: <Navigation size={20} /> },
        { name: 'My Vehicle', path: '/driver/vehicle', icon: <Wrench size={20} /> },
        { name: 'My Route', path: '/driver/route', icon: <MapPin size={20} /> }
      ]
    },
    {
      name: 'Student Transit',
      icon: <Users size={20} />,
      items: [
        { name: 'Student List', path: '/driver/students', icon: <Users size={20} /> }
      ]
    },
    {
      name: 'Admin & Tasks',
      icon: <CheckSquare size={20} />,
      items: [
        { name: 'My Tasks', path: '/driver/tasks', icon: <CheckSquare size={20} /> },
        { name: 'Payroll', path: '/driver/payroll', icon: <IndianRupee size={20} /> },
        { name: 'Notifications', path: '/driver/notifications', icon: <Bell size={20} /> }
      ]
    }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('driver_session');
    sessionStorage.removeItem('driver_token');
    if (onClose) onClose();
    navigate('/login');
  };

  const getDriverSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('driver_session') || '{}');
    } catch(e) {
      return {};
    }
  };
  const driverSession = getDriverSession();
  const displayCollegeName = driverSession?.collegeName || collegeSettings?.collegeName || 'Institution Portal';

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
              to="/driver/dashboard"
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
              {driverBusinessReferralItems.map((item, i) => (
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

export default DriverSidebar;
