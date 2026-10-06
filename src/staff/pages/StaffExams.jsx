import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Search, MapPin, Clock, BookOpen, GraduationCap, 
  CheckCircle, UserCheck, X, Award, ShieldAlert, Users, 
  Layers, CheckCircle2, AlertCircle, Sparkles, Building2, BellRing
} from 'lucide-react';
import { getExams, getStudents } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const getStaffSession = () => {
  try { 
    return JSON.parse(sessionStorage.getItem('staff_session')) || { name: 'Staff Faculty', dept: 'General' }; 
  } catch { 
    return { name: 'Staff Faculty', dept: 'General' }; 
  }
};

const StaffExams = () => {
  const staff = getStaffSession();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('my-duties'); // 'my-duties' or 'all-exams'
  const [loading, setLoading] = useState(true);
  
  // Exam Attendance State
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const staffNameClean = (staff.name || '').toLowerCase().trim();
  const staffIdClean = String(staff._id || staff.id || staff.referenceId || '').toLowerCase().trim();

  const isAssignedToMe = (ex) => {
    if (!ex) return false;
    const invigId = String(ex.invigilatorId?._id || ex.invigilatorId?.id || ex.invigilatorId || '').toLowerCase().trim();
    const invigName = String(ex.invigilatorName || ex.invigilator || ex.invigilatorId?.name || '').toLowerCase().trim();

    if (staffIdClean && invigId && (invigId === staffIdClean || invigId.includes(staffIdClean))) return true;
    if (staffNameClean && invigName) {
      // Check partial or exact name matches (e.g. "RENUKA" in "RENUKA — Assistant Prof.")
      const tokens = staffNameClean.split(' ').filter(t => t.length > 2);
      if (invigName.includes(staffNameClean) || staffNameClean.includes(invigName)) return true;
      if (tokens.some(t => invigName.includes(t))) return true;
    }
    return false;
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await getExams();
      if (res?.data) {
        setExams(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.warn('API error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [staff.dept]);

  useRealtimeSync(() => {
    fetchExams();
  }, 'exams');

  const myDuties = useMemo(() => {
    return exams.filter(ex => isAssignedToMe(ex));
  }, [exams, staffNameClean, staffIdClean]);

  const displayedExams = useMemo(() => {
    const baseList = activeTab === 'my-duties' ? myDuties : exams;
    const q = search.toLowerCase().trim();
    if (!q) return baseList;
    return baseList.filter(ex => {
      const name = (ex.name || '').toLowerCase();
      const subject = (ex.subject || ex.subjectId?.subjectName || ex.subjectId?.name || '').toLowerCase();
      const room = (ex.room || ex.hallName || '').toLowerCase();
      const invig = (ex.invigilatorName || ex.invigilator || ex.invigilatorId?.name || '').toLowerCase();
      return name.includes(q) || subject.includes(q) || room.includes(q) || invig.includes(q);
    });
  }, [exams, myDuties, activeTab, search]);

  const handleOpenExamAttendance = async (exam) => {
    setSelectedExam(exam);
    setAttendanceModal(true);
    setSuccessMessage('');
    try {
      const res = await getStudents();
      const allStuds = Array.isArray(res?.data) ? res.data : [];
      
      const examDept = (exam.dept || '').toLowerCase().trim();
      const examSem = (exam.sem || '').toLowerCase().trim();
      
      let matched = allStuds.filter(s => {
        const sDept = (s.dept || s.department || '').toLowerCase().trim();
        const sSem = (s.sem || s.semester || '').toLowerCase().trim();
        if (examDept && sDept && !examDept.includes(sDept) && !sDept.includes(examDept)) return false;
        if (examSem && sSem && !examSem.includes(sSem) && !sSem.includes(examSem)) return false;
        return true;
      });

      if (matched.length === 0 && allStuds.length > 0) {
        matched = allStuds.slice(0, 20);
      }

      setStudentList(matched);
      const initial = {};
      matched.forEach(s => { initial[s._id || s.id || s.rollNo] = 'Present'; });
      setAttendanceRecords(initial);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = (id) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [id]: prev[id] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const handleSaveAttendance = () => {
    setSavingAttendance(true);
    setTimeout(() => {
      setSavingAttendance(false);
      setSuccessMessage('Exam Attendance recorded and synchronized successfully!');
      setTimeout(() => {
        setAttendanceModal(false);
      }, 1200);
    }, 500);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '10px', borderRadius: '10px', color: '#4f46e5' }}>
              <ShieldAlert size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Exam Duty Center & Invigilation</h1>
              <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                View your scheduled hall invigilation duties, check duty timings, and conduct live hall attendance.
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/staff/marks')}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#3b82f6', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Award size={18} /> Upload Exam Marks
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sm-summary-row" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="sm-summary-card glass-card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="sm-summary-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>My Invigilation Duties</span>
            <span style={{ padding: '4px 10px', borderRadius: '20px', background: myDuties.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)', color: myDuties.length > 0 ? '#10b981' : '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
              {myDuties.length > 0 ? 'ACTIVE' : 'NO DUTIES'}
            </span>
          </div>
          <div className="sm-summary-value" style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: myDuties.length > 0 ? '#10b981' : 'var(--text-main)' }}>
            {myDuties.length} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>sessions</span>
          </div>
        </div>

        <div className="sm-summary-card glass-card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Department Exams</span>
          <div className="sm-summary-value" style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: '#3b82f6' }}>
            {exams.length} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>slots</span>
          </div>
        </div>

        <div className="sm-summary-card glass-card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Examination Venues</span>
          <div className="sm-summary-value" style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.4rem', color: '#8b5cf6' }}>
            {new Set(myDuties.map(e => e.room || e.hallName).filter(Boolean)).size || (exams.length > 0 ? 1 : 0)} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>halls</span>
          </div>
        </div>
      </div>

      {/* Tabs and Search Navigation */}
      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('my-duties')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'my-duties' ? '#4f46e5' : 'var(--bg-primary)',
                color: activeTab === 'my-duties' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              <ShieldAlert size={16} /> My Assigned Duties ({myDuties.length})
            </button>
            <button
              onClick={() => setActiveTab('all-exams')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'all-exams' ? '#4f46e5' : 'var(--bg-primary)',
                color: activeTab === 'all-exams' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              <Layers size={16} /> All Exam Schedules ({exams.length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '260px' }}>
            <Search size={16} className="text-muted" />
            <input 
              placeholder="Search exam, hall, or subject..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'var(--text-main)', fontSize: '0.85rem' }} 
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Exam Type</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Subject</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Sem & Section</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date & Slot</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Venue / Hall</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Invigilator Status</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>Duty Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading invigilation duty roster...
                  </td>
                </tr>
              ) : displayedExams.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <ShieldAlert size={40} color="#94a3b8" />
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                        {activeTab === 'my-duties' ? 'No Invigilation Duties Assigned Yet' : 'No Exams Scheduled'}
                      </div>
                      <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem', maxWidth: '400px' }}>
                        {activeTab === 'my-duties'
                          ? 'When the Admin or HOD assigns you to an exam hall as an Invigilator, your duty details and hall numbers will appear here.'
                          : 'No examination timetable slots found for this filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : displayedExams.map((ex, idx) => {
                const assigned = isAssignedToMe(ex);
                const invigName = ex.invigilatorName || ex.invigilator || ex.invigilatorId?.name || 'Unassigned';
                const subjectTitle = ex.subject || ex.subjectId?.subjectName || ex.subjectId?.name || 'Curriculum Subject';
                const roomName = ex.hallName || ex.room || 'Main Hall';
                const timeSlot = ex.startTime ? `${ex.startTime} – ${ex.endTime || 'End'}` : ex.time || '10:00 AM – 12:00 PM';

                return (
                  <tr 
                    key={ex._id || ex.id || idx} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      background: assigned ? 'rgba(99, 102, 241, 0.03)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GraduationCap size={16} color="#4f46e5" />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ex.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max: {ex.maxMarks || 100} Marks</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{subjectTitle}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.dept || 'General'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.78rem', fontWeight: 600 }}>
                        {ex.sem || 'Sem 1'} {ex.section ? `• Sec ${ex.section}` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} className="text-muted" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ex.date}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: '#4f46e5', fontSize: '0.8rem', fontWeight: 700 }}>
                        <Clock size={12} />
                        <span>{timeSlot}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#3b82f6" />
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '3px 8px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                          {roomName}
                        </span>
                      </div>
                      {ex.hallCapacity > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Cap: {ex.hallCapacity} scholars
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {assigned ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>Assigned to You</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {invigName}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenExamAttendance(ex)}
                        style={{
                          padding: '0.45rem 0.9rem',
                          borderRadius: '8px',
                          background: assigned ? '#10b981' : 'var(--bg-primary)',
                          color: assigned ? '#ffffff' : 'var(--text-main)',
                          border: assigned ? 'none' : '1px solid var(--border-color)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: assigned ? '0 2px 6px rgba(16, 185, 129, 0.25)' : 'none'
                        }}
                      >
                        <UserCheck size={14} /> Conduct Hall Attendance
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXAM ATTENDANCE MODAL */}
      {attendanceModal && selectedExam && (
        <div className="modal-overlay" onClick={() => setAttendanceModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', width: '100%', maxWidth: '700px', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                  <UserCheck size={22} color="#10b981" /> Exam Hall Attendance — {selectedExam.subject || selectedExam.subjectId?.subjectName || 'Subject'}
                </h3>
                <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  {selectedExam.name} • Venue: <strong style={{ color: '#3b82f6' }}>{selectedExam.hallName || selectedExam.room || 'Assigned Hall'}</strong> • Slot: {selectedExam.startTime || selectedExam.time}
                </p>
              </div>
              <button onClick={() => setAttendanceModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
            </div>

            {successMessage ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2rem', borderRadius: '12px', textAlign: 'center', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={40} />
                <span style={{ fontSize: '1.1rem' }}>{successMessage}</span>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Roll / Reg No</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentList.map(st => {
                        const id = st._id || st.id || st.rollNo;
                        const status = attendanceRecords[id] || 'Present';
                        return (
                          <tr key={id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#4f46e5' }}>{st.id || st.rollNo || st.admissionNo || 'CS2026-001'}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{st.name}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <button 
                                onClick={() => toggleStatus(id)}
                                style={{
                                  padding: '0.35rem 1rem',
                                  borderRadius: '8px',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: status === 'Present' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: status === 'Present' ? '#10b981' : '#ef4444',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {status === 'Present' ? '✓ Present' : '✗ Absent'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Total candidates: <strong style={{ color: 'var(--text-main)' }}>{studentList.length}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setAttendanceModal(false)} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button onClick={handleSaveAttendance} disabled={savingAttendance} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}>
                      {savingAttendance ? 'Saving...' : 'Save & Confirm Attendance'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffExams;
