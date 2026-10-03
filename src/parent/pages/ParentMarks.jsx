import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, ArrowLeft, Percent, GraduationCap, Award } from 'lucide-react';
import { getStudentById, getMarksByStudent } from '../../api/index';
import '../../student/pages/StudentMarks.css';

const DEFAULT_PARENT_SESSION = {
  id: 'P001',
  name: 'James Doe',
  childName: 'Priya Kumar R',
  referenceId: 'HAA2026-001',
  email: 'parent_priya@college.edu'
};

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

const getCgpaColor = (c) => {
  const num = Number(c);
  return num >= 8.0 ? 'var(--success)' : num >= 6.0 ? 'var(--primary)' : num >= 5.0 ? 'var(--warning)' : 'var(--danger)';
};

const ParentMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [parentSession, setParentSession] = useState(DEFAULT_PARENT_SESSION);
  const [studentDetails, setStudentDetails] = useState(null);
  const [marksRecord, setMarksRecord] = useState(null);

  useEffect(() => {
    const session = sessionStorage.getItem('parent_session');
    let activeSession = DEFAULT_PARENT_SESSION;
    if (session) {
      activeSession = JSON.parse(session);
      setParentSession(activeSession);
    } else {
      navigate('/parent/login');
      return;
    }

    const loadMarksData = async () => {
      try {
        const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
        let studentId = activeSession.parentOf || activeSession.referenceId || activeSession.childId;
        const childName = activeSession.childName || '';

        const [studRes, marksRes] = await Promise.all([
          getStudentById(studentId).catch(() => null),
          getMarksByStudent(studentId).catch(() => null)
        ]);

        const student = studRes?.data || {
          id: studentId,
          name: childName || 'Student Scholar',
          dept: 'Computer Science Engineering',
          sem: 'Semester 4',
          cgpa: 8.5,
          arrears: 0
        };

        setStudentDetails(student);

        const backendMarks = Array.isArray(marksRes?.data) ? marksRes.data : (marksRes?.data?.marks || []);

        let localMarks = [];
        try {
          const raw = localStorage.getItem(`erp_marks_${tenantId}`) || localStorage.getItem('erp_marks');
          if (raw) localMarks = JSON.parse(raw);
        } catch (e) {}

        try {
          const rawSubs = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
          if (rawSubs) {
            const subs = JSON.parse(rawSubs);
            subs.forEach(batch => {
              if (batch.records && Array.isArray(batch.records)) {
                batch.records.forEach(r => localMarks.push({ ...r, resultStatus: batch.status || r.resultStatus }));
              }
            });
          }
        } catch (e) {}

        const allCandidates = [...backendMarks, ...localMarks];
        const studentMarksRaw = allCandidates.filter(m => {
          const mId = String(m.studentId || m._id || m.id || '').trim();
          const mRoll = String(m.registerNo || m.rollNo || '').trim().toLowerCase();
          const mName = String(m.studentName || m.name || '').trim().toLowerCase();
          const sName = String(childName || student.name || '').trim().toLowerCase();
          const sId = String(studentId || '').trim();

          if (mId && sId && mId === sId) return true;
          if (mRoll && sId && mRoll === sId.toLowerCase()) return true;
          if (mName && sName && (mName === sName || mName.includes(sName) || sName.includes(mName))) return true;
          return false;
        });

        const deduplicatedMarks = [];
        studentMarksRaw.forEach(m => {
          const mSem = normalizeSem(m.semester);
          const mSub = String(m.subject || '').trim().toLowerCase();
          const existingIdx = deduplicatedMarks.findIndex(d => 
            normalizeSem(d.semester) === mSem && String(d.subject || '').trim().toLowerCase() === mSub
          );
          if (existingIdx >= 0) deduplicatedMarks[existingIdx] = { ...deduplicatedMarks[existingIdx], ...m };
          else deduplicatedMarks.push(m);
        });

        const totalArrears = deduplicatedMarks.filter(r => r.arrearStatus === 'Arrear' || (r.totalMarks !== undefined && Number(r.totalMarks) < 40)).length;
        const totalGPA = deduplicatedMarks.reduce((acc, r) => {
          const tot = Number(r.totalMarks ?? (Number(r.internalMarks || 0) + Number(r.semesterMarks || 0)) ?? r.marksObtained ?? 0);
          return acc + Number(r.cgpa || r.gpa || (tot / 10).toFixed(2));
        }, 0);
        const currentGpa = deduplicatedMarks.length > 0 ? Number((totalGPA / deduplicatedMarks.length).toFixed(2)) : (student.cgpa || 8.5);

        setMarksRecord({
          id: studentId,
          name: childName || student.name,
          dept: student.dept || 'Computer Science Engineering',
          sem: normalizeSem(student.sem || 'Semester 4'),
          internal: deduplicatedMarks[0]?.internalMarks || 20,
          external: deduplicatedMarks[0]?.semesterMarks || 65,
          arrears: totalArrears,
          gpa: currentGpa,
          courses: deduplicatedMarks.map((r, idx) => {
            const intMarks = Number(r.internalMarks !== undefined ? r.internalMarks : (r.cia1 !== undefined ? Math.round((Number(r.cia1 || 0) + Number(r.cia2 || 0) + Number(r.cia3 || 0)) / 3) : 20));
            const extMarks = Number(r.semesterMarks !== undefined ? r.semesterMarks : 65);
            const tot = Number(r.totalMarks ?? (intMarks + extMarks) ?? 85);
            const cg = Number(r.cgpa || (tot / 10).toFixed(2));
            return {
              code: r.subjectCode || r.code || `${String(r.subject || 'CS').slice(0, 3).toUpperCase()}40${idx + 1}`,
              name: r.subject || 'Subject',
              internal: intMarks,
              external: extMarks,
              gpa: cg,
              grade: r.grade || getGradeLetter(cg),
              status: tot >= 40 ? 'Pass' : 'RA'
            };
          })
        });
      } catch (err) {
        console.error('Failed to load child marks for parent:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMarksData();
  }, [navigate]);

  if (loading || !marksRecord || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  const currentGpa = marksRecord.gpa;
  const coursesList = marksRecord.courses;

  return (
    <div className="student-marks-page animate-fade-in">
      <div className="page-header-student">
        <div className="header-left-s">
          <div>
            <h1>Child Semester Grade Card</h1>
            <p className="text-muted">Review internal assessments, end-semester grades, and CGPA trends for {parentSession.childName || 'your child'}.</p>
          </div>
        </div>
      </div>

      {/* Aggregate Header Grid */}
      <div className="marks-hero-summary-grid">
        <div className="glass-card summary-grade-card">
          <Award size={24} className="icon-s teal" />
          <div>
            <p className="summary-label">CUMULATIVE CGPA</p>
            <h2 style={{ color: getCgpaColor(currentGpa) }}>{currentGpa}</h2>
          </div>
        </div>

        <div className="glass-card summary-grade-card">
          <GraduationCap size={24} className="icon-s blue" />
          <div>
            <p className="summary-label">CURRENT GPA</p>
            <h2 style={{ color: getCgpaColor(currentGpa) }}>{currentGpa}</h2>
          </div>
        </div>

        <div className="glass-card summary-grade-card">
          <AlertTriangle size={24} className="icon-s red" />
          <div>
            <p className="summary-label">ACTIVE ARREARS</p>
            <h2 className={marksRecord.arrears > 0 ? 'text-danger' : 'text-success'}>
              {marksRecord.arrears}
            </h2>
          </div>
        </div>
      </div>

      {/* Grade Table */}
      <div className="glass-card table-section-card-s">
        <div className="table-header-row-s">
          <h3>Registered Courses Score Sheet</h3>
          <span className="current-sem-badge">{marksRecord.sem}</span>
        </div>

        <div className="table-container-s">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Name</th>
                <th>Internal (25)</th>
                <th>Semester Exam (75)</th>
                <th>GPA</th>
                <th>Grade</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {coursesList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted" style={{ padding: '3rem' }}>
                    No semester marks have been published yet.
                  </td>
                </tr>
              ) : (
                coursesList.map((course, idx) => (
                  <tr key={idx}>
                    <td><span className="register-no-badge">{course.code}</span></td>
                    <td><span className="font-semibold">{course.name}</span></td>
                    <td>{course.internal} / 25</td>
                    <td>{course.external} / 75</td>
                    <td className="font-semibold" style={{ color: getCgpaColor(course.gpa) }}>{course.gpa}</td>
                    <td>
                      <span
                        className="grade-badge-cell"
                        style={{
                          background: getCgpaColor(course.gpa) + '15',
                          color: getCgpaColor(course.gpa),
                          border: `1px solid ${getCgpaColor(course.gpa)}30`,
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
    </div>
  );
};

export default ParentMarks;
