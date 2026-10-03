import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, Search, Calendar, Users, FileText, ArrowLeft, 
  BookOpen, CheckCircle2, Clock, AlertCircle, Download, User, X, Eye 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, getAssignmentSubmissions, getStudents } from '../../api/index';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science' }; }
  catch { return { dept: 'Computer Science' }; }
};

const HodAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const hod = getHodSession();
  const DEPT = hod.dept || hod.department || 'Computer Science';

  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Submissions Modal
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const openSubmissions = async (assignment) => {
    setViewingAssignment(assignment);
    setSubmissionsModalOpen(true);
    setSubsLoading(true);
    try {
      const subRes = await getAssignmentSubmissions(assignment._id || assignment.id);
      setAssignmentSubmissions(subRes.data || []);
      
      const stuRes = await getStudents();
      const allStuds = stuRes.data || [];
      const targetStudents = allStuds.filter(s => 
        (s.dept === assignment.department || s.department === assignment.department) && 
        (s.sem === assignment.class || s.semester === assignment.class)
      );
      setClassStudents(targetStudents);
    } catch (err) {
      console.error(err);
    } finally {
      setSubsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const res = await getAssignments({ department: DEPT });
        setAssignments(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.warn('Failed to fetch hod assignments');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [DEPT]);

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return { text: 'Ongoing', color: '#2563eb', bg: '#eff6ff' };
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Overdue', color: '#e11d48', bg: '#ffe4e6' };
    if (diffDays === 0) return { text: 'Due Today', color: '#d97706', bg: '#fef3c7' };
    return { text: `${diffDays} days left`, color: '#15803d', bg: '#dcfce7' };
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = (a.title || '').toLowerCase().includes(q) ||
                          (a.subject || '').toLowerCase().includes(q) ||
                          (a.faculty || '').toLowerCase().includes(q);
      const isOverdue = new Date(a.dueDate) < new Date();
      const matchStatus = statusFilter === 'All' || 
                          (statusFilter === 'Overdue' && isOverdue) || 
                          (statusFilter === 'Active' && !isOverdue);
      return matchSearch && matchStatus;
    });
  }, [assignments, search, statusFilter]);

  const totalSubmissionsCount = useMemo(() => assignments.reduce((a, b) => a + (Number(b.submissionsCount || b.submissions || 0)), 0), [assignments]);
  const overdueCount = useMemo(() => assignments.filter(a => new Date(a.dueDate) < new Date()).length, [assignments]);
  const uniqueFacultyCount = useMemo(() => new Set(assignments.map(a => a.faculty)).size, [assignments]);

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `DEPARTMENT OF ${DEPT.toUpperCase()} - ASSIGNMENTS & HOMEWORK REPORT\n`;
    csv += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;
    csv += 'Assignment Title,Subject,Faculty,Target Class / Sem,Due Date,Submissions,Status\n';
    filteredAssignments.forEach(a => {
      const status = getDaysLeft(a.dueDate).text;
      csv += `"${a.title}","${a.subject}","${a.faculty}","${a.class || a.department || 'All'}","${formatDate(a.dueDate)}",${a.submissionsCount || 0},"${status}"\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${DEPT.replace(/\s+/g, '_')}_Assignments_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Coursework & Assignments — {DEPT}
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Oversight of homework, continuous assessment tasks, and student submission rates.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}
          >
            <Download size={14} /> Export Assignments (.CSV)
          </button>
        </div>
      </div>

      {/* 4-KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Active Tasks</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {assignments.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Total Coursework Assigned
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Submissions Logged</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {totalSubmissionsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            Student Turn-ins Verified
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fecdd3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>Overdue Deadlines</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(225,29,72,0.1)', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#be123c', marginTop: '6px' }}>
            {overdueCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: '2px', fontWeight: 600 }}>
            Past Due Date
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Faculty Assigned</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            {uniqueFacultyCount} Staff
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
            Active Instructors
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
            placeholder="Search by assignment title, subject, or faculty instructor..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-main, #0f172a)', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Deadlines</option>
            <option value="Overdue">Overdue Deadlines</option>
          </select>
        </div>
      </div>

      {/* Assignments Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>Loading coursework data...</div>
        ) : filteredAssignments.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
            No coursework assignments found matching your filter.
          </div>
        ) : (
          filteredAssignments.map((a, idx) => {
            const daysLeft = getDaysLeft(a.dueDate);
            return (
              <div 
                key={a._id || a.id || idx}
                style={{
                  background: 'var(--bg-card, #ffffff)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  padding: '20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb' }}>
                      {a.class || DEPT}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: daysLeft.bg, color: daysLeft.color }}>
                      {daysLeft.text}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    {a.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#2563eb', marginBottom: '8px' }}>
                    <BookOpen size={14} />
                    <span>{a.subject}</span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.4', background: 'var(--bg-secondary, #f8fafc)', padding: '10px', borderRadius: '8px' }}>
                    {a.description ? a.description.replace(/^"|"$/g, '') : 'No additional instructions provided.'}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color, #f1f5f9)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted, #64748b)' }}>
                    <Calendar size={14} />
                    <span>Due: <strong>{formatDate(a.dueDate)}</strong></span>
                  </div>

                  <button 
                    onClick={() => openSubmissions(a)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={13} /> {a.submissionsCount || a.submissions || 0} Submissions
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submissions Inspector Modal */}
      {submissionsModalOpen && viewingAssignment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '16px', width: '100%', maxWidth: '650px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  {viewingAssignment.title} — Submissions
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                  Subject: {viewingAssignment.subject} • Faculty: {viewingAssignment.faculty}
                </div>
              </div>
              <button onClick={() => setSubmissionsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}>
                <X size={18} />
              </button>
            </div>

            {subsLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>Loading submissions...</div>
            ) : assignmentSubmissions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                No students have submitted this assignment yet.
              </div>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Student Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Submitted At</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Grade / Marks</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentSubmissions.map((s, idx) => (
                      <tr key={s._id || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{s.studentName || s.studentId}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted, #64748b)' }}>{formatDate(s.submittedAt || s.createdAt)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{s.marks !== undefined ? `${s.marks} / 100` : 'Pending Evaluation'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}>
                            ✓ Submitted
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
              <button onClick={() => setSubmissionsModalOpen(false)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HodAssignments;
