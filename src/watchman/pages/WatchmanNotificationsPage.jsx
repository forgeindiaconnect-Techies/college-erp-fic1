import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Shield,
  RefreshCw,
  MailCheck
} from 'lucide-react';
import { getWatchmanNotifications } from '../../api';

const WatchmanNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await getWatchmanNotifications();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'Alert':
        return <AlertTriangle size={20} color="#dc2626" />;
      case 'Success':
        return <CheckCircle size={20} color="#10b981" />;
      default:
        return <Info size={20} color="#2563eb" />;
    }
  };

  return (
    <div className="wm-page">
      <div className="wm-header">
        <div>
          <h1 className="wm-title">Notifications & Security Alerts</h1>
          <p className="wm-subtitle">System broadcast alerts, gate pass updates, and security memos</p>
        </div>
        <div className="wm-header-actions">
          <button className="wm-btn wm-btn-secondary" onClick={fetchNotifs}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="wm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Recent Security Alerts ({notifications.length})</span>
        </div>

        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
              <p>Loading notifications...</p>
            </div>
          ) : (!Array.isArray(notifications) || notifications.length === 0) ? (
            <div className="wm-empty">
              <MailCheck size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <div className="wm-empty-title">All caught up!</div>
              <p className="wm-empty-desc">You have no unread security notifications or alerts right now.</p>
            </div>
          ) : (
            (Array.isArray(notifications) ? notifications : []).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'flex-start',
                  background: item.read ? '#fff' : '#f8fafc'
                }}
              >
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: item.type === 'Alert' ? '#fef2f2' : item.type === 'Success' ? '#ecfdf5' : '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getIcon(item.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                      {item.title}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                    {item.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchmanNotificationsPage;
