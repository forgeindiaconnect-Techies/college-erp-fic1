import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Monitor, UserCheck, CreditCard, 
  AlertOctagon, BrainCircuit, Plus, X,
  Clock, CheckCircle, ShieldAlert, BookOpen
} from 'lucide-react';
import { getStaffSupportRequests, createStaffSupportRequest } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const SUPPORT_CATEGORIES = [
  { id: 'Leave', title: 'Leave Management', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'Salary Query', title: 'Salary & Payroll', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'Complaint', title: 'Complaints', icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'Counseling', title: 'Wellness & Training', icon: BrainCircuit, color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

const StaffSupport = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    requestType: 'Leave',
    subType: '',
    description: '',
    priority: 'Medium',
    startDate: '',
    endDate: ''
  });

  const loadRequests = async () => {
    try {
      const res = await getStaffSupportRequests();
      if (res?.data) {
        setRequests(res.data);
      }
    } catch(err) {
      console.error('Failed to load support requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('staff_session');
    if (!sessionStr) {
      navigate('/staff/login');
      return;
    }
    setSession(JSON.parse(sessionStr));
    loadRequests();
  }, [navigate]);

  useRealtimeSync(loadRequests, ['staffSupportUpdated']);

  const myRequests = requests.filter(r => r.staffName === session?.name);
  const filteredRequests = activeTab === 'All' ? myRequests : myRequests.filter(r => r.requestType === activeTab);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        staffName: session.name,
        department: session.dept,
        requestType: formData.requestType,
        subType: formData.subType,
        description: formData.description,
        priority: formData.priority,
        startDate: formData.startDate,
        endDate: formData.endDate
      };
      await createStaffSupportRequest(payload);
      setShowModal(false);
      setFormData({ requestType: 'Leave', subType: '', description: '', priority: 'Medium', startDate: '', endDate: '' });
      loadRequests();
    } catch(err) {
      console.error('Failed to create request', err);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><span style={{ color: 'var(--text-muted)' }}>Loading Support Center...</span></div>;

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Staff Support Center</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Raise requests, apply for leave, and track administrative queries.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(79,70,229,0.39)' }}
        >
          <Plus size={18} /> New Request
        </button>
      </div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {SUPPORT_CATEGORIES.map(cat => {
          const catCount = myRequests.filter(r => r.requestType === cat.id).length;
          return (
            <div key={cat.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s, borderColor 0.2s' }} onClick={() => setActiveTab(cat.id)} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
              <div className={`${cat.bg} ${cat.color}`} style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
                <cat.icon size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{cat.title}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{catCount} Request{catCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <button onClick={() => setActiveTab('All')} style={{ background: 'transparent', border: 'none', padding: '1rem 1.5rem', fontWeight: 600, cursor: 'pointer', color: activeTab === 'All' ? '#4f46e5' : 'var(--text-muted)', borderBottom: activeTab === 'All' ? '2px solid #4f46e5' : '2px solid transparent' }}>
            All Requests
          </button>
          {SUPPORT_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveTab(cat.id)} style={{ background: 'transparent', border: 'none', padding: '1rem 1.5rem', fontWeight: 600, cursor: 'pointer', color: activeTab === cat.id ? '#4f46e5' : 'var(--text-muted)', borderBottom: activeTab === cat.id ? '2px solid #4f46e5' : '2px solid transparent' }}>
              {cat.title}
            </button>
          ))}
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <ShieldAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No requests found in this category.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Priority</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {r.requestType} <br/> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.subType}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', maxWidth: '300px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r.priority === 'High' || r.priority === 'Critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: r.priority === 'High' || r.priority === 'Critical' ? '#ef4444' : '#f59e0b' }}>
                          {r.priority}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r.status === 'Resolved' || r.status === 'Approved' ? 'rgba(16,185,129,0.1)' : r.status === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', color: r.status === 'Resolved' || r.status === 'Approved' ? '#10b981' : r.status === 'Pending' ? '#f59e0b' : '#3b82f6' }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '500px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Create Support Request</h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</label>
                  <select 
                    value={formData.requestType} 
                    onChange={e => setFormData({...formData, requestType: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                  >
                    {SUPPORT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Specific Sub-Type</label>
                  <input 
                    type="text" 
                    value={formData.subType} 
                    onChange={e => setFormData({...formData, subType: e.target.value})}
                    placeholder={formData.requestType === 'Leave' ? 'e.g. Sick Leave' : formData.requestType === 'IT Support' ? 'e.g. Printer Issue' : 'e.g. Details'}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                    required
                  />
                </div>
              </div>

              {formData.requestType === 'Leave' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Date</label>
                    <input 
                      type="date" 
                      value={formData.startDate} 
                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Date</label>
                    <input 
                      type="date" 
                      value={formData.endDate} 
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                      required
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Detailed Description</label>
                <textarea 
                  rows="3"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'none' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Priority</label>
                <select 
                  value={formData.priority} 
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSupport;
