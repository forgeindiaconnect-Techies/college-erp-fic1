import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, LogOut as ExitIcon, QrCode, Truck,
  AlertTriangle, Clock, ShieldCheck, MapPin, CheckCircle2,
  Package, Search, RefreshCw, ChevronRight, Phone, Car,
  Shield
} from 'lucide-react';
import {
  getWatchmanStats,
  getActiveVisitors,
  recordVisitorExit,
  getParcels,
  getWatchmanAttendance,
  watchmanClockIn,
  watchmanClockOut
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { SettingsContext } from '../../App';
import '../watchman.css';

const WatchmanDashboard = () => {
  const navigate = useNavigate();
  const { collegeSettings } = useContext(SettingsContext) || {};

  const [stats, setStats] = useState({
    visitorsInside: 0,
    todayTotalVisitors: 0,
    expectedVisitors: 0,
    pendingApprovals: 0,
    vehiclesInside: 0,
    openIncidents: 0
  });
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [recentParcels, setRecentParcels] = useState([]);
  const [todaySession, setTodaySession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clockLoading, setClockLoading] = useState(false);

  // Time state for live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const getWatchmanSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('watchman_session') || '{}');
    } catch (e) {
      return {};
    }
  };
  const session = getWatchmanSession();
  const displayCollegeName = session?.collegeName || collegeSettings?.collegeName || 'Campus ERP Portal';
  const watchmanName = session?.name || 'Security Officer';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, activeRes, parcelsRes, attRes] = await Promise.allSettled([
        getWatchmanStats(),
        getActiveVisitors(),
        getParcels({ status: 'Received at Gate' }),
        getWatchmanAttendance()
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        setStats(statsRes.value.data.data);
      }
      if (activeRes.status === 'fulfilled' && activeRes.value?.data?.data) {
        setActiveVisitors(activeRes.value.data.data);
      }
      if (parcelsRes.status === 'fulfilled' && parcelsRes.value?.data?.data) {
        setRecentParcels(parcelsRes.value.data.data.slice(0, 5));
      }
      if (attRes.status === 'fulfilled' && attRes.value?.data?.todaySession) {
        setTodaySession(attRes.value.data.todaySession);
      }
    } catch (err) {
      console.error('Failed to load watchman dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeSync(fetchDashboardData, ['visitor', 'parcel', 'vehicle', 'incident']);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Quick Checkout
  const handleQuickCheckout = async (visitor) => {
    if (!window.confirm(`Confirm checkout for ${visitor.name} (Pass #${visitor.passNumber})?`)) return;
    try {
      const res = await recordVisitorExit(visitor._id);
      if (res.data?.success) {
        fetchDashboardData();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Checkout failed');
    }
  };

  const filteredInside = (Array.isArray(activeVisitors) ? activeVisitors : []).filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.toLowerCase().includes(search.toLowerCase()) ||
    v.passNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.personToMeet?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="wmn-page-container">
      {/* Professional Top Header Banner Matching Real-Time College ERP Standard */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              letterSpacing: '-0.02em'
            }}>
              {displayCollegeName} – Security Dashboard
            </h2>
            <p style={{
              margin: '3px 0 0 0',
              color: 'var(--text-muted, #64748b)',
              fontSize: '0.85rem'
            }}>
              Welcome back, {watchmanName}. Real-time campus gate security, active visitors & access control.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchDashboardData}
            style={{
              background: 'var(--bg-muted, #f1f5f9)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              color: 'var(--text-main, #334155)',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} /> Refresh Live
          </button>
          <div style={{
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            color: 'var(--text-muted, #475569)',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            <span>GATE POST: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{session?.assignedGate || 'Main Gate 1'}</strong></span>
          </div>
        </div>
      </div>

      {/* Security Command Center Main Content */}
          {/* Page Title & Quick Actions */}
          <div className="wmn-page-header">
            <div className="wmn-page-title-group">
              <h2>
                <ShieldCheck size={24} style={{ color: '#2563eb' }} />
                <span>Security Command Center</span>
              </h2>
              <p>Real-time campus security status, active visitors inside, expected arrivals, and gate checkpoints</p>
            </div>

            <div className="wmn-quick-actions">
              <button
                type="button"
                className="wmn-btn-primary"
                onClick={() => navigate('/watchman/visitor-entry')}
              >
                <UserPlus size={16} />
                <span>New Visitor Entry</span>
              </button>

              <button
                type="button"
                className="wmn-btn-sec"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => navigate('/watchman/qr-verification')}
              >
                <QrCode size={16} />
                <span>Scan / Verify Pass</span>
              </button>

              <button
                type="button"
                className="wmn-btn-sec"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => navigate('/watchman/incidents')}
              >
                <AlertTriangle size={16} />
                <span>Report Incident</span>
              </button>
            </div>
          </div>

      {/* 6 Real-Time Stat Cards */}
      <div className="wmn-ov-grid">
        {/* 1. Visitors Inside */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#2563eb' }}>
          <div className="wmn-ov-info">
            <h5>Visitors Inside</h5>
            <span className="count" style={{ color: '#2563eb' }}>{stats.visitorsInside}</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={24} />
          </div>
        </div>

        {/* 2. Today's Total Visitors */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#059669' }}>
          <div className="wmn-ov-info">
            <h5>Today's Visitors</h5>
            <span className="count" style={{ color: '#059669' }}>{stats.todayTotalVisitors}</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* 3. Expected Visitors */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#7c3aed' }}>
          <div className="wmn-ov-info">
            <h5>Expected Visitors</h5>
            <span className="count" style={{ color: '#7c3aed' }}>{stats.expectedVisitors}</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Clock size={24} />
          </div>
        </div>

        {/* 4. Pending Approvals */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#d97706' }}>
          <div className="wmn-ov-info">
            <h5>Pending Approvals</h5>
            <span className="count" style={{ color: '#d97706' }}>{stats.pendingApprovals}</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* 5. Vehicles Currently Inside */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#0891b2' }}>
          <div className="wmn-ov-info">
            <h5>Vehicles Inside</h5>
            <span className="count" style={{ color: '#0891b2' }}>{stats.vehiclesInside}</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
            <Car size={24} />
          </div>
        </div>

        {/* 6. Open Incident Reports */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#dc2626' }}>
          <div className="wmn-ov-info">
            <h5>Open Incidents</h5>
            <span className="count" style={{ color: '#dc2626' }}>{stats.openIncidents}</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Visitors Inside + Quick Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Visitors Currently Inside */}
        <div className="wmn-card">
          <div className="wmn-card-header">
            <div className="wmn-card-title">
              <Users size={18} style={{ color: '#2563eb' }} />
              <h3>Visitors Currently Inside Campus</h3>
              <span className="count-badge">{filteredInside.length} active</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Filter active..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: '6px 12px 6px 30px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              <button
                type="button"
                className="wmn-btn-sec"
                style={{ padding: '6px 10px' }}
                onClick={fetchDashboardData}
                title="Refresh active visitors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="wmn-table">
              <thead>
                <tr>
                  <th>Pass #</th>
                  <th>Visitor</th>
                  <th>Person to Meet</th>
                  <th>Entry Time</th>
                  <th>Gate</th>
                  <th style={{ textAlign: 'right' }}>Checkout</th>
                </tr>
              </thead>
              <tbody>
                {filteredInside.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                      <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
                      <p style={{ margin: 0, fontWeight: 700 }}>No visitors inside campus right now</p>
                      <span style={{ fontSize: '0.78rem' }}>All active visitors have checked out.</span>
                    </td>
                  </tr>
                ) : (
                  filteredInside.map(v => (
                    <tr key={v._id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{v.passNumber}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{v.phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{v.personToMeet}</div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.department}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#334155' }}>
                          <Clock size={12} style={{ color: '#64748b' }} />
                          <span>{new Date(v.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: '#475569' }}>{v.gate}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="wmn-btn-sec"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.76rem',
                            color: '#dc2626',
                            borderColor: '#fca5a5'
                          }}
                          onClick={() => handleQuickCheckout(v)}
                        >
                          <ExitIcon size={12} />
                          <span>Exit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Parcels Awaiting Handover & Quick Links */}
        <div>
          {/* Parcels Card */}
          <div className="wmn-card" style={{ marginBottom: '20px' }}>
            <div className="wmn-card-header">
              <div className="wmn-card-title">
                <Package size={18} style={{ color: '#d97706' }} />
                <h3>Parcels at Gate</h3>
                <span className="count-badge" style={{ background: '#fffbeb', color: '#d97706' }}>
                  {recentParcels.length}
                </span>
              </div>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                onClick={() => navigate('/watchman/parcels')}
              >
                View All
              </button>
            </div>

            {recentParcels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                <Package size={28} style={{ margin: '0 auto 6px auto' }} />
                <p style={{ margin: 0, fontSize: '0.82rem' }}>No pending parcels at gate</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentParcels.map(p => (
                  <div
                    key={p._id}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>{p.recipientName}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {p.deliveryCompany} • {p.parcelDetails}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      Gate
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Protocols Callout */}
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 800, fontSize: '0.92rem', marginBottom: '8px' }}>
              <AlertTriangle size={18} />
              <span>Gate Emergency Protocols</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.5 }}>
              In case of suspicious vehicle entry, medical distress, or campus trespassing, use the Emergency Incident tool immediately to alert security commanders.
            </p>
            <button
              type="button"
              className="wmn-btn-sec"
              style={{ width: '100%', marginTop: '12px', justifyContent: 'center', color: '#991b1b', borderColor: '#fca5a5', background: '#ffffff' }}
              onClick={() => navigate('/watchman/incidents')}
            >
              Open Incident Reporter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchmanDashboard;
