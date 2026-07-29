import React, { useState, useEffect } from 'react';
import { Bus, Map, Users, UserCheck, Wrench, IndianRupee, Bell, AlertTriangle, MessageSquare, CheckCircle, Clock, FileText, Download } from 'lucide-react';
import { getTransportRoutes, getTransportDrivers, getTransportStudents, getDriverAttendance, getTransportMaintenance, getTransportComplaints } from '../../api/index';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

const PrincipalTransport = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalBuses: 0,
    activeRoutes: 0,
    studentsUsingTransport: 0,
    totalDrivers: 0,
    maintenancePending: 0,
    feeCollected: 0,
    feePending: 0,
    totalComplaints: 24,
    resolvedComplaints: 18,
    pendingComplaints: 6,
    presentDrivers: 0,
    absentDrivers: 0,
    onLeaveDrivers: 0
  });

  const [routeData, setRouteData] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [allData, setAllData] = useState({});

  const handleDownloadReport = (type) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (type === 'Usage') {
      csvContent += "Route ID,Bus Number,Capacity,Occupied,Occupancy %,Complaints\n";
      routeData.forEach(r => {
        const routeObj = (allData.routes || []).find(rt => rt.routeId === r.name) || {};
        csvContent += `${r.name},${routeObj.vehicle || 'N/A'},${routeObj.capacity || 0},${r.students},${r.occupancy}%,${r.complaints}\n`;
      });
    } else if (type === 'Attendance') {
      csvContent += "Driver ID,Driver Name,License,Status\n";
      (allData.attendance || []).forEach(a => {
        const driverObj = (allData.drivers || []).find(d => d.driverId === a.driverId) || {};
        csvContent += `${a.driverId},${driverObj.name || 'Unknown'},${driverObj.license || 'N/A'},${a.status}\n`;
      });
    } else if (type === 'Maintenance') {
      csvContent += "Vehicle Number,Service Type,Status,Service Date,Cost\n";
      (allData.maintenance || []).forEach(m => {
        const formattedDate = m.serviceDate ? new Date(m.serviceDate).toLocaleDateString() : 'N/A';
        csvContent += `${m.vehicleNumber},${m.serviceType},${m.status},${formattedDate},${m.cost || 0}\n`;
      });
    } else if (type === 'Fee') {
      csvContent += "Student ID,Route,Pickup Point,Fee Status,Amount\n";
      (allData.students || []).forEach(s => {
        csvContent += `${s.studentId},${s.routeId},${s.pickupPoint},${s.feeStatus},${s.amount || 0}\n`;
      });
    } else if (type.startsWith('Complaints')) {
      const filterStatus = type.split('-')[1];
      let filteredComplaints = allData.complaints || [];
      if (filterStatus) {
        filteredComplaints = filteredComplaints.filter(c => filterStatus === 'Resolved' ? c.status === 'Resolved' : c.status !== 'Resolved');
      }
      csvContent += "Complaint ID,Student ID,Name,Bus Number,Route,Type,Description,Status,Date\n";
      filteredComplaints.forEach(c => {
        const formattedDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A';
        const description = (c.description || '').replace(/,/g, ' ');
        csvContent += `${c.complaintId},${c.studentId},${c.name},${c.busNumber},${c.routeId},${c.complaintType},${description},${c.status},${formattedDate}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Transport_${type}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [routesRes, driversRes, studentsRes, attRes, maintRes, complaintsRes] = await Promise.all([
          getTransportRoutes().catch(() => ({ data: [] })),
          getTransportDrivers().catch(() => ({ data: [] })),
          getTransportStudents().catch(() => ({ data: [] })),
          getDriverAttendance(today).catch(() => ({ data: [] })),
          getTransportMaintenance().catch(() => ({ data: [] })),
          getTransportComplaints().catch(() => ({ data: [] }))
        ]);

        let routes = routesRes.data || [];
        let drivers = driversRes.data || [];
        let students = studentsRes.data || [];
        let attendance = attRes.data || [];
        let maintenance = maintRes.data || [];
        let complaints = complaintsRes.data || [];

        // Mock data if collections are empty for demo purposes
        if (routes.length === 0) {
          routes = [
            { routeId: 'R1', name: 'Anna Nagar', capacity: 50, occupied: 45 },
            { routeId: 'R2', name: 'Tambaram', capacity: 40, occupied: 40 },
            { routeId: 'R3', name: 'Velachery', capacity: 60, occupied: 50 },
            { routeId: 'R4', name: 'Adyar', capacity: 50, occupied: 20 }
          ];
          drivers = Array(22).fill({ status: 'Active' });
          students = Array(1250).fill({ feeStatus: Math.random() > 0.2 ? 'Paid' : 'Pending', amount: 15000 });
        }

        const feeCollected = students.filter(s => s.feeStatus === 'Paid').reduce((acc, curr) => acc + (curr.amount || 15000), 0);
        const feePending = students.filter(s => s.feeStatus === 'Pending').reduce((acc, curr) => acc + (curr.amount || 15000), 0);

        const totalComplaints = complaints.length; 
        const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
        const pendingComplaints = complaints.filter(c => c.status !== 'Resolved').length; 

        setMetrics({
          totalBuses: routes.length, 
          activeRoutes: routes.length,
          studentsUsingTransport: students.length,
          totalDrivers: drivers.length,
          maintenancePending: maintenance.filter(m => m.status === 'Scheduled' || m.status === 'In Progress').length,
          feeCollected,
          feePending,
          totalComplaints: totalComplaints,
          resolvedComplaints: resolvedComplaints,
          pendingComplaints: pendingComplaints,
          presentDrivers: attendance.filter(a => a.status === 'Present').length,
          absentDrivers: attendance.filter(a => a.status === 'Absent').length,
          onLeaveDrivers: attendance.filter(a => a.status === 'On Leave').length
        });

        setFeeData([
          { name: 'Collected', value: feeCollected },
          { name: 'Pending', value: feePending }
        ]);

        const dynamicRouteData = routes.map(r => {
          const occ = students.filter(s => s.routeId === r.routeId).length;
          return {
            name: r.routeId,
            occupancy: r.capacity ? Math.round((occ / r.capacity) * 100) : 0,
            students: occ,
            complaints: Math.floor(Math.random() * 3) // Mock complaint per route
          };
        });
        setRouteData(dynamicRouteData.length > 0 ? dynamicRouteData : [
          { name: 'R1', occupancy: 0, students: 0, complaints: 0 }
        ]);

        const dynamicVehicles = routes.map(r => ({
          number: r.vehicle || 'Unassigned',
          driver: r.driver || 'Unassigned',
          capacity: r.capacity || 0,
          occupied: students.filter(s => s.routeId === r.routeId).length,
          status: 'Active'
        }));
        setVehicles(dynamicVehicles.length > 0 ? dynamicVehicles : [
          { number: 'N/A', driver: 'N/A', capacity: 0, occupied: 0, status: 'N/A' }
        ]);

        setAllData({ routes, drivers, students, attendance, maintenance });

      } catch (err) {
        console.error("Error fetching principal transport analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="p-8 text-center"><span className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></span></div>;
  }

  const COLORS = ['#10b981', '#f43f5e'];
  const monthlyCollection = [
    { month: 'Jan', amount: 1500000 },
    { month: 'Feb', amount: 2000000 },
    { month: 'Mar', amount: 500000 },
    { month: 'Apr', amount: 200000 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Bus className="text-primary" /> Transport Analytics Dashboard
          </h1>
          <p className="text-muted mt-1">High-level overview of transport operations and revenue.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap justify-center xl:justify-between gap-4 mb-8">
        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[180px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1"><Bus size={16} /></div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Total Buses</p>
          <p className="text-lg font-bold">{metrics.totalBuses}</p>
        </div>
        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[180px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1"><Map size={16} /></div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Active Routes</p>
          <p className="text-lg font-bold">{metrics.activeRoutes}</p>
        </div>
        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[180px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-1"><UserCheck size={16} /></div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Total Drivers</p>
          <p className="text-lg font-bold">{metrics.totalDrivers}</p>
          <div className="flex gap-1 mt-1">
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1 rounded">P: {metrics.presentDrivers}</span>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">A: {metrics.absentDrivers + metrics.onLeaveDrivers}</span>
          </div>
        </div>
        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[180px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-1"><Users size={16} /></div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Students Using</p>
          <p className="text-lg font-bold">{metrics.studentsUsingTransport}</p>
        </div>
        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[180px] flex flex-col justify-center items-center text-center border-b-2 border-yellow-400">
          <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mb-1"><Wrench size={16} /></div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Maintenance</p>
          <p className="text-lg font-bold">{metrics.maintenancePending}</p>
        </div>
        <div className="glass-card p-4 flex-1 min-w-[140px] max-w-[180px] flex flex-col justify-center items-center text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1"><IndianRupee size={16} /></div>
          <p className="text-[10px] text-muted font-bold uppercase mb-1">Fee Collection</p>
          <p className="text-lg font-bold font-mono">{(metrics.feeCollected / 100000).toFixed(1)}L</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Route Analytics */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-6">Route Analytics</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={routeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
              <Bar dataKey="students" name="Students" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="complaints" name="Complaints" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-4 text-sm">
            <span className="text-success font-bold">Most Used: Route R3</span>
            <span className="text-warning font-bold">Least Used: Route R4</span>
          </div>
        </div>

        {/* Fee Collection Analytics */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-6">Fee Collection Analytics</h2>
          <div className="flex items-center justify-center mb-4">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={feeData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {feeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                <div>
                  <p className="text-sm text-muted">Collected</p>
                  <p className="font-bold">₹{metrics.feeCollected.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-rose-500"></div>
                <div>
                  <p className="text-sm text-muted">Pending</p>
                  <p className="font-bold">₹{metrics.feePending.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          <h3 className="text-sm font-bold mb-2">Monthly Collection</h3>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={monthlyCollection}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="month" tick={{fontSize: 10}} />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Complaint Analytics */}
        <div className="glass-card p-6 col-span-1">
          <h2 className="text-lg font-bold mb-6">Complaint Analytics</h2>
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
              onClick={() => handleDownloadReport('Complaints')}
              title="Click to download Complaints Report"
            >
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <MessageSquare size={20} /> <span>Total Complaints</span>
              </div>
              <span className="font-bold text-lg">{metrics.totalComplaints}</span>
            </div>
            <div 
              className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800"
              onClick={() => handleDownloadReport('Complaints-Resolved')}
              title="Click to download Resolved Complaints"
            >
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle size={20} /> <span>Resolved</span>
              </div>
              <span className="font-bold text-lg text-green-700">{metrics.resolvedComplaints}</span>
            </div>
            <div 
              className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors border border-transparent hover:border-yellow-200 dark:hover:border-yellow-800"
              onClick={() => handleDownloadReport('Complaints-Pending')}
              title="Click to download Pending Complaints"
            >
              <div className="flex items-center gap-3 text-yellow-600">
                <Clock size={20} /> <span>Pending</span>
              </div>
              <span className="font-bold text-lg text-yellow-700">{metrics.pendingComplaints}</span>
            </div>
          </div>
        </div>

        {/* Vehicle Analytics */}
        <div className="glass-card p-6 col-span-2 overflow-x-auto">
          <h2 className="text-lg font-bold mb-6">Vehicle Analytics</h2>
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-muted font-bold">
              <tr>
                <th className="p-3">Vehicle Number</th>
                <th className="p-3">Driver Assigned</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Occupied</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3 font-mono font-bold text-sm text-primary">{v.number}</td>
                  <td className="p-3">{v.driver}</td>
                  <td className="p-3">{v.capacity}</td>
                  <td className="p-3">{v.occupied}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${v.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reports Section */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-bold mb-6">Reports Section</h2>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => handleDownloadReport('Usage')} className="flex-1 min-w-[200px] flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md">
            <FileText className="text-blue-500 mb-3" size={28} />
            <span className="font-bold text-sm text-center">Transport Usage Report</span>
          </button>
          <button onClick={() => handleDownloadReport('Attendance')} className="flex-1 min-w-[200px] flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md">
            <UserCheck className="text-green-500 mb-3" size={28} />
            <span className="font-bold text-sm text-center">Driver Attendance Report</span>
          </button>
          <button onClick={() => handleDownloadReport('Maintenance')} className="flex-1 min-w-[200px] flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md">
            <Wrench className="text-yellow-500 mb-3" size={28} />
            <span className="font-bold text-sm text-center">Vehicle Maintenance Report</span>
          </button>
          <button onClick={() => handleDownloadReport('Fee')} className="flex-1 min-w-[200px] flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md">
            <IndianRupee className="text-emerald-500 mb-3" size={28} />
            <span className="font-bold text-sm text-center">Fee Collection Report</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default PrincipalTransport;
