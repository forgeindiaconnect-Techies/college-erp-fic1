import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, DollarSign, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, X } from 'lucide-react';
import { getFeesByStudent, updateFee, createFee, getStudentFeeStructure } from '../../api/index';
import './StudentFees.css';

// Fallbacks
const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Computer Science',
  sem: 'Sem 6',
  email: 'john@college.edu'
};

const StudentFees = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);

  // Dynamic status states
  const [feeStatus, setFeeStatus] = useState('Pending');
  const [feeRecord, setFeeRecord] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState(45000);
  const [scholarship, setScholarship] = useState(null);

  // Payment popup state
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('student_session');
    let activeStud = DEFAULT_STUDENT;
    if (session) {
      activeStud = JSON.parse(session);
      setStudentSession(activeStud);
    } else {
      navigate('/student/login');
      return;
    }

    const loadFees = async () => {
      try {
        const res = await getFeesByStudent(activeStud.id || activeStud.referenceId || activeStud._id);
        if (res?.data && res.data.length > 0) {
          const activeFee = res.data[0];
          setFeeRecord(activeFee);
          setFeeStatus(activeFee.status || 'Pending');
          setInvoiceAmount(activeFee.pendingAmount ?? activeFee.totalFees ?? 45000);
        } else {
          setFeeStatus('Pending');
          setInvoiceAmount(45000);
        }
      } catch (err) {
        console.error('Failed to load backend student fees:', err);
      } finally {
        setLoading(false);
      }

      // Check for Scholarships via Fee Structure API
      try {
        const structureRes = await getStudentFeeStructure(activeStud.id || activeStud.referenceId || activeStud._id);
        if (structureRes?.data && structureRes.data.scholarshipAmount > 0) {
          setScholarship({
            type: structureRes.data.scholarshipName || 'Merit Scholarship',
            amount: `₹${structureRes.data.scholarshipAmount.toLocaleString()}`
          });
        }
      } catch (e) {
        console.error('Failed to fetch fee structure for scholarships', e);
      }
    };

    loadFees();
  }, [navigate]);

  const handlePaySubmit = async (e) => {
    e.preventDefault();

    setFeeStatus('Paid');
    // We intentionally do not set invoiceAmount to 0 yet, as the UI needs to show the receipt amount
    setSuccess(true);
    
    const txnDate = new Date().toISOString().split('T')[0];
    const txnRef = `TXN_STUD_${Math.random().toString(36).substring(2,8).toUpperCase()}`;
    const payAmt = feeRecord?.totalFees || invoiceAmount || 45000;
    
    const paymentObj = {
      id: txnRef,
      date: txnDate,
      amount: payAmt,
      mode: paymentMethod || 'Online'
    };

    if (feeRecord && (feeRecord._id || feeRecord.id)) {
      try {
        const idToUpdate = feeRecord._id || feeRecord.id;
        const currentPayments = feeRecord.payments || [];
        await updateFee(idToUpdate, { 
          totalFees: feeRecord.totalFees || payAmt,
          status: 'Paid', 
          paidAmount: payAmt, 
          pendingAmount: 0,
          payments: [...currentPayments, paymentObj]
        });
      } catch (err) {
        console.error('Failed to update fee on backend:', err);
      }
    } else {
      // If no fee record existed, create one to register the payment
      try {
        await createFee({
          studentId: studentSession.id || studentSession.referenceId || studentSession._id,
          studentName: studentSession.name,
          department: studentSession.dept,
          semester: studentSession.sem,
          totalFees: payAmt,
          paidAmount: payAmt,
          pendingAmount: 0,
          status: 'Paid',
          dueDate: new Date().toISOString(),
          payments: [paymentObj]
        });
      } catch (err) {
        console.error('Failed to create fee record on backend:', err);
      }
    }

    setTimeout(() => {
      setPayOpen(false);
      setSuccess(false);
      // Wait for animation to finish before clearing amount
      setInvoiceAmount(0);
    }, 800);
  };

  return (
    <div className="student-fees-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          
          <div>
            <h1>Tuition & Fees</h1>
            <p className="text-muted">Review current semester statements, payment history, and pay pending dues online.</p>
          </div>
        </div>
      </div>

      <div className="fees-layout-grid-s">
        {/* Left Card: Billing Statement */}
        <div className="glass-card billing-statement-card">
          <div className="billing-card-header">
            <h3>Active Statement</h3>
            <span className={`fee-status-badge ${feeStatus.toLowerCase()}`}>
              {feeStatus === 'Paid' ? '✓ Fully Paid' : '⚠ Action Required'}
            </span>
          </div>

          <div className="billing-invoice-box">
            <p className="invoice-title">Current Semester Fee ({studentSession.sem})</p>
            <h1 className="invoice-price">
              {feeStatus === 'Paid' ? '₹0' : `₹${invoiceAmount.toLocaleString()}`}
            </h1>
            <p className="text-muted text-xs">Total Amount Due: ₹{invoiceAmount.toLocaleString()}</p>
          </div>

          {scholarship && (
            <div style={{ padding: '12px 16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#6366F1', color: 'white', padding: '8px', borderRadius: '50%' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>Scholarship Applied</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  You have an active <strong>{scholarship.type}</strong> scholarship ({scholarship.amount} Waiver).
                </p>
              </div>
            </div>
          )}

          {feeStatus !== 'Paid' ? (
            <button className="btn-pay-dues shadow-glow-s" style={{ background: '#3730A5', color: 'white', border: 'none' }} onClick={() => setPayOpen(true)}>
              <CreditCard size={16} /> Proceed to Checkout
            </button>
          ) : (
            <div className="payment-cleared-banner">
              <CheckCircle2 size={20} className="text-success" />
              <div>
                <h4>Dues Cleared</h4>
                <p className="text-muted text-xs">You have cleared all academic fee charges for this semester.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Card: History Logs */}
        <div className="glass-card transaction-history-card">
          <h3>Receipts & Transactions Log</h3>
          <p className="text-muted text-sm" style={{ margin: '0 0 1.25rem' }}>View past invoices and downloadable receipts.</p>

          <div className="transaction-history-list">
            {feeStatus === 'Paid' && (
              <div className="transaction-history-item-s">
                <div className="txn-left">
                  <span className="txn-ref">REF: TXN_STUD_{studentSession.id.slice(2)}</span>
                  <span className="txn-date">Paid Today · UPI Payment</span>
                </div>
                <div className="txn-right">
                  <span className="txn-amt">₹{invoiceAmount.toLocaleString()}</span>
                  <span className="badge-success-inline">Paid</span>
                </div>
              </div>
            )}

            <div className="transaction-history-item-s">
              <div className="txn-left">
                <span className="txn-ref">REF: TXN_98371029</span>
                <span className="txn-date">Paid: 15-Dec-2025 · Net Banking</span>
              </div>
              <div className="txn-right">
                <span className="txn-amt">₹{invoiceAmount.toLocaleString()}</span>
                <span className="badge-success-inline">Paid</span>
              </div>
            </div>

            <div className="transaction-history-item-s">
              <div className="txn-left">
                <span className="txn-ref">REF: TXN_88471012</span>
                <span className="txn-date">Paid: 12-Jun-2025 · Card Payment</span>
              </div>
              <div className="txn-right">
                <span className="txn-amt">₹40,000</span>
                <span className="badge-success-inline">Paid</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      {payOpen && (
        <div className="modal-overlay" onClick={() => setPayOpen(false)}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Payment Portal Checkout</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Amount: ₹{invoiceAmount.toLocaleString()}</p>
              </div>
              <button className="btn-icon" onClick={() => setPayOpen(false)}><X size={20} /></button>
            </div>

            {success && (
              <div className="modal-success-flash">
                <CheckCircle2 size={18} /> Payment verified and updated!
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="modal-form">
              <div className="form-group">
                <label>Select Payment Method</label>
                <div className="payment-methods-grid">
                  <button
                    type="button"
                    className={`pay-method-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('UPI')}
                  >
                    UPI / QR Code
                  </button>
                  <button
                    type="button"
                    className={`pay-method-btn ${paymentMethod === 'Card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('Card')}
                  >
                    Credit / Debit Card
                  </button>
                  <button
                    type="button"
                    className={`pay-method-btn ${paymentMethod === 'NetBanking' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('NetBanking')}
                  >
                    Net Banking
                  </button>
                </div>
              </div>

              {paymentMethod === 'UPI' && (
                <div className="form-group">
                  <label>Enter Virtual Payment Address (VPA)</label>
                  <input type="text" placeholder="e.g. username@upi" required />
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div className="form-grid">
                  <div className="form-group col-span-full">
                    <label>Card Number</label>
                    <input type="text" placeholder="XXXX XXXX XXXX XXXX" required />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input type="text" placeholder="MM/YY" required />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input type="password" placeholder="XXX" required />
                  </div>
                </div>
              )}

              {paymentMethod === 'NetBanking' && (
                <div className="form-group">
                  <label>Select Bank</label>
                  <select required>
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setPayOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#3730A5', color: 'white', border: 'none' }}>Verify & Pay</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFees;
