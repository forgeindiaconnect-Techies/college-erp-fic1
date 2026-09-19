import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, DollarSign, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, X, Receipt, Award, Layers } from 'lucide-react';
import { getFeesByStudent, updateFee, createFee, getStudentFeeStructure } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
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

  // Dynamic status states from real MongoDB Fee
  const [feeStatus, setFeeStatus] = useState('Pending');
  const [feeRecord, setFeeRecord] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [scholarship, setScholarship] = useState(null);

  // Payment popup state
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [success, setSuccess] = useState(false);

  const loadFees = useCallback(async () => {
    const session = sessionStorage.getItem('student_session');
    let activeStud = DEFAULT_STUDENT;
    if (session) {
      activeStud = JSON.parse(session);
      setStudentSession(activeStud);
    } else {
      navigate('/student/login');
      return;
    }

    try {
      setLoading(true);
      const studentIdentifier = activeStud.id || activeStud.referenceId || activeStud.studentId || activeStud._id || activeStud.name;
      const res = await getFeesByStudent(studentIdentifier);
      const feesList = res?.data || [];

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
            type: activeFee.scholarshipName || 'Scholarship Scheme',
            amount: `₹${Number(activeFee.scholarshipAmount).toLocaleString('en-IN')}`
          });
        } else {
          setScholarship(null);
        }
      } else {
        // Check for assigned structure if no fee created yet
        try {
          const structRes = await getStudentFeeStructure(studentIdentifier);
          if (structRes?.data) {
            const baseAmt = Number(structRes.data.totalAmount || structRes.data.tuitionFee || 0);
            setInvoiceAmount(baseAmt);
            setFeeStatus(baseAmt === 0 ? 'Paid' : 'Pending');
            if (Number(structRes.data.scholarshipAmount) > 0) {
              setScholarship({
                type: structRes.data.scholarshipName || 'Scholarship Scheme',
                amount: `₹${Number(structRes.data.scholarshipAmount).toLocaleString('en-IN')}`
              });
            }
          }
        } catch (e) {
          console.error('Error fetching student fee structure fallback:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load backend student fees:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Real-time synchronization whenever Fees or Welfare records update
  useRealtimeSync(loadFees, ['fees', 'scholarships', 'welfare', 'feeStructure']);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const handlePaySubmit = async (e) => {
    e.preventDefault();

    const payAmt = invoiceAmount > 0 ? invoiceAmount : (feeRecord?.finalFee || feeRecord?.totalFees || 0);
    const txnDate = new Date().toISOString().split('T')[0];
    const txnRef = `TXN_STUD_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const paymentObj = {
      id: txnRef,
      date: txnDate,
      amount: payAmt,
      mode: paymentMethod || 'Online'
    };

    if (feeRecord && (feeRecord._id || feeRecord.id)) {
      try {
        const idToUpdate = feeRecord._id || feeRecord.id;
        const currentPayments = Array.isArray(feeRecord.payments) ? feeRecord.payments : [];
        const newPaidTotal = Number(feeRecord.paidAmount || 0) + payAmt;
        const newPending = Math.max(0, Number(feeRecord.finalFee || feeRecord.totalFees || payAmt) - newPaidTotal);

        await updateFee(idToUpdate, {
          totalFees: feeRecord.finalFee || feeRecord.totalFees || payAmt,
          status: newPending === 0 ? 'Paid' : 'Partial',
          paidAmount: newPaidTotal,
          pendingAmount: newPending,
          remainingFee: newPending,
          paymentDate: new Date().toISOString(),
          paymentMode: paymentMethod || 'Online',
          payments: [...currentPayments, paymentObj]
        });
      } catch (err) {
        console.error('Failed to update fee on backend:', err);
      }
    } else {
      // Create new fee transaction record
      try {
        await createFee({
          studentId: studentSession.id || studentSession.referenceId || studentSession._id,
          studentName: studentSession.name,
          department: studentSession.dept,
          semester: studentSession.sem,
          normalFee: payAmt,
          totalFees: payAmt,
          finalFee: payAmt,
          paidAmount: payAmt,
          pendingAmount: 0,
          remainingFee: 0,
          status: 'Paid',
          paymentDate: new Date().toISOString(),
          paymentMode: paymentMethod || 'Online',
          payments: [paymentObj]
        });
      } catch (err) {
        console.error('Failed to create fee record on backend:', err);
      }
    }

    setSuccess(true);
    setTimeout(() => {
      setPayOpen(false);
      setSuccess(false);
      loadFees();
    }, 1000);
  };

  const grossFee = Number(feeRecord?.normalFee || feeRecord?.totalFees || invoiceAmount || 0);
  const quotaDiscount = Number(feeRecord?.discountAmount || 0);
  const scholarshipDiscount = Number(feeRecord?.scholarshipAmount || 0);
  const netPayable = Number(feeRecord?.finalFee || Math.max(0, grossFee - (quotaDiscount + scholarshipDiscount)));
  const paidAmount = Number(feeRecord?.paidAmount || 0);
  const balanceDue = Number(feeRecord?.pendingAmount !== undefined ? feeRecord?.pendingAmount : (feeRecord?.remainingFee !== undefined ? feeRecord?.remainingFee : Math.max(0, netPayable - paidAmount)));

  const isFullyPaid = feeStatus === 'Paid' || balanceDue === 0;

  return (
    <div className="student-fees-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          <div>
            <h1>Tuition & Fees</h1>
            <p className="text-muted">Review current semester statement, verified concession breakdowns, payment history, and pay pending dues online.</p>
          </div>
        </div>
      </div>

      <div className="fees-layout-grid-s">
        {/* Left Card: Billing Statement */}
        <div className="glass-card billing-statement-card">
          <div className="billing-card-header">
            <h3>Active Statement</h3>
            <span className={`fee-status-badge ${isFullyPaid ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending')}`}>
              {isFullyPaid ? '✓ Fully Paid' : (paidAmount > 0 ? '⚡ Partially Paid' : '⚠ Action Required')}
            </span>
          </div>

          <div className="billing-invoice-box">
            <p className="invoice-title">Current Semester Statement ({studentSession.sem || 'Semester 1'})</p>
            <h1 className="invoice-price">
              {isFullyPaid ? '₹0' : `₹${balanceDue.toLocaleString('en-IN')}`}
            </h1>
            <p className="text-muted text-xs">
              {isFullyPaid ? 'All dues cleared for this semester' : `Total Outstanding Due: ₹${balanceDue.toLocaleString('en-IN')}`}
            </p>
          </div>

          {/* Detailed Transparent Breakdown */}
          <div style={{ background: 'var(--bg-secondary, rgba(0,0,0,0.03))', padding: '14px 16px', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--border-color, rgba(0,0,0,0.08))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span className="text-muted">Standard Gross Fee:</span>
              <strong>₹{grossFee.toLocaleString('en-IN')}</strong>
            </div>

            {quotaDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--success, #10b981)' }}>
                <span>Quota Concession ({feeRecord?.quotaName || 'Applied'}):</span>
                <span>-₹{quotaDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {scholarshipDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', color: '#6366F1' }}>
                <span>Scholarship ({feeRecord?.scholarshipName || 'Scholarship'}):</span>
                <span>-₹{scholarshipDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div style={{ borderTop: '1px dashed var(--border-color, rgba(0,0,0,0.15))', margin: '8px 0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
              <span>Final Net Fee:</span>
              <span>₹{netPayable.toLocaleString('en-IN')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Amount Paid:</span>
              <span className="text-success font-semibold">₹{paidAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {scholarship && (
            <div style={{ padding: '12px 16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#6366F1', color: 'white', padding: '8px', borderRadius: '50%' }}>
                <Award size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>Scholarship Approved</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Active Scheme: <strong>{scholarship.type}</strong> ({scholarship.amount} direct waiver).
                </p>
              </div>
            </div>
          )}

          {!isFullyPaid ? (
            <button className="btn-pay-dues shadow-glow-s" style={{ background: '#3730A5', color: 'white', border: 'none' }} onClick={() => setPayOpen(true)}>
              <CreditCard size={16} /> Pay Due Amount (₹{balanceDue.toLocaleString('en-IN')})
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
          <p className="text-muted text-sm" style={{ margin: '0 0 1.25rem' }}>View official payment receipts recorded in the ERP ledger.</p>

          <div className="transaction-history-list">
            {feeRecord?.payments && feeRecord.payments.length > 0 ? (
              feeRecord.payments.map((p, idx) => (
                <div key={idx} className="transaction-history-item-s">
                  <div className="txn-left">
                    <span className="txn-ref">REF: {p.id || p.receiptNo || `TXN_${idx + 1}`}</span>
                    <span className="txn-date">
                      Paid: {p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recorded'} · {p.mode || 'Online'}
                    </span>
                  </div>
                  <div className="txn-right">
                    <span className="txn-amt">₹{Number(p.amount || 0).toLocaleString('en-IN')}</span>
                    <span className="badge-success-inline">Paid</span>
                  </div>
                </div>
              ))
            ) : paidAmount > 0 ? (
              <div className="transaction-history-item-s">
                <div className="txn-left">
                  <span className="txn-ref">REF: {feeRecord?.receiptNo || `REC_${(studentSession.id || '').slice(0, 8)}`}</span>
                  <span className="txn-date">
                    Paid: {feeRecord?.paymentDate ? new Date(feeRecord.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recorded'} · {feeRecord?.paymentMode || 'Online'}
                  </span>
                </div>
                <div className="txn-right">
                  <span className="txn-amt">₹{paidAmount.toLocaleString('en-IN')}</span>
                  <span className="badge-success-inline">Paid</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No payment transactions yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', opacity: 0.8 }}>When payments are completed, official timestamped receipts will be generated here.</p>
              </div>
            )}
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
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Amount: ₹{balanceDue.toLocaleString('en-IN')}</p>
              </div>
              <button className="btn-icon" onClick={() => setPayOpen(false)}><X size={20} /></button>
            </div>

            {success && (
              <div className="modal-success-flash">
                <CheckCircle2 size={18} /> Payment verified and updated in ERP ledger!
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
                <button type="submit" className="btn-primary" style={{ background: '#3730A5', color: 'white', border: 'none' }}>
                  Verify & Pay ₹{balanceDue.toLocaleString('en-IN')}
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
