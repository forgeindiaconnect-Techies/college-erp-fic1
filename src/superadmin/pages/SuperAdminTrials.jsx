import React, { useState, useEffect } from 'react';
import { Search, Clock, ArrowRight, Ban, CheckCircle, Bell } from 'lucide-react';
import { getSuperAdminTrials, extendTrial, expireTrial, convertTrialToPaid, sendTrialReminder } from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';

const SuperAdminTrials = () => {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, type: 'warning', title: '', message: '', action: null, collegeId: null, collegeName: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    fetchTrials();
  }, []);

  const fetchTrials = async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminTrials();
      setTrials(res.data);
    } catch (error) {
      console.error('Failed to fetch trials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action, collegeId, collegeName) => {
    let title = '';
    let message = '';
    let type = 'warning';

    if (action === 'Extend Trial') {
      title = 'Extend Trial';
      message = `Extend trial for ${collegeName} by 14 days?`;
      type = 'warning';
    } else if (action === 'Convert to Paid') {
      title = 'Convert to Paid';
      message = `Convert ${collegeName} to a paid Premium plan?`;
      type = 'warning';
    } else if (action === 'Expire Trial') {
      title = 'Expire Trial';
      message = `Force expire the trial for ${collegeName}?`;
      type = 'danger';
    } else if (action === 'Send Reminder') {
      title = 'Send Reminder';
      message = `Send an expiry reminder to ${collegeName}?`;
      type = 'warning';
    }

    setModalState({ isOpen: true, type, title, message, action, collegeId, collegeName });
  };

  const executeAction = async () => {
    const { action, collegeId, collegeName } = modalState;
    try {
      if (action === 'Extend Trial') {
        await extendTrial(collegeId);
        setSuccessModal({ isOpen: true, title: 'Success', message: `Successfully extended trial for ${collegeName}.` });
      } else if (action === 'Convert to Paid') {
        await convertTrialToPaid(collegeId);
        setSuccessModal({ isOpen: true, title: 'Success', message: `Successfully converted ${collegeName} to a paid plan.` });
      } else if (action === 'Expire Trial') {
        await expireTrial(collegeId);
        setSuccessModal({ isOpen: true, title: 'Success', message: `Successfully expired trial for ${collegeName}.` });
      } else if (action === 'Send Reminder') {
        await sendTrialReminder(collegeId);
        setSuccessModal({ isOpen: true, title: 'Success', message: `Reminder sent to ${collegeName}.` });
      }
      fetchTrials();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setSuccessModal({ isOpen: true, title: 'Error', message: `Failed to perform ${action}.` });
    }
  };

  const filteredTrials = trials.filter(t => 
    t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px' }}>
      <ConfirmModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        onConfirm={executeAction}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
      <ConfirmModal 
        isOpen={successModal.isOpen} 
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })} 
        title={successModal.title}
        message={successModal.message}
        type={successModal.title === 'Error' ? 'danger' : 'success'}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Trial Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor and manage colleges currently on free trial.</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search trial colleges..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 10px 10px 36px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>College Name</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Trial Start</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Trial End</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Days Left</th>
              <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Loading trials...</td></tr>
            ) : filteredTrials.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No active trials found.</td></tr>
            ) : (
              filteredTrials.map((college) => {
                const now = new Date();
                const startDate = new Date(college.trialStartDate || college.createdAt);
                const endDate = new Date(college.trialEndDate);
                
                const startStr = startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const endStr = endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                
                const daysLeft = college.daysRemaining !== undefined ? college.daysRemaining : Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                const status = college.subscriptionStatus || (daysLeft <= 0 ? 'Expired' : 'Active');
                
                return (
                  <tr key={college._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-main)', verticalAlign: 'top' }}>
                      {college.name || college.collegeName || 'Unknown College'}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                      {startStr}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                      {endStr}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        background: status === 'Active' ? 'rgba(16,185,129,0.1)' : 
                                  status === 'Grace Period' ? 'rgba(245,158,11,0.1)' : 
                                  'rgba(239,68,68,0.1)', 
                        color: status === 'Active' ? '#10b981' : 
                               status === 'Grace Period' ? '#f59e0b' : 
                               '#ef4444' 
                      }}>
                        {status === 'Expired' ? 'Expired' : 
                         status === 'Grace Period' ? `Grace: ${daysLeft}d` : 
                         `${daysLeft} Days`}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button onClick={() => handleActionClick('Extend Trial', college._id, college.name)} title="Extend Trial (14 days)" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Clock size={16} />
                        </button>
                        <button onClick={() => handleActionClick('Convert to Paid', college._id, college.name)} title="Convert to Paid" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <ArrowRight size={16} />
                        </button>
                        <button onClick={() => handleActionClick('Send Reminder', college._id, college.name)} title="Send Reminder" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Bell size={16} />
                        </button>
                        <button onClick={() => handleActionClick('Expire Trial', college._id, college.name)} title="Mark as Expired" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminTrials;
