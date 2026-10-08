import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, CheckCircle, XCircle, ChevronRight, FileText, 
  Building, Award, Calendar, MapPin, Search, AlertCircle, 
  Clock, TrendingUp, UserCheck, ShieldCheck, CheckCircle2, Sparkles, RefreshCw
} from 'lucide-react';
import { 
  getStudentById, getMarksByStudent, getAttendanceByStudent,
  getPlacementJobs, getPlacementApplications, getPlacementInterviews,
  getPlacementSelections, applyForPlacement 
} from '../../api/index';
import './StudentMarks.css';

const StudentPlacements = () => {
  const navigate = useNavigate();
  const [studentDetails, setStudentDetails] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('drives'); // 'drives', 'applications', 'interviews', 'eligibility'
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchPlacementData = useCallback(async () => {
    const sessionStr = sessionStorage.getItem('student_session') || localStorage.getItem('student_session');
    if (!sessionStr) {
      navigate('/login');
      return;
    }

    let activeStud = {};
    try {
      activeStud = JSON.parse(sessionStr);
    } catch {
      activeStud = {};
    }

    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const sId = activeStud.id || activeStud.referenceId || activeStud._id || '';
    const sRoll = (activeStud.rollNo || activeStud.registerNo || sId || '').toLowerCase();
    const sName = (activeStud.name || activeStud.studentName || '').toLowerCase();

    try {
      setLoading(true);

      const [
        studentRes,
        marksRes,
        attendanceRes,
        jobsRes,
        appsRes,
        intRes,
        selRes
      ] = await Promise.all([
        getStudentById(sId).catch(() => ({ data: activeStud })),
        getMarksByStudent(sId).catch(() => ({ data: [] })),
        getAttendanceByStudent(sId).catch(() => ({ data: [] })),
        getPlacementJobs().catch(() => ({ data: [] })),
        getPlacementApplications().catch(() => ({ data: [] })),
        getPlacementInterviews().catch(() => ({ data: [] })),
        getPlacementSelections().catch(() => ({ data: [] }))
      ]);

      const dbStudent = studentRes?.data || activeStud;

      // 1. Compute Live Attendance Rate
      const apiAtt = Array.isArray(attendanceRes?.data) ? attendanceRes.data : [];
      let localAtt = [];
      try {
        const rawAtt = localStorage.getItem(`erp_attendance_${tenantId}`) || localStorage.getItem('erp_attendance');
        if (rawAtt) localAtt = JSON.parse(rawAtt);
      } catch {}
      const combinedAtt = [...apiAtt, ...localAtt].filter(r => 
        String(r.studentId || '').toLowerCase() === sRoll || 
        String(r.studentName || '').toLowerCase() === sName
      );

      let computedAttendance = 100;
      if (combinedAtt.length > 0) {
        const presents = combinedAtt.filter(r => ['Present', 'Late'].includes(r.status)).length;
        computedAttendance = Math.round((presents / combinedAtt.length) * 100);
      } else if (dbStudent.attendance !== undefined && dbStudent.attendance !== null) {
        const parsed = parseInt(String(dbStudent.attendance).replace('%', '').trim());
        computedAttendance = isNaN(parsed) ? 100 : parsed;
      }

      // 2. Compute Live CGPA & Active Arrears
      const apiMarks = Array.isArray(marksRes?.data) ? marksRes.data : (marksRes?.data?.marks || []);
      let localMarks = [];
      try {
        const rawM = localStorage.getItem(`erp_marks_${tenantId}`) || localStorage.getItem('erp_marks');
        if (rawM) localMarks = JSON.parse(rawM);
      } catch {}

      // Also check submissions for approved marks
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

      const allMarks = [...apiMarks, ...localMarks].filter(m => {
        const mId = String(m.studentId || m._id || m.id || '').trim().toLowerCase();
        const mRoll = String(m.registerNo || m.rollNo || '').trim().toLowerCase();
        const mName = String(m.studentName || m.name || '').trim().toLowerCase();
        return (mId && sRoll && mId === sRoll) || (mRoll && sRoll && mRoll === sRoll) || (mName && sName && (mName === sName || mName.includes(sName)));
      });

      let computedCgpa = Number(dbStudent.cgpa || activeStud.cgpa || 0);
      let computedArrears = Number(dbStudent.arrears || activeStud.arrears || 0);

      if (allMarks.length > 0) {
        const validGpas = allMarks.map(m => {
          const tot = Number(m.totalMarks ?? (Number(m.internalMarks || 0) + Number(m.semesterMarks || 0)) ?? m.marksObtained ?? 0);
          return Number(m.cgpa || m.gpa || (tot > 0 ? (tot / 10).toFixed(2) : 0));
        }).filter(g => g > 0);

        if (validGpas.length > 0 && computedCgpa === 0) {
          computedCgpa = Number((validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2));
        }

        const arrearsCount = allMarks.filter(m => {
          const tot = Number(m.totalMarks ?? (Number(m.internalMarks || 0) + Number(m.semesterMarks || 0)) ?? m.marksObtained ?? 0);
          return m.arrearStatus === 'Arrear' || (m.totalMarks !== undefined && tot < 40);
        }).length;
        computedArrears = arrearsCount;
      }

      // Default baseline if newly enrolled student
      if (computedCgpa === 0 && (!allMarks || allMarks.length === 0)) {
        computedCgpa = Number(dbStudent.cgpa || activeStud.cgpa || 0);
      }

      setStudentDetails({
        ...dbStudent,
        id: dbStudent.id || dbStudent.rollNo || sId,
        referenceId: sId,
        name: dbStudent.name || activeStud.name || 'Student',
        dept: dbStudent.dept || dbStudent.department || activeStud.dept || activeStud.department || 'General',
        cgpa: computedCgpa,
        arrears: computedArrears,
        attendance: computedAttendance
      });

      // 3. Jobs / Drives
      const rawJobs = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.jobs || []);
      setJobs(rawJobs);

      // 4. Applications for this student
      const rawApps = Array.isArray(appsRes.data) ? appsRes.data : (appsRes.data?.applications || []);
      const myApps = rawApps.filter(app => 
        (app.studentId && (app.studentId._id === dbStudent._id || app.studentId === dbStudent._id || app.studentId === sId)) || 
        String(app.regNo || '').toLowerCase() === sRoll ||
        String(app.student || '').toLowerCase() === sName
      );
      setApplications(myApps);

      // 5. Interviews
      const rawInt = Array.isArray(intRes.data) ? intRes.data : (intRes.data?.interviews || []);
      setInterviews(rawInt);

      // 6. Selections / Offers
      const rawSel = Array.isArray(selRes.data) ? selRes.data : (selRes.data?.selections || []);
      const mySelections = rawSel.filter(s => 
        String(s.regNo || '').toLowerCase() === sRoll || 
        String(s.studentName || '').toLowerCase() === sName
      );
      setSelections(mySelections);

    } catch (err) {
      console.error('Error loading student placement data:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchPlacementData();

    const handlePlacementUpdate = () => {
      console.log('⚡ Student Placement data updated - refreshing in real time');
      fetchPlacementData();
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
  }, [fetchPlacementData]);

  const handleApply = async (job) => {
    if (!window.confirm(`Confirm your application for ${job.role} at ${job.company}?`)) return;
    
    setSubmitting(true);
    try {
      const payload = {
        studentId: studentDetails._id || studentDetails.id,
        student: studentDetails.name,
        regNo: studentDetails.id || studentDetails.rollNo || studentDetails.referenceId,
        dept: studentDetails.dept,
        cgpa: studentDetails.cgpa || 0,
        company: job.company,
        role: job.role,
        status: 'Applied',
        appliedAt: new Date().toISOString()
      };
      
      const res = await applyForPlacement(payload);
      const newApp = res.data || payload;
      setApplications(prev => [...prev, newApp]);
      
      // Dispatch real-time event so HOD & Staff dashboards update immediately
      window.dispatchEvent(new CustomEvent('erp_placement_updated', { detail: newApp }));
      
      showToast(`✓ Successfully applied for ${job.company} (${job.role})!`);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  // Academic Criteria Evaluation
  const criteria = {
    cgpa: { required: 6.0, current: studentDetails.cgpa || 0, met: (studentDetails.cgpa || 0) >= 6.0 },
    arrears: { required: 0, current: studentDetails.arrears || 0, met: (studentDetails.arrears || 0) === 0 },
    attendance: { required: 75, current: studentDetails.attendance || 0, met: (studentDetails.attendance || 0) >= 75 },
    department: { dept: studentDetails.dept, met: true }
  };

  const isGloballyEligible = criteria.cgpa.met && criteria.arrears.met && criteria.attendance.met;

  // Filtered jobs
  const filteredJobs = jobs.filter(j => 
    (j.company || '').toLowerCase().includes(search.toLowerCase()) || 
    (j.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const appliedCount = applications.length;
  const shortlistedCount = applications.filter(a => ['Shortlisted', 'Selected'].includes(a.status)).length;
  const offersCount = selections.length;

  return (
    <div className="student-marks-page animate-fade-in" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => navigate('/student/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}
          >
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Campus Placements & Corporate Recruitment
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Live job opportunities, eligibility evaluation, company applications, and interview schedules.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            type="button"
            onClick={() => fetchPlacementData()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Drives
          </button>
        </div>
      </div>

      {/* ── Overall Placement Status Banner ── */}
      <div 
        style={{ 
          background: isGloballyEligible ? 'linear-gradient(135deg, rgba(22, 163, 74, 0.08), rgba(22, 163, 74, 0.02))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))', 
          border: `1px solid ${isGloballyEligible ? '#bbf7d0' : '#fecaca'}`, 
          borderRadius: '14px', 
          padding: '18px 22px', 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isGloballyEligible ? '#dcfce7' : '#fee2e2', color: isGloballyEligible ? '#15803d' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
          {isGloballyEligible ? <CheckCircle size={26} /> : <XCircle size={26} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Overall Placement Status:
            </h2>
            <span style={{ 
              fontSize: '0.95rem', 
              fontWeight: 800, 
              color: isGloballyEligible ? '#15803d' : '#dc2626',
              background: isGloballyEligible ? '#dcfce7' : '#fee2e2',
              padding: '2px 10px',
              borderRadius: '6px'
            }}>
              {isGloballyEligible ? 'Eligible for Campus Recruitment ✓' : 'Criteria Pending / Verification Required'}
            </span>
          </div>

          <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            {isGloballyEligible 
              ? `You meet the general academic eligibility criteria with CGPA ${studentDetails.cgpa}, ${studentDetails.attendance}% attendance, and zero active arrears.`
              : 'You can still view upcoming recruitment drives and evaluate company-specific eligibility requirements below.'
            }
          </p>

          {!isGloballyEligible && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 600 }}>
              {!criteria.cgpa.met && <span style={{ color: '#dc2626' }}>• Current CGPA ({criteria.cgpa.current}) below benchmark {criteria.cgpa.required.toFixed(1)}</span>}
              {!criteria.arrears.met && <span style={{ color: '#dc2626' }}>• Active Arrears: {criteria.arrears.current}</span>}
              {!criteria.attendance.met && <span style={{ color: '#dc2626' }}>• Attendance ({criteria.attendance.current}%) below 75%</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── 4-Card Executive KPI Metrics Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* KPI 1: Live CGPA */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bfdbfe', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Academic CGPA</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1d4ed8', marginTop: '6px' }}>
            {studentDetails.cgpa ?? '0.0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            {studentDetails.arrears === 0 ? 'Zero Active Arrears' : `${studentDetails.arrears} Active Arrears`}
          </div>
        </div>

        {/* KPI 2: Active Drives */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Campus Drives</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {jobs.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            Open Recruitment Drives
          </div>
        </div>

        {/* KPI 3: Applications Submitted */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #ddd6fe', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Applied Drives</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            {appliedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
            {shortlistedCount > 0 ? `${shortlistedCount} Shortlisted` : 'Submitted to Placement Cell'}
          </div>
        </div>

        {/* KPI 4: Job Offers */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Verified Offers</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(217,119,6,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            {offersCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px', fontWeight: 600 }}>
            Official Corporate Offers
          </div>
        </div>

      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '2px solid var(--border-color, #e2e8f0)', paddingBottom: '2px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { key: 'drives', label: '🏢 Campus Recruitment Drives' },
            { key: 'applications', label: `📝 My Applications (${applications.length})` },
            { key: 'interviews', label: `📅 Interview Schedule (${interviews.length})` },
            { key: 'eligibility', label: '🎓 Academic Eligibility Breakdown' }
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

        {tab === 'drives' && (
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search company or role..." 
              style={{ padding: '7px 12px 7px 34px', borderRadius: 8, border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', fontSize: '0.82rem', width: '100%', outline: 'none' }} 
            />
          </div>
        )}
      </div>

      {/* ── TAB 1: Campus Recruitment Drives ── */}
      {tab === 'drives' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredJobs.map((job, idx) => {
            const minCgpa = Number(job.minCgpa ?? 0);
            const maxArrears = Number(job.maxArrears ?? 0);
            const studentCgpa = Number(studentDetails.cgpa ?? 0);
            const studentArrears = Number(studentDetails.arrears ?? 0);

            const isCgpaOk = minCgpa === 0 || studentCgpa >= minCgpa;
            const isArrearsOk = studentArrears <= maxArrears;
            const isEligibleForThisJob = isCgpaOk && isArrearsOk;

            const existingApp = applications.find(a => 
              (a.company || '').toLowerCase() === (job.company || '').toLowerCase() &&
              (a.role || '').toLowerCase() === (job.role || '').toLowerCase()
            );
            const hasApplied = Boolean(existingApp);

            return (
              <div 
                key={job._id || job.id || idx}
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb' }}>
                      {job.ctc || 'Not Disclosed'}
                    </span>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      background: isEligibleForThisJob ? '#dcfce7' : '#fee2e2', 
                      color: isEligibleForThisJob ? '#15803d' : '#991b1b' 
                    }}>
                      {isEligibleForThisJob ? '✓ Eligible to Apply' : `Min CGPA: ${minCgpa}`}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
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

                <div style={{ borderTop: '1px solid var(--border-color, #f1f5f9)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748b)' }}>
                    <div>Min CGPA: <strong>{minCgpa > 0 ? minCgpa : 'Any'}</strong></div>
                    <div style={{ fontSize: '0.72rem' }}>Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open'}</div>
                  </div>

                  {hasApplied ? (
                    <span style={{ 
                      padding: '6px 14px', 
                      borderRadius: '8px', 
                      fontSize: '0.8rem', 
                      fontWeight: 700,
                      background: existingApp.status === 'Selected' ? '#dcfce7' : 
                                  existingApp.status === 'Shortlisted' ? '#fef3c7' : '#eff6ff',
                      color: existingApp.status === 'Selected' ? '#15803d' : 
                             existingApp.status === 'Shortlisted' ? '#b45309' : '#2563eb',
                      border: '1px solid var(--border-color, #e2e8f0)'
                    }}>
                      ✓ {existingApp.status || 'Applied'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApply(job)}
                      disabled={submitting}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        background: '#2563eb',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        border: 'none',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.7 : 1
                      }}
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '3.5rem', textAlign: 'center', background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
              <Building size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No Active Recruitment Drives</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>New corporate placement drives will appear here once published by the Placement Officer.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: My Applications ── */}
      {tab === 'applications' && (
        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Submitted Applications Status Tracking
            </h3>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb' }}>
              {applications.length} Submitted
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                  <th style={{ padding: '12px 18px', textAlign: 'left' }}>Company</th>
                  <th style={{ padding: '12px 18px', textAlign: 'left' }}>Job Designation</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Registered Reg No</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Application Date</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => (
                  <tr key={app._id || app.applicationId || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#2563eb' }}>{app.company}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>{app.role}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{app.regNo || studentDetails.id}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Active'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.78rem', 
                        fontWeight: 700,
                        background: app.status === 'Selected' ? '#dcfce7' : 
                                    app.status === 'Shortlisted' ? '#fef3c7' : 
                                    app.status === 'Rejected' ? '#fee2e2' : '#eff6ff',
                        color: app.status === 'Selected' ? '#15803d' : 
                               app.status === 'Shortlisted' ? '#b45309' : 
                               app.status === 'Rejected' ? '#dc2626' : '#2563eb',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {app.status === 'Selected' ? '✓ Selected / Offer' : (app.status || 'Applied')}
                      </span>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #64748b)' }}>
                      You have not applied for any campus placement drives yet. Browse the active recruitment drives tab to submit applications.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: Interview Schedule ── */}
      {tab === 'interviews' && (
        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Scheduled Interview Rounds & Assessments
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                  <th style={{ padding: '12px 18px', textAlign: 'left' }}>Company</th>
                  <th style={{ padding: '12px 18px', textAlign: 'left' }}>Interview Round</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Date & Timing</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Mode / Venue</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((i, idx) => (
                  <tr key={i._id || i.interviewId || idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#2563eb' }}>{i.company}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 600 }}>{i.round}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      {i.date ? new Date(i.date).toLocaleDateString() : 'TBA'} {i.time ? `• ${i.time}` : ''}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: i.mode === 'Online' ? '#eff6ff' : '#f1f5f9', color: i.mode === 'Online' ? '#2563eb' : '#475569', fontWeight: 700, fontSize: '0.75rem' }}>
                        {i.mode || i.venue || 'Auditorium'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}>
                        Scheduled
                      </span>
                    </td>
                  </tr>
                ))}
                {interviews.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #64748b)' }}>
                      No interview rounds scheduled yet for your applications.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: Academic Eligibility Matrix ── */}
      {tab === 'eligibility' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          <div style={{ background: 'var(--bg-card, #ffffff)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Core Academic Clearance Breakdown
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Cumulative CGPA</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Benchmark: 6.0 | Recorded: {studentDetails.cgpa ?? '0.0'}</div>
                </div>
                <div>
                  {criteria.cgpa.met ? (
                    <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.85rem' }}>✓ Cleared</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.85rem' }}>Pending ({studentDetails.cgpa})</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Active Standing Arrears</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Allowed: 0 | Current: {studentDetails.arrears ?? 0}</div>
                </div>
                <div>
                  {criteria.arrears.met ? (
                    <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.85rem' }}>✓ Zero Arrears</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.85rem' }}>{studentDetails.arrears} Arrears</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Classroom Attendance Rate</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required: 75% | Live Rate: {studentDetails.attendance}%</div>
                </div>
                <div>
                  {criteria.attendance.met ? (
                    <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.85rem' }}>✓ {studentDetails.attendance}% Met</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.85rem' }}>{studentDetails.attendance}% Shortage</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Department Enrolled</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enrolled Discipline: {studentDetails.dept}</div>
                </div>
                <div>
                  <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.85rem' }}>✓ Verified</span>
                </div>
              </div>

            </div>
          </div>

          <div style={{ background: 'var(--bg-card, #ffffff)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Placement Cell Guidelines
              </h3>
              <ul style={{ margin: '12px 0 0 18px', padding: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.6' }}>
                <li>Ensure resume and portfolio links in your profile are up to date.</li>
                <li>Attend all pre-placement training modules and mock aptitude tests.</li>
                <li>Companies may have custom cutoff criteria (e.g. CGPA ≥ 7.0 or specific degree).</li>
                <li>Offers are finalized once confirmed by the corporate recruiter.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => navigate('/student/marks')}
              style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              View Full Semester Marks Sheet →
            </button>
          </div>

        </div>
      )}

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
};

export default StudentPlacements;
