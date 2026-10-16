import React, { useState, useEffect } from 'react';
import {
  Clock,
  Shield,
  CheckCircle,
  PlayCircle,
  StopCircle,
  Calendar,
  MapPin,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { getWatchmanAttendance, watchmanClockIn, watchmanClockOut } from '../../api';
import '../watchman.css';

const AttendanceShiftPage = ({ embedded = false }) => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Watchman session data
  const sessionStr = sessionStorage.getItem('watchman_session');
  let watchmanInfo = {};
  try {
    watchmanInfo = sessionStr ? JSON.parse(sessionStr) : {};
  } catch (e) {
    watchmanInfo = {};
  }

  // Active duty session safely checking array
  const activeSession = Array.isArray(attendance) 
    ? attendance.find((a) => a.status === 'Active' || a.status === 'On Duty') 
    : null;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await getWatchmanAttendance();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setAttendance(list);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleClockIn = async () => {
    try {
      setClocking(true);
      setError('');
      await watchmanClockIn({
        shift: watchmanInfo.shift || 'Morning',
        gate: watchmanInfo.assignedGate || 'Main Gate 1'
      });
      setSuccess('Duty Clock-In successful. Shift is now active.');
      fetchAttendance();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to Clock In.');
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClocking(true);
      setError('');
      await watchmanClockOut();
      setSuccess('Duty Clock-Out successful. Shift completed.');
      fetchAttendance();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to Clock Out.');
    } finally {
      setClocking(false);
    }
  };

  return (
    <div className="wm-page" style={embedded ? { padding: 0 } : undefined}>
      {!embedded && (
        <div className="wm-header">
          <div>
            <h1 className="wm-title">Attendance & Shift Management</h1>
            <p className="wm-subtitle">Track your duty shifts, campus check-ins, working hours, and gate assignments</p>
          </div>
          <div className="wm-header-actions">
            <button className="wm-btn wm-btn-secondary" onClick={fetchAttendance}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Live Shift Status Banner */}
      <div className="wm-card" style={{
        background: 'var(--bg-card, #ffffff)',
        color: 'var(--text-main, #0f172a)',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        marginBottom: 24,
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className={`wm-badge ${activeSession ? 'wm-badge-success' : 'wm-badge-secondary'}`} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ● {activeSession ? 'ON DUTY (ACTIVE)' : 'OFF DUTY'}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Shift: <strong style={{ color: '#0f172a' }}>{watchmanInfo.shift || 'General'}</strong>
              </span>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Gate: <strong style={{ color: '#0f172a' }}>{watchmanInfo.assignedGate || 'Main Gate'}</strong>
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!activeSession ? (
              <button
                className="wm-btn"
                style={{
                  background: '#10b981',
                  color: '#fff',
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
                onClick={handleClockIn}
                disabled={clocking}
              >
                <PlayCircle size={20} />
                {clocking ? 'Clocking In...' : 'Clock In for Shift'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'right', marginRight: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Clocked in at:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399' }}>
                    {new Date(activeSession.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  className="wm-btn"
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                  }}
                  onClick={handleClockOut}
                  disabled={clocking}
                >
                  <StopCircle size={20} />
                  {clocking ? 'Clocking Out...' : 'Clock Out (End Duty)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shift Details Info Cards */}
      <div className="wm-grid-3" style={{ marginBottom: 20 }}>
        <div className="wm-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned Shift</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {watchmanInfo.shift || 'Morning'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
              {watchmanInfo.shift === 'Morning' && '06:00 AM – 02:00 PM'}
              {watchmanInfo.shift === 'Evening' && '02:00 PM – 10:00 PM'}
              {watchmanInfo.shift === 'Night' && '10:00 PM – 06:00 AM'}
              {!['Morning', 'Evening', 'Night'].includes(watchmanInfo.shift) && 'Standard Gate Shift'}
            </div>
          </div>
        </div>

        <div className="wm-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
            <MapPin size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned Gate</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {watchmanInfo.assignedGate || 'Gate 1 (Main Entrance)'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>Designated Security Post</div>
          </div>
        </div>

        <div className="wm-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
            <Shield size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Officer ID</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {watchmanInfo.employeeId || 'WMN-7430'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>{watchmanInfo.name || 'Natrajan'}</div>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="wm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Recent Duty Sessions & Attendance Log</h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{attendance.length} record(s)</span>
        </div>

        <div className="wm-table-container">
          <table className="wm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Gate Post</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration (Hours)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <p>Loading attendance log...</p>
                  </td>
                </tr>
              ) : (!Array.isArray(attendance) || attendance.length === 0) ? (
                <tr>
                  <td colSpan="7">
                    <div className="wm-empty">
                      <Clock size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                      <div className="wm-empty-title">No attendance records yet</div>
                      <p className="wm-empty-desc">Click "Clock In for Shift" above to record your current duty session</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (Array.isArray(attendance) ? attendance : []).map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {new Date(item.clockIn).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span className="wm-badge wm-badge-primary">{item.shift || 'Morning'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#334155' }}>{item.gate || 'Main Gate'}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>
                        {new Date(item.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      {item.clockOut ? (
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                          {new Date(item.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontStyle: 'italic' }}>Ongoing</span>
                      )}
                    </td>
                    <td>
                      {item.durationHours ? (
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {item.durationHours} hrs
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>
                      {item.status === 'Active' ? (
                        <span className="wm-badge wm-badge-success">● Active</span>
                      ) : (
                        <span className="wm-badge wm-badge-secondary">Completed</span>
                      )}
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

export default AttendanceShiftPage;
