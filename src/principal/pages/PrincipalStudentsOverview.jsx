import React, { useState, useEffect, useCallback } from 'react';
import { 
  GraduationCap, TrendingUp, AlertCircle, Star, Search, Users, 
  RefreshCw, CheckCircle, Award, BookOpen, Clock, ChevronRight, X, Mail, Phone, Filter
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import {
  getStudents,
  getDepartments,
  getAllMarks,
  getAllAttendance
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../../pages/Dashboard.css';

export default function PrincipalStudentsOverview() {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'top' | 'lowatt' | 'arrears'
  const [studentList, setStudentList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [deptsList, setDeptsList] = useState(['All']);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudentData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [studentsRes, deptsRes, marksRes, attendanceRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] }))
      ]);
      
      const marksData = Array.isArray(marksRes?.data) ? marksRes.data : [];
      const attendanceData = Array.isArray(attendanceRes?.data)
        ? attendanceRes.data
        : (attendanceRes?.data?.records || attendanceRes?.data?.data || []);

      setAttendanceRecords(attendanceData);

      // Map student IDs to their total active arrears
      const arrearsMap = {};
      marksData.forEach(m => {
        let arr = 0;
        if (m.arrearStatus === 'Arrear') arr = 1;
        else if (m.arrearStatus === 'Pass') arr = 0;
        else if (!isNaN(m.arrearStatus)) arr = Number(m.arrearStatus);
        
        const sKey = m.studentId || m.student;
        if (sKey) {
          if (!arrearsMap[sKey]) arrearsMap[sKey] = 0;
          arrearsMap[sKey] += arr;
        }
      });

      const rawStudents = Array.isArray(studentsRes?.data) ? studentsRes.data : (Array.isArray(studentsRes) ? studentsRes : []);
      
      const formatted = rawStudents.map(s => {
        const sid = s.id || s.studentId || s.rollNo || s._id || 'N/A';

        const studentAttendance = attendanceData.filter(record =>
          String(record.studentId || '') === String(sid) ||
          String(record.studentId || '') === String(s._id || '') ||
          (
            record.studentName &&
            s.name &&
            String(record.studentName).trim().toLowerCase() === String(s.name).trim().toLowerCase()
          )
        );

        const presentCount = studentAttendance.filter(record =>
          String(record.status).toLowerCase() === 'present'
        ).length;

        const attendancePercentage =
          studentAttendance.length > 0
            ? Number(((presentCount / studentAttendance.length) * 100).toFixed(1))
            : (s.attendance != null ? Number(s.attendance) : 88);

        return {
          id: sid,
          _id: s._id,
          name: s.name || 'Enrolled Student',
          dept: s.dept || s.department || 'General',
          sem: s.sem || s.semester || 'Semester 1',
          cgpa: s.cgpa != null ? Number(s.cgpa) : 8.2,
          attendance: attendancePercentage,
          arrears: arrearsMap[sid] || 0,
          status: s.status || 'Active',
          feeStatus: s.feeStatus || 'Paid',
          email: s.email || 'student@college.edu',
          phone: s.phone || 'N/A'
        };
      });

      setStudentList(formatted);
      if (formatted.length > 0 && !selectedStudent) {
        setSelectedStudent(formatted[0]);
      }

      const deptsData = Array.isArray(deptsRes?.data) ? deptsRes.data : [];
      setDeptsList(['All', ...deptsData.map(d => d.name)]);
    } catch (err) {
      console.warn('API /api/students offline.', err);
      setStudentList([]);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [selectedStudent]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  useRealtimeSync(fetchStudentData, ['students', 'marks', 'attendance', 'fees']);

  const baseList = studentList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.id.toLowerCase().includes(search.toLowerCase()) ||
                          s.email.toLowerCase().includes(search.toLowerCase()) ||
                          s.dept.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || s.dept === filterDept;
    return matchesSearch && matchesDept;
  });

  const filteredStudents = activeTab === 'top' 
    ? [...baseList].sort((a, b) => b.cgpa - a.cgpa)
    : activeTab === 'lowatt'
    ? baseList.filter(s => s.attendance < 75)
    : activeTab === 'arrears'
    ? baseList.filter(s => s.arrears > 0)
    : baseList;

  // Department distribution
  const deptStudentMap = {};
  studentList.forEach(s => {
    const d = s.dept || 'General';
    deptStudentMap[d] = (deptStudentMap[d] || 0) + 1;
  });

  const deptChartData = Object.keys(deptStudentMap).map(d => ({
    name: d.replace(' Engineering', '').replace('Technology', 'Tech'),
    students: deptStudentMap[d]
  }));

  const avgAttendance = studentList.length 
    ? (studentList.reduce((a, b) => a + Number(b.attendance || 0), 0) / studentList.length).toFixed(1) 
    : '0.0';

  const avgCGPA = studentList.length 
    ? (studentList.reduce((a, b) => a + Number(b.cgpa || 0), 0) / studentList.length).toFixed(2) 
    : '0.00';

  return (
    <div className="main-content animate-fade-in" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                Students Academic Overview
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Institutional student directory, CGPA benchmarks, attendance thresholds, and performance monitoring.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}></span> Live Sync
          </span>
          <button 
            onClick={fetchStudentData}
            disabled={refreshing}
            style={{ 
              padding: '8px 14px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-card)', 
              color: 'var(--text-main)', 
              fontSize: '0.82rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* 4 ERP KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Enrolled Students', value: studentList.length, icon: <GraduationCap size={20} />, bgTint: 'rgba(16, 185, 129, 0.1)', iconColor: '#10b981', sub: 'Across all departments' },
          { label: 'Overall Attendance Rate', value: `${avgAttendance}%`, icon: <TrendingUp size={20} />, bgTint: 'rgba(59, 130, 246, 0.1)', iconColor: '#3b82f6', sub: 'Institution average' },
          { label: 'Average CGPA Benchmark', value: avgCGPA, icon: <Star size={20} />, bgTint: 'rgba(245, 158, 11, 0.1)', iconColor: '#f59e0b', sub: 'Out of 10.0 scale' },
          { label: 'Critical Attendance (<75%)', value: studentList.filter(s => s.attendance < 75).length, icon: <AlertCircle size={20} />, bgTint: 'rgba(239, 68, 68, 0.1)', iconColor: '#ef4444', sub: 'Needs counseling' }
        ].map((s, i) => (
          <div key={i} style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 14, 
            padding: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-card)' 
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {s.sub}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bgTint, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Left Column: Student List & Controls */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
          {/* Controls Bar & Tab Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All Students (${studentList.length})` },
                { id: 'top', label: 'Top Performers' },
                { id: 'lowatt', label: `Low Attendance (${studentList.filter(s => s.attendance < 75).length})` },
                { id: 'arrears', label: `With Arrears (${studentList.filter(s => s.arrears > 0).length})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: activeTab === t.id ? '1px solid #10b981' : '1px solid var(--border-color)',
                    background: activeTab === t.id ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    color: activeTab === t.id ? '#10b981' : 'var(--text-main)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 240px', justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search students..." 
                  style={{ 
                    width: '100%',
                    padding: '6px 10px 6px 30px', 
                    borderRadius: 8, 
                    border: '1px solid var(--border-color)', 
                    background: 'var(--bg-primary)', 
                    color: 'var(--text-main)', 
                    fontSize: '0.8rem' 
                  }} 
                />
              </div>

              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {deptsList.map(d => (
                  <option key={d} value={d}>{d === 'All' ? 'All Depts' : d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredStudents.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: 12, border: '1px dashed var(--border-color)' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <GraduationCap size={28} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                {studentList.length === 0 ? 'No Enrolled Students Yet' : 'No students found in this category'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
                {studentList.length === 0 
                  ? 'When student admissions are processed or students register for this college, their full academic progress, CGPA, and attendance will appear here.'
                  : 'Try clearing your search query or selecting "All Students" to see the full institutional roster.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CGPA</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fee Status</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedStudent(s)}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        cursor: 'pointer',
                        background: selectedStudent?.id === s.id ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#10b981', color: '#fff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.82rem' }}>{s.dept}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.sem}</div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${s.attendance}%`, height: '100%', background: s.attendance >= 75 ? '#10b981' : '#ef4444' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: s.attendance >= 75 ? '#10b981' : '#ef4444' }}>
                            {s.attendance}%
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ 
                          background: s.cgpa >= 8.5 ? 'rgba(16, 185, 129, 0.12)' : s.cgpa >= 7.0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                          color: s.cgpa >= 8.5 ? '#10b981' : s.cgpa >= 7.0 ? '#3b82f6' : '#ef4444', 
                          padding: '3px 8px', 
                          borderRadius: 6, 
                          fontSize: '0.78rem', 
                          fontWeight: 700 
                        }}>
                          {s.cgpa.toFixed(2)}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ 
                          background: s.feeStatus === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                          color: s.feeStatus === 'Paid' ? '#10b981' : '#f59e0b', 
                          padding: '3px 8px', 
                          borderRadius: 6, 
                          fontSize: '0.72rem', 
                          fontWeight: 700 
                        }}>
                          {s.feeStatus}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => setSelectedStudent(s)} 
                          style={{ padding: '5px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Student Profile Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: '90px' }}>
          {selectedStudent ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem', margin: 0 }}>
                    {selectedStudent.name}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#10b981', margin: '2px 0 0 0', fontWeight: 600 }}>
                    {selectedStudent.id} • {selectedStudent.sem}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1.2rem' }}>
                {[
                  ['Department', selectedStudent.dept], 
                  ['Attendance', `${selectedStudent.attendance}%`], 
                  ['CGPA', selectedStudent.cgpa.toFixed(2)], 
                  ['Arrears', `${selectedStudent.arrears} Active`], 
                  ['Fee Status', selectedStudent.feeStatus],
                  ['Account Status', selectedStudent.status]
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Academic Assessment Summary
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  {selectedStudent.attendance >= 75 && selectedStudent.cgpa >= 8.0 
                    ? '✨ Exemplary academic standing with consistent attendance and high subject mastery.'
                    : selectedStudent.attendance < 75 
                    ? '⚠️ Attendance falls below 75% requirement. Recommended for mentor review.'
                    : 'Standard performance. On track for semester completion.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <a 
                  href={`mailto:${selectedStudent.email}`}
                  style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#10b981', color: '#fff', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}
                >
                  ✉️ Email Student
                </a>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', boxShadow: 'var(--shadow-card)' }}>
              <GraduationCap size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Select any student from the directory to inspect academic records.</p>
            </div>
          )}

          {/* Department Student Distribution */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={16} color="#10b981" /> Students by Department
            </h4>
            {deptChartData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No student enrollment data to display.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={deptChartData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} name="Enrolled Students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
