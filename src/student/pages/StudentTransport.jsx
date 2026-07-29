import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, User, Phone, CheckCircle2, AlertCircle, Clock, MessageSquare, ShieldAlert, Bell } from 'lucide-react';
import { getStudentById, getTransportStudentById, getStudentTransportComplaints, createTransportComplaint, getTransportNotifications, getTransportRoutes } from '../../api/index';
import './StudentDashboard.css';

const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Cyber Security',
  sem: 'Semester 6',
  email: 'john@college.edu'
};

const StudentTransport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentDetails, setStudentDetails] = useState(null);
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
      const session = sessionStorage.getItem('student_session');
      let activeStud = DEFAULT_STUDENT;
      if (session) {
        activeStud = JSON.parse(session);
      } else {
        navigate('/student/login');
        return;
      }

      try {
        const studentId = activeStud.referenceId || activeStud.id || activeStud._id;
        
        // Fetch from the standard student collection (for base profile & transportRequired flag)
        const res = await getStudentById(studentId).catch(() => null);
        let dbRecord = res?.data || null;

        if (!dbRecord) {
          const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
          dbRecord = erpStudents.find(s => s.rollNo === activeStud.id || s.id === activeStud.id) || activeStud;
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
        setStudentDetails({
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
          (n.targetRole === 'All' || n.targetRole === 'Student') &&
          (n.routeId === 'All' || n.routeId === (activeRouteId || 'Pending'))
        );
        setNotificationsList(myNotifs);

      } catch (err) {
        console.error("Failed to load transport details", err);
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
        studentId: studentDetails.id,
        name: studentDetails.name,
        busNumber: studentDetails.busNumber || 'TN01AB1234',
        routeId: studentDetails.busRoute,
        complaintType: complaintCategory,
        description: complaintText,
        reporterType: 'Student'
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

  if (loading || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  const isTransportUser = studentDetails?.transportRequired?.toLowerCase() === 'yes' || !!studentDetails?.busRoute;

  return (
    <>
      <div className="student-dashboard animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Premium Header Banner */}
        <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', borderRadius: '24px', padding: '3rem', color: 'white', marginBottom: '2.5rem', boxShadow: '0 20px 40px -15px rgba(79, 70, 229, 0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10%', top: '-50%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '10px', borderRadius: '14px', backdropFilter: 'blur(10px)' }}>
                <Bus size={24} />
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>College Transport</h1>
            </div>
            <p style={{ fontSize: '0.95rem', opacity: 0.9, margin: '0 0 0 3.5rem', maxWidth: '600px' }}>View your bus route, driver details, fee status, and receive real-time notifications about delays.</p>
          </div>
        </div>

        {!isTransportUser ? (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', borderRadius: '24px' }}>
            <div style={{ background: 'var(--primary)', color: '#dc2626', display: 'inline-flex', padding: '24px', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' }}>
              <AlertCircle size={48} />
            </div>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 800 }}>Not Registered</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>You are currently not registered for the college bus facility. If you believe this is an error or wish to apply, please contact the Transport Administration.</p>
            <button className="btn-primary" style={{ marginTop: '2rem', padding: '12px 24px', fontSize: '1rem', borderRadius: '12px', background: 'var(--primary)' }}>Apply for Transport</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            {/* Main Details Card */}
            <div className="glass-card" style={{ borderRadius: '24px', padding: '2.5rem', border: '1px solid rgba(79, 70, 229, 0.1)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Your Bus Details
                  </h2>
                  <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '6px' }}>Current academic year allocation</p>
                </div>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)' }}>
                  <CheckCircle2 size={18} /> Active Pass
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Bus size={20} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Route</div>
                  <div style={{ fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.busRoute || 'Pending'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <MapPin size={20} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Pickup Point</div>
                  <div style={{ fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.pickupPoint || 'Pending'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>TN</div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Bus Number</div>
                  <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 900 }}>{studentDetails.busNumber || 'Pending'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Clock size={20} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Timings</div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    In: 7:30 AM<br/>Out: 5:00 PM
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Driver Name</div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.driverName || 'Pending'}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={24} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Driver Contact</div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.driverContact || 'Pending'}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', background: 'linear-gradient(to right, rgba(79,70,229,0.05), rgba(59,130,246,0.05))', padding: '1.5rem 2rem', borderRadius: '16px', border: '1px solid rgba(79, 70, 229, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <AlertCircle size={24} className="text-primary" />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>Transport Fee Status</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Amount: ₹{studentDetails.transportFeeAmount || 15000}</div>
                  </div>
                </div>
                <div style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 800, fontSize: '1.1rem', background: studentDetails.transportFeeStatus === 'paid' || studentDetails.transportFeeStatus?.toLowerCase() === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: studentDetails.transportFeeStatus === 'paid' || studentDetails.transportFeeStatus?.toLowerCase() === 'paid' ? '#10b981' : '#f59e0b', border: `1px solid ${studentDetails.transportFeeStatus === 'paid' || studentDetails.transportFeeStatus?.toLowerCase() === 'paid' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  {(studentDetails.transportFeeStatus || 'Pending').toUpperCase()}
                </div>
              </div>
            </div>

            {/* Secondary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              
              {/* Route Map (Mock) */}
              <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}><MapPin size={22} className="text-primary" /> Route Stops</h3>
                </div>
                <div style={{ position: 'relative', paddingLeft: '20px' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: '26px', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
                  
                  {[
                    { stop: 'Anna Nagar', time: '07:30 AM', current: true },
                    { stop: 'Koyambedu', time: '07:45 AM', current: false },
                    { stop: 'Vadapalani', time: '08:00 AM', current: false },
                    { stop: 'Guindy', time: '08:20 AM', current: false },
                    { stop: 'College Campus', time: '08:45 AM', current: false }
                  ].map((s, idx) => (
                    <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ 
                        width: '14px', height: '14px', borderRadius: '50%', background: s.current ? 'var(--primary)' : 'var(--bg-secondary)', 
                        border: `2px solid ${s.current ? 'var(--primary)' : 'var(--border-color)'}`, marginTop: '4px',
                        boxShadow: s.current ? '0 0 0 4px rgba(79, 70, 229, 0.2)' : 'none'
                      }}></div>
                      <div>
                        <div style={{ fontWeight: 700, color: s.current ? 'var(--primary)' : 'var(--text-main)' }}>{s.stop}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delay Notifications */}
              <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}><Bell size={22} className="text-warning" /> Transport Alerts</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {notificationsList.map(n => (
                    <div key={n._id} style={{ padding: '1.25rem', borderLeft: `4px solid ${n.type === 'Emergency' ? '#ef4444' : n.type === 'Warning' ? '#f59e0b' : '#3b82f6'}`, background: 'var(--bg-secondary)', borderRadius: '12px', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{n.title}</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: '1.5' }}>{n.message}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {notificationsList.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent transport alerts.</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Maintenance Complaints */}
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
                  <MessageSquare size={24} style={{ color: '#ef4444' }} /> Transport Complaints
                </h3>
                <button 
                  className="btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '10px', background: '#ef4444', border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowComplaintModal(true)}
                >
                  Log New Complaint
                </button>
              </div>
              {complaintsList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>You have no active transport complaints.</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '8px 0 0' }}>If you are facing any issues with the bus service (delays, behavior, cleanliness), click the button above to notify the transport admin.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {complaintsList.map(comp => (
                    <div key={comp.id} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>{comp.complaintType || comp.category}</span>
                          <h4 style={{ margin: '10px 0 0', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 600 }}>{comp.description}</h4>
                          <span style={{ display: 'block', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Logged on {new Date(comp.createdAt || comp.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: '0.85rem', fontWeight: 700, padding: '6px 12px', borderRadius: '8px',
                            background: comp.status === 'Resolved' ? 'rgba(16, 185, 129, 0.1)' : comp.status === 'In Progress' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: comp.status === 'Resolved' ? '#10b981' : comp.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                          }}>
                            {comp.status}
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
        <div className="modal-overlay" onClick={() => setShowComplaintModal(false)}>
          <div className="modal-content" style={{ background: 'var(--bg-secondary)', borderRadius: '24px', padding: '2.5rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', position: 'relative', zIndex: 10000, display: 'block', opacity: 1, visibility: 'visible' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MessageSquare size={24} className="text-danger" /> Log Transport Issue
              </h2>
              <button onClick={() => setShowComplaintModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleLogComplaint}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Select Complaint Category</label>
                <select
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', marginBottom: '1.5rem' }}
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

                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Describe your issue in detail</label>
                <textarea 
                  required
                  placeholder="e.g., The bus did not stop at my pickup point today."
                  style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', resize: 'none' }}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowComplaintModal(false)} style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: '12px', background: '#ef4444', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentTransport;
