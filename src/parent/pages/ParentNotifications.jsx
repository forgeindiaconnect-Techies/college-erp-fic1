import React from 'react';
import { Bell, Info, AlertTriangle, Calendar } from 'lucide-react';
import './ParentNotifications.css';

const ParentNotifications = () => {
  const notifications = [
    { type: 'alert', title: 'Fee Deadline Approaching', desc: 'Semester 6 Exam fees are due on May 28, 2026. Please clear pending dues.', date: 'Today, 09:00 AM' },
    { type: 'info', title: 'PTA Meeting Scheduled', desc: 'A Parent-Teacher Association meeting is scheduled for June 5th, 2026 at 10:00 AM.', date: 'Yesterday' },
    { type: 'event', title: 'Annual Sports Meet', desc: 'College Annual Sports Meet will be held on June 15-16. All parents are invited.', date: 'May 18, 2026' },
  ];

  const getIcon = (type) => {
    if (type === 'alert') return <AlertTriangle size={20} />;
    if (type === 'event') return <Calendar size={20} />;
    return <Info size={20} />;
  };

  return (
    <div className="parent-notif-container animate-fade-in">
      <div className="parent-notif-header">
        <div>
          <h1><Bell size={24} /> Notifications</h1>
          <p>Official alerts and announcements from the institution.</p>
        </div>
        <button className="mark-read-btn">
          Mark All as Read
        </button>
      </div>

      <div className="parent-notif-list">
        {notifications.map((n, i) => (
          <div key={i} className={`glass-card parent-notif-item`}>
            <div className={`parent-notif-icon ${n.type}`}>
              {getIcon(n.type)}
            </div>
            <div className="parent-notif-content">
              <div className="parent-notif-title-row">
                <h3>{n.title}</h3>
                <span>{n.date}</span>
              </div>
              <p>{n.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentNotifications;
