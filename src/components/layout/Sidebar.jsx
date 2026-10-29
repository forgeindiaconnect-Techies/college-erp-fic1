import React, { useState, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SettingsContext } from '../../App';
import { 
  X, LayoutDashboard, Building2, GraduationCap, Users, Heart, BookOpen, 
  Calendar, CalendarCheck, FileSpreadsheet, BookOpenCheck, Inbox, FileBarChart, 
  ClipboardList, Megaphone, ShieldCheck, Shield, Settings, ChevronRight, ChevronDown, 
  Wallet, Activity, PieChart, LogOut, Library, Bus, Building, Briefcase, Bot, Layers, Clock, Award, Network,
  CreditCard, ScanLine, Package, UserCheck
} from 'lucide-react';
import '../../components/layout/Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({});
  const { collegeSettings } = useContext(SettingsContext) || {};

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const isBusinessReferralActive = location.pathname.startsWith('/admin/business-referral') || location.pathname.startsWith('/admin/business-referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const adminBusinessReferralItems = [
    { name: 'All Categories', path: '/admin/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Cards', path: '/admin/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance', path: '/admin/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Job Openings', path: '/admin/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Bank Accounts', path: '/admin/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives & Rules', path: '/admin/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'Management Console', path: '/admin/business-referrals', icon: <FileBarChart size={16} /> }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_token');
    navigate('/login');
  };

  const menuGroups = [
    {
      name: 'User Management',
      icon: <Users size={20} />,
      items: [
        { name: 'Accounts Officer', path: '/admin/accounts-management', icon: <Wallet size={20} /> },
        { name: 'Principal', path: '/admin/principal-management', icon: <GraduationCap size={20} /> },
        { name: 'Hostel', path: '/admin/hostel-management', icon: <Building size={20} /> },
        { name: 'HODs', path: '/admin/hods', icon: <GraduationCap size={20} /> },
        { name: 'Staff', path: '/admin/staff', icon: <GraduationCap size={20} /> },
        { name: 'Students', path: '/admin/students', icon: <Users size={20} /> },
        { name: 'Parents', path: '/admin/parents', icon: <Heart size={20} /> },
        { name: 'Drivers', path: '/admin/drivers', icon: <Bus size={20} /> },
        { name: 'Library', path: '/admin/librarian-management', icon: <Library size={20} /> },
        { name: 'Placement', path: '/admin/placement-management', icon: <Briefcase size={20} /> },
        { name: 'Watchman Management', path: '/admin/watchman-management', icon: <Shield size={20} /> }
      ]
    },
    {
      name: 'Academic',
      icon: <Layers size={20} />,
      items: [
        { name: 'Academic Master', path: '/admin/academic-master', icon: <Settings size={20} /> },
        { name: 'Academic Structure', path: '/admin/academic', icon: <Layers size={20} /> },
        {
          name: 'Student to Section',
          path: '/admin/student-section-allocation',
          icon: <Users size={20} />
        },
        {
          name: 'Faculty to Subject',
          path: '/admin/faculty-allocation',
          icon: <GraduationCap size={20} />
        },
        { name: 'Subjects', path: '/admin/subjects', icon: <BookOpen size={20} /> },
        { name: 'Class Timetable', path: '/admin/timetable', icon: <Calendar size={20} /> },
        { name: 'Student Attendance', path: '/admin/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Staff Attendance', path: '/admin/employee-attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Exam Timetable', path: '/admin/exams', icon: <FileSpreadsheet size={20} /> },
        { name: 'Student Promotion', path: '/admin/promotion', icon: <GraduationCap size={20} /> },
        { name: 'Results', path: '/admin/marks', icon: <BookOpenCheck size={20} /> },
        { name: 'Assignments', path: '/admin/assignments', icon: <ClipboardList size={20} /> }
      ]
    },
    {
      name: 'Fee Management',
      icon: <Wallet size={20} />,
      items: [
        { name: 'Fee Structure', path: '/admin/fee-structure', icon: <Layers size={20} /> },
        { name: 'Fees & Collections', path: '/admin/fees', icon: <Wallet size={20} /> },
        { name: 'Quota Management', path: '/admin/quota-management', icon: <Award size={20} /> },
        { name: 'Scholarship Management', path: '/admin/scholarship-management', icon: <Award size={20} /> },
        { name: 'Student Welfare', path: '/admin/student-welfare', icon: <Heart size={20} /> },
        { name: 'Payroll', path: '/admin/payroll', icon: <FileSpreadsheet size={20} /> }
      ]
    },
    {
      name: 'Resources',
      icon: <Library size={20} />,
      items: [
        { name: 'Library', path: '/admin/library', icon: <Library size={20} />, flag: 'libraryEnabled' },
        { name: 'Transport', path: '/admin/transport', icon: <Bus size={20} />, flag: 'transportEnabled' },
        { name: 'Bus Gate Tracking', path: '/admin/bus-tracking', icon: <Bus size={20} />, flag: 'transportEnabled' },
        { name: 'Hostel', path: '/admin/hostel', icon: <Building size={20} />, flag: 'hostelEnabled' },
        { name: 'Placement', path: '/admin/placement', icon: <Briefcase size={20} />, flag: 'placementEnabled' },
        { name: 'Delivery & Parcels', path: '/admin/parcels', icon: <Package size={20} /> },
        { name: 'Watchman Monitoring', path: '/admin/watchman-monitoring', icon: <ShieldCheck size={20} /> },
        { name: 'Visitor Approvals', path: '/admin/visitor-approvals', icon: <UserCheck size={20} /> }
      ].filter(item => !item.flag || !collegeSettings || collegeSettings[item.flag] !== false)
    },
    {
      name: 'Communication',
      icon: <Megaphone size={20} />,
      items: [
        { name: 'Announcements', path: '/admin/announcements', icon: <Megaphone size={20} /> },
        { name: 'Leave Requests', path: '/admin/leaves', icon: <Inbox size={20} /> }
      ]
    },
    {
      name: 'Reports & Analytics',
      icon: <PieChart size={20} />,
      items: [
        { name: 'Reports', path: '/admin/reports', icon: <FileBarChart size={20} /> },
        { name: 'Activity Logs', path: '/admin/activity-logs', icon: <Activity size={20} /> }
      ]
    },
    {
      name: 'Administration',
      icon: <Settings size={20} />,
      items: [
        { name: 'Settings & Security', path: '/admin/settings', icon: <ShieldCheck size={20} className="text-red-500" /> },
        { name: 'My Subscription', path: '/admin/subscription', icon: <Wallet size={20} style={{ color: '#f59e0b' }} /> }
      ]
    }
  ];

  const getAdminSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('admin_session') || '{}');
    } catch(e) {
      return {};
    }
  };
  const adminSession = getAdminSession();
  const displayCollegeName = adminSession?.collegeName || collegeSettings?.collegeName || 'Institution Portal';

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          {collegeSettings?.collegeLogo ? (
            <img 
              src={collegeSettings.collegeLogo} 
              alt={displayCollegeName} 
              style={{ height: '32px', objectFit: 'contain' }} 
            />
          ) : (
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--sidebar-text-active, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {displayCollegeName}
            </div>
          )}
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, paddingBottom: '2rem' }}>
          <ul>
            <li style={{ marginBottom: '0.5rem' }}>
              <NavLink 
                to="/admin/dashboard" 
                end={true}
                className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                onClick={handleNavClick}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
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
                {adminBusinessReferralItems.map((item, i) => (
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
    </>
  );
};

export default Sidebar;





