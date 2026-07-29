import React, { useState, useEffect } from 'react';
import { Heart, UserPlus, BookOpen, AlertOctagon, MessageSquare, Plus, X, Calendar, Clock, CheckCircle } from 'lucide-react';
import { getWelfareRecords, createWelfareRecord } from '../../api/index';
import './StudentDashboard.css';

const getStudentSession = () => {
  return JSON.parse(sessionStorage.getItem('student_session') || 'null') || {
    id: 'CS2022001',
    name: 'John Doe',
    dept: 'Computer Science',
    sem: 'Sem 6',
  };
};

export default function StudentWelfare() {
  const student = getStudentSession();
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    issueType: 'Counseling',
    priority: 'Medium',
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const fetchMyRecords = async () => {
    try {
      const res = await getWelfareRecords();
      // Filter records belonging to the logged-in student
      const myRecords = res.data.filter(r => r.studentName === student.name || r.studentName.includes(student.name.split(' ')[0]));
      setRecords(myRecords);
    } catch (err) {
      console.error('Failed to fetch welfare records', err);
    }
  };

  const handleOpenForm = (type) => {
    setFormData({ ...formData, issueType: type, title: '', description: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use the description, prepending title if provided, so it shows up fully in the principal dashboard
      const fullDescription = formData.title ? `[${formData.title}] ${formData.description}` : formData.description;
      
      await createWelfareRecord({
        studentName: student.name,
        department: student.dept,
        issueType: formData.issueType,
        priority: formData.priority,
        reportedBy: 'Student', // Source
        date: new Date().toISOString().split('T')[0],
        description: fullDescription,
        status: 'Pending',
        timeline: [{ date: new Date().toISOString().split('T')[0], text: 'Request submitted successfully by student' }]
      });
      setShowForm(false);
      setFormData({ issueType: 'Counseling', priority: 'Medium', title: '', description: '' });
      fetchMyRecords();
      alert('Request submitted successfully!');
    } catch (err) {
      alert('Error submitting request');
    }
  };

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'Resolved': return <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Resolved</span>;
      case 'Scheduled': 
      case 'Under Investigation':
      case 'Under Review':
      case 'Counselor Assigned':
        return <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> {status}</span>;
      default: return <span className="bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Pending</span>;
    }
  };

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header Banner */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '20px',
        padding: '2rem 2.5rem',
        marginBottom: '2.5rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(236, 72, 153, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative blur */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Heart size={28} /> Student Support Center
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem', fontWeight: 500 }}>
            Submit confidential reports, request counseling, or apply for welfare benefits.
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button 
            onClick={() => handleOpenForm('Counseling')}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <Plus size={20} /> New Request
          </button>
        </div>
      </div>

      {/* Support Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #4f46e5' }}>
          <UserPlus size={24} color="#4f46e5" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 4px 0' }}>Request Counseling</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem', height: '40px' }}>Need academic or personal guidance? Speak confidentially with our campus counselor.</p>
          <button onClick={() => handleOpenForm('Counseling')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Apply Now</button>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <BookOpen size={24} color="#10b981" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 4px 0' }}>Apply Scholarship</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem', height: '40px' }}>Request financial or scholarship assistance from the institutional welfare board.</p>
          <button onClick={() => handleOpenForm('Scholarship')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Apply Now</button>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <AlertOctagon size={24} color="#ef4444" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 4px 0' }}>Anti-Ragging Complaint</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem', height: '40px' }}>Report ragging confidentially. Strict and immediate action will be taken securely.</p>
          <button onClick={() => handleOpenForm('Anti-Ragging')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Report Now</button>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
          <MessageSquare size={24} color="#f59e0b" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 4px 0' }}>Report Complaint</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem', height: '40px' }}>Report issues related to academics, hostels, transport, or campus infrastructure.</p>
          <button onClick={() => handleOpenForm('Complaint')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Submit Complaint</button>
        </div>
      </div>

      {/* Request History Section */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>My Request History</h3>
        
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <MessageSquare size={24} color="var(--text-muted)" />
            </div>
            <h4 style={{ color: 'var(--text-main)', fontWeight: 600, margin: '0 0 4px 0' }}>No requests yet</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>When you submit a request, it will appear here with real-time status tracking.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {records.map(record => (
              <div key={record._id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{record.issueType} Request</h4>
                  {renderStatusBadge(record.status)}
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' }}>
                  <Calendar size={12} /> Submitted: {record.date}
                </div>
                
                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: record.timeline?.length > 1 ? '1rem' : '0' }}>
                  <strong>Your Query:</strong> {record.description}
                </div>

                {record.timeline && record.timeline.length > 1 && (
                  <div style={{ marginTop: '0.5rem', borderLeft: '2px solid #4f46e5', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Updates & Replies</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {record.timeline.slice(1).map((entry, idx) => (
                        <div key={idx} style={{ background: entry.text.includes('Reply:') ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-primary)', border: entry.text.includes('Reply:') ? '1px solid rgba(79, 70, 229, 0.2)' : 'none', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{entry.date}</div>
                          {entry.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {record.priority === 'High' && (
                  <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--bg-secondary)' }}></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '500px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Plus size={18} color="#4f46e5" /> New Support Request
              </h3>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Request Type</label>
                  <select 
                    value={formData.issueType} 
                    onChange={e => setFormData({...formData, issueType: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                  >
                    <option value="Counseling">Counseling</option>
                    <option value="Scholarship">Scholarship</option>
                    <option value="Anti-Ragging">Anti-Ragging</option>
                    <option value="Complaint">Complaint</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Priority</label>
                  <div style={{ display: 'flex', gap: '1rem', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <input type="radio" name="priority" value="Low" checked={formData.priority === 'Low'} onChange={e => setFormData({...formData, priority: e.target.value})} /> Low
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <input type="radio" name="priority" value="Medium" checked={formData.priority === 'Medium'} onChange={e => setFormData({...formData, priority: e.target.value})} /> Medium
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <input type="radio" name="priority" value="High" checked={formData.priority === 'High'} onChange={e => setFormData({...formData, priority: e.target.value})} /> High
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Title</label>
                  <input 
                    type="text"
                    required
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Short title for your request..."
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Description</label>
                  <textarea 
                    required
                    rows="4"
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Provide details about your request or issue..."
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'none' }}
                  ></textarea>
                </div>
              </div>
            </form>
            
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 'auto' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleSubmit} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
