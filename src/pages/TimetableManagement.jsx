import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, Clock, Users, MapPin, X, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { getTimetable, createTimetable, deleteTimetable, getDepartments, getPeriodMasters, getFacultyAllocations } from '../api/index';

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  if (name.toLowerCase().includes('room') || name.toLowerCase().includes('lab')) {
    return name;
  }
  return `Room ${name}`;
};

export default function TimetableManagement() {
  const [departments, setDepartments] = useState([]);
  const [dept, setDept] = useState('Computer Science Engineering');
  const [sem, setSem] = useState('Semester 6');
  const [section, setSection] = useState('A');

  const [periods, setPeriods] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [allTimetables, setAllTimetables] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Slot Form State
  const [formDay, setFormDay] = useState('Monday');
  const [formPeriod, setFormPeriod] = useState('');
  const [formSubject, setFormSubject] = useState(''); // facultyAllocationId
  const [formRoom, setFormRoom] = useState('Room 201');
  const [autoFaculty, setAutoFaculty] = useState('');

  const loadDependencies = useCallback(async () => {
    try {
      const [deptRes, periodRes] = await Promise.all([
        getDepartments().catch(() => ({ data: [] })),
        getPeriodMasters().catch(() => ({ data: [] }))
      ]);
      if (deptRes.data && deptRes.data.length > 0) {
        setDepartments(deptRes.data);
      }
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
    } catch (err) {
      console.error(err);
    }
  }, [formPeriod]);

  const loadFullWeeklyTimetable = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ttRes, allocRes] = await Promise.all([
        getTimetable(dept, sem, section).catch(() => ({ data: [] })),
        getFacultyAllocations({ department: dept, semester: sem, section }).catch(() => ({ data: [] }))
      ]);
      setAllTimetables(ttRes.data || []);
      setAllocations(allocRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dept, sem, section]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  useEffect(() => {
    loadFullWeeklyTimetable();
  }, [loadFullWeeklyTimetable]);

  const handleSubjectChange = (allocId) => {
    setFormSubject(allocId);
    const alloc = allocations.find(a => a._id === allocId);
    if (alloc && alloc.staffId) {
      setAutoFaculty(alloc.staffId.name);
    } else {
      setAutoFaculty('');
    }
  };

  const openAddSlotModal = (targetDay = 'Monday', targetPeriodId = null) => {
    setFormDay(targetDay);
    if (targetPeriodId) setFormPeriod(targetPeriodId);
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
    
    const alloc = allocations.find(a => a._id === formSubject);
    if (!alloc || !alloc.subjectId) {
      setError('Invalid faculty allocation selected.');
      setSaving(false);
      return;
    }

    try {
      await createTimetable({
        department: dept,
        semester: sem,
        section,
        day: formDay,
        periodId: formPeriod,
        subjectId: alloc.subjectId._id || alloc.subjectId,
        facultyAllocationId: alloc._id,
        roomNo: formRoom
      });
      setModalOpen(false);
      loadFullWeeklyTimetable();
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
      loadFullWeeklyTimetable();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting slot');
    }
  };

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <Calendar className="text-blue-600" size={28} /> Weekly Class Timetable
          </h1>
          <p className="text-gray-500 mt-1">Interactive weekly class schedule matrix for {dept} • {sem} • Section {section}.</p>
        </div>

        <button 
          onClick={() => openAddSlotModal('Monday')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            background: '#2563eb',
            color: '#ffffff',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
          }}
        >
          <Plus size={18} /> Add Class Slot
        </button>
      </div>

      {/* Class Selection Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department:</label>
            <select 
              value={dept} 
              onChange={e => setDept(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.length > 0 ? (
                departments.map(d => <option key={d._id || d.name || d} value={d.name || d}>{d.name || d}</option>)
              ) : (
                <option value={dept}>{dept}</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Semester:</label>
            <select 
              value={sem} 
              onChange={e => setSem(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Section:</label>
            <select 
              value={section} 
              onChange={e => setSection(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5">
          <CheckCircle2 size={14} /> Showing full Monday–Saturday weekly grid
        </div>
      </div>

      {/* WEEKLY TIMETABLE MATRIX CONTAINER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '72vh' }}>
          <table className="w-full border-collapse text-left" style={{ minWidth: '980px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#1e293b', position: 'sticky', top: 0, zIndex: 20, borderBottom: '2px solid #e2e8f0' }} className="text-xs uppercase tracking-wider">
                <th 
                  className="p-3.5 border-r border-gray-200 text-center font-bold" 
                  style={{ width: '170px', minWidth: '170px', position: 'sticky', left: 0, zIndex: 30, background: '#f1f5f9', color: '#0f172a' }}
                >
                  TIMING / PERIOD
                </th>
                {DAYS.map(dayName => (
                  <th key={dayName} className="p-3 border-r border-gray-200 text-center font-bold" style={{ background: '#f8fafc', color: '#1e293b' }}>
                    {dayName}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 font-medium">
                    Loading class schedule matrix...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 font-medium">
                    No period structures configured.
                  </td>
                </tr>
              ) : (
                periods.map((period, pIdx) => {
                  const cleanPeriodName = formatPeriodName(period);

                  if (period.isBreak) {
                    return (
                      <tr key={period._id || pIdx} className="bg-amber-50/70 border-b border-amber-200">
                        <td 
                          className="p-3 border-r border-amber-200 text-center bg-amber-100/80" 
                          style={{ width: '170px', minWidth: '170px', position: 'sticky', left: 0, zIndex: 10 }}
                        >
                          <span className="font-bold text-amber-900 text-xs block">{cleanPeriodName}</span>
                          <span className="text-[11px] text-amber-700 font-medium">{period.startTime} – {period.endTime}</span>
                        </td>
                        <td colSpan={6} className="p-3 text-center font-bold text-amber-800 text-xs tracking-wide uppercase">
                          ☕ {cleanPeriodName} ({period.startTime} – {period.endTime})
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={period._id || pIdx} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                      {/* Sticky Period Header Column */}
                      <td 
                        className="p-3 border-r border-gray-200 bg-gray-50 text-center" 
                        style={{ width: '170px', minWidth: '170px', position: 'sticky', left: 0, zIndex: 10 }}
                      >
                        <span className="font-bold text-gray-800 text-xs block">{cleanPeriodName}</span>
                        <span className="text-[11px] text-gray-500 font-medium block mt-0.5">{period.startTime}</span>
                        <span className="text-[11px] text-gray-400 block">{period.endTime}</span>
                      </td>

                      {/* Day Columns */}
                      {DAYS.map(dayName => {
                        const slot = allTimetables.find(t => 
                          t.day?.toLowerCase() === dayName.toLowerCase() && 
                          (t.periodId?._id === period._id || t.periodId === period._id)
                        );

                        if (slot) {
                          const subjectName = slot.subjectId?.subjectName || slot.subject || 'Subject';
                          const facultyName = slot.facultyAllocationId?.staffId?.name || slot.staffName || 'Allocated Faculty';
                          const room = formatRoomNo(slot.roomNo);
                          
                          const colorIdx = Math.abs(subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % SUBJECT_COLORS.length;
                          const theme = SUBJECT_COLORS[colorIdx];

                          return (
                            <td key={dayName} className="p-2 border-r border-gray-200 align-top">
                              <div 
                                style={{
                                  background: theme.bg,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '8px',
                                  padding: '0.6rem',
                                  position: 'relative'
                                }}
                                className="group transition-all hover:shadow-md"
                              >
                                <div className="flex justify-between items-start">
                                  <h4 style={{ color: theme.text }} className="font-bold text-xs leading-snug">
                                    {subjectName}
                                  </h4>
                                  <button 
                                    onClick={() => handleDeleteSlot(slot._id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-0.5"
                                    title="Delete slot"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium mt-1">
                                  <Users size={10} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{facultyName}</span>
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                  <span 
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      color: '#334155',
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                  >
                                    <MapPin size={10} style={{ color: '#ef4444' }} /> {room}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={dayName} className="p-2 border-r border-gray-200 align-middle text-center">
                            <button
                              onClick={() => openAddSlotModal(dayName, period._id)}
                              className="w-full h-14 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400 font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all group"
                            >
                              <span className="group-hover:inline hidden font-semibold">+ Add</span>
                              <span className="group-hover:hidden opacity-60">Free</span>
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

      {/* ADD SLOT MODAL */}
      {modalOpen && (
        <div 
          onClick={() => setModalOpen(false)} 
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
              maxWidth: '480px',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid #e2e8f0',
              position: 'relative',
              zIndex: 10000
            }}
          >
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Schedule Class Slot</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>{dept} • {sem} • Sec {section}</p>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Weekday</label>
                  <select 
                    value={formDay} 
                    onChange={e => setFormDay(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Subject & Allocated Faculty</label>
                <select 
                  required
                  value={formSubject} 
                  onChange={e => handleSubjectChange(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: 600, outline: 'none' }}
                >
                  <option value="">Select Subject (from Allocations)</option>
                  {allocations.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.subjectId?.subjectName || 'Subject'} ({a.staffId?.name || 'Faculty'})
                    </option>
                  ))}
                </select>
                {allocations.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem', fontWeight: 600 }}>⚠️ No faculty allocations found for this class.</p>
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
                <input 
                  type="text" 
                  required
                  value={formRoom}
                  onChange={e => setFormRoom(e.target.value)}
                  placeholder="e.g. Room 201, CS Lab"
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: 600, outline: 'none' }}
                />
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

    </div>
  );
}
