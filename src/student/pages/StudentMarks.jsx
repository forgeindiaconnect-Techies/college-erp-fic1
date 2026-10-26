import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, AlertTriangle, ArrowLeft, Percent, GraduationCap, Award, CheckCircle,
  CheckCircle2, FileText, Send, Printer, X, ShieldCheck, Clock, RefreshCw, CreditCard
} from 'lucide-react';
import {
  getStudentById,
  getMarksByStudent,
  getSubjects,
  getExams
} from '../../api/index';
import './StudentMarks.css';

const normalizeSem = (semStr) => {
  if (!semStr) return 'Semester 1';
  const num = String(semStr).replace(/\D/g, '');
  return num ? `Semester ${num}` : String(semStr);
};

const getGradeLetter = (cgpa) => {
  const c = Number(cgpa);
  if (c >= 9.0) return 'O';
  if (c >= 8.0) return 'A+';
  if (c >= 7.0) return 'A';
  if (c >= 6.0) return 'B+';
  if (c >= 5.0) return 'B';
  return 'RA';
};

const getCgpaColor = (score) => {
  const num = Number(score);
  return num >= 8.0
    ? 'var(--success)'
    : num >= 6.0
      ? 'var(--primary)'
      : num >= 5.0
        ? 'var(--warning)'
        : 'var(--danger)';
};

const ALL_SEMESTERS = [
  'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
  'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
];

const getSubjectMetrics = (record) => {
  const c1 = Number(record.cia1 || 0);
  const c2 = Number(record.cia2 || 0);
  const c3 = Number(record.cia3 || 0);
  const internal = Number(record.internalMarks !== undefined ? record.internalMarks : ((c1 || c2 || c3) ? Math.round((c1 + c2 + c3) / 3) : 0));
  const external = Number(record.semesterMarks !== undefined ? record.semesterMarks : 0);
  const hasSemesterExam = (record.semesterMarks !== undefined && Number(record.semesterMarks) > 0) || record.submissionType === 'semester';

  // In semester examination systems: Total (100) = Internal (25) + Semester Exam (75)
  // When semester exam is present, the true total is internal + external
  let total;
  let maximum;
  if (hasSemesterExam) {
    total = internal + external;
    maximum = 100;
  } else {
    total = Number(record.totalMarks ?? internal ?? record.marksObtained ?? 0);
    maximum = Number(record.maxMarks || (record.submissionType === 'cia' ? 25 : 100));
  }

  const percentage = maximum > 0 ? Number(((total / maximum) * 100).toFixed(1)) : 0;

  // Passing criteria:
  // If semester exam is present: total >= 40 AND external >= 30
  // If pure internal / CIA: percentage >= 40% (e.g. >= 10 out of 25)
  let isPass;
  if (hasSemesterExam) {
    isPass = total >= 40 && (external === 0 || external >= 30);
  } else {
    isPass = maximum > 0 ? (total / maximum) >= 0.4 : total >= 40;
  }

  const normalized100 = maximum === 100 ? total : (maximum > 0 ? (total / maximum) * 100 : total);
  const cg = Number(record.cgpa || record.gpa || (normalized100 / 10).toFixed(2));
  const grade = record.grade || getGradeLetter(cg);

  return {
    internal,
    external,
    total,
    maximum,
    percentage,
    gpa: cg,
    grade,
    isPass,
    hasSemesterExam
  };
};

const StudentMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [marksRecord, setMarksRecord] = useState(null);
  const [reappearModalItem, setReappearModalItem] = useState(null);
  const [reappearAppType, setReappearAppType] = useState('reappear');
  const [reappearSuccessSlip, setReappearSuccessSlip] = useState(null);
  const [appliedArrears, setAppliedArrears] = useState([]);

  useEffect(() => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const raw = localStorage.getItem(`erp_arrear_applications_${tenantId}`) || localStorage.getItem('erp_arrear_applications');
    if (raw) {
      try {
        setAppliedArrears(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  const handleSubmitReappearance = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!reappearModalItem) return;

    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const appRef = `APP-ARR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fee = reappearAppType === 'revaluation' ? 750 : 500;

    const newApp = {
      appId: appRef,
      code: reappearModalItem.code,
      name: reappearModalItem.name,
      semester: reappearModalItem.semester,
      examSession: 'Nov / Dec 2026 Autonomous End-Semester Examination',
      type: reappearAppType === 'revaluation' ? 'Answer Script Revaluation & Re-totalling' : 'Arrear Re-Appearance (Supplementary Exam)',
      fee: fee,
      appliedAt: new Date().toISOString(),
      studentName: studentDetails?.name || studentSession?.name || 'Student',
      registerNo: studentDetails?.rollNo || studentDetails?.admissionNumber || studentSession?.rollNo || studentSession?.admissionNumber || 'TAM2026-001',
      department: studentDetails?.department || studentSession?.department || 'TAMIL',
      degree: studentDetails?.course || studentSession?.course || 'Undergraduate (UG)',
      status: 'Registration Confirmed / Hall Ticket Scheduled',
      ciaRetained: `${reappearModalItem.internal || 15} / 25`
    };

    const updated = [newApp, ...appliedArrears.filter(a => a.code !== reappearModalItem.code)];
    setAppliedArrears(updated);

    localStorage.setItem(`erp_arrear_applications_${tenantId}`, JSON.stringify(updated));
    localStorage.setItem('erp_arrear_applications', JSON.stringify(updated));

    // Register real academic notification
    try {
      const notifKey = `erp_notifications_${tenantId}`;
      const notifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
      notifs.unshift({
        _id: `notif_${Date.now()}`,
        title: 'Arrear Re-Appearance Registered 📝',
        message: `Your re-appearance registration for ${reappearModalItem.code} - ${reappearModalItem.name} in Nov/Dec 2026 session has been confirmed. Ref: ${appRef}`,
        type: 'Academic',
        target: 'Students',
        date: new Date().toISOString(),
        read: false
      });
      localStorage.setItem(notifKey, JSON.stringify(notifs));
      window.dispatchEvent(new Event('erp_notification_updated'));
    } catch (err) {}

    window.dispatchEvent(new Event('erp_arrear_applied'));
    setReappearModalItem(null);
    setReappearSuccessSlip(newApp);
  };

  const loadMarksData = async () => {
    try {
      setLoading(true);
      const session = sessionStorage.getItem('student_session') || localStorage.getItem('student_session');

      if (!session) {
        navigate('/student/login');
        return;
      }

      const activeStudent = JSON.parse(session);
      setStudentSession(activeStudent);
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';

      const sessionId =
        activeStudent.referenceId ||
        activeStudent.id ||
        activeStudent._id;

      const studentRoll =
        activeStudent.rollNo ||
        activeStudent.registerNo ||
        activeStudent.rollNumber ||
        '';

      const studentName =
        activeStudent.name ||
        activeStudent.studentName ||
        '';

      const studentResponse = await getStudentById(sessionId).catch(() => ({ data: activeStudent }));
      const student = studentResponse.data || activeStudent;

      const studentId =
        student.id ||
        student._id ||
        activeStudent.referenceId ||
        activeStudent.id;

      const [marksResponse, subjectsResponse, examsResponse] =
        await Promise.all([
          getMarksByStudent(studentId).catch(() => ({ data: [] })),
          getSubjects({
            department: student.dept || student.department
          }).catch(() => ({ data: [] })),
          getExams().catch(() => ({ data: [] }))
        ]);

      const backendMarks = Array.isArray(marksResponse?.data)
        ? marksResponse.data
        : (marksResponse?.data?.marks || []);

      const subjectData = subjectsResponse?.data;
      const subjects = Array.isArray(subjectData)
        ? subjectData
        : subjectData?.subjects || subjectData?.data || [];

      const examData = Array.isArray(examsResponse?.data)
        ? examsResponse.data
        : examsResponse?.data?.exams || examsResponse?.data?.data || [];

      // Multi-source LocalStorage fallbacks
      let localMarks = [];
      try {
        const raw = localStorage.getItem(`erp_marks_${tenantId}`) || localStorage.getItem('erp_marks');
        if (raw) localMarks = JSON.parse(raw);
      } catch (e) {}

      // Extract records from published / approved batches
      try {
        const rawSubs = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
        if (rawSubs) {
          const subs = JSON.parse(rawSubs);
          subs.forEach(batch => {
            if (batch.records && Array.isArray(batch.records)) {
              batch.records.forEach(r => {
                localMarks.push({
                  ...r,
                  resultStatus: batch.status || r.resultStatus,
                  status: batch.status || r.status,
                  examType: batch.examType || r.examType
                });
              });
            }
          });
        }
      } catch (e) {}

      // Merge and associate subject details
      const allCandidates = [...backendMarks, ...localMarks];

      const studentMarksRaw = allCandidates.filter(m => {
        const mId = String(m.studentId || m._id || m.id || '').trim();
        const mRoll = String(m.registerNo || m.rollNo || m.rollNumber || '').trim().toLowerCase();
        const mName = String(m.studentName || m.name || '').trim().toLowerCase();
        const sRoll = String(studentRoll || student.rollNo || student.registerNo || '').trim().toLowerCase();
        const sName = String(studentName || student.name || '').trim().toLowerCase();
        const sId = String(studentId || '').trim();

        if (mId && sId && mId === sId) return true;
        if (mRoll && sRoll && mRoll === sRoll) return true;
        if (mName && sName && (mName === sName || mName.includes(sName) || sName.includes(mName))) return true;
        return false;
      });

      // Deduplicate by Subject and Semester
      const deduplicatedMarks = [];
      studentMarksRaw.forEach(m => {
        const mSem = normalizeSem(m.semester);
        const mSub = String(m.subject || '').trim().toLowerCase();
        const existingIdx = deduplicatedMarks.findIndex(d => 
          normalizeSem(d.semester) === mSem && String(d.subject || '').trim().toLowerCase() === mSub
        );
        if (existingIdx >= 0) {
          const prev = deduplicatedMarks[existingIdx];
          const intMarks = Number(m.internalMarks ?? prev.internalMarks ?? 0);
          const semMarks = Number(m.semesterMarks ?? prev.semesterMarks ?? 0);
          const hasSem = (m.semesterMarks !== undefined && Number(m.semesterMarks) > 0) || (prev.semesterMarks !== undefined && Number(prev.semesterMarks) > 0);
          const tot100 = hasSem ? (intMarks + semMarks) : Number(m.totalMarks ?? prev.totalMarks ?? (intMarks + semMarks));

          deduplicatedMarks[existingIdx] = {
            ...prev,
            ...m,
            internalMarks: intMarks || prev.internalMarks || m.internalMarks,
            semesterMarks: semMarks || prev.semesterMarks || m.semesterMarks,
            totalMarks: tot100,
            maxMarks: hasSem ? 100 : (m.maxMarks || prev.maxMarks || 100),
            examType: hasSem ? 'End-Semester Results' : (m.examType || prev.examType || 'Continuous Internal Assessment (CIA)')
          };
        } else {
          deduplicatedMarks.push(m);
        }
      });

      const finalRecords = deduplicatedMarks.map(mark => {
        const matchedSubject = subjects.find(subject =>
          String(subject.name || subject.subjectName || '').trim().toLowerCase() ===
          String(mark.subject || '').trim().toLowerCase()
        );

        return {
          ...mark,
          subjectCode:
            mark.subjectCode ||
            matchedSubject?.code ||
            matchedSubject?.subjectCode ||
            `${String(mark.subject || 'SUB').slice(0, 4).toUpperCase()}401`,
          examName:
            mark.examName ||
            mark.examId?.name ||
            examData.find(
              exam => String(exam._id || exam.id) === String(mark.examId?._id || mark.examId)
            )?.name ||
            (mark.submissionType === 'semester' ? 'End-Semester Results' : 'Continuous Internal Assessment (CIA)')
        };
      });

      setStudentDetails(student);

      const semestersWithMarks = [
        ...new Set(finalRecords.map(record => normalizeSem(record.semester)).filter(Boolean))
      ];

      const latestSemWithMarks = semestersWithMarks.length > 0
        ? semestersWithMarks[semestersWithMarks.length - 1]
        : null;

      const activeSemester =
        latestSemWithMarks ||
        normalizeSem(student.sem || student.semester) ||
        'Semester 4';

      setMarksRecord(prev => ({
        id: studentId,
        name: student.name || studentName,
        dept: student.dept || student.department || 'Computer Science Engineering',
        activeSemView: prev?.activeSemView || activeSemester,
        availableSemesters: semestersWithMarks.length > 0 ? semestersWithMarks : [activeSemester],
        allRawRecords: finalRecords
      }));
    } catch (err) {
      console.error('Failed to load student marks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarksData();

    // Listen to real-time mark updates from faculty & HOD
    const handleSync = () => {
      loadMarksData();
    };

    window.addEventListener('erp_marks_updated', handleSync);
    window.addEventListener('erp_marks_submitted', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('erp_marks_updated', handleSync);
      window.removeEventListener('erp_marks_submitted', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [navigate]);

  if (loading || !marksRecord || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  const currentViewSem = marksRecord.activeSemView || 'Semester 4';

  const selectedSemRecords = marksRecord.allRawRecords.filter(record =>
    normalizeSem(record.semester) === normalizeSem(currentViewSem)
  );

  const allArrearRecords = marksRecord.allRawRecords.filter(record => {
    return record.arrearStatus === 'Arrear' || !getSubjectMetrics(record).isPass;
  });

  const totalCumulativeArrears = allArrearRecords.length;

  const detailedArrearList = allArrearRecords.map(record => {
    const metrics = getSubjectMetrics(record);
    return {
      code: record.subjectCode || record.code || `${String(record.subject || 'SUB').slice(0, 4).toUpperCase()}401`,
      name: record.subject || 'Subject',
      semester: normalizeSem(record.semester),
      examName: record.examName || (metrics.hasSemesterExam ? 'End-Semester Exam' : 'Continuous Internal Assessment (CIA)'),
      internal: metrics.internal,
      external: metrics.external,
      total: metrics.total,
      maximum: metrics.maximum,
      percentage: metrics.percentage,
      grade: metrics.grade,
      status: 'RA (Standing Arrear)'
    };
  });

  const totalArrears = totalCumulativeArrears;

  const validGpas = selectedSemRecords
    .map(record => {
      const tot = getSubjectMetrics(record).total;
      return Number(record.cgpa || record.gpa || (tot / 10).toFixed(2));
    })
    .filter(gpa => Number.isFinite(gpa) && gpa > 0);

  const currentGpa = validGpas.length
    ? Number((validGpas.reduce((sum, gpa) => sum + gpa, 0) / validGpas.length).toFixed(2))
    : 0;

  const allValidGpas = marksRecord.allRawRecords
    .map(record => {
      const tot = getSubjectMetrics(record).total;
      return Number(record.cgpa || record.gpa || (tot / 10).toFixed(2));
    })
    .filter(gpa => Number.isFinite(gpa) && gpa > 0);

  const cumulativeCgpa = allValidGpas.length
    ? Number((allValidGpas.reduce((sum, gpa) => sum + gpa, 0) / allValidGpas.length).toFixed(2))
    : (currentGpa || Number(studentDetails.cgpa) || 0);

  const coursesList = selectedSemRecords.map((record, idx) => {
    const c1 = Number(record.cia1 || 0);
    const c2 = Number(record.cia2 || 0);
    const c3 = Number(record.cia3 || 0);
    const internal = Number(record.internalMarks !== undefined ? record.internalMarks : ((c1 || c2 || c3) ? Math.round((c1 + c2 + c3) / 3) : 0));
    const external = Number(record.semesterMarks !== undefined ? record.semesterMarks : 0);
    const { total: calcTotal, maximum: calcMax, percentage: calcPct, gpa: calcGpa, grade: calcGrade, isPass: calcPass, hasSemesterExam } = getSubjectMetrics(record);
    const total = calcTotal;
    const maximum = calcMax;
    const percentage = maximum > 0
      ? Number(((total / maximum) * 100).toFixed(1))
      : 0;
    const cg = Number(record.cgpa || record.gpa || (total / 10).toFixed(2));
    const grade = record.grade || getGradeLetter(cg);
    const isPass = (record.arrearStatus !== 'Arrear') && calcPass;

    return {
      code: record.subjectCode || record.code || `${String(record.subject || 'SUB').slice(0, 4).toUpperCase()}401`,
      name: record.subject || 'Subject',
      examName: record.examName || (hasSemesterExam || record.submissionType === 'semester' ? 'End-Semester Exam' : 'Continuous Internal Assessment (CIA)'),
      internal,
      external,
      total,
      maximum,
      percentage,
      gpa: cg,
      grade,
      status: isPass ? 'Pass' : 'RA'
    };
  });

  const consolidatedResults = selectedSemRecords.map(record => {
    const c1 = Number(record.cia1 || 0);
    const c2 = Number(record.cia2 || 0);
    const c3 = Number(record.cia3 || 0);
    const internalMark = Number(record.internalMarks !== undefined ? record.internalMarks : ((c1 || c2 || c3) ? Math.round((c1 + c2 + c3) / 3) : 0));
    const externalMark = Number(record.semesterMarks !== undefined ? record.semesterMarks : 0);
    const { total: calcTotal, gpa: calcGpa, grade: calcGrade, isPass: calcPass } = getSubjectMetrics(record);
    const total = calcTotal;
    const cg = Number(record.cgpa || record.gpa || (total / 10).toFixed(2));
    const grade = record.grade || getGradeLetter(cg);
    const isPass = (record.arrearStatus !== 'Arrear') && calcPass;

    return {
      code: record.subjectCode || record.code || `${String(record.subject || 'SUB').slice(0, 4).toUpperCase()}401`,
      subject: record.subject || 'Subject',
      internalMark,
      externalMark,
      total,
      gpa: cg,
      grade,
      status: isPass ? 'Pass' : 'RA'
    };
  });

  return (
    <div className="student-marks-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          <div>
            <h1>Semester Grade Card</h1>
            <p className="text-muted">Review internal assessments, end-semester grades, and CGPA trends.</p>
          </div>
        </div>
      </div>

      {/* Aggregate Header Grid */}
      <div className="marks-hero-summary-grid">
        <div className="glass-card summary-grade-card">
          <Award size={24} className="icon-s teal" />
          <div>
            <p className="summary-label">CUMULATIVE CGPA</p>
            <h2 style={{ color: getCgpaColor(cumulativeCgpa) }}>{cumulativeCgpa}</h2>
          </div>
        </div>

        <div className="glass-card summary-grade-card">
          <GraduationCap size={24} className="icon-s blue" />
          <div>
            <p className="summary-label">CURRENT GPA</p>
            <h2 style={{ color: getCgpaColor(currentGpa) }}>{currentGpa}</h2>
          </div>
        </div>

        <div className="glass-card summary-grade-card" style={totalCumulativeArrears > 0 ? { borderColor: 'rgba(239, 68, 68, 0.4)', background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)' } : {}}>
          <AlertTriangle size={24} className="icon-s red" />
          <div>
            <p className="summary-label">ACTIVE STANDING ARREARS</p>
            <h2 className={totalCumulativeArrears > 0 ? 'text-danger' : 'text-success'}>
              {totalCumulativeArrears}
            </h2>
            <span style={{ fontSize: '0.74rem', color: totalCumulativeArrears > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
              {totalCumulativeArrears > 0 ? `${totalCumulativeArrears} standing arrears across all semesters` : '✓ All papers cleared (Zero arrears)'}
            </span>
          </div>
        </div>
      </div>

      {/* ── DEDICATED ARREAR SUBJECTS BREAKDOWN TABLE (When Arrears Exist) ── */}
      {totalCumulativeArrears > 0 && (
        <div className="glass-card" style={{ marginBottom: '24px', border: '1.5px solid #fecaca', borderRadius: '14px', background: '#ffffff', overflow: 'hidden', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)' }}>
          <div style={{ padding: '16px 20px', background: '#fef2f2', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#991b1b' }}>
                  Active Standing Arrears Breakdown ({totalCumulativeArrears} Subjects)
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>
                  The following subjects have Arrear / Re-Appear (RA) status and require clearance.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fca5a5' }}>
                Action Required
              </span>
              <button
                type="button"
                onClick={() => {
                  setReappearModalItem(detailedArrearList[0]);
                  setReappearAppType('reappear');
                  setReappearSuccessSlip(null);
                }}
                style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(220,38,38,0.2)' }}
              >
                <Send size={13} /> Apply for Re-Appearance Exam
              </button>
            </div>
          </div>

          <div className="table-container-s" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#fcfcfc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Subject Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Subject Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Appeared In</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Internal (CIA)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>External Exam</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Score</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Grade</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Result Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {detailedArrearList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      <span className="register-no-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
                        {item.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {item.name}
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{item.examName}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                        {item.semester}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {item.internal}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>
                      {item.external}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#dc2626' }}>
                      {item.total} / {item.maximum}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#dc2626' }}>
                      {item.grade || 'RA'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const isApplied = appliedArrears.find(a => a.code === item.code);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            {isApplied ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                                  ✓ Re-Appear Registered
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReappearSuccessSlip(isApplied)}
                                  style={{ padding: '5px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                                  title="View official acknowledgment slip"
                                >
                                  Slip
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReappearModalItem(item);
                                  setReappearAppType('reappear');
                                  setReappearSuccessSlip(null);
                                }}
                                style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Register to re-appear for this arrear paper in the upcoming examination"
                              >
                                <Send size={12} /> Apply Re-Appear
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setMarksRecord({ ...marksRecord, activeSemView: item.semester })}
                              style={{ padding: '5px 10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              View {item.semester}
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade Table */}
      <div className="glass-card table-section-card-s">
        <div className="table-header-row-s" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Registered Courses Score Sheet</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Viewing examination scorecard for <strong>{currentViewSem}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>SELECT SEMESTER:</label>
            <select 
              value={currentViewSem} 
              onChange={(e) => setMarksRecord({ ...marksRecord, activeSemView: e.target.value })}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600, outline: 'none' }}
            >
              {ALL_SEMESTERS.map(sem => {
                const countInSem = marksRecord.allRawRecords.filter(r => normalizeSem(r.semester) === normalizeSem(sem) && (r.arrearStatus === 'Arrear' || !getSubjectMetrics(r).isPass)).length;
                return (
                  <option key={sem} value={sem}>
                    {sem} {countInSem > 0 ? `(${countInSem} Arrear)` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="table-container-s">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject</th>
                <th>Exam Type</th>
                <th>Marks Obtained</th>
                <th>Maximum Marks</th>
                <th>Percentage</th>
                <th>GPA</th>
                <th>Grade</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {coursesList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-muted" style={{ padding: '3rem' }}>
                    No marks uploaded for {currentViewSem} yet.
                  </td>
                </tr>
              ) : (
                coursesList.map((course, idx) => (
                  <tr key={idx}>
                    <td><span className="register-no-badge">{course.code}</span></td>
                    <td><span className="font-semibold">{course.name}</span></td>
                    <td>{course.examName}</td>
                    <td className="font-semibold">{course.total}</td>
                    <td>{course.maximum}</td>
                    <td style={{ fontWeight: 600 }}>{course.percentage}%</td>
                    <td className="font-semibold" style={{ color: getCgpaColor(course.gpa) }}>{course.gpa}</td>
                    <td>
                      <span
                        className="grade-badge-cell"
                        style={{
                          background: getCgpaColor(course.gpa) + '18',
                          color: getCgpaColor(course.gpa),
                          border: `1px solid ${getCgpaColor(course.gpa)}40`,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontWeight: 700
                        }}
                      >
                        {course.grade}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-cell ${course.status.toLowerCase() === 'pass' ? 'present' : 'absent'}`}>
                        {course.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="glass-card table-section-card-s"
        style={{ marginTop: '1.5rem' }}
      >
        <div
          className="table-header-row-s"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Consolidated Semester Result
          </h3>
        </div>

        <div className="table-container-s">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject</th>
                <th>Internal (25)</th>
                <th>Semester Exam (75)</th>
                <th>Final Total (100)</th>
                <th>GPA</th>
                <th>Grade</th>
                <th>Result</th>
              </tr>
            </thead>

            <tbody>
              {consolidatedResults.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center text-muted"
                    style={{ padding: '2rem' }}
                  >
                    Final result will appear after marks are published.
                  </td>
                </tr>
              ) : (
                consolidatedResults.map((result, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="register-no-badge">
                        {result.code || '—'}
                      </span>
                    </td>
                    <td className="font-semibold">{result.subject}</td>
                    <td>{result.internalMark} / 25</td>
                    <td>{result.externalMark} / 75</td>
                    <td className="font-semibold">{result.total} / 100</td>
                    <td className="font-semibold" style={{ color: getCgpaColor(result.gpa) }}>{result.gpa}</td>
                    <td>
                      <span
                        className="grade-badge-cell"
                        style={{
                          background: getCgpaColor(result.gpa) + '18',
                          color: getCgpaColor(result.gpa),
                          border: `1px solid ${getCgpaColor(result.gpa)}40`,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontWeight: 700
                        }}
                      >
                        {result.grade}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge-cell ${
                          result.status === 'Pass'
                            ? 'present'
                            : 'absent'
                        }`}
                      >
                        {result.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ARREAR RE-APPEARANCE APPLICATION MODAL (PORTAL) ── */}
      {reappearModalItem && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(15, 23, 42, 0.72)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999, 
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReappearModalItem(null);
          }}
        >
          <div 
            style={{ 
              background: '#ffffff', 
              borderRadius: '16px', 
              width: '100%', 
              maxWidth: '580px', 
              padding: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              boxSizing: 'border-box',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Office of Controller of Examinations (COE)
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Arrear Exam Re-Appearance Registration
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setReappearModalItem(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReappearance}>
              {/* Student Metadata Card */}
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Candidate: </span>
                  <strong style={{ color: '#0f172a' }}>{studentDetails?.name || studentSession?.name || 'Hema Sree H'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Register No: </span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{studentDetails?.rollNo || studentDetails?.admissionNumber || studentSession?.rollNo || 'TAM2026-001'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Department: </span>
                  <strong style={{ color: '#0f172a' }}>{studentDetails?.department || studentSession?.department || 'TAMIL'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Academic Standing: </span>
                  <span style={{ color: '#dc2626', fontWeight: 800 }}>Standing Arrear (RA)</span>
                </div>
              </div>

              {/* Course Detail Card */}
              <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '14px 16px', border: '1px solid #fee2e2', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.74rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Selected Course for Examination Re-Appearance
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                      {reappearModalItem.code}
                    </span>
                    <strong style={{ marginLeft: '8px', fontSize: '0.95rem', color: '#0f172a' }}>
                      {reappearModalItem.name}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    {reappearModalItem.semester}
                  </span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>CIA Retained: <strong>{reappearModalItem.internal || 15} / 25</strong></span>
                  <span>End-Sem Needed: <strong>≥ 30 / 75</strong></span>
                  <span>Session: <strong>Nov / Dec 2026</strong></span>
                </div>
              </div>

              {/* Service Type Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Select Examination Action
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  <div 
                    onClick={() => setReappearAppType('reappear')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${reappearAppType === 'reappear' ? '#dc2626' : '#e2e8f0'}`,
                      background: reappearAppType === 'reappear' ? '#fff5f5' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>Arrear Re-Appearance</strong>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626' }}>₹500</span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                      Write the supplementary theory / lab exam in the upcoming semester session.
                    </p>
                  </div>

                  <div 
                    onClick={() => setReappearAppType('revaluation')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${reappearAppType === 'revaluation' ? '#7c3aed' : '#e2e8f0'}`,
                      background: reappearAppType === 'revaluation' ? '#faf5ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>Paper Revaluation</strong>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#7c3aed' }}>₹750</span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                      Request external examiner re-evaluation and re-totalling of your answer script.
                    </p>
                  </div>
                </div>
              </div>

              {/* Undertaking Declaration */}
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" required defaultChecked style={{ marginTop: '2px' }} />
                  <span>
                    I confirm that I am applying to re-appear for <strong>{reappearModalItem.code}</strong>. I agree to pay the university examination fee and will attend the examination as scheduled on my upcoming hall ticket.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setReappearModalItem(null)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={15} /> Confirm & Submit Application (₹{reappearAppType === 'revaluation' ? '750' : '500'})
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── OFFICIAL RE-APPEARANCE ACKNOWLEDGMENT SLIP MODAL (PORTAL) ── */}
      {reappearSuccessSlip && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(15, 23, 42, 0.72)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999, 
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReappearSuccessSlip(null);
          }}
        >
          <div 
            style={{ 
              background: '#ffffff', 
              borderRadius: '16px', 
              width: '100%', 
              maxWidth: '640px', 
              padding: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              boxSizing: 'border-box',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button 
                type="button" 
                onClick={() => setReappearSuccessSlip(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div id="reappear-exam-slip-content" style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', background: '#fafbfc', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Arignar Anna College (Autonomous)
                </div>
                <h2 style={{ margin: '4px 0 2px', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  OFFICE OF CONTROLLER OF EXAMINATIONS
                </h2>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                  Arrear Re-Appearance & Supplementary Examination Slip
                </div>
                <div style={{ display: 'inline-block', marginTop: '6px', padding: '3px 12px', background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', borderRadius: '14px', fontSize: '0.74rem', fontWeight: 800 }}>
                  ✓ REGISTRATION CONFIRMED • {reappearSuccessSlip.appId}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.82rem', marginBottom: '16px' }}>
                <div><span style={{ color: '#64748b' }}>Candidate Name: </span><strong>{reappearSuccessSlip.studentName}</strong></div>
                <div><span style={{ color: '#64748b' }}>Register Number: </span><strong style={{ fontFamily: 'monospace' }}>{reappearSuccessSlip.registerNo}</strong></div>
                <div><span style={{ color: '#64748b' }}>Department: </span><strong>{reappearSuccessSlip.department}</strong></div>
                <div><span style={{ color: '#64748b' }}>Program: </span><strong>{reappearSuccessSlip.degree}</strong></div>
                <div><span style={{ color: '#64748b' }}>Registered Session: </span><strong style={{ color: '#dc2626' }}>{reappearSuccessSlip.examSession}</strong></div>
                <div><span style={{ color: '#64748b' }}>Application Date: </span><strong>{new Date(reappearSuccessSlip.appliedAt).toLocaleDateString()}</strong></div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', marginBottom: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', minWidth: '460px', borderCollapse: 'collapse', fontSize: '0.8rem', background: '#ffffff' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 10px' }}>Course Code</th>
                      <th style={{ padding: '8px 10px' }}>Course Title</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Original Sem</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action Type</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Fee Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>{reappearSuccessSlip.code}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{reappearSuccessSlip.name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{reappearSuccessSlip.semester}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.74rem' }}>{reappearSuccessSlip.type}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>₹{reappearSuccessSlip.fee}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong>Important Instructions:</strong>
                <div>1. Retain this acknowledgment slip for all academic queries and hall ticket generation.</div>
                <div>2. Your hall ticket will be scheduled and downloadable from the <em>Exam Timetable</em> tab 1 week prior to the examination date.</div>
                <div>3. Continuous Internal Assessment (CIA) marks ({reappearSuccessSlip.ciaRetained}) will be retained as per autonomous regulations.</div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => window.print()}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Slip
              </button>
              <button 
                type="button" 
                onClick={() => setReappearSuccessSlip(null)}
                style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default StudentMarks;
