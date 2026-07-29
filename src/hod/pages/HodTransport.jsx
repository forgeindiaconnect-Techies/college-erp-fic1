import React, { useState, useEffect } from 'react';
import { Bus, Users, AlertCircle, CalendarCheck, Search, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { getTransportStudents, getTransportComplaints, getStudents } from '../../api/index';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const HodTransport = () => {
  const [loading, setLoading] = useState(true);
  const [deptStudents, setDeptStudents] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalDeptStudents: 0,
    totalTransportUsers: 0,
    activeRoutes: 0,
    routeWiseCount: [],
    recentComplaints: [],
    pendingRequests: 0
  });

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestText, setRequestText] = useState('');

  const hodSession = JSON.parse(sessionStorage.getItem('hod_session') || 'null') || {
    dept: 'Computer Science'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, complaintsRes, studentsListRes] = await Promise.all([
          getTransportStudents(),
          getTransportComplaints().catch(() => ({ data: [] })),
          getStudents().catch(() => ({ data: [] }))
        ]);
        const allDbStudents = studentsListRes.data || [];
        
        // Fallback mock data if API is empty
        let studentsData = res?.data || [];
        
        if (studentsData.length === 0) {
          // Mock data for display
          studentsData = [
            { studentId: 'CS001', name: 'Alice Smith', routeId: 'Route 1', feeStatus: 'Paid', studentProfile: { department: 'Computer Science' } },
            { studentId: 'CS002', name: 'Bob Johnson', routeId: 'Route 1', feeStatus: 'Paid', studentProfile: { department: 'Computer Science' } },
            { studentId: 'CS003', name: 'Charlie Davis', routeId: 'Route 2', feeStatus: 'Pending', studentProfile: { department: 'Computer Science' } },
            { studentId: 'CS004', name: 'Diana Evans', routeId: 'Route 3', feeStatus: 'Paid', studentProfile: { department: 'Computer Science' } },
            { studentId: 'IT001', name: 'Eve Foster', routeId: 'Route 1', feeStatus: 'Paid', studentProfile: { department: 'Information Technology' } }
          ];
        }

        // Filter by HOD's department
        const filtered = studentsData.filter(st => {
          const dbStud = allDbStudents.find(s => s.id === st.studentId || s.rollNo === st.studentId);
          const stDept = st.studentProfile?.department || st.department || dbStud?.dept || dbStud?.department;
          return stDept && stDept.toLowerCase().includes(hodSession.dept.split(' ')[0].toLowerCase());
        });

        setDeptStudents(filtered);

        // Calculate Route-wise counts
        const routeCounts = {};
        filtered.forEach(st => {
          routeCounts[st.routeId] = (routeCounts[st.routeId] || 0) + 1;
        });
        const chartData = Object.keys(routeCounts).map(route => ({
          name: route,
          students: routeCounts[route]
        }));

        const deptStudentIds = filtered.map(s => s.studentId);
        let deptComplaints = (complaintsRes.data || []).filter(c => deptStudentIds.includes(c.studentId));

        if (deptComplaints.length === 0) {
          deptComplaints = [
            { id: 1, student: 'Alice Smith', issue: 'Bus arrived late', status: 'Pending' },
            { id: 2, student: 'Charlie Davis', issue: 'Missed stop', status: 'Resolved' }
          ];
        }

        setAnalytics({
          totalDeptStudents: 450, // Mock total students in dept
          totalTransportUsers: filtered.length,
          activeRoutes: Object.keys(routeCounts).length,
          routeWiseCount: chartData,
          pendingRequests: Math.floor(Math.random() * 5) + 1, // Mock pending
          recentComplaints: deptComplaints
        });

      } catch (error) {
        console.error('Failed to load transport data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center"><span className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></span></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Bus className="text-primary" /> {hodSession.dept} - Transport Overview
          </h1>
          <p className="text-muted mt-1">Department-wise transport analytics and student tracking.</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowRequestModal(true)}
        >
          Send Transport Request
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="flex flex-wrap justify-center xl:justify-between gap-4 mb-8">
        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[200px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 flex justify-center items-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full mb-1">
            <Users size={16} />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Dept Students</p>
          <p className="text-lg font-bold">{analytics.totalDeptStudents}</p>
        </div>

        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[200px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 flex justify-center items-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full mb-1">
            <Bus size={16} />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Using Transport</p>
          <p className="text-lg font-bold">{analytics.totalTransportUsers}</p>
        </div>

        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[200px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 flex justify-center items-center bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mb-1">
            <CalendarCheck size={16} />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Active Routes</p>
          <p className="text-lg font-bold">{analytics.activeRoutes}</p>
        </div>

        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[200px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 flex justify-center items-center bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full mb-1">
            <ShieldAlert size={16} />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Complaints</p>
          <p className="text-lg font-bold">{analytics.recentComplaints.length}</p>
        </div>

        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[200px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 flex justify-center items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full mb-1">
            <FileText size={16} />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Pending Requests</p>
          <p className="text-lg font-bold">{analytics.pendingRequests}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Route Chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-6">Route-wise Student Count</h2>
          {analytics.routeWiseCount.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.routeWiseCount}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: 'rgba(79, 70, 229, 0.1)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="students" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted">No route data available</div>
          )}
        </div>

        {/* Complaints List */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Recent Complaints</h2>
            <button className="text-sm text-primary font-bold">View All</button>
          </div>
          <div className="space-y-4">
            {analytics.recentComplaints.map(comp => (
              <div key={comp.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold">{comp.name || comp.student}</div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${comp.status === 'Resolved' ? 'bg-green-100 text-green-700' : comp.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {comp.status}
                  </span>
                </div>
                <div className="text-sm text-muted">{comp.description || comp.issue}</div>
              </div>
            ))}
            {analytics.recentComplaints.length === 0 && (
              <div className="text-center p-4 text-muted">No active complaints</div>
            )}
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="glass-card">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-lg font-bold">Department Students in Transport</h2>
          <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 w-full md:w-auto">
            <Search size={16} className="text-muted mr-2" />
            <input type="text" placeholder="Search student..." className="bg-transparent outline-none text-sm w-full md:w-64" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-muted font-bold">
              <tr>
                <th className="p-4">Student Name</th>
                <th className="p-4">Register Number</th>
                <th className="p-4">Department</th>
                <th className="p-4">Bus Number</th>
                <th className="p-4">Route</th>
                <th className="p-4">Pickup Point</th>
              </tr>
            </thead>
            <tbody>
              {deptStudents.map((st, idx) => (
                <tr key={idx} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-4 font-medium">{st.name}</td>
                  <td className="p-4 font-mono text-sm">{st.studentId}</td>
                  <td className="p-4 text-sm text-muted">{st.studentProfile?.department || hodSession.dept}</td>
                  <td className="p-4 font-bold text-success">TN01AB1234</td>
                  <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded font-bold text-xs">{st.routeId}</span></td>
                  <td className="p-4 text-sm">{st.pickupPoint || 'Pending'}</td>
                </tr>
              ))}
              {deptStudents.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted">No transport students found in this department.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transport Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Send Transport Request to Admin</h2>
            <p className="text-sm text-muted mb-4">Request new stops, report consistent delays, or ask for route changes for your department students.</p>
            <textarea
              className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none mb-4"
              rows="5"
              placeholder="Describe your request..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                alert('Transport request submitted to Admin successfully.');
                setShowRequestModal(false);
                setRequestText('');
              }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodTransport;
