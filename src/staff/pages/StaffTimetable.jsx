import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, MapPin, CheckCircle2, Clock, BookOpen, Layers, UserCheck, Play } from 'lucide-react';
import { getMyTimetable, getTimetable, getPeriodMasters, getDepartments } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import LiveClassModal from '../components/LiveClassModal';
import './StaffTimetable.css';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
const SECTIONS = ['A', 'B', 'C', 'D'];

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

const StaffTimetable = () => {
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'department'
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [allTimetables, setAllTimetables] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters for Department Timetable view
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('Semester 1');
  const [selectedSection, setSelectedSection] = useState('A');

  // Active Live Class Modal state
  const [activeClassSlot, setActiveClassSlot] = useState(null);

  const loadInitialData = useCallback(async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        getPeriodMasters().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] }))
      ]);

      if (pRes.data) {
        const sorted = [...pRes.data]
          .filter(p => p.isActive)
          .sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));
        setPeriods(sorted);
      }

      if (dRes.data && dRes.data.length > 0) {
        setDepartments(dRes.data);
        setSelectedDept(dRes.data[0].name || dRes.data[0].departmentName);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'my') {
        const res = await getMyTimetable();
        setAllTimetables(res.data || []);
      } else {
        if (!selectedDept) {
          setAllTimetables([]);
          setLoading(false);
          return;
        }
        const res = await getTimetable(selectedDept, selectedSem, selectedSection);
        setAllTimetables(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
      setAllTimetables([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDept, selectedSem, selectedSection]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  useRealtimeSync(loadTimetable, ['timetable', 'substitutions']);

  return (
    <div className="animate-fade-in p-6 pb-24 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <Calendar className="text-blue-600" size={28} /> Faculty Class Schedule
          </h1>
          <p className="text-gray-500 mt-1">Weekly Monday–Saturday teaching timetable & class assignments. Click any class slot to start class or mark attendance.</p>
        </div>

        {/* View Mode Toggle Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Assigned Classes
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'department'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Department Timetable
          </button>
        </div>
      </div>

      {/* Department View Filters */}
      {activeTab === 'department' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department:</label>
            <select
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d._id || d.name} value={d.name || d.departmentName}>
                  {d.name || d.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Semester:</label>
            <select
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
            >
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Section:</label>
            <select
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Mode Status Banner */}
      <div className="mb-4 text-xs font-semibold text-gray-500 flex items-center gap-1.5">
        {activeTab === 'my' ? (
          <>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Showing all personalized teaching periods assigned to you. Click any slot to start class or mark attendance.</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Showing master department schedule for {selectedDept} • {selectedSem} • Section {selectedSection}.</span>
          </>
        )}
      </div>

      {/* WEEKLY TIMETABLE MATRIX */}
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
                    Loading timetable slots...
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
                          const classInfo = `${slot.department || ''} • ${slot.semester || ''} Sec ${slot.section || ''}`;
                          
                          const colorIdx = Math.abs(subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % SUBJECT_COLORS.length;
                          const theme = SUBJECT_COLORS[colorIdx];

                          return (
                            <td key={dayName} className="p-2 border-r border-gray-200 align-top">
                              <div 
                                onClick={() => setActiveClassSlot({ ...slot, periodId: period })}
                                style={{
                                  background: theme.bg,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '8px',
                                  padding: '0.6rem',
                                  cursor: 'pointer'
                                }}
                                className="shadow-sm transition-all hover:shadow-md hover:scale-[1.02] group"
                                title="Click to start class or take attendance"
                              >
                                <div className="flex justify-between items-start">
                                  <h4 style={{ color: theme.text }} className="font-bold text-xs leading-snug">
                                    {subjectName}
                                  </h4>
                                  <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-1 rounded border border-blue-200">
                                    Start ▶
                                  </span>
                                </div>

                                <div className="text-[10px] text-gray-600 font-medium mt-0.5">
                                  {classInfo}
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

                                  {slot.isSubstitution && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded">
                                      Sub
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={dayName} className="p-2 border-r border-gray-200 align-middle text-center">
                            <span className="text-[11px] text-gray-400 font-medium bg-gray-50/50 py-1.5 px-3 rounded-full border border-gray-100 inline-block">
                              Free
                            </span>
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

      {/* LIVE CLASS MODAL CONTROL PANEL */}
      {activeClassSlot && (
        <LiveClassModal 
          slot={activeClassSlot} 
          onClose={() => setActiveClassSlot(null)}
          onSessionUpdated={loadTimetable}
        />
      )}

    </div>
  );
};

export default StaffTimetable;
