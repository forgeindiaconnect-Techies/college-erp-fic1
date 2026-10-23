import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Truck, CheckCircle2, Clock, Search, Filter,
  RefreshCw, Check, AlertCircle, ArrowRight, ShieldCheck,
  Calendar, MapPin, Building, User, Info, ExternalLink,
  Copy, CheckCheck, X
} from 'lucide-react';
import { getParcels, collectParcel } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StaffDeliveryParcelPage.css';

export default function StaffDeliveryParcelPage() {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All, Pending Collection, Collected
  const [typeFilter, setTypeFilter] = useState('All');     // All, Delivery, Parcel
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ open: false, parcel: null });
  const [copiedId, setCopiedId] = useState(null);

  const staffSession = useMemo(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem('staff_session') ||
        sessionStorage.getItem('hod_session') ||
        sessionStorage.getItem('principal_session') ||
        sessionStorage.getItem('user_session') ||
        localStorage.getItem('erp_user') ||
        '{}'
      );
    } catch (e) {
      return {};
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchMyParcels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getParcels({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        type: typeFilter !== 'All' ? typeFilter : undefined,
        my: 'true'
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setParcels(list);
    } catch (err) {
      console.error('Failed to load my parcels:', err);
      showToast(err.response?.data?.message || 'Error loading deliveries', 'error');
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useRealtimeSync(fetchMyParcels, ['parcel']);

  useEffect(() => {
    fetchMyParcels();
  }, [fetchMyParcels]);

  // Handle Staff Collection Confirmation
  const handleConfirmCollection = async () => {
    if (!confirmModal.parcel) return;
    const parcelId = confirmModal.parcel._id;

    try {
      setActionLoading(parcelId);
      const res = await collectParcel(parcelId, {
        collectedBy: staffSession.name || 'Staff Member'
      });

      if (res.data?.success) {
        showToast('✓ Collection confirmed! Security gate ledger has been updated.');
        setConfirmModal({ open: false, parcel: null });
        fetchMyParcels();
      } else {
        throw new Error(res.data?.message || 'Failed to confirm collection');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Error updating collection', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Safe list calculation
  const safeParcels = useMemo(() => Array.isArray(parcels) ? parcels : [], [parcels]);

  // Filter list by search query & filters
  const filteredList = useMemo(() => {
    return safeParcels.filter(p => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || (
        p.parcelId?.toLowerCase().includes(q) ||
        p.trackingNumber?.toLowerCase().includes(q) ||
        p.deliveryCompany?.toLowerCase().includes(q) ||
        p.senderName?.toLowerCase().includes(q) ||
        p.parcelDetails?.toLowerCase().includes(q) ||
        p.gate?.toLowerCase().includes(q)
      );

      const matchType = typeFilter === 'All' || p.type === typeFilter || (!p.type && typeFilter === 'Parcel');

      let matchStatus = true;
      if (statusFilter === 'Pending Collection') {
        matchStatus = p.status === 'Pending Collection' || p.status === 'Received at Gate' || p.status === 'Received';
      } else if (statusFilter === 'Collected') {
        matchStatus = p.status === 'Collected' || p.status === 'Handed Over';
      }

      return matchSearch && matchType && matchStatus;
    });
  }, [safeParcels, search, statusFilter, typeFilter]);

  const totalCount = safeParcels.length;
  const pendingCount = safeParcels.filter(p => p.status === 'Pending Collection' || p.status === 'Received at Gate' || p.status === 'Received').length;
  const collectedCount = safeParcels.filter(p => p.status === 'Collected' || p.status === 'Handed Over').length;

  return (
    <div className="staff-erp-parcel-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`erp-parcel-toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Page Header */}
      <div className="erp-parcel-header">
        <div className="header-left">
          <div className="badge-desk">
            <ShieldCheck size={14} />
            <span>Institution Logistics & Gate Desk</span>
            <span className="live-pulse-dot" title="Real-time gate sync active" />
            <span className="live-label">LIVE SYNC</span>
          </div>

          <h1 className="header-title">
            <Package size={28} className="title-icon" />
            <span>My Deliveries & Parcels</span>
          </h1>

          <p className="header-desc">
            Track and acknowledge incoming courier deliveries, food drops, and packages received for{' '}
            <span className="staff-name-pill">{staffSession.name || 'Staff Member'}</span>
            {staffSession.dept && <span className="staff-dept-pill">{staffSession.dept}</span>} at the campus security gate.
          </p>
        </div>

        <div className="header-actions">
          <button 
            type="button" 
            className="btn-erp-refresh" 
            onClick={fetchMyParcels}
            disabled={loading}
            title="Click to refresh latest gate records"
          >
            <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
            <span>{loading ? 'Syncing...' : 'Refresh Register'}</span>
          </button>
        </div>
      </div>

      {/* Modern 3-Column ERP KPI Cards */}
      <div className="erp-kpi-grid">
        {/* KPI 1: Total */}
        <div className="erp-kpi-card kpi-blue">
          <div className="kpi-icon-wrap">
            <Package size={24} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Assigned</span>
            <div className="kpi-number">{totalCount}</div>
            <span className="kpi-hint">Deliveries logged in your name</span>
          </div>
        </div>

        {/* KPI 2: Pending (Alert Mode if > 0) */}
        <div className={`erp-kpi-card kpi-amber ${pendingCount > 0 ? 'kpi-alert-pulse' : ''}`}>
          <div className="kpi-icon-wrap">
            <Clock size={24} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Ready for Collection</span>
            <div className="kpi-number">{pendingCount}</div>
            <span className="kpi-hint">
              {pendingCount > 0 ? '⚠️ Awaiting pickup at security gate desk' : '✓ No pending items at security'}
            </span>
          </div>
        </div>

        {/* KPI 3: Collected */}
        <div className="erp-kpi-card kpi-emerald">
          <div className="kpi-icon-wrap">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Successfully Collected</span>
            <div className="kpi-number">{collectedCount}</div>
            <span className="kpi-hint">Handover verified & ledger closed</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="erp-toolbar">
        {/* Search Input */}
        <div className="erp-search-wrap">
          <Search size={18} className="search-icon-inside" />
          <input
            type="text"
            className="erp-search-input"
            placeholder="Search by Tracking #, Courier, Item, Gate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              type="button" 
              className="search-clear-btn" 
              onClick={() => setSearch('')}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="erp-filter-controls">
          {/* Type Filter Group */}
          <div className="filter-pill-cluster">
            <button
              type="button"
              className={`filter-btn ${typeFilter === 'All' ? 'active' : ''}`}
              onClick={() => setTypeFilter('All')}
            >
              All Types
            </button>
            <button
              type="button"
              className={`filter-btn ${typeFilter === 'Delivery' ? 'active' : ''}`}
              onClick={() => setTypeFilter('Delivery')}
            >
              <Truck size={14} />
              <span>Deliveries</span>
            </button>
            <button
              type="button"
              className={`filter-btn ${typeFilter === 'Parcel' ? 'active' : ''}`}
              onClick={() => setTypeFilter('Parcel')}
            >
              <Package size={14} />
              <span>Parcels</span>
            </button>
          </div>

          {/* Status Filter Group */}
          <div className="filter-pill-cluster">
            <button
              type="button"
              className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
              onClick={() => setStatusFilter('All')}
            >
              All Status
            </button>
            <button
              type="button"
              className={`filter-btn btn-pending ${statusFilter === 'Pending Collection' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Pending Collection')}
            >
              <Clock size={13} />
              <span>Pending Collection</span>
            </button>
            <button
              type="button"
              className={`filter-btn btn-collected ${statusFilter === 'Collected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Collected')}
            >
              <CheckCircle2 size={13} />
              <span>Collected</span>
            </button>
          </div>

          {(search || statusFilter !== 'All' || typeFilter !== 'All') && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setSearch('');
                setStatusFilter('All');
                setTypeFilter('All');
              }}
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Delivery & Parcel Card Grid */}
      {loading && safeParcels.length === 0 ? (
        <div className="erp-empty-box">
          <div className="erp-loader-spinner" />
          <h3>Connecting to Campus Gate Ledger...</h3>
          <p>Retrieving your real-time deliveries & security custody log.</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="erp-empty-box">
          <div className="empty-badge-circle">
            <Package size={44} />
          </div>
          <h3>No Records Found</h3>
          <p>
            {search || statusFilter !== 'All' || typeFilter !== 'All'
              ? 'No incoming deliveries or courier parcels match your active filter search.'
              : 'You have no pending deliveries or courier packages logged at the security gate.'}
          </p>
          {(search || statusFilter !== 'All' || typeFilter !== 'All') && (
            <button
              type="button"
              className="btn-erp-outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('All');
                setTypeFilter('All');
              }}
            >
              Show All Records
            </button>
          )}
        </div>
      ) : (
        <div className="erp-parcel-grid">
          {filteredList.map((p) => {
            const isCollected = p.status === 'Collected' || p.status === 'Handed Over';
            const isDelivery = p.type === 'Delivery';

            return (
              <div 
                key={p._id || p.parcelId} 
                className={`erp-parcel-card ${isCollected ? 'state-collected' : 'state-pending'}`}
              >
                {/* Card Top Row: Type, ID, and Status */}
                <div className="card-header-bar">
                  <div className="card-tag-group">
                    <span className={`tag-type ${isDelivery ? 'type-delivery' : 'type-parcel'}`}>
                      {isDelivery ? <Truck size={13} /> : <Package size={13} />}
                      <span>{isDelivery ? 'Delivery' : 'Parcel'}</span>
                    </span>

                    <button 
                      type="button"
                      className="tag-code-btn"
                      onClick={() => copyToClipboard(p.parcelId, p._id)}
                      title="Click to copy tracking ID"
                    >
                      <span>{p.parcelId || 'PCL-GEN'}</span>
                      {copiedId === p._id ? <CheckCheck size={12} color="#059669" /> : <Copy size={11} />}
                    </button>
                  </div>

                  <span className={`tag-status ${isCollected ? 'status-done' : 'status-waiting'}`}>
                    {isCollected ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span>Collected</span>
                      </>
                    ) : (
                      <>
                        <Clock size={13} className="spin-subtle" />
                        <span>Pending Collection</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Card Main Body */}
                <div className="card-content-area">
                  <h3 className="card-item-title">
                    {p.parcelDetails || 'Standard Package / Consignment'}
                  </h3>

                  <div className="card-details-table">
                    {/* Courier / Delivery Company */}
                    <div className="detail-row">
                      <span className="row-key">Courier / Service:</span>
                      <span className="row-val font-semibold">
                        {p.deliveryCompany || p.senderName || 'Courier Service'}
                      </span>
                    </div>

                    {/* Tracking / AWB */}
                    {p.trackingNumber && (
                      <div className="detail-row">
                        <span className="row-key">Tracking / AWB #:</span>
                        <span 
                          className="row-val monospace-chip"
                          onClick={() => copyToClipboard(p.trackingNumber, `track-${p._id}`)}
                          title="Click to copy AWB"
                        >
                          {p.trackingNumber}
                          {copiedId === `track-${p._id}` ? <CheckCheck size={11} color="#059669" /> : <Copy size={10} />}
                        </span>
                      </div>
                    )}

                    {/* Received At Gate */}
                    <div className="detail-row">
                      <span className="row-key">Received at Gate:</span>
                      <span className="row-val">
                        <Calendar size={12} className="row-icon" />
                        {p.receivedAt ? new Date(p.receivedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </span>
                    </div>

                    {/* Custody Location */}
                    <div className="detail-row">
                      <span className="row-key">Custody Location:</span>
                      <span className="row-val location-highlight">
                        <MapPin size={12} className="row-icon text-red-500" />
                        {p.gate || 'Gate 1 (Security Desk)'}
                      </span>
                    </div>

                    {/* Collection history if collected */}
                    {isCollected && p.collectedAt && (
                      <div className="detail-row collected-row">
                        <span className="row-key">Handed Over On:</span>
                        <span className="row-val text-emerald-700">
                          {new Date(p.collectedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {p.collectedBy && ` • ${p.collectedBy}`}
                        </span>
                      </div>
                    )}

                    {/* Notes from Security */}
                    {p.notes && (
                      <div className="detail-note-bubble">
                        <Info size={13} className="note-icon" />
                        <span><strong>Security Note:</strong> {p.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="card-action-footer">
                  {!isCollected ? (
                    <button
                      type="button"
                      className="btn-confirm-collection"
                      onClick={() => setConfirmModal({ open: true, parcel: p })}
                      disabled={actionLoading === p._id}
                    >
                      {actionLoading === p._id ? (
                        <>
                          <RefreshCw size={15} className="spin-anim" />
                          <span>Updating Custody...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Confirm I Have Collected This</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="verified-stamp">
                      <CheckCircle2 size={15} className="stamp-icon" />
                      <span>Collection recorded & closed in gate ledger</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.open && confirmModal.parcel && (
        <div 
          className="erp-modal-overlay" 
          onClick={() => setConfirmModal({ open: false, parcel: null })}
        >
          <div className="erp-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-icon-badge">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h3>Confirm Item Collection</h3>
                <p>Verify that you have received this package from gate custody</p>
              </div>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setConfirmModal({ open: false, parcel: null })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-middle">
              <div className="modal-receipt-box">
                <div className="receipt-row">
                  <span>Item Description:</span>
                  <strong>{confirmModal.parcel.parcelDetails || 'Standard Package'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Courier / Company:</span>
                  <strong>{confirmModal.parcel.deliveryCompany || 'Courier'}</strong>
                </div>
                {confirmModal.parcel.trackingNumber && (
                  <div className="receipt-row">
                    <span>Tracking Number:</span>
                    <strong className="font-mono">{confirmModal.parcel.trackingNumber}</strong>
                  </div>
                )}
                <div className="receipt-row">
                  <span>Gate Location:</span>
                  <strong>{confirmModal.parcel.gate || 'Gate 1 (Security Desk)'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Acknowledging Staff:</span>
                  <strong>{staffSession.name || 'Staff Member'}</strong>
                </div>
              </div>

              <div className="modal-warning-notice">
                <ShieldCheck size={16} className="text-amber-600 flex-shrink-0" />
                <span>
                  By confirming, this item status will be immediately updated to <strong>"Collected"</strong> across the Watchman gate terminal and College Admin records.
                </span>
              </div>
            </div>

            <div className="modal-bottom-actions">
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => setConfirmModal({ open: false, parcel: null })}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-modal-confirm" 
                onClick={handleConfirmCollection}
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating Ledger...' : '✓ Yes, I Have Collected It'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
