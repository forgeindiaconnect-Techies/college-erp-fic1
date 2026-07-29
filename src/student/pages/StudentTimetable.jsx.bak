import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { getTimetable } from '../../api/index';
import './StudentTimetable.css';

// Fallbacks
const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Computer Science',
  sem: 'Semester 6',
  email: 'john@college.edu'
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6];
const PERIOD_TIMES = {
  1: '09:00 - 10:00',
  2: '10:00 - 11:00',
  3: '11:15 - 12:15',
  4: '12:15 - 01:15',
  5: '02:00 - 03:00',
  6: '03:00 - 04:00'
};

const StudentTimetable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);
  const [timetable, setTimetable] = useState([]);
  const [selectedSem, setSelectedSem] = useState('');

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('student_session');
    let activeStud = DEFAULT_STUDENT;
    if (session) {
      activeStud = JSON.parse(session);
      setStudentSession(activeStud);
    } else {
      navigate('/student/login');
      return;
    }

    // 2. Load timetable from DB
    const loadTimetable = async () => {
      setLoading(true);
      try {
        // If dropdown hasn't been used yet, fallback to student's enrolled semester
        let currentSem = selectedSem || activeStud.sem || 'Sem 3'; // Provide strong fallback
        
        // Normalize 'Sem 3' to 'Semester 3' to match Timetable DB format
        let querySem = currentSem;
        if (querySem && querySem.startsWith('Sem ')) {
          querySem = querySem.replace('Sem ', 'Semester ');
        }
        
        if (selectedSem !== querySem) {
          setSelectedSem(querySem); // initialize dropdown properly
        }

        console.log('[StudentTimetable Debug] Fetching for:', { department: activeStud.dept, semester: querySem });
        const res = await getTimetable(activeStud.dept || 'Cyber Security', querySem);

        console.log('[StudentTimetable Debug] API Response:', res.data);

        if (res.data && res.data.schedule) {
          const scheduleData = res.data.schedule;
          const formatted = [];
          
          if (scheduleData.length > 0 && Array.isArray(scheduleData[0])) {
            // It's a 2D array (saved by Admin)
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            scheduleData.forEach((daySchedule, dIdx) => {
              daySchedule.forEach((subject, tIdx) => {
                if (subject) {
                  formatted.push({
                    dept: activeStud.dept,
                    day: days[dIdx],
                    period: tIdx + 1,
                    subject: subject,
                    faculty: 'Assigned Faculty',
                    classroom: 'Main Block'
                  });
                }
              });
            });
          } else {
            // It's a flat object array (saved by HOD)
            scheduleData.forEach(slot => formatted.push(slot));
          }
          
          setTimetable(formatted);
        } else {
          setTimetable([]);
        }
      } catch (err) {
        console.error('Failed to load timetable from backend', err);
        setTimetable([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadTimetable();
  }, [navigate, selectedSem]);

  const studentDept = studentSession.dept;

  // The timetable from the backend is already filtered by the API for the requested department.
  // We can use it directly.
  const classSchedule = timetable;

  // Helper to find slot for a specific day and period
  const getSlot = (day, period) => {
    return classSchedule.find(s => s.day.toLowerCase() === day.toLowerCase() && Number(s.period) === Number(period));
  };

  return (
    <div className="timetable-page-s animate-fade-in">
      <div className="page-header-s">
        
        <div>
          <h1>Class Timetable</h1>
          <p className="text-muted">View your weekly lecture schedule, timings, and assigned lecture halls.</p>
        </div>
      </div>

      {/* Timetable Grid Card */}
      <div className="glass-card timetable-card-wrapper-s">
        <div className="timetable-header-row-s">
          <div className="timetable-legend-s">
            <span className="legend-item-s"><span className="legend-dot-s active"></span> Scheduled Lecture</span>
            <span className="legend-item-s"><span className="legend-dot-s empty"></span> Free Slot</span>
          </div>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <select 
              value={selectedSem} 
              onChange={e => setSelectedSem(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] rounded px-3 py-1 outline-none text-sm"
              style={{ padding: '0.4rem 0.8rem', borderRadius: '6px' }}
            >
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
              <option value="Semester 3">Semester 3</option>
              <option value="Semester 4">Semester 4</option>
              <option value="Semester 5">Semester 5</option>
              <option value="Semester 6">Semester 6</option>
            </select>
            <span className="class-group-label" style={{ margin: 0 }}>{studentDept}</span>
          </div>
        </div>

        <div className="timetable-grid-scroll-s">
          <table className="timetable-table-s">
            <thead>
              <tr>
                <th className="day-col-header-s">Day / Period</th>
                {PERIODS.map(p => (
                  <th key={p}>
                    <div className="period-header-s">
                      <span className="period-number-s">Period {p}</span>
                      <span className="period-time-s"><Clock size={11} /> {PERIOD_TIMES[p]}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                DAYS_ORDER.map(day => (
                  <tr key={day}>
                    <td className="day-name-cell-s">{day}</td>
                    {PERIODS.map(p => (
                      <td key={p}>
                        <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }}></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                DAYS_ORDER.map(day => (
                  <tr key={day}>
                    <td className="day-name-cell-s">{day}</td>
                    {PERIODS.map(p => {
                      const slot = getSlot(day, p);
                      if (slot) {
                        return (
                          <td key={p}>
                            <div className="timetable-slot-s active animate-scale-in">
                              <p className="slot-subject-s">{slot.subject}</p>
                              <p className="slot-faculty-s">{slot.faculty}</p>
                              <p className="slot-classroom-s"><MapPin size={11} /> {slot.classroom || 'LH-101'}</p>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={p}>
                          <div className="timetable-slot-s empty">
                            <span className="empty-text-s">Free Slot</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentTimetable;
