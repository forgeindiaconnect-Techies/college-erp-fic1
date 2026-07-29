import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, CalendarDays, LogIn, LogOut, Activity } from 'lucide-react';
import { getDriverAttendance, markDriverAttendance } from '../../api/index';

const DriverAttendance = () => {
  const [session, setSession] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      setSession(data);
      const driverId = data.referenceId;
      
      if (driverId) {
        let attData = [];
        try {
          const res = await getDriverAttendance({ driverId });
          attData = res.data || [];
        } catch (e) {
          attData = JSON.parse(localStorage.getItem(`erp_driver_attendance_${driverId}`) || '[]');
        }
        
        setAttendance(attData);
        
        const todayStr = new Date().toISOString().split('T')[0];
        const today = attData.find(r => r.date === todayStr);
        setTodayRecord(today);
      }
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleAction = async (actionType) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      let payload = {
        driverId: session.referenceId,
        date: todayStr,
        status: 'Present'
      };

      if (actionType === 'checkIn') {
        payload.checkInTime = nowTime;
      } else if (actionType === 'checkOut') {
        payload.status = todayRecord ? todayRecord.status : 'Present';
        payload.checkInTime = todayRecord ? todayRecord.checkInTime : nowTime;
        payload.checkOutTime = nowTime;
      }

      try {
        await markDriverAttendance({ records: [payload] });
      } catch (e) {
        // Fallback to local storage if API fails
        const driverId = session.referenceId;
        if (driverId) {
          const allAtt = JSON.parse(localStorage.getItem(`erp_driver_attendance_${driverId}`) || '[]');
          const todayStr = new Date().toISOString().split('T')[0];
          const existingIdx = allAtt.findIndex(a => a.date === todayStr);
          if (existingIdx >= 0) {
             allAtt[existingIdx] = { ...allAtt[existingIdx], ...payload };
          } else {
             allAtt.push(payload);
          }
          localStorage.setItem(`erp_driver_attendance_${driverId}`, JSON.stringify(allAtt));
        }
      }

      fetchAttendance(); // Refresh
      alert(`Successfully marked ${actionType === 'checkIn' ? 'Check In' : 'Check Out'}`);
    } catch (err) {
      console.error('Failed to mark attendance', err);
      alert('Failed to mark attendance. Please check console.');
    }
  };

  // Stats calculation
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const absentDays = attendance.filter(a => a.status === 'Absent').length;
  const onLeave = attendance.filter(a => a.status === 'On Leave').length;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#6b7280' }}>
      <div style={{ width: '3rem', height: '3rem', border: '4px solid #f3e8ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
      <p style={{ fontWeight: 'bold' }}>Loading attendance...</p>
    </div>
  );

  const hasCheckedIn = todayRecord && todayRecord.checkInTime;
  const hasCheckedOut = todayRecord && todayRecord.checkOutTime;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CalendarDays style={{ color: '#2563eb' }} /> Attendance & Duty
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Manage your daily check-in and check-out logs securely.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontWeight: 'bold', fontSize: '0.875rem' }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
          Active Session
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        {/* Main Duty Actions */}
        <div style={{ flex: '2 1 500px' }}>
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '1.5rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', marginBottom: '1rem' }}>
              <Clock size={24} />
            </div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.25rem 0' }}>Today's Duty Status</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem 0', fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', width: '100%', maxWidth: '32rem', justifyContent: 'center' }}>
              
              {/* Check In Button */}
              <button 
                onClick={() => handleAction('checkIn')}
                disabled={hasCheckedIn}
                style={{
                  flex: '1 1 180px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: hasCheckedIn ? '2px solid #f3f4f6' : '2px solid #22c55e',
                  backgroundColor: hasCheckedIn ? '#f9fafb' : '#f0fdf4',
                  color: hasCheckedIn ? '#9ca3af' : '#15803d',
                  cursor: hasCheckedIn ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: hasCheckedIn ? 'none' : '0 4px 6px -1px rgba(34, 197, 94, 0.2)'
                }}
              >
                <LogIn size={24} style={{ marginBottom: '0.5rem', opacity: hasCheckedIn ? 0.5 : 1 }} />
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{hasCheckedIn ? 'Checked In' : 'Check In'}</span>
                {hasCheckedIn && (
                  <span style={{ marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#e5e7eb', color: '#4b5563', padding: '0.2rem 0.5rem', borderRadius: '9999px', letterSpacing: '0.05em' }}>
                    {todayRecord.checkInTime}
                  </span>
                )}
              </button>
              
              {/* Check Out Button */}
              <button 
                onClick={() => handleAction('checkOut')}
                disabled={!hasCheckedIn || hasCheckedOut}
                style={{
                  flex: '1 1 180px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: (!hasCheckedIn || hasCheckedOut) ? '2px solid #f3f4f6' : '2px solid #3b82f6',
                  backgroundColor: (!hasCheckedIn || hasCheckedOut) ? '#f9fafb' : '#eff6ff',
                  color: (!hasCheckedIn || hasCheckedOut) ? '#9ca3af' : '#1d4ed8',
                  cursor: (!hasCheckedIn || hasCheckedOut) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (!hasCheckedIn || hasCheckedOut) ? 'none' : '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                }}
              >
                <LogOut size={24} style={{ marginBottom: '0.5rem', opacity: (!hasCheckedIn || hasCheckedOut) ? 0.5 : 1 }} />
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{hasCheckedOut ? 'Checked Out' : 'Check Out'}</span>
                {hasCheckedOut && (
                  <span style={{ marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#e5e7eb', color: '#4b5563', padding: '0.2rem 0.5rem', borderRadius: '9999px', letterSpacing: '0.05em' }}>
                    {todayRecord.checkOutTime}
                  </span>
                )}
              </button>

            </div>
          </div>
        </div>

        {/* Right Sidebar Stats */}
        <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderLeft: '4px solid #22c55e', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Present Days</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#166534', margin: 0 }}>{presentDays}</h3>
            </div>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderLeft: '4px solid #ef4444', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Absent / Leave</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#991b1b', margin: 0 }}>{absentDays + onLeave}</h3>
            </div>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={20} />
            </div>
          </div>

          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderLeft: '4px solid #3b82f6', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Total Duty Days</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a', margin: 0 }}>{totalDays}</h3>
            </div>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} />
            </div>
          </div>

        </div>
      </div>

      {/* History Table */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity style={{ color: '#4b5563' }} size={20} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Attendance History Logs</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check In</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check Out</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontWeight: 500 }}>Loading history...</td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontWeight: 500 }}>No attendance records found for this period.</td></tr>
              ) : (
                attendance.map((record, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569', fontFamily: 'monospace' }}>{record.checkInTime || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569', fontFamily: 'monospace' }}>{record.checkOutTime || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        textTransform: 'uppercase',
                        backgroundColor: record.status === 'Present' ? '#dcfce7' : record.status === 'Absent' ? '#fee2e2' : '#fef9c3',
                        color: record.status === 'Present' ? '#166534' : record.status === 'Absent' ? '#991b1b' : '#854d0e'
                      }}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DriverAttendance;
