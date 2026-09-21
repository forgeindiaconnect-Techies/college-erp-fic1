import React, { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { SettingsContext } from '../../App';
import { 
  Building, DoorOpen, Users, UserCheck, Utensils, 
  CreditCard, AlertOctagon, UserPlus, Clock, FileText,
  LayoutDashboard, LogOut, ChevronRight, ChevronDown, CheckCircle
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const HostelSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState({
    'Accommodation': true,
    'Student Logistics': true,
    'Mess & Facilities': true
  });
  const { collegeSettings } = useContext(SettingsContext) || {};

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('hostel_session');
    sessionStorage.removeItem('hostel_token');
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

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand */}
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

      {/* Nav links */}
      <nav className="sidebar-nav">
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink
              to="/hostel/dashboard"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <LayoutDashboard size={20} />
              <span>Hostel Dashboard</span>
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
