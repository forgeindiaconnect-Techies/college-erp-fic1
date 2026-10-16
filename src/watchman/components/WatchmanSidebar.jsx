import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SettingsContext } from '../../App';
import {
  LayoutDashboard, UserPlus, LogOut as ExitIcon, QrCode,
  CalendarCheck, Package, Truck, Bus, Users, UserCheck,
  Clock, AlertTriangle, History, Bell, User, Key,
  LogOut, Shield, ChevronRight, X
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const WatchmanSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('watchman_session');
    sessionStorage.removeItem('watchman_token');
    sessionStorage.removeItem('token');
    if (onClose) onClose();
    navigate('/login');
  };

  const getWatchmanSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('watchman_session') || '{}');
    } catch (e) {
      return {};
    }
  };
  const session = getWatchmanSession();
  const displayCollegeName = session?.collegeName || collegeSettings?.collegeName || 'Campus ERP Portal';

  const menuSections = [
    {
      title: 'Command Center',
      items: [
        { name: 'Gate Dashboard', path: '/watchman/dashboard', icon: <LayoutDashboard size={19} /> }
      ]
    },
    {
      title: 'Student Gate Operations',
      items: [
        { name: 'Student QR Scanner', path: '/watchman/qr-verification', icon: <QrCode size={19} /> },
        { name: 'Student Movement Register', path: '/watchman/student-register', icon: <Users size={19} /> }
      ]
    },
    {
      title: 'Staff Gate Operations',
      items: [
        { name: 'Staff Entry Register', path: '/watchman/staff-register', icon: <UserCheck size={19} /> }
      ]
    },
    {
      title: 'Visitor Management',
      items: [
        { name: 'New Visitor Entry', path: '/watchman/visitor-entry', icon: <UserPlus size={19} /> },
        { name: 'Active Visitors & Exit', path: '/watchman/visitor-exit', icon: <ExitIcon size={19} /> },
        { name: 'Pre-Registered Visitors', path: '/watchman/pre-registered', icon: <CalendarCheck size={19} /> },
        { name: 'Visitor History Logs', path: '/watchman/visitor-history', icon: <History size={19} /> }
      ]
    },
    {
      title: 'Campus Logistics & Duty',
      items: [
        { name: 'Bus Entry & Exit Tracking', path: '/watchman/bus-tracking', icon: <Bus size={19} /> },
        { name: 'Vehicle Gate Movements', path: '/watchman/vehicles', icon: <Truck size={19} /> },
        { name: 'Delivery & Parcel Log', path: '/watchman/parcels', icon: <Package size={19} /> },
        { name: 'Guard Shift Attendance', path: '/watchman/attendance', icon: <Clock size={19} /> },
        { name: 'Emergency Incidents', path: '/watchman/incidents', icon: <AlertTriangle size={19} /> }
      ]
    },
    {
      title: 'Account',
      items: [
        { name: 'My Profile', path: '/watchman/profile', icon: <User size={19} /> }
      ]
    }
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
              {displayCollegeName}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 600 }}>Security Gate Control</span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className="mobile-close-btn"
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <div className="sidebar-nav" style={{ padding: '12px 10px 24px 10px' }}>
        {menuSections.map((sec, idx) => (
          <div key={idx} style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              padding: '6px 14px 4px 14px'
            }}>
              {sec.title}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {sec.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={handleNavClick}
                    end={item.path === '/watchman/dashboard'}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Real-Time College ERP Prominent Red Logout Button */}
        <div style={{ padding: '16px 8px 8px 8px', borderTop: '1px solid rgba(255,255,255,0.14)', marginTop: '14px' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 16px',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(220, 38, 38, 0.45)',
              transition: 'background-color 0.2s ease, transform 0.1s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <LogOut size={19} />
            <span>Logout Portal</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default WatchmanSidebar;
