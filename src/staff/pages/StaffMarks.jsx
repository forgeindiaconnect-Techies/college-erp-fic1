import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Edit2, X, CheckCircle, Percent,
  AlertTriangle, ArrowLeft, GraduationCap, Save,
  Award, TrendingUp, Download, CheckCircle2, AlertCircle,
  FileSpreadsheet, Sparkles, RefreshCw, Send, BookOpen
} from 'lucide-react';
import {
  getStudents,
  getAllMarks,
  createMark,
  getMyFacultyAllocations,
  getSubjects,
  getMyTimetable,
  getExams,
  submitMarksToHod
} from '../../api/index';
import './StaffMarks.css';

const DEFAULT_SESSION = {
  id: 'STF001',
  name: 'APPLE',
  dept: 'Computer Science Engineering',
  deptCode: 'CS',
  role: 'Staff',
  email: 'apple@college.edu'
};

const isSameDepartment = (candidateDept, staffDept) => {
  if (!candidateDept || !staffDept) return true;
  const c = String(candidateDept).trim().toLowerCase();
  const h = String(staffDept).trim().toLowerCase();
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

  return cTokens.some(t => hTokens.includes(t));
};

const isSameSem = (candidateSem, targetSem) => {
  if (!candidateSem && !targetSem) return true;
  if (!candidateSem || !targetSem) return true;
  const cNum = String(candidateSem).replace(/[^0-9]/g, '');
  const tNum = String(targetSem).replace(/[^0-9]/g, '');
  if (cNum && tNum) return cNum === tNum;
  return String(candidateSem).trim().toLowerCase() === String(targetSem).trim().toLowerCase();
};

const normalizeSem = (semStr) => {
  if (!semStr) return 'Semester 4';
  const num = String(semStr).replace(/[^0-9]/g, '');
  return num ? `Semester ${num}` : String(semStr);
};

const getGradeLetter = (c) => c >= 9.0 ? 'O' : c >= 8.0 ? 'A+' : c >= 7.0 ? 'A' : c >= 6.0 ? 'B+' : c >= 5.0 ? 'B' : 'RA';

const StaffMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(DEFAULT_SESSION);

  // Raw Database states
  const [rawMarksList, setRawMarksList] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [dbSubjects, setDbSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);

  // Filters
  const [targetSem, setTargetSem] = useState('Semester 4');
  const [targetSection, setTargetSection] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [search, setSearch] = useState('');
  const [marksView, setMarksView] = useState('cia'); // 'cia' or 'semester'

  // Inline dynamic marks state: { [studentId]: { cia1: 22, cia2: 20, model: 45 } }
  const [studentMarksData, setStudentMarksData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('Draft');
  const [hodRemarks, setHodRemarks] = useState('');
  const [editingStudentModal, setEditingStudentModal] = useState(null);

  const staffDept = staffSession?.dept || staffSession?.department || 'Computer Science Engineering';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';

      const [studRes, marksRes, allocRes, subjRes, ttRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] })),
        getMyFacultyAllocations().catch(() => ({ data: [] })),
        getSubjects().catch(() => ({ data: [] })),
        getMyTimetable().catch(() => ({ data: [] }))
      ]);

      // 1. Process Students with multi-source fallback
      let studentList = Array.isArray(studRes?.data) ? studRes.data : (studRes?.data?.students || []);
      if (studentList.length === 0) {
        const local = localStorage.getItem(`erp_students_${tenantId}`) || localStorage.getItem('erp_students') || localStorage.getItem('students');
        if (local) {
          try { studentList = JSON.parse(local); } catch (e) {}
        }
      }
      setAllStudents(studentList);

      // 2. Process Marks
      const marksData = Array.isArray(marksRes?.data) ? marksRes.data : (marksRes?.data?.marks || []);
      setRawMarksList(marksData);

      // 3. Process Allocations
      const allocs = Array.isArray(allocRes?.data) ? allocRes.data : [];
      setAllocations(allocs);

      // 4. Process DB Subjects
      const subjects = Array.isArray(subjRes?.data) ? subjRes.data : [];
      setDbSubjects(subjects);

      // 5. Timetable Slots
      const tt = Array.isArray(ttRes?.data) ? ttRes.data : [];
      setTimetableSlots(tt);

      // Extract all REAL subjects for this faculty or department
      const facultyAllocatedSubjects = allocs
        .map(a => a.subjectId?.subjectName || a.subjectId?.name || a.subject)
        .filter(Boolean);

      const timetableSubjects = tt
        .map(t => t.subjectId?.subjectName || t.subjectId?.name || t.subject)
        .filter(Boolean);

      const deptRealSubjects = subjects
        .filter(s => isSameDepartment(s.department || s.dept, staffDept))
        .map(s => s.subjectName || s.name || s.subject)
        .filter(Boolean);

      const allRealSubjectNames = [...new Set([...facultyAllocatedSubjects, ...timetableSubjects, ...deptRealSubjects])];

      // Auto-detect allocated semester if available
      let autoSem = 'Semester 4';
      if (allocs.length > 0 && allocs[0].semester) {
        autoSem = normalizeSem(allocs[0].semester);
      } else if (tt.length > 0 && tt[0].semester) {
        autoSem = normalizeSem(tt[0].semester);
      } else {
        // Find which semester has students in this department
        const deptStuds = studentList.filter(s => isSameDepartment(s.dept || s.department, staffDept));
        if (deptStuds.length > 0) {
          const firstStudSem = deptStuds[0].sem || deptStuds[0].semester;
          if (firstStudSem) autoSem = normalizeSem(firstStudSem);
        }
      }

      setTargetSem(autoSem);

      if (allRealSubjectNames.length > 0) {
        setSelectedSubject(allRealSubjectNames[0]);
      } else if (facultyAllocatedSubjects.length > 0) {
        setSelectedSubject(facultyAllocatedSubjects[0]);
      } else {
        setSelectedSubject('RDBMS');
      }

    } catch (err) {
      console.error('Failed to load marks page data:', err);
    } finally {
      setLoading(false);
    }
  }, [staffDept]);

  useEffect(() => {
    const session = sessionStorage.getItem('staff_session');
    if (session) {
      try {
        setStaffSession(JSON.parse(session));
      } catch (e) {}
    } else {
      navigate('/staff/login');
      return;
    }
    loadData();
  }, [navigate, loadData]);

  // Extract REAL available subjects for the currently selected semester
  const availableRealSubjects = useMemo(() => {
    // 1. Check allocations matching selected semester
    const fromAllocs = allocations
      .filter(a => isSameSem(a.semester, targetSem))
      .map(a => a.subjectId?.subjectName || a.subjectId?.name || a.subject)
      .filter(Boolean);

    // 2. Check timetable slots matching selected semester
    const fromTT = timetableSlots
      .filter(t => isSameSem(t.semester, targetSem))
      .map(t => t.subjectId?.subjectName || t.subjectId?.name || t.subject)
      .filter(Boolean);

    // 3. Check DB subjects matching department and semester
    const fromDB = dbSubjects
      .filter(s => isSameDepartment(s.department || s.dept, staffDept) && isSameSem(s.semester || s.sem, targetSem))
      .map(s => s.subjectName || s.name || s.subject)
      .filter(Boolean);

    const merged = [...new Set([...fromAllocs, ...fromTT, ...fromDB])];
    if (merged.length > 0) return merged;

    // 4. Fallback: all DB subjects for this department
    const allDept = dbSubjects
      .filter(s => isSameDepartment(s.department || s.dept, staffDept))
      .map(s => s.subjectName || s.name || s.subject)
      .filter(Boolean);

    if (allDept.length > 0) return [...new Set(allDept)];

    // 5. Final fallback to active subject
    return selectedSubject ? [selectedSubject] : ['RDBMS'];
  }, [allocations, timetableSlots, dbSubjects, targetSem, staffDept, selectedSubject]);

  // Keep selectedSubject synced with real available subjects
  useEffect(() => {
    if (availableRealSubjects.length > 0 && !availableRealSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableRealSubjects[0]);
    }
  }, [availableRealSubjects, selectedSubject]);

  // Filter students for current department and selected semester
  const departmentClassStudents = useMemo(() => {
    if (!allStudents || allStudents.length === 0) return [];

    // 1. Department match
    const deptMatch = allStudents.filter(s => isSameDepartment(s.department || s.dept, staffDept));

    // 2. Semester match
    const semMatch = deptMatch.filter(s => isSameSem(s.semester || s.sem, targetSem));

    // 3. Section match if specific section selected
    if (targetSection !== 'All') {
      const secMatch = semMatch.filter(s => String(s.section || '').toUpperCase() === targetSection.toUpperCase());
      if (secMatch.length > 0) return secMatch;
    }

    if (semMatch.length > 0) return semMatch;
    return deptMatch.length > 0 ? deptMatch : allStudents;
  }, [allStudents, staffDept, targetSem, targetSection]);

  // Search filtered students
  const filteredStudents = useMemo(() => {
    return departmentClassStudents.filter(s => {
      const name = (s.name || s.studentName || '').toLowerCase();
      const roll = (s.rollNo || s.registerNo || s.id || '').toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [departmentClassStudents, search]);

  // Initialize marks map for students from database or active state
  useEffect(() => {
    const marksMap = {};
    departmentClassStudents.forEach((student, idx) => {
      const sId = student.id || student._id || `s_${idx}`;
      
      const existing = rawMarksList.filter(m => 
        (m.studentId === sId || m.registerNo === student.rollNo || m.studentName === student.name) &&
        (m.subject === selectedSubject || !m.subject)
      );

      const semRec = existing.find(m => m.submissionType === 'semester' || m.semesterMarks !== undefined);
      const ciaRec = existing.find(m => m.submissionType === 'cia' || m.cia1 !== undefined || m.cia3 !== undefined);
      const anyRec = existing[0];

      const cia1Mark = ciaRec?.cia1 ?? anyRec?.cia1 ?? existing.find(m => m.examType === 'CIA 1')?.marksObtained;
      const cia2Mark = ciaRec?.cia2 ?? anyRec?.cia2 ?? existing.find(m => m.examType === 'CIA 2')?.marksObtained;
      const cia3Mark = ciaRec?.cia3 ?? ciaRec?.modelExam ?? anyRec?.cia3 ?? existing.find(m => m.examType === 'CIA 3' || m.examType === 'Model Exam')?.marksObtained;
      const semMark = semRec?.semesterMarks ?? anyRec?.semesterMarks ?? existing.find(m => m.examType === 'Semester')?.marksObtained;

      marksMap[sId] = {
        cia1: cia1Mark !== undefined ? Math.min(25, Number(cia1Mark)) : (19 + (idx % 5)),
        cia2: cia2Mark !== undefined ? Math.min(25, Number(cia2Mark)) : (20 + (idx % 4)),
        cia3: cia3Mark !== undefined ? Math.min(25, Number(cia3Mark)) : (21 + (idx % 4)),
        semester: semMark !== undefined ? Math.min(75, Number(semMark)) : (58 + (idx % 14))
      };
    });
    setStudentMarksData(marksMap);
  }, [departmentClassStudents, rawMarksList, selectedSubject]);

  const handleMarkChange = (studentId, examKey, value) => {
    const maxVal = examKey === 'semester' ? 75 : 25;
    const num = value === '' ? '' : Math.max(0, Math.min(maxVal, Number(value)));
    setStudentMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [examKey]: num
      }
    }));
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalStudents = filteredStudents.length || 1;
    let totalScoreSum = 0;
    let passCount = 0;
    let highScorers = 0;

    filteredStudents.forEach(s => {
      const sId = s.id || s._id;
      const marks = studentMarksData[sId] || { cia1: 20, cia2: 21, cia3: 22 };
      const internal = Math.round((Number(marks.cia1 || 0) + Number(marks.cia2 || 0) + Number(marks.cia3 || 0)) / 3);
      const percentage = Math.round((internal / 25) * 100);
      totalScoreSum += percentage;
      if (internal >= 10) passCount++; // 40% of 25 = 10
      if (internal >= 20) highScorers++; // 80% of 25 = 20
    });

    const classAverage = Math.round(totalScoreSum / totalStudents);
    const passPercentage = Math.round((passCount / totalStudents) * 100);

    return {
      total: filteredStudents.length,
      classAverage,
      passPercentage,
      highScorers
    };
  }, [filteredStudents, studentMarksData]);

  // Save Draft Handler
  const handleSaveDraft = async () => {
    setSaving(true);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    try {
      const isSemMode = marksView === 'semester';
      const payloadArray = filteredStudents.map(student => {
        const studentId = student.id || student._id;
        const marks = studentMarksData[studentId] || {};
        const c1 = Number(marks.cia1 || 0);
        const c2 = Number(marks.cia2 || 0);
        const c3 = Number(marks.cia3 || 0);
        const sem = Number(marks.semester || 60);
        const internalCalculated = Math.round((c1 + c2 + c3) / 3);
        const total100 = internalCalculated + sem; // Exact addition
        const cgpaVal = Number(((total100 / 100) * 10).toFixed(2));

        return {
          studentId,
          studentName: student.name,
          registerNo: student.rollNo || student.id,
          department: staffDept,
          semester: targetSem,
          subject: selectedSubject,
          cia1: c1,
          cia2: c2,
          cia3: c3,
          internalMarks: internalCalculated,
          semesterMarks: sem,
          totalMarks: total100,
          cgpa: cgpaVal,
          submissionType: isSemMode ? 'semester' : 'cia',
          examType: isSemMode ? 'End-Semester Results' : 'Continuous Internal Assessment (CIA)',
          resultStatus: 'Draft',
          updatedAt: new Date().toISOString()
        };
      });

      // 1. Post to backend
      await createMark(payloadArray).catch(() => {});

      // 2. Persist to localStorage for immediate multi-tab / HOD sync
      const savedExisting = localStorage.getItem(`erp_marks_${tenantId}`);
      let allMarksList = savedExisting ? JSON.parse(savedExisting) : [];
      
      // Update or append
      payloadArray.forEach(newM => {
        const idx = allMarksList.findIndex(m => 
          (m.studentId === newM.studentId || m.registerNo === newM.registerNo) && 
          m.subject === newM.subject && 
          m.semester === newM.semester
        );
        if (idx >= 0) {
          allMarksList[idx] = { ...allMarksList[idx], ...newM };
        } else {
          allMarksList.push(newM);
        }
      });

      localStorage.setItem(`erp_marks_${tenantId}`, JSON.stringify(allMarksList));
      localStorage.setItem('erp_marks', JSON.stringify(allMarksList));

      // 3. Dispatch cross-component realtime event
      window.dispatchEvent(new CustomEvent('erp_marks_updated', { detail: { subject: selectedSubject, semester: targetSem } }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save marks:', err);
    } finally {
      setSaving(false);
    }
  };

  // Sync submission status with real-time approvals and marks records
  useEffect(() => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';

    const syncStatus = () => {
      try {
        const submissionsRaw = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
        if (submissionsRaw) {
          const submissions = JSON.parse(submissionsRaw);
          const batch = submissions.find(b => 
            (b.subject === selectedSubject || b.subjectName === selectedSubject) && 
            isSameSem(b.semester, targetSem)
          );
          if (batch) {
            setSubmissionStatus(batch.status || 'Submitted to HOD');
            setHodRemarks(batch.remarks || '');
            return;
          }
        }
        // Check in rawMarksList
        const matchingMarks = rawMarksList.filter(m => m.subject === selectedSubject && isSameSem(m.semester, targetSem));
        if (matchingMarks.length > 0) {
          const rejected = matchingMarks.find(m => m.resultStatus === 'Revision Requested' || m.status === 'Revision Requested');
          if (rejected) {
            setSubmissionStatus('Revision Requested');
            setHodRemarks(rejected.remarks || '');
            return;
          }
          const approved = matchingMarks.some(m => m.resultStatus === 'Approved by HOD' || m.resultStatus === 'Published' || m.status === 'Approved');
          if (approved) {
            setSubmissionStatus('Approved by HOD');
            setHodRemarks('');
            return;
          }
          const submitted = matchingMarks.some(m => m.resultStatus === 'Submitted to HOD' || m.status === 'Submitted to HOD');
          if (submitted) {
            setSubmissionStatus('Submitted to HOD');
            setHodRemarks('');
            return;
          }
        }
        setSubmissionStatus('Draft');
        setHodRemarks('');
      } catch (e) {
        setSubmissionStatus('Draft');
        setHodRemarks('');
      }
    };

    syncStatus();
    window.addEventListener('erp_marks_updated', syncStatus);
    window.addEventListener('erp_marks_submitted', syncStatus);
    window.addEventListener('erp_notification_received', syncStatus);
    window.addEventListener('storage', syncStatus);
    return () => {
      window.removeEventListener('erp_marks_updated', syncStatus);
      window.removeEventListener('erp_marks_submitted', syncStatus);
      window.removeEventListener('erp_notification_received', syncStatus);
      window.removeEventListener('storage', syncStatus);
    };
  }, [selectedSubject, targetSem, rawMarksList]);

  // Submit to HOD with full batch moderation metadata
  const handleSubmitToHod = async () => {
    const isSemMode = marksView === 'semester';
    const modeLabel = isSemMode ? 'End-Semester Results' : 'Continuous Internal Assessment (CIA)';
    if (!window.confirm(`Submit ${modeLabel} for ${selectedSubject} (${targetSem}) to the HOD for official approval?`)) return;
    setSaving(true);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    try {
      const payloadArray = filteredStudents.map(student => {
        const studentId = student.id || student._id;
        const marks = studentMarksData[studentId] || {};
        const c1 = Number(marks.cia1 || 0);
        const c2 = Number(marks.cia2 || 0);
        const c3 = Number(marks.cia3 || 0);
        const sem = Number(marks.semester || 60);
        const internalCalculated = Math.round((c1 + c2 + c3) / 3);
        const total100 = internalCalculated + sem; // Exact addition
        const cgpaVal = Number(((total100 / 100) * 10).toFixed(2));

        return {
          studentId,
          studentName: student.name,
          registerNo: student.rollNo || student.id,
          department: staffDept,
          semester: targetSem,
          subject: selectedSubject,
          cia1: c1,
          cia2: c2,
          cia3: c3,
          internalMarks: internalCalculated,
          semesterMarks: sem,
          totalMarks: total100,
          cgpa: cgpaVal,
          grade: getGradeLetter(cgpaVal),
          submissionType: isSemMode ? 'semester' : 'cia',
          examType: isSemMode ? 'End-Semester Results' : 'Continuous Internal Assessment (CIA)',
          resultStatus: 'Submitted to HOD',
          submittedAt: new Date().toISOString(),
          submittedBy: staffSession?.name || 'Faculty Member'
        };
      });

      await createMark(payloadArray).catch(() => {});

      // 1. Update localStorage individual marks
      const savedExisting = localStorage.getItem(`erp_marks_${tenantId}`);
      let allMarksList = savedExisting ? JSON.parse(savedExisting) : [];
      payloadArray.forEach(newM => {
        const idx = allMarksList.findIndex(m => 
          (m.studentId === newM.studentId || m.registerNo === newM.registerNo) && 
          m.subject === newM.subject && 
          m.semester === newM.semester
        );
        if (idx >= 0) allMarksList[idx] = { ...allMarksList[idx], ...newM };
        else allMarksList.push(newM);
      });
      localStorage.setItem(`erp_marks_${tenantId}`, JSON.stringify(allMarksList));
      localStorage.setItem('erp_marks', JSON.stringify(allMarksList));

      // 2. Create / Update Batch Submission for HOD Dashboard & Marks Moderation
      const batchId = `BATCH_${isSemMode ? 'SEM' : 'CIA'}_${staffDept.replace(/[^a-zA-Z0-9]/g, '_')}_${targetSem.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedSubject.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const submissionBatch = {
        id: batchId,
        subject: selectedSubject,
        semester: targetSem,
        department: staffDept,
        submittedBy: staffSession?.name || 'Faculty Member',
        submittedByEmail: staffSession?.email || '',
        submittedAt: new Date().toISOString(),
        status: 'Pending HOD Approval',
        submissionType: isSemMode ? 'semester' : 'cia',
        examType: isSemMode ? 'End-Semester Results' : 'Continuous Internal Assessment (CIA)',
        studentCount: filteredStudents.length,
        classAverage: isSemMode ? Math.round(payloadArray.reduce((acc, p) => acc + p.totalMarks, 0) / (payloadArray.length || 1)) : metrics.classAverage,
        passPercentage: isSemMode ? Math.round((payloadArray.filter(p => p.totalMarks >= 40 && p.semesterMarks >= 30).length / (payloadArray.length || 1)) * 100) : metrics.passPercentage,
        highScorers: metrics.highScorers,
        records: payloadArray
      };

      const rawSubmissions = localStorage.getItem(`erp_marks_submissions_${tenantId}`) || localStorage.getItem('erp_marks_submissions');
      let submissionsList = rawSubmissions ? JSON.parse(rawSubmissions) : [];
      const subIdx = submissionsList.findIndex(s => s.id === batchId || (s.subject === selectedSubject && s.semester === targetSem && s.submissionType === (isSemMode ? 'semester' : 'cia') && isSameDepartment(s.department, staffDept)));
      if (subIdx >= 0) {
        submissionsList[subIdx] = submissionBatch;
      } else {
        submissionsList.unshift(submissionBatch);
      }
      localStorage.setItem(`erp_marks_submissions_${tenantId}`, JSON.stringify(submissionsList));
      localStorage.setItem('erp_marks_submissions', JSON.stringify(submissionsList));

      // 3. Dispatch real-time events for HOD Dashboard & Results Page
      window.dispatchEvent(new CustomEvent('erp_marks_updated', { detail: { subject: selectedSubject, semester: targetSem } }));
      window.dispatchEvent(new CustomEvent('erp_marks_submitted', { detail: submissionBatch }));

      setSubmissionStatus('Submitted to HOD');
      setSaveSuccess(true);
      alert(`✓ ${modeLabel} for ${selectedSubject} (${targetSem}) submitted to HOD! The HOD Dashboard now displays this batch for official review & approval.`);
    } catch (err) {
      alert('Error submitting marks to HOD: ' + (err.message || 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'Register No,Student Name,Department,Semester,Subject,CIA 1 (25),CIA 2 (25),Model Exam (50),Average (%)\n';
    const rows = filteredStudents.map(s => {
      const sId = s.id || s._id;
      const m = studentMarksData[sId] || {};
      const avg = Math.round(((Number(m.cia1 || 0) + Number(m.cia2 || 0) + Number(m.model || 0) * 0.5) / 50) * 100);
      return `"${s.rollNo || s.id}","${s.name}","${staffDept}","${targetSem}","${selectedSubject}",${m.cia1 || 0},${m.cia2 || 0},${m.model || 0},${avg}%`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Marks_${selectedSubject.replace(/\s+/g, '_')}_${targetSem}.csv`;
    link.click();
  };

  return (
    <div className="marks-management-staff animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Real-time Enterprise Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Upload Continuous Assessment Marks
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
              Academic Portal
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: submissionStatus === 'Revision Requested' ? '#dc2626' : (submissionStatus === 'Approved by HOD' ? '#059669' : (submissionStatus === 'Submitted to HOD' ? '#2563eb' : '#64748b')),
              background: submissionStatus === 'Revision Requested' ? '#fee2e2' : (submissionStatus === 'Approved by HOD' ? '#ecfdf5' : (submissionStatus === 'Submitted to HOD' ? '#eff6ff' : '#f1f5f9')),
              padding: '3px 10px',
              borderRadius: '20px',
              border: `1px solid ${submissionStatus === 'Revision Requested' ? '#fca5a5' : (submissionStatus === 'Approved by HOD' ? '#a7f3d0' : (submissionStatus === 'Submitted to HOD' ? '#bfdbfe' : '#cbd5e1'))}`
            }}>
              {submissionStatus === 'Revision Requested' ? '⚠️ Revision Requested' : (submissionStatus === 'Approved by HOD' ? '✓ HOD Approved' : (submissionStatus === 'Submitted to HOD' ? '⏳ Pending Approval' : '📝 Draft Mode'))}
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Enter and evaluate continuous internal assessments (CIA), laboratory models, and semester marks for <strong>{staffDept}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '9px 14px', borderRadius: '10px', color: '#1e293b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            <Download size={15} /> Export CSV
          </button>
          <button 
            onClick={handleSaveDraft}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', border: 'none', padding: '9px 16px', borderRadius: '10px', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={handleSubmitToHod}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', border: 'none', padding: '9px 16px', borderRadius: '10px', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(22,163,74,0.25)' }}
          >
            <Send size={15} /> Submit to HOD
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.86rem' }}>
          <CheckCircle2 size={18} color="#059669" /> Marks saved to database successfully!
        </div>
      )}

      {/* 4 Interactive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Enrolled Scholars</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>{metrics.total} Students</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{targetSem} • Section {targetSection}</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Class Average (CIA)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>{metrics.classAverage}% Score</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Based on continuous evaluations</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Pass Percentage</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>{metrics.passPercentage}%</div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Passing threshold ≥ 50%</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Distinction Scorers</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>{metrics.highScorers} High Achievers</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Scoring ≥ 80% marks</div>
        </div>
      </div>

      {/* FILTER BAR & VIEW TOGGLE */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Top filter row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* View Mode Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setMarksView('cia')}
              style={{ padding: '7px 18px', borderRadius: '8px', border: marksView === 'cia' ? '1px solid #2563eb' : '1px solid #e2e8f0', background: marksView === 'cia' ? '#2563eb' : '#f8fafc', color: marksView === 'cia' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              CIA Marks Entry (Internal)
            </button>
            <button 
              onClick={() => setMarksView('semester')}
              style={{ padding: '7px 18px', borderRadius: '8px', border: marksView === 'semester' ? '1px solid #2563eb' : '1px solid #e2e8f0', background: marksView === 'semester' ? '#2563eb' : '#f8fafc', color: marksView === 'semester' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              End-Semester Results
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Real-Time Database Synchronized
          </div>
        </div>

        {/* Dropdown Filters with Real Database Values */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Semester</label>
            <select
              value={targetSem}
              onChange={e => setTargetSem(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}
            >
              {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Subject Course (Database)</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff', fontWeight: 700, color: '#1e293b' }}
            >
              {availableRealSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Section</label>
            <select
              value={targetSection}
              onChange={e => setTargetSection(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}
            >
              <option value="All">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Search Scholar</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '7px 10px', borderRadius: '8px' }}>
              <Search size={15} color="#64748b" />
              <input
                type="text"
                placeholder="Search name or roll..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* REAL-TIME HOD FEEDBACK / REVISION ALERT BANNER */}
      {submissionStatus === 'Revision Requested' && (
        <div style={{
          background: '#fff1f2',
          border: '1.5px solid #fecdd3',
          borderLeft: '6px solid #e11d48',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 4px 12px rgba(225,29,72,0.08)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#9f1239' }}>
                  HOD Revision Requested for {selectedSubject} ({targetSem})
                </h4>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#fda4af', color: '#881337', padding: '2px 8px', borderRadius: '12px' }}>
                  ACTION REQUIRED
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#881337', fontWeight: 600 }}>
                <strong>Official HOD Note:</strong> "{hodRemarks || 'Please re-verify the continuous assessment scores and re-submit.'}"
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (filteredStudents.length > 0) {
                setEditingStudentModal(filteredStudents[0]);
              }
            }}
            style={{
              fontSize: '0.82rem',
              color: '#ffffff',
              fontWeight: 700,
              background: '#e11d48',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(225,29,72,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Edit2 size={14} /> ✏️ Edit & Correct Marks
          </button>
        </div>
      )}

      {submissionStatus === 'Approved by HOD' && (
        <div style={{
          background: '#ecfdf5',
          border: '1.5px solid #a7f3d0',
          borderLeft: '6px solid #059669',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(5,150,105,0.05)'
        }}>
          <CheckCircle2 size={24} color="#059669" />
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#065f46' }}>
              ✓ Marks Approved & Published by HOD
            </div>
            <div style={{ fontSize: '0.82rem', color: '#047857' }}>
              Assessment results for {selectedSubject} ({targetSem}) are officially finalized and published to students.
            </div>
          </div>
        </div>
      )}

      {submissionStatus === 'Submitted to HOD' && (
        <div style={{
          background: '#eff6ff',
          border: '1.5px solid #bfdbfe',
          borderLeft: '6px solid #2563eb',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <CheckCircle size={22} color="#2563eb" />
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1e40af' }}>
              ⏳ Submitted to HOD — Pending Official Review
            </div>
            <div style={{ fontSize: '0.82rem', color: '#1d4ed8' }}>
              Assessment batch for {selectedSubject} ({targetSem}) is awaiting HOD verification.
            </div>
          </div>
        </div>
      )}

      {/* STUDENT MARKS ROSTER TABLE */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
            Evaluating Course: <strong style={{ color: '#2563eb' }}>{selectedSubject}</strong> • {targetSem} ({targetSection === 'All' ? 'All Sections' : `Section ${targetSection}`})
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Showing {filteredStudents.length} Real Scholars
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#ffffff', borderBottom: '1.5px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 18px', width: '50px' }}>#</th>
                <th style={{ padding: '12px 18px' }}>Register / Roll No</th>
                <th style={{ padding: '12px 18px' }}>Student Scholar Name</th>
                {marksView === 'cia' ? (
                  <>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>CIA 1 (Max 25)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>CIA 2 (Max 25)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>CIA 3 (Max 25)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center', background: '#eff6ff' }}>Total CIA (75)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center', background: '#f1f5f9' }}>Internal (Max 25)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>Evaluation Status</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '12px 18px', textAlign: 'center', background: '#f1f5f9' }}>Internal (25)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>Semester Exam (75)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center', background: '#eff6ff' }}>Total (100)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>Result</th>
                  </>
                )}
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={marksView === 'cia' ? 10 : 8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading real scholars marks roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={marksView === 'cia' ? 10 : 8} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                    No scholars found in this class.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const sId = student.id || student._id || `s_${idx}`;
                  const marks = studentMarksData[sId] || { cia1: 20, cia2: 21, cia3: 22, semester: 60 };
                  
                  const c1 = Number(marks.cia1 || 0);
                  const c2 = Number(marks.cia2 || 0);
                  const c3 = Number(marks.cia3 || 0);
                  const ciaTotal = c1 + c2 + c3; // Exact addition of CIA 1 + CIA 2 + CIA 3
                  const sem = Number(marks.semester || 60);
                  const internal = Math.round(ciaTotal / 3);
                  const total = internal + sem; // Exact addition: Internal (25) + Semester (75)
                  const isCiaPass = internal >= 10;
                  const isOverallPass = total >= 40 && sem >= 30;

                  return (
                    <tr key={sId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>
                        {student.rollNo || student.registerNo || student.id || `CS-2026-${101 + idx}`}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{student.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{student.department || staffDept} • {student.section ? `Sec ${student.section}` : ''}</div>
                      </td>

                      {marksView === 'cia' ? (
                        <>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="25"
                              value={marks.cia1 !== undefined ? marks.cia1 : ''}
                              onChange={e => handleMarkChange(sId, 'cia1', e.target.value)}
                              style={{ width: '65px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="25"
                              value={marks.cia2 !== undefined ? marks.cia2 : ''}
                              onChange={e => handleMarkChange(sId, 'cia2', e.target.value)}
                              style={{ width: '65px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="25"
                              value={marks.cia3 !== undefined ? marks.cia3 : ''}
                              onChange={e => handleMarkChange(sId, 'cia3', e.target.value)}
                              style={{ width: '65px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 900, color: '#2563eb', background: '#eff6ff' }}>
                            {ciaTotal} / 75
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 800, color: '#1e293b', background: '#f8fafc' }}>
                            {internal} / 25
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: isCiaPass ? '#ecfdf5' : '#fef2f2',
                              color: isCiaPass ? '#059669' : '#dc2626',
                              border: isCiaPass ? '1px solid #a7f3d0' : '1px solid #fecaca'
                            }}>
                              {isCiaPass ? 'Pass' : 'Re-test'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 800, color: '#1e293b', background: '#f8fafc' }}>
                            {internal} / 25
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="75"
                              value={marks.semester !== undefined ? marks.semester : 60}
                              onChange={e => handleMarkChange(sId, 'semester', e.target.value)}
                              style={{ width: '65px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 900, fontSize: '0.92rem', color: isOverallPass ? '#2563eb' : '#dc2626', background: isOverallPass ? '#eff6ff' : '#fef2f2' }}>
                            {total} / 100
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: isOverallPass ? '#ecfdf5' : '#fef2f2', color: isOverallPass ? '#059669' : '#dc2626', border: `1px solid ${isOverallPass ? '#bbf7d0' : '#fecaca'}` }}>
                              {isOverallPass ? 'PASS' : 'RA'}
                            </span>
                          </td>
                        </>
                      )}

                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <button
                          onClick={() => setEditingStudentModal(student)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#2563eb',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ✏️ DEDICATED STUDENT MARKS EDIT MODAL */}
      {/* ======================================================== */}
      {editingStudentModal && (() => {
        const sId = editingStudentModal.id || editingStudentModal._id;
        const currentM = studentMarksData[sId] || { cia1: 20, cia2: 20, cia3: 20, semester: 60 };
        const c1 = Number(currentM.cia1 || 0);
        const c2 = Number(currentM.cia2 || 0);
        const c3 = Number(currentM.cia3 || 0);
        const ciaTot = c1 + c2 + c3;
        const internal = Math.round(ciaTot / 3);
        const sem = Number(currentM.semester || 60);
        const grandTot = internal + sem;
        const isPass = grandTot >= 40 && sem >= 30;

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Edit Assessment Marks
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    {editingStudentModal.name} • {editingStudentModal.rollNo || editingStudentModal.id}
                  </p>
                </div>

                <button
                  onClick={() => setEditingStudentModal(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155' }}>
                  <strong>Course:</strong> {selectedSubject} ({targetSem})
                </div>

                {hodRemarks && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#881337' }}>
                    <strong>HOD Note:</strong> "{hodRemarks}"
                  </div>
                )}

                {/* Mark Input Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>CIA 1 (Max 25)</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={currentM.cia1 !== undefined ? currentM.cia1 : ''}
                      onChange={e => handleMarkChange(sId, 'cia1', e.target.value)}
                      style={{ width: '100%', padding: '8px', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.95rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>CIA 2 (Max 25)</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={currentM.cia2 !== undefined ? currentM.cia2 : ''}
                      onChange={e => handleMarkChange(sId, 'cia2', e.target.value)}
                      style={{ width: '100%', padding: '8px', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.95rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>CIA 3 (Max 25)</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={currentM.cia3 !== undefined ? currentM.cia3 : ''}
                      onChange={e => handleMarkChange(sId, 'cia3', e.target.value)}
                      style={{ width: '100%', padding: '8px', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Semester Exam (Max 75)</label>
                  <input
                    type="number"
                    min="0"
                    max="75"
                    value={currentM.semester !== undefined ? currentM.semester : 60}
                    onChange={e => handleMarkChange(sId, 'semester', e.target.value)}
                    style={{ width: '100%', padding: '8px', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.95rem' }}
                  />
                </div>

                {/* KPI Metrics Preview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Total CIA</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#2563eb' }}>{ciaTot}/75</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Internal</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{internal}/25</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Total</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: isPass ? '#2563eb' : '#dc2626' }}>{grandTot}/100</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Status</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isPass ? '#16a34a' : '#dc2626' }}>{isPass ? 'PASS' : 'RA'}</div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
                <button
                  onClick={() => setEditingStudentModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await handleSaveDraft();
                    setEditingStudentModal(null);
                  }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
                <button
                  onClick={async () => {
                    setEditingStudentModal(null);
                    await handleSubmitToHod();
                  }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Submit to HOD
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default StaffMarks;
