import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, ArrowLeft, Percent, GraduationCap, Award, CheckCircle } from 'lucide-react';
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

const StudentMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [marksRecord, setMarksRecord] = useState(null);

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
          deduplicatedMarks[existingIdx] = { ...deduplicatedMarks[existingIdx], ...m };
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

  const totalArrears = selectedSemRecords.filter(record => {
    const tot = Number(record.totalMarks ?? (Number(record.internalMarks || 0) + Number(record.semesterMarks || 0)) ?? record.marksObtained ?? 0);
    return record.arrearStatus === 'Arrear' || (record.totalMarks !== undefined && tot < 40);
  }).length;

  const validGpas = selectedSemRecords
    .map(record => {
      const tot = Number(record.totalMarks ?? (Number(record.internalMarks || 0) + Number(record.semesterMarks || 0)) ?? record.marksObtained ?? 0);
      return Number(record.cgpa || record.gpa || (tot / 10).toFixed(2));
    })
    .filter(gpa => Number.isFinite(gpa) && gpa > 0);

  const currentGpa = validGpas.length
    ? Number((validGpas.reduce((sum, gpa) => sum + gpa, 0) / validGpas.length).toFixed(2))
    : 0;

  const allValidGpas = marksRecord.allRawRecords
    .map(record => {
      const tot = Number(record.totalMarks ?? (Number(record.internalMarks || 0) + Number(record.semesterMarks || 0)) ?? record.marksObtained ?? 0);
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
    const total = Number(record.totalMarks ?? (internal + external) ?? record.marksObtained ?? 0);
    const maximum = Number(record.maxMarks || 100);
    const percentage = maximum > 0
      ? Number(((total / maximum) * 100).toFixed(1))
      : 0;
    const cg = Number(record.cgpa || record.gpa || (total / 10).toFixed(2));
    const grade = record.grade || getGradeLetter(cg);
    const isPass = total >= 40 && (record.semesterMarks === undefined || external >= 30);

    return {
      code: record.subjectCode || record.code || `${String(record.subject || 'SUB').slice(0, 4).toUpperCase()}401`,
      name: record.subject || 'Subject',
      examName: record.examName || (record.submissionType === 'semester' ? 'End-Semester Exam' : 'Continuous Internal Assessment (CIA)'),
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
    const total = Number(record.totalMarks ?? (internalMark + externalMark) ?? record.marksObtained ?? 0);
    const cg = Number(record.cgpa || record.gpa || (total / 10).toFixed(2));
    const grade = record.grade || getGradeLetter(cg);
    const isPass = total >= 40 && (record.semesterMarks === undefined || externalMark >= 30);

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

        <div className="glass-card summary-grade-card">
          <AlertTriangle size={24} className="icon-s red" />
          <div>
            <p className="summary-label">ACTIVE ARREARS</p>
            <h2 className={totalArrears > 0 ? 'text-danger' : 'text-success'}>
              {totalArrears}
            </h2>
          </div>
        </div>
      </div>

      {/* Grade Table */}
      <div className="glass-card table-section-card-s">
        <div className="table-header-row-s" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Registered Courses Score Sheet</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>SELECT SEMESTER:</label>
            <select 
              value={currentViewSem} 
              onChange={(e) => setMarksRecord({ ...marksRecord, activeSemView: e.target.value })}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600, outline: 'none' }}
            >
              {ALL_SEMESTERS.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
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
    </div>
  );
};

export default StudentMarks;
