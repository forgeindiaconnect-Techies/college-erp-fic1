import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScanLine, Search, Filter, RefreshCw, Calendar, Clock,
  User, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  Building2, QrCode, Shield, Download, Printer, Eye,
  BarChart2, Users, Check, AlertCircle, Copy, FileText,
  Activity, Radio, Car, Package, LogOut as ExitIcon,
  ShieldAlert, UserCheck, CalendarCheck
} from 'lucide-react';
import {
  getStudentTracking,
  getStudentDailyReport,
  getStudentQrDirectory,
  getWatchmanActivities,
  getWatchmanAttendance,
  getActiveVisitors,
  getVisitorHistory,
  getPreRegisteredVisitors,
  updateVisitorApproval,
  recordVisitorExit,
  getVehicles,
  getParcels,
  getSecurityIncidents
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './AdminWatchmanTracking.css';

// Full date-time helper
const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTimeOnly = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const date = new Date(timestamp);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1 min ago';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 7200) return '1 hr ago';
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const AdminWatchmanTracking = () => {
  // Navigation Tabs:
  // 'student_tracking' | 'live_feed' | 'attendance' | 'visitors_logistics' | 'daily_report' | 'student_qr_directory'
  const [activeTab, setActiveTab] = useState('student_tracking');
  const [logisticsSubtab, setLogisticsSubtab] = useState('visitors'); // 'visitors' | 'vehicles' | 'parcels'

  // General Filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // 1. Student Tracking State
  const [trackingData, setTrackingData] = useState([]);
  const [stats, setStats] = useState({
    totalScansToday: 0,
    insideCampus: 0,
    checkedOutToday: 0,
    averageDurationFormatted: '0 mins'
  });
  const [loadingTracking, setLoadingTracking] = useState(true);

  // 2. Real-Time Activity Feed State
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityCategory, setActivityCategory] = useState('All');
  const [activitySearch, setActivitySearch] = useState('');

  // 3. Guard Attendance State
  const [attendanceList, setAttendanceList] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // 4. Visitors & Logistics State
  const [visitorsList, setVisitorsList] = useState([]);
  const [preRegList, setPreRegList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [parcelsList, setParcelsList] = useState([]);
  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [approvalLoadingId, setApprovalLoadingId] = useState(null);

  // 5. Daily Report State
  const [dailyReport, setDailyReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // 6. Student QR Directory State
  const [qrDirectory, setQrDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  // Modal State
  const [selectedStudentForQr, setSelectedStudentForQr] = useState(null);
  const [copiedQr, setCopiedQr] = useState(false);

  // ─── DATA FETCHING FUNCTIONS ───

  // 1. Student Tracking
  const fetchTracking = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoadingTracking(true);
      const res = await getStudentTracking({
        search,
        date: selectedDate,
        status: statusFilter,
        department: deptFilter
      });
      if (res.data?.success) {
        setTrackingData(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load student tracking data:', err);
    } finally {
      if (showLoader) setLoadingTracking(false);
    }
  }, [search, selectedDate, statusFilter, deptFilter]);

  // 2. Activities Feed
  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivities(true);
      const res = await getWatchmanActivities({
        category: activityCategory,
        search: activitySearch,
        limit: 100
      });
      if (res.data?.success) {
        setActivities(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  }, [activityCategory, activitySearch]);

  // 3. Guard Attendance
  const fetchAttendance = useCallback(async () => {
    try {
      setLoadingAttendance(true);
      const res = await getWatchmanAttendance();
      if (res.data?.success) {
        setAttendanceList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load guard attendance:', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  // 4. Logistics (Visitors, Vehicles, Parcels)
  const fetchLogistics = useCallback(async () => {
    try {
      setLoadingLogistics(true);
      const [visRes, vehRes, parRes, preRes] = await Promise.all([
        getVisitorHistory({ limit: 50 }),
        getVehicles({ limit: 50 }),
        getParcels({ limit: 50 }),
        getPreRegisteredVisitors()
      ]);
      setVisitorsList(visRes.data?.data || []);
      setVehiclesList(vehRes.data?.data || []);
      setParcelsList(parRes.data?.data || []);
      setPreRegList(preRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load gate logistics:', err);
    } finally {
      setLoadingLogistics(false);
    }
  }, []);

  // Admin Visitor Approval / Rejection Handler
  const handleApprovalAction = async (visitorId, approvalStatus) => {
    try {
      setApprovalLoadingId(visitorId);
      const res = await updateVisitorApproval(visitorId, { approvalStatus });
      if (res.data?.success) {
        setPreRegList(prev => prev.map(p => p._id === visitorId ? { ...p, approvalStatus, approvedBy: 'Administrator' } : p));
        fetchLogistics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update visitor approval');
    } finally {
      setApprovalLoadingId(null);
    }
  };

  // 5. Daily Report
  const fetchReport = useCallback(async () => {
    try {
      setLoadingReport(true);
      const res = await getStudentDailyReport({ date: selectedDate });
      if (res.data?.success) {
        setDailyReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load daily report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedDate]);

  // 6. Student QR Directory
  const fetchDirectory = useCallback(async () => {
    try {
      setLoadingDirectory(true);
      const res = await getStudentQrDirectory({ search: directorySearch, department: deptFilter });
      if (res.data?.success) {
        setQrDirectory(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load QR directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  }, [directorySearch, deptFilter]);

  // Eagerly load all tabs on initial mount so all badges immediately show live data
  useEffect(() => {
    fetchTracking(true);
    fetchActivities();
    fetchAttendance();
    fetchLogistics();
    fetchReport();
    fetchDirectory();
  }, []);

  // Reload data when switching active tab
  useEffect(() => {
    if (activeTab === 'student_tracking') fetchTracking(true);
    else if (activeTab === 'live_feed') fetchActivities();
    else if (activeTab === 'attendance') fetchAttendance();
    else if (activeTab === 'visitors_logistics') fetchLogistics();
    else if (activeTab === 'daily_report') fetchReport();
    else if (activeTab === 'student_qr_directory') fetchDirectory();
  }, [activeTab, fetchTracking, fetchActivities, fetchAttendance, fetchLogistics, fetchReport, fetchDirectory]);

  // Real-time synchronization via WebSockets
  useRealtimeSync({
    modules: ['watchman', 'student_tracking', 'campus_gate'],
    onSync: () => {
      if (autoRefresh) {
        if (activeTab === 'student_tracking') fetchTracking(false);
        else if (activeTab === 'live_feed') fetchActivities();
        else if (activeTab === 'attendance') fetchAttendance();
        else if (activeTab === 'visitors_logistics') fetchLogistics();
        else if (activeTab === 'daily_report') fetchReport();
        else if (activeTab === 'student_qr_directory') fetchDirectory();
      }
    }
  });

  // Polling fallback
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      if (activeTab === 'student_tracking') fetchTracking(false);
      else if (activeTab === 'live_feed') fetchActivities();
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, activeTab, fetchTracking, fetchActivities]);

  // Copy QR helper
  const handleCopyQr = (qrString) => {
    if (!qrString) return;
    navigator.clipboard.writeText(qrString);
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2000);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!trackingData.length) {
      alert('No data to export.');
      return;
    }
    const headers = ['Entry ID', 'Student ID', 'Student Name', 'Department', 'Course', 'Status', 'Check In Time', 'Entry Gate', 'Check Out Time', 'Exit Gate', 'Duration', 'Watchman'];
    const rows = trackingData.map(d => [
      `"${d.entryId}"`,
      `"${d.studentId}"`,
      `"${d.studentName}"`,
      `"${d.department || ''}"`,
      `"${d.course || ''}"`,
      `"${d.status}"`,
      `"${d.checkInTime ? new Date(d.checkInTime).toLocaleString('en-IN') : ''}"`,
      `"${d.entryGate || ''}"`,
      `"${d.checkOutTime ? new Date(d.checkOutTime).toLocaleString('en-IN') : 'Inside Campus'}"`,
      `"${d.exitGate || ''}"`,
      `"${d.durationFormatted || ''}"`,
      `"${d.entryWatchmanName || ''}${d.exitWatchmanName ? ' / ' + d.exitWatchmanName : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_watchman_tracking_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="awt-container">
      {/* Top Header Banner */}
      <div className="awt-header">
        <div className="awt-title-group">
          <h1>
            <ScanLine size={26} style={{ color: '#2563eb' }} />
            <span>Watchman Tracking & Security Command</span>
          </h1>
          <p>Resources • Student QR attendance monitoring, live security activity feed, gate passes & guard logistics</p>
        </div>

        <div className="awt-header-actions">
          <div className="awt-live-pill">
            <span className="awt-pulse-dot" />
            <span>Live Sync Active</span>
          </div>

          <button
            type="button"
            className="awt-btn awt-btn-primary"
            style={{ background: '#2563eb', color: '#ffffff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => window.open('/watchman/dashboard', '_blank')}
            title="Open Watchman Gate Terminal Console in new tab"
          >
            <Shield size={15} />
            <span>Open Watchman Terminal</span>
          </button>

          <button
            type="button"
            className="awt-btn awt-btn-secondary"
            onClick={() => {
              fetchTracking(true);
              fetchActivities();
              fetchAttendance();
              fetchLogistics();
              fetchReport();
              fetchDirectory();
            }}
            title="Refresh all real-time registers"
          >
            <RefreshCw size={15} />
            <span>Refresh All</span>
          </button>

          <button
            type="button"
            className="awt-btn awt-btn-secondary"
            onClick={handleExportCsv}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Modern ERP Segmented Controls */}
      <div className="awt-tabs">
        <button
          type="button"
          className={`awt-tab ${activeTab === 'student_tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('student_tracking')}
        >
          <ScanLine size={16} />
          <span>Campus QR Tracking</span>
          <span className="awt-tab-badge">{stats.insideCampus || 0} Inside</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'live_feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_feed')}
        >
          <Activity size={16} />
          <span>Live Security Feed</span>
          <span className="awt-tab-badge">{activities.length}</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Clock size={16} />
          <span>Guard Attendance</span>
          <span className="awt-tab-badge">{attendanceList.length}</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'visitors_logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('visitors_logistics')}
        >
          <Car size={16} />
          <span>Visitors & Logistics</span>
          <span className="awt-tab-badge">{visitorsList.length + vehiclesList.length + parcelsList.length}</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'daily_report' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily_report')}
        >
          <BarChart2 size={16} />
          <span>Daily Movement Reports</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'student_qr_directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('student_qr_directory')}
        >
          <QrCode size={16} />
          <span>Student QR Directory</span>
          <span className="awt-tab-badge">{qrDirectory.length}</span>
        </button>
      </div>

      {/* ──────────────── TAB 1: STUDENT QR & CAMPUS TRACKING ──────────────── */}
      {activeTab === 'student_tracking' && (
        <>
          {/* Stat Cards */}
          <div className="awt-stats-grid">
            <div className="awt-stat-card">
              <div className="awt-stat-icon green">
                <Users size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Inside Campus</h3>
                <div className="val" style={{ color: '#059669' }}>{stats.insideCampus || 0}</div>
                <div className="sub">Currently on campus grounds</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon blue">
                <ArrowRight size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Total Check-ins Today</h3>
                <div className="val">{stats.totalScansToday || 0}</div>
                <div className="sub">Gate scans logged</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon purple">
                <ArrowLeft size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Checked Out Today</h3>
                <div className="val">{stats.checkedOutToday || 0}</div>
                <div className="sub">Departed campus</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon amber">
                <Clock size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Avg Time on Campus</h3>
                <div className="val" style={{ fontSize: '1.25rem' }}>{stats.averageDurationFormatted || '0 mins'}</div>
                <div className="sub">Completed visits today</div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="awt-filter-card">
            <div className="awt-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="awt-search-input"
                placeholder="Search by student name, ID, mobile number, department, or guard name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                className="awt-date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Filter by Entry Date"
              />
              {selectedDate ? (
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedDate('')}
                  title="View all recorded dates"
                >
                  All Dates
                </button>
              ) : (
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedDate(todayStr)}
                  title="Filter by Today"
                >
                  Today
                </button>
              )}
            </div>

            <select
              className="awt-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Inside Campus">Inside Campus Only</option>
              <option value="Checked Out">Checked Out Only</option>
            </select>

            <select
              className="awt-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronics">Electronics</option>
              <option value="Information Technology">Information Technology</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-secondary"
              onClick={() => {
                setSearch('');
                setSelectedDate(todayStr);
                setStatusFilter('All');
                setDeptFilter('All');
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Table */}
          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <Users size={18} style={{ color: '#2563eb' }} />
                <span>Student Entry & Exit Records ({trackingData.length})</span>
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Department & Course</th>
                    <th>QR Pass</th>
                    <th>Check-in (Entry)</th>
                    <th>Check-out (Exit)</th>
                    <th>Duration on Campus</th>
                    <th>Status</th>
                    <th>Watchman / Guard</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTracking ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#2563eb' }} />
                        Loading student gate records...
                      </td>
                    </tr>
                  ) : trackingData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No student check-in / check-out records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    trackingData.map((item) => (
                      <tr key={item._id || item.entryId}>
                        <td>
                          <div className="awt-student-cell">
                            {item.photoUrl ? (
                              <img src={item.photoUrl} alt={item.studentName} className="awt-student-avatar" />
                            ) : (
                              <div className="awt-student-avatar">
                                {item.studentName?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                            )}
                            <div>
                              <div className="awt-student-name">{item.studentName}</div>
                              <span className="awt-student-id">{item.studentId}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{item.department || 'General'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.course || 'Degree'}{item.semester ? ` • Sem ${item.semester}` : ''}</div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="awt-qr-btn"
                            onClick={() => setSelectedStudentForQr({
                              id: item.studentId,
                              name: item.studentName,
                              department: item.department,
                              course: item.course,
                              photoUrl: item.photoUrl,
                              qrCode: item.qrCode || `STU-QR-${item.studentId}`
                            })}
                          >
                            <QrCode size={14} />
                            <span>View QR</span>
                          </button>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {formatTimeOnly(item.checkInTime)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {item.entryGate || 'Main Gate'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {formatDateTime(item.checkInTime)}
                          </div>
                        </td>

                        <td>
                          {item.checkOutTime ? (
                            <>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {formatTimeOnly(item.checkOutTime)}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {item.exitGate || 'Main Gate'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {formatDateTime(item.checkOutTime)}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.82rem' }}>
                              Inside Campus (Active)
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: item.status === 'Inside Campus' ? '#059669' : '#1e293b' }}>
                            {item.durationFormatted || (item.status === 'Inside Campus' ? 'Ongoing' : '—')}
                          </div>
                        </td>

                        <td>
                          {item.status === 'Inside Campus' ? (
                            <span className="awt-badge inside">
                              <span className="awt-pulse-dot" style={{ width: '6px', height: '6px' }} />
                              Inside Campus
                            </span>
                          ) : (
                            <span className="awt-badge checked-out">
                              <CheckCircle2 size={12} />
                              Checked Out
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {item.entryWatchmanName || 'Security'}
                          </div>
                          {item.exitWatchmanName && item.exitWatchmanName !== item.entryWatchmanName && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Exit: {item.exitWatchmanName}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ──────────────── TAB 2: LIVE ACTIVITY FEED ──────────────── */}
      {activeTab === 'live_feed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="awt-filter-card">
            <div className="awt-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="awt-search-input"
                placeholder="Search live activities by description, person, or gate..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
              />
            </div>

            <select
              className="awt-select"
              value={activityCategory}
              onChange={(e) => setActivityCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Student Entry">Student Gate Movements</option>
              <option value="Visitor Entry">Visitor Passes</option>
              <option value="Vehicle Entry">Vehicle Logs</option>
              <option value="Delivery / Parcel">Parcel Deliveries</option>
              <option value="Attendance Clock In">Guard Duty Shifts</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-primary"
              onClick={fetchActivities}
            >
              <RefreshCw size={15} />
              <span>Update Stream</span>
            </button>
          </div>

          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <Activity size={18} style={{ color: '#2563eb' }} />
                <span>Live Security Gate Operations Feed ({activities.length})</span>
              </h2>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {loadingActivities ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#2563eb' }} />
                  Loading activity timeline...
                </div>
              ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No security activities logged yet for this category.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activities.map((act, i) => (
                    <div
                      key={act._id || i}
                      style={{
                        padding: '14px 16px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Shield size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                            {act.title || act.action || 'Security Gate Event'}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                            {act.description}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                            Guard: <strong>{act.watchmanName || 'Security Guard'}</strong> • Gate: <strong>{act.gate || 'Main Gate'}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                          {formatRelativeTime(act.timestamp)}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                          {formatDateTime(act.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: GUARD ATTENDANCE & SHIFTS ──────────────── */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <Clock size={18} style={{ color: '#2563eb' }} />
                <span>Watchman Daily Attendance & Duty Shifts ({attendanceList.length})</span>
              </h2>
              <button
                type="button"
                className="awt-btn awt-btn-secondary"
                onClick={fetchAttendance}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Guard Name</th>
                    <th>Employee ID</th>
                    <th>Duty Date</th>
                    <th>Shift</th>
                    <th>Gate Post</th>
                    <th>Clock In Time</th>
                    <th>Clock Out Time</th>
                    <th>Duty Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAttendance ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Loading guard attendance...
                      </td>
                    </tr>
                  ) : attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No guard attendance records logged yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((a) => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 700 }}>{a.watchmanName}</td>
                        <td><span className="awt-student-id">{a.employeeId}</span></td>
                        <td>{a.dutyDate}</td>
                        <td>
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {a.shift}
                          </span>
                        </td>
                        <td>{a.gate}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatTimeOnly(a.clockInTime)}</td>
                        <td>{a.clockOutTime ? formatTimeOnly(a.clockOutTime) : <span style={{ color: '#16a34a', fontWeight: 700 }}>On Duty Now</span>}</td>
                        <td>{a.durationFormatted || (a.clockOutTime ? 'Completed' : 'Ongoing')}</td>
                        <td>
                          <span className={`awt-badge ${a.status === 'Active' || a.status === 'On Duty' ? 'inside' : 'checked-out'}`}>
                            {a.status}
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
      )}

      {/* ──────────────── TAB 4: VISITORS & GATE LOGISTICS ──────────────── */}
      {activeTab === 'visitors_logistics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Subtab Selector */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'pre_registered' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('pre_registered')}
              style={{ position: 'relative' }}
            >
              <CalendarCheck size={16} />
              <span>Pre-Registered Approvals</span>
              {preRegList.filter(p => p.approvalStatus === 'Pending').length > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginLeft: '4px'
                }}>
                  {preRegList.filter(p => p.approvalStatus === 'Pending').length} Pending
                </span>
              )}
            </button>

            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'visitors' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('visitors')}
            >
              <Users size={16} />
              <span>Visitor Passes ({visitorsList.length})</span>
            </button>

            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'vehicles' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('vehicles')}
            >
              <Car size={16} />
              <span>Vehicle Logs ({vehiclesList.length})</span>
            </button>

            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'parcels' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('parcels')}
            >
              <Package size={16} />
              <span>Parcels & Deliveries ({parcelsList.length})</span>
            </button>
          </div>

          {/* Subtab Content: Pre-Registered Appointments & Admin Approvals */}
          {logisticsSubtab === 'pre_registered' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2>
                  <CalendarCheck size={18} style={{ color: '#2563eb' }} />
                  <span>Pre-Registered Visitors & Gate Pass Approvals ({preRegList.length})</span>
                </h2>
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  onClick={fetchLogistics}
                  disabled={loadingLogistics}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Pass #</th>
                      <th>Visitor Details</th>
                      <th>Host / Person to Meet</th>
                      <th>Purpose & Vehicle</th>
                      <th>Scheduled Date & Time</th>
                      <th>Approval Status</th>
                      <th style={{ textAlign: 'right' }}>Admin Approval Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preRegList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                          No pre-registered appointments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      preRegList.map(p => {
                        const isPending = p.approvalStatus === 'Pending';
                        const isApproved = p.approvalStatus === 'Approved';
                        const isRejected = p.approvalStatus === 'Rejected';

                        return (
                          <tr key={p._id}>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: '5px' }}>
                                {p.passNumber}
                              </strong>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{p.phone}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{p.personToMeet}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.department}</div>
                            </td>
                            <td>
                              <div>{p.purpose}</div>
                              {p.vehicleNumber && (
                                <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600 }}>🚗 {p.vehicleNumber}</div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                                {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : 'Today'}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                {p.expectedTime || '10:00 AM'}
                              </div>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isApproved ? '#dcfce7' : (isRejected ? '#fee2e2' : '#fef3c7'),
                                color: isApproved ? '#166534' : (isRejected ? '#991b1b' : '#92400e'),
                                border: `1px solid ${isApproved ? '#bbf7d0' : (isRejected ? '#fca5a5' : '#fde68a')}`
                              }}>
                                {isApproved ? <CheckCircle2 size={12} /> : (isRejected ? <XCircle size={12} /> : <Clock size={12} />)}
                                <span>{p.approvalStatus || 'Pending'}</span>
                              </span>
                              {p.approvedBy && isApproved && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                  By: {p.approvedBy}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {isPending ? (
                                  <>
                                    <button
                                      type="button"
                                      className="awt-btn"
                                      style={{
                                        background: '#059669',
                                        color: '#ffffff',
                                        padding: '5px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      disabled={approvalLoadingId === p._id}
                                      onClick={() => handleApprovalAction(p._id, 'Approved')}
                                    >
                                      <Check size={13} />
                                      <span>{approvalLoadingId === p._id ? 'Approving...' : 'Approve Pass'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="awt-btn"
                                      style={{
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        padding: '5px 10px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        border: '1px solid #fca5a5',
                                        cursor: 'pointer'
                                      }}
                                      disabled={approvalLoadingId === p._id}
                                      onClick={() => handleApprovalAction(p._id, 'Rejected')}
                                    >
                                      <span>Reject</span>
                                    </button>
                                  </>
                                ) : isApproved ? (
                                  <button
                                    type="button"
                                    className="awt-btn"
                                    style={{
                                      background: '#f8fafc',
                                      color: '#dc2626',
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      cursor: 'pointer'
                                    }}
                                    disabled={approvalLoadingId === p._id}
                                    onClick={() => handleApprovalAction(p._id, 'Rejected')}
                                  >
                                    <span>Revoke</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="awt-btn"
                                    style={{
                                      background: '#059669',
                                      color: '#ffffff',
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                    disabled={approvalLoadingId === p._id}
                                    onClick={() => handleApprovalAction(p._id, 'Approved')}
                                  >
                                    <span>Re-Approve</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab Content: Visitors */}
          {logisticsSubtab === 'visitors' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2><span>Campus Visitor Logs</span></h2>
              </div>
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Visitor Name</th>
                      <th>Phone</th>
                      <th>Person to Meet</th>
                      <th>Purpose</th>
                      <th>Entry Time</th>
                      <th>Exit Time</th>
                      <th>Status</th>
                      <th>Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorsList.length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No visitor records found.</td></tr>
                    ) : (
                      visitorsList.map(v => (
                        <tr key={v._id}>
                          <td style={{ fontWeight: 700 }}>{v.name}</td>
                          <td>{v.phone}</td>
                          <td>{v.personToMeet}</td>
                          <td>{v.purpose}</td>
                          <td>{formatDateTime(v.entryTime)}</td>
                          <td>{v.exitTime ? formatDateTime(v.exitTime) : 'Still Inside'}</td>
                          <td>
                            <span className={`awt-badge ${v.status === 'Inside' ? 'inside' : 'checked-out'}`}>
                              {v.status}
                            </span>
                          </td>
                          <td>{v.gate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab Content: Vehicles */}
          {logisticsSubtab === 'vehicles' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2><span>Vehicle Gate Movements</span></h2>
              </div>
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Vehicle Number</th>
                      <th>Driver Name</th>
                      <th>Vehicle Type</th>
                      <th>Purpose</th>
                      <th>Entry Time</th>
                      <th>Exit Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiclesList.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No vehicle logs found.</td></tr>
                    ) : (
                      vehiclesList.map(veh => (
                        <tr key={veh._id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{veh.vehicleNumber}</td>
                          <td>{veh.driverName}</td>
                          <td>{veh.vehicleType}</td>
                          <td>{veh.purpose}</td>
                          <td>{formatDateTime(veh.entryTime)}</td>
                          <td>{veh.exitTime ? formatDateTime(veh.exitTime) : 'Inside Campus'}</td>
                          <td>
                            <span className={`awt-badge ${veh.status === 'Inside' ? 'inside' : 'checked-out'}`}>
                              {veh.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab Content: Parcels */}
          {logisticsSubtab === 'parcels' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2><span>Delivery & Parcel Management</span></h2>
              </div>
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Tracking / ID</th>
                      <th>Recipient</th>
                      <th>Courier Provider</th>
                      <th>Received At</th>
                      <th>Status</th>
                      <th>Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelsList.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No parcels logged.</td></tr>
                    ) : (
                      parcelsList.map(p => (
                        <tr key={p._id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.trackingNumber || p.parcelId}</td>
                          <td>{p.recipientName} ({p.department || 'Campus'})</td>
                          <td>{p.courierCompany}</td>
                          <td>{formatDateTime(p.receivedAt)}</td>
                          <td>
                            <span className={`awt-badge ${p.status === 'Received at Gate' ? 'inside' : 'checked-out'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>{p.gate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 5: DAILY REPORT ──────────────── */}
      {activeTab === 'daily_report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="awt-filter-card" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Report Date:</span>
              <input
                type="date"
                className="awt-date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                type="button"
                className="awt-btn awt-btn-primary"
                onClick={fetchReport}
              >
                <RefreshCw size={15} />
                <span>Generate Report</span>
              </button>
            </div>

            <button
              type="button"
              className="awt-btn awt-btn-secondary"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              <span>Print Report</span>
            </button>
          </div>

          {loadingReport ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: '#ffffff', borderRadius: '12px' }}>
              <RefreshCw size={28} className="awt-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#2563eb' }} />
              <p style={{ color: '#64748b', fontWeight: 600 }}>Compiling campus entry and exit metrics...</p>
            </div>
          ) : dailyReport ? (
            <>
              <div className="awt-stats-grid">
                <div className="awt-stat-card">
                  <div className="awt-stat-icon blue"><ScanLine size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Total Movements</h3>
                    <div className="val">{dailyReport.summary?.totalScans || 0}</div>
                    <div className="sub">Date: {dailyReport.reportDate}</div>
                  </div>
                </div>

                <div className="awt-stat-card">
                  <div className="awt-stat-icon green"><Users size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Currently Inside</h3>
                    <div className="val" style={{ color: '#059669' }}>{dailyReport.summary?.currentlyInside || 0}</div>
                    <div className="sub">Present on campus</div>
                  </div>
                </div>

                <div className="awt-stat-card">
                  <div className="awt-stat-icon purple"><ArrowLeft size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Completed Visits</h3>
                    <div className="val">{dailyReport.summary?.checkedOut || 0}</div>
                    <div className="sub">Checked out students</div>
                  </div>
                </div>

                <div className="awt-stat-card">
                  <div className="awt-stat-icon amber"><Clock size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Average Stay</h3>
                    <div className="val" style={{ fontSize: '1.25rem' }}>{dailyReport.summary?.averageDurationFormatted || '0 mins'}</div>
                    <div className="sub">Campus duration avg</div>
                  </div>
                </div>
              </div>

              {/* Department Breakdown */}
              <div className="awt-table-card">
                <div className="awt-table-header">
                  <h2><Building2 size={18} style={{ color: '#2563eb' }} /><span>Department Turnout Breakdown</span></h2>
                </div>
                <div className="awt-table-responsive">
                  <table className="awt-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Total Students Scanned</th>
                        <th>Currently Inside</th>
                        <th>Checked Out</th>
                        <th>Turnout Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReport.departmentBreakdown?.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No student movements for this date.</td></tr>
                      ) : (
                        dailyReport.departmentBreakdown?.map((dept, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700 }}>{dept.department}</td>
                            <td>{dept.total}</td>
                            <td style={{ color: '#059669', fontWeight: 600 }}>{dept.inside}</td>
                            <td>{dept.checkedOut}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${dailyReport.summary?.totalScans ? Math.min(100, Math.round((dept.total / dailyReport.summary.totalScans) * 100)) : 0}%`,
                                      height: '100%',
                                      background: '#2563eb'
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                  {dailyReport.summary?.totalScans ? Math.round((dept.total / dailyReport.summary.totalScans) * 100) : 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hourly Traffic Distribution with Visual Analytics */}
              <div className="awt-table-card">
                <div className="awt-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h2><Clock size={18} style={{ color: '#2563eb' }} /><span>Hourly Traffic Distribution ({dailyReport.reportDate})</span></h2>
                  
                  {dailyReport.summary?.peakHour && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                        🔥 Peak Slot: {dailyReport.summary.peakHour} ({dailyReport.summary.peakMovements || 0} movements)
                      </span>
                      <span style={{ background: '#f8fafc', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                        Morning: {dailyReport.summary.morningVolume || 0} | Afternoon: {dailyReport.summary.afternoonVolume || 0}
                      </span>
                    </div>
                  )}
                </div>
                <div className="awt-table-responsive">
                  <table className="awt-table">
                    <thead>
                      <tr>
                        <th>Hour Slot</th>
                        <th>Check-ins (Arrivals)</th>
                        <th>Check-outs (Departures)</th>
                        <th>Total Movements</th>
                        <th style={{ minWidth: '160px' }}>Traffic Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReport.hourlyBreakdown?.map((h, i) => {
                        const totalMoves = (h.checkIns || 0) + (h.checkOuts || 0);
                        const isHighlight = totalMoves > 0;
                        const maxMoves = dailyReport.summary?.peakMovements || 1;
                        const pct = Math.min(100, Math.round((totalMoves / maxMoves) * 100));

                        return (
                          <tr key={i} className={isHighlight ? 'awt-hour-row-highlight' : ''}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', color: isHighlight ? '#1d4ed8' : 'inherit' }}>
                              {h.hour}
                            </td>
                            <td>
                              <span style={{
                                color: h.checkIns > 0 ? '#16a34a' : '#94a3b8',
                                fontWeight: h.checkIns > 0 ? 800 : 500,
                                background: h.checkIns > 0 ? '#dcfce7' : 'transparent',
                                padding: h.checkIns > 0 ? '2px 8px' : '0',
                                borderRadius: '6px'
                              }}>
                                {h.checkIns > 0 ? `+${h.checkIns}` : 0}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                color: h.checkOuts > 0 ? '#2563eb' : '#94a3b8',
                                fontWeight: h.checkOuts > 0 ? 800 : 500,
                                background: h.checkOuts > 0 ? '#dbeafe' : 'transparent',
                                padding: h.checkOuts > 0 ? '2px 8px' : '0',
                                borderRadius: '6px'
                              }}>
                                {h.checkOuts > 0 ? `-${h.checkOuts}` : 0}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontWeight: isHighlight ? 800 : 500,
                                color: isHighlight ? '#0f172a' : '#94a3b8'
                              }}>
                                {totalMoves}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="awt-traffic-bar-bg">
                                  <div
                                    className="awt-traffic-bar-fill"
                                    style={{ width: `${totalMoves > 0 ? Math.max(15, pct) : 0}%` }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.74rem', color: isHighlight ? '#0f172a' : '#94a3b8', fontWeight: 700 }}>
                                  {totalMoves > 0 ? `${totalMoves} moves` : 'Idle'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ──────────────── TAB 6: STUDENT QR DIRECTORY ──────────────── */}
      {activeTab === 'student_qr_directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="awt-filter-card">
            <div className="awt-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="awt-search-input"
                placeholder="Search students by name, roll no, mobile number, department, or QR..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
              />
            </div>

            <select
              className="awt-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronics">Electronics</option>
              <option value="Information Technology">Information Technology</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-primary"
              onClick={fetchDirectory}
            >
              <RefreshCw size={15} />
              <span>Search Students</span>
            </button>
          </div>

          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <QrCode size={18} style={{ color: '#2563eb' }} />
                <span>Registered Students & Permanent QR Passes ({qrDirectory.length})</span>
              </h2>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Department & Course</th>
                    <th>Contact</th>
                    <th>Live Campus Status</th>
                    <th>Unique QR Code String</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDirectory ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#2563eb' }} />
                        Loading student QR directory...
                      </td>
                    </tr>
                  ) : qrDirectory.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No registered students found.
                      </td>
                    </tr>
                  ) : (
                    qrDirectory.map((st) => (
                      <tr key={st._id || st.id}>
                        <td>
                          <div className="awt-student-cell">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt={st.name} className="awt-student-avatar" />
                            ) : (
                              <div className="awt-student-avatar">
                                {st.name?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                            )}
                            <div>
                              <div className="awt-student-name">{st.name}</div>
                              <span className="awt-student-id">{st.id}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{st.department}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{st.course} • Sem {st.semester}</div>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{st.email}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{st.phone || '—'}</div>
                        </td>

                        <td>
                          {st.currentStatus === 'Inside Campus' ? (
                            <span className="awt-badge inside">
                              <span className="awt-pulse-dot" style={{ width: '6px', height: '6px' }} />
                              Inside Campus
                            </span>
                          ) : (
                            <span className="awt-badge checked-out">
                              Outside Campus
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                            {st.qrCode}
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="awt-qr-btn"
                            onClick={() => setSelectedStudentForQr(st)}
                          >
                            <QrCode size={14} />
                            <span>View / Print Pass</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: STUDENT QR CODE PASS ──────────────── */}
      {selectedStudentForQr && (
        <div className="awt-modal-overlay" onClick={() => setSelectedStudentForQr(null)}>
          <div className="awt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="awt-modal-header">
              <h3>
                <QrCode size={20} style={{ color: '#2563eb' }} />
                <span>Student Digital Campus Pass</span>
              </h3>
              <button
                type="button"
                className="awt-modal-close"
                onClick={() => setSelectedStudentForQr(null)}
              >
                ✕
              </button>
            </div>

            <div className="awt-modal-body">
              <div className="awt-qr-card-preview" id="printable-qr-card">
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Institutional Security Gate Pass
                </div>

                <div style={{ margin: '0 auto 12px auto', width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #2563eb', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedStudentForQr.photoUrl ? (
                    <img src={selectedStudentForQr.photoUrl} alt={selectedStudentForQr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>
                      {selectedStudentForQr.name?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0f172a' }}>
                  {selectedStudentForQr.name}
                </h3>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569', fontSize: '0.9rem', marginBottom: '8px' }}>
                  {selectedStudentForQr.id}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
                  {selectedStudentForQr.department} • {selectedStudentForQr.course}
                </div>

                <div className="awt-qr-image-wrap">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedStudentForQr.qrCode || `STU-QR-${selectedStudentForQr.id}`)}`}
                    alt={`QR Code for ${selectedStudentForQr.name}`}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Scan at any college security checkpoint for automated check-in & check-out
                </div>

                <div className="awt-qr-payload-box">
                  <span>{selectedStudentForQr.qrCode || `STU-QR-${selectedStudentForQr.id}`}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                    onClick={() => handleCopyQr(selectedStudentForQr.qrCode || `STU-QR-${selectedStudentForQr.id}`)}
                  >
                    {copiedQr ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedQr ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="awt-btn awt-btn-primary"
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  <span>Print Pass</span>
                </button>
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  onClick={() => setSelectedStudentForQr(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWatchmanTracking;
