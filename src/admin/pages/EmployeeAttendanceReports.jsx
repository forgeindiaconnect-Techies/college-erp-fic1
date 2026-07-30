import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, Users, Briefcase, GraduationCap, Search, X } from 'lucide-react';
import { getEmployeeAttendanceReports } from '../../api';
import './EmployeeAttendanceReports.css';

const EmployeeAttendanceReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

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
      case 'Present': return <span className="emp-badge emp-badge-success">Present</span>;
      case 'Absent': return <span className="emp-badge emp-badge-danger">Absent</span>;
      case 'LOP': return <span className="emp-badge emp-badge-danger">LOP</span>;
      case 'Half Day': return <span className="emp-badge emp-badge-warning">Half Day</span>;
      case 'Late': return <span className="emp-badge emp-badge-warning">Late</span>;
      default: return <span className="emp-badge emp-badge-secondary">{status}</span>;
    }
  };

  const filteredReports = reports.filter((record) => {
    if (!search) return true;
    const name = record.employeeId?.name || record.employeeId || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="employee-reports-container animate-fade-in">
      <div className="reports-header">
        <div>
          <h1>Employee Attendance Reports</h1>
          <p>Monitor daily Check-In and Check-Out across all staff roles.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Download size={18} style={{ display: 'inline', marginRight: '4px' }} /> Export PDF
          </button>
        </div>
      </div>

      <div className="glass-card mb-6">
        <div className="filters-row" style={{ borderBottom: 'none' }}>
          <div className="search-box">
            <Search size={17} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search employee by name..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={14} className="text-muted" />
              </button>
            )}
          </div>

          <div className="filter-group">
            {/* Date Selector */}
            <div className="filter-select-wrapper">
              <Calendar size={14} className="text-muted" />
              <input 
                type="date" 
                className="date-input"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <div className="filter-select-wrapper">
              <Filter size={14} className="text-muted" />
              <select 
                className="filter-select"
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
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
      </div>

      <div className="reports-table-card glass-card">
        {loading ? (
          <div className="loading-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No attendance records found.</div>
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
                {filteredReports.map((record) => (
                  <tr key={record._id}>
                    <td className="font-medium" style={{ fontWeight: 600 }}>
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
