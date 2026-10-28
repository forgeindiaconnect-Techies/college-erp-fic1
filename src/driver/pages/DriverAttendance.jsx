import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, CalendarDays, LogIn, LogOut, Activity, ChevronRight, UserCheck, RefreshCw } from 'lucide-react';
import { getDriverAttendance, markDriverAttendance } from '../../api/index';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DriverAttendance = () => {
  const [session, setSession] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      
      {/* ── Enterprise Real-Time Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Duty Register & Biometric Logs
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
              ACTIVE DUTY SHIFT
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Fleet Personnel • Driver <strong>{session.name || 'Driver'}</strong> ({session.referenceId || 'DRV-0001'}) • Biometric & Time Attendance Roster
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
            onClick={fetchAttendance}
            title="Refresh Attendance"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 4 ERP Key Metric Cards ── */}
      <div className="driver-stats-grid driver-kpi-grid" style={{ marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10B981', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Present Days</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534', margin: '4px 0 2px' }}>{presentDays}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>● Verified Shifts</span>
            <span style={{ color: '#10B981', fontWeight: 700 }}>Log →</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Absence / Leave</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', margin: '4px 0 2px' }}>{absentDays + onLeave}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Approved Leaves</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>Summary →</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Register Days</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>{totalDays}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: '#2563eb', fontWeight: 600 }}>Current Payroll Period</span>
            <span style={{ color: '#2563eb', fontWeight: 700 }}>Timesheet →</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${hasCheckedIn ? '#10B981' : '#F59E0B'}`, padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Check-In</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px', fontFamily: 'monospace' }}>
                {todayRecord?.checkInTime || 'Not Logged'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: hasCheckedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: hasCheckedIn ? '#10B981' : '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: hasCheckedIn ? '#16a34a' : '#b45309', fontWeight: 700 }}>{hasCheckedIn ? 'Shift In Progress' : 'Pending Check-In'}</span>
            <span style={{ color: hasCheckedIn ? '#10B981' : '#F59E0B', fontWeight: 700 }}>Punch Status →</span>
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
