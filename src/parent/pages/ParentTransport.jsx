import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, User, Phone, CheckCircle2, AlertCircle, Clock, MessageSquare, ShieldAlert, Bell } from 'lucide-react';
import { getStudentById, getTransportStudentById, getStudentTransportComplaints, createTransportComplaint, getTransportNotifications, getTransportRoutes } from '../../api/index';
import './ParentDashboard.css';

const DEFAULT_PARENT = {
  name: 'Parent',
  childName: 'Student',
  childId: 'TAM2026-001'
};

const ParentTransport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [childDetails, setChildDetails] = useState(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintsList, setComplaintsList] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);

  useEffect(() => {
    if (showComplaintModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showComplaintModal]);

  useEffect(() => {
    const init = async () => {
      const session = sessionStorage.getItem('parent_session');
      let activeParent = DEFAULT_PARENT;
      if (session) {
        activeParent = JSON.parse(session);
      } else {
        navigate('/parent/login');
        return;
      }

      try {
        const studentId = activeParent.childId;
        
        // Fetch from the standard student collection
        const res = await getStudentById(studentId).catch(() => null);
        let dbRecord = res?.data || null;

        if (!dbRecord) {
          const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
          dbRecord = erpStudents.find(s => s.rollNo === studentId || s.id === studentId) || { name: activeParent.childName };
        }

        // Fetch from the student_transport collection
        const transportRes = await getTransportStudentById(studentId).catch(() => null);
        const transportRecord = transportRes?.data || null;
        
        const activeRouteId = transportRecord?.routeId || dbRecord?.busRoute;
        let actualDriverName = 'Pending Allocation';
        let actualVehicle = 'Pending';
        if (activeRouteId) {
          const routesRes = await getTransportRoutes().catch(() => ({ data: [] }));
          const activeRoute = routesRes.data.find(r => r.routeId === activeRouteId);
          if (activeRoute) {
            actualDriverName = activeRoute.driver;
            actualVehicle = activeRoute.vehicle;
          }
        }

        // Merge the records for the view
        setChildDetails({
          ...dbRecord,
          busRoute: activeRouteId,
          pickupPoint: transportRecord?.pickupPoint || dbRecord?.pickupPoint,
          transportFeeAmount: transportRecord?.amount || dbRecord?.transportFeeAmount || 15000,
          transportFeeStatus: transportRecord?.feeStatus || dbRecord?.transportFeeStatus || 'Pending',
          driverName: actualDriverName,
          busNumber: actualVehicle,
          driverContact: 'Contact Admin for Details'
        });
        // Fetch complaints and notifications
        const [compsRes, notifsRes] = await Promise.all([
          getStudentTransportComplaints(studentId).catch(() => ({ data: [] })),
          getTransportNotifications().catch(() => ({ data: [] }))
        ]);
        setComplaintsList(compsRes.data || []);
        
        const allNotifs = notifsRes.data || [];
        const myNotifs = allNotifs.filter(n => 
          (n.targetRole === 'All' || n.targetRole === 'Parent') &&
          (n.routeId === 'All' || n.routeId === (activeRouteId || 'Pending'))
        );
        setNotificationsList(myNotifs);

      } catch (err) {
        console.error("Failed to load child's transport details", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const handleLogComplaint = async (e) => {
    e.preventDefault();
    if (!complaintText.trim() || !complaintCategory) return;
    
    try {
      const res = await createTransportComplaint({
        studentId: childDetails.id || childDetails.rollNo,
        name: childDetails.name,
        busNumber: childDetails.busNumber || 'TN01AB1234',
        routeId: childDetails.busRoute,
        complaintType: complaintCategory,
        description: complaintText,
        reporterType: 'Parent'
      });
      
      setComplaintsList([res.data, ...complaintsList]);
      alert('Your transport complaint has been logged successfully and sent to the transport admin.');
      setShowComplaintModal(false);
      setComplaintText('');
      setComplaintCategory('');
    } catch (err) {
      console.error(err);
      alert('Failed to log complaint.');
    }
  };

  if (loading || !childDetails) {
    return (
      <div className="parent-loading-container" style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <span className="spinner-large" style={{ width: '40px', height: '40px', border: '4px solid rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
      </div>
    );
  }

  const isTransportUser = childDetails?.transportRequired?.toLowerCase() === 'yes' || !!childDetails?.busRoute;

  return (
    <>
      <div className="parent-page-container animate-fade-in">
        {/* Header Banner */}
        <div className="parent-header-card glass-card">
          <div className="header-title-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bus size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)', lineHeight: 1.2 }}>Child Transport Tracking</h1>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', margin: '3px 0 0' }}>Monitor {childDetails?.name || 'Child'}'s daily bus route, fee status, and trip updates.</p>
              </div>
            </div>
          </div>
          <div className="header-actions-box">
            <div style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted, #475569)', whiteSpace: 'nowrap' }}>
              <span>STUDENT ID: <strong style={{ color: 'var(--text-main, #0f172a)', fontFamily: 'monospace' }}>{childDetails?.id || 'TAM2026-001'}</strong></span>
            </div>
          </div>
        </div>

        {!isTransportUser ? (
          <div className="glass-card" style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: '540px', margin: '0 auto', borderRadius: '20px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'inline-flex', padding: '18px', borderRadius: '50%', marginBottom: '1.25rem' }}>
              <AlertCircle size={40} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '0.75rem', fontWeight: 800 }}>Not Registered</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>Your child is currently not registered for the college bus facility. If you wish to apply, please contact the Transport Administration.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Action Bar (2x2 Grid on Mobile, Row on Desktop) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}>
                <Bus size={15} /> Bus Details
              </button>
              <a href={childDetails?.driverContact ? `tel:${childDetails.driverContact}` : '#'} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', textDecoration: 'none' }}>
                <Phone size={15} /> Call Driver
              </a>
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}>
                <CheckCircle2 size={15} /> Fee Status
              </button>
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', background: '#ef4444', border: 'none', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowComplaintModal(true)}>
                <MessageSquare size={15} /> Raise Complaint
              </button>
            </div>

            {/* Main Details Card (Fixes Screenshot 3 with responsive padding & layout) */}
            <div className="glass-card" style={{ borderRadius: '16px', padding: '1.25rem 1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0, fontWeight: 800 }}>
                    {childDetails.name}'s Bus Details
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Current academic year allocation</p>
                </div>
                <div style={{ background: '#10b981', color: '#ffffff', padding: '5px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}>
                  <CheckCircle2 size={14} /> Active Pass
                </div>
              </div>

              {/* 4 Bus Metric Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.65rem' }}>
                    <Bus size={17} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.5px' }}>Route</div>
                  <div style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>{childDetails.busRoute || 'Pending'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.65rem' }}>
                    <MapPin size={17} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.5px' }}>Pickup Point</div>
                  <div style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800, wordBreak: 'break-word' }}>{childDetails.pickupPoint || 'Pending'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.65rem', fontWeight: 900, fontSize: '0.85rem' }}>
                    TN
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.5px' }}>Bus Number</div>
                  <div style={{ fontSize: '1.15rem', color: '#10b981', fontWeight: 900, wordBreak: 'break-word' }}>{childDetails.busNumber || 'Pending'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.65rem' }}>
                    <Clock size={17} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.5px' }}>Timings</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 700, lineHeight: 1.3 }}>
                    Pickup: 7:30 AM<br/>Drop: 5:00 PM
                  </div>
                </div>
              </div>

              {/* Driver Details (Fixes bottom cards getting cut off) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Driver Name</div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{childDetails.driverName || 'Verified Driver'}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Driver Contact</div>
                    {childDetails.driverContact ? (
                      <a href={`tel:${childDetails.driverContact}`} style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                        {childDetails.driverContact}
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>Available via Desk</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fee Banner */}
              <div style={{ marginTop: '10px', background: 'linear-gradient(to right, rgba(79,70,229,0.05), rgba(59,130,246,0.05))', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
                    <AlertCircle size={20} className="text-primary" />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 800 }}>Transport Fee Status</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Amount: ₹{childDetails.transportFeeAmount || 15000}</div>
                  </div>
                </div>
                <div style={{ padding: '6px 16px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', background: childDetails.transportFeeStatus === 'paid' || childDetails.transportFeeStatus?.toLowerCase() === 'paid' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: childDetails.transportFeeStatus === 'paid' || childDetails.transportFeeStatus?.toLowerCase() === 'paid' ? '#10b981' : '#f59e0b', border: `1px solid ${childDetails.transportFeeStatus === 'paid' || childDetails.transportFeeStatus?.toLowerCase() === 'paid' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                  {(childDetails.transportFeeStatus || 'Pending').toUpperCase()}
                </div>
              </div>
            </div>

            {/* Secondary Grid (Stops & Alerts) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Route Map */}
              <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                    <MapPin size={18} className="text-primary" /> Route Stops
                  </h3>
                </div>
                <div style={{ position: 'relative', paddingLeft: '14px' }}>
                  <div style={{ position: 'absolute', top: '8px', bottom: '12px', left: '19px', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
                  
                  {[
                    { stop: 'Anna Nagar', time: '07:30 AM', current: true },
                    { stop: 'Koyambedu', time: '07:45 AM', current: false },
                    { stop: 'Vadapalani', time: '08:00 AM', current: false },
                    { stop: 'Guindy', time: '08:20 AM', current: false },
                    { stop: 'College Campus', time: '08:45 AM', current: false }
                  ].map((s, idx) => (
                    <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', marginBottom: '1rem' }}>
                      <div style={{ 
                        width: '12px', height: '12px', borderRadius: '50%', background: s.current ? 'var(--primary)' : 'var(--bg-secondary)', 
                        border: `2px solid ${s.current ? 'var(--primary)' : 'var(--border-color)'}`, marginTop: '3px',
                        boxShadow: s.current ? '0 0 0 3px rgba(79, 70, 229, 0.2)' : 'none', flexShrink: 0
                      }}></div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: s.current ? 'var(--primary)' : 'var(--text-main)' }}>{s.stop}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delay Notifications */}
              <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                    <Bell size={18} className="text-warning" /> Transport Alerts
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notificationsList.map(n => (
                    <div key={n._id} style={{ padding: '0.85rem 1rem', borderLeft: `4px solid ${n.type === 'Emergency' ? '#ef4444' : n.type === 'Warning' ? '#f59e0b' : '#3b82f6'}`, background: 'var(--bg-secondary)', borderRadius: '8px', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{n.title}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: '1.4' }}>{n.message}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {notificationsList.length === 0 && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent transport alerts.</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Maintenance Complaints */}
            <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                  <MessageSquare size={18} style={{ color: '#ef4444' }} /> Transport Complaints
                </h3>
              </div>
              {complaintsList.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>You have no active transport complaints.</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '6px 0 0' }}>If you face any issues (bus delays, missed stop), tap "Raise Complaint" above.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {complaintsList.map(comp => (
                    <div key={comp.id || comp._id} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>{comp.complaintType || comp.category}</span>
                          <span style={{ marginLeft: '8px', fontSize: '0.72rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '3px 6px', borderRadius: '8px', fontWeight: 600 }}>By: {comp.reporterType || comp.reporter || 'Parent'}</span>
                          <h4 style={{ margin: '8px 0 0', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600 }}>{comp.description}</h4>
                          <span style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Logged on {new Date(comp.createdAt || comp.date || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px',
                            background: comp.status === 'Resolved' ? 'rgba(16, 185, 129, 0.12)' : comp.status === 'In Progress' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: comp.status === 'Resolved' ? '#10b981' : comp.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                          }}>
                            {comp.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Log Complaint Modal */}
      {showComplaintModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowComplaintModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0.75rem', boxSizing: 'border-box' }}>
          <div className="modal-content parent-modal-card" style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '16px', padding: '1.25rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} className="text-danger" /> Log Transport Issue
              </h2>
              <button onClick={() => setShowComplaintModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLogComplaint}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>Select Complaint Category</label>
                <select
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }}
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                >
                  <option value="" disabled>Select a category...</option>
                  <option value="Bus Delayed">Bus Delayed</option>
                  <option value="Driver Behavior">Driver Behavior</option>
                  <option value="Bus Cleanliness">Bus Cleanliness</option>
                  <option value="Overcrowding">Overcrowding</option>
                  <option value="Missed Stop">Missed Stop</option>
                  <option value="Other">Other</option>
                </select>

                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>Describe your issue in detail</label>
                <textarea 
                  required
                  placeholder="e.g., The bus did not stop at my child's pickup point today."
                  style={{ width: '100%', minHeight: '110px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowComplaintModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', background: '#ef4444', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ParentTransport;
