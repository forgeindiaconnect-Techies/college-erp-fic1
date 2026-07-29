import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, Download, ExternalLink, AlertTriangle, Trash2, Shield, Calendar, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const AdminSubscription = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();

    // Auto-refresh when the user switches back to this tab
    window.addEventListener('focus', fetchSubscriptionData);
    return () => window.removeEventListener('focus', fetchSubscriptionData);
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      // Endpoint to fetch my subscription details (the college the admin belongs to)
      const res = await api.get('/admin/my-subscription');
      setSubscription(res.data.subscription);
      setPayments(res.data.payments);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeRenew = () => {
    navigate('/upgrade-plan');
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        await api.delete(`/admin/payments/${paymentId}`);
        setPayments(payments.filter(p => p._id !== paymentId));
      } catch (error) {
        console.error('Failed to delete payment', error);
        alert('Failed to delete payment. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="p-6">Loading subscription details...</div>;
  }

  const daysRemaining = subscription?.daysRemaining || 0;
  const isExpired = subscription?.status === 'Expired';
  const isGracePeriod = subscription?.isGracePeriod || false;
  const isExpiringSoon = subscription?.status === 'Active' && daysRemaining > 0 && daysRemaining <= 7;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '24px', color: 'var(--text-main)' }}>My Subscription</h1>
      
      {/* Grace Period Warning */}
      {isGracePeriod && (
        <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={24} />
          <div>
            <h4 style={{ fontWeight: 700, margin: 0 }}>Grace Period Active</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>You have {daysRemaining} days of grace period left to renew before access is restricted.</p>
          </div>
        </div>
      )}

      {/* Expired Warning */}
      {isExpired && !isGracePeriod && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={24} />
          <div>
            <h4 style={{ fontWeight: 700, margin: 0 }}>Subscription Expired</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Your subscription has fully expired. New user creation and critical actions are currently blocked.</p>
          </div>
        </div>
      )}

      {/* Expiring Soon Warning */}
      {!isExpired && isExpiringSoon && (
        <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={24} />
          <div>
            <h4 style={{ fontWeight: 700, margin: 0 }}>Expiring Soon</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Your {subscription?.planName || subscription?.plan} plan expires in {daysRemaining} days. Please renew to avoid service interruption.</p>
          </div>
        </div>
      )}

      {/* Premium Subscription Card */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '0', 
          borderRadius: '24px', 
          marginBottom: '32px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          padding: '32px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '16px', 
              background: 'var(--primary)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              color: 'white', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
            }}>
              {subscription?.planName === 'Elite' ? <Zap size={32} /> : <ShieldCheck size={32} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.5px' }}>
                  {subscription?.planName || 'N/A'} Plan
                </h2>
                <span style={{ 
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
                  background: isExpired ? 'rgba(239, 68, 68, 0.1)' : isGracePeriod ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: isExpired ? '#ef4444' : isGracePeriod ? '#f59e0b' : '#10b981',
                  border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.2)' : isGracePeriod ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                }}>
                  {subscription?.status || 'N/A'}
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Your institution is currently on the {subscription?.planName} tier.
              </p>
            </div>
          </div>
          <div>
            <button 
              onClick={handleUpgradeRenew}
              className="hover-card-anim"
              style={{
                background: 'var(--primary)',
                color: 'white', padding: '14px 28px', borderRadius: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', fontSize: '0.95rem'
              }}
            >
              <CreditCard size={18} />
              {subscription?.plan === 'Trial' || subscription?.planName === 'Trial' ? 'Upgrade to Premium' : 'Renew Subscription'}
              <ArrowRight size={18} style={{ opacity: 0.7 }} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', padding: '32px', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Calendar size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Expiry Date</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Days Remaining</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1 }}>{daysRemaining}</p>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Days</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Shield size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>System Access</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {isExpired ? 'Restricted' : 'Full Access'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress bar visual indicator */}
        <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', position: 'relative' }}>
          <div style={{ 
            position: 'absolute', top: 0, left: 0, height: '100%', 
            width: `${Math.min(100, Math.max(0, (daysRemaining / 365) * 100))}%`, 
            background: daysRemaining < 7 ? '#ef4444' : daysRemaining < 15 ? '#f59e0b' : 'linear-gradient(90deg, #4f46e5, #8b5cf6)',
            transition: 'width 1s ease-in-out'
          }} />
        </div>
      </div>

      {/* Payment History */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>Payment History</h2>
      <div className="glass-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Date</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Plan</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Amount</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No payment history found.</td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px' }}>{new Date(payment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{payment.planName}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>₹{payment.amount}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      background: payment.paymentStatus === 'Success' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                      color: payment.paymentStatus === 'Success' ? '#10b981' : '#f59e0b' 
                    }}>
                      {payment.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button title="Download Invoice" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
                      <Download size={18} />
                    </button>
                    <button 
                      title="Delete Record" 
                      onClick={() => handleDeletePayment(payment._id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSubscription;
