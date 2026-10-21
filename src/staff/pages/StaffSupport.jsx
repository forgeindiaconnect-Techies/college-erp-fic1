import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Monitor, CreditCard, AlertOctagon, 
  BrainCircuit, Plus, X, Clock, CheckCircle2, ShieldAlert,
  Search, Filter, RotateCcw, LifeBuoy, Layers
} from 'lucide-react';
import { getStaffSupportRequests, createStaffSupportRequest } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const SUPPORT_CATEGORIES = [
  { id: 'Leave', title: 'Leave Management', icon: Calendar, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  { id: 'Salary Query', title: 'Salary & Payroll', icon: CreditCard, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  { id: 'Complaint', title: 'Complaints & Feedback', icon: AlertOctagon, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  { id: 'Counseling', title: 'Wellness & Training', icon: BrainCircuit, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { id: 'IT Support', title: 'IT & Facilities', icon: Monitor, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }
];

const StaffSupport = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      setLoading(true);
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
  const filteredRequests = myRequests.filter(r => {
    const matchesCategory = activeTab === 'All' || r.requestType === activeTab;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesSearch = !searchTerm.trim() || 
      (r.requestType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.subType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
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
      await loadRequests();
    } catch(err) {
      console.error('Failed to create request', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '10px' }}>
      <RotateCcw size={20} className="animate-spin text-[#3b82f6]" />
      <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Loading Staff Support Desk...</span>
    </div>
  );

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '1.5rem 2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header Banner - Clean ERP Style with NO Dark Background */}
      <div className="glass-card" style={{
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '12px', 
            background: 'rgba(99,102,241,0.12)', 
            color: '#6366f1', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <LifeBuoy size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Staff Support & Help Desk
              </h1>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                ● Real-time ERP Live
              </span>
            </div>
            <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.84rem', fontWeight: 500 }}>
              Staff: <strong style={{ color: 'var(--text-main)' }}>{session?.name || 'Staff Member'}</strong> ({session?.dept || 'Faculty'}) · Raise administrative queries, IT support & HR requests
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          style={{ 
            background: '#4f46e5', 
            color: '#ffffff', 
            border: 'none', 
            padding: '10px 18px', 
            borderRadius: '8px', 
            fontWeight: 700, 
            fontSize: '0.86rem',
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            cursor: 'pointer', 
            boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
            transition: 'all 0.15s' 
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div 
          onClick={() => setActiveTab('All')}
          style={{ 
            padding: '1.1rem 1.25rem', 
            borderRadius: '10px',
            background: activeTab === 'All' ? 'rgba(79,70,229,0.08)' : 'var(--bg-secondary)', 
            border: activeTab === 'All' ? '2px solid #4f46e5' : '1px solid var(--border-color)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(79,70,229,0.12)', color: '#4f46e5', display: 'flex' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>ALL REQUESTS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>{myRequests.length}</div>
          </div>
        </div>

        {SUPPORT_CATEGORIES.map(cat => {
          const catCount = myRequests.filter(r => r.requestType === cat.id).length;
          const isActive = activeTab === cat.id;
          const IconComp = cat.icon;
          return (
            <div 
              key={cat.id} 
              onClick={() => setActiveTab(cat.id)}
              style={{ 
                padding: '1.1rem 1.25rem', 
                borderRadius: '10px',
                background: isActive ? 'rgba(79,70,229,0.08)' : 'var(--bg-secondary)', 
                border: isActive ? '2px solid #4f46e5' : '1px solid var(--border-color)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ padding: '10px', borderRadius: '10px', background: cat.bg, color: cat.color, display: 'flex' }}>
                <IconComp size={20} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{cat.title}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: cat.color, marginTop: '2px' }}>{catCount}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Search & Status Filter Toolbar */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '12px', 
        marginBottom: '1rem',
        padding: '10px 14px',
        background: 'var(--bg-secondary)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search my requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 34px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', flexWrap: 'nowrap', width: '100%' }}>
          {['All', 'Pending', 'Under Review', 'Resolved', 'Approved', 'Rejected'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: statusFilter === st ? '#4f46e5' : 'var(--border-color)',
                background: statusFilter === st ? 'rgba(79,70,229,0.12)' : 'var(--bg-primary)',
                color: statusFilter === st ? '#4f46e5' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        {filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <Layers size={42} style={{ margin: '0 auto 10px', opacity: 0.4, color: '#4f46e5' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No requests found</h3>
            <p style={{ fontSize: '0.84rem', margin: '4px 0 0' }}>No support requests match your active filters.</p>
          </div>
        ) : (
          <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>Category & Date</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>Subject & Description</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>Priority</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(79,70,229,0.04)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)', display: 'block' }}>{r.requestType}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Clock size={12} /> {new Date(r.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-main)', maxWidth: '400px', verticalAlign: 'top' }}>
                      {r.subType && (
                        <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(79,70,229,0.1)', color: '#4f46e5', padding: '2px 8px', borderRadius: '4px', marginBottom: '4px' }}>
                          {r.subType}
                        </span>
                      )}
                      <div style={{ fontSize: '0.86rem', lineHeight: '1.45', color: 'var(--text-main)' }}>{r.description}</div>
                      {r.startDate && r.endDate && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                          📅 Duration: {r.startDate} to {r.endDate}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: r.priority === 'High' || r.priority === 'Critical' ? 'rgba(239,68,68,0.1)' : r.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                        color: r.priority === 'High' || r.priority === 'Critical' ? '#ef4444' : r.priority === 'Medium' ? '#f59e0b' : '#3b82f6' 
                      }}>
                        {r.priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <span style={{ 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800, 
                        background: r.status === 'Resolved' || r.status === 'Approved' ? 'rgba(16,185,129,0.12)' : r.status === 'Rejected' ? 'rgba(239,68,68,0.12)' : r.status === 'Pending' || r.status === 'Under Review' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)', 
                        color: r.status === 'Resolved' || r.status === 'Approved' ? '#10b981' : r.status === 'Rejected' ? '#ef4444' : r.status === 'Pending' || r.status === 'Under Review' ? '#f59e0b' : '#3b82f6' 
                      }}>
                        {r.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '520px', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem' }}>
                <Plus size={18} color="#4f46e5"/> Create Support Request
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Category</label>
                    <select 
                      value={formData.requestType} 
                      onChange={e => setFormData({...formData, requestType: e.target.value})}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600, fontSize: '0.88rem' }}
                    >
                      {SUPPORT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Specific Sub-Type</label>
                    <input 
                      type="text" 
                      value={formData.subType} 
                      onChange={e => setFormData({...formData, subType: e.target.value})}
                      placeholder="e.g. Leave, Payslip, IT Issue"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                {formData.requestType === 'Leave' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Start Date</label>
                      <input 
                        type="date" 
                        value={formData.startDate} 
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>End Date</label>
                      <input 
                        type="date" 
                        value={formData.endDate} 
                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Priority Level</label>
                  <select 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600, fontSize: '0.88rem' }}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Priority</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Detailed Description</label>
                  <textarea 
                    rows="3"
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe your request or query in detail..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'vertical', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '8px 20px', borderRadius: '8px', background: '#4f46e5', color: '#ffffff', fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSupport;
