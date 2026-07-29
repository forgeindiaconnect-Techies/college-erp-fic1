import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { getTimetable } from '../../api/index';

const ParentTimetable = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [childDetails, setChildDetails] = useState({ dept: 'Cyber Security', sem: 'Semester 3' });

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const PERIODS = [1, 2, 3, 4, 5, 6];
  const PERIOD_TIMES = {
    1: '09:00 AM - 10:00 AM',
    2: '10:00 AM - 11:00 AM',
    3: '11:15 AM - 12:15 PM',
    4: '01:00 PM - 02:00 PM',
    5: '02:00 PM - 03:00 PM',
    6: '03:00 PM - 04:00 PM'
  };

  const SUBJECT_COLORS = [
    { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20', iconBg: 'bg-blue-500/20' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/20' },
    { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20', iconBg: 'bg-purple-500/20' },
    { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', iconBg: 'bg-amber-500/20' },
    { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/20', iconBg: 'bg-pink-500/20' },
    { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/20' },
    { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', iconBg: 'bg-rose-500/20' },
    { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20', iconBg: 'bg-cyan-500/20' }
  ];

  const getColorForSubject = (subjectName) => {
    if (!subjectName) return SUBJECT_COLORS[0];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
  };

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const session = sessionStorage.getItem('parent_session');
        let dept = 'Cyber Security';
        let sem = 'Semester 3'; // Default fallback

        if (session) {
          const parsed = JSON.parse(session);
          if (parsed.childDept) dept = parsed.childDept;
          if (parsed.childSem) sem = parsed.childSem;
        }

        // Normalize sem
        if (sem && sem.startsWith('Sem ')) {
          sem = sem.replace('Sem ', 'Semester ');
        }

        setChildDetails({ dept, sem });

        const res = await getTimetable(dept, sem);
        if (res.data && res.data.schedule) {
          const scheduleData = res.data.schedule;
          const formatted = [];
          
          if (scheduleData.length > 0 && Array.isArray(scheduleData[0])) {
            scheduleData.forEach((daySchedule, dIdx) => {
              daySchedule.forEach((subject, tIdx) => {
                if (subject) {
                  formatted.push({
                    day: DAYS[dIdx],
                    period: tIdx + 1,
                    subject: subject
                  });
                }
              });
            });
          } else {
            scheduleData.forEach(slot => formatted.push(slot));
          }
          setSchedule(formatted);
        }
      } catch (err) {
        console.error('Failed to load parent timetable:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  const getSlot = (day, period) => {
    return schedule.find(s => s.day.toLowerCase() === day.toLowerCase() && Number(s.period) === Number(period));
  };

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Premium Header Banner */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '16px',
        padding: '1.25rem 1.75rem',
        marginBottom: '1.5rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative blur */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(30px)' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={24} /> Weekly Timetable
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', fontWeight: 500 }}>
            Current class schedule for {childDetails.dept} ({childDetails.sem}).
          </p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)]">Loading timetable...</div>
          ) : (
            <table className="w-full text-center border-separate" style={{ borderSpacing: '10px' }}>
              <thead>
                <tr className="text-[var(--text-main)]">
                  <th className="p-4 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={16} /> Time
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="p-4 font-bold uppercase tracking-wider text-sm bg-[var(--bg-secondary)] rounded-xl" style={{ color: 'var(--text-muted)' }}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(p => (
                  <tr key={p} className="transition-colors">
                    <td className="p-4 font-bold text-[var(--text-muted)] whitespace-nowrap bg-[var(--bg-secondary)] rounded-xl shadow-sm">
                      Period {p} <br/><span className="text-xs font-semibold opacity-70">{PERIOD_TIMES[p]}</span>
                    </td>
                    {DAYS.map(day => {
                      const slot = getSlot(day, p);
                      if (slot) {
                        const colors = getColorForSubject(slot.subject);
                        return (
                          <td key={`${day}-${p}`} className="p-0">
                            <div className={`${colors.bg} ${colors.border} border-2 rounded-xl p-3 h-full flex flex-col justify-center items-center gap-1 transition-transform hover:-translate-y-1 hover:shadow-lg cursor-pointer`} style={{ minHeight: '100px' }}>
                              <span className={`${colors.text} font-extrabold text-sm text-center leading-tight`}>{slot.subject}</span>
                              {slot.classroom && (
                                <span className={`text-[11px] font-bold px-3 py-1 rounded-md mt-1 ${colors.iconBg} ${colors.text} shadow-sm`}>
                                  {slot.classroom}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      } else {
                        return (
                          <td key={`${day}-${p}`} className="p-0">
                            <div className="h-full flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[rgba(0,0,0,0.01)] dark:bg-[rgba(255,255,255,0.01)]" style={{ minHeight: '100px' }}>
                              <span className="text-[var(--text-muted)] text-sm font-semibold opacity-40">Free Slot</span>
                            </div>
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentTimetable;
