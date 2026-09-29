import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, CalendarDays, LogIn, LogOut, Activity, ChevronRight, UserCheck } from 'lucide-react';
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
      const driverId = data.referenceId || data._id;
      
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
      
      const driverId = session.referenceId || session._id;
      if (!driverId) return;

      const driverName = session.name || session.userName || 'Driver';

      let payload = {
        driverId: driverId,
        driverName: driverName,
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
        await markDriverAttendance(payload);
      } catch (e) {
        const allAtt = JSON.parse(localStorage.getItem(`erp_driver_attendance_${driverId}`) || '[]');
        const existingIdx = allAtt.findIndex(a => a.date === todayStr);
        if (existingIdx >= 0) {
           allAtt[existingIdx] = { ...allAtt[existingIdx], ...payload };
        } else {
           allAtt.push(payload);
        }
        localStorage.setItem(`erp_driver_attendance_${driverId}`, JSON.stringify(allAtt));
      }

      fetchAttendance();
      alert(`Successfully marked ${actionType === 'checkIn' ? 'Check In' : 'Check Out'}`);
    } catch (err) {
      console.error('Failed to mark attendance', err);
      alert('Failed to mark attendance.');
    }
  };

  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const absentDays = attendance.filter(a => a.status === 'Absent').length;
  const onLeave = attendance.filter(a => a.status === 'On Leave').length;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#2563eb', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }}></div>
      <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>Loading driver duty logs...</p>
    </div>
  );

  const hasCheckedIn = todayRecord && todayRecord.checkInTime;
  const hasCheckedOut = todayRecord && todayRecord.checkOutTime;

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── Breadcrumb & ERP Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span>Operations & HR</span>
            <ChevronRight size={12} />
            <span style={{ color: '#0f172a' }}>Driver Attendance & Shift Register</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Duty Register & Biometric Logs
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.2rem 0.6rem', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
            Active Duty Shift
          </span>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Present Days</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#166534', marginTop: '0.2rem' }}>{presentDays}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>Verified Shifts</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Absence / Leave</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{absentDays + onLeave}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>Approved Leaves</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Register Days</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{totalDays}</div>
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '0.15rem' }}>Current Payroll Period</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Today's Check-In</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem', fontFamily: 'monospace' }}>
            {todayRecord?.checkInTime || 'Not Logged'}
          </div>
          <div style={{ fontSize: '0.72rem', color: hasCheckedIn ? '#16a34a' : '#b45309', fontWeight: 600, marginTop: '0.15rem' }}>
            {hasCheckedIn ? 'Shift In Progress' : 'Pending Check-In'}
          </div>
        </div>
      </div>

      {/* ── Today's Punch Actions Bar ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
            Shift Attendance Punch: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Biometric and timestamp record for driver duty allowance and compliance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => handleAction('checkIn')}
            disabled={hasCheckedIn}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '6px',
              border: hasCheckedIn ? '1px solid #e2e8f0' : '1px solid #86efac',
              background: hasCheckedIn ? '#f8fafc' : '#dcfce7',
              color: hasCheckedIn ? '#94a3b8' : '#166534',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: hasCheckedIn ? 'not-allowed' : 'pointer'
            }}
          >
            <LogIn size={15} />
            {hasCheckedIn ? `Checked In (${todayRecord?.checkInTime})` : 'Punch Check In'}
          </button>

          <button 
            onClick={() => handleAction('checkOut')}
            disabled={!hasCheckedIn || hasCheckedOut}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '6px',
              border: (!hasCheckedIn || hasCheckedOut) ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
              background: (!hasCheckedIn || hasCheckedOut) ? '#f8fafc' : '#eff6ff',
              color: (!hasCheckedIn || hasCheckedOut) ? '#94a3b8' : '#1d4ed8',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: (!hasCheckedIn || hasCheckedOut) ? 'not-allowed' : 'pointer'
            }}
          >
            <LogOut size={15} />
            {hasCheckedOut ? `Checked Out (${todayRecord?.checkOutTime})` : 'Punch Check Out'}
          </button>
        </div>
      </div>

      {/* ── Attendance History Log Table ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={15} style={{ color: '#2563eb' }} /> Duty Attendance Audit Trail
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{attendance.length} Total Logs</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.65rem 1rem' }}>Duty Date</th>
                <th style={{ padding: '0.65rem 1rem' }}>Punch In Time</th>
                <th style={{ padding: '0.65rem 1rem' }}>Punch Out Time</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No recorded attendance logs for this period.
                  </td>
                </tr>
              ) : (
                attendance.map((record, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: '#334155', fontFamily: 'monospace' }}>
                      {record.checkInTime || '—'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: '#334155', fontFamily: 'monospace' }}>
                      {record.checkOutTime || '—'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '0.15rem 0.55rem', 
                        borderRadius: '4px', 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        background: record.status === 'Present' ? '#dcfce7' : '#fee2e2',
                        color: record.status === 'Present' ? '#166534' : '#b91c1c',
                        border: record.status === 'Present' ? '1px solid #bbf7d0' : '1px solid #fecaca'
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
