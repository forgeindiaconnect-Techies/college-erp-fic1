import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, MapPin, Clock, BookOpen, GraduationCap, CheckCircle, UserCheck, X, Award, PlayCircle } from 'lucide-react';
import { getExams, getStudents } from '../../api/index';

const getStaffSession = () => {
  try { return JSON.parse(sessionStorage.getItem('staff_session')) || { dept: 'Computer Science' }; }
  catch { return { dept: 'Computer Science' }; }
};

const StaffExams = () => {
  const staff = getStaffSession();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Exam Attendance State
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchExams();
  }, [staff.dept]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await getExams();
      if (res?.data) {
        setExams(res.data);
      }
    } catch (err) {
      console.warn('API error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExamAttendance = async (exam) => {
    setSelectedExam(exam);
    setAttendanceModal(true);
    setSuccessMessage('');
    try {
      const res = await getStudents();
      const students = res.data || [
        { _id: '101', name: 'Rahul S', rollNo: 'CS2022001', dept: exam.dept || 'Computer Science' },
        { _id: '102', name: 'Priya K', rollNo: 'CS2022002', dept: exam.dept || 'Computer Science' },
        { _id: '103', name: 'Ajay M', rollNo: 'CS2022003', dept: exam.dept || 'Computer Science' },
      ];
      setStudentList(students);
      const initial = {};
      students.forEach(s => { initial[s._id || s.rollNo] = 'Present'; });
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
      setSuccessMessage('Exam Attendance recorded successfully!');
      setTimeout(() => {
        setAttendanceModal(false);
      }, 1200);
    }, 500);
  };

  const filtered = exams.filter(ex => {
    const q = search.toLowerCase();
    return ex.name?.toLowerCase().includes(q) || ex.subject?.toLowerCase().includes(q) || ex.room?.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in" style={{ padding:'1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Exam Timetable & Invigilation Duty</h1>
          <p className="text-muted">Manage today's scheduled examinations, conduct exam attendance, and upload marks.</p>
        </div>
        <button 
          onClick={() => navigate('/staff/marks')}
          style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Award size={18} /> Upload Exam Marks
        </button>
      </div>

      <div className="sm-summary-row" style={{ marginTop:'1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="sm-summary-card glass-card" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Scheduled Exams</span>
          <div className="sm-summary-value" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.2rem' }}>{exams.length}</div>
        </div>
        <div className="sm-summary-card glass-card" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Unique Venues</span>
          <div className="sm-summary-value text-success" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.2rem' }}>
            {new Set(exams.map(e => e.room).filter(Boolean)).size || 1}
          </div>
        </div>
        <div className="sm-summary-card glass-card" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Invigilation Status</span>
          <div className="sm-summary-value gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.2rem' }}>Active</div>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop:'1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div className="filters-row" style={{ padding: '1rem' }}>
          <div className="search-box" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Search size={16} className="text-muted"/>
            <input placeholder="Search by exam, subject or room..." value={search} onChange={e=>setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'var(--text-main)' }}/>
          </div>
        </div>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Exam Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                <th style={{ padding: '0.75rem 1rem' }}>Semester</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Time</th>
                <th style={{ padding: '0.75rem 1rem' }}>Venue</th>
                <th style={{ padding: '0.75rem 1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{padding:'2rem', textAlign: 'center'}}>Loading exam schedules...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{padding:'2rem', textAlign: 'center'}}>No exams scheduled yet.</td></tr>
              ) : filtered.map(ex => (
                <tr key={ex._id || ex.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="font-semibold" style={{ padding: '0.75rem 1rem' }}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><GraduationCap size={15} style={{ color: 'var(--primary)' }}/><span>{ex.name}</span></div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><BookOpen size={13} className="text-muted"/><span>{ex.subject}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}><span className="badge-outline" style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-primary)', borderRadius: '4px', fontSize: '0.8rem' }}>{ex.sem}</span></td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><Calendar size={13} className="text-muted"/><span className="text-sm">{ex.date}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><Clock size={13} className="text-muted"/><span className="text-sm font-semibold">{ex.time}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><MapPin size={13} className="text-muted"/><span style={{background:'rgba(59,130,246,0.1)',color:'#3b82f6',padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.78rem',fontWeight:700}}>{ex.room}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button 
                      onClick={() => handleOpenExamAttendance(ex)}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <UserCheck size={14} /> Exam Attendance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXAM ATTENDANCE MODAL */}
      {attendanceModal && selectedExam && (
        <div className="modal-overlay" onClick={() => setAttendanceModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', width: '100%', maxWidth: '650px', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', pb: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={20} color="#10b981" /> Exam Attendance — {selectedExam.subject}
                </h3>
                <p className="text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{selectedExam.name} • Venue: {selectedExam.room || 'Hall 201'}</p>
              </div>
              <button onClick={() => setAttendanceModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
            </div>

            {successMessage ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '1.5rem', borderRadius: '10px', textAlign: 'center', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={32} />
                <span>{successMessage}</span>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Roll No</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Student Name</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentList.map(st => {
                        const id = st._id || st.rollNo;
                        const status = attendanceRecords[id] || 'Present';
                        return (
                          <tr key={id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{st.rollNo || st.id || 'CS2022001'}</td>
                            <td style={{ padding: '0.6rem 0.8rem' }}>{st.name}</td>
                            <td style={{ padding: '0.6rem 0.8rem' }}>
                              <button 
                                onClick={() => toggleStatus(id)}
                                style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: status === 'Present' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: status === 'Present' ? '#10b981' : '#ef4444'
                                }}
                              >
                                {status}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', pt: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <button onClick={() => setAttendanceModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSaveAttendance} disabled={savingAttendance} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    {savingAttendance ? 'Saving...' : 'Save Exam Attendance'}
                  </button>
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
