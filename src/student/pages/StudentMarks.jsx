import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, ArrowLeft, Percent, GraduationCap, Award } from 'lucide-react';
import { getStudentById, getMarksByStudent } from '../../api/index';
import './StudentMarks.css';

// Fallbacks
const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Computer Science',
  sem: 'Sem 6',
  email: 'john@college.edu'
};

const calcGpa = (internal, external) => {
  const pct = ((internal + external) / 150) * 100;
  if (internal < 20 || external < 35) return 0;
  if (pct >= 90) return 10;
  if (pct >= 80) return 9;
  if (pct >= 70) return 8;
  if (pct >= 60) return 7;
  if (pct >= 55) return 6;
  if (pct >= 50) return 5;
  return 0;
};

const StudentMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);
  const [studentDetails, setStudentDetails] = useState(null);
  const [marksRecord, setMarksRecord] = useState(null);

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('student_session');
    let activeStud = DEFAULT_STUDENT;
    if (session) {
      activeStud = JSON.parse(session);
      setStudentSession(activeStud);
    } else {
      navigate('/student/login');
      return;
    }

    const loadMarksData = async () => {
      try {
        let finalId = activeStud.referenceId || activeStud.id || activeStud._id;
        if (finalId && finalId.length === 24 && /^[0-9a-fA-F]{24}$/.test(finalId)) {
          const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
          const match = erpStudents.find(s => s._id === finalId || s.id === finalId);
          if (match && match.id) finalId = match.id;
        }

        const [studRes, marksRes] = await Promise.all([
          getStudentById(finalId).catch(() => null),
          getMarksByStudent(finalId).catch(() => null)
        ]);

        if (studRes?.data) {
          setStudentDetails(studRes.data);
        } else {
          setStudentDetails({
            id: activeStud.referenceId || activeStud.id,
            name: activeStud.name,
            dept: activeStud.dept,
            sem: activeStud.sem,
            cgpa: 8.6,
            arrears: 0
          });
        }

        let backendMarks = marksRes?.data || [];
        const localMarks = JSON.parse(localStorage.getItem(`erp_marks_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
        const studentLocalMarks = localMarks.filter(m => 
          m.studentId === finalId || 
          m.studentId === activeStud.referenceId || 
          m.studentId === activeStud.id ||
          (m.studentName && activeStud.name && (m.studentName.toLowerCase().trim() === activeStud.name.toLowerCase().trim() || m.studentName.toLowerCase().includes(activeStud.name.toLowerCase()) || activeStud.name.toLowerCase().includes(m.studentName.toLowerCase())))
        );
        
        const allRecords = [...backendMarks];
        studentLocalMarks.forEach(lm => {
          const idx = allRecords.findIndex(cm => cm.subject === lm.subject);
          if (idx >= 0) {
            allRecords[idx] = lm;
          } else {
            allRecords.push(lm);
          }
        });

        if (allRecords.length > 0) {
          // Determine available semesters
          const availableSems = [...new Set(allRecords.map(r => r.semester))].sort();
          
          // Determine which semester to show
          let targetSemToView = activeStud.sem || studentDetails?.sem || 'Semester 3';
          if (!availableSems.includes(targetSemToView) && availableSems.length > 0) {
             targetSemToView = availableSems[availableSems.length - 1]; // latest available
          }

          // Save full record list for easy toggling later without fetching
          setMarksRecord({
            id: activeStud.referenceId || activeStud.id,
            name: activeStud.name,
            dept: activeStud.dept,
            activeSemView: targetSemToView,
            availableSemesters: availableSems,
            allRawRecords: allRecords,
          });
        } else {
          // No marks available
          setMarksRecord({
            id: activeStud.referenceId || activeStud.id,
            name: activeStud.name,
            dept: activeStud.dept,
            activeSemView: activeStud.sem || 'Semester 3',
            availableSemesters: ['Semester 3'],
            allRawRecords: []
          });
        }
      } catch (err) {
        console.error('Failed to load live student marks:', err);
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

  // Derive grades and statuses based on 100 marks scale
  const getGrade = (totalScore) => {
    if (totalScore >= 90) return 'O';
    if (totalScore >= 80) return 'A+';
    if (totalScore >= 70) return 'A';
    if (totalScore >= 60) return 'B+';
    if (totalScore >= 50) return 'B';
    return 'RA';
  };

  const getCgpaColor = (score) => score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

  const normalizeSem = (semStr) => {
    if (!semStr) return 'Semester 3';
    const num = semStr.replace(/[^0-9]/g, '');
    return num ? `Semester ${num}` : semStr;
  };

  const currentViewSem = marksRecord.activeSemView || 'Semester 3';

  // Filter raw records for current active semester view
  const selectedSemRecords = marksRecord.allRawRecords.filter(r => 
    normalizeSem(r.semester) === normalizeSem(currentViewSem)
  );
  
  const totalArrears = selectedSemRecords.filter(r => {
    const tot = (r.internalMarks || 0) + (r.semesterMarks || 0);
    return tot < 50;
  }).length;

  const totalScores = selectedSemRecords.map(r => (r.internalMarks || 0) + (r.semesterMarks || 0));
  const avgScore = totalScores.length > 0 ? totalScores.reduce((a, b) => a + b, 0) / totalScores.length : 80;
  const currentGpa = Number((avgScore / 10).toFixed(2));
  const cumulativeCgpa = studentDetails.cgpa && studentDetails.cgpa > 0 ? studentDetails.cgpa : Number((avgScore / 10).toFixed(2));

  const coursesList = selectedSemRecords.map((r, idx) => {
    const internal = r.internalMarks != null ? r.internalMarks : 0;
    const external = r.semesterMarks != null ? r.semesterMarks : 0;
    const total = internal + external;
    const gpaVal = Number((total / 10).toFixed(1));
    return {
      code: r.code || `CS30${idx + 1}`,
      name: r.subject || 'Core Subject',
      internal,
      external,
      total,
      percentage: total,
      gpa: gpaVal,
      grade: getGrade(total),
      status: total >= 50 ? 'Pass' : 'Arrear'
    };
  });

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
            <h2>{currentGpa}</h2>
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
                <th>Course Name</th>
                <th>Internal (40)</th>
                <th>External (60)</th>
                <th>Total (100)</th>
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
                    <td style={{ fontWeight: 600 }}>{course.internal} / 40</td>
                    <td style={{ fontWeight: 600 }}>{course.external} / 60</td>
                    <td className="font-semibold" style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{course.total} / 100</td>
                    <td style={{ fontWeight: 600 }}>{course.percentage}%</td>
                    <td className="font-semibold" style={{ color: getCgpaColor(course.total) }}>{course.gpa}</td>
                    <td>
                      <span
                        className="grade-badge-cell"
                        style={{
                          background: getCgpaColor(course.total) + '18',
                          color: getCgpaColor(course.total),
                          border: `1px solid ${getCgpaColor(course.total)}40`,
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

export default StudentMarks;

