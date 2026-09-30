import React from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, ArrowRightLeft, Clock, 
  FileText, Users, BarChart3, LogOut, ChevronRight, 
  ChevronDown, Library, PlusCircle, BookmarkCheck,
  BookDown, CheckCircle2
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

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

  const menuGroups = [
    {
      name: 'Catalog & Books',
      icon: <BookOpen size={20} />,
      items: [
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
        { name: 'Reservations', path: '/librarian/reservations', icon: <BookmarkCheck size={18} /> },
      ]
    },
    {
      name: 'Members & Records',
      icon: <Users size={20} />,
      items: [
        { name: 'Student Members', path: '/librarian/members', icon: <Users size={18} /> },
        { name: 'Fines & Analytics', path: '/librarian/reports', icon: <BarChart3 size={18} /> },
      ]
    }
  ];

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand Header */}
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
            src="/logo.svg" 
            alt="ERPSYS Logo" 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        )}
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink
              to="/librarian/dashboard"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <LayoutDashboard size={20} />
              <span>Library Dashboard</span>
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


