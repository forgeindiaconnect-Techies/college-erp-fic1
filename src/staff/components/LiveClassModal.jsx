import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, Play, Square, Users, BookOpen, FileText, Upload, Clock, AlertCircle, Plus, Check } from 'lucide-react';
import { getStudents, markAttendance, uploadClassNotes, createAssignment, endClassSession } from '../../api/index';

const LiveClassModal = ({ slot, onClose, onSessionUpdated }) => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'notes', 'assignment'
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: 'Present' | 'Absent' }
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(slot.attendanceSubmitted || false);

  // Notes Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [uploadingNotes, setUploadingNotes] = useState(false);
  const [notesList, setNotesList] = useState(slot.notes || []);

  // Assignment Form State
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [creatingAssign, setCreatingAssign] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const subjectName = slot.subjectId?.subjectName || slot.subject || 'Subject';
  const roomNo = slot.roomNo || 'Room 201';
  const classInfo = `${slot.department || ''} • ${slot.semester || ''} Sec ${slot.section || ''}`;

  // Fetch Students Roster for auto-attendance
  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await getStudents().catch(() => ({ data: [] }));
      const allStuds = res.data || [];
      
      // Filter by department and semester
      const filtered = allStuds.filter(st => 
        (st.dept === slot.department || st.department === slot.department)
      );

      const roster = filtered.length > 0 ? filtered : allStuds.slice(0, 10);
      setStudents(roster);

      // Default all to Present
      const initialMap = {};
      roster.forEach(st => {
        const key = st._id || st.id;
        initialMap[key] = 'Present';
      });
      setAttendanceData(initialMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  }, [slot.department]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const toggleStudentAttendance = (studentId) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: (prev[studentId] || 'Present') === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    setError('');
    setSuccess('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const subjectNameStr = slot.subjectId?.subjectName || slot.subject || 'Database Management Systems';
      const payload = students.map(st => {
        const key = st._id || st.id;
        return {
          studentId: key,
          status: attendanceData[key] || 'Present',
          date: todayStr,
          attendanceDate: todayStr,
          department: slot.department,
          semester: slot.semester,
          section: slot.section,
          subjectId: slot.subjectId?._id || slot.subjectId || slot.subject,
          subjectName: subjectNameStr,
          subject: subjectNameStr,
          periodId: slot.periodId?._id || slot.periodId
        };
      });

      await markAttendance(payload);

      setAttendanceSaved(true);
      setSuccess('Attendance recorded and saved successfully!');
      if (onSessionUpdated) onSessionUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving attendance.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleUploadNotes = async (e) => {
    e.preventDefault();
    if (!noteTitle || !noteUrl) return;
    setUploadingNotes(true);
    setError('');
    setSuccess('');
    try {
      if (slot.session?._id) {
        await uploadClassNotes(slot.session._id, { title: noteTitle, fileUrl: noteUrl });
      }
      setNotesList(prev => [...prev, { title: noteTitle, fileUrl: noteUrl, uploadedAt: new Date() }]);
      setNoteTitle('');
      setNoteUrl('');
      setSuccess('Class notes uploaded and published to students!');
      if (onSessionUpdated) onSessionUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading notes.');
    } finally {
      setUploadingNotes(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignTitle || !assignDueDate) return;
    setCreatingAssign(true);
    setError('');
    setSuccess('');
    try {
      await createAssignment({
        title: assignTitle,
        description: assignDesc,
        subject: subjectName,
        department: slot.department,
        class: slot.semester,
        faculty: slot.facultyAllocationId?.staffId?.name || slot.session?.faculty || 'Faculty',
        dueDate: assignDueDate
      });
      setAssignTitle('');
      setAssignDesc('');
      setAssignDueDate('');
      setSuccess('Assignment published to students!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating assignment.');
    } finally {
      setCreatingAssign(false);
    }
  };

  const handleEndClass = async () => {
    if (!window.confirm('Are you sure you want to end this live class session?')) return;
    try {
      if (slot.session?._id) {
        await endClassSession(slot.session._id);
      }
      if (onSessionUpdated) onSessionUpdated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error ending class session.');
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        padding: '1rem'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          background: '#ffffff',
          color: '#0f172a',
          width: '100%',
          maxWidth: '680px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        
        {/* Live Header Banner */}
        <div style={{ background: '#0f172a', color: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }}></span> LIVE SESSION
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{roomNo}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>{subjectName}</h2>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0.2rem 0 0 0', fontWeight: 500 }}>{classInfo}</p>
          </div>

          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', borderRadius: '8px', cursor: 'pointer', padding: '0.35rem 0.6rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Tabs Bar */}
        <div style={{ display: 'flex', background: '#f8fafc', padding: '0.5rem 1rem', borderBottom: '1px solid #e2e8f0', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: activeTab === 'attendance' ? '#2563eb' : '#e2e8f0',
              color: activeTab === 'attendance' ? '#ffffff' : '#334155'
            }}
          >
            <Users size={15} /> Take Attendance {attendanceSaved && <Check size={14} style={{ color: '#34d399' }} />}
          </button>

          <button 
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: activeTab === 'notes' ? '#2563eb' : '#e2e8f0',
              color: activeTab === 'notes' ? '#ffffff' : '#334155'
            }}
          >
            <Upload size={15} /> Upload Notes
          </button>

          <button 
            onClick={() => setActiveTab('assignment')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: activeTab === 'assignment' ? '#2563eb' : '#e2e8f0',
              color: activeTab === 'assignment' ? '#ffffff' : '#334155'
            }}
          >
            <FileText size={15} /> Homework / Assignment
          </button>
        </div>

        {/* Scrollable Tab Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, fontSize: '0.8rem', background: '#ffffff', color: '#0f172a' }}>
          
          {error && (
            <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '0.75rem', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '8px', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#059669" /> {success}
            </div>
          )}

          {/* TAB 1: TAKE ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem' }}>Enrolled Students ({students.length})</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Click student card to mark Present / Absent</span>
              </div>

              {loadingStudents ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Loading student roster...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {students.map((st) => {
                    const key = st._id || st.id;
                    const isPresent = (attendanceData[key] || 'Present') === 'Present';
                    return (
                      <div 
                        key={key}
                        onClick={() => toggleStudentAttendance(key)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '10px',
                          border: `2px solid ${isPresent ? '#10b981' : '#ef4444'}`,
                          background: isPresent ? '#f0fdf4' : '#fef2f2',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{st.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, marginTop: '0.1rem' }}>
                            {st.registerNo || st.rollNo || st.id || 'Reg#101'}
                          </div>
                        </div>

                        <span 
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: isPresent ? '#059669' : '#dc2626',
                            color: '#ffffff'
                          }}
                        >
                          {isPresent ? 'PRESENT ✅' : 'ABSENT ❌'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleSaveAttendance}
                disabled={savingAttendance || students.length === 0}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (savingAttendance || students.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (savingAttendance || students.length === 0) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
                }}
              >
                <Check size={18} /> {savingAttendance ? 'Saving Attendance...' : 'Save & Publish Attendance'}
              </button>
            </div>
          )}

          {/* TAB 2: UPLOAD NOTES */}
          {activeTab === 'notes' && (
            <div>
              <form onSubmit={handleUploadNotes} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>Upload New Study Material</h4>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Title / Chapter Name</label>
                  <input 
                    type="text" 
                    required
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder="e.g. Chapter 3 - Pointers & Memory Management.pdf"
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Document Link / Cloud URL</label>
                  <input 
                    type="url" 
                    required
                    value={noteUrl}
                    onChange={e => setNoteUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/example..."
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={uploadingNotes}
                  style={{ padding: '0.6rem 1.2rem', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', border: 'none', borderRadius: '8px', cursor: uploadingNotes ? 'not-allowed' : 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Upload size={15} /> {uploadingNotes ? 'Publishing...' : 'Publish Material'}
                </button>
              </form>

              <h4 style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Published Notes for Today ({notesList.length})</h4>
              {notesList.length === 0 ? (
                <p style={{ color: '#64748b', fontStyle: 'italic' }}>No notes uploaded yet for this session.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {notesList.map((n, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, color: '#1e3a8a' }}>{n.title}</div>
                      <a href={n.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textDecoration: 'underline' }}>
                        View File
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE ASSIGNMENT */}
          {activeTab === 'assignment' && (
            <form onSubmit={handleCreateAssignment} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>Create Homework Assignment</h4>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Assignment Title</label>
                <input 
                  type="text" 
                  required
                  value={assignTitle}
                  onChange={e => setAssignTitle(e.target.value)}
                  placeholder="e.g. Arrays & Dynamic Memory Allocation"
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Instructions / Description</label>
                <textarea 
                  rows={2}
                  value={assignDesc}
                  onChange={e => setAssignDesc(e.target.value)}
                  placeholder="Write a program in C to perform matrix multiplication using 2D arrays..."
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Submission Due Date</label>
                <input 
                  type="date" 
                  required
                  value={assignDueDate}
                  onChange={e => setAssignDueDate(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: 700, outline: 'none' }}
                />
              </div>

              <button 
                type="submit"
                disabled={creatingAssign}
                style={{ padding: '0.6rem 1.2rem', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', border: 'none', borderRadius: '8px', cursor: creatingAssign ? 'not-allowed' : 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={15} /> {creatingAssign ? 'Publishing...' : 'Publish Assignment'}
              </button>
            </form>
          )}

        </div>

        {/* Footer Bar: End Class */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
            Session Status: <strong style={{ color: '#059669', fontWeight: 800 }}>LIVE 🟢</strong>
          </div>

          <button
            onClick={handleEndClass}
            style={{
              padding: '0.55rem 1.25rem',
              background: '#dc2626',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8rem',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 10px rgba(220,38,38,0.25)'
            }}
          >
            <Square size={14} /> End Class Session
          </button>
        </div>

      </div>
    </div>
  );
};

export default LiveClassModal;
