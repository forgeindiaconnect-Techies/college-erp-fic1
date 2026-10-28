import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, ShieldAlert, CheckCircle, Search, Filter, RefreshCw } from 'lucide-react';
import { getTransportNotifications } from '../../api/index';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DriverNotifications = () => {
  const [session, setSession] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      setSession(data);
      
      const res = await getTransportNotifications();
      const relevantNotifs = res.data.filter(n => 
        n.targetRole === 'All' || n.targetRole === 'Driver' || n.targetRole === 'Staff'
      );
      
      // Sort by newest first
      relevantNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setNotifications(relevantNotifs);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || n.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStyleProps = (type) => {
    switch(type) {
      case 'Emergency': 
      case 'Alert':
        return { 
          bg: '#FCEBEB', border: '#fecaca', iconBg: 'white', iconColor: '#dc2626', 
          icon: <ShieldAlert size={20} style={{ color: '#dc2626' }} /> 
        };
      case 'Warning': 
        return { 
          bg: '#FAEEDA', border: '#fde68a', iconBg: 'white', iconColor: '#d97706', 
          icon: <AlertTriangle size={20} style={{ color: '#d97706' }} /> 
        };
      case 'Success': 
      case 'Resolved':
        return { 
          bg: '#f0fdf4', border: '#bbf7d0', iconBg: 'white', iconColor: '#166534', 
          icon: <CheckCircle size={20} style={{ color: '#166534' }} /> 
        };
      case 'Info':
      default: 
        return { 
          bg: '#eff6ff', border: '#bfdbfe', iconBg: 'white', iconColor: '#2563eb', 
          icon: <Info size={20} style={{ color: '#2563eb' }} /> 
        };
    }
  };

  const filters = ['All', 'Info', 'Warning', 'Emergency', 'Alert'];

  return (
    <div className="driver-page-container" style={{ maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── Enterprise Real-Time Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Fleet Dispatch & Alerts Console
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
              LIVE ALERTS SYNC
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Fleet Communications • Driver <strong>{session.name || 'Driver'}</strong> ({session.referenceId || 'DRV-0001'}) • Central Dispatch Broadcasts
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right', background: '#f8fafc', padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Academic Session 2026-27</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
              {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {DAYS[liveTime.getDay()]}, {liveTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <button 
            onClick={fetchNotifications}
            title="Refresh Alerts"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 3 Mini KPI Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Notifications</span>
            <Bell size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {notifications.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Messages</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>
            Broadcasts Received from Central Control
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Emergency & Safety</span>
            <ShieldAlert size={18} style={{ color: '#dc2626' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', margin: '4px 0 2px' }}>
            {notifications.filter(n => n.type === 'Emergency' || n.type === 'Alert').length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Urgent</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
            High-Priority Transport Directives
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Operational Bulletins</span>
            <CheckCircle size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', margin: '4px 0 2px' }}>
            {notifications.filter(n => n.type === 'Info' || n.type === 'Warning' || n.type === 'Success').length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Active</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
            ● Regular Dispatch Schedules & Logs
          </div>
        </div>
      </div>

      {/* Main Filter & List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Filters & Search Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '1rem', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} /> Filter:
            </span>
            {filters.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: filterType === type ? 'none' : '1px solid #d1d5db',
                  backgroundColor: filterType === type ? 'var(--primary)' : 'white',
                  color: filterType === type ? 'white' : '#4b5563',
                  transition: 'all 0.2s',
                  boxShadow: filterType === type ? '0 4px 6px -1px rgba(79, 70, 229, 0.3)' : 'none'
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '9999px', padding: '0.5rem 1.25rem', flex: '1 1 300px', maxWidth: '400px' }}>
            <Search size={18} style={{ color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Search by title or keyword..." 
              style={{ width: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', color: '#111827', fontSize: '0.875rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', border: '3px solid #e5e7eb', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
            <p style={{ fontWeight: 500 }}>Fetching notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ backgroundColor: 'white', border: '1px dashed #d1d5db', borderRadius: '1.25rem', padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '4rem', height: '4rem', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Bell size={32} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>All Caught Up!</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>You have no new alerts matching your criteria.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const styleProps = getStyleProps(notification.type);
            
            return (
              <div 
                key={notification._id} 
                style={{ 
                  backgroundColor: styleProps.bg, 
                  border: `1px solid ${styleProps.border}`, 
                  borderRadius: '0.75rem', 
                  padding: '1rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ 
                  backgroundColor: styleProps.iconBg, 
                  padding: '0.5rem', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${styleProps.border}`,
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                }}>
                  {React.cloneElement(styleProps.icon, { size: 16 })}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                      {notification.title}
                    </h3>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#6b7280', backgroundColor: 'rgba(255,255,255,0.7)', padding: '0.125rem 0.5rem', borderRadius: '9999px', border: `1px solid ${styleProps.border}` }}>
                      {new Date(notification.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                    {notification.message}
                  </p>
                  
                  {notification.routeId && notification.routeId !== 'All' && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'white', color: '#4b5563', padding: '0.125rem 0.5rem', borderRadius: '9999px', border: '1px solid #e5e7eb' }}>
                        Route: {notification.routeId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DriverNotifications;
