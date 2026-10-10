import React, { useState } from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, AlertCircle, Banknote,
  Receipt, FileText, FileCheck, LogOut, ChevronRight, ChevronDown,
  History, PieChart, Award, X, Wallet, FileBarChart,
  UserPlus, Layers, ShieldCheck, CalendarCheck
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const getAccountsSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('accounts_session') || sessionStorage.getItem('admin_session') || sessionStorage.getItem('superadmin_session') || '{}') || {
      name: 'Finance Admin',
      role: 'Accounts Dept.',
      email: 'finance@college.edu',
    };
  } catch (e) {
    return {
      name: 'Finance Admin',
      role: 'Accounts Dept.',
      email: 'finance@college.edu',
    };
  }
};

const AccountsSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const location = useLocation();
  const account = getAccountsSession();
  const [expandedGroups, setExpandedGroups] = useState({});

  const isItemActive = (itemPath) => {
    const currentFull = location.pathname + location.search;
    if (itemPath.includes('?')) {
      return currentFull === itemPath;
    }
    if (itemPath === '/accounts/fees-collection') {
      return location.pathname === '/accounts/fees-collection' && !location.search.includes('tab=clearance') && !location.search.includes('tab=report');
    }
    return location.pathname === itemPath;
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('accounts_session');
    sessionStorage.removeItem('accounts_token');
    if (onClose) onClose();
    navigate('/login');
  };

  const menuGroups = [
    {
      name: 'Student Management',
      icon: <UserPlus size={20} />,
      items: [
        {
          name: 'Student Registration',
          path: '/accounts/student-registration',
          icon: <UserPlus size={20} />
        }
      ]
    },
    {
      name: 'Fee Management',
      icon: <Wallet size={20} />,
      items: [
        { name: 'Fee Structure', path: '/accounts/fee-structure', icon: <Layers size={20} /> },
        { name: 'Quota Management', path: '/accounts/quota-management', icon: <Award size={20} /> },
        { name: 'Scholarship Management', path: '/accounts/scholarship-management', icon: <Award size={20} /> },
        { name: 'Fees Collection', path: '/accounts/fees-collection', icon: <CreditCard size={20} /> },
        { name: 'Library Clearance', path: '/accounts/fees-collection?tab=clearance', icon: <ShieldCheck size={20} /> },
        { name: 'Pending Fees', path: '/accounts/pending-fees', icon: <AlertCircle size={20} /> },
        { name: 'Payment History', path: '/accounts/payment-history', icon: <History size={20} /> }
      ]
    },
    {
      name: 'Financial Operations',
      icon: <Banknote size={20} />,
      items: [
        { name: 'Daily Attendance', path: '/accounts/daily-attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Monthly Record', path: '/accounts/daily-attendance?tab=monthly', icon: <FileBarChart size={20} /> },
        { name: 'Salary Management', path: '/accounts/salary', icon: <Banknote size={20} /> },
        { name: 'Expense Tracking', path: '/accounts/expenses', icon: <PieChart size={20} /> },
        { name: 'Receipt Generation', path: '/accounts/receipts', icon: <Receipt size={20} /> },
        { name: 'Scholarships', path: '/accounts/scholarships', icon: <Award size={20} /> }
      ]
    },
    {
      name: 'Document Management',
      icon: <FileCheck size={20} />,
      items: [
        {
          name: 'Document Tracker',
          path: '/accounts/document-tracker',
          icon: <FileCheck size={20} />
        }
      ]
    },
    {
      name: 'Reports & Analytics',
      icon: <FileBarChart size={20} />,
      items: [
        { name: 'Financial Reports', path: '/accounts/reports', icon: <FileText size={20} /> }
      ]
    }
  ];

  const sessionCollege = account?.collegeName && account.collegeName !== 'Institution Portal' ? account.collegeName : null;

  const displayCollegeName = sessionCollege 
    || (collegeSettings?.collegeName && collegeSettings.collegeName !== 'Campus ERP Portal' ? collegeSettings.collegeName : 'Accounts Department');

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
          <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--sidebar-text-active, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={displayCollegeName}>
            {displayCollegeName}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Accounts Portal
          </span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, paddingBottom: '2rem' }}>
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink 
              to="/accounts/dashboard" 
              end={true}
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
              onClick={handleNavClick}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>

          {menuGroups.map((group, idx) => {
            const hasActiveItem = group.items.some(item => isItemActive(item.path));
            const isExpanded = expandedGroups[group.name] !== undefined ? expandedGroups[group.name] : hasActiveItem;

            return (
              <li key={idx} style={{ marginBottom: '0.5rem' }}>
                <div 
                  className={`nav-group-header ${hasActiveItem ? 'active' : ''}`}
                  onClick={() => toggleGroup(group.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {group.icon}
                    <span>{group.name}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
                
                <ul className={`nav-group-items ${isExpanded ? 'expanded' : 'collapsed'}`}>
                  {group.items.map((item, i) => (
                    <li key={i}>
                      <NavLink 
                        to={item.path} 
                        end={item.exact}
                        className={() => isItemActive(item.path) ? "nav-link active" : "nav-link"}
                        onClick={handleNavClick}
                        style={{ paddingLeft: '2.8rem' }}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
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

export default AccountsSidebar;
