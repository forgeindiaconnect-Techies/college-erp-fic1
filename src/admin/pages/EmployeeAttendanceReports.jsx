import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, Users, Briefcase, GraduationCap } from 'lucide-react';
import { getEmployeeAttendanceReports } from '../../api';
import './EmployeeAttendanceReports.css';

const EmployeeAttendanceReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchReports();
  }, [filterRole, filterDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterRole) params.role = filterRole;
      if (filterDate) params.date = filterDate;
      
      const res = await getEmployeeAttendanceReports(params);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to fetch employee attendance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present': return <span className="badge badge-success">Present</span>;
      case 'Absent': return <span className="badge badge-danger">Absent</span>;
      case 'LOP': return <span className="badge badge-danger">LOP</span>;
      case 'Half Day': return <span className="badge badge-warning">Half Day</span>;
      case 'Late': return <span className="badge badge-warning">Late</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="employee-reports-container animate-fade-in">
      <div className="reports-header">
        <div>
          <h1>Employee Attendance Reports</h1>
          <p>Monitor daily Check-In and Check-Out across all staff roles.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      <div className="filters-container glass-card mb-6">
        <div className="filter-group" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
          <div className="filter-select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Calendar size={14} className="text-muted" />
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
          <div className="filter-select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Filter size={14} className="text-muted" />
            <select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', minWidth: '150px' }}
            >
              <option value="">All Roles</option>
              <option value="Staff">Teaching Staff</option>
              <option value="HOD">HOD</option>
              <option value="Principal">Principal</option>
              <option value="Accounts">Accounts</option>
              <option value="Driver">Transport Driver</option>
            </select>
          </div>
        </div>
      </div>

      <div className="reports-table-card glass-card">
        {loading ? (
          <div className="loading-state">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="empty-state">No attendance records found for this date.</div>
        ) : (
          <div className="table-responsive">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((record) => (
                  <tr key={record._id}>
                    <td className="font-medium">
                      {record.employeeId?.name || record.employeeId}
                    </td>
                    <td>
                      <span className="role-tag">
                        {record.role === 'Staff' ? <GraduationCap size={14} /> : 
                         record.role === 'Driver' ? <Briefcase size={14} /> : <Users size={14} />}
                        {record.role}
                      </span>
                    </td>
                    <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                    <td className="font-mono">{formatTime(record.checkIn)}</td>
                    <td className="font-mono">{formatTime(record.checkOut)}</td>
                    <td>{getStatusBadge(record.status || (record.checkIn ? 'Present' : 'Absent'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendanceReports;
