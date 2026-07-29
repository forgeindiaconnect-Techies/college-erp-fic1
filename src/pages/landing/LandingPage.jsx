import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Bus, Building, Briefcase, Users,
  BarChart2, Shield, Bot, Bell, Star, ChevronRight, ChevronDown,
  Mail, Phone, MapPin, ExternalLink, Menu, X,
  Cpu, Zap, Globe, Award, TrendingUp, Calendar
} from 'lucide-react';
import './LandingPage.css';



const FEATURES = [
  { icon: <Users size={28} />,      title: 'Student Management',      desc: 'Complete student lifecycle from admission to alumni.', color: '#3b82f6' },
  { icon: <BarChart2 size={28} />,  title: 'Smart Analytics',         desc: 'AI-powered institutional performance insights.', color: '#6366F1' },
  { icon: <Bus size={28} />,        title: 'Live Bus Tracking',        desc: 'Real-time GPS tracking of all college buses.', color: '#f59e0b' },
  { icon: <Building size={28} />,   title: 'Hostel Management',        desc: 'Room allocation, mess, complaints in one place.', color: '#10b981' },
  { icon: <BookOpen size={28} />,   title: 'Library System',           desc: 'Digital catalog, issue tracking, fine management.', color: '#ec4899' },
  { icon: <Briefcase size={28} />,  title: 'Placement Portal',         desc: 'Company drives, eligibility, offer letters all tracked.', color: '#06b6d4' },
  { icon: <Bot size={28} />,        title: 'AI ERP Assistant',         desc: 'Ask questions, generate reports with natural language.', color: '#a855f7' },
  { icon: <Shield size={28} />,     title: 'Role-Based Security',      desc: 'Admin → HOD → Staff → Student hierarchy enforced.', color: '#ef4444' },
];

const STATS = [
  { value: '3,240+', label: 'Students Enrolled', icon: <Users size={22} /> },
  { value: '180+',   label: 'Faculty Members',   icon: <GraduationCap size={22} /> },
  { value: '92%',    label: 'Placement Rate',    icon: <TrendingUp size={22} /> },
  { value: '6',      label: 'Departments',       icon: <Building size={22} /> },
];

const LOGIN_PORTALS = [
  { role: 'Super Admin', path: '/login?role=Super Admin', icon: '👑', color: '#10b981', desc: 'Global SaaS management' },
  { role: 'Admin',      path: '/login?role=Admin', icon: '🔑', color: 'var(--primary)', desc: 'Full system access' },
  { role: 'Principal',  path: '/login?role=Principal', icon: '🏛️', color: '#8b5cf6', desc: 'Institution head' },
  { role: 'HOD',        path: '/login?role=HOD', icon: '👨‍🏫', color: '#4F46E5', desc: 'Department control' },
  { role: 'Staff',      path: '/login?role=Staff', icon: '📚', color: '#2563eb', desc: 'Class management' },
  { role: 'Student',    path: '/login?role=Student', icon: '🎓', color: '#059669', desc: 'Academic portal' },
  { role: 'Parent',     path: '/login?role=Parent', icon: '👨‍👩‍👧', color: '#d97706', desc: 'Track ward progress' },
  { role: 'Accounts',   path: '/login?role=Accounts', icon: '💰', color: '#dc2626', desc: 'Finance & fees' },
  { role: 'Driver',     path: '/login?role=Driver', icon: '🚌', color: '#f59e0b', desc: 'Transport portal' },
];



// Animated counter hook
const useCounter = (target, isVisible) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    const numericTarget = parseInt(target.replace(/\D/g, ''));
    let current = 0;
    const step = Math.ceil(numericTarget / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, numericTarget);
      setCount(current);
      if (current >= numericTarget) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [isVisible, target]);
  return count;
};

const StatCard = ({ value, label, icon, isVisible }) => {
  const count = useCounter(value, isVisible);
  const suffix = value.replace(/[\d,]/g, '');
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{count.toLocaleString()}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'contact'];
      for (const sec of sections) {
        const el = document.getElementById(sec);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 80 && rect.bottom > 80) { setActiveSection(sec); break; }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const NAV_LINKS = ['home', 'features', 'contact'];

  return (
    <div className="landing-root">

      {/* ──── NAVBAR ──── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">F</div>
            <span>FIC <strong>ERP</strong></span>
          </div>

          <ul className="landing-nav-links">
            {NAV_LINKS.map(link => (
              <li key={link}>
                <button
                  className={`landing-nav-link ${activeSection === link ? 'active' : ''}`}
                  onClick={() => scrollTo(link)}
                >
                  {link.charAt(0).toUpperCase() + link.slice(1)}
                </button>
              </li>
            ))}
          </ul>

          <div className="landing-nav-actions">
            <button className="landing-btn-outline" onClick={() => navigate('/login')}>Login</button>
            <button className="landing-btn-primary" onClick={() => navigate('/get-access')}>
              Get Access <ChevronRight size={16} />
            </button>
            <button className="landing-hamburger" onClick={() => setMobileMenuOpen(o => !o)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            {NAV_LINKS.map(link => (
              <button key={link} className="mobile-nav-link" onClick={() => scrollTo(link)}>
                {link.charAt(0).toUpperCase() + link.slice(1)}
              </button>
            ))}
            <button className="landing-btn-outline w-full mt-2" onClick={() => navigate('/login')}>Login to ERP</button>
            <button className="landing-btn-primary w-full mt-2" onClick={() => navigate('/get-access')}>Get Access</button>
          </div>
        )}
      </nav>

      {/* ──── HERO ──── */}
      <section id="home" className="hero-section">
        {/* Floating orbs */}
        <div className="hero-orb orb-1"></div>
        <div className="hero-orb orb-2"></div>
        <div className="hero-orb orb-3"></div>

        <div className="hero-content">
          <div className="hero-badge">
            <Zap size={14} /> Next-Generation College ERP System
          </div>
          <h1 className="hero-title">
            Manage Your College<br />
            <span className="hero-gradient-text">Smarter with AI</span>
          </h1>
          <p className="hero-subtitle">
            A complete, role-based digital campus solution powering academics, attendance, fees,
            placements, hostel, library, and transport — all in one unified platform.
          </p>
          <div className="hero-cta">
            <button className="landing-btn-primary hero-btn" onClick={() => navigate('/get-access')}>
              <GraduationCap size={18} /> Get Access
            </button>
            <button className="landing-btn-outline hero-btn" onClick={() => navigate('/login')}>
              Launch ERP Portal <ChevronRight size={16} />
            </button>
          </div>

          {/* Mini role tags */}
          <div className="hero-roles">
            {['Admin', 'HOD', 'Staff', 'Student', 'Parent', 'Accounts'].map(r => (
              <span key={r} className="role-tag-badge">{r}</span>
            ))}
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="hero-preview">
          <div className="preview-card glass-preview">
            <div className="preview-header">
              <div className="preview-dot red"></div>
              <div className="preview-dot yellow"></div>
              <div className="preview-dot green"></div>
              <span className="preview-title">ERP Dashboard</span>
            </div>
            <div className="preview-kpis">
              {[{l:'Students',v:'3,240',c:'#3b82f6'},{l:'Staff',v:'180',c:'#6366F1'},{l:'Attendance',v:'94%',c:'#10b981'},{l:'Revenue',v:'₹4.2Cr',c:'#f59e0b'}].map(k => (
                <div key={k.l} className="preview-kpi" style={{borderTopColor:k.c}}>
                  <span className="preview-kpi-val" style={{color:k.c}}>{k.v}</span>
                  <span className="preview-kpi-lbl">{k.l}</span>
                </div>
              ))}
            </div>
            <div className="preview-chart-bars">
              {[70,85,60,90,75,95,80].map((h, i) => (
                <div key={i} className="preview-bar" style={{height:`${h}%`, animationDelay:`${i*0.1}s`}}></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──── STATS ──── */}
      <section className="stats-section" ref={statsRef}>
        <div className="stats-inner">
          {STATS.map((s, i) => (
            <StatCard key={i} {...s} isVisible={statsVisible} />
          ))}
        </div>
      </section>

      {/* ──── FEATURES ──── */}
      <section id="features" className="features-section">
        <div className="section-header">
          <div className="section-badge"><Cpu size={14} /> Powerful Features</div>
          <h2 className="section-title">Everything Your Campus Needs</h2>
          <p className="section-subtitle">A full-suite ERP designed for modern institutions, with built-in AI assistance and real-time data.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{'--accent': f.color}}>
              <div className="feature-icon-wrap" style={{background:`${f.color}18`, color:f.color}}>
                {f.icon}
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <div className="feature-arrow"><ChevronRight size={16} style={{color:f.color}} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── LOGIN PORTALS ──── */}
      <section className="portals-section">
        <div className="section-header">
          <div className="section-badge"><Shield size={14} /> Secure Access</div>
          <h2 className="section-title">Login Portals</h2>
          <p className="section-subtitle">Role-specific dashboards with granular access control for every stakeholder.</p>
        </div>
        <div className="portals-grid">
          {LOGIN_PORTALS.map((p, i) => (
            <button
              key={i}
              className="portal-card"
              style={{'--portal-color': p.color}}
              onClick={() => navigate(p.path)}
            >
              <div className="portal-icon">{p.icon}</div>
              <div className="portal-info">
                <h3>{p.role}</h3>
                <p>{p.desc}</p>
              </div>
              <ExternalLink size={16} className="portal-arrow" />
            </button>
          ))}
        </div>
      </section>



      {/* ──── CONTACT ──── */}
      <section id="contact" className="contact-section">
        <div className="contact-inner">
          <div className="contact-info">
            <div className="section-badge"><Globe size={14} /> Contact Us</div>
            <h2 className="section-title" style={{textAlign:'left'}}>Get in Touch</h2>
            <p className="section-subtitle" style={{textAlign:'left'}}>Have questions about admissions, facilities, or the ERP system? Reach out to us.</p>
            <div className="contact-items">
              <div className="contact-item"><MapPin size={18} /> 123, College Road, Tech City, Tamil Nadu — 600001</div>
              <div className="contact-item"><Phone size={18} /> +91 98765 43210</div>
              <div className="contact-item"><Mail size={18} /> info@ficerp.edu.in</div>
            </div>
          </div>
          <form className="contact-form glass-preview" onSubmit={e => e.preventDefault()}>
            <h3 className="font-bold text-lg mb-4">Send a Message</h3>
            <div className="form-row">
              <input type="text" placeholder="Your Name" className="contact-input" />
              <input type="email" placeholder="Email Address" className="contact-input" />
            </div>
            <select className="contact-input w-full">
              <option>Select Subject</option>
              <option>General Inquiry</option>
              <option>Admissions</option>
              <option>Fees & Finance</option>
              <option>Technical Support</option>
            </select>
            <textarea className="contact-input w-full" rows={4} placeholder="Your message..."></textarea>
            <button type="submit" className="landing-btn-primary w-full justify-center">
              Send Message <ChevronRight size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="landing-logo">
              <div className="landing-logo-icon">F</div>
              <span>FIC <strong>ERP</strong></span>
            </div>
            <p className="footer-tagline">Next-Generation College Management System powered by AI & modern web technologies.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              {NAV_LINKS.map(l => <li key={l}><button onClick={() => scrollTo(l)}>{l.charAt(0).toUpperCase()+l.slice(1)}</button></li>)}
            </ul>
          </div>
          <div className="footer-links">
            <h4>Portals</h4>
            <ul>
              {LOGIN_PORTALS.map(p => <li key={p.role}><button onClick={() => navigate(p.path)}>{p.role} Login</button></li>)}
            </ul>
          </div>
          <div className="footer-links">
            <h4>Contact</h4>
            <ul>
              <li><span>📍 Tamil Nadu, India</span></li>
              <li><span>📞 +91 98765 43210</span></li>
              <li><span>✉️ info@ficerp.edu.in</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 FIC College of Engineering. All rights reserved. Built with ❤️ using MERN Stack.</p>
          <div className="footer-badges">
            <span className="tech-badge">React</span>
            <span className="tech-badge">MongoDB</span>
            <span className="tech-badge">Node.js</span>
            <span className="tech-badge">AI-Powered</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
