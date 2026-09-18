import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';

const FeeReceipt = ({
  selectedFeeRecord,
  selectedPayment,
  onClose,
  institutionName = "Royal College"
}) => {
  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const normalFee =
    selectedFeeRecord?.normalFee ??
    selectedFeeRecord?.totalFee ??
    0;

  const discountAmount =
    selectedFeeRecord?.discountAmount ??
    0;

  const finalFee =
    selectedFeeRecord?.finalFee ??
    selectedFeeRecord?.totalFee ??
    normalFee;

  const quotaName =
    selectedFeeRecord?.quotaName ||
    selectedFeeRecord?.quota ||
    "General Quota";

  const totalPaid =
    selectedFeeRecord?.paidAmount ??
    selectedFeeRecord?.paid ??
    0;

  const remainingFee =
    selectedFeeRecord?.remainingFee ??
    Math.max(finalFee - totalPaid, 0);

  const currentPaymentAmount =
    selectedPayment?.amount ??
    selectedPayment?.paidAmount ??
    selectedFeeRecord?.paymentAmount ??
    selectedFeeRecord?.amountPaid ??
    0;

  const receiptNumber =
    selectedPayment?.receiptNumber ||
    selectedPayment?.receiptNo ||
    selectedFeeRecord?.receiptNumber ||
    selectedFeeRecord?.receiptNo ||
    "REC-" + Date.now();

  const paymentDate =
    selectedPayment?.paymentDate ||
    selectedFeeRecord?.paymentDate ||
    new Date();

  const paymentStatus =
    selectedFeeRecord?.paymentStatus ||
    (remainingFee === 0 && finalFee > 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending");

  const departmentName =
    selectedFeeRecord?.department?.name ||
    selectedFeeRecord?.department ||
    selectedFeeRecord?.courseName ||
    selectedFeeRecord?.course?.name ||
    selectedFeeRecord?.course ||
    "-";

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="receipt-container">
      <div className="receipt-header">
        <h1>{institutionName}</h1>
        <p>Student Fee Payment Receipt</p>
      </div>

      <div className="receipt-metadata">
        <div>
          <strong>Receipt Number:</strong>
          <span>{receiptNumber}</span>
        </div>

        <div>
          <strong>Payment Date:</strong>
          <span>
            {new Date(paymentDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })}
          </span>
        </div>
      </div>

      <div className="student-information">
        <div>
          <strong>Student Name:</strong>
          <span>{selectedFeeRecord?.studentName || selectedFeeRecord?.name || "-"}</span>
        </div>

        <div>
          <strong>Admission Number:</strong>
          <span>{selectedFeeRecord?.admissionNumber || selectedFeeRecord?.admissionNo || selectedFeeRecord?.id || "-"}</span>
        </div>

        <div>
          <strong>Department:</strong>
          <span>{departmentName}</span>
        </div>

        <div>
          <strong>Quota:</strong>
          <span>{quotaName}</span>
        </div>
      </div>

      <table className="receipt-fee-table">
        <tbody>
          <tr>
            <td>Normal Department Fee</td>
            <td>{formatCurrency(normalFee)}</td>
          </tr>

          <tr>
            <td>Quota / Scholarship</td>
            <td>{quotaName}</td>
          </tr>

          <tr className="discount-row">
            <td>Quota Discount</td>
            <td>
              {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : formatCurrency(0)}
            </td>
          </tr>

          <tr className="final-fee-row">
            <td>Final Payable Fee</td>
            <td>{formatCurrency(finalFee)}</td>
          </tr>

          {currentPaymentAmount > 0 && (
            <tr className="current-payment-row">
              <td>Amount Paid in This Transaction</td>
              <td>{formatCurrency(currentPaymentAmount)}</td>
            </tr>
          )}

          <tr>
            <td>Total Paid Amount</td>
            <td>{formatCurrency(totalPaid)}</td>
          </tr>

          <tr className="balance-row">
            <td>Remaining Balance</td>
            <td>{formatCurrency(remainingFee)}</td>
          </tr>
        </tbody>
      </table>

      <div className="receipt-status">
        <strong>Payment Status:</strong>
        <span
          style={{
            fontWeight: 700,
            color: paymentStatus === 'Paid' ? '#16a34a' : paymentStatus === 'Partial' ? '#d97706' : '#dc2626'
          }}
        >
          {paymentStatus}
        </span>
      </div>

      <div className="receipt-footer">
        <p>Thank you for your payment.</p>
        <p>This is a computer-generated receipt.</p>
      </div>

      <div className="receipt-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="close-button"
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        )}
        <button
          type="button"
          onClick={handlePrintReceipt}
          className="print-button"
          style={{
            padding: '9px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
          }}
        >
          <Printer size={16} /> Print Receipt
        </button>
      </div>
    </div>
  );
};

export default FeeReceipt;
