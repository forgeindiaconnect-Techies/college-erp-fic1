import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, UserCheck, BookOpen, Layers, Plus, 
  Download, Filter, CheckCircle2, AlertCircle, X, User, Edit2, Trash2 
} from 'lucide-react';
import { getFacultyAllocations, createFacultyAllocation, deleteFacultyAllocation, getStaff, getSubjects } from '../../api/index';
import './HodSubjects.css';

const getHodSession = () => {
  try { 
    return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science' }; 
  } catch { 
    return { dept: 'Computer Science' }; 
  }
};

const SEMESTERS = ['All', 'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
const SECTIONS = ['All', 'A', 'B', 'C', 'D'];

export default function HodFacultyAllocation() {
  const hod = getHodSession();
  const DEPT = hod.dept || hod.department || 'Computer Science';

  const [allocations, setAllocations] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState('All');
  const [secFilter, setSecFilter] = useState('All');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ staffId: '', subjectId: '', semester: 'Semester 1', section: 'A' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allocRes, staffRes, subRes] = await Promise.all([
        getFacultyAllocations({ department: DEPT }).catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getSubjects({ dept: DEPT }).catch(() => ({ data: [] }))
      ]);

      const allocationList = Array.isArray(allocRes.data) ? allocRes.data : [];
      setAllocations(allocationList.filter(item => item.staffId && item.subjectId));

      const allStaff = Array.isArray(staffRes.data) ? staffRes.data : [];
      const deptStaff = allStaff.filter(s => s.dept === DEPT || s.department === DEPT || !DEPT);
      setStaffList(deptStaff.length > 0 ? deptStaff : allStaff);

      const allSubs = Array.isArray(subRes.data) ? subRes.data : [];
      setSubjectsList(allSubs);
    } catch (err) {
      console.error('Failed to load faculty allocations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [DEPT]);

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (!form.staffId || !form.subjectId) {
      alert('Please select both faculty member and subject.');
      return;
    }

    try {
      await createFacultyAllocation({
        department: DEPT,
        staffId: form.staffId,
        subjectId: form.subjectId,
        semester: form.semester,
        section: form.section
      });
      fetchData();
      setModalOpen(false);
      setForm({ staffId: '', subjectId: '', semester: 'Semester 1', section: 'A' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate faculty.');
    }
  };

  const handleDeleteAllocation = async (id) => {
    if (window.confirm('Revoke this faculty allocation?')) {
      try {
        await deleteFacultyAllocation(id);
        fetchData();
      } catch (err) {
        alert('Failed to revoke allocation');
      }
    }
  };

  const filtered = useMemo(() => {
    return allocations.filter(a => {
      const q = search.toLowerCase();
      const staffName = a.staffId?.name?.toLowerCase() || '';
      const subjectName = a.subjectId?.subjectName?.toLowerCase() || '';
      const subjectCode = a.subjectId?.subjectCode?.toLowerCase() || '';
      const matchSearch = staffName.includes(q) || subjectName.includes(q) || subjectCode.includes(q);
      const matchSem = semFilter === 'All' || a.semester === semFilter;
      const matchSec = secFilter === 'All' || a.section === secFilter;
      return matchSearch && matchSem && matchSec;
    });
  }, [allocations, search, semFilter, secFilter]);

  const uniqueAllocatedStaff = useMemo(() => {
    const ids = new Set(allocations.map(a => a.staffId?._id || a.staffId?.id || a.staffId?.name));
    return ids.size;
  }, [allocations]);

  const uniqueAllocatedSubjects = useMemo(() => {
    const ids = new Set(allocations.map(a => a.subjectId?._id || a.subjectId?.id || a.subjectId?.subjectName));
    return ids.size;
  }, [allocations]);

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `DEPARTMENT OF ${DEPT.toUpperCase()} - FACULTY SUBJECT ALLOCATION ROSTER\n`;
    csv += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;
    csv += 'Faculty Member,Subject Name,Subject Code,Semester,Section\n';
    filtered.forEach(a => {
      csv += `"${a.staffId?.name || 'Unknown'}","${a.subjectId?.subjectName || 'Unknown'}","${a.subjectId?.subjectCode || 'N/A'}","${a.semester}","Section ${a.section}"\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${DEPT.replace(/\s+/g, '_')}_Faculty_Allocations.csv`;
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
              Faculty Subject Allocation — {DEPT}
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Assign academic staff to syllabus courses, labs, and section batches.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}
          >
            <Download size={14} /> Export Allocation (.CSV)
          </button>
          <button 
            type="button" 
            onClick={() => setModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
          >
            <Plus size={16} /> + Allocate Faculty
          </button>
        </div>
      </div>

      {/* 4-KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Total Allocations</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {allocations.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Active Teaching Assignments
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Active Faculty</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {uniqueAllocatedStaff} / {staffList.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            {staffList.length > 0 ? Math.round((uniqueAllocatedStaff / staffList.length) * 100) : 0}% Staff Engaged
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Courses Covered</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            {uniqueAllocatedSubjects} / {subjectsList.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
            Subjects Assigned
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Department Status</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(217,119,6,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            100% OK
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px', fontWeight: 600 }}>
            Workload Balanced
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '14px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-secondary, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          padding: '7px 14px',
          flex: 1,
          minWidth: '260px'
        }}>
          <Search size={15} color="var(--text-muted, #64748b)" />
          <input 
            type="text" 
            placeholder="Search by faculty name or assigned subject..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-main, #0f172a)', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={semFilter} 
            onChange={e => setSemFilter(e.target.value)}
            style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', outline: 'none', cursor: 'pointer' }}
          >
            {SEMESTERS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Semesters' : s}</option>)}
          </select>

          <select 
            value={secFilter} 
            onChange={e => setSecFilter(e.target.value)}
            style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', outline: 'none', cursor: 'pointer' }}
          >
            {SECTIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sections' : `Section ${s}`}</option>)}
          </select>
        </div>
      </div>

      {/* Allocation Table */}
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
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Faculty Member</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Subject Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Semester</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Section</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748b)' }}>
                    No faculty subject allocations found.
                  </td>
                </tr>
              ) : (
                filtered.map(a => (
                  <tr key={a._id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                          {(a.staffId?.name || 'F')[0]}
                        </div>
                        <div>
                          <div>{a.staffId?.name || 'Unknown Faculty'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>{a.staffId?.designation || 'Staff'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{a.subjectId?.subjectName || 'Unknown Subject'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#2563eb', fontFamily: 'monospace' }}>{a.subjectId?.subjectCode}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary, #f1f5f9)', fontSize: '0.76rem', fontWeight: 600 }}>
                        {a.semester}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.76rem' }}>
                        Sec {a.section}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteAllocation(a._id)}
                        style={{ padding: '5px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)', background: 'transparent', cursor: 'pointer', color: '#e11d48' }}
                        title="Revoke Allocation"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Allocate Faculty to Subject
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Select Faculty Member *</label>
                <select required value={form.staffId} onChange={e=>setForm({...form, staffId:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                  <option value="">— Select Teaching Faculty —</option>
                  {staffList.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.designation || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Select Course Subject *</label>
                <select required value={form.subjectId} onChange={e=>setForm({...form, subjectId:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                  <option value="">— Select Subject —</option>
                  {subjectsList.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.subjectCode} — {s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Semester</label>
                  <select value={form.semester} onChange={e=>setForm({...form, semester:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                    {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Section</label>
                  <select value={form.section} onChange={e=>setForm({...form, section:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                    {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button type="button" onClick={()=>setModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Save Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
