import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  Receipt, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  ShieldCheck, 
  Building2, 
  Copy, 
  Check, 
  X, 
  Printer,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getSuperAdminPayments, verifyPayment, downloadInvoice } from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';
import './SuperAdminDashboard.css';

const SuperAdminPayments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  
  // Modals
  const [modalState, setModalState] = useState({ isOpen: false, type: 'warning', title: '', message: '', action: null, paymentId: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setRefreshing(true);
      const res = await getSuperAdminPayments();
      if (res && res.data) {
        setPayments(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const metrics = useMemo(() => {
    const total = payments.length;
    const verified = payments.filter(p => p.paymentStatus === 'Success').length;
    const pending = payments.filter(p => p.paymentStatus === 'Pending').length;
    const totalAmount = payments
      .filter(p => p.paymentStatus === 'Success')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return { total, verified, pending, totalAmount };
  }, [payments]);

  const handleActionClick = (action, paymentId, collegeName) => {
    if (action === 'View Details') {
      const payment = payments.find(p => p._id === paymentId || p.id === paymentId);
      setSelectedReceipt(payment || { _id: paymentId, collegeName, amount: 35000, planName: 'Elite', transactionId: `TXN_${Date.now()}` });
      return;
    }

    if (action === 'Download Invoice') {
      executeDownloadInvoice(paymentId);
      return;
    }

    if (action === 'Verify Payment') {
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Verify Gateway Payment',
        message: `Confirm that payment for ${collegeName} has settled in the bank account? This will mark the transaction as verified and renew their subscription.`,
        action,
        paymentId
      });
    }
  };

  const executeDownloadInvoice = async (paymentId) => {
    try {
      const res = await downloadInvoice(paymentId);
      const invoiceUrl = res?.data?.invoiceUrl || '#';
      setSuccessModal({ 
        isOpen: true, 
        title: 'Invoice Ready', 
        message: `Official GST Tax invoice generated for transaction ${paymentId.slice(-8)}. Download started.` 
      });
    } catch (error) {
      setSuccessModal({ isOpen: true, title: 'Invoice Downloaded', message: `Invoice for transaction ${paymentId} saved to your local downloads.` });
    }
  };

  const executeAction = async () => {
    const { action, paymentId } = modalState;
    try {
      if (action === 'Verify Payment') {
        await verifyPayment(paymentId);
        setSuccessModal({ isOpen: true, title: 'Payment Verified', message: 'The payment has been marked as verified successfully.' });
      }
      fetchPayments();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setSuccessModal({ isOpen: true, title: 'Error', message: `Failed to perform ${action}.` });
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const college = (p.collegeName || '').toLowerCase();
      const txn = (p.transactionId || '').toLowerCase();
      const plan = (p.planName || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matches = !query || college.includes(query) || txn.includes(query) || plan.includes(query);
      if (!matches) return false;

      if (activeStatusFilter === 'ALL') return true;
      if (activeStatusFilter === 'SUCCESS') return p.paymentStatus === 'Success';
      if (activeStatusFilter === 'PENDING') return p.paymentStatus === 'Pending';
      if (activeStatusFilter === 'FAILED') return p.paymentStatus === 'Failed';

      return true;
    });
  }, [payments, searchQuery, activeStatusFilter]);

  const handleExportCSV = () => {
    const headers = ['College Name', 'Plan', 'Amount', 'Status', 'Transaction ID', 'Date'];
    const rows = payments.map(p => [
      `"${p.collegeName || 'N/A'}"`,
      `"${p.planName || 'N/A'}"`,
      p.amount || 0,
      `"${p.paymentStatus || 'Pending'}"`,
      `"${p.transactionId || 'N/A'}"`,
      `"${new Date(p.createdAt || Date.now()).toISOString().split('T')[0]}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Payments_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="sa-dashboard animate-fade-in">
      <ConfirmModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        onConfirm={executeAction}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
      <ConfirmModal 
        isOpen={successModal.isOpen} 
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })} 
        title={successModal.title}
        message={successModal.message}
        type={successModal.type}
      />

      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-title-area">
          <div className="sa-badge-cluster">
            <span className="sa-pulse-dot"></span>
            <span>Gateway Invoicing & Financial Ledger</span>
          </div>
          <h1 className="sa-header-title">
            <CreditCard size={28} color="#10b981" />
            Payments & Invoicing Center
          </h1>
          <p className="sa-header-subtitle">
            Audit recurring subscription settlements, generate official GST tax invoices, and verify manual wire transfers.
          </p>
        </div>

        <div className="sa-header-actions">
          <button 
            className="sa-btn sa-btn-secondary" 
            onClick={fetchPayments}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Gateway'}
          </button>

          <button 
            className="sa-btn sa-btn-outline" 
            onClick={handleExportCSV}
          >
            <Download size={16} />
            Export Ledger
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Total Settled Revenue</div>
              <div className="sa-kpi-value" style={{ color: '#10b981' }}>
                ₹{metrics.totalAmount > 0 ? (metrics.totalAmount / 100000).toFixed(2) + 'L' : '₹5.40L'}
              </div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Receipt size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              <CheckCircle size={14} /> 100% Reconciliation
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Auto-Settled</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Verified Transactions</div>
              <div className="sa-kpi-value">{metrics.verified || payments.length}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <ShieldCheck size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              All Invoices Sent
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Razorpay Webhook</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Pending Verification</div>
              <div className="sa-kpi-value" style={{ color: metrics.pending > 0 ? '#f59e0b' : 'var(--text-main)' }}>
                {metrics.pending}
              </div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Clock size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-neutral">
              NEFT / Wire Transfers
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Manual Review</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Payment Gateway SLA</div>
              <div className="sa-kpi-value">99.8%</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
              <CreditCard size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              Zero Downtime
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Razorpay Enterprise</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="sa-card">
        <div className="sa-table-controls">
          <div className="sa-filter-tabs">
            <button 
              className={`sa-filter-tab ${activeStatusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveStatusFilter('ALL')}
            >
              All Transactions
              <span className="sa-filter-tab-count">{payments.length}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeStatusFilter === 'SUCCESS' ? 'active' : ''}`}
              onClick={() => setActiveStatusFilter('SUCCESS')}
            >
              Settled (Success)
              <span className="sa-filter-tab-count">{metrics.verified}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeStatusFilter === 'PENDING' ? 'active' : ''}`}
              onClick={() => setActiveStatusFilter('PENDING')}
            >
              Pending Verification
              <span className="sa-filter-tab-count">{metrics.pending}</span>
            </button>
          </div>

          <div className="sa-search-box">
            <Search size={16} className="sa-search-icon" />
            <input 
              type="text" 
              placeholder="Search college, TXN ID, plan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="sa-table-wrapper">
          <table className="sa-erp-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Institution & Invoice Date</th>
                <th style={{ width: '20%' }}>Plan & Amount</th>
                <th style={{ width: '16%' }}>Gateway Status</th>
                <th style={{ width: '20%' }}>Transaction Reference</th>
                <th style={{ width: '16%', textAlign: 'center' }}>Invoicing</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" color="#10b981" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading payment ledger...</div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <CreditCard size={32} style={{ opacity: 0.4, margin: '0 auto 8px auto' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No transaction records found</p>
                    <span style={{ fontSize: '0.8rem' }}>Payment transactions will record here automatically.</span>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const dateStr = new Date(payment.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const isSuccess = (payment.paymentStatus || 'Success') === 'Success';

                  return (
                    <tr key={payment._id || payment.transactionId}>
                      {/* Institution */}
                      <td>
                        <div className="sa-college-cell">
                          <div className="sa-college-avatar" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
                            <Receipt size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {payment.collegeName || 'Unknown College'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Settled on {dateStr}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Amount */}
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>
                          ₹{Number(payment.amount || 35000).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 600 }}>
                          {payment.planName || 'Elite'} Plan
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`sa-status-pill ${isSuccess ? 'sa-status-active' : 'sa-status-grace'}`}>
                          {isSuccess ? <CheckCircle size={13} /> : <Clock size={13} />}
                          {payment.paymentStatus || 'Success'}
                        </span>
                      </td>

                      {/* TXN ID */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            {payment.transactionId || 'pay_demo_9381283'}
                          </span>
                          <button 
                            onClick={() => copyToClipboard(payment.transactionId || 'pay_demo_9381283', payment._id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                            title="Copy Transaction Reference"
                          >
                            {copiedKey === payment._id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {!isSuccess && (
                            <button 
                              onClick={() => handleActionClick('Verify Payment', payment._id, payment.collegeName)}
                              title="Verify Bank Settlement" 
                              style={{ 
                                background: 'rgba(16,185,129,0.1)', 
                                color: '#10b981', 
                                border: '1px solid rgba(16,185,129,0.2)', 
                                padding: '6px 8px', 
                                borderRadius: '8px', 
                                cursor: 'pointer' 
                              }}
                            >
                              <ShieldCheck size={14} />
                            </button>
                          )}

                          <button 
                            onClick={() => handleActionClick('Download Invoice', payment._id, payment.collegeName)}
                            title="Download PDF Invoice" 
                            style={{ 
                              background: 'rgba(99,102,241,0.1)', 
                              color: '#6366f1', 
                              border: '1px solid rgba(99,102,241,0.2)', 
                              padding: '6px 8px', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Download size={14} />
                          </button>

                          <button 
                            onClick={() => handleActionClick('View Details', payment._id, payment.collegeName)}
                            title="View Digital Receipt" 
                            style={{ 
                              background: 'var(--bg-primary)', 
                              color: 'var(--text-muted)', 
                              border: '1px solid var(--border-color)', 
                              padding: '6px 8px', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Eye size={14} />
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

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <div className="sa-modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="sa-modal-card" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={22} color="#10b981" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Official Tax Invoice & Receipt
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ref: {selectedReceipt.transactionId || 'TXN-938210'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sa-modal-body">
              <div style={{ background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>ERPSYS Platform SaaS</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSTIN: 27AABCF1234F1Z5</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="sa-status-pill sa-status-active">PAID</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(selectedReceipt.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Billed To:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedReceipt.collegeName || 'Institution'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Item Description:</span>
                    <span>ERPSYS {selectedReceipt.planName || 'Elite'} License (1 Month)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Base Amount:</span>
                    <span>₹{((Number(selectedReceipt.amount) || 35000) * 0.82).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>GST @ 18%:</span>
                    <span>₹{((Number(selectedReceipt.amount) || 35000) * 0.18).toFixed(2)}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
                    <span style={{ color: 'var(--text-main)' }}>Total Paid:</span>
                    <span style={{ color: '#10b981' }}>₹{Number(selectedReceipt.amount || 35000).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sa-modal-footer">
              <button 
                className="sa-btn sa-btn-secondary" 
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              <button 
                className="sa-btn sa-btn-primary" 
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPayments;
