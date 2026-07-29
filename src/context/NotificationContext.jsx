import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../api';
import { AuthContext } from './AuthContext';
import { Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export const NotificationContext = createContext();

// Web Audio API synth chime (zero external dependencies, crisp sound)
const playChimeSound = (type = 'Info') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freqs = type === 'Error' ? [440, 311] : (type === 'Success' ? [523, 659] : [587, 880]);
    
    osc.frequency.setValueAtTime(freqs[0], ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqs[1], ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio autoplay restrictions quietly
  }
};

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastAlerts, setToastAlerts] = useState([]);

  const showToast = (notif) => {
    const id = notif._id || Date.now();
    setToastAlerts(prev => [...prev.filter(t => t._id !== id), { ...notif, _id: id }]);
    playChimeSound(notif.type);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToastAlerts(prev => prev.filter(t => t._id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToastAlerts(prev => prev.filter(t => t._id !== id));
  };

  const fetchNotifications = async (params = {}) => {
    // Check if session exists in sessionStorage
    const sessionKeys = ['admin_session','superadmin_session','subadmin_session','principal_session','hod_session','staff_session','student_session','parent_session','accounts_session'];
    const activeSessionKey = sessionKeys.find(k => sessionStorage.getItem(k));
    if (!activeSessionKey && !user) return;

    try {
      const { data } = await getNotifications(params);
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      } else if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? data.notifications.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Determine target socket server URL
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : `${window.location.protocol}//${window.location.hostname}:5000`;

    const socket = io(socketUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Notification Socket.IO server:', socket.id);

      // Extract user info from active session
      const sessionKeys = ['admin_session','superadmin_session','subadmin_session','principal_session','hod_session','staff_session','student_session','parent_session','accounts_session'];
      let sessionData = null;
      for (const k of sessionKeys) {
        const val = sessionStorage.getItem(k);
        if (val) {
          try {
            sessionData = JSON.parse(val);
            break;
          } catch (e) {}
        }
      }

      if (sessionData || user) {
        const current = sessionData || user;
        socket.emit('join', {
          userId: current._id || current.id,
          tenantId: current.tenantId || current.collegeId,
          role: current.role
        });
      }
    });

    socket.on('newNotification', (notif) => {
      console.log('🔔 Live Notification Received via Socket:', notif);
      
      setNotifications(prev => [notif, ...prev.filter(n => n._id !== notif._id)]);
      setUnreadCount(prev => prev + 1);

      showToast(notif);

      // Handle immediate College Deactivation
      if (notif.title === 'College Deactivated') {
        const sessionKeys = ['admin_session','subadmin_session','hod_session','staff_session','student_session','parent_session','accounts_session'];
        sessionKeys.forEach(k => {
          if (k !== 'superadmin_session') sessionStorage.removeItem(k);
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const markAsRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await markNotificationAsRead(id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotificationItem = async (id) => {
    try {
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.isRead) {
          setUnreadCount(cnt => Math.max(0, cnt - 1));
        }
        return prev.filter(n => n._id !== id);
      });
      const { deleteNotification } = await import('../api');
      await deleteNotification(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotificationItem, fetchNotifications }}>
      {children}

      {/* Floating Live Real-Time Toast Notifications */}
      <div 
        className="toast-notifications-container" 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '380px',
          width: '100%',
          pointerEvents: 'none'
        }}
      >
        {toastAlerts.map((toast) => {
          const isError = toast.type === 'Error';
          const isSuccess = toast.type === 'Success';
          const isWarning = toast.type === 'Warning';

          const bgColor = isError ? '#fef2f2' : (isSuccess ? '#f0fdf4' : (isWarning ? '#fffbe6' : '#eff6ff'));
          const borderColor = isError ? '#f87171' : (isSuccess ? '#4ade80' : (isWarning ? '#facc15' : '#60a5fa'));
          const textColor = isError ? '#991b1b' : (isSuccess ? '#166534' : (isWarning ? '#854d0e' : '#1e40af'));

          return (
            <div
              key={toast._id}
              className="toast-alert-card animate-slide-in"
              style={{
                pointerEvents: 'auto',
                background: bgColor,
                borderLeft: `4px solid ${borderColor}`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: textColor,
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {isError ? <AlertTriangle size={20} color="#dc2626" /> : 
                 isSuccess ? <CheckCircle size={20} color="#16a34a" /> : 
                 isWarning ? <AlertTriangle size={20} color="#d97706" /> : 
                 <Info size={20} color="#2563eb" />}
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: textColor }}>
                  {toast.title}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.35 }}>
                  {toast.message}
                </p>
                <span style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px', display: 'block' }}>
                  Just now • Real-Time Alert
                </span>
              </div>

              <button
                onClick={() => removeToast(toast._id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: textColor,
                  opacity: 0.6,
                  padding: '2px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};
