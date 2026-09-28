import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { getTodayEmployeeAttendance, employeeCheckIn, employeeCheckOut } from '../../api';

const EmployeeAttendanceCard = () => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTodayAttendance = async () => {
    try {
      const res = await getTodayEmployeeAttendance();
      setAttendance(res.data);
    } catch (err) {
      console.error('Error fetching today attendance:', err);
      setError('Failed to load status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await employeeCheckIn();
      setAttendance(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await employeeCheckOut();
      setAttendance(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check out.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E3E5EC', display: 'flex', justifyContent: 'center', height: '160px', alignItems: 'center' }}>
        <div style={{ animation: 'spin 1s linear infinite', border: '3px solid #f1f5f9', borderTopColor: '#6366f1', borderRadius: '50%', width: '24px', height: '24px' }}></div>
      </div>
    );
  }

  const isCheckedIn = attendance && attendance.checkIn;
  const isCheckedOut = attendance && attendance.checkOut;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '0.85rem 1rem',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <Clock size={16} style={{ color: '#2563eb', marginTop: '2px' }} />
        <div>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 2px 0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Duty Attendance
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {(isCheckedIn || isCheckedOut) && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <div>
            <p style={{ margin: '0 0 2px 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>In</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{formatTime(attendance?.checkIn) || '-'}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 2px 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Out</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{formatTime(attendance?.checkOut) || '-'}</p>
          </div>
        </div>
      )}

      {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{error}</div>}

      <div style={{ marginTop: '0.5rem' }}>
        {!isCheckedIn ? (
          new Date().getHours() >= 9 ? (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.45rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem' }}>
              <span>LOP • Shift Late Check-In Blocked</span>
            </div>
          ) : (
            <button 
              onClick={handleCheckIn}
              disabled={actionLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#2563eb', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: actionLoading ? 'wait' : 'pointer' }}
            >
              <LogIn size={15} /> {actionLoading ? 'Loading...' : 'Punch Check In'}
            </button>
          )
        ) : !isCheckedOut ? (
          <button 
            onClick={handleCheckOut}
            disabled={actionLoading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#d97706', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: actionLoading ? 'wait' : 'pointer' }}
          >
            <LogOut size={15} /> {actionLoading ? 'Loading...' : 'Punch Check Out'}
          </button>
        ) : (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '0.45rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem' }}>
            <CheckCircle size={15} style={{ color: '#16a34a' }} /> Shift Concluded
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendanceCard;
