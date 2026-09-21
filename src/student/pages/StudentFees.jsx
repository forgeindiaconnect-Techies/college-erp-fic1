import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, DollarSign, CheckCircle2, AlertTriangle, ArrowLeft,
  RefreshCw, X, Receipt, Award, Layers, Download, Printer, ShieldCheck,
  Calendar, Clock, Building2, User, Sparkles, FileText, Check, ChevronRight,
  TrendingUp, HelpCircle, ArrowUpRight, Lock, QrCode, AlertCircle, PieChart as PieIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { getFeesByStudent, updateFee, createFee, getStudentFeeStructure } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentFees.css';

const DEFAULT_STUDENT = {
  id: '',
  name: 'Student',
  dept: '',
  sem: 'Semester 1',
  email: ''
};

const CHART_COLORS = ['#3730A5', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

const StudentFees = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);

  // Active Tab
  const [activeTab, setActiveTab] = useState('statement'); // 'statement' | 'transactions' | 'scholarships' | 'installments'

  // Dynamic fee data
  const [feeStatus, setFeeStatus] = useState('Pending');
  const [feeRecord, setFeeRecord] = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [scholarship, setScholarship] = useState(null);

  // Payment checkout modal state
  const [payOpen, setPayOpen] = useState(false);
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [success, setSuccess] = useState(false);

  // Receipt & Certificate modal state
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Search & filter for transactions
  const [searchTxn, setSearchTxn] = useState('');

  const loadFees = useCallback(async (isManualRefresh = false) => {
    const session = sessionStorage.getItem('student_session');
    let activeStud = DEFAULT_STUDENT;
    if (session) {
      try {
        activeStud = JSON.parse(session);
        setStudentSession(activeStud);
      } catch (e) {
        console.error('Error parsing student session', e);
      }
    } else {
      navigate('/student/login');
      return;
    }

    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const studentIdentifier = activeStud.id || activeStud.referenceId || activeStud.studentId || activeStud._id || activeStud.name;
      const res = await getFeesByStudent(studentIdentifier);
      const feesList = res?.data || [];

      // Also fetch structured fee breakdown
      try {
        const structRes = await getStudentFeeStructure(studentIdentifier);
        if (structRes?.data) {
          setFeeStructure(structRes.data);
        }
      } catch (e) {
        console.error('Error fetching student fee structure:', e);
      }

      if (feesList.length > 0) {
        const activeFee = feesList[0];
        setFeeRecord(activeFee);
        setFeeStatus(activeFee.status || 'Pending');

        const netFee = Number(
          activeFee.finalFee !== undefined && activeFee.finalFee !== null && activeFee.finalFee > 0
            ? activeFee.finalFee
            : Math.max(0, (activeFee.normalFee || activeFee.totalFees || 0) - (Number(activeFee.discountAmount || 0) + Number(activeFee.scholarshipAmount || 0)))
        );

        const paid = Number(activeFee.paidAmount || 0);
        const pendingDue = Number(
          activeFee.pendingAmount !== undefined && activeFee.pendingAmount !== null
            ? activeFee.pendingAmount
            : (activeFee.remainingFee !== undefined ? activeFee.remainingFee : Math.max(0, netFee - paid))
        );

        setInvoiceAmount(pendingDue);

        if (Number(activeFee.scholarshipAmount) > 0) {
          setScholarship({
            type: activeFee.scholarshipName || 'Merit Scholarship Scheme',
            amount: Number(activeFee.scholarshipAmount),
            sanctionNo: `SCH-${activeFee._id ? activeFee._id.slice(-6).toUpperCase() : 'SAN-2026'}`,
            date: activeFee.createdAt ? new Date(activeFee.createdAt).toLocaleDateString('en-IN') : '10 Aug 2026',
            status: 'Approved & Credited'
          });
        } else {
          setScholarship(null);
        }
      } else {
        // Check structure if no fees exist yet
        try {
          const structRes = await getStudentFeeStructure(studentIdentifier);
          if (structRes?.data) {
            const baseAmt = Number(structRes.data.totalAmount || structRes.data.tuitionFee || 0);
            setInvoiceAmount(baseAmt);
            setFeeStatus(baseAmt === 0 ? 'Paid' : 'Pending');
            if (Number(structRes.data.scholarshipAmount) > 0) {
              setScholarship({
                type: structRes.data.scholarshipName || 'Scholarship Scheme',
                amount: Number(structRes.data.scholarshipAmount),
                sanctionNo: 'SCH-GEN-2026',
                date: '10 Aug 2026',
                status: 'Approved & Credited'
              });
            }
          }
        } catch (e) {
          console.error('Fallback fee structure error:', e);
        }
      }
      setLastSyncedTime(new Date());
    } catch (err) {
      console.error('Failed to load backend student fees:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  // Real-time synchronization
  useRealtimeSync(loadFees, ['fees', 'scholarships', 'welfare', 'feeStructure', 'admissions', 'students']);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  // Derived financial figures
  const grossFee = Number(feeRecord?.normalFee || feeRecord?.totalFees || feeStructure?.totalAmount || invoiceAmount || 58000);
  const quotaDiscount = Number(feeRecord?.discountAmount || 0);
  const scholarshipDiscount = Number(feeRecord?.scholarshipAmount || (scholarship?.amount || 0));
  const totalConcessions = quotaDiscount + scholarshipDiscount;
  const netPayable = Number(feeRecord?.finalFee || Math.max(0, grossFee - totalConcessions));
  const paidAmount = Number(feeRecord?.paidAmount || 0);
  const balanceDue = Number(
    feeRecord?.pendingAmount !== undefined
      ? feeRecord?.pendingAmount
      : (feeRecord?.remainingFee !== undefined ? feeRecord?.remainingFee : Math.max(0, netPayable - paidAmount))
  );

  const isFullyPaid = feeStatus === 'Paid' || balanceDue === 0;
  const paymentProgressPercent = netPayable > 0 ? Math.min(100, Math.round((paidAmount / netPayable) * 100)) : (isFullyPaid ? 100 : 0);

  // Breakdown items for the ledger
  const breakdownItems = useMemo(() => {
    if (feeStructure) {
      const items = [];
      if (feeStructure.tuitionFee) items.push({ name: 'Tuition Fee (Core Academic)', amount: Number(feeStructure.tuitionFee), code: 'TUI-101' });
      if (feeStructure.admissionFee) items.push({ name: 'Admission & Registration Fee', amount: Number(feeStructure.admissionFee), code: 'ADM-102' });
      if (feeStructure.universityFee) items.push({ name: 'University Examination & Assessment', amount: Number(feeStructure.universityFee), code: 'UNI-103' });
      if (feeStructure.specialFee) items.push({ name: 'Special Academic & Lab Training', amount: Number(feeStructure.specialFee), code: 'SPC-104' });
      if (feeStructure.computerLab) items.push({ name: 'Computer & Cloud Lab Infra Fee', amount: Number(feeStructure.computerLab), code: 'LAB-105' });
      if (feeStructure.libraryFee) items.push({ name: 'Digital Library & Journal Access', amount: Number(feeStructure.libraryFee), code: 'LIB-106' });
      if (feeStructure.stationary) items.push({ name: 'Curriculum & Stationary Kit', amount: Number(feeStructure.stationary), code: 'STN-107' });
      if (feeStructure.pta) items.push({ name: 'Student Welfare & PTA Fund', amount: Number(feeStructure.pta), code: 'PTA-108' });
      if (feeStructure.transportFee) items.push({ name: 'Campus Transport Services', amount: Number(feeStructure.transportFee), code: 'TRN-109' });
      if (feeStructure.hostelFee) items.push({ name: 'Campus Residential / Hostel Dues', amount: Number(feeStructure.hostelFee), code: 'HST-110' });
      if (feeStructure.otherFee) items.push({ name: 'Development & Amenities Fee', amount: Number(feeStructure.otherFee), code: 'OTH-111' });
      if (items.length > 0) return items;
    }
    // Standard default breakdown
    return [
      { name: 'Tuition Fee (Core Academic Curriculum)', amount: Math.round(grossFee * 0.65), code: 'TUI-101' },
      { name: 'Computer Lab & Research Facility', amount: Math.round(grossFee * 0.12), code: 'LAB-105' },
      { name: 'University Examination & Assessment', amount: Math.round(grossFee * 0.08), code: 'UNI-103' },
      { name: 'Digital Library & E-Learning Portal', amount: Math.round(grossFee * 0.05), code: 'LIB-106' },
      { name: 'Campus Amenities & Development Fund', amount: Math.round(grossFee * 0.06), code: 'OTH-111' },
      { name: 'Student Welfare & PTA Membership', amount: Math.round(grossFee * 0.04), code: 'PTA-108' }
    ];
  }, [feeStructure, grossFee]);

  // Chart data
  const pieChartData = useMemo(() => {
    return breakdownItems.map(item => ({
      name: item.name.split(' (')[0],
      value: item.amount
    }));
  }, [breakdownItems]);

  // Transactions list
  const transactions = useMemo(() => {
    const list = [];
    if (feeRecord?.payments && Array.isArray(feeRecord.payments) && feeRecord.payments.length > 0) {
      feeRecord.payments.forEach((p, idx) => {
        list.push({
          receiptNo: p.id || p.receiptNo || `REC-ERP-${String(idx + 1).padStart(4, '0')}`,
          date: p.date ? new Date(p.date).toISOString().split('T')[0] : '2026-09-19',
          amount: Number(p.amount || 0),
          mode: p.mode || 'Online',
          status: 'Settled & Verified',
          bankRef: p.bankRef || `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          remarks: 'Semester Fee Settlement via ERP Gateway'
        });
      });
    } else if (paidAmount > 0) {
      list.push({
        receiptNo: feeRecord?.receiptNo || `REC-${(studentSession.id || 'CS2022001').replace(/\D/g, '') || '1789816642652'}`,
        date: feeRecord?.paymentDate ? new Date(feeRecord.paymentDate).toISOString().split('T')[0] : '2026-09-19',
        amount: paidAmount,
        mode: feeRecord?.paymentMode || 'Online (Cash / Counter)',
        status: 'Settled & Verified',
        bankRef: 'UTR-ERP-DIRECT-SETTLED',
        remarks: 'Direct Ledger Credit Recorded by Accounts Office'
      });
    }
    return list;
  }, [feeRecord, paidAmount, studentSession]);

  const filteredTransactions = useMemo(() => {
    if (!searchTxn) return transactions;
    const q = searchTxn.toLowerCase();
    return transactions.filter(t => 
      t.receiptNo.toLowerCase().includes(q) ||
      t.mode.toLowerCase().includes(q) ||
      t.bankRef.toLowerCase().includes(q) ||
      String(t.amount).includes(q)
    );
  }, [transactions, searchTxn]);

  // Handle Pay Submit
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setIsProcessingPay(true);

    const payAmt = customPayAmount ? Number(customPayAmount) : (balanceDue > 0 ? balanceDue : netPayable);
    if (payAmt <= 0) {
      alert('Please enter a valid payment amount.');
      setIsProcessingPay(false);
      return;
    }

    const txnDate = new Date().toISOString().split('T')[0];
    const txnRef = `REC-ERP-${Date.now().toString().slice(-6)}`;
    const bankUtr = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    const paymentObj = {
      id: txnRef,
      receiptNo: txnRef,
      date: txnDate,
      amount: payAmt,
      mode: paymentMethod || 'Online Gateway',
      bankRef: bankUtr,
      status: 'Paid'
    };

    try {
      if (feeRecord && (feeRecord._id || feeRecord.id)) {
        const idToUpdate = feeRecord._id || feeRecord.id;
        const currentPayments = Array.isArray(feeRecord.payments) ? feeRecord.payments : [];
        const newPaidTotal = Number(feeRecord.paidAmount || 0) + payAmt;
        const targetTotal = Number(feeRecord.finalFee || feeRecord.totalFees || netPayable || payAmt);
        const newPending = Math.max(0, targetTotal - newPaidTotal);

        await updateFee(idToUpdate, {
          totalFees: targetTotal,
          status: newPending === 0 ? 'Paid' : 'Partial',
          paidAmount: newPaidTotal,
          pendingAmount: newPending,
          remainingFee: newPending,
          paymentDate: new Date().toISOString(),
          paymentMode: paymentMethod || 'Online',
          receiptNo: txnRef,
          payments: [...currentPayments, paymentObj]
        });
      } else {
        await createFee({
          studentId: studentSession.id || studentSession.referenceId || studentSession._id,
          studentName: studentSession.name,
          department: studentSession.dept,
          semester: studentSession.sem,
          normalFee: grossFee,
          totalFees: grossFee,
          finalFee: netPayable,
          discountAmount: quotaDiscount,
          scholarshipAmount: scholarshipDiscount,
          paidAmount: payAmt,
          pendingAmount: Math.max(0, netPayable - payAmt),
          remainingFee: Math.max(0, netPayable - payAmt),
          status: (netPayable - payAmt) <= 0 ? 'Paid' : 'Partial',
          paymentDate: new Date().toISOString(),
          paymentMode: paymentMethod || 'Online',
          receiptNo: txnRef,
          payments: [paymentObj]
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setIsProcessingPay(false);
        setPayOpen(false);
        setSuccess(false);
        setCustomPayAmount('');
        loadFees();
      }, 1200);
    } catch (err) {
      console.error('Payment execution error:', err);
      setIsProcessingPay(false);
      alert('Payment processing failed. Please try again.');
    }
  };

  const handlePrintReceipt = (receipt) => {
    setSelectedReceipt(receipt);
  };

  return (
    <div className="student-fees-page animate-fade-in">
      {/* ── Enterprise Real-Time Header Bar ── */}
      <div className="erp-finance-header-card">
        <div className="erp-header-main">
          <div className="erp-header-title-area">
            <div className="erp-badge-pill">
              <span className="live-pulse-dot"></span>
              <span>Real-Time ERP Ledger Sync Active</span>
            </div>
            <h1>Tuition & Financial Management</h1>
            <p className="erp-subtext">
              Real-time student fee ledger, verified scholarship allocations, payment gateway, and official ERP receipts.
            </p>
          </div>

          <div className="erp-header-actions">
            <button 
              className={`btn-erp-refresh ${refreshing ? 'spinning' : ''}`}
              onClick={() => loadFees(true)}
              title="Sync with central ERP ledger"
            >
              <RefreshCw size={15} />
              <span>{refreshing ? 'Syncing...' : 'Sync Ledger'}</span>
            </button>

            {isFullyPaid ? (
              <button 
                className="btn-erp-action success"
                onClick={() => setShowCertificateModal(true)}
              >
                <ShieldCheck size={16} />
                <span>No-Dues Certificate</span>
              </button>
            ) : (
              <button 
                className="btn-erp-action primary"
                onClick={() => { setCustomPayAmount(''); setPayOpen(true); }}
              >
                <CreditCard size={16} />
                <span>Pay Dues (₹{balanceDue.toLocaleString('en-IN')})</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Session Metadata Bar */}
        <div className="erp-student-meta-strip">
          <div className="meta-item">
            <User size={14} className="meta-icon" />
            <span className="meta-label">Student:</span>
            <strong className="meta-value">{studentSession.name} ({studentSession.id || 'CS2022001'})</strong>
          </div>
          <div className="meta-item">
            <Building2 size={14} className="meta-icon" />
            <span className="meta-label">Department:</span>
            <strong className="meta-value">{studentSession.dept || 'Computer Science'}</strong>
          </div>
          <div className="meta-item">
            <Calendar size={14} className="meta-icon" />
            <span className="meta-label">Academic Term:</span>
            <strong className="meta-value">{studentSession.sem || 'Semester 1'} • 2026-2027</strong>
          </div>
          <div className="meta-item">
            <Clock size={14} className="meta-icon" />
            <span className="meta-label">Last Synced:</span>
            <span className="meta-value text-muted">{lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* ── KPI Financial Metric Cards Grid ── */}
      <div className="erp-kpi-grid">
        {/* Card 1: Gross Assessment */}
        <div className="erp-kpi-card">
          <div className="kpi-icon-wrap blue">
            <FileText size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Standard Gross Fee</span>
            <h3 className="kpi-value">₹{grossFee.toLocaleString('en-IN')}</h3>
            <span className="kpi-sub info">Institutional Assessment</span>
          </div>
        </div>

        {/* Card 2: Concessions & Scholarships */}
        <div className="erp-kpi-card">
          <div className="kpi-icon-wrap purple">
            <Award size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Sanctioned Concessions</span>
            <h3 className="kpi-value text-purple">-₹{totalConcessions.toLocaleString('en-IN')}</h3>
            <span className="kpi-sub success">
              {totalConcessions > 0 ? 'Scholarship & Quota applied' : 'No waivers applied'}
            </span>
          </div>
        </div>

        {/* Card 3: Net Payable */}
        <div className="erp-kpi-card">
          <div className="kpi-icon-wrap indigo">
            <DollarSign size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Final Net Assessment</span>
            <h3 className="kpi-value">₹{netPayable.toLocaleString('en-IN')}</h3>
            <span className="kpi-sub text-muted">Payable for Current Semester</span>
          </div>
        </div>

        {/* Card 4: Total Paid to Date */}
        <div className="erp-kpi-card">
          <div className="kpi-icon-wrap green">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label-row">
              <span className="kpi-label">Total Paid to Date</span>
              <span className="kpi-tag-success">{paymentProgressPercent}% Paid</span>
            </div>
            <h3 className="kpi-value text-success">₹{paidAmount.toLocaleString('en-IN')}</h3>
            <div className="erp-mini-progress">
              <div 
                className="erp-mini-progress-bar" 
                style={{ width: `${paymentProgressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 5: Net Outstanding Due */}
        <div className={`erp-kpi-card highlight ${isFullyPaid ? 'cleared' : (paidAmount > 0 ? 'partial' : 'due')}`}>
          <div className={`kpi-icon-wrap ${isFullyPaid ? 'green' : 'amber'}`}>
            {isFullyPaid ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="kpi-content">
            <div className="kpi-label-row">
              <span className="kpi-label">Outstanding Balance</span>
              <span className={`kpi-status-pill ${isFullyPaid ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending')}`}>
                {isFullyPaid ? 'CLEARED' : (paidAmount > 0 ? 'PARTIAL' : 'PAYMENT DUE')}
              </span>
            </div>
            <h3 className="kpi-value">{isFullyPaid ? '₹0' : `₹${balanceDue.toLocaleString('en-IN')}`}</h3>
            <span className="kpi-sub">
              {isFullyPaid ? 'All Semester Dues Cleared' : `Due by 30th Sept 2026`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Enterprise Navigation Tabs ── */}
      <div className="erp-tabs-nav-container">
        <div className="erp-tabs-nav">
          <button 
            className={`erp-tab-btn ${activeTab === 'statement' ? 'active' : ''}`}
            onClick={() => setActiveTab('statement')}
          >
            <Layers size={16} />
            <span>Active Statement & Fee Breakdown</span>
          </button>
          <button 
            className={`erp-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <Receipt size={16} />
            <span>Official Receipts & Transactions ({transactions.length})</span>
          </button>
          <button 
            className={`erp-tab-btn ${activeTab === 'scholarships' ? 'active' : ''}`}
            onClick={() => setActiveTab('scholarships')}
          >
            <Award size={16} />
            <span>Scholarships & Welfare</span>
            {scholarship && <span className="tab-badge-pulse">1</span>}
          </button>
          <button 
            className={`erp-tab-btn ${activeTab === 'installments' ? 'active' : ''}`}
            onClick={() => setActiveTab('installments')}
          >
            <Calendar size={16} />
            <span>Installment Schedule & Policy</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: Statement & Breakdown ── */}
      {activeTab === 'statement' && (
        <div className="tab-content-wrapper">
          <div className="erp-statement-grid">
            {/* Left Column: Itemized Ledger Breakdown Table */}
            <div className="erp-card-box">
              <div className="card-box-header">
                <div>
                  <h3>Itemized Fee Assessment Ledger</h3>
                  <p className="text-muted text-xs">Official institutional semester fee components verified by Accounts & Examination branch.</p>
                </div>
                <button 
                  className="btn-ghost-sm"
                  onClick={() => window.print()}
                  title="Print Statement"
                >
                  <Printer size={14} /> Print Statement
                </button>
              </div>

              <div className="table-responsive-erp">
                <table className="erp-ledger-table">
                  <thead>
                    <tr>
                      <th>Component Code</th>
                      <th>Fee Head & Description</th>
                      <th>Category</th>
                      <th className="text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownItems.map((item, idx) => (
                      <tr key={idx}>
                        <td><span className="code-pill">{item.code}</span></td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td><span className="category-tag">Institutional</span></td>
                        <td className="text-right font-semibold">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    
                    {/* Gross Subtotal */}
                    <tr className="subtotal-row">
                      <td colSpan={3}><strong>Gross Academic Assessment</strong></td>
                      <td className="text-right"><strong>₹{grossFee.toLocaleString('en-IN')}</strong></td>
                    </tr>

                    {/* Deductions / Concessions */}
                    {quotaDiscount > 0 && (
                      <tr className="discount-row">
                        <td><span className="code-pill green">QUOTA-VER</span></td>
                        <td colSpan={2}>
                          <span className="text-success font-medium">Quota Concession ({feeRecord?.quotaName || 'Applied Management/Sports Quota'})</span>
                        </td>
                        <td className="text-right text-success font-bold">-₹{quotaDiscount.toLocaleString('en-IN')}</td>
                      </tr>
                    )}

                    {scholarshipDiscount > 0 && (
                      <tr className="discount-row">
                        <td><span className="code-pill purple">SCHOLAR-VER</span></td>
                        <td colSpan={2}>
                          <span className="text-purple font-medium">Approved Scholarship Scheme ({scholarship?.type || 'Merit Scholarship'})</span>
                        </td>
                        <td className="text-right text-purple font-bold">-₹{scholarshipDiscount.toLocaleString('en-IN')}</td>
                      </tr>
                    )}

                    {/* Final Net Payable */}
                    <tr className="net-total-row">
                      <td colSpan={3}>
                        <div>
                          <strong>Total Net Payable Fee</strong>
                          <span className="net-sub-text">Inclusive of all verified deductions & waivers</span>
                        </div>
                      </td>
                      <td className="text-right net-price">₹{netPayable.toLocaleString('en-IN')}</td>
                    </tr>

                    {/* Paid & Balance */}
                    <tr className="paid-summary-row">
                      <td colSpan={3} className="text-muted">Total Amount Paid into College ERP</td>
                      <td className="text-right text-success font-bold">₹{paidAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="balance-summary-row">
                      <td colSpan={3}>
                        <strong>Remaining Outstanding Balance Due</strong>
                      </td>
                      <td className={`text-right font-extrabold balance-amt ${isFullyPaid ? 'text-success' : 'text-danger'}`}>
                        ₹{balanceDue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Settlement Banner / Pay CTA */}
              <div className="erp-ledger-footer-cta">
                {!isFullyPaid ? (
                  <div className="due-action-box">
                    <div className="due-info">
                      <AlertCircle size={24} className="text-warning" />
                      <div>
                        <h4>Outstanding Fee Payment Due</h4>
                        <p>Pending balance of <strong>₹{balanceDue.toLocaleString('en-IN')}</strong> is due for immediate settlement.</p>
                      </div>
                    </div>
                    <button 
                      className="btn-pay-now-primary"
                      onClick={() => { setCustomPayAmount(''); setPayOpen(true); }}
                    >
                      <CreditCard size={18} /> Pay Online Now (₹{balanceDue.toLocaleString('en-IN')})
                    </button>
                  </div>
                ) : (
                  <div className="cleared-action-box">
                    <div className="cleared-info">
                      <CheckCircle2 size={26} className="text-success" />
                      <div>
                        <h4>All Academic Semester Dues Cleared</h4>
                        <p>Your fee ledger is in full compliance. You are eligible for Hall Ticket download & semester examinations.</p>
                      </div>
                    </div>
                    <button 
                      className="btn-cert-download"
                      onClick={() => setShowCertificateModal(true)}
                    >
                      <Award size={16} /> View No-Dues Clearance
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Visual Component Analytics & Quick Info */}
            <div className="erp-side-column">
              {/* Fee Component Chart Box */}
              <div className="erp-card-box">
                <div className="card-box-header">
                  <h3>Fee Composition Analytics</h3>
                </div>
                <div className="chart-container-erp">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend-grid">
                  {pieChartData.slice(0, 4).map((entry, idx) => (
                    <div key={idx} className="legend-item">
                      <span className="legend-dot" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                      <span className="legend-label">{entry.name}</span>
                      <span className="legend-val">₹{entry.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant Online Payment Quick Card */}
              {!isFullyPaid && (
                <div className="erp-card-box quick-pay-box">
                  <div className="quick-pay-header">
                    <Sparkles size={18} className="text-amber" />
                    <h4>Fast UPI / Net Banking Checkout</h4>
                  </div>
                  <p className="text-muted text-xs">
                    Pay securely using UPI QR, Cards, or Net Banking. Instant automatic ledger reconciliation.
                  </p>
                  <div className="quick-amount-selector">
                    <button 
                      className="btn-quick-amt"
                      onClick={() => { setCustomPayAmount(String(balanceDue)); setPayOpen(true); }}
                    >
                      Full Due (₹{balanceDue.toLocaleString('en-IN')})
                    </button>
                    {balanceDue > 10000 && (
                      <button 
                        className="btn-quick-amt secondary"
                        onClick={() => { setCustomPayAmount(String(Math.round(balanceDue / 2))); setPayOpen(true); }}
                      >
                        50% Partial (₹{Math.round(balanceDue / 2).toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Verified Scholarship Card */}
              {scholarship && (
                <div className="erp-card-box scholarship-widget">
                  <div className="scholar-header">
                    <div className="scholar-icon-circle">
                      <Award size={20} />
                    </div>
                    <div>
                      <h4>{scholarship.type}</h4>
                      <span className="scholar-badge">Verified Institutional Sanction</span>
                    </div>
                  </div>
                  <div className="scholar-details-grid">
                    <div className="s-detail">
                      <span className="s-label">Sanction Amount:</span>
                      <strong className="s-val text-purple">₹{Number(scholarship.amount).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="s-detail">
                      <span className="s-label">Sanction Reference:</span>
                      <strong className="s-val">{scholarship.sanctionNo}</strong>
                    </div>
                    <div className="s-detail">
                      <span className="s-label">Status:</span>
                      <span className="s-status-tag">Credited to Ledger</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Receipts & Transactions ── */}
      {activeTab === 'transactions' && (
        <div className="tab-content-wrapper animate-fade-in">
          <div className="erp-card-box">
            <div className="card-box-header">
              <div>
                <h3>Official ERP Fee Receipts & Transaction Audit Ledger</h3>
                <p className="text-muted text-xs">All digitized receipts recorded in the central college ledger with digital verification signatures.</p>
              </div>
              <div className="search-bar-wrap">
                <input 
                  type="text" 
                  placeholder="Search receipt ID, UTR, or mode..." 
                  value={searchTxn}
                  onChange={(e) => setSearchTxn(e.target.value)}
                  className="search-input-erp"
                />
              </div>
            </div>

            <div className="table-responsive-erp">
              <table className="erp-ledger-table">
                <thead>
                  <tr>
                    <th>Official Receipt No</th>
                    <th>Payment Date & Time</th>
                    <th>Payment Mode</th>
                    <th>Bank Reference / UTR</th>
                    <th>Ledger Status</th>
                    <th className="text-right">Amount Paid</th>
                    <th className="text-center">Official Voucher</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((txn, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="receipt-cell">
                            <Receipt size={16} className="text-primary" />
                            <strong>{txn.receiptNo}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="text-muted text-sm">{txn.date}</span>
                        </td>
                        <td>
                          <span className="mode-badge">{txn.mode}</span>
                        </td>
                        <td>
                          <span className="utr-code">{txn.bankRef}</span>
                        </td>
                        <td>
                          <span className="status-badge-verified">
                            <ShieldCheck size={13} /> Settled in ERP
                          </span>
                        </td>
                        <td className="text-right font-extrabold text-success text-base">
                          ₹{txn.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="text-center">
                          <button 
                            className="btn-print-voucher"
                            onClick={() => handlePrintReceipt(txn)}
                          >
                            <Printer size={14} /> View & Print
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted">
                        <Receipt size={36} className="mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No payment transactions found in ledger.</p>
                        <p className="text-xs">Once payments are recorded, official stamped receipts will appear here.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Scholarships & Welfare ── */}
      {activeTab === 'scholarships' && (
        <div className="tab-content-wrapper animate-fade-in">
          <div className="erp-card-box">
            <div className="card-box-header">
              <div>
                <h3>Sanctioned Scholarships & Welfare Concessions</h3>
                <p className="text-muted text-xs">Official institutional, state government, and merit welfare sanctions assigned to your student profile.</p>
              </div>
            </div>

            {scholarship || quotaDiscount > 0 ? (
              <div className="scholarships-display-grid">
                {scholarship && (
                  <div className="scholarship-master-card">
                    <div className="scholar-card-top">
                      <div className="scholar-badge-icon">
                        <Award size={28} />
                      </div>
                      <div className="scholar-top-text">
                        <span className="scholar-type-pill">Merit Scheme</span>
                        <h3>{scholarship.type}</h3>
                        <p className="text-muted text-xs">Awarded for Academic Excellence & Standard Semester Eligibility</p>
                      </div>
                      <div className="scholar-amount-block">
                        <span className="scholar-amount-label">Direct Ledger Credit</span>
                        <h2 className="scholar-amount-val">₹{Number(scholarship.amount).toLocaleString('en-IN')}</h2>
                      </div>
                    </div>

                    <div className="scholar-meta-grid">
                      <div className="meta-box">
                        <span className="meta-label">Sanction Letter ID</span>
                        <strong className="meta-val">{scholarship.sanctionNo}</strong>
                      </div>
                      <div className="meta-box">
                        <span className="meta-label">Awarding Body</span>
                        <strong className="meta-val">Academic & Welfare Senate</strong>
                      </div>
                      <div className="meta-box">
                        <span className="meta-label">Disbursement Channel</span>
                        <strong className="meta-val">Auto-Adjusted in Semester Fee</strong>
                      </div>
                      <div className="meta-box">
                        <span className="meta-label">Verification Seal</span>
                        <strong className="meta-val text-success">✓ Verified & Approved</strong>
                      </div>
                    </div>
                  </div>
                )}

                {quotaDiscount > 0 && (
                  <div className="scholarship-master-card quota">
                    <div className="scholar-card-top">
                      <div className="scholar-badge-icon quota">
                        <Layers size={28} />
                      </div>
                      <div className="scholar-top-text">
                        <span className="scholar-type-pill green">Category Concession</span>
                        <h3>{feeRecord?.quotaName || 'Institutional Category Quota'}</h3>
                        <p className="text-muted text-xs">Sanctioned fee concession granted at the time of admission enrollment.</p>
                      </div>
                      <div className="scholar-amount-block">
                        <span className="scholar-amount-label">Waiver Applied</span>
                        <h2 className="scholar-amount-val text-success">₹{quotaDiscount.toLocaleString('en-IN')}</h2>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state-box py-8 text-center">
                <Award size={48} className="mx-auto text-muted opacity-40 mb-3" />
                <h4>No Active Scholarships Linked</h4>
                <p className="text-muted text-xs max-w-md mx-auto">
                  You are currently paying standard tuition. If you have been awarded an external or government scholarship, submit your sanction letter to the Student Welfare / Accounts office.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: Installments & Schedule ── */}
      {activeTab === 'installments' && (
        <div className="tab-content-wrapper animate-fade-in">
          <div className="erp-card-box">
            <div className="card-box-header">
              <div>
                <h3>Semester Fee Installment Plan & Payment Deadlines</h3>
                <p className="text-muted text-xs">Structured academic payment timeline, grace periods, and late surcharge policies.</p>
              </div>
            </div>

            <div className="installments-timeline-grid">
              {/* Installment 1 */}
              <div className="installment-card-box settled">
                <div className="installment-head">
                  <span className="installment-number">Installment 01 / Term A</span>
                  <span className="badge-settled">✓ Settled</span>
                </div>
                <h3 className="inst-amount">₹{Math.round(netPayable * 0.5).toLocaleString('en-IN')}</h3>
                <p className="inst-desc">Includes 50% Tuition Fee + Core Examination & Lab Assessment charges.</p>
                <div className="inst-meta">
                  <span><strong>Due Date:</strong> 15th Aug 2026</span>
                  <span className="text-success"><strong>Status:</strong> Cleared on Schedule</span>
                </div>
              </div>

              {/* Installment 2 */}
              <div className={`installment-card-box ${balanceDue === 0 ? 'settled' : 'active'}`}>
                <div className="installment-head">
                  <span className="installment-number">Installment 02 / Term B</span>
                  <span className={balanceDue === 0 ? 'badge-settled' : 'badge-pending'}>
                    {balanceDue === 0 ? '✓ Settled' : '⚡ Action Required'}
                  </span>
                </div>
                <h3 className="inst-amount">₹{balanceDue.toLocaleString('en-IN')}</h3>
                <p className="inst-desc">Balance semester assessment and student amenities contribution.</p>
                <div className="inst-meta">
                  <span><strong>Due Date:</strong> 30th Sept 2026</span>
                  <span><strong>Grace Period:</strong> Up to 10th Oct 2026 (No Late Fine)</span>
                </div>
                {balanceDue > 0 && (
                  <button 
                    className="btn-inst-pay"
                    onClick={() => { setCustomPayAmount(String(balanceDue)); setPayOpen(true); }}
                  >
                    Pay Term B Installment (₹{balanceDue.toLocaleString('en-IN')})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Official Printable ERP Receipt Modal ── */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-receipt-container" onClick={e => e.stopPropagation()}>
            <div className="modal-receipt-actions">
              <button className="btn-modal-print" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="btn-modal-close" onClick={() => setSelectedReceipt(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="printable-receipt-sheet" id="printableReceiptArea">
              {/* Receipt Header */}
              <div className="receipt-header-branding">
                <div className="receipt-logo-block">
                  <h2>RPSYS INSTITUTE OF TECHNOLOGY & SCIENCE</h2>
                  <p className="receipt-sub-inst">Affiliated with State Technical University • Accredited 'A+' Grade</p>
                  <p className="receipt-sub-inst">College Code: 1042 • Central Accounts & Bursar Division</p>
                </div>
                <div className="receipt-badge-seal">
                  <span className="seal-tag">OFFICIAL E-RECEIPT</span>
                  <span className="seal-ref">{selectedReceipt.receiptNo}</span>
                </div>
              </div>

              <div className="receipt-divider-line"></div>

              {/* Student & Txn Info Grid */}
              <div className="receipt-info-grid">
                <div className="receipt-info-col">
                  <div className="r-row"><span className="r-label">Student Name:</span> <strong>{studentSession.name}</strong></div>
                  <div className="r-row"><span className="r-label">Register / Roll No:</span> <strong>{studentSession.id || 'CS2022001'}</strong></div>
                  <div className="r-row"><span className="r-label">Department:</span> <span>{studentSession.dept || 'Computer Science'}</span></div>
                  <div className="r-row"><span className="r-label">Semester / Term:</span> <span>{studentSession.sem || 'Semester 1'} (2026-2027)</span></div>
                </div>
                <div className="receipt-info-col">
                  <div className="r-row"><span className="r-label">Receipt Date:</span> <strong>{selectedReceipt.date}</strong></div>
                  <div className="r-row"><span className="r-label">Payment Mode:</span> <span>{selectedReceipt.mode}</span></div>
                  <div className="r-row"><span className="r-label">Bank UTR / Ref:</span> <span>{selectedReceipt.bankRef}</span></div>
                  <div className="r-row"><span className="r-label">Ledger Status:</span> <strong className="text-success">Settled & Verified</strong></div>
                </div>
              </div>

              {/* Fee Receipt Items Table */}
              <table className="receipt-items-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Particulars / Fee Head</th>
                    <th>Payment Category</th>
                    <th className="text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>
                      <strong>Tuition & Academic Term Payment</strong>
                      <div className="text-xs text-muted">Settlement towards Semester Fee Schedule</div>
                    </td>
                    <td>Tuition Ledger</td>
                    <td className="text-right font-bold">₹{selectedReceipt.amount.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="total-row-receipt">
                    <td colSpan={3} className="text-right"><strong>Total Amount Received:</strong></td>
                    <td className="text-right font-extrabold text-base">₹{selectedReceipt.amount.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in words & digital signature */}
              <div className="receipt-footer-signatures">
                <div className="amount-in-words">
                  <span className="text-muted text-xs">Payment Verification:</span>
                  <p className="text-xs font-semibold">Digitally generated and verified via Central ERP Financial Gateway. No physical signature required.</p>
                </div>
                <div className="digital-stamp-box">
                  <div className="stamp-circle">
                    <span>ACCOUNTS</span>
                    <strong>VERIFIED</strong>
                    <span>RPSYS ERP</span>
                  </div>
                  <p className="text-xs text-muted text-center mt-1">Authorized Cashier / Finance Officer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Official No-Dues Certificate Modal ── */}
      {showCertificateModal && (
        <div className="modal-overlay" onClick={() => setShowCertificateModal(false)}>
          <div className="modal-receipt-container certificate-view" onClick={e => e.stopPropagation()}>
            <div className="modal-receipt-actions">
              <button className="btn-modal-print" onClick={() => window.print()}>
                <Printer size={16} /> Print Certificate
              </button>
              <button className="btn-modal-close" onClick={() => setShowCertificateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="printable-certificate-sheet">
              <div className="cert-border-frame">
                <div className="cert-header">
                  <Building2 size={36} className="cert-icon" />
                  <h2>RPSYS INSTITUTE OF TECHNOLOGY & SCIENCE</h2>
                  <h4>OFFICE OF THE BURSAR & CONTROLLER OF EXAMINATIONS</h4>
                  <span className="cert-title-badge">NO DUES & FINANCIAL CLEARANCE CERTIFICATE</span>
                </div>

                <div className="cert-body-text">
                  <p>
                    This is to officially certify that <strong>{studentSession.name}</strong>, bearing University Registration No. <strong>{studentSession.id || 'CS2022001'}</strong>, enrolled in the Department of <strong>{studentSession.dept || 'Computer Science'}</strong> for <strong>{studentSession.sem || 'Semester 1'}</strong> (Academic Session 2026-2027), has fully settled and cleared all institutional tuition, laboratory, examination, and hostel fees.
                  </p>
                  <p className="cert-sub-note">
                    There are <strong>NO OUTSTANDING DUES</strong> recorded against this student in the Central College ERP Ledger. The student is unconditionally cleared for semester examination hall tickets and academic progression.
                  </p>
                </div>

                <div className="cert-meta-table">
                  <div className="c-meta-item">
                    <span>Total Assessed Net:</span>
                    <strong>₹{netPayable.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="c-meta-item">
                    <span>Total Amount Paid:</span>
                    <strong className="text-success">₹{paidAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="c-meta-item">
                    <span>Outstanding Balance:</span>
                    <strong>₹0.00 (NIL)</strong>
                  </div>
                  <div className="c-meta-item">
                    <span>Clearance Status:</span>
                    <strong className="text-success">APPROVED</strong>
                  </div>
                </div>

                <div className="cert-signatures">
                  <div className="cert-sig-col">
                    <p className="sig-line"></p>
                    <span>Accounts Officer / Bursar</span>
                  </div>
                  <div className="cert-sig-col center">
                    <div className="cert-seal">
                      <span>ERP SEAL</span>
                      <strong>CLEARED</strong>
                      <span>2026-27</span>
                    </div>
                  </div>
                  <div className="cert-sig-col">
                    <p className="sig-line"></p>
                    <span>Dean of Academic Affairs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Enterprise Checkout & Payment Modal ── */}
      {payOpen && (
        <div className="modal-overlay" onClick={() => setPayOpen(false)}>
          <div className="modal-checkout-card" onClick={e => e.stopPropagation()}>
            <div className="checkout-header">
              <div className="checkout-title-area">
                <div className="lock-icon-badge">
                  <Lock size={16} />
                </div>
                <div>
                  <h3>ERP Secured Payment Gateway</h3>
                  <p className="text-muted text-xs">256-Bit Encrypted Institutional Banking Transaction</p>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setPayOpen(false)}><X size={20} /></button>
            </div>

            {success && (
              <div className="modal-success-banner animate-fade-in">
                <CheckCircle2 size={24} className="text-success" />
                <div>
                  <h4>Payment Verified & Reconciled!</h4>
                  <p>Transaction recorded in real-time ERP ledger. Updating fee statement...</p>
                </div>
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="checkout-form-content">
              {/* Payment Summary Box */}
              <div className="checkout-amount-display">
                <span className="checkout-amt-label">Payable Amount (INR)</span>
                <div className="custom-amt-input-wrap">
                  <span className="currency-symbol">₹</span>
                  <input 
                    type="number"
                    value={customPayAmount || balanceDue}
                    onChange={(e) => setCustomPayAmount(e.target.value)}
                    className="checkout-amt-input"
                    max={balanceDue}
                    min={100}
                    required
                  />
                </div>
                <div className="amt-note">
                  <span>Total Due: ₹{balanceDue.toLocaleString('en-IN')}</span>
                  {customPayAmount && Number(customPayAmount) < balanceDue && (
                    <span className="text-warning">Partial payment of ₹{Number(customPayAmount).toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="payment-channel-select">
                <label className="channel-label">Select Payment Method</label>
                <div className="channel-grid">
                  <button
                    type="button"
                    className={`channel-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('UPI')}
                  >
                    <QrCode size={18} />
                    <span>UPI / QR Code</span>
                  </button>
                  <button
                    type="button"
                    className={`channel-btn ${paymentMethod === 'Card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('Card')}
                  >
                    <CreditCard size={18} />
                    <span>Credit / Debit Card</span>
                  </button>
                  <button
                    type="button"
                    className={`channel-btn ${paymentMethod === 'NetBanking' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('NetBanking')}
                  >
                    <Building2 size={18} />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {/* Method Specific Fields */}
              {paymentMethod === 'UPI' && (
                <div className="method-fields-box">
                  <div className="upi-qr-preview">
                    <div className="qr-box-mock">
                      <QrCode size={100} className="text-primary" />
                      <span className="qr-scan-text">Scan with any UPI App (GPay, PhonePe, Paytm)</span>
                    </div>
                  </div>
                  <div className="form-group-erp">
                    <label>Or enter UPI ID / VPA</label>
                    <input 
                      type="text" 
                      placeholder="e.g. yourname@okaxis" 
                      defaultValue={`${(studentSession.name || 'student').toLowerCase().replace(/\s+/g, '')}@oksbi`}
                      className="erp-input-field" 
                      required 
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div className="method-fields-box">
                  <div className="form-group-erp">
                    <label>Card Number</label>
                    <input 
                      type="text" 
                      placeholder="4532 •••• •••• 8921" 
                      defaultValue="4532 8901 2345 8921"
                      className="erp-input-field" 
                      required 
                    />
                  </div>
                  <div className="form-row-2">
                    <div className="form-group-erp">
                      <label>Expiry Date</label>
                      <input type="text" placeholder="MM/YY" defaultValue="08/28" className="erp-input-field" required />
                    </div>
                    <div className="form-group-erp">
                      <label>CVV / CVC</label>
                      <input type="password" placeholder="•••" defaultValue="891" className="erp-input-field" required />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'NetBanking' && (
                <div className="method-fields-box">
                  <div className="form-group-erp">
                    <label>Select Your Bank</label>
                    <select className="erp-input-field" required>
                      <option>State Bank of India (SBI)</option>
                      <option>HDFC Bank</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                      <option>Punjab National Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Checkout Submit Actions */}
              <div className="checkout-modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel-checkout" 
                  onClick={() => setPayOpen(false)}
                  disabled={isProcessingPay}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit-pay"
                  disabled={isProcessingPay}
                >
                  {isProcessingPay ? (
                    <>
                      <RefreshCw size={16} className="spinning" /> Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock size={16} /> Pay ₹{(customPayAmount ? Number(customPayAmount) : balanceDue).toLocaleString('en-IN')} Securely
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFees;
