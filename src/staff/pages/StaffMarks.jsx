import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Edit2, X, CheckCircle, Percent,
  AlertTriangle, ArrowLeft, GraduationCap, Save
} from 'lucide-react';
import {
  getStudents,
  getAllMarks,
  createMark,
  getMyFacultyAllocations,
  getExams,
  submitMarksToHod
} from '../../api/index';
import CustomSelect from '../../components/CustomSelect';
import './StaffMarks.css';

const AVATAR_COLORS = ['bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-orange', 'bg-gradient-green', 'bg-gradient-teal'];



// DEPT_SUBJECTS removed as it is fetched from MongoDB
const StaffMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(null);

  // Database states
  const [rawMarksList, setRawMarksList] = useState([]);
  const [students, setStudents] = useState([]);

  const [targetSem, setTargetSem] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [search, setSearch] = useState('');
  
  const [subjectsList, setSubjectsList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examsList, setExamsList] = useState([]);
  const [ciaMarks, setCiaMarks] = useState({});
  const [marksView, setMarksView] = useState('cia');

  // Modal edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', sem: '', subjects: [] });
  const [saved, setSaved] = useState(false);

  const normalizeSem = (semStr) => {
    if (!semStr) return '';
    const num = semStr.replace(/[^0-9]/g, '');
    return num ? `Semester ${num}` : semStr;
  };

  const loadData = async (activeSem = targetSem) => {
    try {
      const [studRes, marksRes, allocRes, examsRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] })),
        getMyFacultyAllocations().catch(() => ({ data: [] })),
        getExams().catch(() => ({ data: [] }))
      ]);

      const backendStudents = Array.isArray(studRes?.data)
        ? studRes.data
        : studRes?.data?.students || [];

      const backendMarks = Array.isArray(marksRes?.data)
        ? marksRes.data
        : marksRes?.data?.marks || [];

      setRawMarksList(backendMarks);

      const allocations = allocRes?.data || [];

      const allExams = Array.isArray(examsRes?.data) ? examsRes.data : [];
      setExamsList(allExams);

      const assignedStudents = backendStudents.filter(student =>
        allocations.some(allocation => {
          const sameSection =
            allocation.sectionId && student.sectionId
              ? String(allocation.sectionId) ===
                String(student.sectionId)
              : String(allocation.section || '')
                  .trim()
                  .toLowerCase() ===
                String(student.section || '')
                  .trim()
                  .toLowerCase();

          const sameSemester =
            normalizeSem(allocation.semester) ===
            normalizeSem(
              student.semester || student.sem
            );

          return sameSection && sameSemester;
        })
      );

      setStudents(assignedStudents);
      const currentSem = normalizeSem(
        activeSem ||
        targetSem ||
        allocations[0]?.semester ||
        ''
      );

      if (!targetSem && currentSem) {
        setTargetSem(currentSem);
      }

      const dynSubjects = [];
      const dynSections = [];
      allocations.forEach(alloc => {
        const normAllocSem = normalizeSem(alloc.semester);
        if ((normAllocSem === currentSem || normAllocSem === normalizeSem(currentSem)) && alloc.subjectId) {
          const subName = alloc.subjectId.subjectName || alloc.subjectId.name;
          if (subName && !dynSubjects.includes(subName)) dynSubjects.push(subName);
          if (alloc.section && !dynSections.includes(alloc.section)) dynSections.push(alloc.section);
        }
      });


      
      setSubjectsList(dynSubjects);
      setSectionsList(dynSections);
      if (!dynSubjects.includes(selectedSubject)) setSelectedSubject(dynSubjects[0]);
      if (!dynSections.includes(targetSection)) setTargetSection(dynSections[0]);
    } catch (err) {
      console.error('Failed to load marks page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('staff_session');
    if (!session) {
      navigate('/staff/login');
      return;
    }

    const activeStaff = JSON.parse(session);
    setStaffSession(activeStaff);
    loadData();
  }, [navigate]);

  const staffDept = staffSession?.dept || staffSession?.department || '';
  const [inlineMarks, setInlineMarks] = useState({});
  const [inlineSaving, setInlineSaving] = useState({});

  useEffect(() => {
    const map = {};

    students.forEach(student => {
      const studentId = student.id || student._id;

      const existing = rawMarksList.find(mark => {
        const markExamId =
          mark.examId?._id ||
          mark.examId ||
          '';

        const sameStudent =
          mark.studentId === studentId ||
          mark.studentName === student.name;

        return (
          sameStudent &&
          String(markExamId) === String(selectedExamId)
        );
      });

      map[studentId] = {
        obtained:
          existing?.marksObtained !== undefined
            ? existing.marksObtained
            : ''
      };
    });

    setInlineMarks(map);
  }, [
    students,
    rawMarksList,
    selectedExamId
  ]);

  const handleInlineChange = (studentId, field, val) => {
    setInlineMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  };



  const selectedExam = examsList.find(
    exam => String(exam._id) === String(selectedExamId)
  );

  const matchesCurrentClass = exam =>
    normalizeSem(exam.sem) === normalizeSem(targetSem) &&
    (!exam.section || exam.section === targetSection) &&
    (
      exam.subject === selectedSubject ||
      exam.subjectId?.subjectName === selectedSubject
    );

  const ciaExams = examsList.filter(
    exam =>
      ['CIA 1', 'CIA 2', 'CIA 3'].includes(
        exam.examType
      ) &&
      exam.status !== 'Cancelled' &&
      matchesCurrentClass(exam)
  );

  const semesterExams = examsList.filter(
    exam =>
      ['Semester', 'Supplementary'].includes(
        exam.examType
      ) &&
      exam.status !== 'Cancelled' &&
      matchesCurrentClass(exam)
  );

  useEffect(() => {
    const nextMarks = {};

    students.forEach(student => {
      const studentId = student.id || student._id;
      nextMarks[studentId] = {};

      ciaExams.forEach(exam => {
        const savedMark = rawMarksList.find(mark => {
          const examId = mark.examId?._id || mark.examId;

          return (
            String(mark.studentId) === String(studentId) &&
            String(examId) === String(exam._id)
          );
        });

        nextMarks[studentId][exam._id] =
          savedMark?.marksObtained ?? '';
      });
    });

    setCiaMarks(nextMarks);
  }, [
    students,
    rawMarksList,
    examsList,
    selectedSubject,
    targetSem,
    targetSection
  ]);

  const handleCiaMarkChange = (
    studentId,
    examId,
    value
  ) => {
    setCiaMarks(previous => ({
      ...previous,
      [studentId]: {
        ...previous[studentId],
        [examId]: value
      }
    }));
  };

  const handleSaveCiaDraft = async () => {
    if (ciaExams.length === 0) {
      alert('No CIA exams are scheduled.');
      return;
    }

    const payload = [];

    for (const student of filteredStudents) {
      const studentId = student.id || student._id;

      for (const exam of ciaExams) {
        const value = ciaMarks[studentId]?.[exam._id];

        if (value === '' || value === undefined) {
          continue;
        }

        const obtained = Number(value);
        const maximum = Number(exam.maxMarks || 20);

        if (obtained < 0 || obtained > maximum) {
          alert(
            `Enter marks between 0 and ${maximum} for ${student.name}.`
          );
          return;
        }

        payload.push({
          examId: exam._id,
          subjectId: exam.subjectId?._id || exam.subjectId,
          academicYearId:
            exam.academicYearId?._id || exam.academicYearId,
          courseId: exam.courseId,
          semesterId: exam.semesterId,
          sectionId: exam.sectionId,
          section: exam.section,
          studentId,
          studentName: student.name,
          registerNo: student.id || student.registerNo,
          department: exam.dept || staffDept,
          semester: exam.sem || targetSem,
          subject:
            exam.subject ||
            exam.subjectId?.subjectName ||
            selectedSubject,
          marksObtained: obtained,
          maxMarks: maximum,
          examType: exam.examType || 'CIA',
          passMarks: Number(
            exam.passMarks || Math.ceil(maximum * 0.4)
          ),
          resultStatus: 'Draft'
        });
      }
    }

    if (payload.length === 0) {
      alert('Enter at least one CIA mark.');
      return;
    }

    try {
      setInlineSaving({ all: true });
      await createMark(payload);
      await loadData();
      alert('CIA marks saved as draft.');
    } catch (error) {
      alert(
        'Failed to save CIA marks: ' +
        (error.response?.data?.message || error.message)
      );
    } finally {
      setInlineSaving({});
    }
  };

  const handleSaveSingleStudent = async student => {
    if (!selectedExam) {
      alert('Please select a CIA / Exam.');
      return;
    }

    const studentId = student.id || student._id;
    const entry = inlineMarks[studentId] || {};
    const obtainedMarks = Number(entry.obtained);
    const maximumMarks = Number(selectedExam.maxMarks || 100);

    if (
      entry.obtained === '' ||
      obtainedMarks < 0 ||
      obtainedMarks > maximumMarks
    ) {
      alert(`Enter marks between 0 and ${maximumMarks}.`);
      return;
    }

    const payload = [{
      examId: selectedExam._id,
      subjectId:
        selectedExam.subjectId?._id ||
        selectedExam.subjectId,
      academicYearId: selectedExam.academicYearId?._id ||
        selectedExam.academicYearId,
      courseId: selectedExam.courseId,
      semesterId: selectedExam.semesterId,
      sectionId: selectedExam.sectionId,
      section: selectedExam.section,
      studentId,
      studentName: student.name,
      registerNo: student.id || student.registerNo,
      department: selectedExam.dept || staffDept,
      semester: selectedExam.sem || targetSem,
      subject:
        selectedExam.subject ||
        selectedExam.subjectId?.subjectName ||
        selectedSubject,
      marksObtained: obtainedMarks,
      maxMarks: maximumMarks,
      examType: selectedExam.examType,
      passMarks: Number(
        selectedExam.passMarks ||
        Math.ceil(maximumMarks * 0.4)
      ),
      resultStatus: 'Draft'
    }];

    try {
      setInlineSaving(previous => ({
        ...previous,
        [studentId]: true
      }));

      await createMark(payload);
      await loadData();

      alert(`Marks saved successfully for ${student.name}`);
    } catch (error) {
      alert(
        'Failed to save marks: ' +
        (error.response?.data?.message || error.message)
      );
    } finally {
      setInlineSaving(previous => ({
        ...previous,
        [studentId]: false
      }));
    }
  };

  const handleSaveAllInline = async () => {
    if (!selectedExam) {
      alert('Please select a CIA / Exam.');
      return;
    }

    const maximumMarks = Number(selectedExam.maxMarks || 100);

    const invalidStudent = filteredStudents.find(student => {
      const studentId = student.id || student._id;
      const value = inlineMarks[studentId]?.obtained;

      return (
        value === '' ||
        Number(value) < 0 ||
        Number(value) > maximumMarks
      );
    });

    if (invalidStudent) {
      alert(
        `Enter marks between 0 and ${maximumMarks} for every student.`
      );
      return;
    }

    const payloadArray = filteredStudents.map(student => {
      const studentId = student.id || student._id;

      return {
        examId: selectedExam._id,
        subjectId:
          selectedExam.subjectId?._id ||
          selectedExam.subjectId,
        academicYearId:
          selectedExam.academicYearId?._id ||
          selectedExam.academicYearId,
        courseId: selectedExam.courseId,
        semesterId: selectedExam.semesterId,
        sectionId: selectedExam.sectionId,
        section: selectedExam.section,
        studentId,
        studentName: student.name,
        registerNo: student.id || student.registerNo,
        department: selectedExam.dept || staffDept,
        semester: selectedExam.sem || targetSem,
        subject:
          selectedExam.subject ||
          selectedExam.subjectId?.subjectName ||
          selectedSubject,
        marksObtained: Number(
          inlineMarks[studentId]?.obtained
        ),
        maxMarks: maximumMarks,
        examType: selectedExam.examType,
        passMarks: Number(
          selectedExam.passMarks ||
          Math.ceil(maximumMarks * 0.4)
        ),
        resultStatus: 'Draft'
      };
    });

    try {
      setInlineSaving({ all: true });
      await createMark(payloadArray);
      await loadData();
      alert('All student marks saved successfully!');
    } catch (error) {
      alert(
        'Failed to save marks: ' +
        (error.response?.data?.message || error.message)
      );
    } finally {
      setInlineSaving({});
    }
  };

  // Filter students to current department and class semester
  let myClassStudents = students.filter(s => {
    const isDeptMatch = !s.dept || s.dept === staffDept || s.dept === 'Computer Science' || s.dept === 'Computer Science Engineering';
    const isSemMatch = !s.sem || normalizeSem(s.sem) === normalizeSem(targetSem);
    const isSecMatch = !s.section || s.section === targetSection;
    return isDeptMatch && isSemMatch && isSecMatch;
  });

  if (myClassStudents.length === 0) {
    myClassStudents = students.filter(s => !s.dept || s.dept === staffDept || s.dept === 'Computer Science' || s.dept === 'Computer Science Engineering');
  }
  
  const filteredStudents = myClassStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
  );

  const getCgpaColor = (c) => c >= 9 ? 'var(--success)' : c < 7 ? 'var(--danger)' : 'var(--warning)';

  const openEdit = async (s) => {
    // Filter by department, semester and target section!
    // Since this is Staff marks entry, only allow editing subjects assigned to them via faculty allocation
    availableSubjects = subjectsList.filter(s => s !== 'No Subjects Assigned');
    
    // If no subjects defined for this semester yet, give an empty array
    if (availableSubjects.length === 0) {
      console.warn('No subjects found for', staffDept, s.sem);
    }

    // Prepare default rows for each allocated subject in this semester
    const studentSubjects = availableSubjects.map(subName => {
      const existingMark = rawMarksList.find(m => m.studentId === s.id && m.subject === subName);
      return {
        subject: subName,
        internal: existingMark?.internalMarks || 0,
        external: existingMark?.semesterMarks || 0
      };
    });

    setForm({
      id: s.id,
      name: s.name,
      sem: s.sem,
      availableSubjects,
      subjects: studentSubjects.length > 0 ? studentSubjects : [{ subject: '', internal: 0, external: 0 }]
    });
    setEditTarget(s.id);
    setSaved(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSubjectChange = (idx, field, value) => {
    const updatedSubjects = [...form.subjects];
    updatedSubjects[idx][field] = value;
    setForm({ ...form, subjects: updatedSubjects });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      // Filter out empty subjects
      const validSubjects = form.subjects.filter(sub => sub.subject && sub.subject.trim() !== '');
      if (validSubjects.length === 0) {
        alert('Please enter at least one subject name.');
        return;
      }

      const payloadArray = validSubjects.map(sub => ({
        studentId: form.id,
        studentName: form.name,
        department: staffDept,
        semester: form.sem,
        subject: sub.subject,
        internalMarks: Number(sub.internal),
        semesterMarks: Number(sub.external)
      }));

      // Bulk POST to save all marks at once
      const res = await createMark(payloadArray);

      if (res?.status === 200 || res?.status === 201) {
        setSaved(true);
        await loadData();
        setTimeout(() => {
          closeModal();
          setSaved(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to bulk update student marks:', err);
    }
  };

  const getStudentCiaStatus = (student) => {
    const studentId = student.id || student._id;

    const statuses = ciaExams
      .map(exam => {
        const mark = rawMarksList.find(m => {
          const examId = m.examId?._id || m.examId;

          return (
            String(m.studentId) === String(studentId) &&
            String(examId) === String(exam._id)
          );
        });

        return mark?.resultStatus;
      })
      .filter(Boolean);

    if (statuses.length === ciaExams.length && statuses.every(status => status === 'Approved')) {
      return 'Approved';
    }

    if (statuses.some(status => status === 'Submitted')) {
      return 'Submitted';
    }

    return 'Draft';
  };

  const handleSubmitToHod = async () => {
    const examsWithMarks = ciaExams.filter(exam =>
      filteredStudents.some(student => {
        const studentId = student.id || student._id;
        const value = ciaMarks[studentId]?.[exam._id];
        return value !== '' && value !== undefined;
      })
    );

    if (examsWithMarks.length === 0) {
      alert('Save at least one CIA mark first.');
      return;
    }

    const confirmed = window.confirm(
      'Submit all saved CIA marks to the HOD?'
    );

    if (!confirmed) return;

    try {
      for (const exam of examsWithMarks) {
        await submitMarksToHod(exam._id);
      }

      await loadData();
      alert('CIA marks submitted to HOD successfully.');
    } catch (error) {
      alert(
        'Unable to submit CIA marks: ' +
        (error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <div className="marks-management-staff animate-fade-in">
      <div className="page-header-staff">
        <div className="header-left">
          
          <div>
            <h1>Upload Marks</h1>
            <p className="text-muted">Enter marks for the selected CIA or semester examination.</p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <button
          type="button"
          className={
            marksView === 'cia'
              ? 'btn-primary'
              : 'btn-secondary'
          }
          onClick={() => setMarksView('cia')}
        >
          CIA Marks Entry
        </button>

        <button
          type="button"
          className={
            marksView === 'semester'
              ? 'btn-primary'
              : 'btn-secondary'
          }
          onClick={() => setMarksView('semester')}
        >
          Semester Results
        </button>
      </div>

      {/* Marks Directory Table */}
      {marksView === 'cia' && (
        <div className="glass-card table-section-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-filters-bar" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Student Marks Roster</h3>
            <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.82rem' }}>Department of {staffDept}</p>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Semester</label>
              <select 
                value={targetSem} 
                onChange={e => {
                  setTargetSem(e.target.value);
                  loadData(e.target.value);
                }} 
                style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
              >
                {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            

            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Subject</label>
              <select 
                value={selectedSubject} 
                onChange={e => setSelectedSubject(e.target.value)} 
                style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
              >
                {subjectsList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                  display: 'block'
                }}
              >
                CIA / Exam
              </label>

              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                style={{
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
                required
              >
                <option value="">Select CIA / Exam</option>

                {examsList
                  .filter(exam =>
                    exam.status !== 'Cancelled' &&
                    normalizeSem(exam.sem) === normalizeSem(targetSem) &&
                    (!exam.section || exam.section === targetSection) &&
                    (
                      exam.subject === selectedSubject ||
                      exam.subjectId?.subjectName === selectedSubject
                    )
                  )
                  .map(exam => (
                    <option key={exam._id} value={exam._id}>
                      {exam.name} — {exam.examType} ({exam.maxMarks} Marks)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Search</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} size={16} />
                <input 
                  type="text"
                  placeholder="Search students..." 
                  style={{ padding: '0.5rem 0.8rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Subject: <strong style={{ color: 'var(--primary)' }}>{selectedSubject || 'No subject assigned'}</strong> ({filteredStudents.length} Students)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="btn-primary" 
              onClick={handleSaveCiaDraft}
              disabled={inlineSaving.all}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} /> {inlineSaving.all ? 'Saving Draft...' : 'Save Draft'}
            </button>

            {filteredStudents.some(
              student => getStudentCiaStatus(student) !== 'Approved'
            ) && (
              <button
                className="btn-primary"
                type="button"
                onClick={handleSubmitToHod}
                disabled={inlineSaving.all || ciaExams.length === 0}
                style={{
                  padding: '0.4rem 1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#16a34a'
                }}
              >
                <CheckCircle size={15} />
                Submit to HOD
              </button>
            )}
          </div>
        </div>

        <div className="table-container-attendance">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Register No</th>
                <th>Student Name</th>

                {ciaExams.map(exam => (
                  <th key={exam._id}>
                    {exam.examType}
                    <div>Max {exam.maxMarks}</div>
                  </th>
                ))}

                <th>Average</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const studentId = student.id || student._id;

                const enteredPercentages = ciaExams
                  .map(exam => {
                    const value = ciaMarks[studentId]?.[exam._id];

                    if (value === '' || value === undefined) {
                      return null;
                    }

                    const maximum = Number(exam.maxMarks || 20);

                    return maximum > 0
                      ? (Number(value) / maximum) * 100
                      : 0;
                  })
                  .filter(value => value !== null);

                const average = enteredPercentages.length
                  ? Math.round(
                      enteredPercentages.reduce(
                        (sum, value) => sum + value,
                        0
                      ) / enteredPercentages.length
                    )
                  : 0;

                return (
                  <tr key={studentId}>
                    <td>{index + 1}</td>

                    <td>
                      <span className="register-no-badge">
                        {student.id || student.registerNo}
                      </span>
                    </td>

                    <td>
                      <strong>{student.name}</strong>
                    </td>

                    {ciaExams.map(exam => (
                      <td key={exam._id}>
                        <input
                          type="number"
                          min="0"
                          max={exam.maxMarks}
                          value={
                            ciaMarks[studentId]?.[exam._id] ?? ''
                          }
                          placeholder={`0 - ${exam.maxMarks}`}
                          onChange={event =>
                            handleCiaMarkChange(
                              studentId,
                              exam._id,
                              event.target.value
                            )
                          }
                          style={{
                            width: '90px',
                            padding: '0.4rem 0.6rem'
                          }}
                        />
                      </td>
                    ))}

                    <td>
                      <strong>{average}%</strong>
                    </td>

                    <td>
                      {getStudentCiaStatus(student) === 'Approved' ? (
                        <span
                          style={{
                            color: 'var(--success)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle size={15} />
                          Approved
                        </span>
                      ) : getStudentCiaStatus(student) === 'Submitted' ? (
                        <span style={{ color: 'var(--warning)', fontWeight: 700 }}>
                          Submitted
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                          Draft
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2>{form.name} - Marks Entry</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  Register No: {form.id} | Class: {form.sem}
                </p>
              </div>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>

            {saved && (
              <div className="modal-success-flash" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={18} /> All semester marks successfully saved!
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="table-container-attendance" style={{ margin: '0', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ minWidth: '100%', marginBottom: '1rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ backgroundColor: 'var(--surface-color)' }}>Subject</th>
                      <th style={{ backgroundColor: 'var(--surface-color)' }}>Internal (Max 50)</th>
                      <th style={{ backgroundColor: 'var(--surface-color)' }}>External (Max 100)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.subjects.map((sub, idx) => (
                      <tr key={idx}>
                        <td>
                          {form.availableSubjects && form.availableSubjects.length > 0 ? (
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', padding: '0.4rem 0' }}>
                              {sub.subject || 'Unknown Subject'}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--danger)', fontStyle: 'italic', padding: '0.4rem 0' }}>
                              No master subjects defined
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            required
                            disabled={!(form.availableSubjects && form.availableSubjects.length > 0)}
                            style={{ width: '80px', padding: '0.4rem' }}
                            value={sub.internal}
                            onChange={e => handleSubjectChange(idx, 'internal', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            disabled={!(form.availableSubjects && form.availableSubjects.length > 0)}
                            style={{ width: '80px', padding: '0.4rem' }}
                            value={sub.external}
                            onChange={e => handleSubjectChange(idx, 'external', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary"><Save size={16} /> Save All Marks</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMarks;
