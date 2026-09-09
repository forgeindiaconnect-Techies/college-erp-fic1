import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trophy, AlertTriangle, TrendingUp, Edit2, X, CheckCircle, BookOpen } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  getStudents,
  getAllMarks,
  getExams
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './CgpaManagement.css';

const DEPARTMENTS = [
  'All',
  'Computer Science Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Artificial Intelligence & Machine Learning',
  'Cyber Security',
  'Biomedical Engineering',
  'Aeronautical Engineering',
  'Automobile Engineering',
  'Robotics Engineering',
  'Chemical Engineering',
  'Biotechnology Engineering',
];
const SEMESTERS   = ['All','Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const AVATAR_COLORS = ['bg-gradient-blue','bg-gradient-purple','bg-gradient-orange','bg-gradient-green','bg-gradient-teal','bg-gradient-pink'];

/* ── GPA helpers ── */
const calcGpa = (internal, external) => {
  const tot = (internal || 0) + (external || 0);
  if (internal < 20 || external < 30) return 0;
  return Number((tot / 10).toFixed(1));
};
const getGrade = g => g >= 9 ? 'O' : g >= 8 ? 'A+' : g >= 7 ? 'A' : g >= 6 ? 'B+' : g >= 5 ? 'B' : 'F';
const getGpaColor = g => g >= 7.5 ? 'var(--success)' : g >= 5 ? 'var(--warning)' : 'var(--danger)';
const isPassing = (internal, external) => internal >= 20 && external >= 30;

const CGPA_TREND = [
  { sem: 'Sem 1', avg: 7.7 },
  { sem: 'Sem 2', avg: 7.9 },
  { sem: 'Sem 3', avg: 8.1 },
  { sem: 'Sem 4', avg: 8.4 },
  { sem: 'Sem 5', avg: 8.5 },
  { sem: 'Sem 6', avg: 8.7 },
];

const CgpaManagement = () => {
  const [loading,    setLoading]    = useState(true);
  const [marks,      setMarks]      = useState([]);
  const [search,     setSearch]     = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter,  setSemFilter]  = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh when marks data changes
  useRealtimeSync(useCallback(() => { fetchData(); }, []), 'marks');

  const fetchData = async () => {
    try {
      setLoading(true);

      const [studentsRes, marksRes, examsRes] = await Promise.all([
        getStudents(),
        getAllMarks(),
        getExams()
      ]);

      const studentList = Array.isArray(studentsRes.data)
        ? studentsRes.data
        : studentsRes.data?.students || studentsRes.data?.data || [];

      const backendMarks = Array.isArray(marksRes.data)
        ? marksRes.data
        : marksRes.data?.marks || marksRes.data?.data || [];

      const examList = Array.isArray(examsRes.data)
        ? examsRes.data
        : examsRes.data?.exams || examsRes.data?.data || [];

      const mergedRecords = backendMarks.map(mark => {
        const student = studentList.find(item =>
          item.id === mark.studentId ||
          item._id === mark.studentId ||
          item.name === mark.studentName
        );

        const exam = examList.find(item =>
          String(item._id || item.id) ===
          String(mark.examId?._id || mark.examId)
        );

        const obtained = Number(
          mark.marksObtained ?? mark.totalMarks ?? 0
        );

        const maximum = Number(mark.maxMarks || exam?.maxMarks || 100);

        return {
          ...mark,
          id: mark._id,
          studentRegNo:
            mark.registerNo ||
            student?.rollNo ||
            student?.id ||
            mark.studentId,
          name: mark.studentName || student?.name || 'Student',
          dept:
            mark.department ||
            student?.dept ||
            student?.department ||
            '',
          sem: mark.semester || student?.sem || '',
          subject: mark.subject || '',
          examName: mark.examId?.name || exam?.name || 'Exam',
          marksObtained: obtained,
          maxMarks: maximum,
          percentage:
            maximum > 0
              ? Number(((obtained / maximum) * 100).toFixed(2))
              : 0
        };
      });

      setMarks(mergedRecords);
    } catch (err) {
      console.error('Failed to fetch real marks:', err);
      setMarks([]);
    } finally {
      setLoading(false);
    }
  };

  const records = marks.map(mark => ({
    ...mark,
    marksObtained: Number(mark.marksObtained || 0),
    maxMarks: Number(mark.maxMarks || 100),
    percentage: Number(mark.percentage || 0),
    gpa: Number(mark.gpa || 0),
    cgpa: Number(mark.cgpa || 0),
    grade: mark.grade || 'U',
    pass: mark.arrearStatus !== 'Arrear',
    arrears: mark.arrearStatus === 'Arrear' ? 1 : 0
  }));

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    let rDept = r.dept;
    if (rDept === 'Computer Science') rDept = 'Computer Science Engineering';
    else if (rDept === 'Electronics & Comm.') rDept = 'Electronics & Communication Engineering';
    else if (rDept === 'Electrical Engg.') rDept = 'Electrical & Electronics Engineering';
    else if (rDept === 'Mechanical Engg.') rDept = 'Mechanical Engineering';
    else if (rDept === 'Civil Engg.') rDept = 'Civil Engineering';
    else if (rDept === 'Information Tech.') rDept = 'Information Technology';

    return (r.name.toLowerCase().includes(q) || (r.studentRegNo || r.id).toLowerCase().includes(q)) &&
           (deptFilter === 'All' || rDept === deptFilter) &&
           (semFilter  === 'All' || r.sem  === semFilter);
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

  filtered.forEach(record => {
    const key = [
      record.studentId,
      record.sem,
      record.subject
    ].join('::');

    if (!consolidatedGroups[key]) {
      consolidatedGroups[key] = {
        studentId: record.studentId,
        studentRegNo: record.studentRegNo,
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

  const topStudents  = [...records].sort((a,b)=>b.cgpa-a.cgpa).slice(0,3);
  const withArrears  = records.filter(r=>r.arrears>0);
  const avgCgpa      = records.length ? (records.reduce((a,b)=>a+b.cgpa,0)/records.length).toFixed(2) : '—';
  const topCgpa      = records.length ? Math.max(...records.map(r=>r.cgpa)) : '—';
  const passRate     = records.length ? ((records.filter(r=>r.pass).length/records.length)*100).toFixed(0)+'%' : '—';

  /* GPA distribution for bar chart */
  const gpaDist = [
    { range:'< 6',  count: records.filter(r=>r.gpa>0&&r.gpa<6).length,  fill:'#ef4444' },
    { range:'6–7',  count: records.filter(r=>r.gpa>=6&&r.gpa<7).length,  fill:'#f59e0b' },
    { range:'7–8',  count: records.filter(r=>r.gpa>=7&&r.gpa<8).length,  fill:'#3b82f6' },
    { range:'8–9',  count: records.filter(r=>r.gpa>=8&&r.gpa<9).length,  fill:'#6366F1' },
    { range:'9–10', count: records.filter(r=>r.gpa>=9).length,            fill:'#10b981' },
    { range:'Fail', count: records.filter(r=>r.gpa===0&&!r.pass).length,  fill:'#dc2626' },
  ];

  return (
    <div className="cgpa-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Marks / CGPA</h1>
          <p className="text-muted">
            View published exam-wise marks and consolidated academic results.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sm-summary-row four-col">
        {[
          { label:'Overall Avg CGPA', value: avgCgpa, cls:'gradient-text' },
          { label:'Top CGPA',         value: topCgpa, cls:'text-success',  icon:<Trophy size={16} style={{color:'var(--warning)'}}/> },
          { label:'Arrear Students',  value: withArrears.length, cls:'text-danger', icon:<AlertTriangle size={16} style={{color:'var(--danger)'}}/> },
          { label:'Pass Rate',        value: passRate, cls:'text-success', icon:<TrendingUp size={16} style={{color:'var(--success)'}}/> },
        ].map((c,i)=>(
          <div key={i} className="sm-summary-card glass-card">
            {c.icon}
            <span className="sm-summary-label">{c.label}</span>
            <span className={`sm-summary-value ${c.cls}`}>{c.value}</span>
          </div>
        ))}
      </div>

      <div className="cgpa-grid">
        {/* CGPA Trend */}
        <div className="glass-card chart-box col-span-2">
          <h3><TrendingUp size={16} /> Average CGPA Trend (All Semesters)</h3>
          <div style={{height:230,marginTop:'1rem'}}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={CGPA_TREND}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="sem" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis domain={[6,10]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)',boxShadow:'var(--shadow-md)',fontSize:12}} />
                <Line type="monotone" dataKey="avg" name="Avg CGPA" stroke="var(--primary)" strokeWidth={2.5}
                  dot={{r:4,fill:'var(--primary)',stroke:'white',strokeWidth:2}} activeDot={{r:7}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers + Arrears */}
        <div className="glass-card chart-box">
          <h3><Trophy size={16} style={{color:'var(--warning)'}}/> Top Performers</h3>
          <div className="top-students-list">
            {topStudents.map((s,idx)=>(
              <div key={s.id} className="top-student-item">
                <div className={`rank-badge ${idx===0?'gold':idx===1?'silver':'bronze'}`}>{idx+1}</div>
                <div className={`avatar-sm ${AVATAR_COLORS[idx]}`}>{s.name[0]}</div>
                <div className="top-student-info">
                  <p className="top-student-name">{s.name}</p>
                  <p className="top-student-dept">
                    {(() => {
                      let d = s.dept;
                      if (d === 'Computer Science') d = 'Computer Science Engineering';
                      else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                      else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                      else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                      else if (d === 'Civil Engg.') d = 'Civil Engineering';
                      else if (d === 'Information Tech.') d = 'Information Technology';
                      return d;
                    })()}
                  </p>
                </div>
                <span className="top-student-cgpa" style={{color:getGpaColor(s.cgpa)}}>{s.cgpa}</span>
              </div>
            ))}
          </div>

          {withArrears.length > 0 && (
            <div className="arrear-alert">
              <div className="arrear-alert-header"><AlertTriangle size={14}/> {withArrears.length} students with arrears</div>
              <div className="arrear-list">
                {withArrears.map(s=>(
                  <div key={s.id} className="arrear-item">
                    <span style={{fontSize:'0.82rem'}}>{s.name}</span>
                    <span className="arrear-count">{s.arrears} arrear{s.arrears>1?'s':''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>



        {/* Main Table */}
        <div className="glass-card col-span-3">
          <div className="table-filters-row">
            <h3>Student Marks &amp; CGPA</h3>
            <div className="filter-group">
              <div className="search-box">
                <Search size={15} className="text-muted"/>
                <input type="text" placeholder="Search name or ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
                {search && <button style={{border:'none',background:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}} onClick={()=>setSearch('')}><X size={14}/></button>}
              </div>
              <div className="filter-select-wrapper">
                <Filter size={13} className="text-muted"/>
                <select className="filter-select" value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
                  <option value="All">All Departments</option>
                  {DEPARTMENTS.slice(1).map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="filter-select-wrapper">
                <select className="filter-select" value={semFilter} onChange={e=>setSemFilter(e.target.value)}>
                  <option value="All">All Semesters</option>
                  {SEMESTERS.slice(1).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Subject</th>
                  <th>Exam Type</th>
                  <th>Marks Obtained</th>
                  <th>Maximum Marks</th>
                  <th>Percentage</th>
                  <th>GPA</th>
                  <th>CGPA</th>
                  <th>Grade</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:6}).map((_,i)=>(
                  <tr key={i}>{Array.from({length:14}).map((_,j)=>(
                    <td key={j}><div className="skeleton" style={{height:14,borderRadius:4,width:j===1?120:j===2?80:50}}/></td>
                  ))}</tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={14} className="no-data-row">No records match the active filters.</td></tr>
                ) : filtered.map((r,idx)=>(
                  <tr key={r.id}>
                    <td className="text-muted">{idx+1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`avatar-xs ${AVATAR_COLORS[idx%AVATAR_COLORS.length]}`}>{r.name[0]}</div>
                        <span className="font-semibold">{r.name}</span>
                      </div>
                    </td>
                    <td><span className="roll-no">{r.studentRegNo || r.id}</span></td>
                    <td className="text-sm text-muted">
                      {(() => {
                        let d = r.dept;
                        if (d === 'Computer Science') d = 'Computer Science Engineering';
                        else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                        else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                        else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                        else if (d === 'Civil Engg.') d = 'Civil Engineering';
                        else if (d === 'Information Tech.') d = 'Information Technology';
                        return d;
                      })()}
                    </td>
                    <td><span className="badge-outline">{r.sem}</span></td>
                    <td><span className="font-semibold text-sm">{r.subject}</span></td>
                    <td>{r.examName}</td>
                    <td className="font-semibold">{r.marksObtained}</td>
                    <td>{r.maxMarks}</td>
                    <td className="font-semibold">{r.percentage}%</td>
                    <td><span style={{color:getGpaColor(r.gpa),fontWeight:700}}>{r.gpa.toFixed(1)}</span></td>
                    <td>
                      <div className="cgpa-cell">
                        <span style={{color:getGpaColor(r.cgpa),fontWeight:700}}>{r.cgpa}</span>
                        <div className="cgpa-bar-bg"><div className="cgpa-bar-fill" style={{width:`${(r.cgpa/10)*100}%`,background:getGpaColor(r.cgpa)}}/></div>
                      </div>
                    </td>
                    <td>
                      <span className="grade-badge" style={{background:getGpaColor(r.gpa)+'18',color:getGpaColor(r.gpa),border:`1px solid ${getGpaColor(r.gpa)}35`}}>{r.grade}</span>
                    </td>
                    <td>
                      {r.pass ? <span className="badge-pass">✓ Pass</span> : <span className="badge-fail">✗ Fail</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div className="table-footer">
              <span>Showing <strong>{filtered.length}</strong> of <strong>{records.length}</strong> students</span>
              {(deptFilter!=='All'||semFilter!=='All'||search) &&
                <button className="clear-filters-link" onClick={()=>{setDeptFilter('All');setSemFilter('All');setSearch('');}}>Reset filters ×</button>}
            </div>
          )}
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

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '1200px' }}>
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
                        <span style={{ color: getGpaColor(result.gpa), fontWeight: 700 }}>
                          {result.gpa}
                        </span>
                      </td>
                      <td>
                        <span
                          className="grade-badge"
                          style={{
                            background: getGpaColor(result.gpa) + '18',
                            color: getGpaColor(result.gpa),
                            border: `1px solid ${getGpaColor(result.gpa)}35`
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
    </div>
  );
};

export default CgpaManagement;
