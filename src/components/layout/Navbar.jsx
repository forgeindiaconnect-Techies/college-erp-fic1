import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, Moon, Sun, LayoutGrid, CheckCircle, Menu, LogOut, Settings, User } from 'lucide-react';
import { ThemeContext } from '../../App';
import { NotificationContext } from '../../context/NotificationContext';
import { getDepartments } from '../../api/index';
import { formatDeptWithCourse } from '../../utils/courseHelper';
import './Navbar.css';

const Navbar = ({ role = 'Admin', onMenuToggle }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState(role);
  const [collegeName, setCollegeName] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([
    { id: '1', name: 'Computer Science Engineering' },
    { id: '2', name: 'Information Technology' },
    { id: '3', name: 'Electronics & Communication Engineering' },
    { id: '4', name: 'Electrical & Electronics Engineering' },
    { id: '5', name: 'Mechanical Engineering' },
    { id: '6', name: 'Civil Engineering' },
    { id: '7', name: 'Artificial Intelligence & Data Science' },
    { id: '8', name: 'Artificial Intelligence & Machine Learning' },
    { id: '9', name: 'Cyber Security' },
    { id: '10', name: 'Biomedical Engineering' },
    { id: '11', name: 'Aeronautical Engineering' },
    { id: '12', name: 'Automobile Engineering' },
    { id: '13', name: 'Robotics Engineering' },
    { id: '14', name: 'Chemical Engineering' },
    { id: '15', name: 'Biotechnology Engineering' }
  ]);

  useEffect(() => {
    // Determine which session key to check
    const roleKey = role.toLowerCase().replace(/\s+/g, '');
    const sessionKey = `${roleKey}_session`;
    const sessionData = sessionStorage.getItem(sessionKey);
    
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        let name = parsed.name || 'User';
        if (role === 'Super Admin') name = 'Super Admin';
        setUserName(name);
        setUserRole(parsed.role || role);
        if (parsed.collegeName) {
          setCollegeName(parsed.collegeName);
        }
        
        if (role !== 'Super Admin') {
          // ALWAYS fetch fresh data in background to prevent stale sessions
          import('../../api/index').then(({ getMyProfile }) => {
            getMyProfile().then(res => {
              if (res.data && res.data.collegeName && res.data.collegeName !== parsed.collegeName) {
                setCollegeName(res.data.collegeName);
                // Quietly update session storage
                parsed.collegeName = res.data.collegeName;
                sessionStorage.setItem(sessionKey, JSON.stringify(parsed));
              }
            }).catch(() => {});
          });
        }
      } catch (e) {
        console.error('Error parsing session data', e);
      }
    }

    if (role !== 'Super Admin' && role !== 'Student' && role !== 'Parent') {
      getDepartments()
        .then(res => {
          if (res?.data && res.data.length > 0) {
            // If backend has real departments, use them instead of fallback
            // setDepartments(res.data); 
          }
        })
        .catch(() => {
          // Silently catch 403/401 to prevent console errors when user lacks permission
        });
    }
  }, [role]);

  return (
    <header className="navbar glass-card">
      <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onMenuToggle && (
          <button className="icon-btn hamburger-btn" onClick={onMenuToggle}>
            <Menu size={20} />
          </button>
        )}
        <img src={theme === 'dark' ? '/logo.svg' : '/logo-dark.svg'} alt="ERPSYS Logo" className="navbar-logo" />
        <div className="navbar-greeting" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--text-main)', marginTop: '2px' }}>
            Welcome back, {userName}! 👋
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
            {userRole} Portal • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
      
      <div className="navbar-actions">


        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div className="notification-wrapper" style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown animate-fade-in" style={{ right: 0, background: 'var(--bg-card, #ffffff)' }}>
              <div className="dropdown-header">
                <h3>Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-primary font-bold">Mark all read</button>
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted text-sm">No new notifications</div>
                ) : (
                  [...notifications]
                    .sort((a, b) => (a.isRead === b.isRead ? 0 : a.isRead ? 1 : -1))
                    .map(notif => (
                      <div 
                        key={notif._id} 
                        className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color, #e5e7eb)',
                          background: !notif.isRead ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          marginBottom: '4px'
                        }}
                        onClick={() => { markAsRead(notif._id); if (notif.link) window.location.href = notif.link; }}
                      >
                        <div className="flex justify-between items-start mb-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`font-bold text-sm ${notif.type === 'Error' ? 'text-red-500' : notif.type === 'Warning' ? 'text-amber-500' : notif.type === 'Success' ? 'text-emerald-500' : 'text-indigo-500'}`} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {notif.type === 'Error' ? '🔴 ' : notif.type === 'Warning' ? '⚠️ ' : notif.type === 'Success' ? '✅ ' : 'ℹ️ '}{notif.title}
                          </span>
                          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'inline-block' }}></span>}
                        </div>
                        <p className="text-xs text-muted mb-1" style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{notif.message}</p>
                        <span className="text-xs text-muted opacity-70" style={{ fontSize: '0.7rem', opacity: 0.7 }}>{new Date(notif.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="navbar-profile-wrapper" style={{ position: 'relative' }}>
          <div className="navbar-profile" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4f46e5&color=fff`} alt="Profile" className="profile-img" />
            <div className="profile-info">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">{userRole}</span>
            </div>
            <ChevronDown size={16} className="text-muted" />
          </div>

          {showProfileDropdown && (
            <div className="profile-dropdown animate-fade-in" style={{ background: 'var(--bg-card, #ffffff)' }}>
              <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate(`/${role.toLowerCase().replace(/\s+/g, '')}/settings`); }}>
                <User size={16} /> My Profile
              </div>
              <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate(`/${role.toLowerCase().replace(/\s+/g, '')}/settings`); }}>
                <Settings size={16} /> Settings
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item text-red-500" onClick={() => {
                setShowProfileDropdown(false);
                sessionStorage.clear();
                navigate('/login');
              }}>
                <LogOut size={16} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
