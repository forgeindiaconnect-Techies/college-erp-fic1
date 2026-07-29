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
      borderRadius: '16px',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
      border: '1px solid #E3E5EC',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%',
      maxWidth: '380px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Clock size={18} style={{ color: '#6366f1', marginTop: '3px' }} />
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: '#1e293b' }}>
            My Attendance
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
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
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>LOP</span> - Late Check-In Blocked
            </div>
          ) : (
            <button 
              onClick={handleCheckIn}
              disabled={actionLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '8px', background: '#6366f1', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: actionLoading ? 'wait' : 'pointer' }}
            >
              <LogIn size={18} /> {actionLoading ? 'Loading...' : 'Check In Now'}
            </button>
          )
        ) : !isCheckedOut ? (
          <button 
            onClick={handleCheckOut}
            disabled={actionLoading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f59e0b', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: actionLoading ? 'wait' : 'pointer' }}
          >
            <LogOut size={18} /> {actionLoading ? 'Loading...' : 'Check Out Now'}
          </button>
        ) : (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f1f5f9', color: '#64748b', padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}>
            <CheckCircle size={18} /> Shift Completed
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendanceCard;
