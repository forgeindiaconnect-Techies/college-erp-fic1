import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, TrendingUp, Users, CheckCircle, Search, 
  Building, Award, Calendar, FileText, Download, CheckCircle2, 
  ExternalLink, Filter, DollarSign, UserCheck, ShieldCheck, MapPin, Plus, X 
} from 'lucide-react';
import { 
  getStudents, getPlacementJobs, getPlacementApplications, 
  getPlacementSelections, getPlacementInterviews, getMyProfile,
  updatePlacementApplicationStatus, getAllMarks, getAllAttendance
} from '../../api/index';

const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'HOD', dept: 'TAMIL', deptCode: 'TAM', role: 'HOD'
    };
  } catch {
    return { name: 'HOD', dept: 'TAMIL', deptCode: 'TAM', role: 'HOD' };
  }
};

const isSameDepartment = (candidateDept, hodDept) => {
  if (!candidateDept || !hodDept) return true;
  const c = String(candidateDept).trim().toLowerCase();
  const h = String(hodDept).trim().toLowerCase();
  if (c === h) return true;

  const cleanTokens = (str) => str.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const cTokens = cleanTokens(c);
  const hTokens = cleanTokens(h);

  const isCS = (tokens) => tokens.some(t => ['cs', 'cse', 'computer', 'software', 'bca', 'mca', 'it', 'information'].includes(t));
  const isCommerce = (tokens) => tokens.some(t => ['commerce', 'bcom', 'mcom', 'finance', 'accounting', 'corporate'].includes(t));
  const isArts = (tokens) => tokens.some(t => ['arts', 'history', 'tamil', 'english', 'literature', 'economics'].includes(t));

  if (isCS(hTokens)) return isCS(cTokens) && !isCommerce(cTokens) && !isArts(cTokens);
  if (isCommerce(hTokens)) return isCommerce(cTokens) && !isCS(cTokens);
  if (isArts(hTokens)) return isArts(cTokens) && !isCS(cTokens);

  return cTokens.some(t => hTokens.includes(t) && !['engineering', 'department', 'dept', 'of'].includes(t));
};

export default function HodPlacements() {
  const hod = getHodSession();
  const [DEPT, setDEPT] = useState(hod.dept || hod.department || 'TAMIL');

  const [tab, setTab] = useState('students'); // 'students', 'drives', 'applications', 'interviews', 'selections'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };
  
  const [students, setStudents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [selections, setSelections] = useState([]);

  useEffect(() => {
    fetchData();
    const handlePlacementUpdate = () => {
      console.log('⚡ HOD Placement data updated - refreshing');
      fetchData();
    };
    window.addEventListener('erp_placement_updated', handlePlacementUpdate);
    window.addEventListener('erp_marks_updated', handlePlacementUpdate);
    window.addEventListener('erp_attendance_updated', handlePlacementUpdate);
    window.addEventListener('storage', handlePlacementUpdate);
    return () => {
      window.removeEventListener('erp_placement_updated', handlePlacementUpdate);
      window.removeEventListener('erp_marks_updated', handlePlacementUpdate);
      window.removeEventListener('erp_attendance_updated', handlePlacementUpdate);
      window.removeEventListener('storage', handlePlacementUpdate);
    };
  }, [DEPT]);

  const fetchData = async () => {
    setLoading(true);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    try {
      // 1. Resolve live HOD department
      let deptName = DEPT;
      try {
        const profRes = await getMyProfile();
        deptName = profRes.data.department || profRes.data.dept || deptName;
      } catch {
        const session = sessionStorage.getItem('hod_session');
        if (session) {
          const parsed = JSON.parse(session);
          deptName = parsed.dept || parsed.department || deptName;
        }
      }
      setDEPT(deptName);

      // 2. Fetch all real data
      const [studentsRes, jobsRes, appsRes, intRes, selRes, marksRes, attRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getPlacementJobs().catch(() => ({ data: [] })),
        getPlacementApplications().catch(() => ({ data: [] })),
        getPlacementInterviews().catch(() => ({ data: [] })),
        getPlacementSelections().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] }))
      ]);

      // Raw students
      let rawStudents = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.students || []);
      if (rawStudents.length === 0) {
        try {
          const local = localStorage.getItem(`erp_students_${tenantId}`);
          if (local) rawStudents = JSON.parse(local);
        } catch {}
      }

      // Filter strictly for HOD's department
      const deptStudents = rawStudents.filter(s => isSameDepartment(s.dept || s.department || s.course, deptName));

      // Merge all marks & local marks
      const allMarks = Array.isArray(marksRes.data) ? marksRes.data : (marksRes.data?.marks || []);
      let localMarks = [];
      try {
        const rawM = localStorage.getItem(`erp_marks_${tenantId}`) || localStorage.getItem('erp_marks');
        if (rawM) localMarks = JSON.parse(rawM);
      } catch {}
      try {
        const rawSubs = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
        if (rawSubs) {
          const subs = JSON.parse(rawSubs);
          subs.forEach(b => {
            if (b.records && Array.isArray(b.records)) {
              b.records.forEach(r => localMarks.push({ ...r, resultStatus: b.status || r.resultStatus }));
            }
          });
        }
      } catch {}
      const combinedMarks = [...allMarks, ...localMarks];

      // Merge all attendance & local attendance
      const allAtt = Array.isArray(attRes.data) ? attRes.data : (attRes.data?.attendance || []);
      let localAtt = [];
      try {
        const rawA = localStorage.getItem(`erp_attendance_${tenantId}`) || localStorage.getItem('erp_attendance');
        if (rawA) localAtt = JSON.parse(rawA);
      } catch {}
      const combinedAtt = [...allAtt, ...localAtt];

      // Enrich deptStudents with live CGPA, Arrears, and Attendance
      const enrichedStudents = deptStudents.map(st => {
        const sRoll = String(st.id || st.rollNo || st.regNo || '').toLowerCase();
        const sName = String(st.name || '').toLowerCase();

        // 1. Marks & CGPA & Arrears
        const stMarks = combinedMarks.filter(m => {
          const mId = String(m.studentId || m._id || m.id || '').toLowerCase();
          const mRoll = String(m.registerNo || m.rollNo || '').toLowerCase();
          const mName = String(m.studentName || m.name || '').toLowerCase();
          return (mId && sRoll && mId === sRoll) || (mRoll && sRoll && mRoll === sRoll) || (mName && sName && (mName === sName || mName.includes(sName)));
        });

        let computedCgpa = Number(st.cgpa ?? 0);
        let computedArrears = Number(st.arrears ?? 0);

        if (stMarks.length > 0) {
          const validGpas = stMarks.map(m => {
            const tot = Number(m.totalMarks ?? (Number(m.internalMarks || 0) + Number(m.semesterMarks || 0)) ?? m.marksObtained ?? 0);
            return Number(m.cgpa || m.gpa || (tot > 0 ? (tot / 10).toFixed(2) : 0));
          }).filter(g => g > 0);

          if (validGpas.length > 0 && computedCgpa === 0) {
            computedCgpa = Number((validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2));
          }

          computedArrears = stMarks.filter(m => {
            const tot = Number(m.totalMarks ?? (Number(m.internalMarks || 0) + Number(m.semesterMarks || 0)) ?? m.marksObtained ?? 0);
            return m.arrearStatus === 'Arrear' || (m.totalMarks !== undefined && tot < 40);
          }).length;
        }

        // 2. Attendance
        const stAtt = combinedAtt.filter(r => 
          String(r.studentId || '').toLowerCase() === sRoll || 
          String(r.studentName || '').toLowerCase() === sName
        );

        let computedAttendance = st.attendance !== undefined && st.attendance !== null ? st.attendance : '100%';
        if (stAtt.length > 0) {
          const presents = stAtt.filter(r => ['Present', 'Late'].includes(r.status)).length;
          computedAttendance = `${Math.round((presents / stAtt.length) * 100)}%`;
        }

        return {
          ...st,
          cgpa: computedCgpa,
          arrears: computedArrears,
          attendance: computedAttendance
        };
      });

      setStudents(enrichedStudents);

      const deptStudentRegNos = enrichedStudents.map(s => (s.id || s.rollNo || s.regNo || '').toLowerCase());

      // Jobs with multi-key scanning
      let rawJobs = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.jobs || []);
      const jobMap = new Map();
      rawJobs.forEach(j => jobMap.set(String(j._id || j.jobId || j.id), j));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('erp_placement_jobs')) {
          try {
            const localItems = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(localItems)) {
              localItems.forEach(lj => {
                const ljId = String(lj._id || lj.jobId || lj.id);
                if (ljId && !jobMap.has(ljId)) jobMap.set(ljId, lj);
              });
            }
          } catch (e) {}
        }
      }
      setJobs(Array.from(jobMap.values()));

      // Applications with multi-key scanning
      let rawApps = Array.isArray(appsRes.data) ? appsRes.data : (appsRes.data?.applications || []);
      const appMap = new Map();
      rawApps.forEach(a => appMap.set(String(a._id || a.appId || a.id || `${a.regNo}_${a.jobId}`), a));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('erp_placement_applications')) {
          try {
            const localItems = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(localItems)) {
              localItems.forEach(la => {
                const laId = String(la._id || la.appId || la.id || `${la.regNo}_${la.jobId}`);
                if (laId && !appMap.has(laId)) appMap.set(laId, la);
              });
            }
          } catch (e) {}
        }
      }
      const deptApps = Array.from(appMap.values()).filter(app => 
        isSameDepartment(app.dept || app.department, deptName) || deptStudentRegNos.includes((app.regNo || '').toLowerCase())
      );
      setApplications(deptApps);

      // Interviews with multi-key scanning
      let rawInt = Array.isArray(intRes.data) ? intRes.data : (intRes.data?.interviews || []);
      const intMap = new Map();
      rawInt.forEach(it => intMap.set(String(it._id || it.intId || it.id || `${it.candidateName}_${it.company}`), it));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('erp_placement_interviews')) {
          try {
            const localItems = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(localItems)) {
              localItems.forEach(lit => {
                const litId = String(lit._id || lit.intId || lit.id || `${lit.candidateName}_${lit.company}`);
                if (litId && !intMap.has(litId)) intMap.set(litId, lit);
              });
            }
          } catch (e) {}
        }
      }
      setInterviews(Array.from(intMap.values()));

      // Selections with multi-key scanning
      let rawSelections = Array.isArray(selRes.data) ? selRes.data : (selRes.data?.selections || []);
      const selMap = new Map();
      rawSelections.forEach(s => selMap.set(String(s._id || s.selId || s.id || `${s.regNo}_${s.company}`), s));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('erp_placement_selections')) {
          try {
            const localItems = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(localItems)) {
              localItems.forEach(ls => {
                const lsId = String(ls._id || ls.selId || ls.id || `${ls.regNo}_${ls.company}`);
                if (lsId && !selMap.has(lsId)) selMap.set(lsId, ls);
              });
            }
          } catch (e) {}
        }
      }
      const deptSelections = Array.from(selMap.values()).filter(sel => 
        isSameDepartment(sel.dept || sel.department, deptName) || deptStudentRegNos.includes((sel.regNo || '').toLowerCase())
      );
      setSelections(deptSelections);

    } catch (err) {
      console.error("Failed to fetch HOD placement data", err);
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const totalScholars = students.length;
  const eligibleScholars = students.filter(
    s => Number(s.cgpa ?? 0) >= 6.0 && Number(s.arrears ?? 0) === 0
  );
  const appliedCount = [...new Set(applications.map(a => (a.regNo || '').toLowerCase()))].length;
  const placedCount = selections.length;
  const placementRate = totalScholars > 0 ? Math.round((placedCount / totalScholars) * 100) : 0;

  // Highest CTC
  const highestPackage = useMemo(() => {
    let max = 0;
    selections.forEach(s => {
      const val = parseFloat(String(s.ctc).replace(/[^0-9.]/g, ''));
      if (val > max) max = val;
    });
    return max > 0 ? `${max} LPA` : '0 LPA';
  }, [selections]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `DEPARTMENT OF ${DEPT.toUpperCase()} - PLACEMENT & RECRUITMENT REPORT\n`;
    csv += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;

    if (tab === 'drives') {
      csv += 'Company Name,Job Role,Package CTC,Work Location,Registration Deadline,Min CGPA,Status\n';
      jobs.forEach(j => {
        csv += `"${j.company}","${j.role}","${j.ctc || 'N/A'}","${j.location || 'Pan India'}","${j.deadline ? new Date(j.deadline).toLocaleDateString() : 'Open'}",${j.minCgpa ?? 'N/A'},"${j.status || 'Active'}"\n`;
      });
    } else if (tab === 'selections') {
      csv += 'Student Name,Roll / Reg No,Placed Company,Job Role,Annual CTC,Offer Date\n';
      selections.forEach(s => {
        csv += `"${s.studentName}","${s.regNo}","${s.company}","${s.role}","${s.ctc}","${s.date}"\n`;
      });
    } else {
      csv += 'Student Name,Roll No,Semester,CGPA,Arrears,Attendance,Eligibility Status\n';
      students.forEach(s => {
        const isEligible = Number(s.cgpa ?? 0) >= 6.0 && Number(s.arrears ?? 0) === 0;
        csv += `"${s.name}","${s.rollNo || s.id || s.regNo}","${s.sem || s.semester || 'N/A'}",${s.cgpa ?? 'N/A'},${s.arrears ?? 0},"${s.attendance ?? 'N/A'}","${isEligible ? 'Eligible' : 'Not Eligible'}"\n`;
      });
    }

    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${DEPT.replace(/\s+/g, '_')}_HOD_Placement_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const renderStudentsRoster = () => {
    const filtered = students.filter(s => 
      (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.id || s.rollNo || s.regNo || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Department Scholars Placement Roster
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Academic performance evaluation, live CGPA, active arrears, and placement drive eligibility.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
            Showing {filtered.length} of {students.length} Scholars
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Register No</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Student Name</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Semester</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>CGPA</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Arrears</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Attendance</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Recruitment Status</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(st => {
                const isEligible = Number(st.cgpa ?? 0) >= 6.0 && Number(st.arrears ?? 0) === 0;
                return (
                  <tr key={st.id || st.rollNo || st.regNo} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                      {st.id || st.rollNo || st.regNo}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                      {st.name}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                      {st.sem || st.semester || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>
                      {st.cgpa ?? 'N/A'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 700, color: Number(st.arrears ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
                      {st.arrears ?? '0'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 600, color: '#15803d' }}>
                      {st.attendance !== undefined && st.attendance !== null ? (typeof st.attendance === 'number' ? `${st.attendance}%` : st.attendance) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        background: isEligible ? '#dcfce7' : '#fee2e2', 
                        color: isEligible ? '#15803d' : '#991b1b', 
                        fontWeight: 700, 
                        fontSize: '0.75rem' 
                      }}>
                        {isEligible ? '✓ Drive Eligible' : 'Criteria Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <button 
                        type="button"
                        onClick={() => showToast(`Verified status for ${st.name}`)}
                        style={{ padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                      >
                        Verify Record
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted, #64748b)' }}>
                    No scholars found in {DEPT} department database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDrives = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
      {jobs.map((job, idx) => (
        <div
          key={job.id || job._id || idx}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb' }}>
                {job.ctc || 'Not Disclosed'}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                {job.status || 'Active Drive'}
              </span>
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              {job.company}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              <Briefcase size={14} color="#2563eb" />
              <span>{job.role}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
              <MapPin size={13} />
              <span>{job.location || 'Campus / Multiple Locations'}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color, #f1f5f9)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
            <div style={{ color: 'var(--text-muted, #64748b)' }}>
              <span>Min CGPA: <strong>{job.minCgpa ?? 'N/A'}</strong></span>
              <div style={{ fontSize: '0.72rem' }}>Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open'}</div>
            </div>

            <button 
              type="button"
              onClick={() => showToast(`Notified ${DEPT} department about ${job.company} recruitment`)}
              style={{ padding: '5px 12px', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
            >
              Notify Scholars
            </button>
          </div>
        </div>
      ))}
      {jobs.length === 0 && (
        <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
          No active recruitment drives scheduled yet for {DEPT}.
        </div>
      )}
    </div>
  );

  const renderApplications = () => {
    const filtered = applications.filter(a => 
      (a.student || '').toLowerCase().includes(search.toLowerCase()) || 
      (a.company || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Student Drive Applications ({filtered.length})
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Student Name</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Register No</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Company</th>
                <th style={{ padding: '12px 18px', textAlign: 'left' }}>Job Role</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Application Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id || a.applicationId} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{a.student}</td>
                  <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: 'var(--text-muted, #64748b)' }}>{a.regNo}</td>
                  <td style={{ padding: '12px 18px', fontWeight: 700, color: '#2563eb' }}>{a.company}</td>
                  <td style={{ padding: '12px 18px', color: 'var(--text-main, #0f172a)' }}>{a.role}</td>
                  <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                    <span style={{ 
                      background: a.status === 'Shortlisted' ? 'rgba(245,158,11,0.12)' : 
                                  a.status === 'Selected' ? 'rgba(16,185,129,0.12)' : 
                                  a.status === 'Rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)', 
                      color: a.status === 'Shortlisted' ? '#d97706' : 
                             a.status === 'Selected' ? '#059669' : 
                             a.status === 'Rejected' ? '#dc2626' : '#2563eb', 
                      padding: '5px 12px', 
                      borderRadius: 6, 
                      fontSize: '0.78rem', 
                      fontWeight: 800, 
                      display: 'inline-block' 
                    }}>
                      {a.status || 'Applied'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted, #64748b)' }}>
                    No student applications recorded for {DEPT} department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInterviews = () => (
    <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Scheduled Interview Drives & Rounds
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
              <th style={{ padding: '12px 18px', textAlign: 'left' }}>Company</th>
              <th style={{ padding: '12px 18px', textAlign: 'left' }}>Interview Round</th>
              <th style={{ padding: '12px 18px', textAlign: 'center' }}>Date & Time</th>
              <th style={{ padding: '12px 18px', textAlign: 'center' }}>Venue / Mode</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map(i => (
              <tr key={i._id || i.interviewId} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                <td style={{ padding: '12px 18px', fontWeight: 700, color: '#2563eb' }}>{i.company}</td>
                <td style={{ padding: '12px 18px', fontWeight: 600 }}>{i.round}</td>
                <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                  {i.date ? new Date(i.date).toLocaleDateString() : 'TBA'} {i.time ? `• ${i.time}` : ''}
                </td>
                <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', background: i.mode === 'Online' ? '#eff6ff' : '#f1f5f9', color: i.mode === 'Online' ? '#2563eb' : '#475569', fontWeight: 700, fontSize: '0.75rem' }}>
                    {i.mode || i.venue || 'Campus Auditorium'}
                  </span>
                </td>
                <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                  <button 
                    type="button"
                    onClick={() => showToast(`Notified candidates for ${i.company} interview`)}
                    style={{ padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', background: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                  >
                    Notify Scholars
                  </button>
                </td>
              </tr>
            ))}
            {interviews.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted, #64748b)' }}>
                  No interview sessions currently scheduled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSelections = () => (
    <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          Verified Placed Scholars & Job Offers ({selections.length})
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
              <th style={{ padding: '12px 18px', textAlign: 'left' }}>Placed Student</th>
              <th style={{ padding: '12px 18px', textAlign: 'left' }}>Register No</th>
              <th style={{ padding: '12px 18px', textAlign: 'left' }}>Recruiting Company</th>
              <th style={{ padding: '12px 18px', textAlign: 'left' }}>Job Designation</th>
              <th style={{ padding: '12px 18px', textAlign: 'center' }}>Package (CTC)</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Offer Date</th>
            </tr>
          </thead>
          <tbody>
            {selections.map((sel, idx) => (
              <tr key={sel.id || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{sel.studentName}</td>
                <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: 'var(--text-muted, #64748b)' }}>{sel.regNo}</td>
                <td style={{ padding: '12px 18px', fontWeight: 700, color: '#2563eb' }}>{sel.company}</td>
                <td style={{ padding: '12px 18px', color: 'var(--text-main, #0f172a)', fontWeight: 600 }}>{sel.role}</td>
                <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.8rem' }}>
                    {sel.ctc}
                  </span>
                </td>
                <td style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--text-muted, #64748b)' }}>
                  {sel.date ? new Date(sel.date).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
            {selections.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                  No verified student selections/offers recorded yet for {DEPT}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Campus Placements & Corporate Recruitment — {DEPT}
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Track {DEPT} recruitment drives, student academic eligibility, applications, and salary statistics.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}
          >
            <Download size={14} /> Export Report (.CSV)
          </button>
        </div>
      </div>

      {/* 4-Card Executive KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* KPI 1: Enrolled Scholars */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bfdbfe', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Department Scholars</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {totalScholars}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Active {DEPT} Students
          </div>
        </div>

        {/* KPI 2: Drive Eligible */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Drive Eligible</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {eligibleScholars.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            CGPA ≥ 6.0 & Zero Arrears
          </div>
        </div>

        {/* KPI 3: Job Offers */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #ddd6fe', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Verified Placed</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            {placedCount} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>({placementRate}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
            Placement Ratio: {placementRate}%
          </div>
        </div>

        {/* KPI 4: Highest Package */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Highest Offer CTC</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(217,119,6,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            {highestPackage}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px', fontWeight: 600 }}>
            Top Tier Compensation
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '2px solid var(--border-color, #e2e8f0)', paddingBottom: '2px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { key: 'students', label: '🎓 Students Placement Roster' },
            { key: 'drives', label: '🏢 Active Recruitment Drives' },
            { key: 'applications', label: '📝 Applications Tracking' },
            { key: 'interviews', label: '📅 Interview Schedule' },
            { key: 'selections', label: '🏆 Verified Placed Students & Offers' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: tab === t.key ? '#2563eb' : 'var(--text-muted, #64748b)',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.key ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Live Search */}
        {['students', 'applications'].includes(tab) && (
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search scholar or reg no..." 
              style={{ padding: '7px 12px 7px 34px', borderRadius: 8, border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', fontSize: '0.82rem', width: '100%', outline: 'none' }} 
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {tab === 'students' && renderStudentsRoster()}
      {tab === 'drives' && renderDrives()}
      {tab === 'applications' && renderApplications()}
      {tab === 'interviews' && renderInterviews()}
      {tab === 'selections' && renderSelections()}

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: '#ffffff',
          padding: '12px 22px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          fontWeight: 700, fontSize: '0.88rem', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <CheckCircle size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
