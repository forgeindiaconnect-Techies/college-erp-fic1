import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, AlertTriangle, Monitor, BookOpen, 
  DollarSign, Briefcase, CalendarCheck, Plus, X,
  Clock, CheckCircle, Clock3
} from 'lucide-react';
import { getHodSupportRequests, createHodSupportRequest } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const HOD_CATEGORIES = [
  { id: 'Faculty Support', title: 'Faculty Support', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'Student Escalations', title: 'Student Escalations', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'Resource Requests', title: 'Resource Requests', icon: Monitor, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'Exam Support', title: 'Exam Support', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'Budget & Finance', title: 'Budget & Finance', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'Placement Coordination', title: 'Placement Coordination', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'Academic Planning', title: 'Academic Planning', icon: CalendarCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
];

const HodSupport = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  
  // New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    requestType: 'Faculty Support',
    subType: '',
    description: '',
    priority: 'Medium'
  });

  const session = JSON.parse(sessionStorage.getItem('hod_session') || '{}');

  const loadRequests = async () => {
    try {
      const res = await getHodSupportRequests();
      if (res?.data) {
        // Filter requests by current HOD's department
        const myRequests = res.data.filter(r => r.department === session.dept);
        setRequests(myRequests);
      }
    } catch(err) {
      console.error('Failed to load HOD requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useRealtimeSync(loadRequests, ['hodSupportUpdated']);

  const filteredRequests = activeTab === 'All' ? requests : requests.filter(r => r.requestType === activeTab);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.requestType || !formData.description) return;
    
    try {
      const payload = {
        hodName: session.name || 'HOD',
        department: session.dept || 'Unknown',
        requestType: formData.requestType,
        subType: formData.subType,
        description: formData.description,
        priority: formData.priority
      };
      await createHodSupportRequest(payload);
      setShowNewModal(false);
      setFormData({
        requestType: 'Faculty Support',
        subType: '',
        description: '',
        priority: 'Medium'
      });
      loadRequests();
    } catch(err) {
      console.error('Failed to submit HOD request', err);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><span style={{ color: 'var(--text-muted)' }}>Loading Support Center...</span></div>;

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header Banner */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        marginBottom: '1.5rem',
        color: '#fff',
        boxShadow: '0 4px 15px -5px rgba(79, 70, 229, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative blur */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={24} /> HOD Support Center
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
            Manage department escalations, resources, and administrative requests.
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button 
            onClick={() => setShowNewModal(true)}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <Plus size={20} /> New Request
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === 'All' ? '#4f46e5' : 'var(--border-color)', borderWidth: activeTab === 'All' ? '2px' : '1px' }} onClick={() => setActiveTab('All')}>
          <div className="bg-indigo-500/10 text-indigo-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <Clock3 size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>All Requests</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{requests.length} Total</p>
          </div>
        </div>
        {HOD_CATEGORIES.map(cat => {
          const catCount = requests.filter(r => r.requestType === cat.id).length;
          return (
            <div key={cat.id} className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === cat.id ? '#4f46e5' : 'var(--border-color)', borderWidth: activeTab === cat.id ? '2px' : '1px' }} onClick={() => setActiveTab(cat.id)}>
              <div className={`${cat.bg} ${cat.color}`} style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
                <cat.icon size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{cat.title}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{catCount} Request{catCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '0' }}>
          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Clock3 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No requests in this category.</p>
              <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0.5rem auto' }}>Your department's requests and escalations will appear here once submitted.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>Type & Date</th>
                    <th style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>Priority</th>
                    <th style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>{r.requestType}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td style={{ padding: '1.25rem 1rem', color: 'var(--text-main)', maxWidth: '300px' }}>
                        {r.subType && <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', marginBottom: '6px' }}>{r.subType}</span>}
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{r.description}</div>
                        {r.timeline && r.timeline.length > 1 && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '8px', fontSize: '0.8rem', color: '#4f46e5', borderLeft: '2px solid #4f46e5' }}>
                            <strong>Latest Update:</strong> {r.timeline[r.timeline.length - 1].text}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: r.priority === 'High' || r.priority === 'Critical' ? '#ef4444' : r.priority === 'Medium' ? '#f59e0b' : '#3b82f6' }}>
                          {r.priority}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r.status === 'Resolved' || r.status === 'Completed' || r.status === 'Approved' ? 'rgba(16,185,129,0.1)' : r.status === 'Rejected' ? 'rgba(239,68,68,0.1)' : r.status === 'Pending' || r.status === 'Under Review' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', color: r.status === 'Resolved' || r.status === 'Completed' || r.status === 'Approved' ? '#10b981' : r.status === 'Rejected' ? '#ef4444' : r.status === 'Pending' || r.status === 'Under Review' ? '#f59e0b' : '#3b82f6' }}>
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
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '500px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Plus size={20} color="#4f46e5"/> New Department Request
              </h3>
              <button onClick={() => setShowNewModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmitRequest} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Category</label>
                  <select 
                    value={formData.requestType}
                    onChange={e => setFormData({...formData, requestType: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontWeight: 500 }}
                  >
                    {HOD_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.title}</option>)}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Subject / Topic</label>
                  <input 
                    type="text"
                    value={formData.subType}
                    onChange={e => setFormData({...formData, subType: e.target.value})}
                    placeholder="e.g. Lab Equipment, Disciplinary Issue"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Issue</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Detailed Description</label>
                  <textarea 
                    rows="4"
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the issue, resource needed, or escalation details..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'vertical' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowNewModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodSupport;
