import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, ArrowRightLeft, Clock, 
  FileText, Users, BarChart3, LogOut, ChevronRight, 
  ChevronDown, Library, PlusCircle, BookmarkCheck,
  BookDown, CheckCircle2, ShieldCheck, X, Award, Network,
  CreditCard, Layers, Briefcase, Building, FileCheck
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const menuGroups = [
  {
    name: 'Catalog & Books',
    icon: <BookOpen size={20} />,
    items: [
      { name: 'Library Overview', path: '/librarian/dashboard', icon: <LayoutDashboard size={18} /> },
      { name: 'Book Inventory', path: '/librarian/books', icon: <BookOpen size={18} /> },
      { name: 'Digital Library', path: '/librarian/digital', icon: <FileText size={18} /> },
    ]
  },
  {
    name: 'Circulation Ops',
    icon: <ArrowRightLeft size={20} />,
    items: [
      { name: 'Issued Books', path: '/librarian/issued', icon: <BookDown size={18} /> },
      { name: 'Returned Books', path: '/librarian/returned-books', icon: <CheckCircle2 size={18} /> },
      { name: 'Return Requests', path: '/librarian/returns', icon: <Clock size={18} /> },
      { name: 'Clearance Requests', path: '/librarian/clearance', icon: <ShieldCheck size={18} /> },
      { name: 'Reservations', path: '/librarian/reservations', icon: <BookmarkCheck size={18} /> },
    ]
  },
  {
    name: 'Members & Records',
    icon: <Users size={20} />,
    items: [
      { name: 'Library Members', path: '/librarian/members', icon: <Users size={18} /> },
      { name: 'Reports & Analytics', path: '/librarian/reports', icon: <BarChart3 size={18} /> }
    ]
  }
];

const LibrarianSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = React.useState({
    'Catalog & Books': true,
    'Circulation Ops': true,
    'Members & Records': true
  });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  React.useEffect(() => {
    menuGroups.forEach(group => {
      if (group.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path))) {
        setExpandedGroups(prev => ({ ...prev, [group.name]: true }));
      }
    });
  }, [location.pathname]);

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    if (onClose) onClose();
    navigate('/login');
  };

  const getLibrarianSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('librarian_session') || '{}');
    } catch(e) {
      return {};
    }
  };
  const isBusinessReferralActive = location.pathname.startsWith('/librarian/business-referral') || location.pathname.startsWith('/librarian/referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const librarianBusinessReferralItems = [
    { name: 'All Categories', path: '/librarian/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Cards', path: '/librarian/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance', path: '/librarian/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Job Openings', path: '/librarian/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Bank Accounts', path: '/librarian/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives & Rules', path: '/librarian/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'My Submissions', path: '/librarian/referrals', icon: <FileCheck size={16} /> }
  ];

  const librarianSession = getLibrarianSession();
  const displayCollegeName = librarianSession?.collegeName || collegeSettings?.collegeName || 'Institution Portal';

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
          <div 
            style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--sidebar-text-active, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} 
            title={displayCollegeName}
          >
            {displayCollegeName}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Librarian Portal
          </span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
          <X size={20} />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink
              to="/librarian/dashboard"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              onClick={handleNavClick}
            >
              <LayoutDashboard size={20} />
              <span>Library Dashboard</span>
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
              {librarianBusinessReferralItems.map((item, i) => (
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

      {/* Footer Profile & Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default LibrarianSidebar;


