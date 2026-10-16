import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Crown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  GraduationCap,
  Eye,
  EyeOff,
  Activity,
  Server,
  Award,
  Globe,
  Check
} from 'lucide-react';
import { registerCollege, createRegistrationOrder } from '../api';
import './GetAccess.css';

const SUBSCRIPTION_PLANS = [
  {
    id: 'Trial',
    name: '1-Day Free Trial',
    badge: 'Instant Access',
    monthlyPrice: 0,
    annualPrice: 0,
    desc: 'Full access to core campus modules for instant evaluation without commitment.',
    features: [
      'Full Student & Staff Information System',
      'Daily Attendance & Leave Management',
      'Basic Gradebook & Marks Entry',
      'Campus Notices & Announcements',
      'No Credit Card Required'
    ]
  },
  {
    id: 'Starter',
    name: 'Starter Plan',
    badge: 'Small Institutions',
    monthlyPrice: 10000,
    annualPrice: 100000,
    desc: 'Essential administrative foundation tailored for colleges up to 500 students.',
    features: [
      'Up to 500 Active Students',
      'Student, Staff & HOD Directory',
      'Daily Attendance with SMS Alerts',
      'Course & Subject Allocation',
      'Standard Email & In-App Support'
    ]
  },
  {
    id: 'Basic',
    name: 'Basic Plan',
    badge: 'Growing Colleges',
    monthlyPrice: 15000,
    annualPrice: 150000,
    desc: 'Comprehensive academic and fee operations for institutions up to 1,500 students.',
    features: [
      'Up to 1,500 Active Students',
      'Complete Examination & Grading Engine',
      'Automated Fees Collection & Receipts',
      'Library Management System & Barcodes',
      'Class Timetable Scheduling'
    ]
  },
  {
    id: 'Premium',
    name: 'Premium Plan',
    badge: 'Most Popular',
    isPopular: true,
    monthlyPrice: 20000,
    annualPrice: 200000,
    desc: 'Complete full-suite ERP connecting every campus department seamlessly.',
    features: [
      'Unlimited Students & Faculty',
      'Hostel & Mess Management System',
      'Fleet & Transport Route Tracking',
      'Training & Placement Cell Portal',
      'Parent Communication Tracker',
      'Accounts & Expense Ledgers'
    ]
  },
  {
    id: 'Elite',
    name: 'Elite Enterprise',
    badge: 'Multi-Campus',
    monthlyPrice: 35000,
    annualPrice: 350000,
    desc: 'State-of-the-art infrastructure with custom integrations and dedicated support.',
    features: [
      'Multi-Campus & Multi-Institution Support',
      'Dedicated Isolated Database Tenant',
      'AI Student Analytics & Predictions',
      'Custom Role-Based Security Policies',
      '24/7 Dedicated Account Manager & SLA'
    ]
  }
];

const GetAccess = () => {
  const navigate = useNavigate();

  // Multi-step workflow state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Registration Form
  const [formData, setFormData] = useState({
    collegeName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    principalName: '',
    principalEmail: '',
    principalPassword: ''
  });

  const [showPrincipalFields, setShowPrincipalFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrincipalPassword, setShowPrincipalPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Step 2: Subscription Plan Selection
  const [billingCycle, setBillingCycle] = useState('Monthly');
  const [selectedPlanId, setSelectedPlanId] = useState('Premium');

  // Loading & Global Alerts
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Step 3: Registration Success Result
  const [registrationResult, setRegistrationResult] = useState(null);

  // Check if current visitor has Super Admin session
  const isSuperAdminSession = !!sessionStorage.getItem('superadmin_token');

  // Form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  // Password strength calculator
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: '', class: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', class: 'active-weak' };
    if (score <= 3) return { score: 2, text: 'Medium', class: 'active-medium' };
    return { score: 3, text: 'Strong', class: 'active-strong' };
  };

  const pwdStrength = calculatePasswordStrength(formData.password);

  // Step 1 Form Validation
  const validateStep1 = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,15}$/;

    if (!formData.collegeName.trim()) {
      errors.collegeName = 'College or institution name is required.';
    }

    if (!formData.adminName.trim()) {
      errors.adminName = 'Administrator name is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Admin email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Contact phone number is required.';
    } else if (!phoneRegex.test(formData.phone.replace(/[^0-9]/g, ''))) {
      errors.phone = 'Please enter a valid phone number (min 10 digits).';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (showPrincipalFields) {
      if (formData.principalEmail && !emailRegex.test(formData.principalEmail.trim())) {
        errors.principalEmail = 'Please enter a valid principal email address.';
      }
      if (formData.principalPassword && formData.principalPassword.length < 6) {
        errors.principalPassword = 'Principal password must be at least 6 characters.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextToPlans = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper to load Razorpay checkout script
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

  // Submit Registration and Subscription
  const handleFinalSubmit = async (attemptPayment = false) => {
    setLoading(true);
    setApiError('');

    const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[0];
    const planPrice = billingCycle === 'Annually' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;

    // If client requested Razorpay payment and price > 0
    if (attemptPayment && planPrice > 0) {
      try {
        const isLoaded = await loadRazorpayScript();
        if (isLoaded) {
          const orderRes = await createRegistrationOrder({
            planName: selectedPlan.name,
            amount: planPrice
          });

          if (orderRes.data && orderRes.data.orderId) {
            const { orderId, keyId, amount, currency } = orderRes.data;

            const options = {
              key: keyId,
              amount,
              currency,
              name: formData.collegeName,
              description: `${selectedPlan.name} (${billingCycle}) Subscription`,
              order_id: orderId,
              handler: async function (paymentResponse) {
                // Payment verified on checkout, submit registration with signature
                await executeRegistration({
                  subscriptionPlan: selectedPlan.id,
                  billingCycle,
                  razorpayPaymentId: paymentResponse.razorpay_payment_id,
                  razorpayOrderId: paymentResponse.razorpay_order_id,
                  razorpaySignature: paymentResponse.razorpay_signature
                });
              },
              prefill: {
                name: formData.adminName,
                email: formData.email,
                contact: formData.phone
              },
              theme: {
                color: '#4f46e5'
              },
              modal: {
                ondismiss: function () {
                  setLoading(false);
                }
              }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
            return;
          }
        }
      } catch (payErr) {
        console.warn('Payment checkout unavailable, proceeding with pending verification state:', payErr.message);
      }
    }

    // Default flow: Free Trial or Pending-Payment state (verified confirmation required)
    await executeRegistration({
      subscriptionPlan: selectedPlan.id,
      billingCycle
    });
  };

  const executeRegistration = async (subscriptionDetails) => {
    try {
      const payload = {
        ...formData,
        ...subscriptionDetails
      };

      const res = await registerCollege(payload);

      setRegistrationResult({
        tenantId: res.data.tenantId,
        collegeName: res.data.collegeName || formData.collegeName,
        adminName: res.data.adminName || formData.adminName,
        email: res.data.email || formData.email,
        subscriptionPlan: res.data.subscriptionPlan || subscriptionDetails.subscriptionPlan,
        subscriptionStatus: res.data.subscriptionStatus || 'Pending Approval',
        paymentStatus: res.data.paymentStatus || 'Pending',
        amount: res.data.amount,
        billingCycle: res.data.billingCycle || billingCycle
      });

      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Registration failed:', err);
      const msg = err.response?.data?.message || 'Failed to submit registration. Please verify details and try again.';
      setApiError(msg);
      // If validation error points to email or duplicate, keep user on relevant step
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('name')) {
        setCurrentStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanObj = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[0];
  const activePlanPrice = billingCycle === 'Annually' ? selectedPlanObj.annualPrice : selectedPlanObj.monthlyPrice;

  return (
    <div className="client-reg-page">
      {/* Top Navigation */}
      <header className="client-reg-navbar">
        <div className="client-reg-brand-cluster">
          <div className="client-reg-logo-box" onClick={() => navigate('/')}>
            <img src="/logo_dark.svg" alt="ERPSYS Logo" className="reg-navbar-logo" />
          </div>
          <div className="erp-navbar-live-status">
            <span className="live-status-dot"></span>
            <span className="live-status-text">ERP Cloud 4.0 • Live</span>
          </div>
        </div>

        <div className="client-reg-nav-actions">
          <button type="button" className="client-reg-nav-link" onClick={() => navigate('/')}>
            <span className="desktop-only-text">&larr; Back to Home</span>
            <span className="mobile-only-text">&larr; Home</span>
          </button>
          <Link to="/login" className="client-reg-login-pill">
            <User size={15} />
            <span className="desktop-only-text">Login to Portal</span>
            <span className="mobile-only-text">Login</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="client-reg-main-content">
        {/* Stepper Progress */}
        <div className="client-reg-stepper">
          <div className="stepper-track-bg"></div>
          <div
            className="stepper-track-progress"
            style={{
              width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%'
            }}
          ></div>

          <div className={`stepper-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 1 ? <CheckCircle2 size={18} /> : '1'}</div>
            <span className="step-label">
              <span className="desktop-step-text">01. Institution Details</span>
              <span className="mobile-step-text">Details</span>
            </span>
          </div>

          <div className={`stepper-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-circle">{currentStep > 2 ? <CheckCircle2 size={18} /> : '2'}</div>
            <span className="step-label">
              <span className="desktop-step-text">02. Subscription Plan</span>
              <span className="mobile-step-text">Plans</span>
            </span>
          </div>

          <div className={`stepper-step ${currentStep === 3 ? 'active completed' : ''}`}>
            <div className="step-circle">{currentStep === 3 ? <CheckCircle2 size={18} /> : '3'}</div>
            <span className="step-label">
              <span className="desktop-step-text">03. Confirmation</span>
              <span className="mobile-step-text">Confirm</span>
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {apiError && (
          <div className="reg-alert-box error" style={{ maxWidth: '650px', margin: '0 auto 1.5rem' }}>
            <AlertCircle size={20} />
            <span>{apiError}</span>
          </div>
        )}

        {/* ── STEP 1: INSTITUTION & ADMIN DETAILS ────────────────── */}
        {currentStep === 1 && (
          <div className="erp-register-layout">
            {/* Left Showcase Panel: Real-Time ERP Capabilities & Campus Visual */}
            <div className="erp-showcase-panel">
              {/* Featured Campus Visual Card */}
              <div className="erp-showcase-hero-card">
                <img
                  src="/college_campus_hero.jpg"
                  alt="Modern College Campus"
                  className="erp-showcase-img"
                />
                <div className="erp-showcase-overlay">
                  <div className="erp-live-badge">
                    <span className="live-pulse-dot"></span>
                    <span>LIVE ERP CLOUD 4.0</span>
                  </div>
                  <div className="erp-hero-caption">
                    <h3>Enterprise Campus OS</h3>
                    <p>Unified digital ecosystem for academic, administrative &amp; financial operations.</p>
                  </div>
                </div>
              </div>

              {/* Real-time ERP Feature Matrix */}
              <div className="erp-highlights-card">
                <h4 className="erp-highlights-title">
                  <Sparkles size={16} color="#2563eb" />
                  <span>Real-Time Enterprise Capabilities</span>
                </h4>

                <div className="erp-modules-list">
                  <div className="erp-module-item">
                    <div className="module-icon-wrap blue">
                      <Zap size={18} />
                    </div>
                    <div className="module-info">
                      <strong>Smart Attendance &amp; RFID</strong>
                      <p>Biometric facial sync with automated SMS &amp; WhatsApp parent alerts.</p>
                    </div>
                  </div>

                  <div className="erp-module-item">
                    <div className="module-icon-wrap emerald">
                      <GraduationCap size={18} />
                    </div>
                    <div className="module-info">
                      <strong>Autonomous Exam &amp; CGPA Engine</strong>
                      <p>Semester marks, instant hall ticket issuing &amp; NEP 2020 gradebooks.</p>
                    </div>
                  </div>

                  <div className="erp-module-item">
                    <div className="module-icon-wrap indigo">
                      <CreditCard size={18} />
                    </div>
                    <div className="module-info">
                      <strong>Online Fees &amp; Reconciliation</strong>
                      <p>Automated receipts, UPI/Razorpay &amp; instant ledger sync.</p>
                    </div>
                  </div>

                  <div className="erp-module-item">
                    <div className="module-icon-wrap purple">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="module-info">
                      <strong>Enterprise Multi-Tenant Security</strong>
                      <p>Dedicated database tenant with 256-bit SSL bank-grade encryption.</p>
                    </div>
                  </div>
                </div>

                {/* Real-Time Live Stats Bar */}
                <div className="erp-live-stats-bar">
                  <div className="erp-stat-box">
                    <span className="erp-stat-val">500+</span>
                    <span className="erp-stat-lbl">Institutions</span>
                  </div>
                  <div className="erp-stat-divider"></div>
                  <div className="erp-stat-box">
                    <span className="erp-stat-val">99.98%</span>
                    <span className="erp-stat-lbl">Uptime SLA</span>
                  </div>
                  <div className="erp-stat-divider"></div>
                  <div className="erp-stat-box">
                    <span className="erp-stat-val">NAAC / NBA</span>
                    <span className="erp-stat-lbl">Audit-Ready</span>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="erp-trust-row">
                  <div className="erp-trust-badge">
                    <Award size={14} color="#059669" />
                    <span>ISO 27001 Certified</span>
                  </div>
                  <div className="erp-trust-badge">
                    <ShieldCheck size={14} color="#2563eb" />
                    <span>256-Bit SSL Protection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Form Card */}
            <div className="client-reg-card erp-form-card">
              <div className="client-reg-card-header">
                <div className="card-badge-pill">
                  <Server size={14} />
                  <span>Tenant Provisioning</span>
                </div>
                <h1 className="client-reg-card-title">Register Your Institution</h1>
                <p className="client-reg-card-subtitle">
                  Configure your college administrative credentials. Your dedicated ERP tenant will be spun up under enterprise role isolation.
                </p>
              </div>

              <form onSubmit={handleNextToPlans}>
                <div className="reg-form-grid">
                  {/* College / Institution Name */}
                  <div className="reg-form-group reg-field-full">
                    <label>
                      <Building2 size={16} /> College / Institution Name *
                    </label>
                    <div className="reg-input-wrap">
                      <Building2 size={18} className="reg-input-icon" />
                      <input
                        type="text"
                        name="collegeName"
                        className="reg-input"
                        placeholder="e.g. Oxford Institute of Technology & Sciences"
                        value={formData.collegeName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {formErrors.collegeName && <span className="reg-error-text">{formErrors.collegeName}</span>}
                  </div>

                  {/* Administrator Name */}
                  <div className="reg-form-group">
                    <label>
                      <User size={16} /> Administrator Full Name *
                    </label>
                    <div className="reg-input-wrap">
                      <User size={18} className="reg-input-icon" />
                      <input
                        type="text"
                        name="adminName"
                        className="reg-input"
                        placeholder="e.g. Dr. Ramesh Kumar"
                        value={formData.adminName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {formErrors.adminName && <span className="reg-error-text">{formErrors.adminName}</span>}
                  </div>

                  {/* Admin Email */}
                  <div className="reg-form-group">
                    <label>
                      <Mail size={16} /> Official Admin Email *
                    </label>
                    <div className="reg-input-wrap">
                      <Mail size={18} className="reg-input-icon" />
                      <input
                        type="email"
                        name="email"
                        className="reg-input"
                        placeholder="admin@institution.edu"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {formErrors.email && <span className="reg-error-text">{formErrors.email}</span>}
                  </div>

                  {/* Mobile Number */}
                  <div className="reg-form-group">
                    <label>
                      <Phone size={16} /> Contact Mobile Number *
                    </label>
                    <div className="reg-input-wrap">
                      <Phone size={18} className="reg-input-icon" />
                      <input
                        type="tel"
                        name="phone"
                        className="reg-input"
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {formErrors.phone && <span className="reg-error-text">{formErrors.phone}</span>}
                  </div>

                  {/* Admin Password */}
                  <div className="reg-form-group">
                    <label>
                      <Lock size={16} /> Admin Password *
                    </label>
                    <div className="reg-input-wrap">
                      <Lock size={18} className="reg-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="reg-input has-toggle-btn"
                        placeholder="Create a secure password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="reg-pwd-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="pwd-strength-container">
                        <div className="pwd-strength-bars">
                          <div className={`pwd-bar ${pwdStrength.score >= 1 ? pwdStrength.class : ''}`}></div>
                          <div className={`pwd-bar ${pwdStrength.score >= 2 ? pwdStrength.class : ''}`}></div>
                          <div className={`pwd-bar ${pwdStrength.score >= 3 ? pwdStrength.class : ''}`}></div>
                        </div>
                        <span className="pwd-strength-label">Password Strength: {pwdStrength.text}</span>
                      </div>
                    )}
                    {formErrors.password && <span className="reg-error-text">{formErrors.password}</span>}
                  </div>

                  {/* Optional Principal Account Toggle */}
                  <div className="reg-field-full">
                    <div
                      className="optional-principal-toggle"
                      onClick={() => setShowPrincipalFields(!showPrincipalFields)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="principal-toggle-icon">
                          <Crown size={18} />
                        </div>
                        <div>
                          <strong className="toggle-title">
                            Add Principal Console Account (Optional)
                          </strong>
                          <p className="toggle-subtitle">
                            Pre-configure principal login credentials during registration
                          </p>
                        </div>
                      </div>
                      {showPrincipalFields ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                    </div>

                    {showPrincipalFields && (
                      <div className="optional-principal-box">
                        <div className="reg-form-grid">
                          <div className="reg-form-group">
                            <label>
                              <User size={15} /> Principal Full Name
                            </label>
                            <div className="reg-input-wrap">
                              <User size={18} className="reg-input-icon" />
                              <input
                                type="text"
                                name="principalName"
                                className="reg-input"
                                placeholder="e.g. Dr. S. Ramanathan"
                                value={formData.principalName}
                                onChange={handleChange}
                              />
                            </div>
                          </div>

                          <div className="reg-form-group">
                            <label>
                              <Mail size={15} /> Principal Email
                            </label>
                            <div className="reg-input-wrap">
                              <Mail size={18} className="reg-input-icon" />
                              <input
                                type="email"
                                name="principalEmail"
                                className="reg-input"
                                placeholder="principal@institution.edu"
                                value={formData.principalEmail}
                                onChange={handleChange}
                              />
                            </div>
                            {formErrors.principalEmail && (
                              <span className="reg-error-text">{formErrors.principalEmail}</span>
                            )}
                          </div>

                          <div className="reg-form-group reg-field-full">
                            <label>
                              <Lock size={15} /> Principal Password
                            </label>
                            <div className="reg-input-wrap">
                              <Lock size={18} className="reg-input-icon" />
                              <input
                                type={showPrincipalPassword ? 'text' : 'password'}
                                name="principalPassword"
                                className="reg-input has-toggle-btn"
                                placeholder="Create principal login password (min 6 characters)"
                                value={formData.principalPassword}
                                onChange={handleChange}
                                minLength={6}
                              />
                              <button
                                type="button"
                                className="reg-pwd-toggle-btn"
                                onClick={() => setShowPrincipalPassword(!showPrincipalPassword)}
                                tabIndex={-1}
                                aria-label="Toggle password visibility"
                              >
                                {showPrincipalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            {formErrors.principalPassword && (
                              <span className="reg-error-text">{formErrors.principalPassword}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="reg-actions-row">
                  <button type="button" className="btn-reg-secondary" onClick={() => navigate('/login')}>
                    Already Registered? Login
                  </button>
                  <button type="submit" className="btn-reg-primary">
                    <span>Select Subscription Plan</span>
                    <ArrowRight size={18} />
                  </button>
                </div>

                {/* Dedicated Tenant footnote */}
                <div className="reg-security-footnote">
                  <ShieldCheck size={15} color="#059669" />
                  <span>Each institution receives an isolated database tenant with dedicated credentials.</span>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP 2: SUBSCRIPTION PLAN SELECTION ────────────────── */}
        {currentStep === 2 && (
          <div className="client-reg-card">
            <div className="client-reg-card-header">
              <h1 className="client-reg-card-title">Select Your Subscription Plan</h1>
              <p className="client-reg-card-subtitle">
                Choose the best package for <strong>{formData.collegeName || 'your institution'}</strong>. All client subscriptions are securely recorded and managed under Super Admin oversight.
              </p>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="billing-cycle-toggle-wrap">
              <button
                type="button"
                className={`billing-cycle-btn ${billingCycle === 'Monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('Monthly')}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                className={`billing-cycle-btn ${billingCycle === 'Annually' ? 'active' : ''}`}
                onClick={() => setBillingCycle('Annually')}
              >
                <span>Annual Billing</span>
                <span className="save-discount-badge">Save 20%</span>
              </button>
            </div>

            {/* Plans Grid */}
            <div className="plans-grid">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const price = billingCycle === 'Annually' ? plan.annualPrice : plan.monthlyPrice;

                return (
                  <div
                    key={plan.id}
                    className={`plan-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    {plan.isPopular && <div className="plan-badge-top">Recommended</div>}

                    <div className="plan-header">
                      <div className="plan-name-wrap">
                        <span className="plan-name">{plan.name}</span>
                        <span className={`plan-status-badge ${plan.id === 'Trial' ? 'active' : 'pending'}`}>
                          {plan.id === 'Trial' ? 'Active Trial' : 'Pending Approval'}
                        </span>
                      </div>

                      <div className="plan-price-row">
                        <span className="plan-price">
                          {price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                        </span>
                        {price > 0 && (
                          <span className="plan-period">
                            /{billingCycle === 'Annually' ? 'yr' : 'mo'}
                          </span>
                        )}
                      </div>

                      <p className="plan-desc">{plan.desc}</p>
                    </div>

                    <ul className="plan-features-list">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="plan-feature-item">
                          <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="plan-select-radio">
                      <input
                        type="radio"
                        name="planChoice"
                        checked={isSelected}
                        onChange={() => setSelectedPlanId(plan.id)}
                        style={{ accentColor: '#4f46e5' }}
                      />
                      <span>{isSelected ? 'Selected Plan' : 'Select Plan'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Summary Banner */}
            <div className="selected-plan-banner">
              <div>
                <span className="banner-sub-label">
                  Selected Plan
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                  <strong className="banner-title">
                    {selectedPlanObj.name} ({billingCycle})
                  </strong>
                  <span className="banner-badge">
                    {activePlanPrice === 0 ? '₹0 (Free)' : `₹${activePlanPrice.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="banner-sub-label">Status on Registration:</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span className="status-badge-inline pending-approval">
                    Subscription: Pending Approval
                  </span>
                  <span className="status-badge-inline pending-payment">
                    Payment: Pending Verification
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="reg-actions-row">
              <button
                type="button"
                className="btn-reg-secondary"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
              >
                <ArrowLeft size={18} />
                <span>Back to Details</span>
              </button>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {activePlanPrice > 0 && (
                  <button
                    type="button"
                    className="btn-reg-secondary"
                    onClick={() => handleFinalSubmit(true)}
                    disabled={loading}
                    style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                  >
                    <CreditCard size={18} />
                    <span>Pay Online (Razorpay)</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-reg-primary"
                  onClick={() => handleFinalSubmit(false)}
                  disabled={loading}
                >
                  {loading ? (
                    'Processing Registration...'
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>
                        {activePlanPrice === 0 ? 'Activate Free Trial' : 'Submit Registration (Pending Payment)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: REGISTRATION CONFIRMATION / SUCCESS ────────── */}
        {currentStep === 3 && registrationResult && (
          <div className="client-reg-card success-screen-card">
            <div className="success-badge-icon">
              <CheckCircle2 size={40} />
            </div>

            <h1 className="client-reg-card-title">Registration Submitted!</h1>

            <div className="success-tenant-pill">
              <span>TENANT ID: {registrationResult.tenantId}</span>
            </div>

            <p className="client-reg-card-subtitle">
              Your college record for <strong>{registrationResult.collegeName}</strong> has been created in the system.
            </p>

            {/* Registration Summary Details */}
            <div className="success-summary-box">
              <div className="summary-row">
                <span className="summary-label">College / Institution</span>
                <span className="summary-val">{registrationResult.collegeName}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Administrator Account</span>
                <span className="summary-val">{registrationResult.adminName}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Registered Admin Email</span>
                <span className="summary-val">{registrationResult.email}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Selected Plan</span>
                <span className="summary-val">
                  {registrationResult.subscriptionPlan} ({registrationResult.billingCycle})
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Subscription Status</span>
                <span className="summary-val">
                  <span className={`status-badge-inline ${registrationResult.subscriptionStatus === 'Active' ? 'active' : 'pending-approval'}`}>
                    {registrationResult.subscriptionStatus}
                  </span>
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Payment Status</span>
                <span className="summary-val">
                  <span className={`status-badge-inline ${registrationResult.paymentStatus === 'Paid' ? 'paid' : 'pending-payment'}`}>
                    {registrationResult.paymentStatus}
                  </span>
                </span>
              </div>
            </div>

            {/* Informational Guidance Notice */}
            <div className="info-notice-banner">
              <Info size={22} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '4px', fontWeight: 800 }}>
                  Super Admin Authorization &amp; Access Policy
                </strong>
                <span>
                  All client registrations and subscription activations are managed exclusively via the{' '}
                  <strong>Super Admin Dashboard</strong>. To maintain multi-tenant security, newly registered accounts are pending approval until authorized.
                </span>
              </div>
            </div>

            {/* Action Routing */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              {isSuperAdminSession ? (
                <button
                  type="button"
                  className="btn-reg-primary"
                  onClick={() => navigate('/superadmin/subscriptions')}
                >
                  <Crown size={18} />
                  <span>Open Super Admin Subscriptions</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-reg-primary"
                    onClick={() => navigate('/login?role=Admin')}
                  >
                    <span>Proceed to Login</span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn-reg-secondary"
                    onClick={() => navigate('/')}
                  >
                    <span>Return to Home</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GetAccess;
