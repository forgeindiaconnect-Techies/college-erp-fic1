import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Edit2,
  X,
  CheckCircle,
  Percent,
  Hash,
  Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getAllMarks,
  createMark,
  getExams,
  getStudents
} from '../../api/index';
import './HodMarks.css';

// Try to grab logged in HOD session
const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'Prof. Rajan Iyer', dept: 'Electrical Engg.', deptCode: 'EE', role: 'HOD'
    };
  } catch (e) {
    return { name: 'Prof. Rajan Iyer', dept: 'Electrical Engg.', deptCode: 'EE', role: 'HOD' };
  }
};

const SEMESTERS = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const AVATAR_COLORS = ['bg-gradient-blue','bg-gradient-purple','bg-gradient-orange','bg-gradient-green','bg-gradient-teal','bg-gradient-pink'];

const HodMarks = () => {
  const hodSession = getHodSession();
  const HOD_DEPT = hodSession.dept;

  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState([]);
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState('All');

  /* Edit Modal states */
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    semester: '',
    subject: '',
    marksObtained: 0,
    maxMarks: 100
  });
  const [saved, setSaved] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [bulkMarks, setBulkMarks] = useState({});
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchMarksData();
  }, []);

  const isSameDepartment = value => {
    if (!value || !HOD_DEPT) return false;
    const val = String(value).trim().toLowerCase();
    const target = String(HOD_DEPT).trim().toLowerCase();
    if (val === target || val.includes(target) || target.includes(val)) return true;

    const cse = ['computer science', 'cse', 'cs'];
    if (cse.some(k => val.includes(k)) && cse.some(k => target.includes(k))) return true;

    const ece = ['electronics', 'ece', 'ec'];
    if (ece.some(k => val.includes(k)) && ece.some(k => target.includes(k))) return true;

    const eee = ['electrical', 'eee', 'ee'];
    if (eee.some(k => val.includes(k)) && eee.some(k => target.includes(k))) return true;

    const mech = ['mechanical', 'mech', 'me'];
    if (mech.some(k => val.includes(k)) && mech.some(k => target.includes(k))) return true;

    const it = ['information technology', 'it'];
    if (it.some(k => val.includes(k)) && it.some(k => target.includes(k))) return true;

    return false;
  };

  const fetchMarksData = async () => {
    try {
      setLoading(true);

      const [marksRes, examsRes, studentsRes] = await Promise.all([
        getAllMarks(),
        getExams(),
        getStudents()
      ]);

      const backendMarks = Array.isArray(marksRes?.data)
        ? marksRes.data
        : [];

      const examData = Array.isArray(examsRes?.data)
        ? examsRes.data
        : examsRes?.data?.exams || examsRes?.data?.data || [];

      const studentData = Array.isArray(studentsRes?.data)
        ? studentsRes.data
        : studentsRes?.data?.students || studentsRes?.data?.data || [];

      setExams(
        examData.filter(exam => isSameDepartment(exam.dept || exam.department))
      );

      setStudents(
        studentData.filter(student =>
          isSameDepartment(student.dept || student.department)
        )
      );

      const mapped = backendMarks.map(mark => ({
        markId: mark._id,
        examId: mark.examId?._id || mark.examId || '',
        examName:
          mark.examId?.name ||
          examData.find(
            exam =>
              String(exam._id || exam.id) ===
              String(mark.examId?._id || mark.examId)
          )?.name ||
          'Unlinked Exam',
        id: mark.registerNo || mark.studentId,
        studentId: mark.studentId,
        name: mark.studentName || 'Unknown Student',
        dept: mark.department || HOD_DEPT,
        sem: mark.semester,
        subject: mark.subject,
        internal: Number(mark.internalMarks || 0),
        external: Number(mark.semesterMarks || 0),
        marksObtained: Number(mark.marksObtained ?? mark.totalMarks ?? 0),
        maxMarks: Number(mark.maxMarks || 100),
        passMarks: Number(mark.passMarks || 40),
        percentage: Number(mark.maxMarks || 100) > 0
          ? Number(
              (
                (Number(mark.marksObtained ?? mark.totalMarks ?? 0) /
                  Number(mark.maxMarks || 100)) *
                100
              ).toFixed(2)
            )
          : 0,
        gpa: Number(mark.gpa || 0),
        grade: mark.grade || 'U',
        cgpa: Number(mark.cgpa || 0),
        arrears: mark.arrearStatus === 'Arrear' ? 1 : 0,
        resultStatus: mark.resultStatus || 'Draft',
        trend: [Number(mark.cgpa || 0)]
      }));

      setMarks(mapped);
    } catch (err) {
      console.error('Failed to load real marks data:', err);
      setMarks([]);
      setExams([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  /* Scoped to department */
  const deptMarks = marks.filter(m => isSameDepartment(m.dept));
  
  const filtered = deptMarks.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    const matchSem =
      semFilter === 'All' ||
      String(m.sem || '').replace(/\D/g, '') ===
        String(semFilter).replace(/\D/g, '');
    return matchSearch && matchSem;
  });

  const normalizeSemester = value =>
    String(value || '').replace(/\D/g, '');

  const normalizeSection = value =>
    String(value || '')
      .replace(/^section\s*/i, '')
      .trim()
      .toLowerCase();

  const selectedExam = exams.find(
    exam => exam._id === selectedExamId || exam.id === selectedExamId
  );

  const examStudents = selectedExam
    ? students.filter(student => {
        const sameSemester =
          normalizeSemester(student.sem || student.semester) ===
          normalizeSemester(selectedExam.sem);

        const sameSection =
          normalizeSection(student.section || student.sectionName) ===
          normalizeSection(selectedExam.section);

        return sameSemester && sameSection;
      })
    : [];

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

  filtered.forEach(record => {
    const key = [
      record.studentId,
      record.sem,
      record.subject
    ].join('::');

    if (!consolidatedGroups[key]) {
      consolidatedGroups[key] = {
        studentId: record.studentId,
        studentRegNo: record.studentRegNo || record.id,
        name: record.name,
        dept: record.dept,
        sem: record.sem,
        subject: record.subject,
        internalPercentages: [],
        externalPercentages: []
      };
    }

    const examName = String(record.examName || '').toLowerCase();
    const percentage = Number(record.percentage || 0);

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
        gpa: finalResult.gpa,
        grade: finalResult.grade,
        status: passed ? 'Pass' : 'Arrear'
      };
    });

  const uniqueStudents = Array.from(
    deptMarks.reduce((map, record) => {
      const studentKey = record.studentId || record.id;
      const existing = map.get(studentKey);

      if (!existing || record.cgpa > existing.cgpa) {
        map.set(studentKey, record);
      }

      return map;
    }, new Map()).values()
  );

  const topStudents = [...uniqueStudents]
    .sort((a, b) => b.cgpa - a.cgpa)
    .slice(0, 3);
  const withArrears = deptMarks.filter(m => m.arrears > 0);
  const avgCgpa = deptMarks.length ? (deptMarks.reduce((a, b) => a + b.cgpa, 0) / deptMarks.length).toFixed(2) : 0;

  const cgpaTrendData = SEMESTERS
    .map(sem => {
      const semNumber = sem.replace(/\D/g, '');

      const semMarks = deptMarks.filter(mark =>
        String(mark.sem || '').replace(/\D/g, '') === semNumber &&
        Number(mark.cgpa) > 0
      );

      if (semMarks.length === 0) {
        return null;
      }

      const uniqueSemesterStudents = [
        ...new Map(
          semMarks.map(mark => [
            mark.studentId || mark.id,
            mark
          ])
        ).values()
      ];

      const average =
        uniqueSemesterStudents.reduce(
          (sum, mark) => sum + Number(mark.cgpa),
          0
        ) / uniqueSemesterStudents.length;

      return {
        sem,
        avg: Number(average.toFixed(2))
      };
    })
    .filter(Boolean);

  const getCgpaColor = (c) => c >= 9 ? 'var(--success)' : c < 7 ? 'var(--danger)' : 'var(--warning)';
  const getGrade = (c) => c >= 9 ? 'O' : c >= 8 ? 'A+' : c >= 7 ? 'A' : c >= 6 ? 'B+' : 'B';

  const openEdit = (mark) => {
    const relatedExam = exams.find(
      exam => (exam._id || exam.id) === mark.examId
    );

    setForm({
      id: mark.id,
      name: mark.name,
      semester: mark.sem,
      subject: mark.subject,
      marksObtained: mark.marksObtained,
      maxMarks: Number(relatedExam?.maxMarks || mark.maxMarks || 100)
    });

    setEditTarget(mark.markId);
    setSaved(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleFormChange = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedMark = marks.find(
      mark => mark.markId === editTarget
    );

    if (!selectedMark) return;

    const maximum = Number(form.maxMarks || 100);
    const obtained = Number(form.marksObtained);

    if (obtained < 0 || obtained > maximum) {
      alert(`Marks must be between 0 and ${maximum}.`);
      return;
    }

    try {
      await createMark([{
        examId: selectedMark.examId,
        studentId: selectedMark.studentId || selectedMark.id,
        studentName: selectedMark.name,
        registerNo: selectedMark.id,
        department: HOD_DEPT,
        semester: selectedMark.sem,
        section: selectedMark.section,
        subject: selectedMark.subject,
        marksObtained: obtained,
        maxMarks: maximum,
        passMarks: Math.ceil(maximum * 0.4),
        resultStatus: 'Published'
      }]);

      await fetchMarksData();

      setSaved(true);
      setTimeout(() => {
        closeModal();
        setSaved(false);
      }, 800);
    } catch (err) {
      console.error('Failed to update exam marks:', err);
      alert(err.response?.data?.message || 'Failed to update exam marks.');
    }
  };

  const handlePublishExamMarks = async (e) => {
    e.preventDefault();

    if (!selectedExam) {
      alert('Please select a scheduled exam.');
      return;
    }

    if (examStudents.length === 0) {
      alert('No students found for this exam semester and section.');
      return;
    }

    const hasMissingMarks = examStudents.some(student => {
      const studentId = student.id || student._id;
      return (
        bulkMarks[studentId] === undefined ||
        bulkMarks[studentId] === ''
      );
    });

    if (hasMissingMarks) {
      alert('Please enter marks for every student.');
      return;
    }

    const maximum = Number(selectedExam.maxMarks || 100);

    const payload = examStudents.map(student => {
      const studentId = student.id || student._id;

      return {
        examId: selectedExam._id,
        studentId,
        studentName: student.name,
        registerNo: student.id || student.registerNo,
        department: HOD_DEPT,
        semester: selectedExam.sem,
        section: selectedExam.section,
        subject: selectedExam.subject,
        marksObtained: Number(bulkMarks[studentId]),
        maxMarks: maximum,
        passMarks: Number(
          selectedExam.passMarks || Math.ceil(maximum * 0.4)
        ),
        resultStatus: 'Published'
      };
    });

    try {
      setPublishing(true);
      await createMark(payload);
      await fetchMarksData();
      setEntryModalOpen(false);
      setSelectedExamId('');
      setBulkMarks({});
      alert('Exam marks published successfully.');
    } catch (err) {
      console.error('Failed to publish exam marks:', err);
      alert(err.response?.data?.message || 'Failed to publish exam marks.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="cgpa-page animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Marks & CGPA</h1>
          <p className="text-muted">Manage academic grades, GPAs, and arrears for students in <strong>{HOD_DEPT}</strong>.</p>
        </div>
        <button
          type="button"
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setSelectedExamId('');
            setBulkMarks({});
            setEntryModalOpen(true);
          }}
        >
          <Plus size={18} />
          Enter Exam Marks
        </button>
      </div>

      {/* Summary Row */}
      <div className="sm-summary-row four-col">
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Average CGPA</span>
          <span className="sm-summary-value gradient-text">{avgCgpa}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <Trophy size={18} style={{ color: 'var(--warning)' }} />
          <span className="sm-summary-label">Department Top CGPA</span>
          <span className="sm-summary-value text-success">{deptMarks.length ? Math.max(...deptMarks.map(m => m.cgpa)) : '—'}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Arrear Students</span>
          <span className="sm-summary-value text-danger">{withArrears.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <TrendingUp size={18} style={{ color: 'var(--success)' }} />
          <span className="sm-summary-label">Department Pass Rate</span>
          <span className="sm-summary-value text-success">{deptMarks.length ? ((deptMarks.filter(m => m.cgpa >= 5).length / deptMarks.length) * 100).toFixed(0) + '%' : '—'}</span>
        </div>
      </div>

      <div className="cgpa-grid">
        {/* CGPA Trend Chart */}
        <div className="glass-card chart-box col-span-2">
          <h3>Semester Performance Trend</h3>
          <div style={{ height: '230px', marginTop: '1.25rem' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cgpaTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="sem" stroke="var(--text-muted)" />
                <YAxis domain={[6, 10]} stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)' }} />
                <Line type="monotone" dataKey="avg" name="Avg CGPA" stroke="var(--primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--primary)', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Students */}
        <div className="glass-card chart-box">
          <h3><Trophy size={16} style={{ display: 'inline', color: 'var(--warning)', marginRight: '6px' }} />Department Toppers</h3>
          <div className="top-students-list">
            {topStudents.map((s, idx) => (
              <div key={s.id} className="top-student-item">
                <div className={`rank-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze'}`}>{idx + 1}</div>
                <div className={`avatar-sm ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{s.name[0]}</div>
                <div className="top-student-info">
                  <p className="top-student-name">{s.name}</p>
                  <p className="top-student-dept">{s.sem}</p>
                </div>
                <span className="top-student-cgpa" style={{ color: getCgpaColor(s.cgpa) }}>{s.cgpa}</span>
              </div>
            ))}
          </div>

          {withArrears.length > 0 && (
            <div className="arrear-alert" style={{ marginTop: '1rem' }}>
              <AlertTriangle size={16} />
              <span><strong>{withArrears.length} students</strong> have arrears.</span>
              <div className="arrear-list">
                {withArrears.map(s => (
                  <div key={s.id} className="arrear-item">
                    <span>{s.name} ({s.sem})</span>
                    <span className="arrear-count">{s.arrears} Arrear{s.arrears > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Table */}
        <div className="glass-card col-span-3">
          <div className="table-filters-row">
            <h3>Student Academic Records</h3>
            <div className="filter-group">
              <div className="search-box">
                <Search size={16} className="text-muted" />
                <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="filter-select-wrapper">
                <select className="filter-select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
                  <option value="All">All Semesters</option>
                  {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table style={{ minWidth: '1500px' }}>
              <thead>
                <tr>
                  <th>#</th><th>Register No</th><th>Name</th><th>Sem</th>
                  <th>Subject</th><th>Exam Type</th><th>Marks Obtained</th><th>Maximum Marks</th><th>Percentage</th><th>GPA</th><th>CGPA</th>
                  <th>Grade</th><th>Arrears</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 14 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>)}</tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={14} className="no-data">No students matching query.</td></tr>
                ) : filtered.map((m, idx) => (
                  <tr key={m.markId}>
                    <td className="text-muted">{idx + 1}</td>
                    <td><span className="roll-no">{m.id}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`avatar-xs ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{m.name[0]}</div>
                        <span className="font-semibold">{m.name}</span>
                      </div>
                    </td>
                    <td><span className="badge-outline">{m.sem}</span></td>
                    <td><span className="font-semibold">{m.subject}</span></td>
                    <td>{m.examName}</td>
                    <td className="font-semibold">{m.marksObtained}</td>
                    <td>{m.maxMarks}</td>
                    <td className="font-semibold">{m.percentage}%</td>
                    <td><span style={{ color: getCgpaColor(m.gpa), fontWeight: 600 }}>{m.gpa}</span></td>
                    <td>
                      <div className="cgpa-cell">
                        <span style={{ color: getCgpaColor(m.cgpa), fontWeight: 700 }}>{m.cgpa}</span>
                        <div className="cgpa-bar-bg">
                          <div className="cgpa-bar-fill" style={{ width: `${(m.cgpa / 10) * 100}%`, background: getCgpaColor(m.cgpa) }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="grade-badge" style={{ background: getCgpaColor(m.cgpa) + '20', color: getCgpaColor(m.cgpa), border: `1px solid ${getCgpaColor(m.cgpa)}40` }}>
                        {m.grade}
                      </span>
                    </td>
                    <td>
                      {m.arrears === 0
                        ? <span className="text-success font-semibold">✓ Clear</span>
                        : <span className="text-danger font-semibold">⚠ {m.arrears}</span>
                      }
                    </td>
                    <td>
                      <button className="btn-icon" title="Log/Update Marks" onClick={() => openEdit(m)}>
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Consolidated Semester Results Table */}
        <div className="glass-card col-span-3" style={{ marginTop: '1.5rem' }}>
          <div className="table-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Consolidated Semester Results</h3>
              <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                Internal 40% + End Semester 60%
              </p>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ minWidth: '1300px' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Subject</th>
                  <th>Internal (40)</th>
                  <th>External (60)</th>
                  <th>Final Total</th>
                  <th>GPA</th>
                  <th>Grade</th>
                  <th>Result</th>
                </tr>
              </thead>

              <tbody>
                {consolidatedResults.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="no-data-row">
                      Consolidated results require both internal and end-semester marks.
                    </td>
                  </tr>
                ) : (
                  consolidatedResults.map((result, index) => (
                    <tr
                      key={`${result.studentId}-${result.sem}-${result.subject}`}
                    >
                      <td>{index + 1}</td>
                      <td className="font-semibold">{result.name}</td>
                      <td>{result.studentRegNo}</td>
                      <td>{result.dept}</td>
                      <td>{result.sem}</td>
                      <td className="font-semibold">{result.subject}</td>
                      <td>{result.internalMark} / 40</td>
                      <td>{result.externalMark} / 60</td>
                      <td className="font-semibold" style={{ color: 'var(--primary)' }}>
                        {result.total} / 100
                      </td>
                      <td>
                        <span style={{ color: getCgpaColor(result.gpa), fontWeight: 700 }}>
                          {result.gpa}
                        </span>
                      </td>
                      <td>
                        <span
                          className="grade-badge"
                          style={{
                            background: getCgpaColor(result.gpa) + '18',
                            color: getCgpaColor(result.gpa),
                            border: `1px solid ${getCgpaColor(result.gpa)}35`
                          }}
                        >
                          {result.grade}
                        </span>
                      </td>
                      <td>
                        {result.status === 'Pass' ? (
                          <span className="badge-pass">✓ Pass</span>
                        ) : (
                          <span className="badge-fail">✗ Fail</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {entryModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setEntryModalOpen(false)}
        >
          <div
            className="modal-card glass-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Enter Exam Marks</h2>
                <p className="text-muted">
                  Select a scheduled exam and publish student marks.
                </p>
              </div>

              <button
                type="button"
                className="btn-icon"
                onClick={() => setEntryModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={handlePublishExamMarks}
            >
              <div className="form-group">
                <label>Scheduled Exam *</label>
                <select
                  required
                  value={selectedExamId}
                  onChange={e => {
                    setSelectedExamId(e.target.value);
                    setBulkMarks({});
                  }}
                >
                  <option value="">Select Exam</option>

                  {exams.map(exam => (
                    <option
                      key={exam._id || exam.id}
                      value={exam._id || exam.id}
                    >
                      {exam.name} — {exam.subject} — {exam.sem} —
                      Section {exam.section}
                    </option>
                  ))}
                </select>
              </div>

              {selectedExam && (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Subject</label>
                      <input disabled value={selectedExam.subject || ''} />
                    </div>

                    <div className="form-group">
                      <label>Maximum Marks</label>
                      <input disabled value={selectedExam.maxMarks || 100} />
                    </div>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Register No</th>
                          <th>Student Name</th>
                          <th>Marks Obtained</th>
                        </tr>
                      </thead>

                      <tbody>
                        {examStudents.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="no-data">
                              No students found for {selectedExam.sem},
                              Section {selectedExam.section}.
                            </td>
                          </tr>
                        ) : (
                          examStudents.map(student => {
                            const studentId = student.id || student._id;

                            return (
                              <tr key={studentId}>
                                <td>{student.id || student.registerNo}</td>
                                <td>{student.name}</td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    max={selectedExam.maxMarks || 100}
                                    required
                                    value={bulkMarks[studentId] ?? ''}
                                    onChange={e =>
                                      setBulkMarks(previous => ({
                                        ...previous,
                                        [studentId]: e.target.value
                                      }))
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEntryModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={publishing || !selectedExam}
                >
                  {publishing ? 'Publishing...' : 'Publish Marks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MARKS MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Update Academic Marks</h2>
                <p className="text-muted" style={{fontSize: '0.85rem', marginTop: '2px'}}>Log internals and semester scores for {form.name}.</p>
              </div>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>

            {saved && (
              <div className="modal-success-flash" style={{display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.75rem', background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid rgba(16,185,129,0.2)'}}>
                <CheckCircle size={18} /> Student marks updated successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Student Name</label>
                  <input disabled value={form.name} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>Register No</label>
                  <input disabled value={form.id} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>
                    <Percent size={13} /> Marks Obtained
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.maxMarks}
                    required
                    value={form.marksObtained}
                    onChange={e =>
                      handleFormChange('marksObtained', e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Maximum Marks</label>
                  <input
                    disabled
                    value={form.maxMarks}
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

              </div>

              <div className="modal-actions" style={{display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem'}}>
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Update Scores</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodMarks;

