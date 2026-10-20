import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GraduationCap,
  ArrowRightCircle,
  ArrowLeftCircle,
  Search,
  PlusCircle,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  LogIn,
  LogOut,
  MapPin,
  Calendar,
  User,
  Check,
  ChevronDown,
  X
} from 'lucide-react';
import { getStudentMovements, recordStudentMovement, lookupStudentQr, getStudentQrDirectory } from '../../api';
import '../watchman.css';

const StudentRegisterPage = () => {
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
  const [identifiedStudent, setIdentifiedStudent] = useState(null);
  const [studentStatus, setStudentStatus] = useState('Outside Campus'); // 'Inside Campus' | 'Outside Campus'
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    department: '',
    semester: '',
    movementType: 'In', // 'In' or 'Out'
    gate: 'Gate 1 (Main Entrance)',
    reason: 'Regular Daily Class / Lab',
    gatePassNumber: '',
    vehicleNumber: '',
    remarks: ''
  });

  // Fetch movements list
  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await getStudentMovements({ search, movementType });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setMovements(list);
    } catch (err) {
      console.error('Failed to load student movements:', err);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch registered student directory for autocomplete and instant status lookup
  const fetchDirectory = async () => {
    try {
      const res = await getStudentQrDirectory({ limit: 400 });
      const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      setDirectory(list);
    } catch (err) {
      console.warn('Failed to load student directory:', err.message);
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

  // Build a real-time status map for students from directory and movements
  const studentStatusMap = useMemo(() => {
    const map = {};
    directory.forEach(s => {
      map[s.id.toUpperCase()] = s.currentStatus === 'Inside Campus' ? 'Inside Campus' : 'Outside Campus';
    });
    // Check latest movement if directory doesn't have it
    movements.forEach(m => {
      const id = (m.studentId || m.personId || '').toUpperCase();
      if (id && !map[id]) {
        map[id] = m.movementType === 'In' || m.direction === 'In' ? 'Inside Campus' : 'Outside Campus';
      }
    });
    return map;
  }, [directory, movements]);

  // Autocomplete suggestions based on idInput
  const filteredStudents = useMemo(() => {
    if (!idInput.trim()) return directory.slice(0, 10);
    const q = idInput.trim().toLowerCase();
    return directory
      .filter(s =>
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [idInput, directory]);

  // Open modal with pre-cleared form
  const handleOpenModal = () => {
    setError('');
    setIdInput('');
    setIdentifiedStudent(null);
    setStudentStatus('Outside Campus');
    setShowDropdown(false);
    setFormData({
      studentId: '',
      studentName: '',
      department: '',
      semester: '',
      movementType: 'In',
      gate: 'Gate 1 (Main Entrance)',
      reason: 'Regular Daily Class / Lab',
      gatePassNumber: '',
      vehicleNumber: '',
      remarks: ''
    });
    setShowModal(true);
  };

  // Quick 1-click action from the movement table row
  const handleQuickAction = async (studentId, preferredDir) => {
    handleOpenModal();
    selectStudentById(studentId, preferredDir);
  };

  // Select student and auto-fill details + enforce next valid movement
  const selectStudentById = async (searchCode, overrideDir = null) => {
    if (!searchCode) return;
    try {
      setLookingUp(true);
      setError('');
      setShowDropdown(false);
      setIdInput(searchCode);

      // Check in directory first for immediate snappy UI response
      const matchedLocal = directory.find(s =>
        (s.id && s.id.toLowerCase() === searchCode.toLowerCase()) ||
        (s.name && s.name.toLowerCase() === searchCode.toLowerCase())
      );

      // Call backend lookup for authoritative check-in state
      const res = await lookupStudentQr(searchCode);
      const student = res.data?.student;
      const currentStatus = res.data?.currentStatus || (matchedLocal ? matchedLocal.currentStatus : 'Outside Campus');
      const isInside = currentStatus === 'Inside Campus';

      if (student) {
        setIdentifiedStudent(student);
        setStudentStatus(currentStatus);

        // Enforce valid movement: if inside campus -> MUST be Out; if outside -> MUST be In
        const nextMovement = overrideDir || (isInside ? 'Out' : 'In');

        setFormData(prev => ({
          ...prev,
          studentId: student.id,
          studentName: student.name,
          department: student.department || 'General',
          semester: student.semester || '',
          movementType: nextMovement,
          reason: nextMovement === 'Out' ? 'Campus Exit / Day Scholar Outing' : 'Regular Daily Class / Lab'
        }));
      }
    } catch (err) {
      // If not in Student DB, check if local directory or movement records have this student
      const matched = directory.find(s => s.id?.toLowerCase() === searchCode.toLowerCase());
      if (matched) {
        setIdentifiedStudent(matched);
        const isInside = matched.currentStatus === 'Inside Campus';
        setStudentStatus(matched.currentStatus);
        setFormData(prev => ({
          ...prev,
          studentId: matched.id,
          studentName: matched.name,
          department: matched.department || 'General',
          semester: matched.semester || '',
          movementType: overrideDir || (isInside ? 'Out' : 'In')
        }));
      } else {
        // Brand new student being registered for the first time
        setIdentifiedStudent(null);
        setStudentStatus('Outside Campus');
        setFormData(prev => ({
          ...prev,
          studentId: searchCode.toUpperCase(),
          studentName: '',
          department: '',
          semester: '',
          movementType: 'In'
        }));
        setError('Student not found in registry. Enter name & department once to register and log their first entry.');
      }
    } finally {
      setLookingUp(false);
    }
  };

  const handleIdInputBlurOrSubmit = () => {
    if (idInput.trim() && (!identifiedStudent || identifiedStudent.id !== idInput.trim())) {
      selectStudentById(idInput.trim());
    }
  };

  // Submit Movement Record
  const handleCreate = async (e) => {
    e.preventDefault();
    const studentId = formData.studentId.trim();
    const studentName = formData.studentName.trim();

    if (!studentId || !studentName) {
      setError('Student ID / Roll Number and Student Name are required.');
      return;
    }

    // Client-side guard for movement validity
    const isInside = studentStatus === 'Inside Campus';
    if (formData.movementType === 'In' && isInside) {
      setError(`Movement Blocked: ${studentName} is currently marked Inside Campus. You must record Campus Exit (Out) before entering again.`);
      return;
    }
    if (formData.movementType === 'Out' && !isInside && identifiedStudent) {
      setError(`Movement Blocked: ${studentName} has no active campus entry record. Cannot record exit without a previous entry.`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await recordStudentMovement(formData);
      const isExit = formData.movementType === 'Out';

      setSuccess(`Student ${isExit ? 'Campus Exit (Out)' : 'Campus Entry (In)'} successfully logged for ${studentName} (${studentId})!`);
      setShowModal(false);

      // Refresh list & directory to update live status
      fetchMovements();
      fetchDirectory();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to log student movement.');
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
            <GraduationCap size={24} style={{ color: '#2563eb' }} />
            Student In / Out Movement Register
          </h1>
          <p className="wm-subtitle">
            Permanent student identification via Roll Number / Student ID • Enforce strict In/Out cycles
          </p>
        </div>
        <div className="wm-header-actions">
          <button className="wm-btn wm-btn-primary" onClick={handleOpenModal}>
            <PlusCircle size={18} />
            Log Student Movement
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
            <GraduationCap size={22} />
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
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Inside Campus Now</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669' }}>{insideNow}</div>
          </div>
        </div>

        <div className="wm-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <LogIn size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Entries Logged (In)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a' }}>{totalEntries}</div>
          </div>
        </div>

        <div className="wm-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <LogOut size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Exits Logged (Out)</div>
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
                placeholder="Search by student name, roll number, or gate pass..."
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
              <option value="In">Campus In (Entry)</option>
              <option value="Out">Campus Out (Exit)</option>
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
                <th>Student</th>
                <th>Roll No / ID</th>
                <th>Movement</th>
                <th>Reason & Gate Pass</th>
                <th>Date, Time & Gate</th>
                <th>Verified By</th>
                <th style={{ textAlign: 'right' }}>Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <p>Loading student movement logs...</p>
                  </td>
                </tr>
              ) : (!Array.isArray(movements) || movements.length === 0) ? (
                <tr>
                  <td colSpan="7">
                    <div className="wm-empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <GraduationCap size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                      <div className="wm-empty-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>
                        No student movement records found
                      </div>
                      <p className="wm-empty-desc" style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 16px' }}>
                        Click "Log Student Movement" above to record campus entries and exits.
                      </p>
                      <button className="wm-btn wm-btn-primary" onClick={handleOpenModal}>
                        <PlusCircle size={16} /> Log First Movement
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                movements.map((item) => {
                  const sId = (item.studentId || item.personId || '').toUpperCase();
                  const currentPresence = studentStatusMap[sId] || (item.movementType === 'In' || item.direction === 'In' ? 'Inside Campus' : 'Outside Campus');
                  const isCurrentlyInside = currentPresence === 'Inside Campus';
                  const isExit = item.movementType === 'Out' || item.direction === 'Out';

                  return (
                    <tr key={item._id || item.movementId}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.studentName || item.name}
                        </div>
                        {item.semester && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sem: {item.semester}</span>}
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
                          {item.studentId || item.personId}
                        </span>
                      </td>

                      <td>
                        {isExit ? (
                          <span className="wm-badge wm-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                            <ArrowRightCircle size={13} />
                            Campus Exit (Out)
                          </span>
                        ) : (
                          <span className="wm-badge wm-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                            <ArrowLeftCircle size={13} />
                            Campus Entry (In)
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                          {item.reason || 'Regular Permission'}
                        </div>
                        {item.gatePassNumber && (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                            Pass #: {item.gatePassNumber}
                          </div>
                        )}
                        {item.vehicleNumber && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Veh: {item.vehicleNumber}
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
                          {item.watchmanName || item.recordedBy || 'Security Guard'}
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
                            title="Student is currently inside campus. Record Exit (Out)."
                            onClick={() => handleQuickAction(sId, 'Out')}
                          >
                            <LogOut size={13} /> Log Exit (Out)
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
                            title="Student is currently outside campus. Record Entry (In)."
                            onClick={() => handleQuickAction(sId, 'In')}
                          >
                            <LogIn size={13} /> Log Entry (In)
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

      {/* Log Student Movement Modal */}
      {showModal && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 540 }}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GraduationCap size={20} color="#2563eb" />
                Log Student Campus Movement
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

              {/* Step 1: Student ID / Roll Number Lookup with suggestions */}
              <div className="wm-form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                <label className="wm-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Identify Student by Roll No or Student ID *</span>
                  {lookingUp && <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>Verifying...</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="Enter Roll No / Student ID (e.g., 21CS042)..."
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
                {showDropdown && filteredStudents.length > 0 && (
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
                      REGISTERED STUDENTS ({filteredStudents.length})
                    </div>
                    {filteredStudents.map(s => {
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
                          onClick={() => selectStudentById(s.id)}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.id}</span> • {s.department || 'General'}
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

              {/* Identified Student Auto-fill Card */}
              {identifiedStudent && (
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
                        {identifiedStudent.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                        Roll No: <strong style={{ fontFamily: 'monospace' }}>{identifiedStudent.id}</strong> • Dept: {identifiedStudent.department || 'General'}
                        {identifiedStudent.semester ? ` • Sem: ${identifiedStudent.semester}` : ''}
                      </div>
                    </div>
                    <div>
                      {studentStatus === 'Inside Campus' ? (
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

              {/* Editable Name if registering new student */}
              {!identifiedStudent && idInput.trim() && (
                <div className="wm-form-group" style={{ marginBottom: 14 }}>
                  <label className="wm-label">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="e.g. John Doe"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value, department: 'General' })}
                  />
                </div>
              )}

              {/* Movement Type: Strict In / Out Validation & Next Action Selection */}
              <div className="wm-form-group" style={{ marginBottom: 16 }}>
                <label className="wm-label" style={{ fontWeight: 700 }}>Movement Action *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Option: Campus Entry (In) */}
                  <label
                    style={{
                      border: formData.movementType === 'In' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: formData.movementType === 'In' ? '#ecfdf5' : (studentStatus === 'Inside Campus' ? '#f8fafc' : '#ffffff'),
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: studentStatus === 'Inside Campus' ? 'not-allowed' : 'pointer',
                      opacity: studentStatus === 'Inside Campus' ? 0.5 : 1,
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
                      disabled={studentStatus === 'Inside Campus'}
                      checked={formData.movementType === 'In'}
                      onChange={() => setFormData({ ...formData, movementType: 'In' })}
                      style={{ accentColor: '#10b981' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <LogIn size={15} /> Entry Campus (In)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#047857' }}>Student entering campus</div>
                    </div>
                  </label>

                  {/* Option: Campus Exit (Out) */}
                  <label
                    style={{
                      border: formData.movementType === 'Out' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      background: formData.movementType === 'Out' ? '#fffbeb' : (studentStatus !== 'Inside Campus' && identifiedStudent ? '#f8fafc' : '#ffffff'),
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: studentStatus !== 'Inside Campus' && identifiedStudent ? 'not-allowed' : 'pointer',
                      opacity: studentStatus !== 'Inside Campus' && identifiedStudent ? 0.5 : 1,
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
                      disabled={studentStatus !== 'Inside Campus' && Boolean(identifiedStudent)}
                      checked={formData.movementType === 'Out'}
                      onChange={() => setFormData({ ...formData, movementType: 'Out' })}
                      style={{ accentColor: '#f59e0b' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <LogOut size={15} /> Exit Campus (Out)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b45309' }}>Student leaving campus</div>
                    </div>
                  </label>
                </div>

                {/* Helpful Validation Guide Badge */}
                {studentStatus === 'Inside Campus' ? (
                  <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertCircle size={13} />
                    <span>Student is currently on campus. Only <strong>Campus Exit (Out)</strong> can be recorded.</span>
                  </div>
                ) : (
                  identifiedStudent && (
                    <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Check size={13} />
                      <span>Student is currently outside campus. <strong>Campus Entry (In)</strong> is ready to record.</span>
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
                    <option value="Regular Daily Class / Lab">Regular Daily Class / Lab</option>
                    <option value="Official Permission / Outing">Official Permission / Outing</option>
                    <option value="Day Scholar Exit">Day Scholar Exit</option>
                    <option value="Hostel Permission Pass">Hostel Permission Pass</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Library / Sports Activity">Library / Sports Activity</option>
                    <option value="Personal Permission">Personal Permission</option>
                  </select>
                </div>
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Gate Pass No / Reference (If any)</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. GP-9942"
                    value={formData.gatePassNumber}
                    onChange={(e) => setFormData({ ...formData, gatePassNumber: e.target.value })}
                  />
                </div>
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
                    formData.movementType === 'Out' ? 'Confirm Campus Exit (Out)' : 'Confirm Campus Entry (In)'
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

export default StudentRegisterPage;
