import React, { useState, useEffect, useContext } from 'react';
import {
  CreditCard,
  Calendar,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Building,
  User,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign
} from 'lucide-react';
import { getMySalaries } from '../../api';
import { SettingsContext } from '../../App';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const WatchmanPayroll = () => {
  const { collegeSettings } = useContext(SettingsContext) || {};
  const [salaries, setSalaries] = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [loading, setLoading] = useState(true);

  const sessionStr = sessionStorage.getItem('watchman_session');
  let watchmanInfo = {};
  try {
    watchmanInfo = sessionStr ? JSON.parse(sessionStr) : {};
  } catch (e) {
    watchmanInfo = {};
  }

  const collegeName = collegeSettings?.collegeName || watchmanInfo.collegeName || 'Campus ERP Portal';

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await getMySalaries();
      const records = Array.isArray(res?.data) ? res.data : [];
      setSalaries(records);
      if (records.length > 0 && !selectedSlip) {
        setSelectedSlip(records[0]);
      }
    } catch (err) {
      console.warn('Failed to fetch payroll:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  useRealtimeSync(fetchPayroll, ['salaries']);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="watchman-container animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#059669', color: '#fff', padding: '8px', borderRadius: '10px' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Security Officer Payroll & Payslips
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                Confidential institutional salary disbursement records, earnings breakdowns, and verified payslips.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchPayroll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#334155'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {selectedSlip && (
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: '0 2px 8px rgba(5,150,105,0.2)'
              }}
            >
              <Printer size={15} /> Print Payslip
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#334155' }}>Retrieving Confidential Salary Records...</div>
        </div>
      ) : salaries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <CreditCard size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>No Payroll Records Generated Yet</div>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>Your monthly compensation statement will appear here once processed by Central Accounts.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: List of Month Salary Records */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
              Disbursement Cycles
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {salaries.map((s) => {
                const isSelected = selectedSlip?._id === s._id || selectedSlip?.billingMonth === s.billingMonth;
                const isDisbursed = s.status === 'Disbursed';
                return (
                  <div
                    key={s._id || s.billingMonth}
                    onClick={() => setSelectedSlip(s)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                      background: isSelected ? '#ecfdf5' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isSelected ? '#065f46' : '#0f172a' }}>
                        {s.billingMonth || 'Current Period'}
                      </span>
                      {isDisbursed ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={11} /> Disbursed
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> Pending
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Net Pay: <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>₹{Number(s.netSalary || 0).toLocaleString()}</strong>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {s.paymentDate ? new Date(s.paymentDate).toLocaleDateString() : 'Awaiting transfer'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Official Payslip */}
          {selectedSlip && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }} id="printable-payslip">
              
              {/* Slip Header */}
              <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '2px dashed #cbd5e1', marginBottom: '20px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {collegeName}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  OFFICIAL SALARY DISBURSEMENT STATEMENT
                </div>
                <div style={{ display: 'inline-block', background: '#f1f5f9', color: '#334155', fontWeight: 800, fontSize: '0.78rem', padding: '4px 12px', borderRadius: '12px', marginTop: '8px' }}>
                  Pay Period: {selectedSlip.billingMonth}
                </div>
              </div>

              {/* Employee Particulars Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Employee Name</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{selectedSlip.staffName || watchmanInfo.name || 'Ramesh Kumar'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Employee ID</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{selectedSlip.staffId || watchmanInfo.employeeId || 'WMN-001'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Designation</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{selectedSlip.designation || 'Chief Security Watchman'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{selectedSlip.department || 'Campus Security & Safety'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Working / Present Days</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{selectedSlip.workingDays || 30} / {selectedSlip.presentDays || 30} Days</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Payment Mode</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#059669' }}>{selectedSlip.paymentMode || 'Bank Transfer (NEFT)'}</div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                
                {/* Earnings Table */}
                <div>
                  <div style={{ background: '#f0fdf4', color: '#166534', fontWeight: 800, fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowUpCircle size={15} /> Earnings
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #dcfce7' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>Basic Pay</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{Number(selectedSlip.basicPay || 0).toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>H.R.A.</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{Number(selectedSlip.hra || 0).toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>Medical Allowance</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{Number(selectedSlip.medicalAllowance || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>Special / Duty Allowance</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹{Number(selectedSlip.specialAllowance || 0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions Table */}
                <div>
                  <div style={{ background: '#fef2f2', color: '#991b1b', fontWeight: 800, fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowDownCircle size={15} /> Deductions
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #fee2e2' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>Provident Fund & ESI</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>₹{Number(selectedSlip.deductions || 0).toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>Professional Tax</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>₹0</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>Leave / Absence Loss</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>₹0</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>Total Deductions</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>₹{Number(selectedSlip.deductions || 0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Net Salary Banner */}
              <div style={{ background: '#059669', color: '#ffffff', borderRadius: '12px', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', opacity: 0.9, fontWeight: 700 }}>
                    Net Disbursed Compensation
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900 }}>
                    ₹{Number(selectedSlip.netSalary || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Status</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{selectedSlip.status || 'Disbursed'}</div>
                </div>
              </div>

              {/* Verification Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span>Computer-generated institutional payroll document. Confidential.</span>
                </div>
                <div>Central HR & Accounts</div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default WatchmanPayroll;
