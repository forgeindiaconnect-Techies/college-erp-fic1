import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Briefcase,
  ArrowRightCircle,
  ArrowLeftCircle,
  Search,
  PlusCircle,
  Filter,
  RefreshCw,
  Clock,
  Car,
  CheckCircle,
  AlertCircle,
  UserCheck,
  LogIn,
  LogOut,
  Check,
  ChevronDown,
  User
} from 'lucide-react';
import {
  getStaffMovements,
  recordStaffMovement,
  lookupStaffMember,
  getStaffWatchmanDirectory
} from '../../api';
import '../watchman.css';

const StaffRegisterPage = () => {
  const [movements, setMovements] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal lookup and form state
  const [idInput, setIdInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [identifiedStaff, setIdentifiedStaff] = useState(null);
  const [staffStatus, setStaffStatus] = useState('Outside Campus'); // 'Inside Campus' | 'Outside Campus'
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    staffId: '',
    staffName: '',
    department: '',
    designation: '',
    movementType: 'In', // 'In' or 'Out'
    gate: 'Gate 1 (Main Entrance)',
    reason: 'Official College Duty',
    passNumber: '',
    vehicleNumber: '',
    remarks: ''
  });

  // Fetch movements list
  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await getStaffMovements({ search, movementType });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setMovements(list);
    } catch (err) {
      console.error('Failed to load staff movements:', err);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch registered staff directory for instant autocomplete and status
  const fetchDirectory = async () => {
    try {
      const res = await getStaffWatchmanDirectory({ limit: 300 });
      const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      setDirectory(list);
    } catch (err) {
      console.warn('Failed to load staff directory:', err.message);
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchDirectory();
  }, [movementType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMovements();
  };

  // Real-time status map for staff
  const staffStatusMap = useMemo(() => {
    const map = {};
    directory.forEach(s => {
      map[s.id.toUpperCase()] = s.currentStatus === 'Inside Campus' ? 'Inside Campus' : 'Outside Campus';
    });
    // Check latest movement if directory doesn't have it
    movements.forEach(m => {
      const id = (m.staffId || m.personId || '').toUpperCase();
      if (id && !map[id]) {
        map[id] = m.movementType === 'In' || m.direction === 'In' ? 'Inside Campus' : 'Outside Campus';
      }
    });
    return map;
  }, [directory, movements]);

  // Autocomplete suggestions based on idInput
  const filteredStaff = useMemo(() => {
    if (!idInput.trim()) return directory.slice(0, 10);
    const q = idInput.trim().toLowerCase();
    return directory
      .filter(s =>
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.designation && s.designation.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [idInput, directory]);

  // Open modal with pre-cleared form
  const handleOpenModal = () => {
    setError('');
    setIdInput('');
    setIdentifiedStaff(null);
    setStaffStatus('Outside Campus');
    setShowDropdown(false);
    setFormData({
      staffId: '',
      staffName: '',
      department: '',
      designation: '',
      movementType: 'In',
      gate: 'Gate 1 (Main Entrance)',
      reason: 'Official College Duty',
      passNumber: '',
      vehicleNumber: '',
      remarks: ''
    });
    setShowModal(true);
  };

  // Quick 1-click action from the movement table row
  const handleQuickAction = async (staffId, preferredDir) => {
    handleOpenModal();
    selectStaffById(staffId, preferredDir);
  };

  // Select staff and auto-fill details + enforce next valid movement
  const selectStaffById = async (searchCode, overrideDir = null) => {
    if (!searchCode) return;
    try {
      setLookingUp(true);
      setError('');
      setShowDropdown(false);
      setIdInput(searchCode);

      // Check directory first for snappy UI
      const matchedLocal = directory.find(s =>
        (s.id && s.id.toLowerCase() === searchCode.toLowerCase()) ||
        (s.name && s.name.toLowerCase() === searchCode.toLowerCase())
      );

      const res = await lookupStaffMember(searchCode);
      const staff = res.data?.staff;
      const currentStatus = res.data?.currentStatus || (matchedLocal ? matchedLocal.currentStatus : 'Outside Campus');
      const isInside = currentStatus === 'Inside Campus';

      if (staff) {
        setIdentifiedStaff(staff);
        setStaffStatus(currentStatus);

        // Enforce valid movement: if inside campus -> MUST be Out; if outside -> MUST be In
        const nextMovement = overrideDir || (isInside ? 'Out' : 'In');

        setFormData(prev => ({
          ...prev,
          staffId: staff.id,
          staffName: staff.name,
          department: staff.department || 'General',
          designation: staff.designation || 'Faculty / Staff',
          movementType: nextMovement,
          reason: nextMovement === 'Out' ? 'Campus Departure / Shift End' : 'Official College Duty'
        }));
      }
    } catch (err) {
      const matched = directory.find(s => s.id?.toLowerCase() === searchCode.toLowerCase());
      if (matched) {
        setIdentifiedStaff(matched);
        const isInside = matched.currentStatus === 'Inside Campus';
        setStaffStatus(matched.currentStatus);
        setFormData(prev => ({
          ...prev,
          staffId: matched.id,
          staffName: matched.name,
          department: matched.department || 'General',
          designation: matched.designation || 'Staff',
          movementType: overrideDir || (isInside ? 'Out' : 'In')
        }));
      } else {
        // Brand new staff being registered for the first time
        setIdentifiedStaff(null);
        setStaffStatus('Outside Campus');
        setFormData(prev => ({
          ...prev,
          staffId: searchCode.toUpperCase(),
          staffName: '',
          department: '',
          designation: '',
          movementType: 'In'
        }));
        setError('Staff member not found in directory. Enter name & department once to register and log their first entry.');
      }
    } finally {
      setLookingUp(false);
    }
  };

  const handleIdInputBlurOrSubmit = () => {
    if (idInput.trim() && (!identifiedStaff || identifiedStaff.id !== idInput.trim())) {
      selectStaffById(idInput.trim());
    }
  };

  // Submit Movement Record
  const handleCreate = async (e) => {
    e.preventDefault();
    const staffId = formData.staffId.trim();
    const staffName = formData.staffName.trim();

    if (!staffId || !staffName) {
      setError('Staff ID / Employee Code and Staff Name are required.');
      return;
    }

    // Client-side guard for movement validity
    const isInside = staffStatus === 'Inside Campus';
    if (formData.movementType === 'In' && isInside) {
      setError(`Movement Blocked: ${staffName} is currently marked Inside Campus. You must record Campus Out before entering again.`);
      return;
    }
    if (formData.movementType === 'Out' && !isInside && identifiedStaff) {
      setError(`Movement Blocked: ${staffName} has no active campus entry record. Cannot record exit without a previous entry.`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await recordStaffMovement(formData);
      const isExit = formData.movementType === 'Out';

      setSuccess(`Staff ${isExit ? 'Campus Out (Exit)' : 'Campus In (Entry)'} successfully logged for ${staffName} (${staffId})!`);
      setShowModal(false);

      fetchMovements();
      fetchDirectory();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to log staff movement.');
    } finally {
      setSubmitting(false);
    }
  };

  // Summary counts
  const totalLogged = movements.length;
  const totalEntries = movements.filter(m => m.movementType === 'In' || m.direction === 'In').length;
  const totalExits = movements.filter(m => m.movementType === 'Out' || m.direction === 'Out').length;
  const insideNow = directory.filter(d => d.currentStatus === 'Inside Campus').length;

  return (
    <div className="wm-page">
      {/* Page Header */}
      <div className="wm-header">
        <div>
          <h1 className="wm-title">
            <Briefcase size={24} style={{ color: '#2563eb' }} />
            Staff & Faculty Movement Register
          </h1>
          <p className="wm-subtitle">
            Permanent staff identification by Employee ID • Automatic In/Out tracking & duration records
          </p>
        </div>
        <div className="wm-header-actions">
          <button className="wm-btn wm-btn-primary" onClick={handleOpenModal}>
            <PlusCircle size={18} />
            Log Staff Movement
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {success && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '14px 18px',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.92rem',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1)'
        }}>
          <CheckCircle size={20} color="#10b981" />
          <span>{success}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <div className="wm-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Movements</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>{totalLogged}</div>
          </div>
        </div>

        <div className="wm-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Staff On Campus Now</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669' }}>{insideNow}</div>
          </div>
        </div>

        <div className="wm-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <LogIn size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Arrivals Logged (In)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a' }}>{totalEntries}</div>
          </div>
        </div>

        <div className="wm-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <LogOut size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Departures Logged (Out)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d97706' }}>{totalExits}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="wm-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: '1 1 320px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="wm-input"
                style={{ paddingLeft: 38 }}
                placeholder="Search staff name, employee ID, or vehicle number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="wm-btn wm-btn-secondary">
              Search
            </button>
          </form>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Filter size={16} color="#64748b" />
            <select
              className="wm-select"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              style={{ width: 150 }}
            >
              <option value="">All Movements</option>
              <option value="In">Campus In (Arrival)</option>
              <option value="Out">Campus Out (Departure)</option>
            </select>
            <button className="wm-btn wm-btn-secondary" onClick={() => { fetchMovements(); fetchDirectory(); }} title="Refresh Records">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Movement History Table */}
      <div className="wm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="wm-table-container">
          <table className="wm-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Employee ID</th>
                <th>Department & Role</th>
                <th>Movement</th>
                <th>Reason & Vehicle</th>
                <th>Date, Time & Gate</th>
                <th>Verified By</th>
                <th style={{ textAlign: 'right' }}>Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <p>Loading staff movement logs...</p>
                  </td>
                </tr>
              ) : (!Array.isArray(movements) || movements.length === 0) ? (
                <tr>
                  <td colSpan="8">
                    <div className="wm-empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <Briefcase size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                      <div className="wm-empty-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>
                        No staff movement records found
                      </div>
                      <p className="wm-empty-desc" style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 16px' }}>
                        Click "Log Staff Movement" above to record campus entries and exits.
                      </p>
                      <button className="wm-btn wm-btn-primary" onClick={handleOpenModal}>
                        <PlusCircle size={16} /> Log First Movement
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                movements.map((item) => {
                  const stId = (item.staffId || item.personId || '').toUpperCase();
                  const currentPresence = staffStatusMap[stId] || (item.movementType === 'In' || item.direction === 'In' ? 'Inside Campus' : 'Outside Campus');
                  const isCurrentlyInside = currentPresence === 'Inside Campus';
                  const isExit = item.movementType === 'Out' || item.direction === 'Out';

                  return (
                    <tr key={item._id || item.movementId}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {item.staffName || item.name}
                        </div>
                        {item.designation && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.designation}</span>}
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#1e293b',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.84rem'
                        }}>
                          {item.staffId || item.personId}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                          {item.department || 'General'}
                        </div>
                      </td>
                      <td>
                        {isExit ? (
                          <span className="wm-badge wm-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                            <ArrowRightCircle size={13} />
                            Campus Out
                          </span>
                        ) : (
                          <span className="wm-badge wm-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                            <ArrowLeftCircle size={13} />
                            Campus In
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                          {item.reason || 'Official College Duty'}
                        </div>
                        {item.vehicleNumber && (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Car size={12} /> {item.vehicleNumber}
                          </div>
                        )}
                        {item.durationFormatted && isExit && (
                          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                            ⏱ On campus: {item.durationFormatted}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(item.timestamp).toLocaleDateString()} • {item.gate || 'Gate 1'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
                          {item.watchmanName || 'Security Guard'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isCurrentlyInside ? (
                          <button
                            type="button"
                            className="wm-btn wm-btn-warning"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              borderRadius: 6
                            }}
                            title="Staff member is currently inside campus. Record Campus Out."
                            onClick={() => handleQuickAction(stId, 'Out')}
                          >
                            <LogOut size={13} /> Log Campus Out
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="wm-btn wm-btn-success"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              borderRadius: 6,
                              background: '#10b981',
                              color: '#fff'
                            }}
                            title="Staff member is currently outside campus. Record Campus In."
                            onClick={() => handleQuickAction(stId, 'In')}
                          >
                            <LogIn size={13} /> Log Campus In
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Staff Movement Modal */}
      {showModal && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 540 }}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={20} color="#2563eb" />
                Log Staff Campus Movement
              </h2>
              <button className="wm-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px 24px' }}>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '12px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: '0.86rem',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>{error}</div>
                </div>
              )}

              {/* Step 1: Staff ID / Employee Code Lookup with suggestions */}
              <div className="wm-form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                <label className="wm-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Identify Staff by Employee ID / Name *</span>
                  {lookingUp && <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>Verifying...</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="Enter Employee ID (e.g. STF001, EMP-1042)..."
                    value={idInput}
                    onChange={(e) => {
                      setIdInput(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleIdInputBlurOrSubmit();
                      }
                    }}
                    style={{ paddingRight: 80 }}
                  />
                  <button
                    type="button"
                    className="wm-btn wm-btn-secondary"
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      bottom: 4,
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}
                    onClick={handleIdInputBlurOrSubmit}
                  >
                    Find
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && filteredStaff.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    marginTop: 4,
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    maxHeight: 220,
                    overflowY: 'auto'
                  }}>
                    <div style={{ padding: '6px 12px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      REGISTERED STAFF MEMBERS ({filteredStaff.length})
                    </div>
                    {filteredStaff.map(s => {
                      const isInside = s.currentStatus === 'Inside Campus';
                      return (
                        <div
                          key={s.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                          onClick={() => selectStaffById(s.id)}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.id}</span> • {s.department || 'General'}
                              {s.designation ? ` (${s.designation})` : ''}
                            </div>
                          </div>
                          <div>
                            {isInside ? (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '2px 8px',
                                borderRadius: 12
                              }}>
                                Inside Campus
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: 12
                              }}>
                                Outside
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Identified Staff Auto-fill Card */}
              {identifiedStaff && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                        {identifiedStaff.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                        ID: <strong style={{ fontFamily: 'monospace' }}>{identifiedStaff.id}</strong> • Dept: {identifiedStaff.department || 'General'}
                        {identifiedStaff.designation ? ` • Role: ${identifiedStaff.designation}` : ''}
                      </div>
                    </div>
                    <div>
                      {staffStatus === 'Inside Campus' ? (
                        <span className="wm-badge wm-badge-success" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                          🟢 Currently Inside Campus
                        </span>
                      ) : (
                        <span className="wm-badge" style={{ fontWeight: 700, fontSize: '0.78rem', background: '#f1f5f9', color: '#475569' }}>
                          ⚪ Currently Outside Campus
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Name & Department if registering new staff */}
              {!identifiedStaff && idInput.trim() && (
                <div className="wm-grid-2" style={{ gap: 12, marginBottom: 14 }}>
                  <div className="wm-form-group">
                    <label className="wm-label">Staff Full Name *</label>
                    <input
                      type="text"
                      required
                      className="wm-input"
                      placeholder="e.g. Dr. Robert Vance"
                      value={formData.staffName}
                      onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                    />
                  </div>
                  <div className="wm-form-group">
                    <label className="wm-label">Department *</label>
                    <input
                      type="text"
                      required
                      className="wm-input"
                      placeholder="e.g. Mechanical Engg"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Movement Type: Strict In / Out Validation & Next Action Selection */}
              <div className="wm-form-group" style={{ marginBottom: 16 }}>
                <label className="wm-label" style={{ fontWeight: 700 }}>Movement Action *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Option: Campus In (Arrival) */}
                  <label
                    style={{
                      border: formData.movementType === 'In' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: formData.movementType === 'In' ? '#ecfdf5' : (staffStatus === 'Inside Campus' ? '#f8fafc' : '#ffffff'),
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: staffStatus === 'Inside Campus' ? 'not-allowed' : 'pointer',
                      opacity: staffStatus === 'Inside Campus' ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.15s'
                    }}
                  >
                    <input
                      type="radio"
                      name="movementType"
                      value="In"
                      disabled={staffStatus === 'Inside Campus'}
                      checked={formData.movementType === 'In'}
                      onChange={() => setFormData({ ...formData, movementType: 'In' })}
                      style={{ accentColor: '#10b981' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <LogIn size={15} /> Campus In (Arrival)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#047857' }}>Staff entering campus</div>
                    </div>
                  </label>

                  {/* Option: Campus Out (Departure) */}
                  <label
                    style={{
                      border: formData.movementType === 'Out' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      background: formData.movementType === 'Out' ? '#fffbeb' : (staffStatus !== 'Inside Campus' && identifiedStaff ? '#f8fafc' : '#ffffff'),
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: staffStatus !== 'Inside Campus' && identifiedStaff ? 'not-allowed' : 'pointer',
                      opacity: staffStatus !== 'Inside Campus' && identifiedStaff ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.15s'
                    }}
                  >
                    <input
                      type="radio"
                      name="movementType"
                      value="Out"
                      disabled={staffStatus !== 'Inside Campus' && Boolean(identifiedStaff)}
                      checked={formData.movementType === 'Out'}
                      onChange={() => setFormData({ ...formData, movementType: 'Out' })}
                      style={{ accentColor: '#f59e0b' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <LogOut size={15} /> Campus Out (Departure)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b45309' }}>Staff leaving campus</div>
                    </div>
                  </label>
                </div>

                {/* Helpful Validation Guide Badge */}
                {staffStatus === 'Inside Campus' ? (
                  <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertCircle size={13} />
                    <span>Staff is currently inside campus. Only <strong>Campus Out (Departure)</strong> can be recorded.</span>
                  </div>
                ) : (
                  identifiedStaff && (
                    <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Check size={13} />
                      <span>Staff is currently outside campus. <strong>Campus In (Arrival)</strong> is ready to record.</span>
                    </div>
                  )
                )}
              </div>

              {/* Movement Details */}
              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Security Gate *</label>
                  <select
                    className="wm-select"
                    value={formData.gate}
                    onChange={(e) => setFormData({ ...formData, gate: e.target.value })}
                  >
                    <option value="Gate 1 (Main Entrance)">Gate 1 (Main Entrance)</option>
                    <option value="Gate 2 (Hostel & Sports)">Gate 2 (Hostel & Sports)</option>
                    <option value="Gate 3 (Back Exit & Transport)">Gate 3 (Back Exit & Transport)</option>
                    <option value="Gate 4 (Service & Delivery)">Gate 4 (Service & Delivery)</option>
                  </select>
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Reason for Movement *</label>
                  <select
                    className="wm-select"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  >
                    <option value="Official College Duty">Official College Duty</option>
                    <option value="Shift Completion / Departure">Shift Completion / Departure</option>
                    <option value="Lunch / Temporary Break">Lunch / Temporary Break</option>
                    <option value="University / External Meeting">University / External Meeting</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Personal Permission">Personal Permission</option>
                  </select>
                </div>
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Vehicle Number (If any)</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. TN-38-BZ-4521"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Gate Pass / Duty Note (Optional)</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. DP-1049"
                    value={formData.passNumber}
                    onChange={(e) => setFormData({ ...formData, passNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-label">Security Remarks (Optional)</label>
                <input
                  type="text"
                  className="wm-input"
                  placeholder="Additional security notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn wm-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Recording Movement...' : (
                    formData.movementType === 'Out' ? 'Confirm Campus Out (Departure)' : 'Confirm Campus In (Arrival)'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRegisterPage;
