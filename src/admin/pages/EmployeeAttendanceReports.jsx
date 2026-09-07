import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Download,
  Users,
  Briefcase,
  GraduationCap,
  Search,
  X,
  Check,
  Save
} from 'lucide-react';
import {
  getEmployeeAttendanceReports,
  markStaffAttendance,
  adminCheckoutStaff,
  getDepartments
} from '../../api';
import './EmployeeAttendanceReports.css';

const EmployeeAttendanceReports = () => {
  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  const [mode, setMode] = useState('report');
  const [markingState, setMarkingState] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [filterRole, filterDepartment, filterDate]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await getDepartments();
        setDepartments(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (error) {
        console.error('Unable to load departments:', error);
      }
    };

    loadDepartments();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterRole) params.role = filterRole;
      if (filterDepartment) {
        params.department = filterDepartment;
      }
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

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-';

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const difference = end - start;

    if (difference <= 0) return '-';

    const totalMinutes = Math.floor(difference / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
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

  const handleMarkStaff = (employeeId, status) => {
    setMarkingState(previous => ({
      ...previous,
      [employeeId]: status
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};

    filteredReports.forEach(record => {
      const employeeId =
        record.employeeId?._id || record.employeeId;

      if (employeeId) {
        updated[employeeId] = status;
      }
    });

    setMarkingState(updated);
  };

  const handleSaveStaffAttendance = async () => {
    const records = filteredReports
      .map(record => {
        const employeeId =
          record.employeeId?._id || record.employeeId;

        const status = markingState[employeeId];

        if (!employeeId || !status) return null;

        return {
          employeeId,
          role: record.role || 'Staff',
          status
        };
      })
      .filter(Boolean);

    if (records.length === 0) {
      alert('Please mark attendance for at least one staff member.');
      return;
    }

    try {
      setSaving(true);

      await markStaffAttendance({
        date: filterDate,
        records
      });

      setSaveSuccess(true);
      setMarkingState({});
      await fetchReports();
      setMode('report');

      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        'Unable to save staff attendance.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdminCheckout = async (employeeId) => {
    try {
      await adminCheckoutStaff(employeeId, filterDate);
      await fetchReports();
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        'Unable to check out staff.'
      );
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
          <button
            type="button"
            className={mode === 'report' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setMode('report')}
          >
            <Users size={17} />
            Attendance Report
          </button>

          <button
            type="button"
            className={mode === 'mark' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setMode('mark')}
          >
            <Check size={17} />
            Mark Staff Attendance
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            <Download size={17} />
            Export
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

            <div className="filter-select-wrapper">
              <Briefcase size={14} className="text-muted" />

              <select
                className="filter-select"
                value={filterDepartment}
                onChange={(event) =>
                  setFilterDepartment(event.target.value)
                }
              >
                <option value="">All Departments</option>

                {departments.map(department => (
                  <option
                    key={department._id || department.id}
                    value={department.name}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {mode === 'mark' && (
        <div className="staff-rollcall-toolbar">
          <div>
            <strong>Daily Staff Roll Call</strong>
            <span>
              {' '}· {filteredReports.length} employees · {filterDate}
            </span>
          </div>

          <div className="staff-rollcall-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleMarkAll('Present')}
            >
              Mark All Present
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleMarkAll('Absent')}
            >
              Mark All Absent
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={handleSaveStaffAttendance}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Staff Attendance'}
            </button>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="staff-attendance-success">
          Staff attendance saved successfully.
        </div>
      )}

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
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                  {mode === 'report' && <th>Action</th>}
                  {mode === 'mark' && <th>Mark Attendance</th>}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((record) => {
                  const employeeId =
                    record.employeeId?._id || record.employeeId;

                  const selectedStatus =
                    markingState[employeeId] || '';

                  return (
                    <tr key={record._id}>
                      <td className="font-medium" style={{ fontWeight: 600 }}>
                        {record.employeeId?.name || record.employeeId}
                      </td>
                      <td>
                        {record.employeeId?.department || 'Not Assigned'}
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
                      <td className="font-mono">
                        {calculateWorkingHours(record.checkIn, record.checkOut)}
                      </td>
                      <td>{getStatusBadge(record.status || (record.checkIn ? 'Present' : 'Absent'))}</td>
                      {mode === 'report' && (
                        <td>
                          {record.checkIn && !record.checkOut ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleAdminCheckout(employeeId)}
                            >
                              Check Out
                            </button>
                          ) : record.checkOut ? (
                            <span className="emp-badge emp-badge-success">
                              Completed
                            </span>
                          ) : (
                            <span className="text-muted">
                              Not Checked In
                            </span>
                          )}
                        </td>
                      )}
                      {mode === 'mark' && (
                        <td>
                          <div className="staff-mark-actions">
                            {['Present', 'Absent', 'Late', 'Leave', 'LOP'].map(status => (
                              <button
                                key={status}
                                type="button"
                                className={`staff-status-btn status-${status.toLowerCase()} ${
                                  selectedStatus === status ? 'active' : ''
                                }`}
                                onClick={() => handleMarkStaff(employeeId, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendanceReports;
