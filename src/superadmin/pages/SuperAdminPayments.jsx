import React, { useState, useEffect } from 'react';
import { Search, Receipt, CheckCircle, Clock, Download, Eye, ShieldCheck } from 'lucide-react';
import { getSuperAdminPayments, verifyPayment, downloadInvoice } from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';

const SuperAdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, type: 'warning', title: '', message: '', action: null, paymentId: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminPayments();
      setPayments(res.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action, paymentId) => {
    let title = '';
    let message = '';
    let type = 'warning';

    if (action === 'Verify Payment') {
      title = 'Verify Payment';
      message = 'Mark this payment as Verified/Success?';
      type = 'success';
    } else if (action === 'Download Invoice') {
      title = 'Download Invoice';
      message = 'Download invoice for this payment?';
      type = 'info';
    } else if (action === 'View Details') {
      title = 'View Details';
      message = `Viewing transaction details for: ${paymentId}`;
      type = 'info';
      setSuccessModal({ isOpen: true, title, message });
      return;
    }

    setModalState({ isOpen: true, type, title, message, action, paymentId });
  };

  const executeAction = async () => {
    const { action, paymentId } = modalState;
    try {
      if (action === 'Verify Payment') {
        await verifyPayment(paymentId);
        setSuccessModal({ isOpen: true, title: 'Success', message: 'Payment verified successfully.' });
      } else if (action === 'Download Invoice') {
        const res = await downloadInvoice(paymentId);
        setSuccessModal({ isOpen: true, title: 'Invoice Downloaded', message: res.data.message + '\nURL: ' + res.data.invoiceUrl });
      }
      fetchPayments();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setSuccessModal({ isOpen: true, title: 'Error', message: `Failed to perform ${action}.` });
    }
  };

  const filteredPayments = payments.filter(p => 
    (p.collegeName && p.collegeName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (p.transactionId && p.transactionId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px' }}>
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
        type={successModal.title === 'Error' ? 'danger' : 'success'}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Payments & Invoicing</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track all subscription transactions and generate invoices.</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by college or TXN ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 10px 10px 36px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>College Name</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Plan & Amount</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Transaction ID</th>
              <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Loading payment records...</td></tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No payment records found.</td></tr>
            ) : (
              filteredPayments.map((payment) => {
                const dateStr = new Date(payment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                
                return (
                  <tr key={payment._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Receipt size={18} />
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-main)' }}>{payment.collegeName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{dateStr}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{payment.amount}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{payment.planName} Plan</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: payment.paymentStatus === 'Success' ? 'rgba(16,185,129,0.1)' : 
                                  payment.paymentStatus === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', 
                        color: payment.paymentStatus === 'Success' ? '#10b981' : 
                               payment.paymentStatus === 'Pending' ? '#f59e0b' : '#ef4444' 
                      }}>
                        {payment.paymentStatus === 'Success' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {payment.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {payment.transactionId}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {payment.paymentStatus !== 'Success' && (
                          <button onClick={() => handleActionClick('Verify Payment', payment._id)} title="Verify Payment" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                            <ShieldCheck size={16} />
                          </button>
                        )}
                        <button onClick={() => handleActionClick('Download Invoice', payment._id)} title="Download Invoice" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Download size={16} />
                        </button>
                        <button onClick={() => handleActionClick('View Details', payment._id)} title="View Details" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Eye size={16} />
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
  );
};

export default SuperAdminPayments;
