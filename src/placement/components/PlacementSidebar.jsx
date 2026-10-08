import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building, Briefcase, Users, Calendar, 
  Award, BarChart3, LogOut, ChevronRight, ChevronDown,
  FileCheck, ShieldCheck, X, CheckCircle2, UserCheck, BookOpen
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const menuGroups = [
  {
    name: 'Corporate & Drives',
    icon: <Building size={20} />,
    items: [
      { name: 'Placement Overview', path: '/placement/dashboard', icon: <LayoutDashboard size={18} /> },
      { name: 'Partner Companies', path: '/placement/companies', icon: <Building size={18} /> },
      { name: 'Job Openings & Drives', path: '/placement/jobs', icon: <Briefcase size={18} /> },
    ]
  },
  {
    name: 'Student Candidacy',
    icon: <Users size={20} />,
    items: [
      { name: 'Student Applications', path: '/placement/applications', icon: <FileCheck size={18} /> },
      { name: 'Eligibility Matrix', path: '/placement/eligibility', icon: <UserCheck size={18} /> },
      { name: 'Training Programs', path: '/placement/training', icon: <BookOpen size={18} /> },
      { name: 'Interview Schedules', path: '/placement/interviews', icon: <Calendar size={18} /> },
      { name: 'Selections & Offers', path: '/placement/selections', icon: <Award size={18} /> },
    ]
  },
  {
    name: 'Analytics & Reports',
    icon: <BarChart3 size={20} />,
    items: [
      { name: 'Placement Analytics', path: '/placement/reports', icon: <BarChart3 size={18} /> },
    ]
  }
];

const PlacementSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = React.useState({
    'Corporate & Drives': true,
    'Student Candidacy': true,
    'Analytics & Reports': true
  });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  React.useEffect(() => {
    menuGroups.forEach(group => {
      if (group.items.some(item => location.pathname === item.path || (item.path !== '/placement/dashboard' && location.pathname.startsWith(item.path)))) {
        setExpandedGroups(prev => ({ ...prev, [group.name]: true }));
      }
    });
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const getPlacementSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('placement_session') || '{}');
    } catch(e) {
      return {};
    }
  };

  const placement = getPlacementSession();
  const displayCollegeName = placement.collegeName || collegeSettings?.collegeName || 'Campus ERP Portal';

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
            Placement Cell
          </span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Officer Profile Badge */}
      <div style={{ padding: '0.75rem 1rem', margin: '0.5rem 0.85rem 0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Briefcase size={18} />
        </div>
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>Officer</span>
          <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {placement.name || 'Placement Officer'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            ID: {placement.referenceId || placement.id || 'PLC-001'}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, paddingBottom: '2rem' }}>
        <ul>
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

      {/* Sidebar Footer */}
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

export default PlacementSidebar;
