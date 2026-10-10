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
  Sparkles,
  Calendar
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
          <ul className={`landing-nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'home' ? 'active' : ''}`}
                onClick={() => scrollToSection('home')}
              >
                <span>Home</span>
                <ChevronRight className="mobile-chevron" size={16} />
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'features' ? 'active' : ''}`}
                onClick={() => scrollToSection('features')}
              >
                <span>Features</span>
                <ChevronRight className="mobile-chevron" size={16} />
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'modules' ? 'active' : ''}`}
                onClick={() => scrollToSection('modules')}
              >
                <span>Modules</span>
                <ChevronRight className="mobile-chevron" size={16} />
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'portals' ? 'active' : ''}`}
                onClick={() => scrollToSection('portals')}
              >
                <span>Portals</span>
                <ChevronRight className="mobile-chevron" size={16} />
              </button>
            </li>
            <li>
              <button 
                className={`landing-nav-link ${activeSection === 'contact' ? 'active' : ''}`}
                onClick={() => scrollToSection('contact')}
              >
                <span>Contact</span>
                <ChevronRight className="mobile-chevron" size={16} />
              </button>
            </li>
            <li className="mobile-only-action">
              <button className="landing-btn-login" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
                Log In
              </button>
            </li>
            <li className="mobile-only-action">
              <button className="landing-btn-get-started" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
                Get Started
              </button>
            </li>
          </ul>

          {/* Nav Actions */}
          <div className="landing-nav-actions">
            <button className="landing-btn-login desktop-only-action" onClick={() => navigate('/login')}>
              Log In
            </button>
            <button className="landing-btn-get-started desktop-only-action" onClick={() => navigate('/login')}>
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
        {mobileMenuOpen && (
          <div 
            className="landing-mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
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

          {/* Right Hero Visual: Clean Glassmorphic ERP Ecosystem Showcase */}
          <div className="landing-hero-right">
            <div className="landing-hero-feature-card" style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '28px',
              color: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '100%',
              maxWidth: '520px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={20} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>ERPSYS Cloud Platform</h3>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Multi-Campus Institutional Engine</span>
                  </div>
                </div>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
                  🟢 LIVE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Role-Based Portals</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60a5fa' }}>9 Portals</div>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Admin, Student, Faculty +</span>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>System Uptime</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>99.99%</div>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Enterprise Grade SLA</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Integrated Modules
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.82rem' }}>
                  {[
                    { icon: <Users size={14} color="#60a5fa" />, label: 'Admissions & Enrollment' },
                    { icon: <CreditCard size={14} color="#34d399" />, label: 'Fee Collection & Ledgers' },
                    { icon: <Calendar size={14} color="#f472b6" />, label: 'Live Attendance & Timetable' },
                    { icon: <Bus size={14} color="#38bdf8" />, label: 'Smart Fleet & GPS Tracking' },
                    { icon: <Building size={14} color="#fb923c" />, label: 'Hostel & Mess Management' },
                    { icon: <BarChart2 size={14} color="#a78bfa" />, label: 'Examination & Marks Portal' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', color: '#f1f5f9' }}>
                      {item.icon}
                      <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time institutional sync</span>
                <button 
                  onClick={() => navigate('/login')}
                  style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Access Portals &rarr;
                </button>
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
