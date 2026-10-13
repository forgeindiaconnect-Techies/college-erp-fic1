import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Crown,
  Settings,
  Landmark,
  Users,
  User,
  UserCheck,
  UserPlus,
  Bus,
  BookOpen,
  IndianRupee,
  Home,
  ShieldCheck,
  Briefcase,
  Layers,
  Cloud,
  TrendingUp,
  ArrowRight,
  Search,
  Bell,
  ChevronDown,
  LayoutGrid,
  Phone,
  Shield,
  Zap,
  Laptop,
  Headphones,
  CheckCircle2,
  Menu,
  X,
  FileText,
  Info,
  Building,
  Building2,
  ChevronRight,
  Play,
  Award,
  Mail,
  MapPin,
  Clock
} from 'lucide-react';
import './LandingPage.css';

// ── 11 ROLE-BASED DASHBOARD CARDS (Matching Reference Image Exactly) ─────────
const ROLE_CARDS = [
  // ── ROW 1 (6 CARDS) ──
  {
    id: 'super-admin',
    role: 'Super Admin',
    loginRole: 'Super Admin',
    title: 'Super Admin',
    desc: 'Full system access and management',
    icon: Crown,
    cardBg: '#eff6ff',
    borderColor: '#dbeafe',
    iconBg: '#3b82f6',
    iconColor: '#ffffff',
    btnBg: '#2563eb'
  },
  {
    id: 'admin',
    role: 'Admin',
    loginRole: 'Admin',
    title: 'Admin',
    desc: 'Manage college operations',
    icon: Settings,
    cardBg: '#f5f3ff',
    borderColor: '#ede9fe',
    iconBg: '#8b5cf6',
    iconColor: '#ffffff',
    btnBg: '#7c3aed'
  },
  {
    id: 'principal',
    role: 'Principal',
    loginRole: 'Principal',
    title: 'Principal',
    desc: 'Monitor and approve all activities',
    icon: Landmark,
    cardBg: '#ecfdf5',
    borderColor: '#d1fae5',
    iconBg: '#10b981',
    iconColor: '#ffffff',
    btnBg: '#059669'
  },
  {
    id: 'hod',
    role: 'HOD',
    loginRole: 'HOD',
    title: 'HOD',
    desc: 'Manage department and faculty',
    icon: Users,
    cardBg: '#fff7ed',
    borderColor: '#ffedd5',
    iconBg: '#f97316',
    iconColor: '#ffffff',
    btnBg: '#ea580c'
  },
  {
    id: 'staff',
    role: 'Staff / Faculty',
    loginRole: 'Staff',
    title: 'Staff / Faculty',
    desc: 'Handle academic and student records',
    icon: User,
    cardBg: '#fdf2f8',
    borderColor: '#fce7f3',
    iconBg: '#ec4899',
    iconColor: '#ffffff',
    btnBg: '#db2777'
  },
  {
    id: 'student',
    role: 'Student',
    loginRole: 'Student',
    title: 'Student',
    desc: 'Access courses, attendance & results',
    icon: GraduationCap,
    cardBg: '#ecfeff',
    borderColor: '#cffafe',
    iconBg: '#06b6d4',
    iconColor: '#ffffff',
    btnBg: '#0891b2'
  },

  // ── ROW 2 (5 CARDS) ──
  {
    id: 'parent',
    role: 'Parent',
    loginRole: 'Parent',
    title: 'Parent',
    desc: 'Track student progress & updates',
    icon: Users,
    cardBg: '#fefce8',
    borderColor: '#fef08a',
    iconBg: '#eab308',
    iconColor: '#ffffff',
    btnBg: '#ca8a04'
  },
  {
    id: 'driver',
    role: 'Driver',
    loginRole: 'Driver',
    title: 'Driver',
    desc: 'Manage transport and vehicle details',
    icon: Bus,
    cardBg: '#f0f9ff',
    borderColor: '#e0f2fe',
    iconBg: '#0284c7',
    iconColor: '#ffffff',
    btnBg: '#0369a1'
  },
  {
    id: 'library',
    role: 'Library / Librarian',
    loginRole: 'Librarian',
    title: 'Library / Librarian',
    desc: 'Book issue/return and library records',
    icon: BookOpen,
    cardBg: '#faf5ff',
    borderColor: '#f3e8ff',
    iconBg: '#a855f7',
    iconColor: '#ffffff',
    btnBg: '#9333ea'
  },
  {
    id: 'accounts',
    role: 'Accounts',
    loginRole: 'Accounts',
    title: 'Accounts',
    desc: 'Fees, payments and financial records',
    icon: IndianRupee,
    cardBg: '#f0fdf4',
    borderColor: '#dcfce7',
    iconBg: '#22c55e',
    iconColor: '#ffffff',
    btnBg: '#16a34a'
  },
  {
    id: 'hostel',
    role: 'Hostel',
    loginRole: 'Hostel',
    title: 'Hostel',
    desc: 'Room allocation and hostel details',
    icon: Home,
    cardBg: '#fff7ed',
    borderColor: '#fed7aa',
    iconBg: '#f97316',
    iconColor: '#ffffff',
    btnBg: '#ea580c'
  }
];

// ── 7 CIRCULAR KEY FEATURES (Matching Lower-Left Strip) ─────────────────────
const STRIP_FEATURES = [
  {
    id: 'fees',
    icon: IndianRupee,
    title: 'Fee Collection',
    sub: '& Scholarships',
    color: '#16a34a',
    bg: '#ecfdf5'
  },
  {
    id: 'exams',
    icon: Award,
    title: 'Examinations',
    sub: '& Marks',
    color: '#2563eb',
    bg: '#eff6ff'
  },
  {
    id: 'library',
    icon: BookOpen,
    title: 'Library',
    sub: 'Management',
    color: '#4f46e5',
    bg: '#eef2ff'
  },
  {
    id: 'placements',
    icon: Briefcase,
    title: 'Placements',
    sub: '& Career',
    color: '#0284c7',
    bg: '#f0f9ff'
  },
  {
    id: 'transport',
    icon: Bus,
    title: 'Transport',
    sub: 'Management',
    color: '#0891b2',
    bg: '#ecfeff'
  },
  {
    id: 'hostel',
    icon: Home,
    title: 'Hostel',
    sub: 'Management',
    color: '#2563eb',
    bg: '#eff6ff'
  },
  {
    id: 'documents',
    icon: FileText,
    title: 'Document',
    sub: 'Management',
    color: '#3b82f6',
    bg: '#eff6ff'
  }
];

// ── 4 STAT METRICS (Matching Lower-Right Glance) ─────────────────────────────
const COLLEGE_STATS = [
  {
    label: 'Students',
    value: '1250+',
    icon: Users,
    bg: '#eff6ff',
    border: '#dbeafe',
    color: '#2563eb'
  },
  {
    label: 'Staff',
    value: '120+',
    icon: UserCheck,
    bg: '#ecfdf5',
    border: '#d1fae5',
    color: '#059669'
  },
  {
    label: 'Departments',
    value: '12+',
    icon: Building2,
    bg: '#fff7ed',
    border: '#ffedd5',
    color: '#ea580c'
  },
  {
    label: 'Digital Records',
    value: '98%',
    icon: FileText,
    bg: '#f5f3ff',
    border: '#ede9fe',
    color: '#7c3aed'
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [quickLoginRole, setQuickLoginRole] = useState('Select Role');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const notifRef = useRef(null);
  const loginRef = useRef(null);
  const roleSelectRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
      if (loginRef.current && !loginRef.current.contains(e.target)) {
        setShowLoginDropdown(false);
      }
      if (roleSelectRef.current && !roleSelectRef.current.contains(e.target)) {
        setShowRoleSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (id) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRoleLogin = (roleName) => {
    navigate(`/login?role=${encodeURIComponent(roleName)}`);
  };

  const handleQuickLoginSubmit = () => {
    if (!quickLoginRole || quickLoginRole === 'Select Role') {
      navigate('/login');
    } else {
      navigate(`/login?role=${encodeURIComponent(quickLoginRole)}`);
    }
  };

  const filteredRoles = ROLE_CARDS.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="erp-landing-root">

      {/* ─────────────────────────────────────────────────────────────
         1. HEADER & NAVIGATION BAR (Exact Match to Reference Image)
         ───────────────────────────────────────────────────────────── */}
      <header className="erp-header">
        <div className="erp-header-container">

          {/* Logo & Branding */}
          <div className="erp-brand" onClick={() => scrollToSection('home')}>
            <div className="erp-brand-logo-box">
              <GraduationCap size={22} className="erp-brand-icon" />
            </div>
            <div className="erp-brand-info">
              <span className="erp-brand-title">College ERP</span>
              <span className="erp-brand-subtitle">Smart Education Management</span>
            </div>
          </div>

          {/* Center Navigation Links (Pill Style) */}
          <nav className="erp-nav-pill-group">
            <button
              type="button"
              className={`erp-nav-pill-btn ${activeNav === 'home' ? 'active-pill' : ''}`}
              onClick={() => scrollToSection('home')}
            >
              <Home size={15} />
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`erp-nav-pill-btn ${activeNav === 'about' ? 'active-pill' : ''}`}
              onClick={() => scrollToSection('about')}
            >
              <Info size={15} />
              <span>About</span>
            </button>

            <button
              type="button"
              className={`erp-nav-pill-btn ${activeNav === 'features' ? 'active-pill' : ''}`}
              onClick={() => scrollToSection('features')}
            >
              <LayoutGrid size={15} />
              <span>Features</span>
            </button>

            <button
              type="button"
              className={`erp-nav-pill-btn ${activeNav === 'modules' ? 'active-pill' : ''}`}
              onClick={() => scrollToSection('modules')}
            >
              <Layers size={15} />
              <span>Modules</span>
            </button>

            <button
              type="button"
              className={`erp-nav-pill-btn ${activeNav === 'contact' ? 'active-pill' : ''}`}
              onClick={() => {
                setActiveNav('contact');
                setShowContactModal(true);
                scrollToSection('contact');
              }}
            >
              <Phone size={15} />
              <span>Contact</span>
            </button>
          </nav>

          {/* Right Header Actions: Search, Notifications (Badge 2), Login Pill */}
          <div className="erp-header-right-actions">

            {/* Search Icon */}
            <button
              type="button"
              className="erp-action-icon-btn"
              onClick={() => setShowSearchModal(true)}
              title="Search portals and modules"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Notification Bell with Red Badge '2' */}
            <div className="erp-dropdown-wrap" ref={notifRef}>
              <button
                type="button"
                className="erp-action-icon-btn notif-btn"
                onClick={() => setShowNotifMenu(prev => !prev)}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="erp-notif-badge">2</span>
              </button>

              {showNotifMenu && (
                <div className="erp-dropdown-popover notif-popover animate-fade-in">
                  <div className="popover-header">
                    <h4>Campus Announcements</h4>
                    <span className="badge-new">2 New</span>
                  </div>
                  <div className="popover-list">
                    <div className="popover-item" onClick={() => navigate('/login?role=Student')}>
                      <div className="item-dot blue"></div>
                      <div>
                        <strong>Semester Exam Schedule Released</strong>
                        <p>Winter examination timetable now uploaded on student portal.</p>
                      </div>
                    </div>
                    <div className="popover-item" onClick={() => navigate('/login?role=Accounts')}>
                      <div className="item-dot green"></div>
                      <div>
                        <strong>Online Fee Portal Open</strong>
                        <p>Term 2 tuition payments active with 0% gateway charges.</p>
                      </div>
                    </div>
                  </div>
                  <div className="popover-footer" onClick={() => navigate('/login')}>
                    Sign in to view all notifications &rarr;
                  </div>
                </div>
              )}
            </div>

            {/* Blue Pill Login Button: "[ 👤 Login ▾ ]" */}
            <div className="erp-dropdown-wrap" ref={loginRef}>
              <button
                type="button"
                className="erp-header-login-pill-btn"
                onClick={() => setShowLoginDropdown(prev => !prev)}
                aria-label="Login Menu"
              >
                <User size={16} />
                <span>Login</span>
                <ChevronDown size={14} />
              </button>

              {showLoginDropdown && (
                <div className="erp-dropdown-popover login-popover animate-fade-in">
                  <div className="login-popover-header">
                    <strong>Select Portal Role</strong>
                    <p>Direct authentication access</p>
                  </div>
                  <div className="login-popover-list">
                    {ROLE_CARDS.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        className="login-popover-item"
                        onClick={() => {
                          setShowLoginDropdown(false);
                          handleRoleLogin(r.loginRole);
                        }}
                      >
                        <span className="dot" style={{ backgroundColor: r.btnBg }}></span>
                        <span>{r.title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="login-popover-footer">
                    <button onClick={() => { setShowLoginDropdown(false); navigate('/login'); }}>
                      Go to Unified Login Page &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="erp-mobile-toggle"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

          </div>

        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="erp-mobile-drawer animate-fade-in">
            <div className="mobile-drawer-links">
              <button onClick={() => scrollToSection('home')}>Home</button>
              <button onClick={() => scrollToSection('about')}>About</button>
              <button onClick={() => scrollToSection('features')}>Features</button>
              <button onClick={() => scrollToSection('modules')}>Modules</button>
              <button onClick={() => {
                setShowContactModal(true);
                scrollToSection('contact');
              }}>Contact</button>
            </div>
            <div className="mobile-drawer-actions">
              <button className="mobile-login-btn" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
                Login to Portal &rarr;
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
         2. HERO SECTION WITH CAMPUS VISUAL & QUICK LOGIN
         ───────────────────────────────────────────────────────────── */}
      <section className="erp-hero-section" id="home">
        
        {/* Campus Background Visual on Right Side */}
        <div className="erp-hero-bg-visual" style={{ backgroundImage: "url('/college_campus_hero.jpg')" }}>
        </div>

        <div className="erp-hero-inner-content">
          
          {/* Handwritten Decorative Script "Better Education Brighter Future" in the sky */}
          <div className="erp-hero-cursive-quote">
            <span>Better</span>
            <span>Education</span>
            <span>Brighter Future</span>
          </div>

          {/* Left Column: Hero Copy & Actions */}
          <div className="erp-hero-copy">

            {/* Welcome Pill Tag: "Modern • Secure • Integrated" */}
            <div className="erp-welcome-tag">
              <span>Modern • Secure • Integrated</span>
            </div>

            {/* Main Headline */}
            <h1 className="erp-hero-heading">
              Manage Your College<br />
              Operations <span className="highlight-blue">Smarter &amp; Easier</span>
            </h1>

            {/* Friendly Description */}
            <p className="erp-hero-subtext">
              A complete and integrated ERP solution for modern colleges, designed to simplify academic, administrative and non-academic processes.
            </p>

            {/* Main CTAs */}
            <div className="erp-hero-ctas">
              <button
                type="button"
                className="erp-btn-primary"
                onClick={() => navigate('/register')}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 4 Trust & Benefit Badges */}
            <div className="erp-hero-trust-row">
              <div className="trust-item">
                <div className="trust-icon-box">
                  <Shield size={16} />
                </div>
                <div className="trust-text">
                  <strong>Secure</strong>
                  <span>Data Protected</span>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <Zap size={16} />
                </div>
                <div className="trust-text">
                  <strong>Fast</strong>
                  <span>High Performance</span>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <Laptop size={16} />
                </div>
                <div className="trust-text">
                  <strong>Easy to Use</strong>
                  <span>User Friendly</span>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <Headphones size={16} />
                </div>
                <div className="trust-text">
                  <strong>24/7 Support</strong>
                  <span>Always Here</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Floating Quick Login Card with Role Dropdown */}
          <div className="erp-hero-quick-login-card">
            
            <div className="quick-login-header">
              <h3 className="quick-login-title">Quick Login</h3>
              <p className="quick-login-subtitle">Choose your role to continue</p>
            </div>

            {/* Role Select Dropdown: "[ 👤 Select Role ▾ ]" */}
            <div className="quick-login-role-selector-wrap" ref={roleSelectRef}>
              <button
                type="button"
                className="quick-login-role-selector-btn"
                onClick={() => setShowRoleSelector(prev => !prev)}
              >
                <div className="selector-left">
                  <User size={16} className="selector-icon" />
                  <span className={quickLoginRole === 'Select Role' ? 'placeholder' : 'selected-text'}>
                    {quickLoginRole}
                  </span>
                </div>
                <ChevronDown size={14} className="selector-chevron" />
              </button>

              {showRoleSelector && (
                <div className="quick-login-role-dropdown-menu animate-fade-in">
                  {ROLE_CARDS.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className="role-dropdown-item"
                      onClick={() => {
                        setQuickLoginRole(r.loginRole);
                        setShowRoleSelector(false);
                      }}
                    >
                      <span className="role-color-dot" style={{ backgroundColor: r.btnBg }}></span>
                      <span>{r.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Primary Blue Button: "Login Now →" */}
            <button
              type="button"
              className="quick-login-btn-primary"
              onClick={handleQuickLoginSubmit}
            >
              <span>Login Now</span>
              <ArrowRight size={16} />
            </button>

            {/* Mint Green Card: "New to College ERP? Get Started →" */}
            <div 
              className="quick-login-register-box"
              onClick={() => navigate('/register')}
            >
              <div className="register-box-icon">
                <UserPlus size={18} />
              </div>
              <div className="register-box-text">
                <span className="register-label">New to College ERP?</span>
                <span className="register-action">Get Started &rarr;</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         3. ACCESS YOUR DASHBOARD (Row 1: 6 Cards, Row 2: 5 Cards)
         ───────────────────────────────────────────────────────────── */}
      <section className="erp-dashboard-section" id="modules">
        <div className="erp-container">

          {/* Section Header */}
          <div className="erp-dashboard-header">
            <div>
              <h2 className="erp-section-title">Access Your Dashboard</h2>
              <p className="erp-section-subtitle">
                Select your role to get started with the portal
              </p>
            </div>

            <div className="erp-dashboard-header-right">
              <span className="erp-badge-quick-access">
                <Zap size={13} /> Quick Access
              </span>
              <button
                type="button"
                className="erp-link-all-modules"
                onClick={() => scrollToSection('features')}
              >
                <span>View All Modules</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* 11 Role Cards: Row 1 has 6 cards, Row 2 has 5 cards */}
          <div className="erp-role-cards-wrapper">
            
            {/* ROW 1: Super Admin, Admin, Principal, HOD, Staff / Faculty, Student */}
            <div className="erp-role-cards-row-1">
              {ROLE_CARDS.slice(0, 6).map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    className="erp-role-card"
                    style={{
                      backgroundColor: card.cardBg,
                      borderColor: card.borderColor
                    }}
                    onClick={() => handleRoleLogin(card.loginRole)}
                  >
                    <div
                      className="role-card-icon-circle"
                      style={{
                        backgroundColor: card.iconBg,
                        color: card.iconColor
                      }}
                    >
                      <IconComponent size={20} />
                    </div>

                    <div className="role-card-content">
                      <h3 className="role-card-title">{card.title}</h3>
                      <p className="role-card-desc">{card.desc}</p>
                    </div>

                    <button
                      type="button"
                      className="role-card-login-pill-btn"
                      style={{ backgroundColor: card.btnBg }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleLogin(card.loginRole);
                      }}
                    >
                      <span>Login</span>
                      <ArrowRight size={12} color="#ffffff" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ROW 2: Parent, Driver, Library / Librarian, Accounts, Hostel */}
            <div className="erp-role-cards-row-2">
              {ROLE_CARDS.slice(6).map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    className="erp-role-card"
                    style={{
                      backgroundColor: card.cardBg,
                      borderColor: card.borderColor
                    }}
                    onClick={() => handleRoleLogin(card.loginRole)}
                  >
                    <div
                      className="role-card-icon-circle"
                      style={{
                        backgroundColor: card.iconBg,
                        color: card.iconColor
                      }}
                    >
                      <IconComponent size={20} />
                    </div>

                    <div className="role-card-content">
                      <h3 className="role-card-title">{card.title}</h3>
                      <p className="role-card-desc">{card.desc}</p>
                    </div>

                    <button
                      type="button"
                      className="role-card-login-pill-btn"
                      style={{ backgroundColor: card.btnBg }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleLogin(card.loginRole);
                      }}
                    >
                      <span>Login</span>
                      <ArrowRight size={12} color="#ffffff" />
                    </button>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         4. KEY FEATURES (7 Circular Modules) & OUR COLLEGE AT A GLANCE
         ───────────────────────────────────────────────────────────── */}
      <section className="erp-split-section" id="features">
        <div className="erp-container">
          <div className="erp-split-grid">

            {/* Left Card: Key Features with 7 Circular Feature Icons */}
            <div className="erp-feature-box">
              <div className="box-header">
                <h3 className="box-title">Key Features</h3>
                <p className="box-subtitle">Everything you need in one place</p>
              </div>

              <div className="box-features-strip">
                {STRIP_FEATURES.map((feat) => {
                  const FeatIcon = feat.icon;
                  return (
                    <div key={feat.id} className="feature-strip-item">
                      <div
                        className="feature-circle-icon-box"
                        style={{
                          backgroundColor: feat.bg,
                          color: feat.color
                        }}
                      >
                        <FeatIcon size={20} />
                      </div>
                      <div className="feature-strip-title">{feat.title}</div>
                      <div className="feature-strip-sub">{feat.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Card: Our College at a Glance (4 Metric Cards) */}
            <div className="erp-glance-box" id="about">
              <div className="box-header">
                <h3 className="box-title">Our College at a Glance</h3>
                <p className="box-subtitle">Key statistics across all departments</p>
              </div>

              <div className="box-stats-grid">
                {COLLEGE_STATS.map((stat, idx) => {
                  const StatIcon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="stat-metric-card"
                      style={{
                        backgroundColor: stat.bg,
                        borderColor: stat.border
                      }}
                    >
                      <div
                        className="stat-metric-icon"
                        style={{ color: stat.color }}
                      >
                        <StatIcon size={22} />
                      </div>
                      <div className="stat-metric-value" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                      <div className="stat-metric-label">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         5. CAMPUS SUPPORT & CONTACT DETAILS SECTION
         ───────────────────────────────────────────────────────────── */}
      <section className="erp-contact-section" id="contact">
        <div className="erp-container">
          <div className="erp-section-header">
            <span className="erp-section-badge">
              <Phone size={14} /> Get In Touch
            </span>
            <h2 className="erp-section-title">Institutional Support &amp; Contact Desk</h2>
            <p className="erp-section-subtitle">
              Reach our 24/7 dedicated ERP administration helpline, technical support team, or visit our central campus office.
            </p>
          </div>

          <div className="erp-contact-cards-grid">
            {/* Phone Support Card */}
            <div className="erp-contact-card">
              <div className="contact-card-icon-box phone">
                <Phone size={24} />
              </div>
              <h3 className="contact-card-title">Helpline &amp; Support</h3>
              <p className="contact-card-desc">Instant phone assistance for administrative, faculty, and student portals.</p>
              <div className="contact-card-links">
                <a href="tel:18001234567" className="contact-link-highlight">1800-123-4567 (Toll-Free)</a>
                <a href="tel:+919876543210" className="contact-link-sub">+91 98765 43210 (Direct Support)</a>
              </div>
            </div>

            {/* Email Support Card */}
            <div className="erp-contact-card">
              <div className="contact-card-icon-box email">
                <Mail size={24} />
              </div>
              <h3 className="contact-card-title">Official Email</h3>
              <p className="contact-card-desc">Write to our technical and tenant deployment specialists for fast resolution.</p>
              <div className="contact-card-links">
                <a href="mailto:support@collegeerp.com" className="contact-link-highlight">support@collegeerp.com</a>
                <a href="mailto:contact@collegeerp.edu" className="contact-link-sub">contact@collegeerp.edu</a>
              </div>
            </div>

            {/* Campus Address Card */}
            <div className="erp-contact-card">
              <div className="contact-card-icon-box location">
                <MapPin size={24} />
              </div>
              <h3 className="contact-card-title">Campus Headquarters</h3>
              <p className="contact-card-desc">Central Administrative Wing, College ERP Knowledge Park.</p>
              <div className="contact-card-links">
                <span className="contact-address-text">Block C, Tech Corridor, Bangalore, Karnataka - 560001</span>
              </div>
            </div>

            {/* Working Hours Card */}
            <div className="erp-contact-card">
              <div className="contact-card-icon-box hours">
                <Clock size={24} />
              </div>
              <h3 className="contact-card-title">Operating Hours</h3>
              <p className="contact-card-desc">Helpdesk and technical onboarding schedules.</p>
              <div className="contact-card-links">
                <span className="contact-hours-bold">Mon – Sat: 8:30 AM – 6:30 PM</span>
                <span className="contact-hours-badge">24/7 Cloud Monitoring Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         6. PROFESSIONAL FOOTER (Matching Theme & Guidelines)
         ───────────────────────────────────────────────────────────── */}
      <footer className="erp-footer" id="footer">
        <div className="erp-container">

          <div className="erp-footer-top">
            
            {/* Left Footer Column: Branding & Overview */}
            <div className="erp-footer-brand-col">
              <div className="erp-brand" onClick={() => scrollToSection('home')}>
                <div className="erp-brand-logo-box">
                  <GraduationCap size={22} className="erp-brand-icon" />
                </div>
                <div className="erp-brand-info">
                  <span className="erp-brand-title">College ERP</span>
                  <span className="erp-brand-subtitle">Smart Education Management</span>
                </div>
              </div>
              <p className="erp-footer-desc">
                An advanced campus operating system built for modern colleges, autonomous universities, and polytechnics with enterprise grade tenant security.
              </p>
              <div className="erp-footer-compliance-badge">
                <ShieldCheck size={16} color="#059669" />
                <span>Multi-College Tenant Isolation &amp; Role Security Verified</span>
              </div>
            </div>

            {/* Navigation Links Column */}
            <div className="erp-footer-col">
              <h4 className="footer-col-title">Navigation</h4>
              <ul className="footer-links-list">
                <li><button onClick={() => scrollToSection('home')}>Home</button></li>
                <li><button onClick={() => scrollToSection('about')}>About Campus</button></li>
                <li><button onClick={() => scrollToSection('features')}>Features</button></li>
                <li><button onClick={() => scrollToSection('modules')}>Dashboard Portals</button></li>
                <li><button onClick={() => {
                  setShowContactModal(true);
                  scrollToSection('contact');
                }}>Support &amp; Contact</button></li>
              </ul>
            </div>

            {/* Role Portals Column */}
            <div className="erp-footer-col">
              <h4 className="footer-col-title">Portals</h4>
              <ul className="footer-links-list">
                <li><button onClick={() => handleRoleLogin('Admin')}>Admin Desk</button></li>
                <li><button onClick={() => handleRoleLogin('Principal')}>Principal Console</button></li>
                <li><button onClick={() => handleRoleLogin('HOD')}>HOD Workspace</button></li>
                <li><button onClick={() => handleRoleLogin('Staff')}>Faculty Workbench</button></li>
                <li><button onClick={() => handleRoleLogin('Student')}>Student Portal</button></li>
                <li><button onClick={() => handleRoleLogin('Parent')}>Parent Tracker</button></li>
              </ul>
            </div>

            {/* Operations & Auxiliary Column */}
            <div className="erp-footer-col">
              <h4 className="footer-col-title">Operations</h4>
              <ul className="footer-links-list">
                <li><button onClick={() => handleRoleLogin('Accounts')}>Accounts &amp; Fees</button></li>
                <li><button onClick={() => handleRoleLogin('Librarian')}>Library Counter</button></li>
                <li><button onClick={() => handleRoleLogin('Driver')}>Fleet &amp; Transport</button></li>
                <li><button onClick={() => handleRoleLogin('Hostel')}>Hostel &amp; Mess</button></li>
                <li><button onClick={() => handleRoleLogin('Super Admin')}>Super Admin Cloud</button></li>
              </ul>
            </div>

          </div>

          <div className="erp-footer-bottom">
            <span>&copy; {new Date().getFullYear()} College ERP. All rights reserved.</span>
            <span>Empowering Institutions with Smarter Operations</span>
          </div>

        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
         6. SEARCH MODAL (Interactive Portal & Module Finder)
         ───────────────────────────────────────────────────────────── */}
      {showSearchModal && (
        <div className="erp-modal-overlay animate-fade-in" onClick={() => setShowSearchModal(false)}>
          <div className="erp-search-modal" onClick={e => e.stopPropagation()}>
            <div className="search-modal-header">
              <Search size={20} className="search-modal-icon" />
              <input
                type="text"
                placeholder="Search dashboard role, portal or feature..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="search-modal-close"
                onClick={() => setShowSearchModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="search-modal-results">
              {filteredRoles.length > 0 ? (
                filteredRoles.map(card => (
                  <div
                    key={card.id}
                    className="search-result-item"
                    onClick={() => {
                      setShowSearchModal(false);
                      handleRoleLogin(card.loginRole);
                    }}
                  >
                    <div
                      className="result-icon"
                      style={{ backgroundColor: card.cardBg, color: card.btnBg }}
                    >
                      {React.createElement(card.icon, { size: 18 })}
                    </div>
                    <div className="result-info">
                      <strong>{card.title} Portal</strong>
                      <p>{card.desc}</p>
                    </div>
                    <span className="result-arrow">&rarr;</span>
                  </div>
                ))
              ) : (
                <div className="search-empty">
                  <p>No portals matching "{searchQuery}".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         7. INTERACTIVE CONTACT DETAILS MODAL POPUP
         ───────────────────────────────────────────────────────────── */}
      {showContactModal && (
        <div className="erp-modal-overlay animate-fade-in" onClick={() => setShowContactModal(false)}>
          <div className="erp-contact-modal" onClick={e => e.stopPropagation()}>
            <div className="contact-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="contact-modal-icon-badge">
                  <Phone size={20} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    Contact &amp; Support Directory
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Direct channels for admissions, technical assistance &amp; management
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="search-modal-close"
                onClick={() => setShowContactModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="contact-modal-body">
              {/* Phone item */}
              <div className="contact-modal-item">
                <div className="modal-item-icon-box phone">
                  <Phone size={20} />
                </div>
                <div className="modal-item-info">
                  <strong>Toll-Free Helpline &amp; Mobile Desk</strong>
                  <p>
                    <a href="tel:18001234567">1800-123-4567</a> (Toll-Free) &bull;{' '}
                    <a href="tel:+919876543210">+91 98765 43210</a> (Direct Support)
                  </p>
                </div>
              </div>

              {/* Email item */}
              <div className="contact-modal-item">
                <div className="modal-item-icon-box email">
                  <Mail size={20} />
                </div>
                <div className="modal-item-info">
                  <strong>Official Email Support</strong>
                  <p>
                    <a href="mailto:support@collegeerp.com">support@collegeerp.com</a> &bull;{' '}
                    <a href="mailto:contact@collegeerp.edu">contact@collegeerp.edu</a>
                  </p>
                </div>
              </div>

              {/* Address item */}
              <div className="contact-modal-item">
                <div className="modal-item-icon-box location">
                  <MapPin size={20} />
                </div>
                <div className="modal-item-info">
                  <strong>Campus Headquarters &amp; Operations Office</strong>
                  <p>Central Administrative Wing, Block C, Tech Corridor, Bangalore, Karnataka - 560001</p>
                </div>
              </div>

              {/* Hours item */}
              <div className="contact-modal-item">
                <div className="modal-item-icon-box hours">
                  <Clock size={20} />
                </div>
                <div className="modal-item-info">
                  <strong>Operating &amp; Support Hours</strong>
                  <p>Monday to Saturday: 8:30 AM &ndash; 6:30 PM IST (Cloud Infrastructure 24/7)</p>
                </div>
              </div>
            </div>

            <div className="contact-modal-footer">
              <a href="tel:18001234567" className="contact-modal-call-btn">
                <Phone size={15} /> Call Toll-Free Now
              </a>
              <button
                type="button"
                className="contact-modal-close-btn"
                onClick={() => setShowContactModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
