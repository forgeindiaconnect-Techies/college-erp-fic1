import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, ShieldAlert, CheckCircle, Search, Filter } from 'lucide-react';
import { getTransportNotifications } from '../../api/index';

const DriverNotifications = () => {
  const [session, setSession] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef9c3', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={24} style={{ color: '#ca8a04' }} />
              </div>
              Notifications Inbox
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '1rem' }}>Stay updated with important alerts from the Transport Admin.</p>
          </div>
        </div>

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
