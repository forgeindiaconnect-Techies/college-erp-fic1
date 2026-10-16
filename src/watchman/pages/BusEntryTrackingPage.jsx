import React, { useState, useEffect, useCallback } from 'react';
import {
  Bus, Search, RefreshCw, CheckCircle2, Clock, MapPin,
  Phone, User, ShieldCheck, ArrowRightCircle, LogOut as ExitIcon,
  AlertCircle, Building2, Calendar, FileText, ChevronRight, Check
} from 'lucide-react';
import { getCollegeBuses, recordBusEntry, recordBusExit, getBusTrackingStats } from '../../api/index';
import useRealtimeSync, { emitERPDataUpdate } from '../../hooks/useRealtimeSync';
import '../watchman.css';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const BusEntryTrackingPage = () => {
  const [buses, setBuses] = useState([]);
  const [stats, setStats] = useState({
    totalRegistered: 0,
    insideCampus: 0,
    departedToday: 0,
    notArrivedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Not Arrived' | 'Arrived' | 'Departed'
  const [selectedGate, setSelectedGate] = useState(GATES[0]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get Watchman session details
  const getWatchmanSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('watchman_session') || '{}');
    } catch (e) {
      return {};
    }
  };
  const session = getWatchmanSession();
  const watchmanName = session?.name || 'Gate Security Officer';
  const assignedGate = session?.assignedGate || GATES[0];

  useEffect(() => {
    if (assignedGate && GATES.includes(assignedGate)) {
      setSelectedGate(assignedGate);
    }
  }, [assignedGate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // Fetch registered buses with live today statuses
  const fetchBusesData = useCallback(async () => {
    try {
      setLoading(true);
      const [busesRes, statsRes] = await Promise.allSettled([
        getCollegeBuses(),
        getBusTrackingStats()
      ]);

      if (busesRes.status === 'fulfilled' && busesRes.value?.data?.data) {
        setBuses(busesRes.value.data.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        setStats(statsRes.value.data.data);
      }
    } catch (err) {
      console.error('Error fetching buses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization
  useRealtimeSync(fetchBusesData, ['buses', 'bus_tracking', 'busTrackingUpdated']);

  useEffect(() => {
    fetchBusesData();
  }, [fetchBusesData]);

  // Handle Watchman clicking "Entry"
  const handleRecordEntry = async (bus) => {
    try {
      setActionLoadingId(bus._id);
      const res = await recordBusEntry(bus._id, {
        gate: selectedGate,
        watchmanName,
        notes: `Entry logged via Watchman Gate Terminal by ${watchmanName}`
      });

      if (res.data?.success) {
        showToast(`✅ Entry recorded for Bus ${bus.busNumber}! Status changed to Arrived.`);
        emitERPDataUpdate(['buses', 'bus_tracking'], 'entry', res.data.data);
        await fetchBusesData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record bus entry', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Watchman clicking "Exit"
  const handleRecordExit = async (bus) => {
    try {
      setActionLoadingId(bus._id);
      const res = await recordBusExit(bus._id, {
        gate: selectedGate,
        watchmanName,
        notes: `Departure logged via Watchman Gate Terminal by ${watchmanName}`
      });

      if (res.data?.success) {
        showToast(`↗ Departure recorded for Bus ${bus.busNumber}! Status changed to Departed.`);
        emitERPDataUpdate(['buses', 'bus_tracking'], 'exit', res.data.data);
        await fetchBusesData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record bus exit', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered bus list
  const filteredBuses = buses.filter(bus => {
    const matchesSearch =
      bus.busNumber?.toLowerCase().includes(search.toLowerCase()) ||
      bus.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
      bus.driverName?.toLowerCase().includes(search.toLowerCase()) ||
      bus.route?.toLowerCase().includes(search.toLowerCase()) ||
      bus.contactNumber?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'Not Arrived') return bus.currentStatus === 'Not Arrived';
    if (statusFilter === 'Arrived') return bus.currentStatus === 'Arrived';
    if (statusFilter === 'Departed') return bus.currentStatus === 'Departed';

    return true;
  });

  return (
    <div className="wmn-page-container">
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="wmn-page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              padding: '6px',
              borderRadius: '8px',
              display: 'inline-flex'
            }}>
              <Bus size={22} />
            </span>
            <h1 className="wmn-page-title" style={{ margin: 0 }}>College Bus Entry & Exit Tracking</h1>
          </div>
          <p className="wmn-page-subtitle" style={{ margin: 0 }}>
            Live gate tracking system. Record bus arrivals and departures with instantaneous server timestamps.
          </p>
        </div>

        {/* Live Gate & Time Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Active Gate Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            color: 'var(--text-main, #334155)',
            fontWeight: 600
          }}>
            <MapPin size={15} style={{ color: '#2563eb' }} />
            <span>Gate:</span>
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                color: 'var(--text-main, #1e293b)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {GATES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Live Digital Clock */}
          <div style={{
            background: '#0f172a',
            color: '#38bdf8',
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: '0.92rem',
            padding: '7px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={16} />
            <span>{currentTime.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchBusesData}
            style={{
              background: 'var(--bg-muted, #f1f5f9)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              color: 'var(--text-main, #334155)',
              padding: '7px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px',
        marginBottom: '1.25rem'
      }}>
        {/* Total Registered Buses */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Total Registered Fleet</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main, #1e293b)' }}>
              {stats.totalRegistered || buses.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Assigned college buses</div>
          </div>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#475569',
            padding: '10px',
            borderRadius: '10px'
          }}>
            <Bus size={22} />
          </div>
        </div>

        {/* Arrived & Inside Campus */}
        <div style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#a7f3d0', fontWeight: 600 }}>Inside Campus (Arrived)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              {stats.insideCampus}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d1fae5', marginTop: '2px' }}>Currently at parking / bay</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '10px',
            borderRadius: '10px'
          }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Departed Today */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#bfdbfe', fontWeight: 600 }}>Departed Today</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              {stats.departedToday}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#dbeafe', marginTop: '2px' }}>Left campus safely</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '10px',
            borderRadius: '10px'
          }}>
            <ExitIcon size={22} />
          </div>
        </div>

        {/* Not Arrived Today */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Not Yet Arrived</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706' }}>
              {stats.notArrivedToday}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '2px' }}>Awaiting morning entry</div>
          </div>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#d97706',
            padding: '10px',
            borderRadius: '10px'
          }}>
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'All', label: 'All Registered Buses' },
            { id: 'Not Arrived', label: '⏳ Not Arrived' },
            { id: 'Arrived', label: '🟢 Inside Campus (Arrived)' },
            { id: 'Departed', label: '↗ Departed' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: statusFilter === tab.id ? '#1e293b' : 'var(--bg-muted, #f1f5f9)',
                color: statusFilter === tab.id ? '#ffffff' : 'var(--text-main, #475569)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by bus number, driver, route, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-input, #f8fafc)',
              color: 'var(--text-main, #1e293b)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Bus Grid / Cards for Mobile & Table for Desktop */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        {loading && buses.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563eb' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Loading registered college buses...</p>
          </div>
        ) : filteredBuses.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <Bus size={42} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
            <h3 style={{ margin: '0 0 6px', color: 'var(--text-main, #1e293b)' }}>No college buses found</h3>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>
              {search ? 'Try clearing the search query or changing the status filter.' : 'No buses are currently registered in the system.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{
                  background: 'var(--bg-muted, #f8fafc)',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-muted, #64748b)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <th style={{ padding: '12px 16px' }}>Bus Details</th>
                  <th style={{ padding: '12px 16px' }}>Owner & College</th>
                  <th style={{ padding: '12px 16px' }}>Driver & Contact</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Route</th>
                  <th style={{ padding: '12px 16px' }}>Today's Gate Status</th>
                  <th style={{ padding: '12px 16px' }}>Timestamps & Duration</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Gate Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuses.map((bus) => {
                  const isArrived = bus.currentStatus === 'Arrived';
                  const isDeparted = bus.currentStatus === 'Departed';
                  const isNotArrived = bus.currentStatus === 'Not Arrived';
                  const isActionLoading = actionLoadingId === bus._id;

                  return (
                    <tr
                      key={bus._id}
                      style={{
                        borderBottom: '1px solid var(--border-color, #f1f5f9)',
                        transition: 'background-color 0.15s ease',
                        background: isArrived ? '#f0fdf4' : 'transparent'
                      }}
                    >
                      {/* Bus Number & Capacity */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: isArrived ? '#dcfce7' : isDeparted ? '#dbeafe' : '#fef3c7',
                            color: isArrived ? '#15803d' : isDeparted ? '#1d4ed8' : '#b45309',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            <Bus size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)', fontSize: '0.94rem', letterSpacing: '0.3px' }}>
                              {bus.busNumber}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Cap: {bus.capacity || 50} Seats
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner & College */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>
                          {bus.ownerName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Building2 size={13} />
                          <span>{bus.collegeName || bus.collegeId || 'Main Campus'}</span>
                        </div>
                      </td>

                      {/* Driver & Contact */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={14} style={{ color: '#64748b' }} />
                          <span>{bus.driverName}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={13} />
                          <span>{bus.contactNumber}</span>
                        </div>
                      </td>

                      {/* Route */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#334155'
                        }}>
                          <MapPin size={13} style={{ color: '#e11d48' }} />
                          <span>{bus.route}</span>
                        </div>
                      </td>

                      {/* Today's Status Badge */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        {isNotArrived && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            <Clock size={13} /> Not Arrived
                          </span>
                        )}

                        {isArrived && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#10b981',
                              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.35)',
                              animation: 'pulse 1.8s infinite'
                            }} />
                            Arrived (Inside)
                          </span>
                        )}

                        {isDeparted && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            <ExitIcon size={13} /> Departed
                          </span>
                        )}
                      </td>

                      {/* Timestamps & Duration */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.8rem' }}>
                        {isNotArrived ? (
                          <span style={{ color: '#94a3b8' }}>Awaiting Arrival</span>
                        ) : (
                          <div>
                            {bus.todayArrival && (
                              <div style={{ color: '#047857', fontWeight: 600 }}>
                                Entry: {new Date(bus.todayArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {bus.todayDeparture && (
                              <div style={{ color: '#1d4ed8', fontWeight: 600 }}>
                                Exit: {new Date(bus.todayDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                              Campus Stay: <strong style={{ color: '#0f172a' }}>{bus.todayDuration}</strong>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action Button: Entry vs Exit */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        {/* If NOT arrived or departed -> Show ENTRY Button */}
                        {(isNotArrived || isDeparted) && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleRecordEntry(bus)}
                            style={{
                              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: isActionLoading ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isActionLoading ? (
                              <RefreshCw size={15} className="animate-spin" />
                            ) : (
                              <ArrowRightCircle size={16} />
                            )}
                            <span>{isDeparted ? 'Re-Enter' : 'Record Entry'}</span>
                          </button>
                        )}

                        {/* If ARRIVED -> Show EXIT Button */}
                        {isArrived && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleRecordExit(bus)}
                            style={{
                              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: isActionLoading ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(249, 115, 22, 0.3)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isActionLoading ? (
                              <RefreshCw size={15} className="animate-spin" />
                            ) : (
                              <ExitIcon size={16} />
                            )}
                            <span>Record Exit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info Banner */}
      <div style={{
        marginTop: '1.25rem',
        padding: '12px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '0.8rem',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} style={{ color: '#10b981' }} />
          <span>Arrival & departure logs use tamper-proof server timestamps verified by Guard <strong>{watchmanName}</strong>.</span>
        </div>
        <div style={{ fontWeight: 600, color: '#334155' }}>
          Live Terminal Active • Real-Time Socket Sync
        </div>
      </div>
    </div>
  );
};

export default BusEntryTrackingPage;
