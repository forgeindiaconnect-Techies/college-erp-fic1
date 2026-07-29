import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Lock, LogOut, AlertTriangle, CheckCircle2, Phone, FileText, RefreshCw } from 'lucide-react';
import api from '../../api';
import './Layout.css';

const LOCKED_MODULES = [
  { emoji: 'ðŸŽ“', label: 'Student Management' },
  { emoji: 'ðŸ“‹', label: 'Attendance' },
  { emoji: 'ðŸ’°', label: 'Fees Management' },
  { emoji: 'ðŸ ', label: 'Hostel Management' },
  { emoji: 'ðŸšŒ', label: 'Transport Management' },
  { emoji: 'ðŸ“', label: 'Examination System' },
];

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await api.get('/admin/my-subscription');
        if (res.data && res.data.subscription) {
          setSubscription(res.data.subscription);
        }
      } catch (error) {
        console.error('Failed to fetch subscription in layout:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();

    // Auto-refresh when the user switches back to this tab
    window.addEventListener('focus', fetchSubscription);
    return () => window.removeEventListener('focus', fetchSubscription);
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_token');
    navigate('/login');
  };

  const isExpired = subscription?.status === 'Expired';
  const isGracePeriod = subscription?.isGracePeriod === true;
  const isAllowedRoute =
    location.pathname.includes('/subscription') ||
    location.pathname.includes('/upgrade-plan');
  const isLocked = isExpired && !isGracePeriod && !isAllowedRoute;

  const expiryDateStr = subscription?.expiryDate
    ? new Date(subscription.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  const daysExpired = subscription?.daysRemaining === 0
    ? Math.abs(Math.ceil((new Date() - new Date(subscription?.expiryDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  /* â”€â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
      </div>
    );
  }

  /* â”€â”€â”€ Full-page lockout screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (isLocked) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 9999,
        padding: '20px',
        overflowY: 'auto',
      }}>
        {/* Modal card */}
        <div style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          margin: 'auto',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Body â€” scrollable */}
          <div style={{ padding: '36px 36px 28px 36px', textAlign: 'center', overflowY: 'auto', flex: 1 }}>

            {/* Lock icon */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: '#FCEBEB', border: '8px solid #FFF5F5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px auto'
            }}>
              <Lock size={30} color="#EF4444" strokeWidth={2} />
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              {subscription?.isTrial ? 'Trial Expired' : 'Subscription Expired'}
            </h1>

            {/* College name */}
            {subscription?.collegeName && (
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#EF4444', margin: '0 0 10px 0' }}>
                {subscription.collegeName}
              </p>
            )}

            {/* Description */}
            <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.6, margin: '0 0 24px 0', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              {subscription?.isTrial 
                ? 'Your free trial has expired. You can no longer access most features of the system. Please upgrade to a paid plan to continue using all modules.'
                : 'Your ERP subscription has expired. You can no longer access most features of the system. Please renew your subscription to continue using all modules.'}
            </p>

            {/* Info card: Plan / Expiry / Days expired */}
            <div style={{
              border: '1px solid #E2E8F0', borderRadius: '12px',
              padding: '16px 20px', marginBottom: '16px', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '0',
            }}>
              {/* EXPIRED badge */}
              <div style={{ minWidth: '130px', borderRight: '1px solid #E2E8F0', paddingRight: '16px' }}>
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: '6px',
                  background: '#FCEBEB', color: '#EF4444', fontSize: '0.7rem',
                  fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px'
                }}>EXPIRED</span>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '2px' }}>Subscription Plan</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{subscription?.planName || 'Trial'} ERP</div>
              </div>
              {/* Expiry Date */}
              <div style={{ flex: 1, paddingLeft: '20px', borderRight: '1px solid #E2E8F0', paddingRight: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '2px' }}>ðŸ“… Expiry Date</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#EF4444' }}>{expiryDateStr}</div>
              </div>
              {/* Days expired */}
              <div style={{ paddingLeft: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '2px' }}>ðŸ• Days Expired</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#EF4444' }}>{daysExpired} Days</div>
              </div>
            </div>

            {/* Access Restricted banner */}
            <div style={{
              background: '#FCEBEB', border: '1px solid #FECACA', borderRadius: '12px',
              padding: '14px 16px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left' }}>
                <AlertTriangle size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#EF4444', marginBottom: '2px' }}>Access Restricted</div>
                  <div style={{ fontSize: '0.8rem', color: '#B91C1C', lineHeight: 1.5 }}>
                    All academic and administrative modules are locked.<br />
                    Renew your subscription to restore full access.
                  </div>
                </div>
              </div>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginLeft: '12px'
              }}>
                <Lock size={22} color="#EF4444" />
              </div>
            </div>

            {/* Locked Modules */}
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>Locked Modules</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {LOCKED_MODULES.map((mod, i) => (
                  <div key={i} style={{
                    border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 8px',
                    textAlign: 'center', position: 'relative', background: '#FAFAFA'
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{mod.emoji}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', lineHeight: 1.3 }}>{mod.label}</div>
                    <span style={{
                      position: 'absolute', top: '6px', right: '6px',
                      fontSize: '0.6rem', color: '#EF4444'
                    }}>ðŸ”’</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Renew */}
            <div style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px',
              padding: '14px 16px', marginBottom: '24px', display: 'flex', gap: '16px', textAlign: 'left'
            }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', background: '#EEF2FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '1rem' }}>â„¹ï¸</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Why Renew?</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '10px', lineHeight: 1.5 }}>
                  Renew your subscription to continue seamless operation and data security.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {['All Modules Access', 'Regular Updates', 'Priority Support', 'Data Security'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} color="#6366F1" />
                      <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 500 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => navigate('/upgrade-plan')}
                style={{
                  flex: 1, padding: '12px', background: '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#2563EB'}
                onMouseOut={(e) => e.currentTarget.style.background = '#3B82F6'}
              >
                <RefreshCw size={15} /> Renew Now
              </button>
              <button
                onClick={() => window.location.href = 'mailto:support@antigravity.in'}
                style={{
                  flex: 1, padding: '12px', background: '#FFFFFF', color: '#0F172A',
                  border: '1.5px solid #CBD5E1', borderRadius: '10px', fontWeight: 600,
                  fontSize: '0.88rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                <Phone size={15} /> Contact Support
              </button>
              <button
                onClick={() => navigate('/admin/subscription')}
                style={{
                  flex: 1, padding: '12px', background: '#FFFFFF', color: '#0F172A',
                  border: '1.5px solid #CBD5E1', borderRadius: '10px', fontWeight: 600,
                  fontSize: '0.88rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                <FileText size={15} /> Download Invoice
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #E2E8F0', padding: '14px 36px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#FAFAFA'
          }}>
            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: 'none', color: '#64748B',
                fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s', padding: 0
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#EF4444'}
              onMouseOut={(e) => e.currentTarget.style.color = '#64748B'}
            >
              <LogOut size={15} /> Sign Out
            </button>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Need help? Our support team is here for you.</span>
            <a href="tel:+919876543210" style={{ color: '#3B82F6', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Phone size={13} /> +91 98765 43210
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* â”€â”€â”€ Normal layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="layout-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Admin" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content" style={{ position: 'relative' }}>
          <div style={{ height: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

