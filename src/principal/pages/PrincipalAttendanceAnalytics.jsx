import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, AlertCircle, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import {
  getStudents,
  getAllAttendance
} from '../../api/index';
import '../../pages/Dashboard.css';
import useRealtimeSync from '../../hooks/useRealtimeSync';

export default function PrincipalAttendanceAnalytics() {
  const [view, setView] = useState('overview');
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [deptAttendance, setDeptAttendance] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [statusPie, setStatusPie] = useState([]);
  const [weekData, setWeekData] = useState([]);
  const [alertList, setAlertList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAttendanceData = useCallback(async () => {
    try {
      setLoading(true);

      const [studentsResponse, attendanceResponse] =
        await Promise.all([
          getStudents(),
          getAllAttendance()
        ]);

      const studentData = Array.isArray(studentsResponse.data)
        ? studentsResponse.data
        : studentsResponse.data?.students ||
          studentsResponse.data?.data ||
          [];

      const attendanceData = Array.isArray(attendanceResponse.data)
        ? attendanceResponse.data
        : attendanceResponse.data?.records ||
          attendanceResponse.data?.data ||
          [];

      setStudents(studentData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error(
        'Failed to load Principal attendance data:',
        error
      );

      setStudents([]);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  useRealtimeSync(
    loadAttendanceData,
    ['attendance', 'students']
  );

  useEffect(() => {
    const studentAttendanceMap = {};

    attendanceRecords.forEach(record => {
      const rawStudentId = record.studentId;

      const student = students.find(item =>
        String(item.id || '') === String(rawStudentId) ||
        String(item._id || '') === String(rawStudentId) ||
        (
          record.studentName &&
          item.name &&
          String(item.name).trim().toLowerCase() ===
            String(record.studentName).trim().toLowerCase()
        )
      );

      const studentId =
        student?.id ||
        student?._id ||
        rawStudentId ||
        String(record.studentName || '')
          .trim()
          .toLowerCase();

      if (!studentAttendanceMap[studentId]) {

        studentAttendanceMap[studentId] = {
          studentId,
          name:
            record.studentName ||
            student?.name ||
            'Unknown Student',
          dept:
            record.department ||
            student?.department ||
            student?.dept ||
            'Unknown Department',
          sem:
            record.semester ||
            student?.semester ||
            student?.sem ||
            '',
          present: 0,
          total: 0
        };
      }

      studentAttendanceMap[studentId].total += 1;

      if (
        String(record.status).toLowerCase() === 'present'
      ) {
        studentAttendanceMap[studentId].present += 1;
      }
    });

    const calculatedStudents = Object.values(
      studentAttendanceMap
    ).map(student => ({
      ...student,
      attendance:
        student.total > 0
          ? Number(
              (
                (student.present / student.total) *
                100
              ).toFixed(1)
            )
          : 0
    }));

    const lowAttendance = calculatedStudents
      .filter(student => student.attendance < 80)
      .map(student => ({
        ...student,
        alert:
          student.attendance < 75
            ? 'Critical'
            : 'Warning'
      }))
      .sort((a, b) => a.attendance - b.attendance);

    setAlertList(lowAttendance);

    setStatusPie([
      {
        name: 'Excellent (≥90%)',
        value: calculatedStudents.filter(
          student => student.attendance >= 90
        ).length,
        color: '#10b981'
      },
      {
        name: 'Average (75–89%)',
        value: calculatedStudents.filter(
          student =>
            student.attendance >= 75 &&
            student.attendance < 90
        ).length,
        color: '#f59e0b'
      },
      {
        name: 'Low (<75%)',
        value: calculatedStudents.filter(
          student => student.attendance < 75
        ).length,
        color: '#ef4444'
      }
    ]);
  }, [students, attendanceRecords]);

  useEffect(() => {
    const departmentMap = {};

    attendanceRecords.forEach(record => {
      const department =
        record.department ||
        'Unknown Department';

      if (!departmentMap[department]) {
        departmentMap[department] = {
          dept: department,
          presentCount: 0,
          totalCount: 0
        };
      }

      departmentMap[department].totalCount += 1;

      if (
        String(record.status).toLowerCase() === 'present'
      ) {
        departmentMap[department].presentCount += 1;
      }
    });

    const departmentResults = Object.values(
      departmentMap
    ).map(department => {
      const present =
        department.totalCount > 0
          ? Number(
              (
                (department.presentCount /
                  department.totalCount) *
                100
              ).toFixed(1)
            )
          : 0;

      return {
        dept: department.dept,
        present,
        absent: Number((100 - present).toFixed(1)),
        avg: present
      };
    });

    setDeptAttendance(departmentResults);
  }, [attendanceRecords]);

  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDay();

    const monday = new Date(today);
    monday.setDate(
      today.getDate() -
      (currentDay === 0 ? 6 : currentDay - 1)
    );
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const dayNames = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat'
    ];

    const weeklyMap = {};

    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.attendanceDate);

      if (recordDate < monday || recordDate > sunday) {
        return;
      }

      const day = dayNames[recordDate.getDay()];

      if (!weeklyMap[day]) {
        weeklyMap[day] = {
          day,
          presentCount: 0,
          totalCount: 0,
          order: recordDate.getDay()
        };
      }

      weeklyMap[day].totalCount += 1;

      if (
        String(record.status).toLowerCase() === 'present'
      ) {
        weeklyMap[day].presentCount += 1;
      }
    });

    const weeklyResults = Object.values(weeklyMap)
      .map(item => {
        const present =
          item.totalCount > 0
            ? Number(
                (
                  (item.presentCount / item.totalCount) *
                  100
                ).toFixed(1)
              )
            : 0;

        return {
          day: item.day,
          present,
          absent: Number((100 - present).toFixed(1)),
          order: item.order
        };
      })
      .sort((a, b) => a.order - b.order);

    setWeekData(weeklyResults);
  }, [attendanceRecords]);

  useEffect(() => {
    const monthlyMap = {};

    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.attendanceDate);

      if (Number.isNaN(recordDate.getTime())) {
        return;
      }

      const monthKey = `${recordDate.getFullYear()}-${String(
        recordDate.getMonth() + 1
      ).padStart(2, '0')}`;

      const monthLabel = recordDate.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          year: 'numeric'
        }
      );

      const department =
        record.department ||
        'Unknown Department';

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          monthKey,
          month: monthLabel,
          presentCount: 0,
          totalCount: 0,
          departments: {}
        };
      }

      const month = monthlyMap[monthKey];

      month.totalCount += 1;

      if (!month.departments[department]) {
        month.departments[department] = {
          presentCount: 0,
          totalCount: 0
        };
      }

      month.departments[department].totalCount += 1;

      if (
        String(record.status).toLowerCase() === 'present'
      ) {
        month.presentCount += 1;
        month.departments[department].presentCount += 1;
      }
    });

    const monthlyResults = Object.values(monthlyMap)
      .sort((a, b) =>
        a.monthKey.localeCompare(b.monthKey)
      )
      .map(month => {
        const result = {
          month: month.month,
          overall:
            month.totalCount > 0
              ? Number(
                  (
                    (month.presentCount /
                      month.totalCount) *
                    100
                  ).toFixed(1)
                )
              : 0
        };

        Object.entries(month.departments).forEach(
          ([department, values]) => {
            result[department] =
              values.totalCount > 0
                ? Number(
                    (
                      (values.presentCount /
                        values.totalCount) *
                      100
                    ).toFixed(1)
                  )
                : 0;
          }
        );

        return result;
      });

    setMonthlyData(monthlyResults);
  }, [attendanceRecords]);

  const overall =
    deptAttendance.length > 0
      ? Number(
          (
            deptAttendance.reduce(
              (sum, department) =>
                sum + department.avg,
              0
            ) / deptAttendance.length
          ).toFixed(1)
        )
      : 0;

  const chartColours = [
    '#6366f1',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#3b82f6',
    '#8b5cf6',
    '#14b8a6',
    '#ec4899'
  ];

  const todayDate = new Date().toLocaleDateString('en-CA');

  const todayRecords = attendanceRecords.filter(record =>
    new Date(record.attendanceDate)
      .toLocaleDateString('en-CA') === todayDate
  );

  const todayPresentCount = todayRecords.filter(record =>
    String(record.status).toLowerCase() === 'present'
  ).length;

  const presentToday =
    todayRecords.length > 0
      ? Number(
          (
            (todayPresentCount / todayRecords.length) *
            100
          ).toFixed(1)
        )
      : 0;

  const absentToday =
    todayRecords.length > 0
      ? Number((100 - presentToday).toFixed(1))
      : 0;

  const highestDepartment =
    deptAttendance.length > 0
      ? [...deptAttendance].sort(
          (a, b) => b.avg - a.avg
        )[0]
      : null;

  const lowestDepartment =
    deptAttendance.length > 0
      ? [...deptAttendance].sort(
          (a, b) => a.avg - b.avg
        )[0]
      : null;

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarCheck style={{ color: '#3730A5' }} size={28} /> Attendance Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time attendance monitoring, low attendance alerts, and trend analysis.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Overall Attendance', value: `${overall}%`, icon: <CheckCircle size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: 'All departments' },
          { label: 'Present Today', value: `${presentToday}%`, icon: <Users size={18} />, color: 'var(--primary)', bg: '#EEEDFE', sub: `${todayPresentCount} attendance entries` },
          { label: 'Absent Today', value: `${absentToday}%`, icon: <AlertCircle size={18} />, color: 'var(--danger)', bg: '#FCEBEB', sub: `${todayRecords.length - todayPresentCount} attendance entries` },
          { label: 'Low Attendance', value: alertList.length, icon: <AlertCircle size={18} />, color: 'var(--warning)', bg: '#FAEEDA', sub: 'Below 80%' },
          { label: 'Dept with Highest', value: highestDepartment?.dept || '—', icon: <TrendingUp size={18} />, color: 'var(--success)', bg: '#E1F5EE', sub: highestDepartment ? `${highestDepartment.avg}% attendance` : 'No records' },
          { label: 'Dept with Lowest', value: lowestDepartment?.dept || '—', icon: <AlertCircle size={18} />, color: 'var(--danger)', bg: '#FCEBEB', sub: lowestDepartment ? `${lowestDepartment.avg}% attendance` : 'No records' },
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

      {/* Tab Selector */}
      <div className="glass-card" style={{ padding: '0.4rem', borderRadius: 12, display: 'inline-flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {[['overview', '📊 Overview'], ['monthly', '📈 Monthly Trend'], ['alerts', '🚨 Low Att. Alerts']].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{ padding: '0.55rem 1.1rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, background: view === key ? '#3730A5' : 'transparent', color: view === key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {view === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 260px', gap: '1.2rem' }} className="animate-fade-in">
          {/* Dept Bar Chart */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Department Attendance Comparison</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptAttendance} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="present" fill="#10b981" name="Present %" radius={[5, 5, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" name="Absent %" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly trend */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>This Week's Daily Attendance</h4>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#gradPresent)" name="Present %" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1rem' }}>Attendance Distribution</h4>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {statusPie.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.75rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)', flex: 1 }}>{s.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', background: 'var(--bg-secondary)', borderRadius: 10, padding: '0.8rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL CAMPUS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: overall >= 85 ? '#10b981' : '#f59e0b' }}>{overall}%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average Attendance</div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend Tab */}
      {view === 'monthly' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Monthly Attendance by Department</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {deptAttendance.map((department, index) => (
                  <Line
                    key={department.dept}
                    type="monotone"
                    dataKey={department.dept}
                    name={department.dept}
                    stroke={
                      chartColours[index % chartColours.length]
                    }
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>Overall Campus Monthly Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[80, 95]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="overall" stroke="#6366f1" fill="url(#gradOverall)" name="Overall %" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Low Attendance Alerts Tab */}
      {view === 'alerts' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '1rem' }}>⚠️ Low Attendance Alert — Action Required</h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Student Name</th><th>Department</th><th>Semester</th><th>Attendance %</th><th>Alert Level</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {alertList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: 'center',
                          padding: '2.5rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        No students with low attendance.
                      </td>
                    </tr>
                  ) : alertList.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.dept}</td>
                      <td style={{ fontSize: '0.82rem' }}>{s.sem}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 80, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                            <div style={{ width: `${s.attendance}%`, height: '100%', background: s.attendance < 75 ? '#ef4444' : s.attendance < 85 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 800, color: s.attendance < 75 ? '#ef4444' : '#f59e0b' }}>{s.attendance}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ background: s.alert === 'Critical' ? 'rgba(239,68,68,0.12)' : s.alert === 'Warning' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)', color: s.alert === 'Critical' ? '#ef4444' : s.alert === 'Warning' ? '#f59e0b' : '#6366f1', padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{s.alert}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Notify Parent</button>
                          <button style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Counselor</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.2rem', background: 'rgba(239,68,68,0.06)', borderRadius: 10, padding: '1rem', borderLeft: '3px solid #ef4444', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              ⚠️ <strong style={{ color: 'var(--text-main)' }}>Policy:</strong> Students below 75% attendance are debarred from semester examinations. Immediate HOD and parent notification is mandatory.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
