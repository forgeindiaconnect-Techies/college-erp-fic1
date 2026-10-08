import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Plus, Trash2, Clock, Users, MapPin, X, BookOpen, Layers, CheckCircle2, Filter, UserCheck, Play } from 'lucide-react';
import { getTimetable, createTimetable, deleteTimetable, getPeriodMasters, getFacultyAllocations, getStaff, getMyTimetable } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import LiveClassModal from '../../staff/components/LiveClassModal';
import './HodTimetable.css';

const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'Prof. Rajan Iyer', dept: 'Computer Science', deptCode: 'CS', role: 'HOD'
    };
  } catch (e) {
    return { name: 'Prof. Rajan Iyer', dept: 'Computer Science', deptCode: 'CS', role: 'HOD' };
  }
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const ROOM_OPTIONS = ['C101', 'C102', 'C103', 'LAB-1', 'LAB-2', 'Room 201', 'Room 202', 'CS Lab 1', 'CS Lab 2', 'Seminar Hall'];

const SUBJECT_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.08)', border: '#bfdbfe', text: '#1e40af', badge: '#2563eb' },
  { bg: 'rgba(16, 185, 129, 0.08)', border: '#a7f3d0', text: '#065f46', badge: '#059669' },
  { bg: 'rgba(139, 92, 246, 0.08)', border: '#ddd6fe', text: '#5b21b6', badge: '#7c3aed' },
  { bg: 'rgba(245, 158, 11, 0.08)', border: '#fef08a', text: '#92400e', badge: '#d97706' },
  { bg: 'rgba(236, 72, 153, 0.08)', border: '#fbcfe8', text: '#9d174d', badge: '#db2777' },
  { bg: 'rgba(6, 182, 212, 0.08)', border: '#c7d2fe', text: '#155e75', badge: '#0891b2' },
];

const parseTimeMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const formatPeriodName = (period) => {
  if (!period) return 'Period';
  const name = typeof period === 'string' ? period.trim() : (period.periodName || '').trim();
  if (period.isBreak || name.toLowerCase().includes('break') || name.toLowerCase().includes('lunch')) {
    return name;
  }
  return name.toLowerCase().includes('period') ? name : `Period ${name}`;
};

const formatRoomNo = (room) => {
  if (!room) return 'Room 201';
  const name = typeof room === 'string' ? room.trim() : (room.roomNo || '').trim();
  if (name.toLowerCase().includes('room') || name.toLowerCase().includes('lab') || name.toLowerCase().startsWith('c')) {
    return name;
  }
  return `Room ${name}`;
};

const getDayDateInfo = (dayName) => {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const daysMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  const targetDayOfWeek = daysMap[dayName] || 1;

  let diff = targetDayOfWeek - currentDayOfWeek;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);

  const isToday = diff === 0;
  const isTomorrow = diff === 1;
  const dateFormatted = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    isToday,
    isTomorrow,
    dateFormatted,
    fullDateStr: targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  };
};

const HodTimetable = () => {
  const hodSession = getHodSession();
  const HOD_DEPT = hodSession.dept || hodSession.department || 'Computer Science';

  // Navigation Tabs: 'department' | 'faculty' | 'my'
  const [activeTab, setActiveTab] = useState('department');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allTimetables, setAllTimetables] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [departmentStaffList, setDepartmentStaffList] = useState([]);
  
  // Department View Filters
  const [selectedSem, setSelectedSem] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('All');

  // Faculty-wise Tab Filter
  const [selectedFacultyId, setSelectedFacultyId] = useState('');

  // Live Class Modal (for HOD's own classes)
  const [activeClassSlot, setActiveClassSlot] = useState(null);

  // Slot Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formSem, setFormSem] = useState('Semester 1');
  const [formSection, setFormSection] = useState('A');
  const [formDay, setFormDay] = useState('Monday');
  const [formPeriod, setFormPeriod] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formRoom, setFormRoom] = useState('C101');
  const [autoFaculty, setAutoFaculty] = useState('');
  const [modalAllocations, setModalAllocations] = useState([]);
  const [error, setError] = useState('');

  // Initial Master Data Loading
  const loadInitialData = useCallback(async () => {
    try {
      const [periodRes, staffRes] = await Promise.all([
        getPeriodMasters().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] }))
      ]);

      if (periodRes.data) {
        const sortedPeriods = [...periodRes.data]
          .filter(p => p.isActive)
          .sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));
        setPeriods(sortedPeriods);
        if (sortedPeriods.length > 0 && !formPeriod) {
          const firstNonBreak = sortedPeriods.find(p => !p.isBreak);
          if (firstNonBreak) setFormPeriod(firstNonBreak._id);
        }
      }

      if (staffRes.data) {
        const rawStaff = Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.staff || [];
        const deptStaff = rawStaff.filter(s => {
          const d = (s.dept || s.department || '').toLowerCase();
          const target = HOD_DEPT.toLowerCase();
          return d.includes(target) || target.includes(d);
        });
        setDepartmentStaffList(deptStaff);
        if (deptStaff.length > 0 && !selectedFacultyId) {
          setSelectedFacultyId(deptStaff[0]._id || deptStaff[0].id || deptStaff[0].staffId);
        }
      }
    } catch (err) {
      console.error('Failed to load initial timetable data', err);
    }
  }, [HOD_DEPT, formPeriod, selectedFacultyId]);

  // Load Main Timetable Data based on Active Tab and Filters
  const loadTimetableData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'my') {
        const res = await getMyTimetable().catch(() => ({ data: [] }));
        setAllTimetables(res.data || []);
      } else {
        const semParam = selectedSem === 'All' ? undefined : selectedSem;
        const secParam = selectedSection === 'All' ? undefined : selectedSection;
        
        const ttRes = await getTimetable(HOD_DEPT, semParam, secParam);
        setAllTimetables(ttRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load timetable from backend', err);
      setAllTimetables([]);
    } finally {
      setLoading(false);
    }
  }, [HOD_DEPT, activeTab, selectedSem, selectedSection]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadTimetableData();
  }, [loadTimetableData]);

  useRealtimeSync(loadTimetableData, ['timetable', 'substitutions', 'faculty_allocations', 'class_started']);

  // Fetch Allocations dynamically for the Schedule Slot Modal
  useEffect(() => {
    if (!modalOpen) return;
    const fetchModalAllocations = async () => {
      try {
        const res = await getFacultyAllocations({
          department: HOD_DEPT,
          semester: formSem,
          section: formSection
        }).catch(() => ({ data: [] }));
        const list = res.data || [];
        setModalAllocations(list);
        if (list.length > 0) {
          setFormSubject(list[0]._id);
          setAutoFaculty(list[0].staffId?.name || list[0].staffName || '');
        } else {
          setFormSubject('');
          setAutoFaculty('');
        }
      } catch (e) {
        setModalAllocations([]);
      }
    };
    fetchModalAllocations();
  }, [modalOpen, HOD_DEPT, formSem, formSection]);

  const handleSubjectChange = (allocId) => {
    setFormSubject(allocId);
    const alloc = modalAllocations.find(a => a._id === allocId);
    if (alloc && (alloc.staffId || alloc.staffName)) {
      setAutoFaculty(alloc.staffId?.name || alloc.staffName || '');
    } else {
      setAutoFaculty('');
    }
  };

  const openAddSlotModal = (targetDay = 'Monday', targetPeriodId = null, targetSem = null, targetSec = null) => {
    setFormDay(targetDay);
    if (targetPeriodId) setFormPeriod(targetPeriodId);
    setFormSem(targetSem || (selectedSem !== 'All' ? selectedSem : 'Semester 1'));
    setFormSection(targetSec || (selectedSection !== 'All' ? selectedSection : 'A'));
    setError('');
    setModalOpen(true);
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!formPeriod || !formSubject || !formRoom) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');
    setSaving(true);
    
    const alloc = modalAllocations.find(a => a._id === formSubject);
    if (!alloc || !alloc.subjectId) {
      setError('Invalid faculty allocation selected. Please ensure subject has an allocated faculty.');
      setSaving(false);
      return;
    }

    try {
      await createTimetable({
        department: HOD_DEPT,
        semester: formSem,
        section: formSection,
        day: formDay,
        periodId: formPeriod,
        subjectId: alloc.subjectId._id || alloc.subjectId,
        facultyAllocationId: alloc._id,
        roomNo: formRoom
      });
      setModalOpen(false);
      loadTimetableData();
    } catch (err) {
      setError(err.response?.data?.message || 'Conflict detected: Faculty or Room already occupied.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Are you sure you want to remove this timetable slot?')) return;
    try {
      await deleteTimetable(id);
      loadTimetableData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting slot');
    }
  };

  // Filtered displayed timetable slots based on activeTab and sub-filters
  const displayedTimetable = useMemo(() => {
    if (activeTab === 'my') {
      const myName = (hodSession.name || '').trim().toLowerCase();
      return allTimetables.filter(slot => {
        const staffName = (slot.facultyAllocationId?.staffId?.name || slot.staffName || '').trim().toLowerCase();
        if (myName && staffName) {
          return staffName === myName || staffName.includes(myName) || myName.includes(staffName);
        }
        return false;
      });
    }

    if (activeTab === 'faculty') {
      if (!selectedFacultyId) return allTimetables;
      return allTimetables.filter(slot => {
        const staffIdObj = slot.facultyAllocationId?.staffId;
        const staffId = typeof staffIdObj === 'object' ? (staffIdObj?._id || staffIdObj?.id) : staffIdObj;
        const staffName = slot.facultyAllocationId?.staffId?.name || slot.staffName || '';
        
        const targetStaff = departmentStaffList.find(s => (s._id || s.id || s.staffId) === selectedFacultyId);
        const targetName = targetStaff ? targetStaff.name : '';

        return staffId === selectedFacultyId || 
               (targetName && staffName.toLowerCase() === targetName.toLowerCase());
      });
    }

    // Tab: 'department'
    return allTimetables.filter(slot => {
      if (selectedSem !== 'All' && slot.semester !== selectedSem) return false;
      if (selectedSection !== 'All' && slot.section !== selectedSection) return false;
      if (selectedFacultyFilter !== 'All') {
        const staffName = slot.facultyAllocationId?.staffId?.name || slot.staffName || '';
        if (staffName.toLowerCase() !== selectedFacultyFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [allTimetables, activeTab, selectedSem, selectedSection, selectedFacultyFilter, selectedFacultyId, departmentStaffList, hodSession.name]);

  // Unique faculty names for filter dropdown
  const uniqueFacultyNames = useMemo(() => {
    const names = new Set();
    allTimetables.forEach(t => {
      const fName = t.facultyAllocationId?.staffId?.name || t.staffName;
      if (fName) names.add(fName);
    });
    departmentStaffList.forEach(s => {
      if (s.name) names.add(s.name);
    });
    return Array.from(names).sort();
  }, [allTimetables, departmentStaffList]);

  return (
    <div className="hod-timetable-container">
      
      {/* Page Header Row */}
      <div className="tt-header-row">
        <div className="tt-title-wrap">
          <h1 className="tt-title-h1">
            <div className="tt-title-icon-badge">
              <Calendar size={22} />
            </div>
            Department Class Timetable
          </h1>
          <p className="tt-subtitle">
            Weekly class schedule, teacher assignments, and period slots for <strong>{HOD_DEPT}</strong>.
          </p>
        </div>
        
        <button 
          onClick={() => openAddSlotModal('Monday')}
          className="tt-primary-btn"
        >
          <Plus size={18} /> Schedule Class Slot
        </button>
      </div>

      {/* Control Toolbar Card */}
      <div className="tt-toolbar-card">
        
        {/* Segmented View Mode Tabs */}
        <div className="tt-tabs-group">
          <button
            onClick={() => setActiveTab('department')}
            className={`tt-tab-btn ${activeTab === 'department' ? 'active' : ''}`}
          >
            <BookOpen size={14} /> Department Timetable
          </button>
          
          <button
            onClick={() => setActiveTab('faculty')}
            className={`tt-tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
          >
            <Users size={14} /> Faculty Schedule
          </button>
          
          <button
            onClick={() => setActiveTab('my')}
            className={`tt-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
          >
            <UserCheck size={14} /> My Assigned Classes
          </button>
        </div>

        {/* Dynamic Context Filters aligned right */}
        {activeTab === 'department' && (
          <div className="tt-filters-group">
            <div className="tt-filter-pill">
              <span>Sem:</span>
              <select 
                value={selectedSem}
                onChange={(e) => setSelectedSem(e.target.value)}
              >
                <option value="All">All Semesters</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="tt-filter-pill">
              <span>Sec:</span>
              <select 
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="All">All Sections</option>
                {SECTIONS.map(s => <option key={s} value={s}>Sec {s}</option>)}
              </select>
            </div>

            <div className="tt-filter-pill">
              <span>Faculty:</span>
              <select 
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
              >
                <option value="All">All Faculty</option>
                {uniqueFacultyNames.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'faculty' && (
          <div className="tt-filter-badge faculty">
            <span>Select Teacher:</span>
            <select 
              style={{ border: 'none', background: 'transparent', fontWeight: 700, color: '#6b21a8', outline: 'none', cursor: 'pointer', fontSize: '0.78rem' }}
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
            >
              {departmentStaffList.map(st => (
                <option key={st._id || st.id || st.staffId} value={st._id || st.id || st.staffId}>
                  {st.name} ({st.designation || 'Faculty'})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'my' && (
          <div className="tt-filter-badge hod">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
            <span>HOD: {hodSession.name || 'Ananya'}</span>
          </div>
        )}

      </div>

      {/* Compact Live Day Tracker Strip */}
      {(() => {
        const todayInfo = getDayDateInfo(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
        const tomorrowName = new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' });
        const tomorrowInfo = getDayDateInfo(tomorrowName);
        return (
          <div className="tt-tracker-strip">
            <div className="tt-tracker-indicator">
              <span className="tt-dot-live"></span>
              <span>
                Today is <strong style={{ color: '#2563eb' }}>{todayInfo.fullDateStr} (TODAY)</strong> • Tomorrow is <strong style={{ color: '#9333ea' }}>{tomorrowInfo.fullDateStr} (TOMORROW)</strong>
              </span>
            </div>
            
            <div>
              <span className="tt-count-pill">
                {displayedTimetable.length} Slot{displayedTimetable.length !== 1 ? 's' : ''} Displayed
              </span>
            </div>
          </div>
        );
      })()}

      {/* TIMETABLE MATRIX CARD */}
      <div className="tt-matrix-card">
        <div className="tt-table-scroll">
          <table className="tt-table">
            <thead>
              <tr>
                <th className="tt-th-period">
                  TIMING / PERIOD
                </th>
                {DAYS_ORDER.map(dayName => {
                  const info = getDayDateInfo(dayName);
                  return (
                    <th 
                      key={dayName} 
                      className="tt-th-day"
                      style={{ 
                        background: info.isToday ? '#eff6ff' : info.isTomorrow ? '#faf5ff' : '#f8fafc', 
                        color: info.isToday ? '#1d4ed8' : info.isTomorrow ? '#6b21a8' : '#1e293b',
                        borderBottom: info.isToday ? '3px solid #2563eb' : info.isTomorrow ? '3px solid #9333ea' : '1px solid #e2e8f0'
                      }}
                    >
                      <div className="tt-th-day-content">
                        <div className="tt-th-day-label">
                          <span>{dayName}</span>
                          {info.isToday && <span className="tt-badge-today">TODAY</span>}
                          {info.isTomorrow && <span className="tt-badge-tomorrow">TOMORROW</span>}
                        </div>
                        <span className="tt-th-date-sub">{info.dateFormatted}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                    Loading department schedule...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                    No period structures configured.
                  </td>
                </tr>
              ) : (
                periods.map((period, pIdx) => {
                  const cleanPeriodName = formatPeriodName(period);

                  if (period.isBreak) {
                    return (
                      <tr key={period._id || pIdx} style={{ background: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
                        <td className="tt-td-period-sticky" style={{ background: '#fef3c7', color: '#92400e' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.78rem' }}>{cleanPeriodName}</span>
                          <span style={{ fontSize: '0.7rem', display: 'block', color: '#b45309' }}>{period.startTime} – {period.endTime}</span>
                        </td>
                        <td colSpan={6} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 800, color: '#92400e', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ☕ {cleanPeriodName} ({period.startTime} – {period.endTime})
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={period._id || pIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {/* Sticky Period Header Column */}
                      <td className="tt-td-period-sticky">
                        <span className="tt-period-name">{cleanPeriodName}</span>
                        <span className="tt-period-time">{period.startTime} – {period.endTime}</span>
                      </td>

                      {/* Day Columns */}
                      {DAYS_ORDER.map(dayName => {
                        const matchingSlots = displayedTimetable.filter(t => 
                          t.day?.toLowerCase() === dayName.toLowerCase() && 
                          (t.periodId?._id === period._id || t.periodId === period._id)
                        );

                        if (matchingSlots.length > 0) {
                          return (
                            <td key={dayName} className="tt-td-slot-cell">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {matchingSlots.map(slot => {
                                  const subjectName =
                                    slot.subjectId?.subjectName ||
                                    slot.facultyAllocationId?.subjectId?.subjectName ||
                                    slot.subject ||
                                    'Subject';
                                  const facultyName = slot.facultyAllocationId?.staffId?.name || slot.staffName || 'Allocated Faculty';
                                  const room = formatRoomNo(slot.roomNo);
                                  const classLabel = `${slot.semester || ''} • Sec ${slot.section || 'A'}`;
                                  
                                  const colorIdx = Math.abs(subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % SUBJECT_COLORS.length;
                                  const theme = SUBJECT_COLORS[colorIdx];

                                  return (
                                    <div 
                                      key={slot._id}
                                      onClick={() => {
                                        if (activeTab === 'my') {
                                          setActiveClassSlot({ ...slot, periodId: period });
                                        }
                                      }}
                                      style={{
                                        background: theme.bg,
                                        border: `1px solid ${theme.border}`,
                                        cursor: activeTab === 'my' ? 'pointer' : 'default'
                                      }}
                                      className="tt-slot-card"
                                    >
                                      <div className="tt-slot-header">
                                        <h4 style={{ color: theme.text }} className="tt-slot-subject">
                                          {subjectName}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          {slot.status === 'Completed' || slot.session?.status === 'Completed' ? (
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '1px 4px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                                              ✅ Completed
                                            </span>
                                          ) : slot.status === 'Live' || slot.session?.status === 'Live' ? (
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '1px 4px', borderRadius: '4px', border: '1px solid #93c5fd' }}>
                                              🟢 Live
                                            </span>
                                          ) : activeTab === 'my' ? (
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563eb', background: '#ffffff', padding: '1px 4px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                              Start ▶
                                            </span>
                                          ) : null}
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteSlot(slot._id);
                                            }}
                                            className="tt-slot-delete-btn"
                                            title="Delete slot"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Semester & Section Badge */}
                                      <div className="tt-slot-sem-tag">
                                        {classLabel}
                                      </div>

                                      <div className="tt-slot-faculty">
                                        <Users size={11} color="#64748b" />
                                        <span>{facultyName}</span>
                                      </div>

                                      <div className="tt-slot-footer">
                                        <span className="tt-slot-room">
                                          <MapPin size={10} color="#ef4444" /> {room}
                                        </span>

                                        {slot.isSubstitution && (
                                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '1px 4px', borderRadius: '4px' }}>
                                            Sub
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={dayName} className="tt-td-slot-cell" style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openAddSlotModal(dayName, period._id, selectedSem !== 'All' ? selectedSem : 'Semester 1', selectedSection !== 'All' ? selectedSection : 'A')}
                              className="tt-free-btn"
                              onMouseEnter={e => {
                                e.currentTarget.innerText = '+ Add Slot';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.innerText = 'Free';
                              }}
                            >
                              Free
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SCHEDULE CLASS SLOT MODAL */}
      {modalOpen && (
        <div 
          onClick={() => setModalOpen(false)} 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{
              background: '#ffffff',
              color: '#0f172a',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              position: 'relative'
            }}
          >
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Schedule Class Slot</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>{HOD_DEPT} Department Schedule</p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSlot} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              
              {/* Target Class: Semester & Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Semester</label>
                  <select 
                    value={formSem} 
                    onChange={e => setFormSem(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                  >
                    {SEMESTERS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Section</label>
                  <select 
                    value={formSection} 
                    onChange={e => setFormSection(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                  >
                    {SECTIONS.map(s => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day & Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Weekday</label>
                  <select 
                    value={formDay} 
                    onChange={e => setFormDay(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                  >
                    {DAYS_ORDER.map(d => {
                      const info = getDayDateInfo(d);
                      const tag = info.isToday ? ' • TODAY' : info.isTomorrow ? ' • TOMORROW' : '';
                      return <option key={d} value={d}>{d} ({info.dateFormatted}){tag}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Period Slot</label>
                  <select 
                    value={formPeriod} 
                    onChange={e => setFormPeriod(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                  >
                    {periods.filter(p => !p.isBreak).map(p => (
                      <option key={p._id} value={p._id}>{formatPeriodName(p)} ({p.startTime})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject (Filtered by selected Semester & Section) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Subject & Allocated Faculty</label>
                <select 
                  required
                  value={formSubject} 
                  onChange={e => handleSubjectChange(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: 600, outline: 'none' }}
                >
                  <option value="">Select Subject (for {formSem} Sec {formSection})</option>
                  {modalAllocations.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.subjectId?.subjectName || 'Subject'} ({a.staffId?.name || a.staffName || 'Faculty'})
                    </option>
                  ))}
                </select>
                {modalAllocations.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem', fontWeight: 600 }}>
                    ⚠️ No faculty allocations found for {formSem} Sec {formSection}. Allocate faculty under Academic Operations → Faculty Allocation.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Faculty Name</label>
                <div style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} color="#2563eb" />
                  <span>{autoFaculty || 'Auto-filled upon subject selection'}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Room / Lab Venue</label>
                <select
                  value={formRoom}
                  onChange={e => setFormRoom(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: 600, outline: 'none' }}
                >
                  {ROOM_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  style={{ width: '50%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !autoFaculty}
                  style={{ width: '50%', padding: '0.65rem', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, background: '#2563eb', color: '#ffffff', cursor: (saving || !autoFaculty) ? 'not-allowed' : 'pointer', opacity: (saving || !autoFaculty) ? 0.6 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Class Slot'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* LIVE CLASS MODAL (When HOD clicks their own assigned class slot) */}
      {activeClassSlot && (
        <LiveClassModal 
          slot={activeClassSlot} 
          onClose={() => setActiveClassSlot(null)}
          onSessionUpdated={loadTimetableData}
        />
      )}

    </div>
  );
};

export default HodTimetable;
