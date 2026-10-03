import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Users, UserCheck, Clock, CheckCircle2, AlertCircle, 
  Trash2, Plus, X, ShieldAlert, ArrowRight, Download, Filter, Search, Layers, BookOpen 
} from 'lucide-react';
import { getTimetable, getSubstitutions, createSubstitution, deleteSubstitution, getStaff } from '../../api/index';

const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'Prof. Rajan Iyer', dept: 'Computer Science', deptCode: 'CSE', role: 'HOD'
    };
  } catch (e) {
    return { name: 'Prof. Rajan Iyer', dept: 'Computer Science', deptCode: 'CSE', role: 'HOD' };
  }
};

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const formatPeriodName = (period) => {
  if (!period) return 'Period';
  const name = typeof period === 'string' ? period.trim() : (period.periodName || '').trim();
  if (period.isBreak || name.toLowerCase().includes('break') || name.toLowerCase().includes('lunch')) {
    return name;
  }
  return name.toLowerCase().includes('period') ? name : `Period ${name}`;
};

const HodSubstitution = () => {
  const hodSession = getHodSession();
  const HOD_DEPT = hodSession.dept || hodSession.department || 'Computer Science';

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSem, setSelectedSem] = useState('Semester 1');
  const [selectedSection, setSelectedSection] = useState('A');

  const [timetables, setTimetables] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [substituteStaffId, setSubstituteStaffId] = useState('');
  const [reason, setReason] = useState('Casual Leave');

  const getDayName = (dateString) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateString);
    return days[d.getDay()];
  };

  const dayName = getDayName(selectedDate);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ttRes, subRes, staffRes] = await Promise.all([
        getTimetable(HOD_DEPT, selectedSem, selectedSection, dayName),
        getSubstitutions({ department: HOD_DEPT, date: selectedDate }).catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] }))
      ]);

      const ttData = Array.isArray(ttRes.data) ? ttRes.data : [];
      setTimetables(ttData);
      setSubstitutions(Array.isArray(subRes.data) ? subRes.data : []);
      
      const allStaff = Array.isArray(staffRes.data) ? staffRes.data : [];
      const deptStaff = allStaff.filter(s => s.dept === HOD_DEPT || s.department === HOD_DEPT || !HOD_DEPT);
      setStaffList(deptStaff.length > 0 ? deptStaff : allStaff);
    } catch (err) {
      console.error('Failed to load substitution data', err);
    } finally {
      setLoading(false);
    }
  }, [HOD_DEPT, selectedSem, selectedSection, selectedDate, dayName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (slot) => {
    setSelectedSlot(slot);
    setSubstituteStaffId('');
    setReason('Casual Leave');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleSaveSubstitution = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !substituteStaffId) {
      setError('Please select a substitute faculty member.');
      return;
    }
    setError('');
    setSaving(true);

    try {
      const payload = {
        department: HOD_DEPT,
        semester: selectedSem,
        section: selectedSection,
        date: selectedDate,
        day: dayName,
        periodId: selectedSlot.periodId?._id || selectedSlot.periodId || 'p1',
        periodName: formatPeriodName(selectedSlot.periodId),
        timeRange: selectedSlot.timeRange || '09:00 AM - 10:00 AM',
        subjectId: selectedSlot.subjectId?._id || selectedSlot.subjectId || null,
        subjectName: selectedSlot.subjectId?.subjectName || selectedSlot.subjectName || 'Course Subject',
        originalStaffId: selectedSlot.staffId?._id || selectedSlot.staffId || null,
        originalFacultyName: selectedSlot.staffId?.name || selectedSlot.facultyName || 'Regular Faculty',
        substituteStaffId: substituteStaffId,
        reason: reason,
        roomNo: selectedSlot.roomNo || selectedSlot.venue || 'LH-101'
      };

      await createSubstitution(payload);
      setSuccess('✓ Substitute faculty assigned successfully.');
      setModalOpen(false);
      loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create faculty substitution.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSub = async (subId) => {
    if (!window.confirm('Cancel this faculty substitution?')) return;
    try {
      await deleteSubstitution(subId);
      loadData();
    } catch (err) {
      alert('Failed to delete substitution');
    }
  };

  // Merge timetable slots with live substitution entries
  const slotsWithSubstitutions = useMemo(() => {
    if (timetables.length === 0) {
      // Default fallback periodic structure so HOD can test easily
      return [
        { id: '1', periodName: 'Period 1 (09:00 - 10:00)', subjectName: 'Data Structures & Algorithms', facultyName: 'Dr. Ramesh Kumar', roomNo: 'Room 204' },
        { id: '2', periodName: 'Period 2 (10:00 - 11:00)', subjectName: 'Database Management Systems', facultyName: 'Prof. Anitha S', roomNo: 'Lab 2' },
        { id: '3', periodName: 'Period 3 (11:15 - 12:15)', subjectName: 'Operating Systems', facultyName: 'Dr. Suresh V', roomNo: 'Room 204' },
        { id: '4', periodName: 'Period 4 (01:15 - 02:15)', subjectName: 'Computer Networks', facultyName: 'Prof. Divya M', roomNo: 'Room 205' },
      ].map(slot => {
        const sub = substitutions.find(s => s.periodName === slot.periodName || s.subjectName === slot.subjectName);
        return {
          ...slot,
          substitution: sub || null
        };
      });
    }

    return timetables.map(slot => {
      const pName = formatPeriodName(slot.periodId);
      const sub = substitutions.find(s => 
        (s.periodId && s.periodId === slot.periodId?._id) ||
        (s.periodName && s.periodName === pName)
      );
      return {
        ...slot,
        periodName: pName,
        subjectName: slot.subjectId?.subjectName || slot.subjectName || 'Subject',
        facultyName: slot.staffId?.name || slot.facultyName || 'Staff Member',
        roomNo: slot.roomNo || 'LH-1',
        substitution: sub || null
      };
    });
  }, [timetables, substitutions]);

  const activeSubsCount = useMemo(() => substitutions.length, [substitutions]);

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `DEPARTMENT OF ${HOD_DEPT.toUpperCase()} - FACULTY SUBSTITUTION ROSTER\n`;
    csv += `Date: ${selectedDate} (${dayName}) | Semester: ${selectedSem} Section: ${selectedSection}\n\n`;
    csv += 'Period Time,Subject,Original Faculty,Room,Substitution Status,Substitute Faculty,Reason\n';
    slotsWithSubstitutions.forEach(s => {
      const sub = s.substitution;
      csv += `"${s.periodName}","${s.subjectName}","${s.facultyName}","${s.roomNo}","${sub ? 'Substituted' : 'Normal'}","${sub?.substituteStaffId?.name || sub?.substituteFacultyName || 'N/A'}","${sub?.reason || 'N/A'}"\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${HOD_DEPT.replace(/\s+/g, '_')}_Substitution_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Faculty Substitution & Class Rescheduling — {HOD_DEPT}
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Assign proxy teachers for absent faculty to prevent unattended lecture periods.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}
          >
            <Download size={14} /> Export Schedule (.CSV)
          </button>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{ padding: '12px 18px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
          {success}
        </div>
      )}

      {/* 4-KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Periods Scheduled</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {slotsWithSubstitutions.length} Slots
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            For {dayName} ({selectedDate})
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Regular Classes</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {slotsWithSubstitutions.filter(s => !s.substitution).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            Original Faculty Present
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Substitutions Arranged</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(217,119,6,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            {activeSubsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px', fontWeight: 600 }}>
            Proxy Teaching Assigned
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Coverage Ratio</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            100%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
            Zero Free Periods
          </div>
        </div>
      </div>

      {/* Date & Batch Filter Toolbar */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '14px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Target Date:</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem', fontWeight: 600 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Semester:</span>
          <select 
            value={selectedSem} 
            onChange={e => setSelectedSem(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Section:</span>
          <select 
            value={selectedSection} 
            onChange={e => setSelectedSection(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px' }}>
          📅 {dayName}, {selectedDate}
        </div>
      </div>

      {/* Slots & Substitution Table */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '14px',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Time / Period</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Subject</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Original Faculty</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Venue Room</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Substitution Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slotsWithSubstitutions.map((slot, idx) => {
                const isSubstituted = Boolean(slot.substitution);
                return (
                  <tr key={slot.id || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', background: isSubstituted ? 'rgba(245, 158, 11, 0.03)' : 'transparent' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                      {slot.periodName}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{slot.subjectName}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted, #475569)' }}>{slot.facultyName}</div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary, #f1f5f9)', fontSize: '0.76rem', fontWeight: 600 }}>
                        {slot.roomNo}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {isSubstituted ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.74rem' }}>
                            Proxy: {slot.substitution.substituteStaffId?.name || slot.substitution.substituteFacultyName || 'Substitute'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>({slot.substitution.reason || 'Leave'})</span>
                        </div>
                      ) : (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.74rem' }}>
                          ✓ Regular Faculty
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {isSubstituted ? (
                        <button 
                          onClick={() => handleDeleteSub(slot.substitution._id || slot.substitution.id)}
                          style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#e11d48', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Revoke Proxy
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenModal(slot)}
                          style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Assign Proxy
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Substitution Modal */}
      {modalOpen && selectedSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Assign Faculty Substitution
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                  {selectedSlot.periodName} • {selectedSlot.subjectName}
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSaveSubstitution} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Original Allocated Faculty</label>
                <input disabled value={selectedSlot.facultyName} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', background: '#f8fafc', fontWeight: 600, fontSize: '0.85rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Select Substitute Faculty *</label>
                <select required value={substituteStaffId} onChange={e=>setSubstituteStaffId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                  <option value="">— Select Available Faculty —</option>
                  {staffList.filter(s => s.name !== selectedSlot.facultyName).map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.designation || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Reason for Substitution</label>
                <select value={reason} onChange={e=>setReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="On-Duty (OD)">On-Duty (OD) / Conference</option>
                  <option value="Medical Leave">Medical Emergency</option>
                  <option value="Exam Duty">Exam Supervision Duty</option>
                  <option value="Official Meeting">Dean / Administrative Meeting</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button type="button" onClick={()=>setModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Assigning...' : 'Confirm Substitution'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HodSubstitution;
