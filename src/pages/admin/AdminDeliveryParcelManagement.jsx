import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Truck, Plus, Search, CheckCircle2, Clock,
  Filter, RefreshCw, X, AlertCircle, Trash2, Edit3, User,
  Calendar, Building, Check, ArrowRight, ShieldCheck, Download
} from 'lucide-react';
import {
  getParcels,
  logParcel,
  updateParcel,
  handoverParcel,
  deleteParcel,
  getStaffDirectory
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './AdminDeliveryParcelManagement.css';

const COURIER_COMPANIES = [
  'Amazon',
  'Flipkart',
  'Blue Dart',
  'DTDC',
  'India Post / Speed Post',
  'Delhivery',
  'FedEx',
  'Swiggy / Zomato',
  'DHL Express',
  'Professional Couriers',
  'Other'
];

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Admin Reception Post'
];

const AdminDeliveryParcelManagement = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); // All, Delivery, Parcel
  const [statusFilter, setStatusFilter] = useState('All'); // All, Pending, Collected

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [activeItem, setActiveItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form State
  const [formData, setFormData] = useState({
    type: 'Parcel', // Delivery or Parcel
    recipientId: '',
    staffId: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    department: '',
    recipientType: 'Staff',
    deliveryCompany: 'Amazon',
    senderName: '',
    trackingNumber: '',
    parcelDetails: 'Standard package / envelope',
    gate: GATES[0],
    receivedAt: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  // Handover state
  const [handoverForm, setHandoverForm] = useState({
    collectedBy: '',
    notes: ''
  });

  // Staff Search inside Modal
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // Fetch staff directory
  const loadStaffDirectory = async () => {
    try {
      setLoadingStaff(true);
      const res = await getStaffDirectory();
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setStaffList(list);
    } catch (err) {
      console.error('Failed to load staff directory:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Fetch all parcels
  const fetchAllParcels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getParcels({
        type: typeFilter !== 'All' ? typeFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setParcels(list);
    } catch (err) {
      console.error('Failed to load all parcels:', err);
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useRealtimeSync(fetchAllParcels, ['parcel']);

  useEffect(() => {
    fetchAllParcels();
  }, [fetchAllParcels]);

  useEffect(() => {
    loadStaffDirectory();
  }, []);

  // Filtered staff for dropdown
  const filteredStaff = useMemo(() => {
    if (!staffSearchQuery.trim()) return staffList.slice(0, 8);
    const q = staffSearchQuery.toLowerCase();
    return staffList.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [staffList, staffSearchQuery]);

  const selectStaffMember = (staff) => {
    setFormData(prev => ({
      ...prev,
      recipientId: staff._id,
      staffId: staff.staffId || '',
      recipientName: staff.name,
      recipientEmail: staff.email || '',
      recipientPhone: staff.phone || prev.recipientPhone,
      department: staff.department || prev.department,
      recipientType: staff.role || 'Staff'
    }));
    setStaffSearchQuery(`${staff.name} (${staff.staffId || staff.email})`);
    setShowStaffDropdown(false);
  };

  // Submit new registration
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.recipientName.trim()) {
      showToast('Please select a valid staff member from the database', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        receivedAt: new Date(formData.receivedAt).toISOString()
      };
      const res = await logParcel(payload);
      if (res.data?.success) {
        showToast(`Successfully registered ${formData.type} for ${formData.recipientName}!`);
        setCreateModalOpen(false);
        resetForm();
        fetchAllParcels();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to register delivery/parcel', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    try {
      setSubmitting(true);
      const res = await updateParcel(activeItem._id, formData);
      if (res.data?.success) {
        showToast('Delivery/Parcel updated successfully!');
        setEditModalOpen(false);
        setActiveItem(null);
        resetForm();
        fetchAllParcels();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handover / Collection
  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    try {
      setSubmitting(true);
      const res = await handoverParcel(activeItem._id, {
        handedOverTo: handoverForm.collectedBy || activeItem.recipientName,
        notes: handoverForm.notes
      });
      if (res.data?.success) {
        showToast(`Item marked as collected by ${handoverForm.collectedBy || activeItem.recipientName}!`);
        setHandoverModalOpen(false);
        setActiveItem(null);
        fetchAllParcels();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete handover', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDeleteSubmit = async () => {
    if (!activeItem) return;
    try {
      setSubmitting(true);
      const res = await deleteParcel(activeItem._id);
      if (res.data?.success) {
        showToast('Record deleted successfully');
        setDeleteModalOpen(false);
        setActiveItem(null);
        fetchAllParcels();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setActiveItem(item);
    setFormData({
      type: item.type || 'Parcel',
      recipientId: item.recipientId || '',
      staffId: item.staffId || '',
      recipientName: item.recipientName || '',
      recipientEmail: item.recipientEmail || '',
      recipientPhone: item.recipientPhone || '',
      department: item.department || '',
      recipientType: item.recipientType || 'Staff',
      deliveryCompany: item.deliveryCompany || 'Amazon',
      senderName: item.senderName || '',
      trackingNumber: item.trackingNumber || '',
      parcelDetails: item.parcelDetails || '',
      gate: item.gate || GATES[0],
      receivedAt: item.receivedAt ? new Date(item.receivedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      notes: item.notes || ''
    });
    setStaffSearchQuery(item.recipientName ? `${item.recipientName} (${item.staffId || ''})` : '');
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'Parcel',
      recipientId: '',
      staffId: '',
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
      department: '',
      recipientType: 'Staff',
      deliveryCompany: 'Amazon',
      senderName: '',
      trackingNumber: '',
      parcelDetails: 'Standard package / envelope',
      gate: GATES[0],
      receivedAt: new Date().toISOString().slice(0, 16),
      notes: ''
    });
    setStaffSearchQuery('');
    setShowStaffDropdown(false);
  };

  // KPIs
  const kpis = useMemo(() => {
    const list = Array.isArray(parcels) ? parcels : [];
    const total = list.length;
    const pending = list.filter(p => p.status === 'Pending Collection' || p.status === 'Received at Gate' || p.status === 'Received').length;
    const collected = list.filter(p => p.status === 'Collected' || p.status === 'Handed Over').length;
    const deliveriesCount = list.filter(p => p.type === 'Delivery').length;
    const parcelsCount = list.filter(p => p.type === 'Parcel' || !p.type).length;
    return { total, pending, collected, deliveriesCount, parcelsCount };
  }, [parcels]);

  // Client search filtering
  const filteredList = useMemo(() => {
    const list = Array.isArray(parcels) ? parcels : [];
    return list.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !search || (
        p.recipientName?.toLowerCase().includes(q) ||
        p.staffId?.toLowerCase().includes(q) ||
        p.trackingNumber?.toLowerCase().includes(q) ||
        p.deliveryCompany?.toLowerCase().includes(q) ||
        p.parcelId?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q) ||
        p.senderName?.toLowerCase().includes(q)
      );

      const matchType = typeFilter === 'All' || p.type === typeFilter || (!p.type && typeFilter === 'Parcel');

      let matchStatus = true;
      if (statusFilter === 'Pending') {
        matchStatus = p.status === 'Pending Collection' || p.status === 'Received at Gate' || p.status === 'Received';
      } else if (statusFilter === 'Collected') {
        matchStatus = p.status === 'Collected' || p.status === 'Handed Over';
      }

      return matchSearch && matchType && matchStatus;
    });
  }, [parcels, search, typeFilter, statusFilter]);

  return (
    <div className="adm-parcel-container">
      {/* Toast */}
      {toast.show && (
        <div className={`adm-parcel-toast toast-${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="adm-parcel-header">
        <div className="adm-parcel-title-group">
          <h1>
            <Package size={28} className="adm-parcel-header-icon" />
            <span>Delivery & Parcel Management</span>
          </h1>
          <p>Campus-wide incoming deliveries, staff courier tracking, gate custody, and handover history</p>
        </div>

        <div className="adm-parcel-header-actions">
          <button
            type="button"
            className="adm-btn-sec"
            onClick={fetchAllParcels}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="adm-btn-primary"
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Register New Arrival</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="adm-parcel-kpi-grid">
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon-wrap icon-blue">
            <Package size={22} />
          </div>
          <div className="adm-kpi-content">
            <span className="adm-kpi-label">Total Registered</span>
            <h3 className="adm-kpi-val">{kpis.total}</h3>
            <span className="adm-kpi-sub">{kpis.parcelsCount} Parcels • {kpis.deliveriesCount} Deliveries</span>
          </div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-icon-wrap icon-amber">
            <Clock size={22} />
          </div>
          <div className="adm-kpi-content">
            <span className="adm-kpi-label">Pending Collection</span>
            <h3 className="adm-kpi-val" style={{ color: '#d97706' }}>{kpis.pending}</h3>
            <span className="adm-kpi-sub">Awaiting staff pickup at gate</span>
          </div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-icon-wrap icon-green">
            <CheckCircle2 size={22} />
          </div>
          <div className="adm-kpi-content">
            <span className="adm-kpi-label">Collected / Handed Over</span>
            <h3 className="adm-kpi-val" style={{ color: '#059669' }}>{kpis.collected}</h3>
            <span className="adm-kpi-sub">Staff received & verified</span>
          </div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-icon-wrap icon-indigo">
            <User size={22} />
          </div>
          <div className="adm-kpi-content">
            <span className="adm-kpi-label">Active Staff Directory</span>
            <h3 className="adm-kpi-val">{staffList.length}</h3>
            <span className="adm-kpi-sub">Available recipient profiles</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="adm-parcel-toolbar">
        <div className="adm-parcel-search">
          <Search size={18} className="adm-search-icon" />
          <input
            type="text"
            placeholder="Search by Staff Name, Staff ID, Tracking #, Courier, or Parcel ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="adm-search-clear"
              onClick={() => setSearch('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="adm-parcel-filters">
          <div className="filter-group">
            <label>Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="adm-filter-select"
            >
              <option value="All">All Types</option>
              <option value="Delivery">Delivery</option>
              <option value="Parcel">Parcel</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="adm-filter-select"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Collection</option>
              <option value="Collected">Collected / Handed Over</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="adm-parcel-table-card">
        <div className="adm-table-responsive">
          <table className="adm-parcel-table">
            <thead>
              <tr>
                <th>Record & Type</th>
                <th>Staff Recipient</th>
                <th>Courier & Description</th>
                <th>Tracking #</th>
                <th>Received At & Gate</th>
                <th>Status</th>
                <th>Collection History</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading delivery & parcel records...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <Package size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>No Deliveries or Parcels Found</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      {search ? 'Try adjusting your search keywords.' : 'Click "Register New Arrival" to record a delivery or parcel.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isPending = item.status === 'Pending Collection' || item.status === 'Received at Gate' || item.status === 'Received';
                  const isDelivery = item.type === 'Delivery';

                  return (
                    <tr key={item._id} className={isPending ? 'row-pending' : ''}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="adm-parcel-id">{item.parcelId || '—'}</span>
                          <span className={`adm-type-pill ${isDelivery ? 'pill-delivery' : 'pill-parcel'}`}>
                            {isDelivery ? <Truck size={11} /> : <Package size={11} />}
                            <span>{item.type || 'Parcel'}</span>
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="adm-recipient-cell">
                          <div className="adm-recipient-name">{item.recipientName}</div>
                          <div className="adm-recipient-meta">
                            {item.staffId && <span className="meta-badge-id">ID: {item.staffId}</span>}
                            {item.department && <span>{item.department}</span>}
                          </div>
                          {item.recipientEmail && (
                            <span className="meta-email">{item.recipientEmail}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.deliveryCompany}</div>
                        {item.senderName && (
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>From: {item.senderName}</div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          {item.parcelDetails || 'Standard Package'}
                        </div>
                      </td>

                      <td>
                        <span className="adm-tracking-code">{item.trackingNumber || '—'}</span>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                          {new Date(item.receivedAt).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                          <Clock size={11} />
                          <span>{new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          {item.gate || 'Gate 1'}
                        </div>
                      </td>

                      <td>
                        <span className={`adm-status-badge ${isPending ? 'status-pending' : 'status-collected'}`}>
                          {isPending ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      <td>
                        {!isPending ? (
                          <div className="adm-history-cell">
                            <div className="history-collector">
                              <strong>Collected by:</strong> {item.collectedBy || item.handedOverTo || item.recipientName}
                            </div>
                            {item.collectedAt && (
                              <div className="history-time">
                                {new Date(item.collectedAt).toLocaleDateString()} at {new Date(item.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Awaiting Pickup</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="adm-action-btn-group">
                          {isPending && (
                            <button
                              type="button"
                              className="adm-action-btn btn-handover"
                              title="Mark Handover / Collection"
                              onClick={() => {
                                setActiveItem(item);
                                setHandoverForm({
                                  collectedBy: item.recipientName,
                                  notes: ''
                                });
                                setHandoverModalOpen(true);
                              }}
                            >
                              <Check size={14} />
                              <span>Hand Over</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="adm-action-btn btn-edit"
                            title="Edit Record"
                            onClick={() => openEditModal(item)}
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            className="adm-action-btn btn-delete"
                            title="Delete Record"
                            onClick={() => {
                              setActiveItem(item);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 size={14} />
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

      {/* Modal 1: Register New Delivery / Parcel */}
      {createModalOpen && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-card">
            <div className="adm-modal-header">
              <div className="adm-modal-title">
                <Package size={22} style={{ color: '#2563eb' }} />
                <h3>Register Incoming Delivery / Parcel</h3>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="adm-modal-body">
                {/* Delivery Type Switcher */}
                <div className="adm-form-group">
                  <label className="adm-form-label">Delivery Type <span className="req">*</span></label>
                  <div className="type-toggle-group">
                    <button
                      type="button"
                      className={`type-toggle-btn ${formData.type === 'Parcel' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'Parcel' })}
                    >
                      <Package size={16} />
                      <span>Parcel (Courier / Post)</span>
                    </button>
                    <button
                      type="button"
                      className={`type-toggle-btn ${formData.type === 'Delivery' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'Delivery' })}
                    >
                      <Truck size={16} />
                      <span>Delivery (Food / Goods / Quick)</span>
                    </button>
                  </div>
                </div>

                {/* Staff Search Dropdown from Database */}
                <div className="adm-form-group relative">
                  <label className="adm-form-label">
                    Staff Recipient (Search by Name or Staff ID) <span className="req">*</span>
                  </label>
                  <div className="staff-lookup-wrap">
                    <Search size={16} className="lookup-icon" />
                    <input
                      type="text"
                      className="adm-form-input pl-8"
                      placeholder="Type staff name or ID to search DB..."
                      value={staffSearchQuery}
                      onChange={(e) => {
                        setStaffSearchQuery(e.target.value);
                        setShowStaffDropdown(true);
                      }}
                      onFocus={() => setShowStaffDropdown(true)}
                      required
                    />
                  </div>

                  {showStaffDropdown && (
                    <div className="staff-dropdown-menu">
                      <div className="staff-dropdown-header">
                        Select Staff Member from Database ({filteredStaff.length} results)
                      </div>
                      {filteredStaff.length === 0 ? (
                        <div className="staff-dropdown-empty">No staff member matched "{staffSearchQuery}"</div>
                      ) : (
                        filteredStaff.map((s) => (
                          <div
                            key={s._id}
                            className="staff-dropdown-item"
                            onClick={() => selectStaffMember(s)}
                          >
                            <div className="staff-item-name">
                              <strong>{s.name}</strong>
                              {s.staffId && <span className="staff-item-id">[{s.staffId}]</span>}
                            </div>
                            <div className="staff-item-sub">
                              <span>{s.department || 'Staff'}</span> • <span>{s.email}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {formData.recipientId && (
                    <div className="selected-staff-pill">
                      <ShieldCheck size={14} style={{ color: '#059669' }} />
                      <span>Linked DB Staff: <strong>{formData.recipientName}</strong> (ID: {formData.staffId || 'Verified'})</span>
                    </div>
                  )}
                </div>

                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Courier / Delivery Company <span className="req">*</span></label>
                    <select
                      className="adm-form-select"
                      value={formData.deliveryCompany}
                      onChange={(e) => setFormData({ ...formData, deliveryCompany: e.target.value })}
                    >
                      {COURIER_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">Sender Name (Optional)</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      placeholder="e.g. Oxford Press, Amazon Seller"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Tracking / AWB #</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      placeholder="e.g. BD-89210491"
                      value={formData.trackingNumber}
                      onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">Campus Gate Post</label>
                    <select
                      className="adm-form-select"
                      value={formData.gate}
                      onChange={(e) => setFormData({ ...formData, gate: e.target.value })}
                    >
                      {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Received Date & Time</label>
                    <input
                      type="datetime-local"
                      className="adm-form-input"
                      value={formData.receivedAt}
                      onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })}
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">Recipient Phone #</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      placeholder="Mobile contact"
                      value={formData.recipientPhone}
                      onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Parcel / Item Description</label>
                  <input
                    type="text"
                    className="adm-form-input"
                    placeholder="e.g. Cardboard box, envelopes, lab instruments"
                    value={formData.parcelDetails}
                    onChange={(e) => setFormData({ ...formData, parcelDetails: e.target.value })}
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Internal Gate Notes</label>
                  <textarea
                    rows={2}
                    className="adm-form-input"
                    placeholder="Remarks, rack/shelf number, condition..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn-sec"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Register Arrival'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Record */}
      {editModalOpen && activeItem && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-card">
            <div className="adm-modal-header">
              <div className="adm-modal-title">
                <Edit3 size={20} style={{ color: '#2563eb' }} />
                <h3>Edit Delivery / Parcel Record ({activeItem.parcelId})</h3>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="adm-modal-body">
                <div className="adm-form-group">
                  <label className="adm-form-label">Delivery Type</label>
                  <div className="type-toggle-group">
                    <button
                      type="button"
                      className={`type-toggle-btn ${formData.type === 'Parcel' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'Parcel' })}
                    >
                      <Package size={16} />
                      <span>Parcel</span>
                    </button>
                    <button
                      type="button"
                      className={`type-toggle-btn ${formData.type === 'Delivery' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'Delivery' })}
                    >
                      <Truck size={16} />
                      <span>Delivery</span>
                    </button>
                  </div>
                </div>

                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Recipient Name</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">Staff ID</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={formData.staffId}
                      onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Courier Company</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={formData.deliveryCompany}
                      onChange={(e) => setFormData({ ...formData, deliveryCompany: e.target.value })}
                      required
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">Tracking Number</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={formData.trackingNumber}
                      onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Package Description</label>
                  <input
                    type="text"
                    className="adm-form-input"
                    value={formData.parcelDetails}
                    onChange={(e) => setFormData({ ...formData, parcelDetails: e.target.value })}
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Gate Notes</label>
                  <textarea
                    rows={2}
                    className="adm-form-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn-sec"
                  onClick={() => setEditModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Mark Handover / Collection */}
      {handoverModalOpen && activeItem && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-card" style={{ maxWidth: '460px' }}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">
                <CheckCircle2 size={22} style={{ color: '#059669' }} />
                <h3>Acknowledge Handover / Pickup</h3>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setHandoverModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleHandoverSubmit}>
              <div className="adm-modal-body">
                <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#475569' }}>
                  Confirm collection for record <strong>{activeItem.parcelId}</strong> ({activeItem.deliveryCompany}) assigned to <strong>{activeItem.recipientName}</strong>.
                </p>

                <div className="adm-form-group">
                  <label className="adm-form-label">Collected By (Full Name) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="adm-form-input"
                    value={handoverForm.collectedBy}
                    onChange={(e) => setHandoverForm({ ...handoverForm, collectedBy: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Handover Remarks (Optional)</label>
                  <input
                    type="text"
                    className="adm-form-input"
                    placeholder="e.g. Collected in person at Main Gate"
                    value={handoverForm.notes}
                    onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn-sec"
                  onClick={() => setHandoverModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{ background: '#059669' }}
                  disabled={submitting}
                >
                  {submitting ? 'Confirming...' : 'Confirm Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Delete Confirmation */}
      {deleteModalOpen && activeItem && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-card" style={{ maxWidth: '420px' }}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">
                <Trash2 size={20} style={{ color: '#dc2626' }} />
                <h3>Delete Delivery Record?</h3>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setDeleteModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="adm-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                Are you sure you want to permanently delete record <strong>{activeItem.parcelId}</strong> ({activeItem.recipientName} - {activeItem.deliveryCompany})? This action cannot be undone.
              </p>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn-sec"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn-primary"
                style={{ background: '#dc2626' }}
                onClick={handleDeleteSubmit}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryParcelManagement;
