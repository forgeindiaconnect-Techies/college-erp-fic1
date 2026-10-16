import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bus, Search, RefreshCw, CheckCircle2, Clock, MapPin,
  Phone, User, ShieldCheck, ArrowRightCircle, LogOut as ExitIcon,
  AlertCircle, Building2, Calendar, FileText, Plus, Trash2,
  Edit, Download, Printer, Filter, X, Check, Shield
} from 'lucide-react';
import {
  getCollegeBuses, createCollegeBus, updateCollegeBus, deleteCollegeBus,
  getBusMovementLogs, getBusTrackingStats
} from '../../api/index';
import useRealtimeSync, { emitERPDataUpdate } from '../../hooks/useRealtimeSync';
import './TransportManagement.css';

const AdminBusTrackingPage = () => {
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' | 'fleet' | 'reports'
  const [buses, setBuses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalRegistered: 0,
    insideCampus: 0,
    departedToday: 0,
    notArrivedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Arrived' | 'Departed' | 'Not Arrived'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modal State for Register / Edit Bus
  const [busModalOpen, setBusModalOpen] = useState(false);
  const [editingBusId, setEditingBusId] = useState(null);
  const [busForm, setBusForm] = useState({
    busNumber: '',
    ownerName: '',
    driverName: '',
    contactNumber: '',
    route: '',
    capacity: 50,
    collegeName: '',
    status: 'Active',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // Fetch all fleet buses, stats, and logs for selected date
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [busesRes, statsRes, logsRes] = await Promise.allSettled([
        getCollegeBuses(),
        getBusTrackingStats(),
        getBusMovementLogs({ date: selectedDate })
      ]);

      if (busesRes.status === 'fulfilled' && busesRes.value?.data?.data) {
        setBuses(busesRes.value.data.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        setStats(statsRes.value.data.data);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value?.data?.data) {
        setLogs(logsRes.value.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin bus tracking data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Real-time synchronization
  useRealtimeSync(loadData, ['buses', 'bus_tracking', 'busTrackingUpdated']);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Add Bus Modal
  const handleOpenAddBus = () => {
    setEditingBusId(null);
    setBusForm({
      busNumber: '',
      ownerName: 'College Trust Fleet',
      driverName: '',
      contactNumber: '',
      route: '',
      capacity: 50,
      collegeName: 'Main Campus',
      status: 'Active',
      notes: ''
    });
    setBusModalOpen(true);
  };

  // Open Edit Bus Modal
  const handleOpenEditBus = (bus) => {
    setEditingBusId(bus._id);
    setBusForm({
      busNumber: bus.busNumber || '',
      ownerName: bus.ownerName || '',
      driverName: bus.driverName || '',
      contactNumber: bus.contactNumber || '',
      route: bus.route || '',
      capacity: bus.capacity || 50,
      collegeName: bus.collegeName || '',
      status: bus.status || 'Active',
      notes: bus.notes || ''
    });
    setBusModalOpen(true);
  };

  // Submit Bus Form (Create or Update)
  const handleSubmitBus = async (e) => {
    e.preventDefault();
    if (!busForm.busNumber.trim() || !busForm.ownerName.trim() || !busForm.driverName.trim() || !busForm.contactNumber.trim() || !busForm.route.trim()) {
      showToast('Please fill in all mandatory fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingBusId) {
        const res = await updateCollegeBus(editingBusId, busForm);
        if (res.data?.success) {
          showToast(`Bus ${busForm.busNumber.toUpperCase()} updated successfully!`);
          emitERPDataUpdate(['buses', 'bus_tracking'], 'updated', res.data.data);
        }
      } else {
        const res = await createCollegeBus(busForm);
        if (res.data?.success) {
          showToast(`Bus ${busForm.busNumber.toUpperCase()} registered successfully!`);
          emitERPDataUpdate(['buses', 'bus_tracking'], 'created', res.data.data);
        }
      }
      setBusModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save bus details', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Bus
  const handleDeleteBus = async (bus) => {
    if (!window.confirm(`Are you sure you want to remove Bus ${bus.busNumber}?`)) return;

    try {
      const res = await deleteCollegeBus(bus._id);
      if (res.data?.success) {
        showToast(`Bus ${bus.busNumber} removed from system.`);
        emitERPDataUpdate(['buses', 'bus_tracking'], 'deleted', { id: bus._id });
        await loadData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete bus', 'error');
    }
  };

  // Filtered live buses for monitoring tab
  const filteredBuses = useMemo(() => {
    return buses.filter(bus => {
      const matchesSearch =
        bus.busNumber?.toLowerCase().includes(search.toLowerCase()) ||
        bus.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
        bus.driverName?.toLowerCase().includes(search.toLowerCase()) ||
        bus.route?.toLowerCase().includes(search.toLowerCase()) ||
        bus.contactNumber?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'Arrived') return bus.currentStatus === 'Arrived';
      if (statusFilter === 'Departed') return bus.currentStatus === 'Departed';
      if (statusFilter === 'Not Arrived') return bus.currentStatus === 'Not Arrived';

      return true;
    });
  }, [buses, search, statusFilter]);

  // Export Daily Report to CSV
  const handleExportCSV = () => {
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    const exportData = isToday ? buses : logs;

    if (exportData.length === 0) {
      showToast('No data available to export for this date.', 'error');
      return;
    }

    const headers = ['Bus Number', 'Owner Name', 'Driver Name', 'Contact Number', 'Route', 'Status', 'Arrival Time', 'Departure Time', 'Duration on Campus', 'Watchman'];
    const rows = exportData.map(item => [
      `"${item.busNumber || ''}"`,
      `"${item.ownerName || ''}"`,
      `"${item.driverName || ''}"`,
      `"${item.contactNumber || ''}"`,
      `"${item.route || ''}"`,
      `"${item.currentStatus || item.status || 'Not Arrived'}"`,
      `"${item.todayArrival || item.entryTime ? new Date(item.todayArrival || item.entryTime).toLocaleTimeString() : '-'}"`,
      `"${item.todayDeparture || item.exitTime ? new Date(item.todayDeparture || item.exitTime).toLocaleTimeString() : '-'}"`,
      `"${item.todayDuration || item.durationFormatted || '-'}"`,
      `"${item.entryWatchmanName || 'Gate Security'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `college_bus_tracking_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report exported successfully!');
  };

  // Print Daily Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="tm-erp-container" style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Alert */}
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

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              display: 'inline-flex'
            }}>
              <Bus size={24} />
            </span>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              College Bus Real-Time Tracking & Fleet System
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.92rem' }}>
            Real-time gate monitoring, bus fleet management, and automated campus entry/exit audit logs.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              color: 'var(--text-main, #334155)',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Sync Live</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddBus}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Plus size={16} />
            <span>Register College Bus</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '1.5rem'
      }}>
        {/* Total Registered Fleet */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Total Fleet Buses</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
              {stats.totalRegistered || buses.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Registered with College</div>
          </div>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <Bus size={24} />
          </div>
        </div>

        {/* Inside Campus (Arrived) */}
        <div style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 14px rgba(4, 120, 87, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#a7f3d0', fontWeight: 600 }}>Currently Inside Campus</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '4px 0 2px' }}>
              {stats.insideCampus}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#d1fae5' }}>Active at parking / bay</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Departed Today */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#bfdbfe', fontWeight: 600 }}>Departed Today</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '4px 0 2px' }}>
              {stats.departedToday}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#dbeafe' }}>Exited gate safely</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <ExitIcon size={24} />
          </div>
        </div>

        {/* Not Yet Arrived */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Not Yet Arrived</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', margin: '4px 0 2px' }}>
              {stats.notArrivedToday}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#b45309' }}>En route to campus</div>
          </div>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#d97706',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid var(--border-color, #e2e8f0)',
        marginBottom: '1.25rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('monitoring')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'monitoring' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'monitoring' ? '#2563eb' : 'var(--text-muted, #64748b)',
            fontWeight: 700,
            fontSize: '0.94rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={18} />
          <span>Real-Time Gate Monitoring</span>
          <span style={{
            background: activeTab === 'monitoring' ? '#dbeafe' : '#f1f5f9',
            color: activeTab === 'monitoring' ? '#1e40af' : '#64748b',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            {buses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fleet')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'fleet' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'fleet' ? '#2563eb' : 'var(--text-muted, #64748b)',
            fontWeight: 700,
            fontSize: '0.94rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Bus size={18} />
          <span>Bus Fleet Management</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'reports' ? '#2563eb' : 'var(--text-muted, #64748b)',
            fontWeight: 700,
            fontSize: '0.94rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={18} />
          <span>Daily Gate History & Reports</span>
          <span style={{
            background: activeTab === 'reports' ? '#dbeafe' : '#f1f5f9',
            color: activeTab === 'reports' ? '#1e40af' : '#64748b',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            {logs.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: REAL-TIME GATE MONITORING ─────────────────────────────────── */}
      {activeTab === 'monitoring' && (
        <div>
          {/* Filter and Search Bar */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Status Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'All', label: 'All Buses' },
                { id: 'Arrived', label: '🟢 Inside Campus (Arrived)' },
                { id: 'Departed', label: '↗ Departed' },
                { id: 'Not Arrived', label: '⏳ Not Arrived' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === f.id ? '#1e293b' : '#f1f5f9',
                    color: statusFilter === f.id ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '420px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search bus, owner, driver, route..."
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

          {/* Monitoring Table */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            {filteredBuses.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <Bus size={42} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
                <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No buses match current filter</h3>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>Check another status tab or clear the search field.</p>
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
                      <th style={{ padding: '12px 16px' }}>Owner & Assigned College</th>
                      <th style={{ padding: '12px 16px' }}>Driver & Contact</th>
                      <th style={{ padding: '12px 16px' }}>Route Details</th>
                      <th style={{ padding: '12px 16px' }}>Current Status</th>
                      <th style={{ padding: '12px 16px' }}>Arrival Time</th>
                      <th style={{ padding: '12px 16px' }}>Departure Time</th>
                      <th style={{ padding: '12px 16px' }}>Total Campus Stay</th>
                      <th style={{ padding: '12px 16px' }}>Recorded By Guard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuses.map((bus) => {
                      const isArrived = bus.currentStatus === 'Arrived';
                      const isDeparted = bus.currentStatus === 'Departed';
                      const isNotArrived = bus.currentStatus === 'Not Arrived';

                      return (
                        <tr
                          key={bus._id}
                          style={{
                            borderBottom: '1px solid var(--border-color, #f1f5f9)',
                            background: isArrived ? '#f0fdf4' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* Bus Number */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: isArrived ? '#dcfce7' : isDeparted ? '#dbeafe' : '#fef3c7',
                                color: isArrived ? '#15803d' : isDeparted ? '#1d4ed8' : '#b45309',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                <Bus size={18} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.94rem' }}>
                                  {bus.busNumber}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {bus.capacity || 50} Seats
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Owner & College */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {bus.ownerName}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Building2 size={13} />
                              <span>{bus.collegeName || bus.collegeId || 'Main Campus'}</span>
                            </div>
                          </td>

                          {/* Driver & Contact */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
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

                          {/* Current Status Badge */}
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

                          {/* Arrival Date and Time */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.82rem' }}>
                            {bus.todayArrival ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#047857' }}>
                                  {new Date(bus.todayArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {new Date(bus.todayArrival).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Departure Date and Time */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.82rem' }}>
                            {bus.todayDeparture ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                                  {new Date(bus.todayDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {new Date(bus.todayDeparture).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Total Time Spent Inside Campus */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.82rem' }}>
                            {bus.todayDuration !== '-' ? (
                              <span style={{
                                fontWeight: 700,
                                color: isArrived ? '#047857' : '#1e293b',
                                background: isArrived ? '#dcfce7' : '#f1f5f9',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                {bus.todayDuration}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Watchman Name */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#334155' }}>
                              <Shield size={14} style={{ color: '#2563eb' }} />
                              <span>{bus.entryWatchmanName || 'Gate Security'}</span>
                            </div>
                            {bus.exitWatchmanName && bus.exitWatchmanName !== '-' && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                Exit: {bus.exitWatchmanName}
                              </div>
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
        </div>
      )}

      {/* ── TAB 2: BUS FLEET MANAGEMENT ─────────────────────────────────────── */}
      {activeTab === 'fleet' && (
        <div>
          {/* Header Bar */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Registered College Fleet Directory
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Register, update, or decommission college buses, routes, and assigned drivers.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddBus}
              style={{
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}
            >
              <Plus size={16} />
              <span>Register New Bus</span>
            </button>
          </div>

          {/* Bus Fleet Table */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
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
                    <th style={{ padding: '12px 16px' }}>Bus Number</th>
                    <th style={{ padding: '12px 16px' }}>Owner Name</th>
                    <th style={{ padding: '12px 16px' }}>Driver Name</th>
                    <th style={{ padding: '12px 16px' }}>Contact Number</th>
                    <th style={{ padding: '12px 16px' }}>Assigned Route</th>
                    <th style={{ padding: '12px 16px' }}>Assigned College Details</th>
                    <th style={{ padding: '12px 16px' }}>Capacity</th>
                    <th style={{ padding: '12px 16px' }}>Fleet Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buses.map(bus => (
                    <tr
                      key={bus._id}
                      style={{
                        borderBottom: '1px solid var(--border-color, #f1f5f9)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Bus size={18} style={{ color: '#2563eb' }} />
                          <span>{bus.busNumber}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {bus.ownerName}
                      </td>

                      <td style={{ padding: '14px 16px', color: '#1e293b', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={14} style={{ color: '#64748b' }} />
                          <span>{bus.driverName}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#2563eb', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={14} />
                          <span>{bus.contactNumber}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
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

                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.84rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={13} style={{ color: '#64748b' }} />
                          <span>{bus.collegeName || bus.collegeId || 'Main Campus'}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>
                        {bus.capacity || 50} Passengers
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          background: bus.status === 'Active' ? '#dcfce7' : '#fee2e2',
                          color: bus.status === 'Active' ? '#166534' : '#991b1b'
                        }}>
                          {bus.status || 'Active'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditBus(bus)}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Edit Bus"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBus(bus)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Delete Bus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: DAILY GATE HISTORY & REPORTS ─────────────────────────────── */}
      {activeTab === 'reports' && (
        <div>
          {/* Date Selector & Search Header */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Select Tracking Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  background: '#1e293b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={14} />
                <span>Export Daily Log</span>
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            {logs.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <Clock size={42} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
                <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No movements logged for {selectedDate}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>Select another date or wait for gate security entries.</p>
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
                      <th style={{ padding: '12px 16px' }}>Movement ID</th>
                      <th style={{ padding: '12px 16px' }}>Bus & Owner</th>
                      <th style={{ padding: '12px 16px' }}>Driver</th>
                      <th style={{ padding: '12px 16px' }}>Route</th>
                      <th style={{ padding: '12px 16px' }}>Gate Status</th>
                      <th style={{ padding: '12px 16px' }}>Arrival Timestamp</th>
                      <th style={{ padding: '12px 16px' }}>Departure Timestamp</th>
                      <th style={{ padding: '12px 16px' }}>Campus Duration</th>
                      <th style={{ padding: '12px 16px' }}>Recorded Guard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log._id || log.movementId}
                        style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}
                      >
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                          {log.movementId}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{log.busNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.ownerName}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                          {log.driverName}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#334155' }}>
                          {log.route}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: log.status === 'Arrived' ? '#dcfce7' : '#dbeafe',
                            color: log.status === 'Arrived' ? '#15803d' : '#1d4ed8'
                          }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#047857', fontWeight: 600 }}>
                          {log.entryTime ? new Date(log.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#1d4ed8', fontWeight: 600 }}>
                          {log.exitTime ? new Date(log.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {log.durationFormatted || '-'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>
                          {log.entryWatchmanName || 'Gate Security'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REGISTER / EDIT BUS MODAL ────────────────────────────────────────── */}
      {busModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'inline-flex'
                }}>
                  <Bus size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingBusId ? 'Edit College Bus Details' : 'Register New College Bus'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBusModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitBus} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Bus Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Bus Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN-01-AB-1234"
                    value={busForm.busNumber}
                    onChange={(e) => setBusForm({ ...busForm, busNumber: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    placeholder="e.g. 50"
                    value={busForm.capacity}
                    onChange={(e) => setBusForm({ ...busForm, capacity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Bus Owner Name / Agency *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. College Trust Transport Fleet or Sri Krishna Travels"
                  value={busForm.ownerName}
                  onChange={(e) => setBusForm({ ...busForm, ownerName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Driver Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. R. Murugesan"
                    value={busForm.driverName}
                    onChange={(e) => setBusForm({ ...busForm, driverName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98401 23456"
                    value={busForm.contactNumber}
                    onChange={(e) => setBusForm({ ...busForm, contactNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Route */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Assigned Route Details *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route 1 - Central Railway Station to Campus"
                  value={busForm.route}
                  onChange={(e) => setBusForm({ ...busForm, route: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Assigned College Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Assigned College Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering Campus"
                    value={busForm.collegeName}
                    onChange={(e) => setBusForm({ ...busForm, collegeName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Fleet Status
                  </label>
                  <select
                    value={busForm.status}
                    onChange={(e) => setBusForm({ ...busForm, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setBusModalOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  {submitting ? 'Saving...' : editingBusId ? 'Update Bus' : 'Register Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBusTrackingPage;
