import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  CreditCard,
  Building,
  Bus,
  BarChart2,
  BookOpen,
  Briefcase,
  Shield,
  Bot,
  Play,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  Menu,
  X,
  Plus,
  TrendingUp,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import './LandingPage.css';

const MODULES_STRIP = [
  {
    icon: <Users size={24} />,
    title: 'Admission & Enrollment',
    desc: 'Manage the complete admission process with ease.',
    color: '#2563eb',
    bg: '#eff6ff'
  },
  {
    icon: <GraduationCap size={24} />,
    title: 'Academics',
    desc: 'Handle courses, departments, exams and results.',
    color: '#8b5cf6',
    bg: '#faf5ff'
  },
  {
    icon: <CreditCard size={24} />,
    title: 'Fees & Accounts',
    desc: 'Track fees, scholarships and payments.',
    color: '#10b981',
    bg: '#ecfdf5'
  },
  {
    icon: <Building size={24} />,
    title: 'Hostel Management',
    desc: 'Allot rooms, track occupancy and manage hostel fees.',
    color: '#f97316',
    bg: '#fff7ed'
  },
  {
    icon: <Bus size={24} />,
    title: 'Transport Management',
    desc: 'Manage routes, vehicles, drivers and student allocation.',
    color: '#06b6d4',
    bg: '#ecfeff'
  },
  {
    icon: <BarChart2 size={24} />,
    title: 'Reports & Analytics',
    desc: 'Get real-time insights for better decision making.',
    color: '#6366f1',
    bg: '#eef2ff'
  }
];

const DETAILED_FEATURES = [
  {
    icon: <Users size={24} />,
    title: 'End-to-End Student Admissions',
    desc: 'Automated application verification, quota concessions, document management, and live enrollment registers.',
    color: '#2563eb',
    bg: '#eff6ff'
  },
  {
    icon: <GraduationCap size={24} />,
    title: 'Curriculum & Academic Structure',
    desc: 'Syllabus master, faculty-to-subject allocation, daily timetable scheduling, and semester course catalogs.',
    color: '#8b5cf6',
    bg: '#faf5ff'
  },
  {
    icon: <CreditCard size={24} />,
    title: 'Enterprise Fee & Finance Desk',
    desc: 'Dynamic fee structures, real-time fee collection, online receipts, expense logs, and staff payroll generation.',
    color: '#10b981',
    bg: '#ecfdf5'
  },
  {
    icon: <Building size={24} />,
    title: 'Hostel & Mess Administration',
    desc: 'Block-wise bed allotment, room occupancy tracking, maintenance requests, and warden communication desk.',
    color: '#f97316',
    bg: '#fff7ed'
  },
  {
    icon: <Bus size={24} />,
    title: 'Smart Fleet & GPS Transport',
    desc: 'Live vehicle tracking, driver allocation, stage-wise route stops, and student transport passes.',
    color: '#06b6d4',
    bg: '#ecfeff'
  },
  {
    icon: <BarChart2 size={24} />,
    title: 'Institutional Intelligence & Reports',
    desc: 'Visual fee realization dashboards, attendance heatmaps, examination analytics, and regulatory exports.',
    color: '#6366f1',
    bg: '#eef2ff'
  }
];

const ROLE_PORTALS = [
  { role: 'Super Admin', path: '/login?role=Super Admin', emoji: '👑', color: '#10b981', desc: 'Central multi-campus SaaS controller' },
  { role: 'Admin', path: '/login?role=Admin', emoji: '🔑', color: '#2563eb', desc: 'Complete institution operations & setup' },
  { role: 'Principal', path: '/login?role=Principal', emoji: '🏛️', color: '#8b5cf6', desc: 'Academic oversight & institution governance' },
  { role: 'HOD', path: '/login?role=HOD', emoji: '👨‍🏫', color: '#4f46e5', desc: 'Department faculties & curriculum monitoring' },
  { role: 'Staff / Faculty', path: '/login?role=Staff', emoji: '📚', color: '#06b6d4', desc: 'Attendance, marks, assignments & LMS' },
  { role: 'Student', path: '/login?role=Student', emoji: '🎓', color: '#059669', desc: 'Timetables, grades, receipts & leaves' },
  { role: 'Parent', path: '/login?role=Parent', emoji: '👨‍👩‍👧', color: '#d97706', desc: 'Ward attendance, academic reports & fees' },
  { role: 'Accounts Officer', path: '/login?role=Accounts', emoji: '💰', color: '#dc2626', desc: 'Finance collections & staff payroll' },
  { role: 'Driver', path: '/login?role=Driver', emoji: '🚌', color: '#f59e0b', desc: 'Trip routes, attendance & vehicle logs' }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-root">
      
      {/* ─────────────────────────────────────────────────────────────
         1. NAVBAR
         ───────────────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          
          {/* Logo */}
          <div className="landing-logo" onClick={() => scrollToSection('home')}>
            <div className="landing-logo-icon">
              <GraduationCap size={22} />
            </div>
            <div className="landing-logo-text">
              <span className="landing-brand-name">College<span>ERP</span></span>
              <span className="landing-brand-tagline">Smarter Campus. Brighter Future.</span>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="landing-nav-links">
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'home' ? 'active' : ''}`}
                onClick={() => scrollToSection('home')}
              >
                Home
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'features' ? 'active' : ''}`}
                onClick={() => scrollToSection('features')}
              >
                Features
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'modules' ? 'active' : ''}`}
                onClick={() => scrollToSection('modules')}
              >
                Modules
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'portals' ? 'active' : ''}`}
                onClick={() => scrollToSection('portals')}
              >
                Portals
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'contact' ? 'active' : ''}`}
                onClick={() => scrollToSection('contact')}
              >
                Contact
              </button>
            </li>
          </ul>

          {/* Nav Actions */}
          <div className="landing-nav-actions">
            <button className="landing-btn-login" onClick={() => navigate('/login')}>
              Log In
            </button>
            <button className="landing-btn-get-started" onClick={() => navigate('/login')}>
              Get Started
            </button>
            <button 
              className="landing-hamburger" 
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
         2. HERO SECTION
         ───────────────────────────────────────────────────────────── */}
      <section className="landing-hero" id="home">
        <div className="landing-hero-inner">
          
          {/* Left Hero Content */}
          <div className="landing-hero-left">
            <div className="landing-pill-badge">
              <Sparkles size={13} />
              <span>COLLEGE ERP SOLUTION</span>
            </div>

            <h1 className="landing-hero-title">
              Simplify Campus Management, Empower Education
            </h1>

            <p className="landing-hero-subtitle">
              An all-in-one College ERP system designed to streamline admissions, academics, fees, hostel, transport and more. Built for modern institutions, ready for the future.
            </p>

            <div className="landing-hero-ctas">
              <button className="landing-hero-btn-primary" onClick={() => navigate('/login')}>
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>

              <button className="landing-hero-btn-demo" onClick={() => scrollToSection('modules')}>
                <Play size={15} fill="#1e293b" />
                <span>Watch Demo</span>
              </button>
            </div>
          </div>

          {/* Right Hero Visual (Campus Frame + Interactive Laptop Mockup + 4 Orbit Badges) */}
          <div className="landing-hero-right">
            
            <div className="landing-campus-backdrop">
              
              {/* Floating Badge 1: Admissions */}
              <div className="landing-floating-badge landing-badge-admissions">
                <div className="landing-badge-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Users size={16} />
                </div>
                <span>Admissions</span>
              </div>

              {/* Floating Badge 2: Fees & Accounts */}
              <div className="landing-floating-badge landing-badge-fees">
                <div className="landing-badge-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <CreditCard size={16} />
                </div>
                <span>Fees & Accounts</span>
              </div>

              {/* Floating Badge 3: Hostel */}
              <div className="landing-floating-badge landing-badge-hostel">
                <div className="landing-badge-icon-wrap" style={{ background: '#fff7ed', color: '#f97316' }}>
                  <Building size={16} />
                </div>
                <span>Hostel</span>
              </div>

              {/* Floating Badge 4: Transport */}
              <div className="landing-floating-badge landing-badge-transport">
                <div className="landing-badge-icon-wrap" style={{ background: '#ecfeff', color: '#06b6d4' }}>
                  <Bus size={16} />
                </div>
                <span>Transport</span>
              </div>

              {/* Central Laptop Device Mockup */}
              <div className="landing-laptop-frame">
                
                <div className="landing-laptop-screen">
                  
                  {/* Mock Sidebar */}
                  <div className="landing-mock-sidebar">
                    <div className="landing-mock-brand">
                      <GraduationCap size={13} />
                      <span>CollegeERP</span>
                    </div>

                    <div className="landing-mock-link active">
                      <span>Dashboard</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Admissions</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Students</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Academics</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Fees & Accounts</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Hostel</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Transport</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Reports</span>
                    </div>
                    <div className="landing-mock-link">
                      <span>Settings</span>
                    </div>
                  </div>

                  {/* Mock Content */}
                  <div className="landing-mock-content">
                    
                    <div className="landing-mock-header">
                      <div className="landing-mock-greeting">
                        <h4>Welcome Back, Admin</h4>
                        <span>Real-time Institutional Portal</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', color: '#64748b' }}>
                        <span>Today • 28 Sep 2026</span>
                      </div>
                    </div>

                    {/* KPI 3 Cards */}
                    <div className="landing-mock-kpi-grid">
                      <div className="landing-mock-kpi-card">
                        <span className="landing-mock-kpi-label">Total Students</span>
                        <span className="landing-mock-kpi-val">1,248</span>
                        <span className="landing-mock-kpi-badge">▲ 12%</span>
                      </div>
                      <div className="landing-mock-kpi-card">
                        <span className="landing-mock-kpi-label">Total Admissions</span>
                        <span className="landing-mock-kpi-val">326</span>
                        <span className="landing-mock-kpi-badge">▲ 8%</span>
                      </div>
                      <div className="landing-mock-kpi-card">
                        <span className="landing-mock-kpi-label">Fees Collected</span>
                        <span className="landing-mock-kpi-val">₹18,45,000</span>
                        <span className="landing-mock-kpi-badge">▲ 15%</span>
                      </div>
                    </div>

                    {/* Bottom Split: Chart & Quick Actions */}
                    <div className="landing-mock-bottom-grid">
                      
                      {/* Trend Curve SVG */}
                      <div className="landing-mock-chart-box">
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                          Student Admission Trend
                        </span>
                        <svg viewBox="0 0 100 40" style={{ width: '100%', height: '50px', overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="gradMock" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 5,32 Q 25,28 40,18 T 75,12 T 95,6 L 95,38 L 5,38 Z"
                            fill="url(#gradMock)"
                          />
                          <path
                            d="M 5,32 Q 25,28 40,18 T 75,12 T 95,6"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '6.5px', color: '#94a3b8' }}>
                          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="landing-mock-actions-box">
                        <span style={{ fontSize: '8px', fontWeight: 700, color: '#0f172a' }}>Quick Actions</span>
                        <div className="landing-mock-action-item">
                          <Plus size={8} color="#2563eb" />
                          <span>Add Student</span>
                        </div>
                        <div className="landing-mock-action-item">
                          <CreditCard size={8} color="#10b981" />
                          <span>Collect Fees</span>
                        </div>
                        <div className="landing-mock-action-item">
                          <Building size={8} color="#f97316" />
                          <span>Hostel Allotment</span>
                        </div>
                        <div className="landing-mock-action-item">
                          <Bus size={8} color="#06b6d4" />
                          <span>Transport Route</span>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>

                {/* Laptop Base & Notch */}
                <div className="landing-laptop-base">
                  <div className="landing-laptop-notch"></div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         3. 6 MODULES QUICK STRIP (Below Hero)
         ───────────────────────────────────────────────────────────── */}
      <section className="landing-modules-strip" id="features">
        <div className="landing-modules-strip-inner">
          {MODULES_STRIP.map((mod, i) => (
            <div key={i} className="landing-module-mini-item" onClick={() => navigate('/login')}>
              <div 
                className="landing-module-circle-icon" 
                style={{ background: mod.bg, color: mod.color }}
              >
                {mod.icon}
              </div>
              <h4 className="landing-module-mini-title">{mod.title}</h4>
              <p className="landing-module-mini-desc">{mod.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         4. "EVERYTHING YOU NEED IN ONE PLACE" DETAILED MODULES
         ───────────────────────────────────────────────────────────── */}
      <section className="landing-detailed-section" id="modules">
        <div className="landing-section-header">
          <span className="landing-section-pill">MODULES</span>
          <h2 className="landing-section-heading">Everything You Need in One Place</h2>
          <p className="landing-section-subtext">
            Comprehensive, interconnected modules designed for modern universities, engineering colleges, and educational institutions.
          </p>
        </div>

        <div className="landing-features-grid">
          {DETAILED_FEATURES.map((feat, idx) => (
            <div 
              key={idx} 
              className="landing-feature-card"
              onClick={() => navigate('/login')}
            >
              <div 
                className="landing-card-icon-box"
                style={{ background: feat.bg, color: feat.color }}
              >
                {feat.icon}
              </div>
              <h3 className="landing-card-title">{feat.title}</h3>
              <p className="landing-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         5. MULTI-ROLE PORTALS SECTION
         ───────────────────────────────────────────────────────────── */}
      <section className="landing-portals-section" id="portals">
        <div className="landing-section-header">
          <span className="landing-section-pill">ROLE-BASED WORKBENCHES</span>
          <h2 className="landing-section-heading">Dedicated Portals for Every Stakeholder</h2>
          <p className="landing-section-subtext">
            Tailored interfaces with strict permissions and role-based data isolation.
          </p>
        </div>

        <div className="landing-portals-grid">
          {ROLE_PORTALS.map(portal => (
            <div 
              key={portal.role} 
              className="landing-portal-card"
              onClick={() => navigate(portal.path)}
            >
              <div className="landing-portal-left">
                <span className="landing-portal-emoji">{portal.emoji}</span>
                <div>
                  <h4 className="landing-portal-name">{portal.role} Portal</h4>
                  <p className="landing-portal-desc">{portal.desc}</p>
                </div>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         6. FOOTER
         ───────────────────────────────────────────────────────────── */}
      <footer className="landing-footer" id="contact">
        <div className="landing-footer-inner">
          
          <div className="landing-footer-top">
            <div className="landing-footer-brand">
              <h3>CollegeERP</h3>
              <p>
                Empowering colleges with real-time academic workflows, automated finance desks, live fleet tracking, and student welfare systems.
              </p>
            </div>

            <div className="landing-footer-links">
              <div className="landing-footer-col">
                <h4>Platform</h4>
                <ul>
                  <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a></li>
                  <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a></li>
                  <li><a href="#modules" onClick={(e) => { e.preventDefault(); scrollToSection('modules'); }}>Modules</a></li>
                  <li><a href="#portals" onClick={(e) => { e.preventDefault(); scrollToSection('portals'); }}>Portals</a></li>
                </ul>
              </div>

              <div className="landing-footer-col">
                <h4>Portals</h4>
                <ul>
                  <li><a href="/login?role=Admin">Admin Portal</a></li>
                  <li><a href="/login?role=Accounts">Accounts Desk</a></li>
                  <li><a href="/login?role=HOD">HOD Portal</a></li>
                  <li><a href="/login?role=Student">Student Login</a></li>
                </ul>
              </div>

              <div className="landing-footer-col">
                <h4>Support & Security</h4>
                <ul>
                  <li><a href="#">24/7 Support Desk</a></li>
                  <li><a href="#">Security & Privacy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Release Notes</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} CollegeERP Inc. All rights reserved.</span>
            <span>Enterprise Grade Cloud Academic ERP System</span>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
