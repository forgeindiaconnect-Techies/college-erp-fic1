import React, { useState, useEffect } from 'react';
import { GraduationCap, TrendingUp, AlertCircle, Star, Search, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { getStudents, getDepartments, getAllMarks } from '../../api/index';
import '../../pages/Dashboard.css';

const students = [
  { id: 'CS2022001', name: 'John Doe',       dept: 'Computer Science',          sem: 'Sem 6', cgpa: 8.6, attendance: 85, status: 'Active', feeStatus: 'Paid',    email: 'john@college.edu' },
  { id: 'CS2021004', name: 'Emily Davis',    dept: 'Computer Science',          sem: 'Sem 6', cgpa: 8.9, attendance: 98, arrears: 0, status: 'Active', feeStatus: 'Paid',    email: 'emily@college.edu' },
  { id: 'CS2022002', name: 'David Lee',      dept: 'Computer Science',          sem: 'Sem 3', cgpa: 8.2, attendance: 88, arrears: 1, status: 'Active', feeStatus: 'Partial', email: 'david@college.edu' },
  { id: 'EE2022001', name: 'Alice Smith',    dept: 'Electrical & Electronics',  sem: 'Sem 4', cgpa: 9.1, attendance: 95, arrears: 0, status: 'Active', feeStatus: 'Paid',    email: 'alice@college.edu' },
  { id: 'EE2022002', name: 'Sarah Wilson',   dept: 'Electrical & Electronics',  sem: 'Sem 4', cgpa: 9.5, attendance: 91, arrears: 0, status: 'Active', feeStatus: 'Paid',    email: 'sarah@college.edu' },
  { id: 'EC2022001', name: 'Vikram Seth',    dept: 'Electronics & Comm.',       sem: 'Sem 6', cgpa: 8.8, attendance: 90, arrears: 0, status: 'Active', feeStatus: 'Paid',    email: 'vikram@college.edu' },
  { id: 'EC2022002', name: 'Neha Gupta',     dept: 'Electronics & Comm.',       sem: 'Sem 6', cgpa: 8.5, attendance: 75, arrears: 2, status: 'Active', feeStatus: 'Pending', email: 'neha@college.edu' },
  { id: 'ME2023001', name: 'Robert Johnson', dept: 'Mechanical Engg.',          sem: 'Sem 2', cgpa: 7.8, attendance: 68, arrears: 3, status: 'Active', feeStatus: 'Partial', email: 'robert@college.edu' },
  { id: 'BC2022001', name: 'Karan Malhotra', dept: 'BCA',                       sem: 'Sem 5', cgpa: 8.7, attendance: 94, arrears: 0, status: 'Active', feeStatus: 'Paid',    email: 'karan@college.edu' },
  { id: 'MB2022001', name: 'Ritu Sen',       dept: 'MBA',                       sem: 'Sem 4', cgpa: 9.2, attendance: 96, arrears: 0, status: 'Active', feeStatus: 'Paid',    email: 'ritu@college.edu' },
];

const deptData = [
  { dept: 'CSE', students: 3, avgCGPA: 8.57, avgAtt: 90 },
  { dept: 'EEE', students: 2, avgCGPA: 9.30, avgAtt: 93 },
  { dept: 'ECE', students: 2, avgCGPA: 8.65, avgAtt: 82 },
  { dept: 'MECH', students: 1, avgCGPA: 7.80, avgAtt: 68 },
  { dept: 'BCA', students: 1, avgCGPA: 8.70, avgAtt: 94 },
  { dept: 'MBA', students: 1, avgCGPA: 9.20, avgAtt: 96 },
];

const trendData = [
  { sem: 'Sem 1', avgCGPA: 7.9, avgAtt: 85 },
  { sem: 'Sem 2', avgCGPA: 8.1, avgAtt: 87 },
  { sem: 'Sem 3', avgCGPA: 8.3, avgAtt: 88 },
  { sem: 'Sem 4', avgCGPA: 8.5, avgAtt: 89 },
  { sem: 'Sem 5', avgCGPA: 8.7, avgAtt: 88 },
  { sem: 'Sem 6', avgCGPA: 8.8, avgAtt: 90 },
];

const feeStatusData = [
  { name: 'Paid', value: 7, color: '#10b981' },
  { name: 'Partial', value: 2, color: '#f59e0b' },
  { name: 'Pending', value: 1, color: '#ef4444' },
];

export default function PrincipalStudentsOverview() {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [tab, setTab] = useState('all');
  const [studentList, setStudentList] = useState([]);

  const [deptsList, setDeptsList] = useState(['All']);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, deptsRes, marksRes] = await Promise.all([
          getStudents(),
          getDepartments(),
          getAllMarks().catch(() => ({ data: [] }))
        ]);
        
        const marksData = marksRes?.data || [];
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
            return {
              id: sid,
              name: s.name,
              dept: s.dept || s.department || 'N/A',
              sem: s.sem || s.semester || 'N/A',
              cgpa: s.cgpa != null ? s.cgpa : 0,
              attendance: s.attendance != null ? s.attendance : 0,
              arrears: arrearsMap[sid] || 0,
              status: s.status || 'Active',
              feeStatus: s.feeStatus || 'Paid',
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
    };
    
    fetchData();
  }, []);

  const base = studentList.filter(s =>
    (filterDept === 'All' || s.dept === filterDept) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()))
  );

  const filtered = tab === 'top' ? [...base].sort((a, b) => b.cgpa - a.cgpa).slice(0, 5)
    : tab === 'lowatt' ? base.filter(s => s.attendance < 80)
    : base;

  const avgCGPA = (studentList.reduce((a, s) => a + s.cgpa, 0) / studentList.length).toFixed(2);
  const avgAtt = Math.round(studentList.reduce((a, s) => a + s.attendance, 0) / studentList.length);
  const lowAttCount = studentList.filter(s => s.attendance < 80).length;
  const topCount = studentList.filter(s => s.cgpa >= 9.0).length;

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
          { label: 'Total Students', value: studentList.length, icon: <Users size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: '6 departments' },
          { label: 'Avg CGPA', value: avgCGPA, icon: <Star size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'All students' },
          { label: 'Avg Attendance', value: `${avgAtt}%`, icon: <TrendingUp size={18} />, bgTint: '#FAEEDA', iconColor: '#B45309', sub: 'Below 75% target', subColor: '#B45309' },
          { label: 'Top Performers', value: topCount, icon: <Star size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'CGPA ≥ 9.0' },
          { label: 'Low Attendance', value: lowAttCount, icon: <AlertCircle size={18} />, bgTint: '#FCEBEB', iconColor: '#DC2626', sub: 'Below 80%', subColor: '#DC2626' },
          { label: 'Active Students', value: studentList.length, icon: <GraduationCap size={18} />, bgTint: '#E1F5EE', iconColor: '#047857', sub: 'All enrolled', subColor: '#047857' },
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
