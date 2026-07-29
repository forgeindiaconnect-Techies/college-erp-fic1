import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Check, X, Users, Save, Search,
  Filter, CheckCircle, AlertTriangle, ArrowLeft,
  Clock, ShieldAlert, HeartPulse, UserMinus, CalendarCheck
} from 'lucide-react';
import { getStudents, getAllAttendance, createAttendance, getMyTimetable } from '../../api/index';
import CustomSelect from '../../components/CustomSelect';
import './StaffAttendance.css';

const DEFAULT_SESSION = {
  name: 'Faculty',
  dept: '',
  role: 'Staff'
};

const getTodayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

const StaffAttendance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(DEFAULT_SESSION);

  // Database states
  const [students, setStudents] = useState([]);
  const [rawAttendanceList, setRawAttendanceList] = useState([]);
  
  // Timetable states
  const [myTimetable, setMyTimetable] = useState([]);

  // Selection states
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [search, setSearch] = useState('');

  // Marking state
  const [markingState, setMarkingState] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadData = async (activeStaff) => {
    try {
      setLoading(true);
      const [studRes, attRes, ttRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] })),
        getMyTimetable().catch(() => ({ data: [] }))
      ]);

      const backendStudents = studRes?.data || [];
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      
      const combinedStudents = [...backendStudents];
      erpStudents.forEach(ls => {
        if (!combinedStudents.find(cs => cs.id === ls.id || cs.rollNo === ls.rollNo)) {
          combinedStudents.push(ls);
        }
      });
      setStudents(combinedStudents);

      let backendAtt = attRes?.data || [];
      const localAtt = JSON.parse(localStorage.getItem(`erp_attendance_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      
      const combinedAtt = [...backendAtt];
      localAtt.forEach(ls => {
        if (!combinedAtt.find(ca => ca._id === ls._id)) {
          combinedAtt.push(ls);
        }
      });
      setRawAttendanceList(combinedAtt);

      const schedule = ttRes?.data || [];
      setMyTimetable(schedule);

      // Auto-select current class if any
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = DAYS[new Date().getDay()];
      
      const todaySlots = schedule.filter(s => s.day?.toLowerCase() === todayDay.toLowerCase());
      if (todaySlots.length > 0) {
        // Try to find the active period based on time
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let activeSlot = null;
        for (const slot of todaySlots) {
          if (!slot.periodId) continue;
          const [sH, sM] = slot.periodId.startTime.split(':').map(Number);
          const [eH, eM] = slot.periodId.endTime.split(':').map(Number);
          const startMin = sH * 60 + sM;
          const endMin = eH * 60 + eM;
          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            activeSlot = slot;
            break;
          }
        }
        
        if (activeSlot) {
          setSelectedSlotId(activeSlot._id);
        } else if (todaySlots.length > 0) {
          setSelectedSlotId(todaySlots[0]._id);
        }
      } else if (schedule.length > 0) {
         setSelectedSlotId(schedule[0]._id);
      }

    } catch (err) {
      console.error('Failed to load attendance page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = sessionStorage.getItem('staff_session');
    let activeStaff = DEFAULT_SESSION;
    if (session) {
      activeStaff = JSON.parse(session);
      setStaffSession(activeStaff);
    } else {
      navigate('/staff/login');
      return;
    }
    loadData(activeStaff);
  }, [navigate]);

  const selectedSlot = myTimetable.find(s => s._id === selectedSlotId);

  // Filter students based on dept, sem, and section of selected slot
  const myClassStudents = selectedSlot ? students.filter(s => 
    (s.dept === selectedSlot.department || s.department === selectedSlot.department) && 
    (s.sem === selectedSlot.semester || s.semester === selectedSlot.semester) &&
    (s.section === selectedSlot.section)
  ) : [];

  // Initial Marking State
  useEffect(() => {
    if (!selectedSlot) return;

    const initialMarking = {};
    const formattedDate = new Date(selectedDate);
    formattedDate.setUTCHours(0, 0, 0, 0);

    // See if attendance already exists for this exact session
    const existingSessionRecords = rawAttendanceList.filter(r => {
      const rDate = new Date(r.attendanceDate || r.date);
      rDate.setUTCHours(0,0,0,0);
      return rDate.getTime() === formattedDate.getTime() && 
             (r.subjectId === selectedSlot.subjectId?._id || r.subjectId === selectedSlot.subjectId?.subjectName || r.subject === selectedSlot.subjectId?.subjectName) && 
             (r.periodId === selectedSlot.periodId?._id || r.periodId === selectedSlot.periodId?.periodName || r.period === selectedSlot.periodId?.periodName);
    });

    myClassStudents.forEach(s => {
      const existingRecord = existingSessionRecords.find(r => r.studentId === (s.id || s._id));
      initialMarking[s.id || s._id] = existingRecord ? existingRecord.status : '';
    });
    setMarkingState(initialMarking);
    setSaveError(''); // Clear error on change
  }, [selectedDate, selectedSlot, rawAttendanceList, students]); // removed myClassStudents to prevent loop

  // Compute records with current percentage
  const getStudentRecords = () => {
    return myClassStudents.map(s => {
      const matches = rawAttendanceList.filter(r => r.studentId === (s.id || s._id));
      const presentDays = matches.filter(r => r.status === 'Present').length;
      const totalDays = matches.length;
      let baseAtt = 85;
      if (s.attendance) {
        const parsed = parseInt(String(s.attendance).replace('%', '').trim());
        if (!isNaN(parsed)) baseAtt = parsed;
      }
      const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : baseAtt;

      return {
        ...s,
        presentDays,
        absentDays: totalDays - presentDays,
        percent,
        totalDays
      };
    });
  };

  const records = getStudentRecords();
  const filteredRecords = records.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || (r.id || r._id || '').toLowerCase().includes(search.toLowerCase())
  );

  // Bulk marking
  const handleBulkMark = (status) => {
    const updated = { ...markingState };
    filteredRecords.forEach(r => {
      updated[r.id || r._id] = status;
    });
    setMarkingState(updated);
  };

  const handleMarkStudent = (studentId, status) => {
    setMarkingState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const isSessionAlreadyMarked = () => {
    if (!selectedSlot) return false;
    const formattedDate = new Date(selectedDate);
    formattedDate.setUTCHours(0, 0, 0, 0);
    return rawAttendanceList.some(r => {
      const rDate = new Date(r.attendanceDate || r.date);
      rDate.setUTCHours(0,0,0,0);
      return rDate.getTime() === formattedDate.getTime() && 
             (r.subjectId === selectedSlot.subjectId?._id || r.subjectId === selectedSlot.subjectId?.subjectName || r.subject === selectedSlot.subjectId?.subjectName) && 
             (r.periodId === selectedSlot.periodId?._id || r.periodId === selectedSlot.periodId?.periodName || r.period === selectedSlot.periodId?.periodName);
    });
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!selectedSlot) return;

    const unmarked = myClassStudents.filter(s => !markingState[s.id || s._id]);
    if (unmarked.length > 0) {
      alert(`Please mark attendance for all students. ${unmarked.length} student(s) unmarked.`);
      return;
    }

    const bulkRecords = myClassStudents.map(s => ({
      tenantId: sessionStorage.getItem('tenantId') || 'mock_college_id',
      studentId: s.id || s._id,
      studentName: s.name,
      department: selectedSlot.department,
      semester: selectedSlot.semester,
      attendanceDate: new Date(selectedDate),
      periodId: selectedSlot.periodId?._id || selectedSlot.periodId?.periodName,
      status: markingState[s.id || s._id],
      subjectId: selectedSlot.subjectId?._id || selectedSlot.subjectId?.subjectName,
      markedBy: staffSession.name
    }));

    try {
      setLoading(true);
      await createAttendance(bulkRecords);
      
      const newAtt = [...rawAttendanceList, ...bulkRecords];
      setRawAttendanceList(newAtt);
      localStorage.setItem(`erp_attendance_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(newAtt));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  const markedCount = myClassStudents.filter(s => markingState[s.id || s._id]).length;
  const totalCount = myClassStudents.length;
  const allMarked = markedCount === totalCount && totalCount > 0;
  const presentCount = myClassStudents.filter(s => markingState[s.id || s._id] === 'Present').length;
  const absentCount = myClassStudents.filter(s => markingState[s.id || s._id] === 'Absent').length;

  if (loading && students.length === 0) {
    return <div className="p-12 flex justify-center"><div className="loader"></div></div>;
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 pb-24">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <button className="back-btn flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-2 transition-colors" onClick={() => navigate('/staff/dashboard')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <CalendarCheck className="text-blue-600" size={26} /> Record Attendance
          </h1>
          <p className="text-gray-500 mt-1">Select a class from your timetable and mark student presence.</p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="glass-card mb-6" style={{ padding: '1.25rem', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'flex-end' }}>
          <div className="filter-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
              Class Slot
            </label>
            <select 
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              value={selectedSlotId}
              onChange={e => setSelectedSlotId(e.target.value)}
            >
              <option value="">Select a class...</option>
              {myTimetable.length > 0 ? (
                myTimetable.map(slot => (
                  <option key={slot._id} value={slot._id}>
                    {slot.day} - Period {slot.periodId?.periodName || slot.period || 1} ({slot.subjectId?.subjectName || 'Subject'}) - {slot.department} {slot.semester} Sec {slot.section || 'A'}
                  </option>
                ))
              ) : (
                <>
                  <option value="fallback-java">Monday - Period 1 (Java Programming) - Computer Science Engineering Semester 3 Sec A</option>
                  <option value="fallback-dbms">Monday - Period 2 (DBMS) - Computer Science Engineering Semester 3 Sec A</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
              Date
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="date" 
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
              Search Student
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} size={16} />
              <input 
                type="text"
                placeholder="Search by name or roll no..." 
                style={{ width: '100%', padding: '0.6rem 0.8rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* STATS STRIP & BULK ACTIONS */}
      <div className="glass-card mb-6" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total</p>
            <p className="text-xl font-bold text-gray-800">{totalCount}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1">Present</p>
            <p className="text-xl font-bold text-green-700">{presentCount}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-xs text-red-500 uppercase font-bold tracking-wider mb-1">Absent</p>
            <p className="text-xl font-bold text-red-600">{absentCount}</p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded font-medium transition-colors border border-green-200" onClick={() => handleBulkMark('Present')}>
            <Check size={18} /> Mark All Present
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded font-medium transition-colors border border-red-200" onClick={() => handleBulkMark('Absent')}>
            <X size={18} /> Mark All Absent
          </button>
        </div>
      </div>

      {isSessionAlreadyMarked() && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded mb-4 flex items-center gap-2 border border-blue-100 text-sm">
          <CheckCircle size={18} className="text-blue-600" />
          Attendance for this session has already been logged. You can update it if needed.
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4 flex items-center gap-2 border border-red-100 text-sm">
          <AlertTriangle size={18} /> {saveError}
        </div>
      )}

      {/* STUDENT GRID */}
      {selectedSlot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecords.length > 0 ? filteredRecords.map((s, idx) => {
            const status = markingState[s.id || s._id];
            const isDanger = s.percent < 75;

            return (
              <div 
                key={s.id || s._id} 
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${status === 'Present' ? 'border-green-400 shadow-sm ring-1 ring-green-400' : status === 'Absent' ? 'border-red-400 shadow-sm ring-1 ring-red-400' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <div className="p-4 border-b border-gray-50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                    {s.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 truncate text-sm m-0">{s.name}</h4>
                    <p className="text-xs text-gray-500 m-0">{s.id || s.rollNo}</p>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    {isDanger && <AlertTriangle size={12} />} {s.percent}%
                  </div>
                </div>
                
                <div className="flex divide-x divide-gray-100">
                  <button 
                    className={`flex-1 py-3 flex justify-center items-center gap-1 transition-colors ${status === 'Present' ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => handleMarkStudent(s.id || s._id, 'Present')}
                  >
                    <Check size={18} /> Present
                  </button>
                  <button 
                    className={`flex-1 py-3 flex justify-center items-center gap-1 transition-colors ${status === 'Absent' ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => handleMarkStudent(s.id || s._id, 'Absent')}
                  >
                    <X size={18} /> Absent
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
              <Users size={48} className="mx-auto mb-3 opacity-20" />
              <p>No students found for this class.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <Calendar size={48} className="mx-auto mb-3 opacity-20" />
          <p>Please select a class slot from your timetable.</p>
        </div>
      )}

      {/* FIXED BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:pl-64">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm font-medium">
            <span className={allMarked ? 'text-green-600 flex items-center gap-2' : 'text-gray-500'}>
              {allMarked && <CheckCircle size={16} />}
              {markedCount} of {totalCount} Marked
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {saveSuccess && <span className="text-green-600 font-medium text-sm animate-fade-in flex items-center gap-1"><Check size={16}/> Saved</span>}
            <button 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSaveAttendance}
              disabled={loading || totalCount === 0}
            >
              {loading ? <div className="loader w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />}
              Save Attendance
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StaffAttendance;
