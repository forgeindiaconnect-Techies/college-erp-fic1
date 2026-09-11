import React, { useState, useEffect, useCallback } from 'react';
import { FileBarChart, Calendar, TrendingUp, AlertCircle, CheckCircle, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import '../../pages/Dashboard.css';

import { getExams, getAllMarks } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';



const calculateFinalResult = (total, passed) => {
  if (!passed) return { gpa: 0, grade: 'U' };
  if (total >= 90) return { gpa: 10, grade: 'O' };
  if (total >= 80) return { gpa: 9, grade: 'A+' };
  if (total >= 70) return { gpa: 8, grade: 'A' };
  if (total >= 60) return { gpa: 7, grade: 'B+' };
  if (total >= 50) return { gpa: 6, grade: 'B' };
  return { gpa: 0, grade: 'U' };
};

export default function PrincipalExamsResults() {
  const [tab, setTab] = useState('schedule');
  const [exams, setExams] = useState([]);
  const [marks, setMarks] = useState([]);
  const [arrearList, setArrearList] = useState([]);
  const [loadingArrears, setLoadingArrears] = useState(true);

  const loadPrincipalResults = useCallback(() => {
    // 1. Fetch dynamic exams
    getExams()
      .then(res => {
        if (res?.data && res.data.length > 0) {
          setExams(res.data);
        } else {
          setExams([]);
        }
      })
      .catch(() => {
        setExams([]);
      });

    // 2. Fetch arrears from real marks data
    setLoadingArrears(true);
    getAllMarks()
      .then(res => res.data)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const publishedMarks = data.filter(
            record => record.resultStatus === 'Published'
          );

          setMarks(publishedMarks);
          // Filter records where student has arrear (grade=U or arrearStatus=Arrear or totalMarks below passing threshold)
          const arrearRecords = publishedMarks.filter(record =>
            record.arrearStatus === 'Arrear' ||
            record.grade === 'U' ||
            record.grade === 'F'
          );

          // Group by student so we can count how many arrears each student has
          const studentMap = {};
          arrearRecords.forEach(r => {
            const key = r.studentId || r.studentName || r._id;
            if (!studentMap[key]) {
              studentMap[key] = {
                name: r.studentName || 'Unknown Student',
                dept: r.department || r.dept || 'N/A',
                subject: r.subject || 'N/A',
                marks: Number(
                  r.marksObtained ??
                  r.totalMarks ??
                  ((r.internalMarks || 0) + (r.semesterMarks || 0))
                ),
                maxMarks: Number(r.maxMarks || 100),
                sem: r.semester || 'N/A',
                arrears: 1,
                studentId: r.studentId
              };
            } else {
              // Accumulate arrear count; keep the first failing subject info
              studentMap[key].arrears += 1;
            }
          });

          const grouped = Object.values(studentMap);
          setArrearList(grouped);
        } else {
          // No marks data at all — show empty
          setMarks([]);
          setArrearList([]);
        }
      })
      .catch(err => {
        console.warn('Could not fetch marks from backend:', err);
        setMarks([]);
        setArrearList([]);
      })
      .finally(() => {
        setLoadingArrears(false);
      });
  }, []);

  useEffect(() => {
    loadPrincipalResults();
  }, [loadPrincipalResults]);

  useRealtimeSync(
    loadPrincipalResults,
    ['marks', 'exams']
  );

  const departmentGroups = {};

  marks.forEach(mark => {
    const department =
      mark.department ||
      mark.dept ||
      'Unknown Department';

    if (!departmentGroups[department]) {
      departmentGroups[department] = {
        dept: department,
        records: [],
        students: new Set()
      };
    }

    departmentGroups[department].records.push(mark);

    departmentGroups[department].students.add(
      mark.studentId || mark.studentName
    );
  });

  const resultData = Object.values(departmentGroups).map(group => {
    const total = group.records.length;

    const passed = group.records.filter(mark =>
      mark.arrearStatus !== 'Arrear' &&
      mark.grade !== 'U' &&
      mark.grade !== 'F'
    ).length;

    const average =
      total > 0
        ? group.records.reduce((sum, mark) => {
            const obtained = Number(
              mark.marksObtained ?? mark.totalMarks ?? 0
            );

            const maximum = Number(mark.maxMarks || 100);

            return sum + (
              maximum > 0
                ? (obtained / maximum) * 100
                : 0
            );
          }, 0) / total
        : 0;

    return {
      dept: group.dept,
      passRate: total > 0
        ? Number(((passed / total) * 100).toFixed(1))
        : 0,
      failRate: total > 0
        ? Number((((total - passed) / total) * 100).toFixed(1))
        : 0,
      avgScore: Number(average.toFixed(1)),
      students: group.students.size
    };
  });

  const semesterGroups = {};

  marks.forEach(mark => {
    const semester = mark.semester || 'Unknown Semester';

    if (!semesterGroups[semester]) {
      semesterGroups[semester] = [];
    }

    semesterGroups[semester].push(mark);
  });

  const trendData = Object.entries(semesterGroups)
    .map(([sem, semesterMarks]) => {
      const passed = semesterMarks.filter(mark =>
        mark.arrearStatus !== 'Arrear' &&
        mark.grade !== 'U' &&
        mark.grade !== 'F'
      ).length;

      const average =
        semesterMarks.reduce((sum, mark) => {
          const obtained = Number(
            mark.marksObtained ?? mark.totalMarks ?? 0
          );

          const maximum = Number(mark.maxMarks || 100);

          return sum + (
            maximum > 0
              ? (obtained / maximum) * 100
              : 0
          );
        }, 0) / semesterMarks.length;

      return {
        sem,
        passRate: Number(
          ((passed / semesterMarks.length) * 100).toFixed(1)
        ),
        avgScore: Number(average.toFixed(1))
      };
    })
    .sort((a, b) =>
      Number(a.sem.replace(/\D/g, '')) -
      Number(b.sem.replace(/\D/g, ''))
    );

  const gradeColours = {
    O: '#10b981',
    'A+': '#22c55e',
    A: '#3b82f6',
    'B+': '#6366f1',
    B: '#f59e0b',
    U: '#ef4444',
    F: '#ef4444'
  };

  const gradeCounts = {};

  marks.forEach(mark => {
    const grade = mark.grade || 'U';
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
  });

  const gradeData = Object.entries(gradeCounts).map(
    ([name, count]) => ({
      name,
      value: marks.length > 0
        ? Number(((count / marks.length) * 100).toFixed(1))
        : 0,
      color: gradeColours[name] || '#94a3b8'
    })
  );

  const performerMap = {};

  marks.forEach(mark => {
    const studentKey =
      mark.studentId ||
      mark.studentName ||
      mark._id;

    const cgpa = Number(mark.cgpa || mark.gpa || 0);

    if (
      !performerMap[studentKey] ||
      cgpa > performerMap[studentKey].cgpa
    ) {
      performerMap[studentKey] = {
        id: studentKey,
        name: mark.studentName || 'Unknown Student',
        department:
          mark.department ||
          mark.dept ||
          'Unknown Department',
        semester: mark.semester || '',
        cgpa
      };
    }
  });

  const topPerformers = Object.values(performerMap)
    .filter(student => student.cgpa > 0)
    .sort((a, b) => b.cgpa - a.cgpa)
    .slice(0, 3);

  const consolidatedGroups = {};

  marks.forEach(mark => {
    const key = [
      mark.studentId,
      mark.semester,
      mark.subject
    ].join('::');

    if (!consolidatedGroups[key]) {
      consolidatedGroups[key] = {
        studentId: mark.studentId,
        studentName: mark.studentName || 'Unknown Student',
        department:
          mark.department ||
          mark.dept ||
          'Unknown Department',
        semester: mark.semester || '',
        subject: mark.subject || '',
        internalPercentages: [],
        externalPercentages: []
      };
    }

    const examName = String(
      mark.examId?.name ||
      mark.examName ||
      ''
    ).toLowerCase();

    const obtained = Number(
      mark.marksObtained ??
      mark.totalMarks ??
      0
    );

    const maximum = Number(mark.maxMarks || 100);

    const percentage =
      maximum > 0
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

      const finalResult = calculateFinalResult(total, passed);

      return {
        ...group,
        internalMark,
        externalMark,
        total,
        gpa: finalResult.gpa,
        grade: finalResult.grade,
        status: passed ? 'Pass' : 'Arrear'
      };
    });

  const overall = resultData.length > 0 ? Math.round(resultData.reduce((a, d) => a + d.passRate, 0) / resultData.length) : 0;
  const topDept = resultData.length > 0 ? resultData.reduce((a, d) => d.passRate > a.passRate ? d : a) : { dept: 'N/A', passRate: 0 };
  const avgScore = resultData.length > 0 ? Math.round(resultData.reduce((a, d) => a + d.avgScore, 0) / resultData.length) : 0;
  const totalStudents = resultData.length > 0 ? resultData.reduce((a, d) => a + d.students, 0) : 0;
  const getExamStatus = exam => {
    if (
      exam.status === 'Cancelled' ||
      exam.status === 'Postponed'
    ) {
      return exam.status;
    }

    const examDate = new Date(`${exam.date}T00:00:00`);
    const today = new Date();

    examDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (examDate < today) return 'Completed';
    if (examDate.getTime() === today.getTime()) return 'Today';

    return 'Scheduled';
  };

  const getExamStatusStyle = status => {
    if (status === 'Completed') {
      return {
        background: '#e2e8f0',
        color: '#475569'
      };
    }

    if (status === 'Today') {
      return {
        background: '#fef3c7',
        color: '#b45309'
      };
    }

    if (status === 'Cancelled') {
      return {
        background: '#fee2e2',
        color: '#b91c1c'
      };
    }

    return {
      background: '#d1fae5',
      color: '#047857'
    };
  };

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileBarChart style={{ color: '#3730A5' }} size={28} /> Exam & Results
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>College-wide exam schedule, result analytics, grade distribution, and student performance.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Scheduled Exams', value: exams.length, icon: <Calendar size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'All exam records' },
          { label: 'Overall Pass %', value: `${overall}%`, icon: <CheckCircle size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: 'All departments' },
          { label: 'Failed Students', value: arrearList.length, icon: <AlertCircle size={18} />, color: 'var(--danger)', bg: '#FCEBEB', sub: 'Active arrears' },
          { label: 'Top Department', value: topDept.dept, icon: <Star size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: `${topDept.passRate}% pass rate` },
          { label: 'Avg Score', value: `${avgScore}%`, icon: <TrendingUp size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Campus-wide' },
          { label: 'Total Students', value: totalStudents, icon: <FileBarChart size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'Appeared for exams' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-details">
              <h3>{s.label}</h3>
              <p className="stat-value">{s.value}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass-card" style={{ padding: '0.4rem', borderRadius: 12, display: 'inline-flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {[['schedule', '📅 Exam Schedule'], ['results', '📊 Result Analytics'], ['grades', '🏆 Grade Distribution'], ['consolidated', '🎓 Consolidated Results'], ['failed', '⚠️ Failed Students']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, background: tab === key ? '#3730A5' : 'transparent', color: tab === key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
        ))}
      </div>

      {/* Exam Schedule */}
      {tab === 'schedule' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '1rem' }}>Examination Schedule</h4>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Exam Code</th><th>Subject</th><th>Department</th><th>Semester</th><th>Date & Time</th><th>Hall</th><th>Type</th><th>Status</th></tr>
              </thead>
              <tbody>
                {exams.length > 0 ? exams.map((e, i) => {
                  const examCode = e._id ? `EX-${e._id.substring(e._id.length - 6).toUpperCase()}` : (e.code || `EX-${100 + i}`);
                  const examType = e.name || e.type || 'Internal';
                  return (
                    <tr key={e._id || e.id || i}>
                      <td style={{ fontWeight: 700, color: '#6366F1', fontSize: '0.82rem' }}>{examCode}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{e.subject}</td>
                      <td><span style={{ background: 'rgba(99, 102, 241,0.1)', color: '#6366F1', padding: '2px 7px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{e.dept}</span></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{e.sem || 'Sem 4'}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.82rem' }}>{e.date}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.time}</span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.room || e.hall || 'Seminar Hall'}</td>
                      <td>
                        <span style={{ background: examType.includes('Sem') || examType.includes('Theory') ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)', color: examType.includes('Sem') || examType.includes('Theory') ? '#6366f1' : '#f59e0b', padding: '2px 7px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{examType}</span>
                      </td>
                      <td>
                        {(() => {
                           const status = getExamStatus(e);
                          const statusStyle = getExamStatusStyle(status);

                          return (
                            <span
                              style={{
                                ...statusStyle,
                                padding: '3px 9px',
                                borderRadius: 20,
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              {status}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No upcoming examinations scheduled for your institution.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result Analytics */}
      {tab === 'results' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Department Pass vs Fail %</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={resultData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="passRate" fill="#10b981" name="Pass %" radius={[5, 5, 0, 0]} />
                <Bar dataKey="failRate" fill="#ef4444" name="Fail %" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Pass Rate Trend (Semester-wise)</h4>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sem" tick={{ fontSize: 10 }} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="passRate" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4 }} name="Pass Rate %" />
                <Line type="monotone" dataKey="avgScore" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Avg Score %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Grade Distribution */}
      {tab === 'grades' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Grade Distribution (All Students)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gradeData} dataKey="value" cx="50%" cy="50%" outerRadius={110} innerRadius={55} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {gradeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Grade Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gradeData.map(g => (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{g.name}</span>
                  <div style={{ width: 120, height: 8, background: 'var(--bg-secondary)', borderRadius: 4 }}>
                    <div style={{ width: `${g.value * 3}%`, height: '100%', background: g.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', width: 30, textAlign: 'right' }}>{g.value}%</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', background: 'rgba(16,185,129,0.06)', borderRadius: 10, padding: '1rem', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>HIGHEST PERFORMERS</div>
              {topPerformers.length > 0 ? (
                topPerformers.map((student, index) => (
                  <div
                    key={student.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 8,
                      padding: '0.55rem 0.7rem',
                      background: 'var(--bg-primary)',
                      borderRadius: 8,
                      fontSize: '0.82rem'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: 'var(--text-main)',
                          fontWeight: 700
                        }}
                      >
                        #{index + 1} {student.name}
                      </div>

                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.72rem',
                          marginTop: 2
                        }}
                      >
                        {student.department} • {student.semester}
                      </div>
                    </div>

                    <span
                      style={{
                        color: '#10b981',
                        fontWeight: 800
                      }}
                    >
                      {student.cgpa} CGPA
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  No published result data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Consolidated Semester Results */}
      {tab === 'consolidated' && (
        <div
          className="glass-card animate-fade-in"
          style={{ padding: '1.5rem', borderRadius: 16 }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h4
              style={{
                fontWeight: 700,
                color: 'var(--text-main)',
                fontSize: '1rem',
                marginBottom: '0.25rem'
              }}
            >
              Consolidated Semester Results
            </h4>

            <p
              style={{
                margin: 0,
                color: 'var(--text-muted)',
                fontSize: '0.82rem'
              }}
            >
              Internal Assessment 40% + End Semester Examination 60%
            </p>
          </div>

          <div className="table-container">
            <table style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Subject</th>
                  <th>Internal</th>
                  <th>External</th>
                  <th>Final Total</th>
                  <th>GPA</th>
                  <th>Grade</th>
                  <th>Result</th>
                </tr>
              </thead>

              <tbody>
                {consolidatedResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      style={{
                        textAlign: 'center',
                        padding: '2.5rem',
                        color: 'var(--text-muted)'
                      }}
                    >
                      Consolidated results require both internal and end-semester marks to be published for a subject.
                    </td>
                  </tr>
                ) : (
                  consolidatedResults.map((result, index) => (
                    <tr
                      key={`${result.studentId}-${result.semester}-${result.subject}`}
                    >
                      <td>{index + 1}</td>

                      <td style={{ fontWeight: 700 }}>
                        {result.studentName}
                      </td>

                      <td>{result.studentId}</td>

                      <td>{result.department}</td>

                      <td>{result.semester}</td>

                      <td style={{ fontWeight: 700 }}>
                        {result.subject}
                      </td>

                      <td>{result.internalMark} / 40</td>

                      <td>{result.externalMark} / 60</td>

                      <td
                        style={{
                          fontWeight: 800,
                          color: 'var(--primary)'
                        }}
                      >
                        {result.total} / 100
                      </td>

                      <td style={{ fontWeight: 700 }}>
                        {result.gpa}
                      </td>

                      <td>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 6,
                            fontWeight: 700,
                            color: result.status === 'Pass'
                              ? '#047857'
                              : '#b91c1c',
                            background: result.status === 'Pass'
                              ? '#d1fae5'
                              : '#fee2e2'
                          }}
                        >
                          {result.grade}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 6,
                            fontWeight: 700,
                            color: result.status === 'Pass'
                              ? '#047857'
                              : '#b91c1c',
                            background: result.status === 'Pass'
                              ? '#d1fae5'
                              : '#fee2e2'
                          }}
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
      )}

      {/* Failed Students */}
      {tab === 'failed' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '1rem' }}>⚠️ Students with Active Arrears</h4>

          {loadingArrears ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              ⏳ Loading arrear data from database...
            </div>
          ) : arrearList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '0.3rem' }}>No Active Arrears Found</div>
              <div style={{ fontSize: '0.82rem' }}>All students have passed their exams. Marks may not have been uploaded yet.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Student Name</th><th>Department</th><th>Subject</th><th>Semester</th><th>Marks Obtained</th><th>Arrears</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {arrearList.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</td>
                      <td><span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 7px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{s.dept}</span></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.subject}</td>
                      <td style={{ fontSize: '0.82rem' }}>{s.sem}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.9rem' }}>{s.marks}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/{s.maxMarks}</span>
                      </td>
                      <td>
                        <span style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>{s.arrears} {s.arrears > 1 ? 'Arrears' : 'Arrear'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ padding: '4px 8px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Notify</button>
                          <button style={{ padding: '4px 8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Counsel</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
