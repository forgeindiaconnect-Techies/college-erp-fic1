import React, { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { ThemeContext } from '../../App';
import '../../components/layout/Layout.css';
import { 
  Building2,
  Settings, 
  CreditCard,
  BarChart,
  ShieldAlert,
  Crown,
  X,
  LogOut
} from 'lucide-react';

const SuperAdminSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem('superadmin_session');
    sessionStorage.removeItem('superadmin_token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/superadmin/dashboard', icon: <BarChart size={20} /> },
    { name: 'Colleges', path: '/superadmin/colleges', icon: <Building2 size={20} /> },
    { name: 'Subscriptions', path: '/superadmin/subscriptions', icon: <Crown size={20} /> },
    { name: 'Trials', path: '/superadmin/trials', icon: <ShieldAlert size={20} /> },
    { name: 'Payments', path: '/superadmin/payments', icon: <CreditCard size={20} /> },
    { name: 'Reports', path: '/superadmin/reports', icon: <BarChart size={20} /> },
    { name: 'Settings', path: '/superadmin/settings', icon: <Settings size={20} /> }
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.svg?v=1782115707259" alt="ERPSYS Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.2)' }}>SUPER ADMIN</span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <li key={item.name}>
                <div
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.path);
                    if (window.innerWidth <= 768) onClose();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', color: '#ffffff', background: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'} onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}>
            <LogOut size={20} />
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

