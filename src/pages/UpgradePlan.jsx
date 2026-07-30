import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Crown, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../api';
import './UpgradePlan.css';

const UpgradePlan = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [successModal, setSuccessModal] = useState({ show: false, message: '' });

  const handleBack = () => {
    navigate('/admin/dashboard');
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planName, price) => {
    setLoadingPlan(planName);
    
    try {
      // 1. Load Razorpay script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setSuccessModal({ show: true, message: 'Failed to load Razorpay SDK. Please check your internet connection.', isError: true });
        setLoadingPlan(null);
        return;
      }

      // 2. Create order on backend
      const orderRes = await api.post('/auth/create-order', { planName, amount: price });
      const { orderId, keyId, amount, currency } = orderRes.data;

      // 3. Configure Razorpay options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'Marudhar Kesari Jain College',
        description: `${planName} Plan Subscription`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // 4. Verify payment signature on backend
            const verifyRes = await api.post('/auth/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              planName,
              amount: price
            });
            
            setSuccessModal({ show: true, message: verifyRes.data.message });

            // Delay redirect so user can read the success message
            setTimeout(() => {
              navigate('/admin/subscription');
            }, 3500);
          } catch (err) {
            console.error('Payment verification failed:', err);
            setSuccessModal({ 
              show: true, 
              message: err.response?.data?.message || 'Payment verification failed. Please contact support.', 
              isError: true 
            });
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: 'College Admin',
          email: 'admin@college.com',
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: function() {
            setLoadingPlan(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Subscription checkout failed:', err);
      setSuccessModal({ 
        show: true, 
        message: err.response?.data?.message || 'Could not initiate checkout. Please try again.', 
        isError: true 
      });
      setLoadingPlan(null);
    }
  };

  return (
    <div className="upgrade-container animate-fade-in">
      <button 
        onClick={handleBack}
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#475569',
          padding: '8px 16px',
          borderRadius: '20px',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          zIndex: 100
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#F8FAFC';
          e.currentTarget.style.color = '#0F172A';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#FFFFFF';
          e.currentTarget.style.color = '#475569';
        }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {successModal.show && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            animation: 'scaleIn 0.3s ease-out forwards'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: successModal.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: successModal.isError ? '#ef4444' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              {successModal.isError ? <Shield size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-main)' }}>
              {successModal.isError ? 'Verification Failed' : 'Success!'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.5' }}>
              {successModal.message}
            </p>
          </div>
        </div>
      )}

      <div className="upgrade-header">
        <h1>Upgrade Your Plan</h1>
        <p>Your free trial limits your capabilities. Choose a plan to unlock the full potential of your campus.</p>
      </div>

      <div className="pricing-cards">
        {/* Starter Plan */}
        <div 
          className="pricing-card" 
          onClick={() => handleSubscribe('Starter', 15000)}
          style={{ cursor: 'pointer' }}
        >
          <div className="plan-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <Shield size={28} />
          </div>
          <h2>Starter</h2>
          <div className="price">₹15,000<span>/month</span></div>
          <p className="plan-desc">Perfect for small institutions getting started with digital management.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Up to 500 Students</li>
            <li><CheckCircle2 size={16} /> Basic Attendance Tracking</li>
            <li><CheckCircle2 size={16} /> Max 5 HODs</li>
            <li><CheckCircle2 size={16} /> Email Support</li>
          </ul>
          <button 
            className="btn-subscribe btn-starter" 
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Starter', 15000); }}
            disabled={loadingPlan !== null}
          >
            {loadingPlan === 'Starter' ? 'Processing...' : 'Subscribe Now'} <ArrowRight size={16} />
          </button>
        </div>

        {/* Premium Plan */}
        <div 
          className="pricing-card popular"
          onClick={() => handleSubscribe('Premium', 25000)}
          style={{ cursor: 'pointer' }}
        >
          <div className="popular-badge">Most Popular</div>
          <div className="plan-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
            <Zap size={28} />
          </div>
          <h2>Premium</h2>
          <div className="price">₹25,000<span>/month</span></div>
          <p className="plan-desc">Complete ERP suite for growing colleges and universities.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Unlimited Students</li>
            <li><CheckCircle2 size={16} /> Transport & Hostel Modules</li>
            <li><CheckCircle2 size={16} /> Advanced Analytics</li>
            <li><CheckCircle2 size={16} /> 24/7 Priority Support</li>
          </ul>
          <button 
            className="btn-subscribe popular-btn"
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Premium', 25000); }}
            disabled={loadingPlan !== null}
          >
            {loadingPlan === 'Premium' ? 'Processing...' : 'Subscribe Now'} <ArrowRight size={16} />
          </button>
        </div>

        {/* Elite Plan */}
        <div 
          className="pricing-card"
          onClick={() => handleSubscribe('Elite', 50000)}
          style={{ cursor: 'pointer' }}
        >
          <div className="plan-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Crown size={28} />
          </div>
          <h2>Elite</h2>
          <div className="price">₹50,000<span>/month</span></div>
          <p className="plan-desc">Enterprise-grade AI and custom integrations for massive scale.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Everything in Premium</li>
            <li><CheckCircle2 size={16} /> Custom White-labeling</li>
            <li><CheckCircle2 size={16} /> AI Predictive Analytics</li>
            <li><CheckCircle2 size={16} /> Dedicated Account Manager</li>
          </ul>
          <button 
            className="btn-subscribe btn-elite"
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Elite', 50000); }}
            disabled={loadingPlan !== null}
          >
            {loadingPlan === 'Elite' ? 'Processing...' : 'Subscribe Now'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlan;
