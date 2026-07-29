import React, { useState, useEffect, useContext } from 'react';
import { Calendar, Search, MapPin, Clock, BookOpen, GraduationCap, FileText, Printer, X, ShieldCheck, QrCode } from 'lucide-react';
import { getExams } from '../../api/index';
import { SettingsContext } from '../../App';

const getStudentSession = () => {
  try { 
    const session = JSON.parse(sessionStorage.getItem('student_session'));
    if (session) return session;
  }
  catch {}
  return { id: 'CS2022001', name: 'John Doe', department: 'Computer Science Engineering', sem: 'Semester 3', section: 'A' };
};

const StudentExams = () => {
  const { collegeSettings } = useContext(SettingsContext);
  const student = getStudentSession();
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hallTicketOpen, setHallTicketOpen] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [student.dept, student.sem]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await getExams();
      if (res?.data) {
        const studDept = student.department || student.dept || 'Computer Science Engineering';
        const studSem = student.sem || student.semester || 'Semester 3';
        
        const filtered = res.data.filter(e => 
          e.dept?.toLowerCase() === studDept.toLowerCase() ||
          e.department?.toLowerCase() === studDept.toLowerCase() ||
          !e.dept
        );
        setExams(filtered.length > 0 ? filtered : res.data);
      }
    } catch (err) {
      console.warn('API error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = exams.filter(ex => {
    const q = search.toLowerCase();
    return ex.name?.toLowerCase().includes(q) || ex.subject?.toLowerCase().includes(q) || ex.room?.toLowerCase().includes(q);
  });

  const printHallTicket = () => {
    window.print();
  };

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  return (
    <div className="animate-fade-in" style={{ padding:'1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Semester Exam Timetable & Hall Ticket</h1>
          <p className="text-muted">View scheduled semester examinations and generate your official hall ticket.</p>
        </div>
        <button 
          className="btn-primary shadow-glow flex items-center gap-2"
          onClick={() => setHallTicketOpen(true)}
          style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FileText size={18} /> Generate Hall Ticket
        </button>
      </div>

      <div className="sm-summary-row" style={{ marginTop:'1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="sm-summary-card glass-card" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total Scheduled Exams</span>
          <div className="sm-summary-value" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.2rem' }}>{exams.length}</div>
        </div>
        <div className="sm-summary-card glass-card" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Exam Halls Allocated</span>
          <div className="sm-summary-value text-success" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.2rem' }}>
            {new Set(exams.map(e => e.room).filter(Boolean)).size || 1}
          </div>
        </div>
        <div className="sm-summary-card glass-card" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span className="sm-summary-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Academic Year</span>
          <div className="sm-summary-value gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.2rem' }}>{academicYear}</div>
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
                <th style={{ padding: '0.75rem 1rem' }}>Exam Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Time Slot</th>
                <th style={{ padding: '0.75rem 1rem' }}>Exam Venue / Hall</th>
                <th style={{ padding: '0.75rem 1rem' }}>Max Marks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-muted" style={{padding:'2rem', textAlign: 'center'}}>Loading exam schedules...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted" style={{padding:'2rem', textAlign: 'center'}}>No exams scheduled for your semester yet.</td></tr>
              ) : filtered.map(ex => (
                <tr key={ex._id || ex.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="font-semibold" style={{ padding: '0.75rem 1rem' }}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><GraduationCap size={15} style={{ color: 'var(--primary)' }}/><span>{ex.name}</span></div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><BookOpen size={13} className="text-muted"/><span>{ex.subject}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><Calendar size={13} className="text-muted"/><span className="text-sm">{ex.date}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><Clock size={13} className="text-muted"/><span className="text-sm font-semibold">{ex.time}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{display:'flex',alignItems:'center',gap:6}}><MapPin size={13} className="text-muted"/><span style={{background:'rgba(59,130,246,0.1)',color:'#3b82f6',padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.78rem',fontWeight:700}}>{ex.room}</span></div></td>
                  <td style={{ padding: '0.75rem 1rem' }}><span style={{background:'rgba(236,72,153,0.1)',color:'#ec4899',padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.78rem',fontWeight:700}}>{ex.maxMarks} Marks</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HALL TICKET MODAL */}
      {hallTicketOpen && (
        <div className="modal-overlay" onClick={() => setHallTicketOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ background: '#ffffff', color: '#1e293b', width: '100%', maxWidth: '800px', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Modal Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', pb: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={22} color="#2563eb" /> Official Hall Ticket Preview
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={printHallTicket}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Printer size={16} /> Print / Save PDF
                </button>
                <button onClick={() => setHallTicketOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: '#64748b' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE HALL TICKET CARD */}
            <div id="hall-ticket-print" style={{ border: '2px solid #0f172a', borderRadius: '12px', padding: '2rem', background: '#fff' }}>
              {/* Institution Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                {collegeSettings?.collegeLogo && (
                  <img src={collegeSettings.collegeLogo} alt="College Logo" style={{ height: '48px', margin: '0 auto 0.5rem auto' }} />
                )}
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {collegeSettings?.collegeName || 'FIC ERP - Autonomous Institution'}
                </h1>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>CONTROLLER OF EXAMINATIONS — HALL TICKET</p>
                <div style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.5rem' }}>
                  ACADEMIC YEAR {academicYear}
                </div>
              </div>

              {/* Student Info Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div>
                  <p style={{ margin: '0.25rem 0' }}><strong>Student Name:</strong> {student.name || 'John Doe'}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Register / Roll No:</strong> {student.id || student.rollNo || 'CS2022001'}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Department:</strong> {student.department || student.dept || 'Computer Science Engineering'}</p>
                </div>
                <div>
                  <p style={{ margin: '0.25rem 0' }}><strong>Semester:</strong> {student.sem || student.semester || 'Semester 3'}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Section:</strong> {student.section || 'A'}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Examination:</strong> End Semester Examinations</p>
                </div>
              </div>

              {/* Exam Schedule Table */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>EXAMINATION TIMETABLE & VENUES</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Subject</th>
                      <th style={{ padding: '0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Timing Slot</th>
                      <th style={{ padding: '0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Exam Hall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No examination schedule available.</td></tr>
                    ) : (
                      exams.map((ex, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                          <td style={{ padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 600 }}>{ex.date}</td>
                          <td style={{ padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 600 }}>{ex.subject}</td>
                          <td style={{ padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1' }}>{ex.time}</td>
                          <td style={{ padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 700, color: '#2563eb' }}>{ex.room || 'Hall 201'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Security Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center', width: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem', background: '#f8fafc', marginBottom: '0.5rem' }}>
                    <QrCode size={36} color="#0f172a" />
                    <div style={{ fontSize: '0.65rem', textAlign: 'left', color: '#64748b' }}>
                      <strong>VERIFIED</strong><br />
                      SECURE HALL TICKET
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '35px', borderBottom: '1px solid #0f172a', width: '150px', margin: '0 auto 0.25rem auto' }}></div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Controller of Examinations</p>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Signature & Seal</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '35px', borderBottom: '1px solid #0f172a', width: '150px', margin: '0 auto 0.25rem auto' }}></div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Principal Signature</p>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Authorized Institutional Seal</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExams;
