import React, { useState, useEffect, useContext } from 'react';
import { 
  Calendar as CalendarIcon, Clock, GraduationCap, MapPin, 
  BookOpen, Search, Filter, Printer, X, 
  ShieldCheck, QrCode, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { 
  getExams, 
  getStudentById, 
  getStudents, 
  getSubjects 
} from '../../api/index';
import { SettingsContext } from '../../App';
import './ParentDashboard.css';

const normalizeSem = (semStr) => {
  if (!semStr) return 'Semester 1';
  const clean = String(semStr).trim();
  if (clean.toLowerCase().startsWith('sem ')) {
    return clean.replace(/^sem\s*/i, 'Semester ');
  }
  if (!clean.toLowerCase().startsWith('semester') && !isNaN(clean)) {
    return `Semester ${clean}`;
  }
  return clean;
};

const ParentTimetable = () => {
  const { collegeSettings } = useContext(SettingsContext) || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hallTicketOpen, setHallTicketOpen] = useState(false);

  // Student & Academic Details
  const [childDetails, setChildDetails] = useState({
    name: 'Student',
    id: '',
    dept: '',
    sem: 'Semester 1',
    section: 'A'
  });

  // Real Database Records
  const [rawExams, setRawExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('All');

  const loadOriginalAcademicData = async () => {
    try {
      setLoading(true);
      const sessionRaw = sessionStorage.getItem('parent_session');
      let parentSession = {};
      if (sessionRaw) {
        try {
          parentSession = JSON.parse(sessionRaw);
        } catch (e) {
          parentSession = {};
        }
      }

      let studentId = parentSession.childId || parentSession.referenceId || parentSession.parentOf || parentSession.id;
      const childNameFromSession = parentSession.childName || parentSession.name || '';
      const tenantId = sessionStorage.getItem('tenantId') || parentSession.tenantId || 'mock_college_id';

      // 1. Fetch Real Student Profile from MongoDB
      let resolvedStudent = null;
      if (studentId) {
        try {
          const studRes = await getStudentById(studentId).catch(() => null);
          if (studRes?.data) {
            resolvedStudent = studRes.data;
          }
        } catch (e) {}
      }

      if (!resolvedStudent) {
        try {
          const allStudsRes = await getStudents().catch(() => null);
          const allStuds = Array.isArray(allStudsRes?.data) ? allStudsRes.data : [];
          if (allStuds.length > 0) {
            resolvedStudent = allStuds.find(s => 
              (s.id && String(s.id).toLowerCase() === String(studentId).toLowerCase()) ||
              (s.rollNo && String(s.rollNo).toLowerCase() === String(studentId).toLowerCase()) ||
              (s._id && String(s._id) === String(studentId)) ||
              (s.name && childNameFromSession && String(s.name).toLowerCase().includes(childNameFromSession.toLowerCase()))
            ) || allStuds[0];
          }
        } catch (e) {}
      }

      const childInfo = {
        name: resolvedStudent?.name || (parentSession.childName && parentSession.childName !== 'John Doe' ? parentSession.childName : 'Student Scholar'),
        id: resolvedStudent?.id || resolvedStudent?.rollNo || resolvedStudent?.registerNo || studentId || 'TAM2026-001',
        dept: resolvedStudent?.dept || resolvedStudent?.department || parentSession.childDept || parentSession.department || 'Computer Science and Engineering',
        sem: normalizeSem(resolvedStudent?.sem || resolvedStudent?.semester || parentSession.childSem || 'Semester 1'),
        section: resolvedStudent?.section || parentSession.childSection || 'A'
      };
      setChildDetails(childInfo);

      if (resolvedStudent?.name && (!parentSession.childName || parentSession.childName === 'John Doe')) {
        sessionStorage.setItem('parent_session', JSON.stringify({
          ...parentSession,
          childName: resolvedStudent.name,
          childId: childInfo.id,
          childDept: childInfo.dept,
          childSem: childInfo.sem
        }));
        window.dispatchEvent(new Event('parent_session_updated'));
      }

      const targetDept = childInfo.dept;
      const targetSem = childInfo.sem;

      // 2. Fetch Real Database Exams and Subjects in Parallel
      const [examsRes, subjectsRes] = await Promise.all([
        getExams().catch(() => ({ data: [] })),
        getSubjects({ dept: targetDept, sem: targetSem }).catch(() => ({ data: [] }))
      ]);

      // 3. Process Original Database Exams
      const allDatabaseExams = Array.isArray(examsRes?.data) 
        ? examsRes.data 
        : Array.isArray(examsRes?.data?.exams) 
        ? examsRes.data.exams 
        : [];

      let localExams = [];
      try {
        const rawLocal = localStorage.getItem(`erp_exams_${tenantId}`) || localStorage.getItem('erp_exams');
        if (rawLocal) localExams = JSON.parse(rawLocal);
      } catch (e) {}

      const combinedExams = [...allDatabaseExams, ...localExams];
      
      const deptNormalized = targetDept.toLowerCase().replace(/[^a-z0-9]/g, '');
      const semNumber = targetSem.replace(/\D/g, '');

      const matchedExams = combinedExams.filter(ex => {
        const exDept = String(ex.dept || ex.department || ex.departmentId?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const exSem = String(ex.sem || ex.semester || ex.semesterId?.name || '').toLowerCase();

        const deptMatch = !exDept || exDept === 'all' || 
          exDept.includes(deptNormalized) || 
          deptNormalized.includes(exDept) ||
          (deptNormalized.includes('computer') && exDept.includes('cs')) ||
          (deptNormalized.includes('tamil') && exDept.includes('tamil')) ||
          (deptNormalized.includes('cyber') && exDept.includes('cyber'));

        const semMatch = !exSem || exSem === 'all' ||
          (semNumber && exSem.includes(semNumber)) ||
          exSem.includes(targetSem.toLowerCase());

        return deptMatch && semMatch;
      });

      // Deduplicate & Format Real Exams
      const formattedRealExams = matchedExams.map((ex, i) => {
        let subName = ex.subject || ex.subjectId?.subjectName || ex.subjectId?.name || ex.name || 'Subject Examination';
        let subCode = ex.code || ex.subjectCode || ex.subjectId?.subjectCode || ex.subjectId?.code || '';
        let roomName = ex.hallName || ex.room || ex.hall || 'Main Examination Block';
        let timeSlot = ex.time || (ex.startTime && ex.endTime ? `${ex.startTime} - ${ex.endTime}` : ex.startTime || '10:00 AM - 01:00 PM');
        let examCat = ex.examType || ex.name || 'Semester Examination';
        let maxM = Number(ex.maxMarks) || 100;
        let passM = Number(ex.passMarks) || 40;

        return {
          id: ex._id || ex.id || `exam-${i}`,
          name: ex.name || examCat,
          examType: examCat,
          subject: subName,
          code: subCode,
          date: ex.date || 'TBA',
          day: ex.day || (ex.date ? new Date(ex.date).toLocaleDateString('en-US', { weekday: 'long' }) : ''),
          time: timeSlot,
          session: timeSlot.toLowerCase().includes('pm') || timeSlot.startsWith('02:') || timeSlot.startsWith('2:') ? 'AN (Afternoon)' : 'FN (Forenoon)',
          room: roomName,
          maxMarks: maxM,
          passMarks: passM,
          status: ex.status || 'Scheduled',
          invigilator: ex.invigilatorName || ex.invigilator || ex.invigilatorId?.name || 'Chief Invigilator'
        };
      });

      setRawExams(formattedRealExams);
      setFilteredExams(formattedRealExams);

      // 4. Process Real Enrolled Subjects from Database
      const rawSubjects = Array.isArray(subjectsRes?.data) 
        ? subjectsRes.data 
        : Array.isArray(subjectsRes?.data?.subjects) 
        ? subjectsRes.data.subjects 
        : [];
      setEnrolledSubjects(rawSubjects);

    } catch (err) {
      console.error('Error fetching original exam timetable:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOriginalAcademicData();
  }, []);

  // Live Filter & Search Logic
  useEffect(() => {
    let result = [...rawExams];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(ex => 
        (ex.name && ex.name.toLowerCase().includes(q)) ||
        (ex.subject && ex.subject.toLowerCase().includes(q)) ||
        (ex.code && ex.code.toLowerCase().includes(q)) ||
        (ex.room && ex.room.toLowerCase().includes(q)) ||
        (ex.invigilator && ex.invigilator.toLowerCase().includes(q))
      );
    }

    if (examTypeFilter !== 'All') {
      result = result.filter(ex => {
        const t = (ex.examType || ex.name || '').toLowerCase();
        if (examTypeFilter === 'Semester') return t.includes('semester') || t.includes('end sem') || t.includes('ese') || t.includes('university');
        if (examTypeFilter === 'Internal') return t.includes('internal') || t.includes('cia') || t.includes('unit') || t.includes('model');
        if (examTypeFilter === 'Practical') return t.includes('practical') || t.includes('lab') || t.includes('viva');
        return true;
      });
    }

    setFilteredExams(result);
  }, [searchQuery, examTypeFilter, rawExams]);

  const printHallTicket = () => {
    window.print();
  };

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  return (
    <div className="parent-page-container animate-fade-in">
      {/* Top Header Card */}
      <div className="parent-header-card glass-card">
        <div className="header-title-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '2px 7px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  Academic Portal
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>• Academic Year {academicYear}</span>
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)', lineHeight: 1.25 }}>
                {childDetails.name}'s Semester Exam Timetable
              </h1>
              <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4 }}>
                {childDetails.dept} • {childDetails.sem} (Section {childDetails.section}) • Roll No: <strong style={{ color: 'var(--text-main, #0f172a)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{childDetails.id}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="header-actions-box">
          <button
            onClick={() => { setRefreshing(true); loadOriginalAcademicData(); }}
            style={{
              background: 'var(--bg-muted, #f1f5f9)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              color: 'var(--text-main, #334155)',
              padding: '7px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              flex: '1 1 auto'
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh Live Data
          </button>

          {rawExams.length > 0 && (
            <button
              onClick={() => setHallTicketOpen(true)}
              style={{
                background: 'var(--primary, #2563eb)',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                flex: '1 1 auto'
              }}
            >
              <ShieldCheck size={15} /> View & Print Hall Ticket
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics from Real Data */}
      <div className="parent-kpi-grid">
        <div className="glass-card" style={{ padding: '0.9rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Scheduled Exams</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '1px' }}>
              {rawExams.length} Courses
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.9rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Allocated Halls</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '1px' }}>
              {new Set(rawExams.map(e => e.room).filter(Boolean)).size || 0} Venues
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.9rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Department Subjects</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '1px' }}>
              {enrolledSubjects.length} Subjects
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.9rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Hall Ticket Status</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: rawExams.length > 0 ? '#10b981' : '#a855f7', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {rawExams.length > 0 ? 'Verified & Published' : 'Awaiting Schedule'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (When exams exist) */}
      {rawExams.length > 0 && (
        <div className="glass-card" style={{ padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', flex: '1 1 200px', width: '100%' }}>
            <Search size={15} className="text-muted" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by subject, code, or exam hall..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'var(--text-main)', fontSize: '0.84rem' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '100%', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <Filter size={13} /> Filter:
            </span>
            <div className="parent-filter-strip">
              {['All', 'Semester', 'Internal', 'Practical'].map(type => (
                <button
                  key={type}
                  onClick={() => setExamTypeFilter(type)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    background: examTypeFilter === type ? 'var(--primary)' : 'var(--bg-primary)',
                    color: examTypeFilter === type ? '#ffffff' : 'var(--text-muted)',
                    borderColor: examTypeFilter === type ? 'var(--primary)' : 'var(--border-color)'
                  }}
                >
                  {type === 'All' ? 'All Exams' : `${type} Exams`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real Examination Schedule Section */}
      <div className="parent-table-card glass-card">
        <div style={{ padding: '0.9rem 1.15rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={17} className="text-primary" /> Examination Schedule
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Retrieved from the examination cell database.
            </p>
          </div>
          <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '3px 8px', borderRadius: '16px', fontSize: '0.74rem', fontWeight: 700 }}>
            {filteredExams.length} Scheduled
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="parent-desktop-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 700, width: '40px' }}>#</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Subject & Course Code</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Exam Category</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Date & Day</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Time Slot & Session</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Exam Venue / Hall</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Max Marks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Clock className="animate-spin text-primary" size={28} />
                      <span>Loading examination schedules from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExams.length > 0 ? (
                filteredExams.map((ex, idx) => (
                  <tr 
                    key={ex.id || idx} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease'
                    }}
                    className="hover:bg-[var(--bg-primary)]/50"
                  >
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                        {ex.subject}
                      </div>
                      {ex.code && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--primary)' }}>
                            {ex.code}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: ex.examType?.toLowerCase().includes('practical') ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: ex.examType?.toLowerCase().includes('practical') ? '#ec4899' : '#3b82f6',
                        border: `1px solid ${ex.examType?.toLowerCase().includes('practical') ? 'rgba(236, 72, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                      }}>
                        {ex.examType}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-main)' }}>
                        <CalendarIcon size={14} className="text-primary" />
                        <span>{ex.date}</span>
                      </div>
                      {ex.day && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '20px', fontWeight: 500 }}>
                          {ex.day}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-main)' }}>
                        <Clock size={14} className="text-muted" />
                        <span>{ex.time}</span>
                      </div>
                      {ex.session && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: '20px' }}>
                          {ex.session}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ color: '#10b981' }} />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {ex.room}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        {ex.maxMarks} Marks
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <AlertCircle size={38} className="text-primary opacity-60" style={{ margin: '0 auto 12px auto' }} />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                      No Examination Schedule Published Yet
                    </div>
                    <p style={{ fontSize: '0.85rem', maxWidth: '500px', margin: '6px auto 0 auto', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      The Controller of Examinations has not yet published an exam date sheet for <strong>{childDetails.dept}</strong> ({childDetails.sem}).
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


      </div>

      {/* Enrolled Curriculum Subjects Section (When Available in Database) */}
      {enrolledSubjects.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} className="text-primary" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Registered Curriculum Subjects for {childDetails.sem}
              </h4>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {enrolledSubjects.length} Courses Enrolled
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {enrolledSubjects.map((sub, sIdx) => {
              const sTitle = sub.name || sub.subjectName || sub.title || 'Course';
              const sCode = sub.code || sub.subjectCode || '';
              const sCredits = sub.credits || sub.credit || '';
              const sType = sub.type || sub.subjectType || 'Theory';

              return (
                <div 
                  key={sub._id || sub.id || sIdx}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {sTitle}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      {sCode && (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                          {sCode}
                        </span>
                      )}
                      {sCredits && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          • {sCredits} Credits
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: sType.toLowerCase().includes('lab') ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)',
                    color: sType.toLowerCase().includes('lab') ? '#ec4899' : '#3b82f6'
                  }}>
                    {sType}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Important Examination Guidelines */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <Info size={18} className="text-primary" />
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Official Examination Rules & Instructions
          </h4>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
            <span><strong>Reporting Time:</strong> Candidates must report to their examination venue 30 minutes prior to the commencement of each session.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
            <span><strong>Mandatory Entry Pass:</strong> Physical Hall Ticket and Valid College Student ID card must be presented at the examination hall.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: '#ef4444', fontWeight: 800 }}>✗</span>
            <span><strong>Prohibited Materials:</strong> Cellular phones, programmable calculators, electronic gadgets, and notes are strictly prohibited.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: '#3b82f6', fontWeight: 800 }}>ℹ</span>
            <span><strong>Exam Cell Support:</strong> For hall allocation or registration issues, contact the Controller of Examinations.</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          OFFICIAL HALL TICKET MODAL (PRINT & PREVIEW - REAL DATA)
          ========================================================= */}
      {hallTicketOpen && rawExams.length > 0 && (
        <div 
          className="modal-overlay animate-fade-in" 
          onClick={() => setHallTicketOpen(false)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.65)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            padding: '1rem' 
          }}
        >
          <div 
            className="modal-card animate-scale-up parent-modal-card" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: '#ffffff', 
              color: '#0f172a', 
              width: '100%', 
              maxWidth: '850px', 
              borderRadius: '16px', 
              padding: '1.25rem', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              boxSizing: 'border-box'
            }}
          >
            {/* Modal Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Official Examination Hall Ticket
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  onClick={printHallTicket}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '0.45rem 0.85rem', 
                    background: '#2563eb', 
                    color: '#ffffff', 
                    borderRadius: '8px', 
                    border: 'none', 
                    fontWeight: 700, 
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <Printer size={15} /> Print / PDF
                </button>
                <button 
                  onClick={() => setHallTicketOpen(false)} 
                  style={{ 
                    background: '#f1f5f9', 
                    border: 'none', 
                    borderRadius: '8px', 
                    padding: '0.45rem', 
                    cursor: 'pointer', 
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="Close Hall Ticket"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE HALL TICKET PAPER VIEW */}
            <div id="parent-hall-ticket-print" style={{ border: '2px solid #0f172a', borderRadius: '12px', padding: '1rem', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}>
              {/* Institution Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                {collegeSettings?.collegeLogo && (
                  <img src={collegeSettings.collegeLogo} alt="College Logo" style={{ height: '40px', margin: '0 auto 0.3rem auto' }} />
                )}
                <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px 0' }}>
                  {collegeSettings?.collegeName || 'CAMPUS ERP INSTITUTION OF HIGHER EDUCATION'}
                </h1>
                <p style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, margin: '0 0 4px 0' }}>
                  OFFICE OF THE CONTROLLER OF EXAMINATIONS • OFFICIAL HALL TICKET
                </p>
                <div style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 800 }}>
                  END SEMESTER EXAMINATIONS • ACADEMIC YEAR {academicYear}
                </div>
              </div>

              {/* Student Info Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div>
                  <p style={{ margin: '0.2rem 0' }}><strong>Student Name:</strong> {childDetails.name}</p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Register / Roll No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{childDetails.id}</span></p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Department:</strong> {childDetails.dept}</p>
                </div>
                <div>
                  <p style={{ margin: '0.2rem 0' }}><strong>Semester / Section:</strong> {childDetails.sem} (Section {childDetails.section})</p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Examination Center:</strong> Main Examination Hall</p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Candidate Status:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>Eligible & Regular</span></p>
                </div>
              </div>

              {/* Exam Schedule Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
                  REGISTERED SUBJECT SCHEDULE & SEAT ALLOCATIONS
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '0.5rem 0.6rem', border: '1px solid #0f172a', textAlign: 'left', width: '30px' }}>#</th>
                      <th style={{ padding: '0.5rem 0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Date & Day</th>
                      <th style={{ padding: '0.5rem 0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Subject Title</th>
                      <th style={{ padding: '0.5rem 0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Timing</th>
                      <th style={{ padding: '0.5rem 0.6rem', border: '1px solid #0f172a', textAlign: 'left' }}>Exam Hall</th>
                      <th style={{ padding: '0.5rem 0.6rem', border: '1px solid #0f172a', textAlign: 'center' }}>Invigilator Initial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawExams.map((ex, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 600 }}>{ex.date}</td>
                        <td style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 700 }}>
                          {ex.subject}
                          {ex.code && <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Code: {ex.code}</span>}
                        </td>
                        <td style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1' }}>{ex.time}</td>
                        <td style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 700, color: '#2563eb' }}>{ex.room}</td>
                        <td style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', textAlign: 'center', color: '#94a3b8' }}>____________</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Security Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center', width: '150px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.35rem', background: '#f8fafc', marginBottom: '0.4rem' }}>
                    <QrCode size={32} color="#0f172a" />
                    <div style={{ fontSize: '0.62rem', textAlign: 'left', color: '#64748b', lineHeight: 1.2 }}>
                      <strong>VERIFIED</strong><br />
                      SECURE PASS
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '30px', borderBottom: '1px solid #0f172a', width: '140px', margin: '0 auto 0.2rem auto' }}></div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Candidate Signature</p>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>(Sign in presence of Invigilator)</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '30px', borderBottom: '1px solid #0f172a', width: '140px', margin: '0 auto 0.2rem auto' }}></div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Controller of Examinations</p>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>Authorized Seal</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ParentTimetable;
