import React, { useState, useEffect } from 'react';
import { Search, Crown, Calendar, AlertCircle, ArrowUpRight, Ban, Eye } from 'lucide-react';
import { getSuperAdminSubscriptions, upgradeSubscription, renewSubscription, cancelSubscription } from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';

const SuperAdminSubscriptions = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, type: 'warning', title: '', message: '', action: null, collegeId: null, collegeName: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminSubscriptions();
      setColleges(res.data);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action, collegeId, collegeName) => {
    let title = '';
    let message = '';
    let type = 'warning';

    if (action === 'Upgrade Plan') {
      title = 'Upgrade Plan';
      message = `Upgrade ${collegeName} to the Elite plan?`;
      type = 'success';
    } else if (action === 'Renew Plan') {
      title = 'Renew Plan';
      message = `Renew ${collegeName} for an additional 30 days?`;
      type = 'info';
    } else if (action === 'Cancel Plan') {
      title = 'Cancel Plan';
      message = `Are you sure you want to cancel ${collegeName}'s subscription?`;
      type = 'danger';
    } else if (action === 'View Details') {
      title = 'View Details';
      message = `Viewing details for ${collegeName} is under construction.`;
      type = 'info';
      setSuccessModal({ isOpen: true, title, message });
      return; // Quick exit for View Details since it's just an info popup
    }

    setModalState({ isOpen: true, type, title, message, action, collegeId, collegeName });
  };

  const executeAction = async () => {
    const { action, collegeId, collegeName } = modalState;
    try {
      if (action === 'Upgrade Plan') {
        // Hardcoding to Elite for demo, normally we'd show a modal to pick a plan
        await upgradeSubscription(collegeId, 'Elite');
        setSuccessModal({ isOpen: true, title: 'Success', message: `Successfully upgraded ${collegeName} to Elite plan.` });
      } else if (action === 'Renew Plan') {
        await renewSubscription(collegeId);
        setSuccessModal({ isOpen: true, title: 'Success', message: `Successfully renewed ${collegeName} for 30 days.` });
      } else if (action === 'Cancel Plan') {
        await cancelSubscription(collegeId);
        setSuccessModal({ isOpen: true, title: 'Success', message: `Successfully cancelled ${collegeName}'s subscription.` });
      }
      
      // Refresh list
      fetchSubscriptions();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setSuccessModal({ isOpen: true, title: 'Error', message: `Failed to perform ${action}.` });
    }
  };

  const filteredColleges = colleges.filter(c => 
    (c.collegeName && c.collegeName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (c.planName && c.planName.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Subscription Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor and manage active plans, upgrades, and renewals across all colleges.</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by college or plan..." 
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
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>College</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Plan</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Expiry Date</th>
              <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Loading subscriptions...</td></tr>
            ) : filteredColleges.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No subscriptions found.</td></tr>
            ) : (
              filteredColleges.map((college) => {
                const expiryStr = college.endDate ? new Date(college.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                
                return (
                  <tr key={college._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-main)', verticalAlign: 'top' }}>
                      {college.collegeName || college.name || 'Unknown College'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: college.planName === 'Trial' ? '#f59e0b' : '#3b82f6', fontWeight: 600 }}>
                        <Crown size={16} />
                        {college.planName || 'Trial'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        background: college.status === 'Active' ? 'rgba(16,185,129,0.1)' : 
                                  college.status === 'Grace Period' ? 'rgba(245,158,11,0.1)' : 
                                  'rgba(239,68,68,0.1)', 
                        color: college.status === 'Active' ? '#10b981' : 
                               college.status === 'Grace Period' ? '#f59e0b' : 
                               '#ef4444' 
                      }}>
                        {college.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} />
                        {expiryStr}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button onClick={() => handleActionClick('Upgrade Plan', college._id, college.collegeName)} title="Upgrade Plan" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <ArrowUpRight size={16} />
                        </button>
                        <button onClick={() => handleActionClick('Renew Plan', college._id, college.collegeName)} title="Renew Plan" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <AlertCircle size={16} />
                        </button>
                        <button onClick={() => handleActionClick('Cancel Plan', college._id, college.collegeName)} title="Cancel Plan" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Ban size={16} />
                        </button>
                        <button onClick={() => handleActionClick('View Details', college._id, college.collegeName)} title="View Details" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Eye size={16} />
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

export default SuperAdminSubscriptions;
