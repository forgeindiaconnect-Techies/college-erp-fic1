import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { getTimetable, getPeriodMasters } from '../../api/index';
import './StudentTimetable.css';

const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'Student',
  dept: 'Computer Science Engineering',
  sem: 'Semester 6',
  section: 'A',
  email: 'student@college.edu'
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

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

const StudentTimetable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);
  const [allTimetables, setAllTimetables] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedSem, setSelectedSem] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const activeStud = studentSession;
      let currentSem = selectedSem || activeStud.sem || activeStud.semester || 'Semester 1';
      let querySem = currentSem;
      if (querySem && querySem.startsWith('Sem ')) {
        querySem = querySem.replace('Sem ', 'Semester ');
      }
      
      if (selectedSem !== querySem) {
        setSelectedSem(querySem);
      }

      const deptName = activeStud.dept || activeStud.department || 'Computer Science Engineering';
      const secName = activeStud.section || 'A';

      const [ttRes, periodRes] = await Promise.all([
        getTimetable(deptName, querySem, secName).catch(() => ({ data: [] })),
        getPeriodMasters().catch(() => ({ data: [] }))
      ]);

      if (periodRes.data) {
        const sortedPeriods = [...periodRes.data]
          .filter(p => p.isActive)
          .sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));
        setPeriods(sortedPeriods);
      }

      setAllTimetables(ttRes.data || []);
    } catch (err) {
      console.error('Failed to load timetable from backend', err);
      setAllTimetables([]);
    } finally {
      setLoading(false);
    }
  }, [studentSession, selectedSem]);

  useEffect(() => {
    const session = sessionStorage.getItem('student_session');
    if (session) {
      const activeStud = JSON.parse(session);
      if (!activeStud.section) activeStud.section = 'A';
      setStudentSession(activeStud);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeDept = studentSession.dept || studentSession.department || 'Computer Science Engineering';
  const activeSec = studentSession.section || 'A';

  return (
    <div className="animate-fade-in p-6 pb-24 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div>
          <button 
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-2 transition-colors" 
            onClick={() => navigate('/student/dashboard')}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <Calendar className="text-blue-600" size={28} /> My Class Timetable
          </h1>
          <p className="text-gray-500 mt-1">Weekly Monday–Saturday schedule for {activeDept} • {selectedSem} • Section {activeSec}.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Semester:</label>
          <select 
            className="border border-gray-200 bg-gray-50 py-1.5 px-3 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
          >
            {SEMESTERS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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
                {DAYS_ORDER.map(dayName => (
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
                    Loading class schedule...
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
                      {DAYS_ORDER.map(dayName => {
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
                                }}
                                className="shadow-sm transition-all hover:shadow-md"
                              >
                                <h4 style={{ color: theme.text }} className="font-bold text-xs leading-snug">
                                  {subjectName}
                                </h4>

                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium mt-1">
                                  <Users size={10} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{facultyName}</span>
                                </div>

                                <div className="mt-2 flex items-center">
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
                            <div className="w-full h-14 border border-dashed border-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-300 font-medium bg-gray-50/40">
                              Free
                            </div>
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
    </div>
  );
};

export default StudentTimetable;
