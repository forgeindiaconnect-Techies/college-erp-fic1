import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, ArrowLeft, Percent, GraduationCap, Award } from 'lucide-react';
import {
  getStudentById,
  getMarksByStudent,
  getSubjects,
  getExams
} from '../../api/index';
import './StudentMarks.css';

const StudentMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [marksRecord, setMarksRecord] = useState(null);

  useEffect(() => {
    const session = sessionStorage.getItem('student_session');

    if (!session) {
      navigate('/student/login');
      return;
    }

    const activeStudent = JSON.parse(session);
    setStudentSession(activeStudent);

    const loadMarksData = async () => {
      try {
        setLoading(true);

        const sessionId =
          activeStudent.referenceId ||
          activeStudent.id ||
          activeStudent._id;

        const studentResponse = await getStudentById(sessionId);
        const student = studentResponse.data;

        const studentId =
          student.id ||
          activeStudent.referenceId ||
          activeStudent.id;

        const [marksResponse, subjectsResponse, examsResponse] =
          await Promise.all([
            getMarksByStudent(studentId),
            getSubjects({
              department: student.dept || student.department
            }),
            getExams()
          ]);

        const rawMarks = Array.isArray(marksResponse.data)
          ? marksResponse.data
          : [];

        const subjectData = subjectsResponse.data;
        const subjects = Array.isArray(subjectData)
          ? subjectData
          : subjectData?.subjects || subjectData?.data || [];

        const examData = Array.isArray(examsResponse.data)
          ? examsResponse.data
          : examsResponse.data?.exams || examsResponse.data?.data || [];

        const records = rawMarks.map(mark => {
          const matchedSubject = subjects.find(subject =>
            String(subject.name || subject.subjectName || '')
              .trim()
              .toLowerCase() ===
            String(mark.subject || '')
              .trim()
              .toLowerCase()
          );

          return {
            ...mark,
            subjectCode:
              mark.subjectCode ||
              matchedSubject?.code ||
              matchedSubject?.subjectCode ||
              '',
            examName:
              mark.examId?.name ||
              examData.find(
                exam =>
                  String(exam._id || exam.id) ===
                  String(mark.examId?._id || mark.examId)
              )?.name ||
              'Exam'
          };
        });

        setStudentDetails(student);

        const availableSemesters = [
          ...new Set(records.map(record => record.semester).filter(Boolean))
        ];

        const activeSemester =
          availableSemesters[availableSemesters.length - 1] ||
          student.sem ||
          student.semester ||
          'Semester 1';

        setMarksRecord({
          id: studentId,
          name: student.name,
          dept: student.dept || student.department,
          activeSemView: activeSemester,
          availableSemesters,
          allRawRecords: records
        });
      } catch (err) {
        console.error('Failed to load student marks:', err);
        setStudentDetails(activeStudent);
        setMarksRecord({
          id: activeStudent.referenceId || activeStudent.id,
          name: activeStudent.name,
          dept: activeStudent.dept || activeStudent.department,
          activeSemView: activeStudent.sem || 'Semester 1',
          availableSemesters: [],
          allRawRecords: []
        });
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

  const getCgpaColor = (score) =>
    score >= 75
      ? 'var(--success)'
      : score >= 50
        ? 'var(--warning)'
        : 'var(--danger)';

  const normalizeSem = (semStr) => {
    if (!semStr) return '';
    const num = String(semStr).replace(/\D/g, '');
    return num ? `Semester ${num}` : semStr;
  };

  const firstSemester = normalizeSem(
    marksRecord.allRawRecords[0]?.semester
  );

  const currentViewSem =
    marksRecord.activeSemView || firstSemester || 'Semester 1';

  const selectedSemRecords = marksRecord.allRawRecords.filter(record =>
    normalizeSem(record.semester) === normalizeSem(currentViewSem)
  );

  const totalArrears = selectedSemRecords.filter(
    record => record.arrearStatus === 'Arrear'
  ).length;

  const validGpas = selectedSemRecords
    .map(record => Number(record.gpa))
    .filter(gpa => Number.isFinite(gpa));

  const currentGpa = validGpas.length
    ? Number(
        (
          validGpas.reduce((sum, gpa) => sum + gpa, 0) /
          validGpas.length
        ).toFixed(2)
      )
    : 0;

  const cumulativeCgpa =
    Number(selectedSemRecords[0]?.cgpa) ||
    Number(studentDetails.cgpa) ||
    0;

  const coursesList = selectedSemRecords.map((record, idx) => {
    const internal = Number(record.internalMarks || 0);
    const external = Number(record.semesterMarks || 0);
    const total = Number(record.totalMarks ?? internal + external);
    const maximum = Number(record.maxMarks || 150);

    return {
      code: record.subjectCode || record.code || `SUB${idx + 1}`,
      name: record.subject || 'Subject',
      examName: record.examName || 'Exam',
      internal,
      external,
      total,
      maximum,
      percentage: maximum > 0
        ? Number(((total / maximum) * 100).toFixed(2))
        : 0,
      gpa: Number(record.gpa || 0),
      grade: record.grade || 'U',
      status: record.arrearStatus === 'Arrear' ? 'Arrear' : 'Pass'
    };
  });

  const getFinalGradeAndGpa = (percentage, passed) => {
    if (!passed) return { grade: 'U', gpa: 0 };

    if (percentage >= 90) return { grade: 'O', gpa: 10 };
    if (percentage >= 80) return { grade: 'A+', gpa: 9 };
    if (percentage >= 70) return { grade: 'A', gpa: 8 };
    if (percentage >= 60) return { grade: 'B+', gpa: 7 };
    if (percentage >= 50) return { grade: 'B', gpa: 6 };

    return { grade: 'U', gpa: 0 };
  };

  const consolidatedGroups = {};

  selectedSemRecords.forEach(record => {
    const key = record.subject;
    const examName = String(record.examName || '').toLowerCase();

    if (!consolidatedGroups[key]) {
      consolidatedGroups[key] = {
        subject: record.subject,
        code: record.subjectCode || '',
        internalPercentages: [],
        externalPercentages: []
      };
    }

    const obtained = Number(
      record.marksObtained ?? record.totalMarks ?? 0
    );

    const maximum = Number(record.maxMarks || 100);
    const percentage = maximum > 0
      ? (obtained / maximum) * 100
      : 0;

    const isExternal =
      examName.includes('end semester') ||
      examName.includes('university semester') ||
      examName.includes('external');

    if (isExternal) {
      consolidatedGroups[key].externalPercentages.push(percentage);
    } else {
      consolidatedGroups[key].internalPercentages.push(percentage);
    }
  });

  const consolidatedResults = Object.values(consolidatedGroups)
    .filter(group =>
      group.internalPercentages.length > 0 &&
      group.externalPercentages.length > 0
    )
    .map(group => {
      const internalAverage =
        group.internalPercentages.reduce(
          (sum, value) => sum + value,
          0
        ) / group.internalPercentages.length;

      const externalAverage =
        group.externalPercentages.reduce(
          (sum, value) => sum + value,
          0
        ) / group.externalPercentages.length;

      const internalMark = Number(
        ((internalAverage / 100) * 40).toFixed(2)
      );

      const externalMark = Number(
        ((externalAverage / 100) * 60).toFixed(2)
      );

      const total = Number(
        (internalMark + externalMark).toFixed(2)
      );

      const passed =
        internalAverage >= 40 &&
        externalAverage >= 40 &&
        total >= 50;

      const finalResult = getFinalGradeAndGpa(total, passed);

      return {
        ...group,
        internalMark,
        externalMark,
        total,
        grade: finalResult.grade,
        gpa: finalResult.gpa,
        status: passed ? 'Pass' : 'Arrear'
      };
    });

  const consolidatedCurrentGpa = consolidatedResults.length
    ? Number(
        (
          consolidatedResults.reduce(
            (sum, result) => sum + result.gpa,
            0
          ) / consolidatedResults.length
        ).toFixed(2)
      )
    : 0;

  const ALL_SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

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
            <h2 style={{ color: getCgpaColor(cumulativeCgpa * 10) }}>{cumulativeCgpa}</h2>
          </div>
        </div>

        <div className="glass-card summary-grade-card">
          <GraduationCap size={24} className="icon-s blue" />
          <div>
            <p className="summary-label">CURRENT GPA</p>
            <h2>{consolidatedCurrentGpa}</h2>
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
              onChange={(e) => setMarksRecord({...marksRecord, activeSemView: e.target.value})}
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
                    <td className="font-semibold" style={{ color: getCgpaColor(course.percentage) }}>{course.gpa}</td>
                    <td>
                      <span
                        className="grade-badge-cell"
                        style={{
                          background: getCgpaColor(course.percentage) + '18',
                          color: getCgpaColor(course.percentage),
                          border: `1px solid ${getCgpaColor(course.percentage)}40`,
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
                <th>Internal (40)</th>
                <th>External (60)</th>
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
                    Final result will appear after both internal and
                    end-semester marks are published.
                  </td>
                </tr>
              ) : (
                consolidatedResults.map(result => (
                  <tr key={result.subject}>
                    <td>
                      <span className="register-no-badge">
                        {result.code || '—'}
                      </span>
                    </td>
                    <td className="font-semibold">{result.subject}</td>
                    <td>{result.internalMark} / 40</td>
                    <td>{result.externalMark} / 60</td>
                    <td className="font-semibold">{result.total} / 100</td>
                    <td>{result.gpa}</td>
                    <td>{result.grade}</td>
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

