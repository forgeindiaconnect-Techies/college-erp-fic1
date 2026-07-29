import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MapPin, User, Phone, CheckCircle2, AlertCircle, Calendar, MessageSquare, Users } from 'lucide-react';
import { getStudentById, getStudentHostelComplaints, createHostelComplaint } from '../../api/index';
import './StudentDashboard.css';

const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Cyber Security',
  sem: 'Semester 6',
  email: 'john@college.edu'
};

const MOCK_MESS_MENU = [
  { day: 'Monday', breakfast: 'Idli & Sambar', lunch: 'Rice, Dal, Mixed Veg', dinner: 'Chapati, Paneer Masala' },
  { day: 'Tuesday', breakfast: 'Poha', lunch: 'Rice, Rajma, Aloo Gobi', dinner: 'Puri, Chole' },
  { day: 'Wednesday', breakfast: 'Dosa & Chutney', lunch: 'Veg Biryani, Raita', dinner: 'Chapati, Dal Tadka' },
  { day: 'Thursday', breakfast: 'Aloo Paratha', lunch: 'Rice, Sambar, Cabbage Sabzi', dinner: 'Fried Rice, Manchurian' },
  { day: 'Friday', breakfast: 'Upma', lunch: 'Rice, Rasam, Beetroot Poriyal', dinner: 'Chapati, Egg Curry / Veg Kurma' },
  { day: 'Saturday', breakfast: 'Puri Sabji', lunch: 'Khichdi, Papad, Pickle', dinner: 'Noodles, Soup' },
  { day: 'Sunday', breakfast: 'Chole Bhature', lunch: 'Special Thali (Paneer/Chicken)', dinner: 'Dosa, Sambar' }
];


const StudentHostel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentDetails, setStudentDetails] = useState(null);
  const [currentMessMenu, setCurrentMessMenu] = useState(MOCK_MESS_MENU);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintsList, setComplaintsList] = useState([]);
  const [complaintPriority, setComplaintPriority] = useState('Medium');
  const [myVisitors, setMyVisitors] = useState([]);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  
  // Leave Pass State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState(() => {
    const saved = localStorage.getItem(`erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (saved) {
      const allLeaves = JSON.parse(saved);
      // Try to filter for the current student once studentDetails is loaded, 
      // but initially just return them all or mock data. We'll filter in useEffect.
      return allLeaves;
    }
    return [
      { id: 1, type: 'Weekend Home Visit', dates: '24 May - 26 May', status: 'Approved' },
      { id: 2, type: 'Local Outing', dates: 'Today, 5:00 PM - 8:00 PM', status: 'Pending' }
    ];
  });
  const [leaveData, setLeaveData] = useState({
    type: 'Weekend Home Visit',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleMarkAttendance = () => {
    setAttendanceMarked(true);
    
    // Save to global storage so admin sees it
    const today = new Date().toISOString().split('T')[0];
    const attendanceLog = JSON.parse(localStorage.getItem(`erp_hostel_attendance_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
    
    const record = {
      studentId: studentDetails?.id || studentDetails?.referenceId,
      studentName: studentDetails?.name,
      block: studentDetails?.blockWing || 'Boys Hostel A', // fallback for demo
      date: today,
      time: new Date().toLocaleTimeString(),
      status: 'Present'
    };
    
    if (!attendanceLog.some(a => a.studentId === record.studentId && a.date === today)) {
      attendanceLog.push(record);
      localStorage.setItem(`erp_hostel_attendance_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(attendanceLog));
    }

    alert('Attendance successfully marked for today! Geolocation verified within campus bounds.');
  };

  const fetchComplaints = async (studentId) => {
    try {
      const res = await getStudentHostelComplaints(studentId);
      if (res.data) setComplaintsList(res.data);
    } catch (error) {
      console.error("Failed to fetch hostel complaints", error);
    }
  };

  const handleLogComplaint = async (e) => {
    e.preventDefault();
    if (!complaintText.trim() || !complaintCategory) return;
    
    try {
      const newComplaint = {
        studentId: studentDetails?.id || studentDetails?.referenceId || 'Unknown',
        studentName: studentDetails?.name || 'Unknown Student',
        room: studentDetails?.roomNumber ? `${studentDetails.blockWing || ''}-${studentDetails.roomNumber}` : 'Not Assigned',
        category: complaintCategory,
        title: complaintCategory,
        description: complaintText,
        priority: complaintPriority
      };
      
      const res = await createHostelComplaint(newComplaint);
      if (res.data) {
        setComplaintsList([res.data, ...complaintsList]);
      }
      
      alert('Your complaint has been logged successfully and sent to the warden.');
      setShowComplaintModal(false);
      setComplaintText('');
      setComplaintCategory('');
      setComplaintPriority('Medium');
    } catch (error) {
      console.error("Failed to submit complaint", error);
      alert('Error submitting complaint. Please try again.');
    }
  };

  const handleCheckOut = (id) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMyVisitors(prev => prev.map(v => v.id === id ? { ...v, outTime: timeNow } : v));
    
    // Update global localStorage for admin to see
    const savedVisitors = JSON.parse(localStorage.getItem(`erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
    const updatedVisitors = savedVisitors.map(v => v.id === id ? { ...v, outTime: timeNow } : v);
    localStorage.setItem(`erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updatedVisitors));
  };


  useEffect(() => {
    if (showComplaintModal || showLeaveModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showComplaintModal, showLeaveModal]);

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!leaveData.startDate || !leaveData.reason) return;

    const newLeave = {
      id: Date.now(),
      studentId: studentDetails?.id || studentDetails?.referenceId || 'Unknown',
      studentName: studentDetails?.name || 'Unknown Student',
      room: studentDetails?.roomNumber ? `${studentDetails.blockWing || ''}-${studentDetails.roomNumber}` : 'Not Assigned',
      type: leaveData.type,
      dates: `${leaveData.startDate} - ${leaveData.endDate || 'Same day'}`,
      reason: leaveData.reason,
      status: 'Pending',
      appliedOn: new Date().toISOString().split('T')[0]
    };

    setLeaveRequests(prev => {
      const updated = [newLeave, ...prev];
      // Save globally for Admin to see
      const allSaved = JSON.parse(localStorage.getItem(`erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      localStorage.setItem(`erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify([newLeave, ...allSaved]));
      return updated;
    });
    
    alert('Leave Pass Application Submitted successfully!');
    setShowLeaveModal(false);
    setLeaveData({ type: 'Weekend Home Visit', startDate: '', endDate: '', reason: '' });
  };

  useEffect(() => {
    const savedMenu = localStorage.getItem(`erp_mess_menu_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (savedMenu) {
      try {
        setCurrentMessMenu(JSON.parse(savedMenu));
      } catch (e) {
        console.error("Failed to parse saved mess menu", e);
      }
    }

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
        const res = await getStudentById(studentId).catch(() => null);
        let dbRecord = res?.data || null;

        if (!dbRecord) {
          // Fallback to local storage or session
          const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
          dbRecord = erpStudents.find(s => s.rollNo === activeStud.id || s.id === activeStud.id) || activeStud;
        }

        setStudentDetails(dbRecord);

        if (dbRecord) {
          fetchComplaints(dbRecord.id || dbRecord.referenceId);

          // Load visitor records filtered by student name
          try {
            const savedVisitors = JSON.parse(localStorage.getItem(`erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
            const studentName = dbRecord.name || '';
            const filtered = savedVisitors.filter(v =>
              v.student?.toLowerCase().includes(studentName.toLowerCase().split(' ')[0])
            );
            setMyVisitors(filtered);
          } catch (e) {
            setMyVisitors([]);
          }

          // Check if attendance already marked today
          try {
            const today = new Date().toISOString().split('T')[0];
            const attendanceLog = JSON.parse(localStorage.getItem(`erp_hostel_attendance_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
            const isMarked = attendanceLog.some(a => 
              (a.studentId === dbRecord.id || a.studentId === dbRecord.referenceId) && 
              a.date === today
            );
            setAttendanceMarked(isMarked);
          } catch (e) {}
        }
      } catch (err) {
        console.error("Failed to load hostel details", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  if (loading || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  const isHosteller = studentDetails?.hostelRequired === 'yes';

  return (
    <>
      <div className="student-dashboard animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Premium Header Banner */}
      <div style={{ background: '#3730A5', borderRadius: '24px', padding: '1.25rem 2rem', color: 'white', marginBottom: '2.5rem', boxShadow: '0 20px 40px -15px rgba(55, 48, 165, 0.5)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-10%', top: '-50%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '10px', borderRadius: '14px', backdropFilter: 'blur(10px)' }}>
              <Home size={24} />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Hostel Allocation</h1>
          </div>
          <p style={{ fontSize: '0.95rem', opacity: 0.9, margin: '0 0 0 3.5rem', maxWidth: '600px' }}>Manage your accommodation details, gate passes, and stay updated with residential notices all in one place.</p>
        </div>
      </div>

      {!isHosteller ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', borderRadius: '24px' }}>
          <div style={{ background: 'var(--primary)', color: '#dc2626', display: 'inline-flex', padding: '24px', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' }}>
            <AlertCircle size={48} />
          </div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 800 }}>Not Registered</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>You are currently not registered for campus hostel accommodation. If you believe this is an error or wish to apply, please contact the Hostel Administration.</p>
          <button className="btn-primary" style={{ marginTop: '2rem', padding: '12px 24px', fontSize: '1rem', borderRadius: '12px' }}>Apply for Hostel</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Main Allocation Card */}
          <div className="glass-card" style={{ borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(13, 148, 136, 0.1)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Your Room Details
                </h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '6px' }}>Current academic year allocation</p>
              </div>
              <div style={{ background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)' }}>
                <CheckCircle2 size={18} /> Active Hosteller
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.2s', cursor: 'default' }} className="hover:-translate-y-1 hover:shadow-lg">
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Home size={20} />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Hostel Name</div>
                <div style={{ fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.hostelName || 'Not Assigned'}</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.2s', cursor: 'default' }} className="hover:-translate-y-1 hover:shadow-lg">
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <MapPin size={20} />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Block / Wing</div>
                <div style={{ fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.blockWing || 'Not Assigned'}</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.2s', cursor: 'default' }} className="hover:-translate-y-1 hover:shadow-lg">
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>#</div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Room Number</div>
                <div style={{ fontSize: '1.5rem', color: '#f59e0b', fontWeight: 900 }}>{studentDetails.roomNumber || 'Pending'}</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.2s', cursor: 'default' }} className="hover:-translate-y-1 hover:shadow-lg">
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>B</div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Bed Number</div>
                <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 900 }}>{studentDetails.bedNumber || 'Pending'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Warden Name</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.wardenName || 'Admin Assigned'}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={24} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Warden Contact</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.wardenContact || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', background: 'linear-gradient(to right, rgba(13,148,136,0.05), rgba(59,130,246,0.05))', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(13, 148, 136, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <AlertCircle size={24} className="text-primary" />
                </div>
                <div>
                  <div style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>Hostel Fee Status</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Amount: ₹{studentDetails.hostelFeeAmount || 0}</div>
                </div>
              </div>
              <div style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 800, fontSize: '1.1rem', background: studentDetails.hostelFeeStatus === 'paid' || studentDetails.hostelFeeStatus?.toLowerCase() === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: studentDetails.hostelFeeStatus === 'paid' || studentDetails.hostelFeeStatus?.toLowerCase() === 'paid' ? '#10b981' : '#f59e0b', border: `1px solid ${studentDetails.hostelFeeStatus === 'paid' || studentDetails.hostelFeeStatus?.toLowerCase() === 'paid' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                {(studentDetails.hostelFeeStatus || 'Pending').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Secondary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Leave Requests (Gate Pass) */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}><MapPin size={22} className="text-primary" /> Leave Requests</h3>
                <button onClick={() => setShowLeaveModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '10px' }}>Apply Pass</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {leaveRequests.map(req => (
                  <div key={req.id} style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s cursor-pointer' }} className={`hover:border-${req.status === 'Approved' ? 'emerald' : 'amber'}-500`}>
                    <div>
                      <p style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{req.type}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{req.dates}</p>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '6px 12px', borderRadius: '8px', background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: req.status === 'Approved' ? '#10b981' : '#f59e0b' }}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hostel Notices */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}><AlertCircle size={22} className="text-warning" /> Hostel Notices</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: 'var(--bg-secondary)', borderRadius: '12px', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Water Supply Maintenance</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: '1.5' }}>Water supply will be disrupted tomorrow between 10 AM to 2 PM.</p>
                </div>
                <div style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: 'var(--bg-secondary)', borderRadius: '12px', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Mess Menu Update</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: '1.5' }}>The mess menu for the upcoming week has been updated. Please check the notice board.</p>
                </div>
              </div>
            </div>
           </div>
          
          {/* Hostel Night Attendance */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
                <CheckCircle2 size={24} style={{ color: '#10b981' }} /> Night Attendance
              </h3>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '300px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                  Please mark your daily night attendance before 9:00 PM. The system verifies your location to ensure you are within the hostel premises.
                </p>
                
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', flex: '1', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>84%</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>This Month</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', flex: '1', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>21</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Present</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', flex: '1', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>4</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Absent</div>
                  </div>
                </div>
              </div>
              
              <div style={{ flex: '0 0 auto', background: attendanceMarked ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)', border: `2px dashed ${attendanceMarked ? '#10b981' : 'var(--border-color)'}`, padding: '2rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '250px' }}>
                {attendanceMarked ? (
                  <>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                      <CheckCircle2 size={32} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#10b981', fontWeight: 800 }}>Checked In</h4>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Recorded at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </>
                ) : (
                  <>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                      <MapPin size={28} />
                    </div>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700 }}>Pending Verification</h4>
                    <button 
                      onClick={handleMarkAttendance}
                      className="btn-primary" 
                      style={{ padding: '12px 24px', fontSize: '1rem', borderRadius: '12px', width: '100%', display: 'flex', justifyContent: 'center' }}
                    >
                      Mark Present
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Mess Menu Timetable */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}><Calendar size={24} className="text-primary" /> Weekly Mess Menu</h3>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '1.25rem 1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>Day</th>
                    <th style={{ padding: '1.25rem 1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>Breakfast</th>
                    <th style={{ padding: '1.25rem 1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>Lunch</th>
                    <th style={{ padding: '1.25rem 1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMessMenu.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{item.day}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{item.breakfast}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{item.lunch}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{item.dinner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maintenance Complaints */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
                <MessageSquare size={24} style={{ color: '#ef4444' }} /> Maintenance Complaints
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
                <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>You have no active maintenance complaints.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '8px 0 0' }}>If you are facing any issues with your room facilities (plumbing, electrical, furniture), click the button above to notify the warden immediately.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {complaintsList.map(comp => (
                  <div key={comp._id || comp.complaintId || comp.id} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>{comp.category}</span>
                        {comp.priority && <span style={{ marginLeft: '10px', fontSize: '0.75rem', background: comp.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: comp.priority === 'High' ? '#ef4444' : '#f59e0b', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>{comp.priority} Priority</span>}
                        <h4 style={{ margin: '10px 0 0', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 600 }}>{comp.description}</h4>
                        <span style={{ display: 'block', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Logged on {new Date(comp.date || comp.createdAt).toLocaleDateString()} • Ticket #{comp.complaintId || comp.id}
                        </span>
                        {comp.resolutionRemarks && (
                          <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid #10b981', borderRadius: '4px' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Warden Remarks:</strong>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{comp.resolutionRemarks}</p>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '0.85rem', fontWeight: 700, padding: '6px 12px', borderRadius: '8px',
                          background: comp.status === 'Resolved' ? 'rgba(16, 185, 129, 0.1)' : (comp.status === 'In Progress' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                          color: comp.status === 'Resolved' ? '#10b981' : (comp.status === 'In Progress' ? '#3b82f6' : '#f59e0b')
                        }}>
                          {comp.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Status Flow Timeline */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem', position: 'relative', padding: '0 10px' }}>
                      <div style={{ position: 'absolute', top: '12px', left: '20px', right: '20px', height: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
                      
                      {['Pending Review', 'In Progress', 'Resolved'].map((step, idx) => {
                        const statusOrder = { 'Pending Review': 0, 'In Progress': 1, 'Resolved': 2 };
                        const currentLevel = statusOrder[comp.status] || 0;
                        const stepLevel = statusOrder[step];
                        
                        const isCompleted = stepLevel <= currentLevel;
                        const isActive = stepLevel === currentLevel;
                        
                        return (
                          <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '0 10px' }}>
                            <div style={{ 
                              width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isCompleted ? '#10b981' : 'var(--bg-primary)',
                              border: `2px solid ${isCompleted ? '#10b981' : 'var(--border-color)'}`,
                              color: isCompleted ? 'white' : 'var(--text-muted)',
                              boxShadow: isActive ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none',
                              transition: 'all 0.3s ease'
                            }}>
                              {isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color)' }}></div>}
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Visitors Section */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '24px', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
                <Users size={24} style={{ color: '#6366F1' }} /> My Visitors
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                {myVisitors.length} record{myVisitors.length !== 1 ? 's' : ''}
              </span>
            </div>

            {myVisitors.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Users size={28} />
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>No visitor records found</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '8px 0 0' }}>When a family member or friend visits you at the hostel, the warden will log their entry here.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>Visitor Name</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>Relation</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>Date</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>In Time</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>Out Time</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myVisitors.map((vis, idx) => (
                      <tr key={vis.id || idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{vis.name}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', padding: '3px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>{vis.relation}</span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>{vis.date}</td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-main)', fontWeight: 600 }}>{vis.inTime}</td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{vis.outTime === '--' ? '—' : vis.outTime}</td>
                        <td style={{ padding: '1rem' }}>
                          {vis.outTime === '--' ? (
                            <button 
                              onClick={() => handleCheckOut(vis.id)}
                              style={{
                                fontSize: '0.8rem', fontWeight: 700, padding: '6px 16px', borderRadius: '8px',
                                background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)'
                              }}>
                              Check Out
                            </button>
                          ) : (
                            <span style={{
                              fontSize: '0.8rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
                              background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'
                            }}>
                              Checked Out
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <MessageSquare size={24} className="text-danger" /> Log Maintenance Issue
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
                  <optgroup label="Room Related Complaints">
                    <option value="Room Cleaning Issue">Room Cleaning Issue</option>
                    <option value="Room Maintenance">Room Maintenance</option>
                    <option value="Broken Door">Broken Door</option>
                    <option value="Broken Window">Broken Window</option>
                    <option value="Damaged Furniture">Damaged Furniture</option>
                    <option value="Fan Not Working">Fan Not Working</option>
                    <option value="Light Not Working">Light Not Working</option>
                  </optgroup>
                  <optgroup label="Water & Electricity Complaints">
                    <option value="No Water Supply">No Water Supply</option>
                    <option value="Water Leakage">Water Leakage</option>
                    <option value="Drinking Water Issue">Drinking Water Issue</option>
                    <option value="Power Failure">Power Failure</option>
                    <option value="Electrical Problem">Electrical Problem</option>
                  </optgroup>
                  <optgroup label="Internet & Network Complaints">
                    <option value="Wi-Fi Not Working">Wi-Fi Not Working</option>
                    <option value="Slow Internet Connection">Slow Internet Connection</option>
                    <option value="Network Connectivity Issue">Network Connectivity Issue</option>
                  </optgroup>
                  <optgroup label="Mess/Food Complaints">
                    <option value="Poor Food Quality">Poor Food Quality</option>
                    <option value="Unhygienic Food">Unhygienic Food</option>
                    <option value="Insufficient Food">Insufficient Food</option>
                    <option value="Mess Timing Issue">Mess Timing Issue</option>
                    <option value="Drinking Water Quality Issue">Drinking Water Quality Issue</option>
                  </optgroup>
                  <optgroup label="Hostel Facilities Complaints">
                    <option value="Washroom Cleaning Issue">Washroom Cleaning Issue</option>
                    <option value="Bathroom Maintenance">Bathroom Maintenance</option>
                    <option value="Laundry Issue">Laundry Issue</option>
                    <option value="Lift Not Working">Lift Not Working</option>
                    <option value="Common Area Maintenance">Common Area Maintenance</option>
                  </optgroup>
                  <optgroup label="Security Complaints">
                    <option value="Unauthorized Entry">Unauthorized Entry</option>
                    <option value="Security Concern">Security Concern</option>
                    <option value="Lost Item">Lost Item</option>
                    <option value="Theft Complaint">Theft Complaint</option>
                  </optgroup>
                  <optgroup label="Warden & Management Complaints">
                    <option value="Warden Issue">Warden Issue</option>
                    <option value="Staff Behavior Complaint">Staff Behavior Complaint</option>
                    <option value="Hostel Rule Concern">Hostel Rule Concern</option>
                  </optgroup>
                  <optgroup label="Medical & Emergency Complaints">
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Health & Hygiene Issue">Health & Hygiene Issue</option>
                  </optgroup>
                  <option value="Other">Other</option>
                </select>

                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Priority Level</label>
                <select
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', marginBottom: '1.5rem' }}
                  value={complaintPriority}
                  onChange={(e) => setComplaintPriority(e.target.value)}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority (Urgent)</option>
                </select>

                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Describe your issue in detail</label>
                <textarea 
                  required
                  placeholder="e.g., The ceiling fan in my room is making a loud noise and needs repair."
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

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-content" style={{ background: 'var(--bg-secondary)', borderRadius: '24px', padding: '2.5rem', width: '90%', maxWidth: '500px', border: '1px solid var(--border-color)', position: 'relative', zIndex: 10000, display: 'block' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={24} className="text-primary" /> Apply Gate Pass
              </h2>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Pass Type</label>
                <select
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', marginBottom: '1.5rem' }}
                  value={leaveData.type}
                  onChange={(e) => setLeaveData({...leaveData, type: e.target.value})}
                >
                  <option value="Weekend Home Visit">Weekend Home Visit</option>
                  <option value="Local Outing">Local Outing (Few Hours)</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Event/Competition">Event/Competition</option>
                </select>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Start Date</label>
                    <input 
                      type="date"
                      required
                      value={leaveData.startDate}
                      onChange={e => setLeaveData({...leaveData, startDate: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>End Date</label>
                    <input 
                      type="date"
                      value={leaveData.endDate}
                      onChange={e => setLeaveData({...leaveData, endDate: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Reason</label>
                <textarea 
                  required
                  placeholder="Enter the reason for leave..."
                  style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', resize: 'none' }}
                  value={leaveData.reason}
                  onChange={(e) => setLeaveData({...leaveData, reason: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: '12px', background: '#4f46e5', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentHostel;
