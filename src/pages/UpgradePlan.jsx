import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Crown, CheckCircle2, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import api from '../api';
import './UpgradePlan.css';

const UpgradePlan = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [successModal, setSuccessModal] = useState({ show: false, message: '' });
  const [currentSub, setCurrentSub] = useState(null);

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const res = await api.get('/admin/my-subscription');
      if (res.data && res.data.subscription) {
        setCurrentSub(res.data.subscription);
      }
    } catch (err) {
      try {
        const meRes = await api.get('/auth/me');
        if (meRes.data) {
          setCurrentSub({
            planName: meRes.data.planName,
            status: meRes.data.subscriptionStatus,
            isTrial: meRes.data.isTrial,
            expiryDate: meRes.data.expiryDate,
            daysRemaining: meRes.data.daysExpired ? 0 : 30
          });
        }
      } catch (e) {
        console.error('Failed to fetch subscription status:', e);
      }
    }
  };

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
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setSuccessModal({ show: true, message: 'Failed to load Razorpay SDK. Please check your internet connection.', isError: true });
        setLoadingPlan(null);
        return;
      }

      const orderRes = await api.post('/auth/create-order', { planName, amount: price });
      const { orderId, keyId, amount, currency } = orderRes.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: currentSub?.collegeName || 'Institution Portal',
        description: `${planName} Plan Subscription`,
        order_id: orderId,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/auth/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              planName,
              amount: price
            });
            
            setSuccessModal({ show: true, message: verifyRes.data.message });
            fetchCurrentSubscription();

            setTimeout(() => {
              navigate('/admin/subscription');
            }, 2500);
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

  const activePlanNormalized = (currentSub?.planName || currentSub?.plan || '').toLowerCase();
  const isPaidActive = currentSub?.status === 'Active' && !currentSub?.isTrial && activePlanNormalized !== 'trial';

  return (
    <div className="upgrade-container animate-fade-in" style={{ position: 'relative' }}>
      <button 
        onClick={handleBack}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          padding: '8px 16px',
          borderRadius: '20px',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          zIndex: 100
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

      {/* Header & Active Plan Banner */}
      <div className="upgrade-header">
        {isPaidActive ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(99,102,241,0.12))',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '16px',
            padding: '16px 24px',
            maxWidth: '650px',
            margin: '0 auto 24px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Current Plan: {currentSub.planName} Tier
                  </strong>
                  <span style={{ background: '#10b981', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {currentSub.amount !== undefined ? `₹${Number(currentSub.amount).toLocaleString('en-IN')}/${(currentSub.billingCycle || 'Monthly').slice(0,2).toLowerCase()}` : 'Configured by Super Admin'} &bull; {currentSub.daysRemaining ? `${currentSub.daysRemaining} days remaining` : 'Active status'}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/subscription')}
              style={{
                background: 'transparent',
                border: '1px solid #10b981',
                color: '#10b981',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              View Ledger
            </button>
          </div>
        ) : null}

        <h1>{isPaidActive ? 'Manage Or Switch Subscription' : 'Upgrade Your Plan'}</h1>
        <p>
          {isPaidActive
            ? `Your institution is currently active on the ${currentSub.planName} Plan. You can change your tier or renew your plan below.`
            : 'Your free trial limits your capabilities. Choose a plan to unlock the full potential of your campus.'}
        </p>
      </div>

      <div className="pricing-cards">
        {/* Starter / Basic Plan */}
        <div 
          className={`pricing-card ${activePlanNormalized.includes('basic') || activePlanNormalized.includes('starter') ? 'popular' : ''}`}
          onClick={() => handleSubscribe('Starter', 10000)}
          style={{ cursor: 'pointer' }}
        >
          {(activePlanNormalized.includes('basic') || activePlanNormalized.includes('starter')) && (
            <div className="popular-badge" style={{ background: '#10b981' }}>Current Active Plan</div>
          )}
          <div className="plan-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <Shield size={28} />
          </div>
          <h2>Starter Basic</h2>
          <div className="price">₹10,000<span>/month</span></div>
          <p className="plan-desc">Perfect for small to mid-size institutions getting started with digital ERP.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Up to 1,500 Students</li>
            <li><CheckCircle2 size={16} /> Core Attendance & Admissions</li>
            <li><CheckCircle2 size={16} /> Timetable & Staff Management</li>
            <li><CheckCircle2 size={16} /> Standard Email Support</li>
          </ul>
          <button 
            className="btn-subscribe btn-starter" 
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Starter', 10000); }}
            disabled={loadingPlan !== null}
            style={activePlanNormalized.includes('basic') || activePlanNormalized.includes('starter') ? { background: '#10b981', color: '#fff' } : {}}
          >
            {(activePlanNormalized.includes('basic') || activePlanNormalized.includes('starter')) 
              ? <><Check size={16} /> Current Plan</> 
              : (loadingPlan === 'Starter' ? 'Processing...' : 'Subscribe / Switch')
            } <ArrowRight size={16} />
          </button>
        </div>

        {/* Premium Plan */}
        <div 
          className={`pricing-card ${activePlanNormalized.includes('premium') ? 'popular' : ''}`}
          onClick={() => handleSubscribe('Premium', 20000)}
          style={{ cursor: 'pointer' }}
        >
          {activePlanNormalized.includes('premium') ? (
            <div className="popular-badge" style={{ background: '#3b82f6' }}>Current Active Plan</div>
          ) : (
            <div className="popular-badge">Most Popular</div>
          )}
          <div className="plan-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <Zap size={28} />
          </div>
          <h2>Premium Standard</h2>
          <div className="price">₹20,000<span>/month</span></div>
          <p className="plan-desc">Complete ERP suite for growing colleges and multi-department universities.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Up to 5,000 Students</li>
            <li><CheckCircle2 size={16} /> Transport GPS & Hostel Modules</li>
            <li><CheckCircle2 size={16} /> Advanced Analytics & Mark Grading</li>
            <li><CheckCircle2 size={16} /> 24/7 Priority Support</li>
          </ul>
          <button 
            className="btn-subscribe popular-btn"
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Premium', 20000); }}
            disabled={loadingPlan !== null}
          >
            {activePlanNormalized.includes('premium')
              ? <><Check size={16} /> Current Plan</>
              : (loadingPlan === 'Premium' ? 'Processing...' : 'Subscribe / Switch')
            } <ArrowRight size={16} />
          </button>
        </div>

        {/* Elite Plan */}
        <div 
          className={`pricing-card ${activePlanNormalized.includes('elite') || activePlanNormalized.includes('enterprise') ? 'popular' : ''}`}
          onClick={() => handleSubscribe('Elite', 35000)}
          style={{ cursor: 'pointer' }}
        >
          {(activePlanNormalized.includes('elite') || activePlanNormalized.includes('enterprise')) && (
            <div className="popular-badge" style={{ background: '#6366f1' }}>Current Active Plan</div>
          )}
          <div className="plan-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            <Crown size={28} />
          </div>
          <h2>Enterprise Elite</h2>
          <div className="price">₹35,000<span>/month</span></div>
          <p className="plan-desc">Enterprise-grade AI, automated workflows, and custom scale.</p>
          <ul className="plan-features">
            <li><CheckCircle2 size={16} /> Unlimited Students & Staff</li>
            <li><CheckCircle2 size={16} /> Custom Institutional Domain</li>
            <li><CheckCircle2 size={16} /> AI Predictive Insights & Automation</li>
            <li><CheckCircle2 size={16} /> Dedicated 24/7 Account Manager</li>
          </ul>
          <button 
            className="btn-subscribe btn-elite"
            onClick={(e) => { e.stopPropagation(); handleSubscribe('Elite', 35000); }}
            disabled={loadingPlan !== null}
            style={activePlanNormalized.includes('elite') || activePlanNormalized.includes('enterprise') ? { background: '#6366f1', color: '#fff' } : {}}
          >
            {(activePlanNormalized.includes('elite') || activePlanNormalized.includes('enterprise'))
              ? <><Check size={16} /> Current Plan</>
              : (loadingPlan === 'Elite' ? 'Processing...' : 'Subscribe / Switch')
            } <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlan;

