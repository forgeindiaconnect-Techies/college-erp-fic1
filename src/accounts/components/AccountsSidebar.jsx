import React, { useState } from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, AlertCircle, Banknote,
  Receipt, FileText, LogOut, ChevronRight, ChevronDown,
  History, PieChart, Award, X, Wallet, FileBarChart
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const getAccountsSession = () => {
  return JSON.parse(sessionStorage.getItem('accounts_session') || 'null') || {
    name: 'Finance Admin',
    role: 'Accounts Dept.',
    email: 'finance@college.edu',
  };
};

const AccountsSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = React.useContext(SettingsContext);
  const navigate = useNavigate();
  const account = getAccountsSession();
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('accounts_session');
    sessionStorage.removeItem('accounts_token');
    navigate('/login');
  };

  const menuGroups = [
    {
      name: 'Fees & Collections',
      icon: <Wallet size={20} />,
      items: [
        { name: 'Fees Collection', path: '/accounts/fees-collection', icon: <CreditCard size={20} /> },
        { name: 'Pending Fees', path: '/accounts/pending-fees', icon: <AlertCircle size={20} /> },
        { name: 'Payment History', path: '/accounts/payment-history', icon: <History size={20} /> }
      ]
    },
    {
      name: 'Financial Operations',
      icon: <Banknote size={20} />,
      items: [
        { name: 'Salary Management', path: '/accounts/salary', icon: <Banknote size={20} /> },
        { name: 'Expense Tracking', path: '/accounts/expenses', icon: <PieChart size={20} /> },
        { name: 'Receipt Generation', path: '/accounts/receipts', icon: <Receipt size={20} /> },
        { name: 'Scholarships', path: '/accounts/scholarships', icon: <Award size={20} /> }
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

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
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
            src="/logo.svg?v=1782115707199" 
            alt="ERPSYS Logo" 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        )}
        <button className="sidebar-close-btn" onClick={onClose}>
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
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
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
                      end={item.exact}
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
