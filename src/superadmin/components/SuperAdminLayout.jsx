import React, { useState, useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { ThemeContext } from '../../App';
import '../../components/layout/Sidebar.css';
import '../../components/layout/Layout.css';
import { 
  Building2,
  Settings, 
  CreditCard, 
  BarChart3,
  LayoutDashboard,
  ShieldAlert,
  Crown,
  X,
  LogOut,
  Award,
  ChevronRight,
  ChevronDown,
  Layers,
  ShieldCheck,
  Briefcase,
  Building,
  FileBarChart,
  Sliders,
  Trophy
} from 'lucide-react';

const SuperAdminSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const isBusinessReferralActive = location.pathname.startsWith('/superadmin/business-referral') || 
    location.pathname.startsWith('/superadmin/business-referrals') || 
    location.pathname.startsWith('/superadmin/referral-settings');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const superAdminBusinessReferralItems = [
    { name: 'Credit Cards', path: '/superadmin/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance', path: '/superadmin/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Job Openings', path: '/superadmin/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Bank Accounts', path: '/superadmin/business-referral/account-opening', icon: <Building size={16} /> }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('superadmin_session');
    sessionStorage.removeItem('superadmin_token');
    navigate('/login');
  };

  const navItemsBefore = [
    { name: 'Dashboard', path: '/superadmin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Colleges', path: '/superadmin/colleges', icon: <Building2 size={20} /> }
  ];

  const navItemsAfter = [
    { name: 'Subscriptions', path: '/superadmin/subscriptions', icon: <Crown size={20} /> },
    { name: 'Trials', path: '/superadmin/trials', icon: <ShieldAlert size={20} /> },
    { name: 'Payments', path: '/superadmin/payments', icon: <CreditCard size={20} /> },
    { name: 'Reports', path: '/superadmin/reports', icon: <BarChart3 size={20} /> },
    { name: 'Settings', path: '/superadmin/settings', icon: <Settings size={20} /> }
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header" style={{ justifyContent: 'space-between', padding: '0 18px', height: '72px', background: '#365d7a', borderBottom: '1px solid rgba(255, 255, 255, 0.14)' }}>
        <img 
          src="/logo.svg" 
          alt="ERPSYS Logo" 
          style={{ height: '36px', maxWidth: '140px', objectFit: 'contain' }} 
        />
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItemsBefore.map((item) => (
            <li key={item.name} style={{ marginBottom: '0.4rem' }}>
              <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={handleNavClick}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}

          {/* ── Business Referral Accordion Group ── */}
          <li style={{ marginBottom: '0.4rem' }}>
            <div 
              className={`nav-group-header ${isBusinessReferralActive ? 'active' : ''}`}
              onClick={() => toggleGroup('Business Referral')}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} />
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
              {superAdminBusinessReferralItems.map((item, i) => (
                <li key={i}>
                  <NavLink 
                    to={item.path} 
                    end={item.exact}
                    className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
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

          {navItemsAfter.map((item) => (
            <li key={item.name} style={{ marginBottom: '0.4rem' }}>
              <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={handleNavClick}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button 
          onClick={handleLogout} 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px 16px', color: '#ffffff', background: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)' }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

const SuperAdminLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const { theme } = useContext(ThemeContext);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`layout-container ${theme}`}>
      <SuperAdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
      
      <div className={`main-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Super Admin" onMenuToggle={toggleSidebar} />
        <main className="main-content">
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
