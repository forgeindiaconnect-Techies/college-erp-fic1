import React, { useState, useEffect, useCallback } from 'react';
import {
  Check, X, Search, Calendar, User, Clock, CheckCircle2,
  AlertCircle, FileText, Users, Shield, Bus, Filter, RefreshCw,
  Building, UserCheck, UserX, Award, HelpCircle
} from 'lucide-react';
import './LeavesManagement.css';
import { getLeaves, updateLeaveStatus, getLeaveAttendanceSummary } from '../../api';
import useRealtimeSync, { emitERPDataUpdate } from '../../hooks/useRealtimeSync';

const DEFAULT_LEAVES = [
  { id: 'LR001', name: 'John Doe', staffId: 'CS2022001', role: 'Student', dept: 'Computer Science', type: 'Medical Leave', startDate: '2026-05-24', endDate: '2026-05-26', reason: 'Suffering from viral fever and prescribed bed rest.', status: 'Pending', collegeId: 'COL001' },
  { id: 'LR002', name: 'Dr. Ananya Rao', staffId: 'STF008', role: 'Staff', dept: 'Computer Science', type: 'Casual Leave', startDate: '2026-05-27', endDate: '2026-05-28', reason: 'Need to attend an international educational seminar.', status: 'Pending', collegeId: 'COL001' },
  { id: 'LR003', name: 'Alice Smith', staffId: 'CS2022002', role: 'Student', dept: 'Electrical Engg.', type: 'Casual Leave', startDate: '2026-05-15', endDate: '2026-05-16', reason: 'Family function at home.', status: 'Approved', collegeId: 'COL001' }
];

const LeavesManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Attendance & Absence Real-Time Stats State
  const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0]);
  const [statsRole, setStatsRole] = useState('All');
  const [statsLoading, setStatsLoading] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    approvedLeaveCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    roster: []
  });

  // Fetch Leaves Queue
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    try {
      const res = await getLeaves();
      const records = Array.isArray(res.data) ? res.data : [];
      if (records.length > 0) {
        setLeaves(records);
        localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(records));
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('API leave fetch fallback:', err.message);
    }

    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    if (saved) {
      try {
        setLeaves(JSON.parse(saved));
      } catch {
        setLeaves(DEFAULT_LEAVES);
      }
    } else {
      localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(DEFAULT_LEAVES));
      setLeaves(DEFAULT_LEAVES);
    }
    setLoading(false);
  }, []);

  // Fetch Real Database Attendance and Absence Statistics
  const fetchAttendanceStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getLeaveAttendanceSummary({ date: statsDate, role: statsRole });
      if (res.data && res.data.success) {
        setAttendanceStats({
          totalEmployees: res.data.totalEmployees || 0,
          presentCount: res.data.presentCount || 0,
          absentCount: res.data.absentCount || 0,
          approvedLeaveCount: res.data.approvedLeaveCount || 0,
          pendingCount: res.data.pendingCount || 0,
          rejectedCount: res.data.rejectedCount || 0,
          roster: res.data.roster || []
        });
      }
    } catch (err) {
      console.warn('Failed to fetch attendance summary:', err.message);
    } finally {
      setStatsLoading(false);
    }
  }, [statsDate, statsRole]);

  useEffect(() => {
    fetchLeaves();
    window.addEventListener('storage', fetchLeaves);
    return () => window.removeEventListener('storage', fetchLeaves);
  }, [fetchLeaves]);

  useEffect(() => {
    fetchAttendanceStats();
  }, [fetchAttendanceStats]);

  useRealtimeSync(() => {
    fetchLeaves();
    fetchAttendanceStats();
  }, ['leaves', 'staffSupportUpdated']);

  // Handle Approve / Reject
  const handleAction = async (id, newStatus) => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const updated = leaves.map(l => (l.id === id || l._id === id) ? { ...l, status: newStatus, approvedBy: newStatus === 'Approved' ? 'Central Admin' : l.approvedBy } : l);
    setLeaves(updated);
    localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    try {
      const res = await updateLeaveStatus(id, {
        action: newStatus === 'Approved' ? 'approve' : 'reject',
        status: newStatus,
        remarks: newStatus === 'Approved' ? 'Final approval confirmed by Central Admin' : 'Declined by Central Admin'
      });
      emitERPDataUpdate(['leaves', 'staffSupportUpdated'], 'updated', res?.data || { id, status: newStatus });
      fetchAttendanceStats();
    } catch (err) {
      console.warn('Failed to update leave status on server:', err.message);
    }
  };

  // Filter Leaves
  const filtered = leaves.filter(l => {
    const q = search.toLowerCase();
    const name = l.name || l.staffName || 'Unknown User';
    const staffId = l.staffId || l.studentId || '';
    const studentName = l.studentName || '';
    const studentId = l.studentId || '';
    const reason = l.reason || l.description || '';
    const type = l.type || l.leaveType || '';
    const status = l.status || 'Pending';
    const role = l.role || 'Staff';
    const isParentRequest = role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'));

    // Text Search
    const matchesSearch = name.toLowerCase().includes(q) || 
                          staffId.toLowerCase().includes(q) ||
                          studentName.toLowerCase().includes(q) ||
                          studentId.toLowerCase().includes(q) ||
                          reason.toLowerCase().includes(q) || 
                          type.toLowerCase().includes(q);

    // Role Filter
    let matchesRole = true;
    if (selectedRoleFilter === 'Watchman') {
      matchesRole = role === 'Watchman';
    } else if (selectedRoleFilter === 'Driver') {
      matchesRole = role === 'Driver';
    } else if (selectedRoleFilter === 'Faculty / Staff') {
      matchesRole = role === 'Staff' || role === 'Faculty';
    } else if (selectedRoleFilter === 'HOD') {
      matchesRole = role === 'HOD';
    } else if (selectedRoleFilter === 'Students') {
      matchesRole = role === 'Student';
    } else if (selectedRoleFilter === 'Parents') {
      matchesRole = isParentRequest;
    }

    if (!matchesRole || !matchesSearch) return false;

    // Tab Filter
    if (activeTab === 'Parent Requests') {
      return isParentRequest;
    }
    if (activeTab === 'Pending') {
      return status !== 'Approved' && status !== 'Rejected' && status !== 'Cancelled';
    }
    if (activeTab === 'All Requests') {
      return true;
    }
    return status === activeTab;
  });

  // Role Badge Helper
  const renderRoleBadge = (role, isParent) => {
    if (isParent) {
      return (
        <span style={{ fontWeight: 800, fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
          Parent (for Ward)
        </span>
      );
    }
    if (role === 'Watchman') {
      return (
        <span style={{ fontWeight: 800, fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px', background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Shield size={12} /> Watchman
        </span>
      );
    }
    if (role === 'Driver') {
      return (
        <span style={{ fontWeight: 800, fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Bus size={12} /> Driver
        </span>
      );
    }
    if (role === 'Staff' || role === 'Faculty') {
      return (
        <span style={{ fontWeight: 800, fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px', background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
          {role}
        </span>
      );
    }
    if (role === 'HOD') {
      return (
        <span style={{ fontWeight: 800, fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px', background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>
          HOD
        </span>
      );
    }
    return (
      <span style={{ fontWeight: 800, fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px', background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }}>
        {role || 'Student'}
      </span>
    );
  };

  return (
    <div className="leaves-management animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Institutional Leave & Attendance Console
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              Central HRMS & Gate Operations
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Audit and approve leave requests for Watchmen, Drivers, Staff, Faculty, HODs, and Students. Monitor verified attendance vs absences.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { fetchLeaves(); fetchAttendanceStats(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading || statsLoading ? 'animate-spin' : ''} /> Sync All Records
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Live Sync Active
          </span>
        </div>
      </div>

      {/* 2. SECTION: REAL-TIME ATTENDANCE AND ABSENCE REPORTS */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#0284c7', color: '#fff', padding: '6px', borderRadius: '8px' }}>
                <Calendar size={18} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Real-Time Attendance & Absence Summary
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
              Calculated using actual attendance records, approved leave records, and the selected date. Approved leave is strictly segregated from unexplained absence.
            </p>
          </div>

          {/* Filter Controls: Date Filter & Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Date Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 12px' }}>
              <Calendar size={15} color="#475569" />
              <input
                type="date"
                value={statsDate}
                onChange={e => setStatsDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}
              />
            </div>

            {/* Role Filter Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 12px' }}>
              <Filter size={15} color="#475569" />
              <select
                value={statsRole}
                onChange={e => setStatsRole(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="All">All Employees (Watchmen, Drivers, Staff, HODs)</option>
                <option value="Watchman">Watchman Gate Guards Only</option>
                <option value="Driver">Transport Drivers Only</option>
                <option value="Staff">Faculty & Academic Staff</option>
                <option value="HOD">Department HODs</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6 Real Database KPI Metric Statistics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
          
          {/* 1. Total Employees */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Total Employees</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
              {attendanceStats.totalEmployees} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Staff</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Active in {statsRole === 'All' ? 'all operations' : statsRole}</div>
          </div>

          {/* 2. Number of Employees Present */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>Employees Present</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
              {attendanceStats.presentCount} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>On Duty</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#166534' }}>Verified check-ins on {statsDate}</div>
          </div>

          {/* 3. Number of Employees Absent (Unexplained) */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Employees Absent</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#b91c1c', margin: '4px 0 2px' }}>
              {attendanceStats.absentCount} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>Absent</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#991b1b' }}>Unexplained absence (No approved leave)</div>
          </div>

          {/* 4. Number of Employees on Approved Leave */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>On Approved Leave</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#1e40af', margin: '4px 0 2px' }}>
              {attendanceStats.approvedLeaveCount} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>Sanctioned</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#1e40af' }}>Officially granted absence for date</div>
          </div>

          {/* 5. Number of Pending Leave Requests */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #d97706' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Pending Leave Requests</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>
              {attendanceStats.pendingCount} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706' }}>Pending</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#b45309' }}>Requires Admin action</div>
          </div>

          {/* 6. Number of Rejected Leave Requests */}
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#fafaf9', border: '1px solid #e7e5e4', borderLeft: '4px solid #78716c' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78716c', textTransform: 'uppercase' }}>Rejected Requests</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#44403c', margin: '4px 0 2px' }}>
              {attendanceStats.rejectedCount} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#78716c' }}>Declined</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#78716c' }}>Declined applications</div>
          </div>

        </div>
      </div>

      {/* 3. SECTION: LEAVE REQUESTS CONSOLE & QUEUE TABLE */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Controls row: Tab Buttons, Role Filter Pills, and Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', overflowX: 'auto', maxWidth: '100%' }}>
            {['Pending', 'Approved', 'Rejected', 'Parent Requests', 'All Requests'].map(tab => {
              let count = 0;
              if (tab === 'Parent Requests') {
                count = leaves.filter(l => l.role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'))).length;
              } else if (tab === 'Pending') {
                count = leaves.filter(l => (l.status || 'Pending') !== 'Approved' && l.status !== 'Rejected' && l.status !== 'Cancelled').length;
              } else if (tab === 'All Requests') {
                count = leaves.length;
              } else {
                count = leaves.filter(l => (l.status || 'Pending') === tab).length;
              }
              const isActive = activeTab === tab;
              return (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab === 'Parent Requests' && <Users size={14} color={isActive ? '#059669' : '#64748b'} />}
                  {tab} <span style={{ fontSize: '0.75rem', opacity: 0.85, background: isActive ? '#e2e8f0' : '#e2e8f0', padding: '1px 6px', borderRadius: '10px' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Role Filter & Search bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px' }}>
              <Filter size={15} color="#64748b" />
              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="All">All Applicant Roles</option>
                <option value="Watchman">Watchman Requests Only</option>
                <option value="Driver">Driver Requests Only</option>
                <option value="Faculty / Staff">Faculty / Staff</option>
                <option value="HOD">Department HODs</option>
                <option value="Students">Student Scholars</option>
                <option value="Parents">Parents (for Ward)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px', minWidth: '280px' }}>
              <Search size={16} color="#64748b" />
              <input 
                type="text" 
                placeholder="Search applicant, employee ID, reason..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem', color: '#0f172a' }}
              />
            </div>
          </div>
        </div>

        {/* Real-time Institutional Leaves Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Employee / Student</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Role</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>ID & College</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Department</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Leave Category</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Dates & Duration</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Reason / Description</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} style={{ padding: '12px' }}><div className="skeleton" style={{ height: '36px', borderRadius: '8px' }}></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <Clock size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.92rem' }}>No leave applications found in this view</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Submitted Watchman, Driver, and Staff requests will appear here with live action controls.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const name = l.name || l.staffName || 'Unknown Applicant';
                  const role = l.role || (l.staffId?.startsWith('STF') ? 'Staff' : l.staffId?.startsWith('WMN') ? 'Watchman' : l.staffId?.startsWith('DRV') ? 'Driver' : 'Student');
                  const empId = l.staffId || l.studentId || '—';
                  const college = l.collegeId || 'COL001';
                  const isParent = role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'));
                  const status = l.status || 'Pending';
                  const dept = l.dept || l.department || (role === 'Watchman' ? 'Campus Security & Safety' : role === 'Driver' ? 'Transport Division' : 'General');
                  const isApproved = status === 'Approved';
                  const isRejected = status === 'Rejected';
                  const isPending = !isApproved && !isRejected && status !== 'Cancelled';
                  const studentName = l.studentName || (isParent && l.description && l.description.match(/Ward:\s*([^|(]+)/i)?.[1]?.trim()) || '';
                  const studentId = l.studentId || (isParent && l.description && l.description.match(/\(([^)]+)\)/)?.[1]?.trim()) || '';
                  
                  return (
                    <tr key={l.id || l._id} style={{ background: '#f8fafc', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      
                      {/* 1. Applicant Details */}
                      <td style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            background: role === 'Watchman' ? '#cffafe' : role === 'Driver' ? '#fef3c7' : isParent ? '#d1fae5' : '#e0e7ff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: role === 'Watchman' ? '#0891b2' : role === 'Driver' ? '#b45309' : isParent ? '#065f46' : '#4338ca', 
                            fontWeight: 800, 
                            fontSize: '0.86rem' 
                          }}>
                            {role === 'Watchman' ? '🛡️' : role === 'Driver' ? '🚌' : (name.charAt(0).toUpperCase())}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                              {isParent ? (l.parentName || name) : name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Submitted: {l.createdAt || l.startDate}
                            </div>
                            {isParent && (
                              <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700, marginTop: '2px' }}>
                                Ward: {studentName || 'Student'} ({studentId})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Role */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderRoleBadge(role, isParent)}
                      </td>

                      {/* 3. Employee ID & College */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{empId}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{college}</div>
                      </td>

                      {/* 4. Department */}
                      <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                        {dept}
                      </td>

                      {/* 5. Leave Category */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                        {l.type || l.leaveType}
                      </td>

                      {/* 6. Dates & Duration */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                          <Calendar size={13} color="#64748b" />
                          {l.startDate} to {l.endDate}
                        </div>
                        {l.daysCount && (
                          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, marginTop: '2px' }}>
                            {l.daysCount} Day{l.daysCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>

                      {/* 7. Reason / Handover */}
                      <td style={{ padding: '12px 14px', maxWidth: '220px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason || l.description}>
                          <FileText size={13} color="#64748b" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {l.reason || l.description}
                        </div>
                      </td>

                      {/* 8. Status */}
                      <td style={{ padding: '12px 14px' }}>
                        {isApproved ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            <CheckCircle2 size={13} /> Approved
                          </span>
                        ) : isRejected ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                            <AlertCircle size={13} /> Rejected
                          </span>
                        ) : status === 'Pending Admin Approval' ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fdf4ff', color: '#86198f', border: '1px solid #f5d0fe' }}>
                            <Clock size={13} /> Pending Admin Review
                          </span>
                        ) : status === 'HOD Approved – Pending Admin Approval' ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                            <Clock size={13} /> HOD Approved – Awaiting Admin
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                            <Clock size={13} /> Pending Review
                          </span>
                        )}
                      </td>

                      {/* 9. Action Buttons */}
                      <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleAction(l.id || l._id, 'Approved')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#16a34a',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(22,163,74,0.2)'
                              }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button 
                              onClick={() => handleAction(l.id || l._id, 'Rejected')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: isApproved ? '#15803d' : '#b91c1c' }}>
                            {isApproved ? `Approved by ${l.approvedBy || 'Admin'}` : (l.rejectionReason || 'Declined')}
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default LeavesManagement;
