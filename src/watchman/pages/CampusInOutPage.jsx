import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  Users,
  Search,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Filter,
  Clock,
  ArrowRight,
  ArrowLeft,
  Building,
  Car,
  ShieldCheck,
  RefreshCw,
  Download,
  UserCheck,
  GraduationCap,
  UserPlus,
  X,
  Phone,
  Tag,
  ShieldAlert,
  ArrowLeftRight,
  Eye,
  QrCode,
  Printer,
  ExternalLink
} from 'lucide-react';
import {
  getCampusPeople,
  registerCampusPerson,
  recordCampusIn,
  recordCampusOut,
  getCampusMovements,
  getCampusMovementStats
} from '../../api';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { getGatePassUrl, getQrCodeImageUrl } from '../../utils/qrPassHelper';
import '../watchman.css';

const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
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

const CampusInOutPage = () => {
  // Navigation sub-tab: 'directory' | 'movements'
  const [activeTab, setActiveTab] = useState('directory');

  // Stats
  const [stats, setStats] = useState({
    totalRegistered: 0,
    currentlyInside: 0,
    currentlyOutside: 0,
    todayEntries: 0,
    todayExits: 0
  });

  // People List & Filters
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Inside Campus' | 'Outside Campus'
  const [roleFilter, setRoleFilter] = useState('All'); // 'All' | 'Student' | 'Staff' | 'Visitor' | 'Contractor'

  // Movements History & Filters
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementSearch, setMovementSearch] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [movementDirection, setMovementDirection] = useState('All'); // 'All' | 'In' | 'Out'
  const [movementRole, setMovementRole] = useState('All');

  const navigate = useNavigate();

  // Modals & Action States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [detailsPersonModal, setDetailsPersonModal] = useState(null);
  const [qrPassModal, setQrPassModal] = useState(null);
  const [actionPerson, setActionPerson] = useState(null); // Person being checked In or Out
  const [actionType, setActionType] = useState('In'); // 'In' | 'Out'
  const [actionGate, setActionGate] = useState('Gate 1 (Main Entrance)');
  const [actionVehicle, setActionVehicle] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Register Form State
  const [registerForm, setRegisterForm] = useState({
    name: '',
    personType: 'Visitor',
    phone: '',
    email: '',
    department: 'General',
    designation: '',
    vehicleNumber: '',
    idProofType: 'Aadhaar Card / Govt ID',
    idProofNumber: ''
  });

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      const res = await getCampusMovementStats();
      if (res?.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    }
  };

  // Fetch People Directory
  const fetchPeople = useCallback(async () => {
    try {
      setLoadingPeople(true);
      const res = await getCampusPeople({
        search,
        status: statusFilter,
        personType: roleFilter
      });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setPeople(list);
    } catch (err) {
      console.error('Failed to load registered people:', err);
      setPeople([]);
    } finally {
      setLoadingPeople(false);
    }
  }, [search, statusFilter, roleFilter]);

  // Fetch Movements History
  const fetchMovementsList = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const res = await getCampusMovements({
        search: movementSearch,
        date: movementDate,
        direction: movementDirection,
        personType: movementRole
      });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setMovements(list);
    } catch (err) {
      console.error('Failed to load campus movements:', err);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [movementSearch, movementDate, movementDirection, movementRole]);

  useEffect(() => {
    fetchStats();
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovementsList();
    }
  }, [activeTab, fetchMovementsList]);

  // Real-time synchronization
  useRealtimeSync({
    modules: ['watchman', 'campus_movement', 'campus_people'],
    onSync: () => {
      fetchStats();
      fetchPeople();
      if (activeTab === 'movements') {
        fetchMovementsList();
      }
    }
  });

  // Trigger Campus In Action
  const handleInitiateIn = (person) => {
    if (person.currentStatus === 'Inside Campus') {
      setError(`Duplicate Entry Prevented: ${person.name} is already inside campus.`);
      setTimeout(() => setError(''), 4500);
      return;
    }
    setError('');
    setActionPerson(person);
    setActionType('In');
    setActionGate('Gate 1 (Main Entrance)');
    setActionVehicle(person.vehicleNumber || '');
    setActionRemarks('');
  };

  // Trigger Campus Out Action
  const handleInitiateOut = (person) => {
    if (person.currentStatus === 'Outside Campus') {
      setError(`Cannot record Campus Out: ${person.name} is currently outside campus.`);
      setTimeout(() => setError(''), 4500);
      return;
    }
    setError('');
    setActionPerson(person);
    setActionType('Out');
    setActionGate('Gate 1 (Main Entrance)');
    setActionVehicle(person.vehicleNumber || '');
    setActionRemarks('');
  };

  // Confirm In/Out Submission
  const handleConfirmAction = async (e) => {
    if (e) e.preventDefault();
    if (!actionPerson) return;
    try {
      setActionLoading(true);
      setError('');

      if (actionType === 'In') {
        const res = await recordCampusIn({
          personId: actionPerson.personId,
          gate: actionGate,
          vehicleNumber: actionVehicle,
          remarks: actionRemarks
        });
        setSuccess(res?.data?.message || `Campus In logged for ${actionPerson.name}!`);
      } else {
        const res = await recordCampusOut({
          personId: actionPerson.personId,
          gate: actionGate,
          remarks: actionRemarks
        });
        setSuccess(res?.data?.message || `Campus Out logged for ${actionPerson.name}!`);
      }

      setActionPerson(null);
      fetchStats();
      fetchPeople();
      if (activeTab === 'movements') fetchMovementsList();
      setTimeout(() => setSuccess(''), 4500);
    } catch (err) {
      const msg = err?.response?.data?.message || `Failed to record Campus ${actionType}.`;
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Register New Person Once
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.name.trim()) {
      setError('Person name is required.');
      return;
    }
    try {
      setSubmittingRegister(true);
      setError('');
      const res = await registerCampusPerson(registerForm);
      setSuccess(res?.data?.message || `Person registered successfully!`);
      setShowRegisterModal(false);
      setRegisterForm({
        name: '',
        personType: 'Visitor',
        phone: '',
        email: '',
        department: 'General',
        designation: '',
        vehicleNumber: '',
        idProofType: 'Aadhaar Card / Govt ID',
        idProofNumber: ''
      });
      fetchStats();
      fetchPeople();
      setTimeout(() => setSuccess(''), 4500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to register person.');
    } finally {
      setSubmittingRegister(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!movements.length) {
      alert('No movement records to export.');
      return;
    }
    const headers = ['Movement ID', 'Person Name', 'Role', 'Person ID', 'Phone', 'Department', 'Direction', 'Date & Time', 'Gate', 'Watchman', 'Time on Campus', 'Remarks'];
    const rows = movements.map(m => [
      `"${m.movementId}"`,
      `"${m.name}"`,
      `"${m.personType || ''}"`,
      `"${m.personId}"`,
      `"${m.phone || ''}"`,
      `"${m.department || ''}"`,
      `"${m.direction}"`,
      `"${m.timestamp ? new Date(m.timestamp).toLocaleString('en-IN') : ''}"`,
      `"${m.gate || ''}"`,
      `"${m.watchmanName || ''}"`,
      `"${m.durationFormatted || ''}"`,
      `"${m.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_movements_${movementDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="wm-page">
      {/* Page Header */}
      <div className="wm-header">
        <div>
          <h1 className="wm-title">
            <ArrowLeftRight size={26} color="#2563eb" />
            Campus In & Campus Out Control
          </h1>
          <p className="wm-subtitle">
            Instant entry and exit logging for registered students, faculty, staff, regular visitors, and contractors
          </p>
        </div>
        <div className="wm-header-actions">
          <button
            type="button"
            className="wm-btn wm-btn-primary"
            onClick={() => { setError(''); setShowRegisterModal(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <UserPlus size={18} />
            Register Person Once
          </button>
          <button
            type="button"
            className="wm-btn wm-btn-secondary"
            onClick={() => { fetchStats(); fetchPeople(); if (activeTab === 'movements') fetchMovementsList(); }}
            title="Refresh All Records"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 500
        }}>
          <AlertCircle size={20} color="#dc2626" />
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#991b1b' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 600
        }}>
          <CheckCircle size={20} color="#059669" />
          <span>{success}</span>
          <button
            onClick={() => setSuccess('')}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 5 Real-Time KPI Cards */}
      <div className="wmn-ov-grid" style={{ marginBottom: 20 }}>
        <div className="wmn-ov-card" style={{ '--accent-bar': '#2563eb' }}>
          <div className="wmn-ov-info">
            <h5>Total Registered Personnel</h5>
            <span className="count" style={{ color: '#2563eb' }}>{stats.totalRegistered || people.length}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Students, staff & regular visitors</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="wmn-ov-card" style={{ '--accent-bar': '#059669' }}>
          <div className="wmn-ov-info">
            <h5>Currently Inside Campus</h5>
            <span className="count" style={{ color: '#059669' }}>{stats.currentlyInside || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Active on campus grounds</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <LogIn size={24} />
          </div>
        </div>

        <div className="wmn-ov-card" style={{ '--accent-bar': '#64748b' }}>
          <div className="wmn-ov-info">
            <h5>Currently Outside Campus</h5>
            <span className="count" style={{ color: '#475569' }}>{stats.currentlyOutside || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Awaiting arrival / off-site</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#f1f5f9', color: '#64748b' }}>
            <LogOut size={24} />
          </div>
        </div>

        <div className="wmn-ov-card" style={{ '--accent-bar': '#4f46e5' }}>
          <div className="wmn-ov-info">
            <h5>Today's Campus In</h5>
            <span className="count" style={{ color: '#4f46e5' }}>{stats.todayEntries || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Gate arrivals logged</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <ArrowRight size={24} />
          </div>
        </div>

        <div className="wmn-ov-card" style={{ '--accent-bar': '#d97706' }}>
          <div className="wmn-ov-info">
            <h5>Today's Campus Out</h5>
            <span className="count" style={{ color: '#d97706' }}>{stats.todayExits || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Gate departures logged</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <ArrowLeft size={24} />
          </div>
        </div>
      </div>

      {/* Main Mode Switcher Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{
          display: 'inline-flex',
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 10,
          gap: 6
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            style={{
              border: 'none',
              background: activeTab === 'directory' ? '#ffffff' : 'transparent',
              color: activeTab === 'directory' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'directory' ? 700 : 500,
              fontSize: '0.88rem',
              padding: '8px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeTab === 'directory' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Users size={17} />
            <span>Registered People & In/Out Actions ({people.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            style={{
              border: 'none',
              background: activeTab === 'movements' ? '#ffffff' : 'transparent',
              color: activeTab === 'movements' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'movements' ? 700 : 500,
              fontSize: '0.88rem',
              padding: '8px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeTab === 'movements' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Clock size={17} />
            <span>Complete Movement History Logs</span>
          </button>
        </div>
      </div>

      {/* ──────────────── TAB 1: REGISTERED PERSONNEL DIRECTORY ──────────────── */}
      {activeTab === 'directory' && (
        <div className="wm-card" style={{ padding: 20 }}>
          {/* Search & Filter Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flex: 1, minWidth: 280 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 360 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="wm-input"
                  style={{ paddingLeft: 36, height: 40 }}
                  placeholder="Quick search by Name, ID, or Phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select
                className="wm-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: 40, width: 160 }}
              >
                <option value="All">All Statuses</option>
                <option value="Inside Campus">🟢 Inside Campus Only</option>
                <option value="Outside Campus">⚪ Outside Campus Only</option>
              </select>

              {/* Role / Person Type Filter */}
              <select
                className="wm-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ height: 40, width: 150 }}
              >
                <option value="All">All Roles</option>
                <option value="Student">Students</option>
                <option value="Staff">Staff / Faculty</option>
                <option value="HOD">HODs (Heads of Department)</option>
                <option value="Visitor">Visitors</option>
                <option value="Contractor">Contractors</option>
              </select>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Showing <strong>{people.length}</strong> registered personnel
            </div>
          </div>

          {/* Personnel Table */}
          <div className="wm-table-container">
            <table className="wm-table">
              <thead>
                <tr>
                  <th>Person Details</th>
                  <th>Person Role</th>
                  <th>Contact / ID</th>
                  <th>Current Status</th>
                  <th>Last Gate Activity</th>
                  <th style={{ textAlign: 'center' }}>Directory Options & Movement Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingPeople ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                      <p>Loading registered people directory...</p>
                    </td>
                  </tr>
                ) : people.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 700, color: '#334155' }}>No Registered Personnel Found</div>
                      <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
                        {search ? 'Try clearing your search query.' : 'Click "Register Person Once" to add recurring visitors or staff.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  people.map((person) => {
                    const isInside = person.currentStatus === 'Inside Campus';
                    return (
                      <tr key={person._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: isInside ? '#dcfce7' : '#f1f5f9',
                              color: isInside ? '#15803d' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              border: isInside ? '1.5px solid #86efac' : '1px solid #cbd5e1'
                            }}>
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{person.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{person.personId}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontWeight: 700,
                              background: person.personType === 'Student' ? '#eff6ff' : person.personType === 'Staff' ? '#ecfdf5' : '#fef3c7',
                              color: person.personType === 'Student' ? '#1d4ed8' : person.personType === 'Staff' ? '#047857' : '#b45309'
                            }}>
                              {person.personType || 'Visitor'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.84rem', color: '#334155' }}>
                            {person.phone || 'No phone'}
                          </div>
                          {person.vehicleNumber && (
                            <div style={{ fontSize: '0.74rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Car size={12} />
                              <span>{person.vehicleNumber}</span>
                            </div>
                          )}
                        </td>

                        <td>
                          {isInside ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 14,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0'
                            }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                              Inside Campus
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 14,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: '#f8fafc',
                              color: '#64748b',
                              border: '1px solid #e2e8f0'
                            }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8' }} />
                              Outside Campus
                            </span>
                          )}
                        </td>

                        <td>
                          {isInside ? (
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                                Entered: {formatTimeOnly(person.lastEntryTime)}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Gate: {person.lastGate || 'Gate 1'}
                              </div>
                            </div>
                          ) : person.lastExitTime ? (
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Exited: {formatDateTime(person.lastExitTime)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No activity today</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {/* 1. View Details Option */}
                            <button
                              type="button"
                              className="wm-btn"
                              onClick={() => setDetailsPersonModal(person)}
                              title="View full person details"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                borderRadius: 6,
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontWeight: 600
                              }}
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>

                            {/* 2. View QR Code Option */}
                            <button
                              type="button"
                              className="wm-btn"
                              onClick={() => setQrPassModal(person)}
                              title="View scannable QR Code pass"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                borderRadius: 6,
                                background: '#f8fafc',
                                color: '#0f172a',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontWeight: 600
                              }}
                            >
                              <QrCode size={13} color="#2563eb" />
                              <span>View QR</span>
                            </button>

                            {/* 3. Scan QR Code Option */}
                            <button
                              type="button"
                              className="wm-btn"
                              onClick={() => navigate(`/watchman/qr-verification?id=${encodeURIComponent(person.personId)}`)}
                              title="Scan in QR Scanner"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                borderRadius: 6,
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontWeight: 600
                              }}
                            >
                              <ExternalLink size={13} />
                              <span>Scan QR</span>
                            </button>

                            {/* 4. Campus In Quick Button */}
                            <button
                              type="button"
                              className="wm-btn"
                              disabled={isInside}
                              onClick={() => handleInitiateIn(person)}
                              title={isInside ? 'Already inside campus (duplicate prevented)' : 'Record Campus In'}
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                borderRadius: 6,
                                background: isInside ? '#f1f5f9' : '#059669',
                                color: isInside ? '#94a3b8' : '#ffffff',
                                border: 'none',
                                cursor: isInside ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 700
                              }}
                            >
                              <LogIn size={13} />
                              <span>In</span>
                            </button>

                            {/* 5. Campus Out Quick Button */}
                            <button
                              type="button"
                              className="wm-btn"
                              disabled={!isInside}
                              onClick={() => handleInitiateOut(person)}
                              title={!isInside ? 'Already outside campus' : 'Record Campus Out'}
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                borderRadius: 6,
                                background: !isInside ? '#f1f5f9' : '#d97706',
                                color: !isInside ? '#94a3b8' : '#ffffff',
                                border: 'none',
                                cursor: !isInside ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 700
                              }}
                            >
                              <LogOut size={13} />
                              <span>Out</span>
                            </button>
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

      {/* ──────────────── TAB 2: COMPLETE MOVEMENT HISTORY LOGS ──────────────── */}
      {activeTab === 'movements' && (
        <div className="wm-card" style={{ padding: 20 }}>
          {/* Movement Filters Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 240 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="wm-input"
                  style={{ paddingLeft: 36, height: 40 }}
                  placeholder="Search movement logs..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                />
              </div>

              <input
                type="date"
                className="wm-input"
                style={{ height: 40, width: 150 }}
                value={movementDate}
                onChange={(e) => setMovementDate(e.target.value)}
                title="Filter by Date"
              />

              <select
                className="wm-select"
                value={movementDirection}
                onChange={(e) => setMovementDirection(e.target.value)}
                style={{ height: 40, width: 140 }}
              >
                <option value="All">All Directions</option>
                <option value="In">Campus In Only</option>
                <option value="Out">Campus Out Only</option>
              </select>

              <select
                className="wm-select"
                value={movementRole}
                onChange={(e) => setMovementRole(e.target.value)}
                style={{ height: 40, width: 140 }}
              >
                <option value="All">All Person Types</option>
                <option value="Student">Students</option>
                <option value="Staff">Staff / Faculty</option>
                <option value="HOD">HODs</option>
                <option value="Visitor">Visitors</option>
                <option value="Contractor">Contractors</option>
              </select>
            </div>

            <button
              type="button"
              className="wm-btn wm-btn-secondary"
              onClick={handleExportCsv}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={15} />
              Export CSV Report
            </button>
          </div>

          {/* Movements Table */}
          <div className="wm-table-container">
            <table className="wm-table">
              <thead>
                <tr>
                  <th>Movement Details</th>
                  <th>Person & Role</th>
                  <th>Direction</th>
                  <th>Date & Time</th>
                  <th>Gate & Watchman</th>
                  <th>Time on Campus</th>
                  <th>Remarks / Vehicle</th>
                </tr>
              </thead>
              <tbody>
                {loadingMovements ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                      <p>Loading gate movements history...</p>
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 700, color: '#334155' }}>No Movements Recorded for Selected Filter</div>
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => {
                    const isIn = mov.direction === 'In';
                    return (
                      <tr key={mov._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{mov.movementId}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{mov.reason || 'Campus Gate'}</div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{mov.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {mov.personType} • ID: {mov.personId}
                          </div>
                        </td>

                        <td>
                          {isIn ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 12,
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0'
                            }}>
                              <ArrowRight size={13} />
                              Campus In
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 12,
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a'
                            }}>
                              <ArrowLeft size={13} />
                              Campus Out
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                            {formatTimeOnly(mov.timestamp)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {formatDateTime(mov.timestamp)}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.82rem', color: '#334155' }}>{mov.gate || 'Gate 1'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Officer: {mov.watchmanName || 'Security Staff'}</div>
                        </td>

                        <td>
                          {mov.durationFormatted ? (
                            <span style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#2563eb',
                              background: '#eff6ff',
                              padding: '2px 8px',
                              borderRadius: 8
                            }}>
                              {mov.durationFormatted}
                            </span>
                          ) : isIn ? (
                            <span style={{ fontSize: '0.75rem', color: '#059669', fontStyle: 'italic' }}>Present on campus</span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td>
                          {mov.vehicleNumber && (
                            <div style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 600 }}>
                              Veh: {mov.vehicleNumber}
                            </div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {mov.remarks || 'Normal'}
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

      {/* ──────────────── MODAL: REGISTER NEW PERSON ONCE ──────────────── */}
      {showRegisterModal && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 520 }}>
            <div className="wm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="#2563eb" />
                <h2 className="wm-modal-title">Register Person Once</h2>
              </div>
              <button className="wm-close-btn" onClick={() => setShowRegisterModal(false)}>×</button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 0, marginBottom: 16 }}>
                Once registered, this person will permanently stay in the database. Watchmen can subsequently record Campus In and Campus Out without ever registering them again.
              </p>

              <div className="wm-form-group">
                <label className="wm-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="wm-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                />
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Person Type / Role *</label>
                  <select
                    className="wm-select"
                    value={registerForm.personType}
                    onChange={(e) => setRegisterForm({ ...registerForm, personType: e.target.value })}
                  >
                    <option value="Visitor">Visitor</option>
                    <option value="Contractor">Contractor / Vendor</option>
                    <option value="Parent">Parent / Guardian</option>
                    <option value="Staff">Staff / Faculty</option>
                    <option value="HOD">HOD (Head of Department)</option>
                    <option value="Student">Student</option>
                    <option value="Other">Other Regular Personnel</option>
                  </select>
                </div>

                <div className="wm-form-group">
                  <label className="wm-label">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="wm-input"
                    placeholder="e.g. 9876543210"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-label">Vehicle Number (Optional)</label>
                <input
                  type="text"
                  className="wm-input"
                  placeholder="e.g. TN-09-AB-1234"
                  value={registerForm.vehicleNumber}
                  onChange={(e) => setRegisterForm({ ...registerForm, vehicleNumber: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn wm-btn-primary"
                  disabled={submittingRegister}
                >
                  {submittingRegister ? 'Registering...' : 'Save & Register Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: CONFIRM CAMPUS IN / OUT ──────────────── */}
      {actionPerson && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 460 }}>
            <div className="wm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {actionType === 'In' ? (
                  <LogIn size={20} color="#059669" />
                ) : (
                  <LogOut size={20} color="#d97706" />
                )}
                <h2 className="wm-modal-title">
                  Record Campus {actionType === 'In' ? 'Entry (In)' : 'Departure (Out)'}
                </h2>
              </div>
              <button className="wm-close-btn" onClick={() => setActionPerson(null)}>×</button>
            </div>

            <form onSubmit={handleConfirmAction} style={{ padding: '20px 24px' }}>
              <div style={{
                background: actionType === 'In' ? '#ecfdf5' : '#fffbeb',
                border: actionType === 'In' ? '1px solid #a7f3d0' : '1px solid #fde68a',
                padding: '12px 14px',
                borderRadius: 8,
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>
                  {actionPerson.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 3 }}>
                  Role: <strong>{actionPerson.personType}</strong> • ID: <strong>{actionPerson.personId}</strong>
                </div>
                {actionType === 'Out' && actionPerson.lastEntryTime && (
                  <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: 4 }}>
                    Entered campus at: {formatTimeOnly(actionPerson.lastEntryTime)}
                  </div>
                )}
              </div>

              <div className="wm-form-group">
                <label className="wm-label">Gate / Post</label>
                <select
                  className="wm-select"
                  value={actionGate}
                  onChange={(e) => setActionGate(e.target.value)}
                >
                  <option value="Gate 1 (Main Entrance)">Gate 1 (Main Entrance)</option>
                  <option value="Gate 2 (East Gate)">Gate 2 (East Gate)</option>
                  <option value="Gate 3 (Hostel & Sports Gate)">Gate 3 (Hostel & Sports Gate)</option>
                  <option value="Service & Cargo Gate">Service & Cargo Gate</option>
                </select>
              </div>

              {actionType === 'In' && (
                <div className="wm-form-group">
                  <label className="wm-label">Vehicle Number (If bringing vehicle)</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. TN-07-CD-5678"
                    value={actionVehicle}
                    onChange={(e) => setActionVehicle(e.target.value)}
                  />
                </div>
              )}

              <div className="wm-form-group">
                <label className="wm-label">Remarks / Notes (Optional)</label>
                <input
                  type="text"
                  className="wm-input"
                  placeholder={actionType === 'In' ? 'e.g. Regular Entry' : 'e.g. Left for home'}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => setActionPerson(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn"
                  disabled={actionLoading}
                  style={{
                    background: actionType === 'In' ? '#059669' : '#d97706',
                    color: '#ffffff',
                    fontWeight: 700
                  }}
                >
                  {actionLoading ? 'Logging...' : `Confirm Campus ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ──────────────── MODAL: VIEW FULL DETAILS ──────────────── */}
      {detailsPersonModal && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 540 }}>
            <div className="wm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={20} color="#2563eb" />
                <h2 className="wm-modal-title">Personnel Profile Details</h2>
              </div>
              <button className="wm-close-btn" onClick={() => setDetailsPersonModal(null)}>×</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                paddingBottom: 16,
                borderBottom: '1px solid #e2e8f0',
                marginBottom: 16
              }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: detailsPersonModal.currentStatus === 'Inside Campus' ? '#dcfce7' : '#eff6ff',
                  color: detailsPersonModal.currentStatus === 'Inside Campus' ? '#15803d' : '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  border: '2px solid #cbd5e1'
                }}>
                  {detailsPersonModal.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{detailsPersonModal.name}</h3>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      background: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: 4,
                      color: '#2563eb',
                      fontSize: '0.82rem'
                    }}>
                      {detailsPersonModal.personId}
                    </span>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: detailsPersonModal.currentStatus === 'Inside Campus' ? '#dcfce7' : '#f1f5f9',
                      color: detailsPersonModal.currentStatus === 'Inside Campus' ? '#15803d' : '#64748b'
                    }}>
                      {detailsPersonModal.currentStatus === 'Inside Campus' ? '🟢 Inside Campus' : '⚪ Outside Campus'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attributes Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                fontSize: '0.84rem',
                marginBottom: 20
              }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Role / Type</span>
                  <strong style={{ color: '#0f172a' }}>{detailsPersonModal.personType || 'Visitor'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Department</span>
                  <strong style={{ color: '#0f172a' }}>{detailsPersonModal.department || 'General'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Designation</span>
                  <strong style={{ color: '#0f172a' }}>{detailsPersonModal.designation || 'Member'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Contact Phone</span>
                  <strong style={{ color: '#0f172a' }}>📞 {detailsPersonModal.phone || 'No phone'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                  <strong style={{ color: '#0f172a' }}>✉️ {detailsPersonModal.email || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Vehicle Number</span>
                  <strong style={{ color: '#0f172a' }}>🚗 {detailsPersonModal.vehicleNumber || 'Pedestrian'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>ID Proof</span>
                  <strong style={{ color: '#0f172a' }}>{detailsPersonModal.idProofType || 'College ID'} {detailsPersonModal.idProofNumber ? `(${detailsPersonModal.idProofNumber})` : ''}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Total Campus Visits</span>
                  <strong style={{ color: '#0f172a' }}>{detailsPersonModal.totalVisits || 0} visits</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Last Entry Time</span>
                  <strong style={{ color: '#0f172a' }}>{detailsPersonModal.lastEntryTime ? formatDateTime(detailsPersonModal.lastEntryTime) : 'None'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Last Exit Time</span>
                  <strong style={{ color: '#0f172a' }}>{detailsPersonModal.lastExitTime ? formatDateTime(detailsPersonModal.lastExitTime) : 'None'}</strong>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => {
                    const p = detailsPersonModal;
                    setDetailsPersonModal(null);
                    setQrPassModal(p);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <QrCode size={15} color="#2563eb" />
                  <span>View QR Code</span>
                </button>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => {
                    const pId = detailsPersonModal.personId;
                    setDetailsPersonModal(null);
                    navigate(`/watchman/qr-verification?id=${encodeURIComponent(pId)}`);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ExternalLink size={15} />
                  <span>Scan in QR Scanner</span>
                </button>
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  onClick={() => setDetailsPersonModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: VIEW QR PASS ──────────────── */}
      {qrPassModal && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 440, textAlign: 'center' }}>
            <div className="wm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={20} color="#2563eb" />
                <h2 className="wm-modal-title">Official Campus QR Pass</h2>
              </div>
              <button className="wm-close-btn" onClick={() => setQrPassModal(null)}>×</button>
            </div>

            <div style={{ padding: '24px 20px' }}>
              <span style={{
                display: 'inline-block',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.74rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 4,
                marginBottom: 6
              }}>
                {qrPassModal.personType || 'Visitor'} Gate Access Pass
              </span>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '1.3rem', color: '#0f172a' }}>{qrPassModal.name}</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
                ID: <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>{qrPassModal.personId}</span> • {qrPassModal.department || 'General'}
              </p>

              <div style={{
                background: '#ffffff',
                padding: 16,
                borderRadius: 12,
                border: '2px solid #e2e8f0',
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}>
                {(() => {
                  const verifyUrl = getGatePassUrl(qrPassModal.personId, qrPassModal.personType);
                  return (
                    <img
                      src={getQrCodeImageUrl(verifyUrl, 260)}
                      alt={`QR Pass for ${qrPassModal.name}`}
                      style={{ width: 220, height: 220, display: 'block' }}
                    />
                  );
                })()}
              </div>

              <div style={{
                marginTop: 14,
                fontSize: '0.76rem',
                color: '#64748b'
              }}>
                Scan using any mobile camera, Google Lens, or Watchman QR Scanner to record Gate In / Out.
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => {
                    const verifyUrl = getGatePassUrl(qrPassModal.personId, qrPassModal.personType);
                    const qrUrl = getQrCodeImageUrl(verifyUrl, 300);
                    const a = document.createElement('a');
                    a.href = qrUrl;
                    a.download = `QR-PASS-${qrPassModal.personId}.png`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} />
                  <span>Download QR</span>
                </button>
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  onClick={() => {
                    const pId = qrPassModal.personId;
                    setQrPassModal(null);
                    navigate(`/watchman/qr-verification?id=${encodeURIComponent(pId)}`);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ExternalLink size={14} />
                  <span>Open Scanner</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusInOutPage;
