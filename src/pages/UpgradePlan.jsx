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

  const handleSubscribe = async (planName, price) => {
    setLoadingPlan(planName);
    
    // Simulate Razorpay Payment Gateway integration delay
    setTimeout(() => {
      // Create a mock Razorpay options object
      const options = {
        key: 'rzp_test_mockkey', // Mock key
        amount: price * 100, // Amount in paise
        currency: 'INR',
        name: 'ERP SaaS',
        description: `${planName} Plan Subscription`,
        handler: async function (response) {
          try {
            const res = await api.post('/auth/verify-payment', {
              paymentId: response.razorpay_payment_id,
              planName,
              amount: price
            });
            
            setSuccessModal({ show: true, message: res.data.message });

            // Delay redirect so user can read the success message
            setTimeout(() => {
              navigate('/admin/subscription');
            }, 3500);
          } catch (err) {
            console.error('Payment submission failed:', err);
            setSuccessModal({ show: true, message: 'Payment submission failed. Please contact support.', isError: true });
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
      };
      // Since we don't have the actual Razorpay script loaded, we mock the popup behavior
      // Browsers often block repeated window.confirm() calls, so we simulate it automatically.
      options.handler({ razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7) });
    }, 1000);
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
          onClick={() => handleSubscribe('Starter', 599)}
          style={{ cursor: 'pointer' }}
        >
          <div className="plan-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <Shield size={28} />
          </div>
          <h2>Starter</h2>
          <div className="price">₹599<span>/month</span></div>
          <p className="plan-desc">Perfect for small institutions getting started with digital management.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Up to 500 Students</li>
            <li><CheckCircle2 size={16} /> Basic Attendance Tracking</li>
            <li><CheckCircle2 size={16} /> Max 5 HODs</li>
            <li><CheckCircle2 size={16} /> Email Support</li>
          </ul>
          <button 
            className="btn-subscribe btn-starter" 
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Starter', 599); }}
            disabled={loadingPlan !== null}
          >
            {loadingPlan === 'Starter' ? 'Processing...' : 'Subscribe Now'} <ArrowRight size={16} />
          </button>
        </div>

        {/* Premium Plan */}
        <div 
          className="pricing-card popular"
          onClick={() => handleSubscribe('Premium', 699)}
          style={{ cursor: 'pointer' }}
        >
          <div className="popular-badge">Most Popular</div>
          <div className="plan-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
            <Zap size={28} />
          </div>
          <h2>Premium</h2>
          <div className="price">₹699<span>/month</span></div>
          <p className="plan-desc">Complete ERP suite for growing colleges and universities.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Unlimited Students</li>
            <li><CheckCircle2 size={16} /> Transport & Hostel Modules</li>
            <li><CheckCircle2 size={16} /> Advanced Analytics</li>
            <li><CheckCircle2 size={16} /> 24/7 Priority Support</li>
          </ul>
          <button 
            className="btn-subscribe popular-btn"
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Premium', 699); }}
            disabled={loadingPlan !== null}
          >
            {loadingPlan === 'Premium' ? 'Processing...' : 'Subscribe Now'} <ArrowRight size={16} />
          </button>
        </div>

        {/* Elite Plan */}
        <div 
          className="pricing-card"
          onClick={() => handleSubscribe('Elite', 999)}
          style={{ cursor: 'pointer' }}
        >
          <div className="plan-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Crown size={28} />
          </div>
          <h2>Elite</h2>
          <div className="price">₹999<span>/month</span></div>
          <p className="plan-desc">Enterprise-grade AI and custom integrations for massive scale.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Everything in Premium</li>
            <li><CheckCircle2 size={16} /> Custom White-labeling</li>
            <li><CheckCircle2 size={16} /> AI Predictive Analytics</li>
            <li><CheckCircle2 size={16} /> Dedicated Account Manager</li>
          </ul>
          <button 
            className="btn-subscribe btn-elite"
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Elite', 999); }}
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
