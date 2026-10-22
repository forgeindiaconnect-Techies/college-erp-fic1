import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, AlertTriangle, Monitor, BookOpen, 
  DollarSign, Briefcase, CalendarCheck, Plus, X,
  Clock, CheckCircle2, AlertCircle, Search, Filter, RotateCcw,
  ShieldCheck, Layers, FileText, ChevronRight
} from 'lucide-react';
import { getHodSupportRequests, createHodSupportRequest } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const HOD_CATEGORIES = [
  { id: 'Faculty Support', title: 'Faculty Support', icon: Users, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  { id: 'Student Escalations', title: 'Student Escalations', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  { id: 'Resource Requests', title: 'Resource Requests', icon: Monitor, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  { id: 'Exam Support', title: 'Exam Support', icon: BookOpen, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  { id: 'Budget & Finance', title: 'Budget & Finance', icon: DollarSign, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { id: 'Placement Coordination', title: 'Placement Coordination', icon: Briefcase, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  { id: 'Academic Planning', title: 'Academic Planning', icon: CalendarCheck, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
];

const HodSupport = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requestType: 'Faculty Support',
    subType: '',
    description: '',
    priority: 'Medium'
  });

  const session = JSON.parse(sessionStorage.getItem('hod_session') || '{}');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getHodSupportRequests();
      if (res?.data) {
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

  const filteredRequests = requests.filter(r => {
    const matchesCategory = activeTab === 'All' || r.requestType === activeTab;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesSearch = !searchTerm.trim() || 
      (r.requestType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.subType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.requestType || !formData.description) return;
    
    try {
      setSubmitting(true);
      const payload = {
        hodName: session.name || 'HOD',
        department: session.dept || 'Department',
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
      await loadRequests();
    } catch(err) {
      console.error('Failed to submit HOD request', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '10px' }}>
      <RotateCcw size={20} className="animate-spin text-[#3b82f6]" />
      <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Loading HOD Support Desk...</span>
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
            background: 'rgba(59,130,246,0.12)', 
            color: '#3b82f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                HOD Support & Escalation Hub
              </h1>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                ● Real-time ERP Live
              </span>
            </div>
            <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.84rem', fontWeight: 500 }}>
              Department: <strong style={{ color: 'var(--text-main)' }}>{session.dept || 'General'}</strong> · Submit escalations, resource demands & faculty assistance requests
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowNewModal(true)}
          style={{ 
            background: '#3b82f6', 
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
            boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
            transition: 'all 0.15s' 
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Category Overview Cards */}
      <div className="hod-support-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div 
          onClick={() => setActiveTab('All')}
          style={{ 
            padding: '0.9rem 1rem', 
            borderRadius: '10px',
            background: activeTab === 'All' ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)', 
            border: activeTab === 'All' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            cursor: 'pointer',
            transition: 'all 0.15s',
            minWidth: 0
          }}
        >
          <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', display: 'flex', flexShrink: 0 }}>
            <Clock size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: '1.2' }}>ALL REQUESTS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>{requests.length}</div>
          </div>
        </div>

        {HOD_CATEGORIES.map(cat => {
          const catCount = requests.filter(r => r.requestType === cat.id).length;
          const isActive = activeTab === cat.id;
          const IconComp = cat.icon;
          return (
            <div 
              key={cat.id} 
              onClick={() => setActiveTab(cat.id)}
              style={{ 
                padding: '0.9rem 1rem', 
                borderRadius: '10px',
                background: isActive ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)', 
                border: isActive ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer',
                transition: 'all 0.15s',
                minWidth: 0
              }}
            >
              <div style={{ padding: '8px', borderRadius: '8px', background: cat.bg, color: cat.color, display: 'flex', flexShrink: 0 }}>
                <IconComp size={18} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.2', wordBreak: 'break-word', hyphens: 'auto' }}>{cat.title}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: cat.color, marginTop: '2px' }}>{catCount}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Search & Status Filter Toolbar */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '10px', 
        marginBottom: '1.25rem',
        padding: '10px 14px',
        background: 'var(--bg-secondary)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search request topic or details..."
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
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          width: '100%'
        }}>
          {['All', 'Pending', 'Under Review', 'Resolved', 'Approved', 'Rejected'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === st ? '#3b82f6' : 'var(--border-color)',
                background: statusFilter === st ? 'rgba(59,130,246,0.12)' : 'var(--bg-primary)',
                color: statusFilter === st ? '#3b82f6' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
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
            <Layers size={42} style={{ margin: '0 auto 10px', opacity: 0.4, color: '#3b82f6' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No requests found</h3>
            <p style={{ fontSize: '0.84rem', margin: '4px 0 0' }}>There are no department requests matching your active filter criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
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
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)', display: 'block' }}>{r.requestType}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Clock size={12} /> {new Date(r.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-main)', maxWidth: '400px', verticalAlign: 'top' }}>
                      {r.subType && (
                        <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', marginBottom: '4px' }}>
                          {r.subType}
                        </span>
                      )}
                      <div style={{ fontSize: '0.86rem', lineHeight: '1.45', color: 'var(--text-main)' }}>{r.description}</div>
                      {r.timeline && r.timeline.length > 1 && (
                        <div style={{ marginTop: '6px', padding: '6px 10px', background: 'rgba(16,185,129,0.06)', borderRadius: '6px', fontSize: '0.76rem', color: '#10b981', borderLeft: '3px solid #10b981' }}>
                          <strong>Update:</strong> {r.timeline[r.timeline.length - 1].text}
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
                        background: r.status === 'Resolved' || r.status === 'Completed' || r.status === 'Approved' ? 'rgba(16,185,129,0.12)' : r.status === 'Rejected' ? 'rgba(239,68,68,0.12)' : r.status === 'Pending' || r.status === 'Under Review' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)', 
                        color: r.status === 'Resolved' || r.status === 'Completed' || r.status === 'Approved' ? '#10b981' : r.status === 'Rejected' ? '#ef4444' : r.status === 'Pending' || r.status === 'Under Review' ? '#f59e0b' : '#3b82f6' 
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
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '520px', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem' }}>
                <Plus size={18} color="#3b82f6"/> New Department Escalation Request
              </h3>
              <button onClick={() => setShowNewModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSubmitRequest} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Request Category</label>
                  <select 
                    value={formData.requestType}
                    onChange={e => setFormData({...formData, requestType: e.target.value})}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600, fontSize: '0.88rem' }}
                  >
                    {HOD_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.title}</option>)}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Subject / Sub-Topic</label>
                  <input 
                    type="text"
                    value={formData.subType}
                    onChange={e => setFormData({...formData, subType: e.target.value})}
                    placeholder="e.g. Computer Lab Equipment, Student Disciplinary Appeal"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

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
                    <option value="Critical">Critical Escalation</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Detailed Description</label>
                  <textarea 
                    rows="4"
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Provide detailed description of the escalation, resource requirement, or action needed..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'vertical', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowNewModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '8px 20px', borderRadius: '8px', background: '#3b82f6', color: '#ffffff', fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
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

export default HodSupport;
