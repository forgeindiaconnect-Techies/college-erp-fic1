import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, UserCheck, Clock, CheckCircle2, AlertCircle, Trash2, Plus, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { getTimetable, getSubstitutions, createSubstitution, deleteSubstitution, getStaff } from '../../api/index';

const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'Prof. Rajan Iyer', dept: 'Computer Science Engineering', deptCode: 'CS', role: 'HOD'
    };
  } catch (e) {
    return { name: 'Prof. Rajan Iyer', dept: 'Computer Science Engineering', deptCode: 'CS', role: 'HOD' };
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
  const HOD_DEPT = hodSession.dept;

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

  // Compute weekday from selectedDate
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

      setTimetables(ttRes.data || []);
      setSubstitutions(subRes.data || []);
      setStaffList(staffRes.data || []);
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
      await createSubstitution({
        timetableId: selectedSlot._id,
        substituteStaffId,
        date: selectedDate,
        reason
      });
      setSuccess('Faculty substitution created successfully!');
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error assigning substitute faculty.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubstitution = async (subId) => {
    if (!window.confirm('Are you sure you want to cancel this faculty substitution?')) return;
    try {
      await deleteSubstitution(subId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error cancelling substitution.');
    }
  };

  return (
    <div className="animate-fade-in p-6 pb-24 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <Users className="text-blue-600" size={28} /> Faculty Substitution Management
          </h1>
          <p className="text-gray-500 mt-1">Assign substitute faculty members for absent teachers on specific dates.</p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date:</label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Semester:</label>
            <select 
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Section:</label>
            <select 
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5">
          <Calendar size={14} /> {dayName}, {selectedDate}
        </div>
      </div>

      {success && (
        <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" /> {success}
        </div>
      )}

      {/* SCHEDULED CLASSES FOR SELECTED DATE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-sm text-gray-800">
            Scheduled Classes ({dayName}, {selectedDate})
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            {HOD_DEPT} • {selectedSem} • Section {selectedSection}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-700 uppercase tracking-wider border-b border-gray-200">
                <th className="p-3 font-bold">Time / Period</th>
                <th className="p-3 font-bold">Subject</th>
                <th className="p-3 font-bold">Original Allocated Faculty</th>
                <th className="p-3 font-bold">Room Venue</th>
                <th className="p-3 font-bold">Substitution Status</th>
                <th className="p-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                    Loading timetable schedule...
                  </td>
                </tr>
              ) : timetables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                    No classes scheduled for {dayName}.
                  </td>
                </tr>
              ) : (
                timetables.map((slot) => {
                  const subjectName = slot.subjectId?.subjectName || slot.subject || 'Subject';
                  const regularStaff = slot.facultyAllocationId?.staffId?.name || slot.staffName || 'Allocated Faculty';
                  const regularStaffId = slot.facultyAllocationId?.staffId?._id;
                  const periodName = formatPeriodName(slot.periodId);
                  const timeRange = slot.periodId ? `${slot.periodId.startTime} – ${slot.periodId.endTime}` : '';

                  const activeSub = substitutions.find(s => 
                    s.timetableId?._id === slot._id || s.timetableId === slot._id
                  );

                  return (
                    <tr key={slot._id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="p-3 font-semibold text-gray-800">
                        <div>{periodName}</div>
                        <div className="text-[11px] text-gray-400 font-normal">{timeRange}</div>
                      </td>

                      <td className="p-3 font-bold text-blue-900">
                        {subjectName}
                      </td>

                      <td className="p-3 font-medium text-gray-700">
                        {regularStaff}
                      </td>

                      <td className="p-3 font-semibold text-gray-600">
                        <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[11px]">
                          {slot.roomNo || 'Room 201'}
                        </span>
                      </td>

                      <td className="p-3 font-medium">
                        {activeSub ? (
                          <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            <UserCheck size={13} />
                            Substituted: {activeSub.substituteStaffId?.name} ({activeSub.reason})
                          </div>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                            Regular Faculty
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {activeSub ? (
                          <button
                            onClick={() => handleCancelSubstitution(activeSub._id)}
                            className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center gap-1 ml-auto"
                          >
                            <Trash2 size={12} /> Cancel Sub
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenModal({ ...slot, regularStaff, regularStaffId })}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1 ml-auto"
                          >
                            <Plus size={14} /> Assign Substitute
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN SUBSTITUTE FACULTY MODAL */}
      {modalOpen && selectedSlot && (
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
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Assign Substitute Faculty</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>{selectedDate} ({dayName})</p>
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

            <form onSubmit={handleSaveSubstitution} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>
                  {selectedSlot.subjectId?.subjectName || selectedSlot.subject}
                </div>
                <div style={{ color: '#64748b', marginTop: '0.2rem' }}>
                  Regular Faculty: <strong style={{ color: '#334155' }}>{selectedSlot.regularStaff}</strong>
                </div>
                <div style={{ color: '#64748b', marginTop: '0.1rem' }}>
                  Period: {formatPeriodName(selectedSlot.periodId)} ({selectedSlot.periodId?.startTime})
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Select Substitute Faculty
                </label>
                <select 
                  required
                  value={substituteStaffId}
                  onChange={(e) => setSubstituteStaffId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: 600, outline: 'none' }}
                >
                  <option value="">Choose Available Faculty Member</option>
                  {staffList
                    .filter(s => s._id !== selectedSlot.regularStaffId)
                    .map(st => (
                      <option key={st._id} value={st._id}>
                        {st.name} ({st.dept || st.designation || 'Faculty'})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Reason for Substitution
                </label>
                <select 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: 600, outline: 'none' }}
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Official Duty">Official Duty</option>
                  <option value="Conference / Seminar">Conference / Seminar</option>
                  <option value="Special Duty">Special Duty</option>
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
                  disabled={saving || !substituteStaffId}
                  style={{ width: '50%', padding: '0.65rem', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, background: '#2563eb', color: '#ffffff', cursor: (saving || !substituteStaffId) ? 'not-allowed' : 'pointer', opacity: (saving || !substituteStaffId) ? 0.6 : 1 }}
                >
                  {saving ? 'Saving...' : 'Confirm Substitution'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HodSubstitution;
