import React, { useState, useEffect, useCallback } from 'react';
import { GraduationCap, TrendingUp, AlertCircle, Star, Search, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
  getStudents,
  getDepartments,
  getAllMarks,
  getAllAttendance
} from '../../api/index';
import '../../pages/Dashboard.css';
import useRealtimeSync from '../../hooks/useRealtimeSync';

export default function PrincipalStudentsOverview() {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [tab, setTab] = useState('all');
  const [studentList, setStudentList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [deptsList, setDeptsList] = useState(['All']);

  const fetchData = useCallback(async () => {
    try {
      const [
        studentsRes,
        deptsRes,
        marksRes,
        attendanceRes
      ] = await Promise.all([
        getStudents(),
        getDepartments(),
        getAllMarks().catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] }))
      ]);
      
      const marksData = marksRes?.data || [];
      const attendanceData = Array.isArray(attendanceRes?.data)
        ? attendanceRes.data
        : attendanceRes?.data?.records ||
          attendanceRes?.data?.data ||
          [];

      setAttendanceRecords(attendanceData);
      // Map student IDs to their total active arrears
      const arrearsMap = {};
      marksData.forEach(m => {
        let arr = 0;
        if (m.arrearStatus === 'Arrear') arr = 1;
        else if (m.arrearStatus === 'Pass') arr = 0;
        else if (!isNaN(m.arrearStatus)) arr = Number(m.arrearStatus);
        
        if (!arrearsMap[m.studentId]) arrearsMap[m.studentId] = 0;
        arrearsMap[m.studentId] += arr;
      });

      const data = studentsRes.data;
      if (Array.isArray(data)) {
        const formatted = data.map(s => {
          const sid = s.id || s.studentId || 'N/A';

          const studentAttendance = attendanceData.filter(record =>
            String(record.studentId || '') === String(sid) ||
            String(record.studentId || '') === String(s._id || '') ||
            (
              record.studentName &&
              s.name &&
              String(record.studentName).trim().toLowerCase() ===
                String(s.name).trim().toLowerCase()
            )
          );

          const presentCount = studentAttendance.filter(record =>
            String(record.status).toLowerCase() === 'present'
          ).length;

          const attendancePercentage =
            studentAttendance.length > 0
              ? Number(
                  (
                    (presentCount / studentAttendance.length) *
                    100
                  ).toFixed(1)
                )
              : 0;

          return {
            id: sid,
            name: s.name,
            dept: s.dept || s.department || 'N/A',
            sem: s.sem || s.semester || 'N/A',
            cgpa: s.cgpa != null ? s.cgpa : 0,
            attendance: attendancePercentage,
            arrears: arrearsMap[sid] || 0,
            status: s.status || 'Active',
            feeStatus: s.feeStatus || 'Not Available',
            email: s.email
          };
        });
        setStudentList(formatted);
      }

      const deptsData = deptsRes.data || [];
      setDeptsList(['All', ...deptsData.map(d => d.name)]);
    } catch (err) {
      console.warn('API /api/students offline. Fallback to static data.', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSync(
    fetchData,
    ['students', 'marks', 'attendance', 'fees']
  );

  const base = studentList.filter(s =>
    (filterDept === 'All' || s.dept === filterDept) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()))
  );

  const filtered = tab === 'top' ? [...base].sort((a, b) => b.cgpa - a.cgpa).slice(0, 5)
    : tab === 'lowatt' ? base.filter(s => s.attendance < 80)
    : base;

  const departmentMap = {};

  studentList.forEach(student => {
    const department = student.dept || 'Unknown Department';

    if (!departmentMap[department]) {
      departmentMap[department] = {
        dept: department,
        students: 0,
        totalCGPA: 0,
        totalAttendance: 0
      };
    }

    departmentMap[department].students += 1;
    departmentMap[department].totalCGPA += Number(
      student.cgpa || 0
    );
    departmentMap[department].totalAttendance += Number(
      student.attendance || 0
    );
  });

  const deptData = Object.values(departmentMap).map(
    department => ({
      dept: department.dept,
      students: department.students,
      avgCGPA: Number(
        (
          department.totalCGPA /
          department.students
        ).toFixed(2)
      ),
      avgAtt: Number(
        (
          department.totalAttendance /
          department.students
        ).toFixed(1)
      )
    })
  );

  const semesterMap = {};

  studentList.forEach(student => {
    const semester = student.sem || 'Unknown Semester';

    if (!semesterMap[semester]) {
      semesterMap[semester] = {
        sem: semester,
        students: 0,
        totalCGPA: 0,
        totalAttendance: 0
      };
    }

    semesterMap[semester].students += 1;
    semesterMap[semester].totalCGPA += Number(
      student.cgpa || 0
    );
    semesterMap[semester].totalAttendance += Number(
      student.attendance || 0
    );
  });

  const trendData = Object.values(semesterMap)
    .map(semester => ({
      sem: semester.sem,
      avgCGPA: Number(
        (
          semester.totalCGPA /
          semester.students
        ).toFixed(2)
      ),
      avgAtt: Number(
        (
          semester.totalAttendance /
          semester.students
        ).toFixed(1)
      )
    }))
    .sort((a, b) =>
      Number(a.sem.replace(/\D/g, '')) -
      Number(b.sem.replace(/\D/g, ''))
    );

  const feeColours = {
    Paid: '#10b981',
    Partial: '#f59e0b',
    Pending: '#ef4444',
    'Not Available': '#94a3b8'
  };

  const feeStatusCounts = {};

  studentList.forEach(student => {
    const status = student.feeStatus || 'Not Available';

    feeStatusCounts[status] =
      (feeStatusCounts[status] || 0) + 1;
  });

  const feeStatusData = Object.entries(feeStatusCounts).map(
    ([name, value]) => ({
      name,
      value,
      color: feeColours[name] || '#94a3b8'
    })
  );

  const avgCGPA =
    studentList.length > 0
      ? (
          studentList.reduce(
            (sum, student) =>
              sum + Number(student.cgpa || 0),
            0
          ) / studentList.length
        ).toFixed(2)
      : '0.00';

  const avgAtt =
    studentList.length > 0
      ? Number(
          (
            studentList.reduce(
              (sum, student) =>
                sum + Number(student.attendance || 0),
              0
            ) / studentList.length
          ).toFixed(1)
        )
      : 0;

  const lowAttCount = studentList.filter(
    student => student.attendance < 80
  ).length;

  const topCount = studentList.filter(
    student => student.cgpa >= 9
  ).length;

  const activeCount = studentList.filter(
    student =>
      String(student.status).toLowerCase() === 'active'
  ).length;

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GraduationCap style={{ color: '#3730A5' }} size={28} /> Students Overview
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor student performance, attendance trends, and department-wise analytics.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Students', value: studentList.length, icon: <Users size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: `${deptData.length} departments` },
          { label: 'Avg CGPA', value: avgCGPA, icon: <Star size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'All students' },
          {
            label: 'Avg Attendance',
            value: `${avgAtt}%`,
            icon: <TrendingUp size={18} />,
            bgTint: avgAtt >= 75 ? '#E1F5EE' : '#FAEEDA',
            iconColor: avgAtt >= 75 ? '#047857' : '#B45309',
            sub: avgAtt >= 75
              ? 'Meets 75% target'
              : 'Below 75% target',
            subColor: avgAtt >= 75 ? '#047857' : '#B45309'
          },
          { label: 'Top Performers', value: topCount, icon: <Star size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'CGPA ≥ 9.0' },
          { label: 'Low Attendance', value: lowAttCount, icon: <AlertCircle size={18} />, bgTint: '#FCEBEB', iconColor: '#DC2626', sub: 'Below 80%', subColor: '#DC2626' },
          { label: 'Active Students', value: activeCount, icon: <GraduationCap size={18} />, bgTint: '#E1F5EE', iconColor: '#047857', sub: 'All enrolled', subColor: '#047857' },
        ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ padding: '1.25rem', background: '#FFFFFF', border: '1px solid #E3E5EC', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.bgTint, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{s.label}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.1' }}>{s.value}</span>
              <span style={{ fontSize: '0.75rem', color: s.subColor || 'var(--text-muted)', fontWeight: s.subColor ? 600 : 400 }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: '1.2rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>Dept-wise Avg CGPA</h4>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={deptData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
              <YAxis domain={[6, 10]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="avgCGPA" fill="#f59e0b" radius={[5, 5, 0, 0]} name="Avg CGPA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>Performance & Attendance Trend</h4>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sem" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="avgCGPA" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Avg CGPA" />
              <Line type="monotone" dataKey="avgAtt" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Attendance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>Fee Status</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={feeStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 10 }}>
                {feeStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {feeStatusData.map(f => (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: f.color }} />
                <span style={{ color: 'var(--text-muted)' }}>{f.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', marginLeft: 'auto' }}>{f.value} students</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['all', '📋 All Students'], ['top', '⭐ Top Performers'], ['lowatt', '⚠️ Low Attendance']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, background: tab === key ? '#3730A5' : 'transparent', color: tab === key ? 'white' : 'var(--text-muted)', border: tab === key ? 'none' : '1px solid var(--border-color)', cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '0.4rem 0.7rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem' }}>
              {deptsList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." style={{ padding: '0.4rem 0.7rem 0.4rem 1.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem', width: 170 }} />
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Student Name</th><th>Reg No.</th><th>Department</th><th>Semester</th><th>CGPA</th><th>Attendance</th><th>Arrears</th><th>Fee Status</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students match the selected filter.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.email}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6366f1' }}>{s.id}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.dept}</td>
                  <td style={{ fontSize: '0.82rem' }}>{s.sem}</td>
                  <td>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: s.cgpa >= 9 ? '#10b981' : s.cgpa >= 8 ? '#6366f1' : '#f59e0b' }}>{s.cgpa}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 55, height: 5, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                        <div style={{ width: `${s.attendance}%`, height: '100%', background: s.attendance >= 85 ? '#10b981' : s.attendance >= 75 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: s.attendance < 80 ? '#ef4444' : 'var(--text-main)' }}>{s.attendance}%</span>
                    </div>
                  </td>
                  <td>
                    {s.arrears === 0
                      ? <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>✓ Clear</span>
                      : <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>⚠ {s.arrears}</span>}
                  </td>
                  <td>
                    <span style={{ background: s.feeStatus === 'Paid' ? 'rgba(16,185,129,0.12)' : s.feeStatus === 'Partial' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: s.feeStatus === 'Paid' ? '#10b981' : s.feeStatus === 'Partial' ? '#f59e0b' : '#ef4444', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{s.feeStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
