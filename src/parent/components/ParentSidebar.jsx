import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../../App';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, BookOpenCheck,
  CreditCard, Calendar, FileText, Bell, LogOut, ChevronRight, ChevronDown,
  X, Bus, User, GraduationCap, Award, Network,
  ShieldCheck, Layers, Briefcase, Building, FileCheck
} from 'lucide-react';
import { getStudentById, getStudents } from '../../api/index';
import '../../components/layout/Sidebar.css';

const ParentSidebar = ({ isOpen, onClose }) => {
  const { collegeSettings } = useContext(SettingsContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [parentSession, setParentSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('parent_session') || '{}');
    } catch (e) {
      return {};
    }
  });

  const [childInfo, setChildInfo] = useState({
    name: '',
    id: ''
  });

  const [expandedGroups, setExpandedGroups] = useState({
    'Child Academics': true,
    'Administration': true
  });

  // Sync session and resolve authentic student profile
  const syncStudentProfile = async () => {
    let session = {};
    try {
      session = JSON.parse(sessionStorage.getItem('parent_session') || '{}');
      setParentSession(session);
    } catch (e) {}

    const studentId = session.childId || session.referenceId || session.parentOf || session.id || 'TAM2026-001';
    let currentChildName = session.childName;

    // If childName is missing, placeholder 'John Doe', or generic, resolve authentic DB record
    if (!currentChildName || currentChildName === 'John Doe' || currentChildName === 'Child Name' || currentChildName === 'Student') {
      try {
        let resolvedStudent = null;
        if (studentId) {
          const res = await getStudentById(studentId).catch(() => null);
          if (res?.data) resolvedStudent = res.data;
        }

        if (!resolvedStudent) {
          const allStudsRes = await getStudents().catch(() => null);
          const allStuds = Array.isArray(allStudsRes?.data) ? allStudsRes.data : [];
          if (allStuds.length > 0) {
            resolvedStudent = allStuds.find(s => 
              (s.id && String(s.id).toLowerCase() === String(studentId).toLowerCase()) ||
              (s.rollNo && String(s.rollNo).toLowerCase() === String(studentId).toLowerCase()) ||
              (s._id && String(s._id) === String(studentId))
            ) || allStuds[0];
          }
        }

        if (resolvedStudent?.name) {
          currentChildName = resolvedStudent.name;
          const updatedSession = {
            ...session,
            childName: resolvedStudent.name,
            childId: resolvedStudent.id || resolvedStudent.rollNo || studentId,
            childDept: resolvedStudent.dept || resolvedStudent.department,
            childSem: resolvedStudent.sem || resolvedStudent.semester
          };
          sessionStorage.setItem('parent_session', JSON.stringify(updatedSession));
          setParentSession(updatedSession);
        }
      } catch (e) {}
    }

    setChildInfo({
      name: currentChildName || 'Student Scholar',
      id: session.childId || session.referenceId || session.parentOf || studentId
    });
  };

  useEffect(() => {
    syncStudentProfile();

    const handleUpdate = () => syncStudentProfile();
    window.addEventListener('parent_session_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('parent_session_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const isItemActive = (path) => {
    return location.pathname === path;
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const menuGroups = [
    {
      name: 'Child Academics',
      icon: <BookOpenCheck size={20} />,
      items: [
        { name: 'Child Attendance', path: '/parent/attendance', icon: <CalendarCheck size={20} /> },
        { name: 'Child Marks', path: '/parent/marks', icon: <BookOpenCheck size={20} /> },
        { name: 'Timetable & Exams', path: '/parent/timetable', icon: <Calendar size={20} /> }
      ]
    },
    {
      name: 'Administration',
      icon: <FileText size={20} />,
      items: [
        { name: 'Fee Status', path: '/parent/fees', icon: <CreditCard size={20} /> },
        { name: 'Leave Status', path: '/parent/leaves', icon: <FileText size={20} /> },
        { name: 'Transport & Bus', path: '/parent/transport', icon: <Bus size={20} /> },
        { name: 'Notifications', path: '/parent/notifications', icon: <Bell size={20} /> }
      ]
    }
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('parent_session');
    sessionStorage.removeItem('parent_token');
    if (onClose) onClose();
    navigate('/login');
  };

  const isBusinessReferralActive = location.pathname.startsWith('/parent/business-referral') || location.pathname.startsWith('/parent/referrals');
  const isBusinessReferralExpanded = expandedGroups['Business Referral'] !== undefined
    ? expandedGroups['Business Referral']
    : isBusinessReferralActive;

  const parentBusinessReferralItems = [
    { name: 'All Categories', path: '/parent/business-referral', exact: true, icon: <Layers size={16} /> },
    { name: 'Credit Cards', path: '/parent/business-referral/credit-card', icon: <CreditCard size={16} /> },
    { name: 'Insurance', path: '/parent/business-referral/insurance', icon: <ShieldCheck size={16} /> },
    { name: 'Jobs', path: '/parent/business-referral/job-referral', icon: <Briefcase size={16} /> },
    { name: 'Account Opening', path: '/parent/business-referral/account-opening', icon: <Building size={16} /> },
    { name: 'Incentives', path: '/parent/business-referral/incentives', icon: <Award size={16} /> },
    { name: 'My Submissions', path: '/parent/referrals', icon: <FileCheck size={16} /> }
  ];

  const displayCollegeName = parentSession?.collegeName 
    || (collegeSettings?.collegeName && collegeSettings.collegeName !== 'Campus ERP Portal' ? collegeSettings.collegeName : 'Arignar Anna College');

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
            Parent Portal
          </span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Child Profile Quick Badge */}
      <div style={{ padding: '0.75rem 1rem', margin: '0.5rem 0.85rem 0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GraduationCap size={18} />
        </div>
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>Ward</span>
          <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {childInfo.name || 'Student'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            ID: {childInfo.id || 'TAM2026-001'}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, paddingBottom: '2rem' }}>
        <ul>
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink
              to="/parent/dashboard"
              end={true}
              className={() => isItemActive('/parent/dashboard') ? 'nav-link active' : 'nav-link'}
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
              {parentBusinessReferralItems.map((item, i) => (
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
                      className={() => isItemActive(item.path) ? 'nav-link active' : 'nav-link'}
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

export default ParentSidebar;
