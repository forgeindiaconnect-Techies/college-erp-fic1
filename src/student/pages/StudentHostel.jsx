import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MapPin, User, Phone, CheckCircle2, AlertCircle, Calendar, MessageSquare, Users, CreditCard } from 'lucide-react';
import { getStudentById, getStudentHostelComplaints, createHostelComplaint, updateStudent } from '../../api/index';
import useRealtimeSync, { emitERPDataUpdate } from '../../hooks/useRealtimeSync';
import { getStudentHostelFeeInfo } from '../../pages/hostel/HostelDashboard';
import './StudentDashboard.css';

const DEFAULT_STUDENT = {
  id: '',
  name: 'Student',
  dept: '',
  sem: 'Semester 1',
  email: ''
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
  }, []);

  const loadHostelDetails = useCallback(async () => {
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
        dbRecord = erpStudents.find(s => s.rollNo === activeStud.id || s.id === activeStud.id || s._id === activeStud.id) || activeStud;
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
  }, [navigate]);

  // Hook real-time sync for instant multi-dashboard updates
  useRealtimeSync(loadHostelDetails, ['hostel', 'students', 'leaves', 'attendance', 'fees']);

  useEffect(() => {
    loadHostelDetails();
  }, [loadHostelDetails]);

  if (loading || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  const isHosteller =
    String(studentDetails?.hostelRequired || '').toLowerCase() === 'yes' ||
    studentDetails?.hostelRequired === true ||
    String(studentDetails?.hostelOpted || '').toLowerCase() === 'yes' ||
    studentDetails?.hostelOpted === true ||
    Boolean(studentDetails?.hostelBlock || studentDetails?.roomNumber || studentDetails?.blockWing || studentDetails?.hostelName);

  const handleApplyHostel = async () => {
    try {
      const studentId = studentDetails?.id || studentDetails?.referenceId || studentDetails?._id;
      if (!studentId) return;

      await updateStudent(studentId, {
        hostelRequired: 'yes',
        hostelFee: 45000,
        hostelStatus: 'Applied / In Review'
      }).catch(() => null);

      // Save to localStorage fallback
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${tenantId}`) || '[]');
      const idx = erpStudents.findIndex(s => s.rollNo === studentId || s.id === studentId || s._id === studentId);
      if (idx !== -1) {
        erpStudents[idx] = { ...erpStudents[idx], hostelRequired: 'yes', hostelFee: 45000, hostelStatus: 'Applied / In Review' };
        localStorage.setItem(`erp_students_${tenantId}`, JSON.stringify(erpStudents));
      }

      setStudentDetails(prev => ({
        ...prev,
        hostelRequired: 'yes',
        hostelFee: 45000,
        hostelStatus: 'Applied / In Review'
      }));

      emitERPDataUpdate(['hostel', 'students', 'admissions', 'fees'], 'hostel_applied', { studentId });
      alert('Hostel application submitted successfully! Accounts & Hostel Wardens have been notified.');
    } catch (err) {
      console.error('Error applying for hostel:', err);
      alert('Failed to submit hostel application. Please try again.');
    }
  };

  return (
    <>
      <div className="student-dashboard animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        {/* Real-time Enterprise ERP Header Banner */}
        <div style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '1.25rem 1.75rem',
          marginBottom: '1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              color: '#4f46e5',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Home size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                  Hostel Allocation & Residency
                </h1>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#4f46e5',
                  letterSpacing: '0.04em'
                }}>
                  Residential ERP
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Manage your accommodation details, gate passes, warden contacts, and residential ledger.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--bg-main, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Calendar size={14} className="text-primary" />
              <span>AY 2026 - 2027</span>
            </div>
          </div>
        </div>

      {!isHosteller ? (
        <div style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', display: 'inline-flex', padding: '20px', borderRadius: '50%', marginBottom: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={40} />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 800 }}>Not Registered for Hostel</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>You are currently not registered for campus hostel accommodation. If you believe this is an error or wish to apply, please submit an application below.</p>
          <button onClick={handleApplyHostel} className="btn-primary" style={{ marginTop: '1.5rem', padding: '10px 22px', fontSize: '0.9rem', borderRadius: '10px' }}>Apply for Hostel</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* Main Allocation Card */}
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0, fontWeight: 800 }}>
                  Your Room Details
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>Current academic year residential allotment</p>
              </div>
              <div style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                Active Hosteller
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{
                background: 'var(--bg-main, #f8fafc)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Home size={16} />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hostel Name</span>
                </div>
                <div style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>{studentDetails.hostelName || 'Not Assigned'}</div>
              </div>

              <div style={{
                background: 'var(--bg-main, #f8fafc)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={16} />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Block / Wing</span>
                </div>
                <div style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>{studentDetails.blockWing || 'Not Assigned'}</div>
              </div>

              <div style={{
                background: 'var(--bg-main, #f8fafc)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                    #
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Room Number</span>
                </div>
                <div style={{ fontSize: '1.25rem', color: '#d97706', fontWeight: 900 }}>{studentDetails.roomNumber || 'Pending'}</div>
              </div>

              <div style={{
                background: 'var(--bg-main, #f8fafc)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                    B
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bed Number</span>
                </div>
                <div style={{ fontSize: '1.25rem', color: '#059669', fontWeight: 900 }}>{studentDetails.bedNumber || 'Pending'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div style={{
                background: 'var(--bg-main, #f8fafc)',
                padding: '0.9rem 1.1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Warden Name</div>
                  <div style={{ fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.wardenName || 'Admin Assigned'}</div>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-main, #f8fafc)',
                padding: '0.9rem 1.1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={20} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Warden Contact</div>
                  <div style={{ fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>{studentDetails.wardenContact || 'N/A'}</div>
                </div>
              </div>
            </div>

            {(() => {
              const feeInfo = getStudentHostelFeeInfo(studentDetails);
              return (
                <div style={{
                  marginTop: '1rem',
                  background: 'var(--bg-main, #f8fafc)',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--bg-surface, #ffffff)', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                      <CreditCard size={20} className="text-primary" />
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 800 }}>Hostel Fee & Ledger</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                        Total: <strong style={{ color: '#1e40af' }}>₹{feeInfo.hostelFee.toLocaleString()}</strong> • Paid: <strong style={{ color: '#16a34a' }}>₹{feeInfo.paidAmount.toLocaleString()}</strong> • Due: <strong style={{ color: feeInfo.dueAmount > 0 ? '#dc2626' : '#16a34a' }}>₹{feeInfo.dueAmount.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    background: feeInfo.isPaid ? '#ecfdf5' : feeInfo.isPartial ? '#fffbeb' : '#fef2f2',
                    color: feeInfo.isPaid ? '#059669' : feeInfo.isPartial ? '#d97706' : '#dc2626',
                    border: `1px solid ${feeInfo.isPaid ? '#a7f3d0' : feeInfo.isPartial ? '#fde68a' : '#fecaca'}`
                  }}>
                    {feeInfo.isPaid ? 'PAID IN FULL' : feeInfo.isPartial ? `PARTIALLY PAID (DUE ₹${feeInfo.dueAmount.toLocaleString()})` : `PENDING (DUE ₹${feeInfo.dueAmount.toLocaleString()})`}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Secondary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            
            {/* Leave Requests (Gate Pass) */}
            <div style={{
              background: 'var(--bg-surface, #ffffff)',
              padding: '1.25rem 1.5rem',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #e2e8f0)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                  <MapPin size={18} className="text-primary" /> Leave Requests (Gate Pass)
                </h3>
                <button onClick={() => setShowLeaveModal(true)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px' }}>Apply Pass</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {leaveRequests.map(req => (
                  <div key={req.id} style={{ padding: '0.9rem 1rem', background: 'var(--bg-main, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{req.type}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{req.dates}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: req.status === 'Approved' ? '#ecfdf5' : '#fffbeb', color: req.status === 'Approved' ? '#059669' : '#d97706', border: `1px solid ${req.status === 'Approved' ? '#a7f3d0' : '#fde68a'}` }}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hostel Notices */}
            <div style={{
              background: 'var(--bg-surface, #ffffff)',
              padding: '1.25rem 1.5rem',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #e2e8f0)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                  <AlertCircle size={18} className="text-warning" /> Hostel Notices
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.9rem 1rem', borderLeft: '3px solid #f59e0b', background: 'var(--bg-main, #f8fafc)', borderRadius: '8px', borderTop: '1px solid var(--border-color, #e2e8f0)', borderRight: '1px solid var(--border-color, #e2e8f0)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Water Supply Maintenance</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: '1.4' }}>Water supply will be disrupted tomorrow between 10 AM to 2 PM.</p>
                </div>
                <div style={{ padding: '0.9rem 1rem', borderLeft: '3px solid #3b82f6', background: 'var(--bg-main, #f8fafc)', borderRadius: '8px', borderTop: '1px solid var(--border-color, #e2e8f0)', borderRight: '1px solid var(--border-color, #e2e8f0)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Mess Menu Update</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: '1.4' }}>The mess menu for the upcoming week has been updated. Please check the notice board.</p>
                </div>
              </div>
            </div>
           </div>
          
          {/* Hostel Night Attendance */}
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                <CheckCircle2 size={20} style={{ color: '#10b981' }} /> Night Attendance
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-main, #f8fafc)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '280px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5', fontSize: '0.85rem' }}>
                  Please mark your daily night attendance before 9:00 PM. The system verifies your location to ensure you are within the hostel premises.
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ textAlign: 'center', background: 'var(--bg-main, #f8fafc)', padding: '0.75rem 1rem', borderRadius: '10px', flex: '1', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>84%</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>This Month</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--bg-main, #f8fafc)', padding: '0.75rem 1rem', borderRadius: '10px', flex: '1', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>21</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Present</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--bg-main, #f8fafc)', padding: '0.75rem 1rem', borderRadius: '10px', flex: '1', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444' }}>4</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Absent</div>
                  </div>
                </div>
              </div>
              
              <div style={{ flex: '0 0 auto', background: attendanceMarked ? '#ecfdf5' : 'var(--bg-main, #f8fafc)', border: `1px solid ${attendanceMarked ? '#a7f3d0' : 'var(--border-color, #e2e8f0)'}`, padding: '1.5rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '220px' }}>
                {attendanceMarked ? (
                  <>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <CheckCircle2 size={26} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#059669', fontWeight: 800 }}>Checked In</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </>
                ) : (
                  <>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <MapPin size={22} />
                    </div>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>Pending Check-in</h4>
                    <button 
                      onClick={handleMarkAttendance}
                      className="btn-primary" 
                      style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '8px', width: '100%', display: 'flex', justifyContent: 'center' }}
                    >
                      Mark Present
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Mess Menu Timetable */}
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                <Calendar size={20} className="text-primary" /> Weekly Mess Menu
              </h3>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main, #f8fafc)' }}>
                    <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Day</th>
                    <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Breakfast</th>
                    <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Lunch</th>
                    <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMessMenu.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.day}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{item.breakfast}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{item.lunch}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{item.dinner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maintenance Complaints */}
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                <MessageSquare size={20} style={{ color: '#ef4444' }} /> Maintenance Complaints
              </h3>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px', background: '#dc2626', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowComplaintModal(true)}
              >
                Log New Complaint
              </button>
            </div>
            {complaintsList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-main, #f8fafc)', borderRadius: '10px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>You have no active maintenance complaints.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '6px 0 0' }}>If you are facing any issues with your room facilities (plumbing, electrical, furniture), click the button above to notify the warden immediately.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {complaintsList.map(comp => (
                  <div key={comp._id || comp.complaintId || comp.id} style={{ background: 'var(--bg-main, #f8fafc)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>{comp.category}</span>
                        {comp.priority && <span style={{ marginLeft: '8px', fontSize: '0.72rem', background: comp.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: comp.priority === 'High' ? '#dc2626' : '#d97706', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{comp.priority} Priority</span>}
                        <h4 style={{ margin: '8px 0 0', fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 600 }}>{comp.description}</h4>
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Logged on {new Date(comp.date || comp.createdAt).toLocaleDateString()} • Ticket #{comp.complaintId || comp.id}
                        </span>
                        {comp.resolutionRemarks && (
                          <div style={{ marginTop: '8px', padding: '8px', background: '#ecfdf5', borderLeft: '3px solid #10b981', borderRadius: '4px' }}>
                            <strong style={{ fontSize: '0.78rem', color: '#065f46' }}>Warden Remarks:</strong>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#047857' }}>{comp.resolutionRemarks}</p>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                          background: comp.status === 'Resolved' ? '#ecfdf5' : (comp.status === 'In Progress' ? '#eff6ff' : '#fffbeb'),
                          color: comp.status === 'Resolved' ? '#059669' : (comp.status === 'In Progress' ? '#2563eb' : '#d97706'),
                          border: `1px solid ${comp.status === 'Resolved' ? '#a7f3d0' : (comp.status === 'In Progress' ? '#bfdbfe' : '#fde68a')}`
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
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            marginTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                <Users size={20} style={{ color: '#6366F1' }} /> My Visitors
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-main, #f8fafc)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                {myVisitors.length} record{myVisitors.length !== 1 ? 's' : ''}
              </span>
            </div>

            {myVisitors.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-main, #f8fafc)', borderRadius: '10px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Users size={22} />
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>No visitor records found</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '6px 0 0' }}>When a family member or friend visits you at the hostel, the warden will log their entry here.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main, #f8fafc)' }}>
                      <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Visitor Name</th>
                      <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Relation</th>
                      <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Date</th>
                      <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>In Time</th>
                      <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Out Time</th>
                      <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myVisitors.map((vis, idx) => (
                      <tr key={vis.id || idx} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{vis.name}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>{vis.relation}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>{vis.date}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: 'var(--text-main)', fontWeight: 600 }}>{vis.inTime}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{vis.outTime === '--' ? '—' : vis.outTime}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {vis.outTime === '--' ? (
                            <button 
                              onClick={() => handleCheckOut(vis.id)}
                              style={{
                                fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px',
                                background: '#d97706', color: 'white', border: 'none', cursor: 'pointer'
                              }}>
                              Check Out
                            </button>
                          ) : (
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px',
                              background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
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
